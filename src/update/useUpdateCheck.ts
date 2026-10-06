/**
 * The update check.
 *
 * Runs once at launch and again whenever the app returns to the foreground,
 * throttled so switching apps repeatedly does not re-fetch every time.
 * Nothing here is on the critical path: the check is fired and forgotten, and
 * every tool is usable before it resolves.
 */

import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { useUpdatesStore } from '@/stores/updatesStore';
import { decideUpdate } from './decide';
import type { UpdateDecision } from './decide';
import { fetchManifest, isUpdateCheckConfigured } from './manifest';
import type { UpdateManifest } from './manifest';

/** Do not re-fetch more often than this when returning to the foreground. */
const THROTTLE_MS = 30 * 60 * 1000;

/**
 * The version this build actually reports.
 *
 * Read from the Expo config rather than the `APP_VERSION` constant, because
 * the config is what a production build is stamped with. If the two ever
 * disagree, comparing against the constant would gate the wrong number.
 */
export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export interface UpdateCheck {
  decision: UpdateDecision;
  checking: boolean;
  /** True once a check has completed, successfully or not. */
  checked: boolean;
  /** True when this build knows where to look at all. */
  configured: boolean;
  /** Force a fetch, ignoring the throttle. Resolves to the fresh decision. */
  check: () => Promise<UpdateDecision>;
  /** Skip this optional update until a newer one is published. */
  dismiss: () => void;
}

export function useUpdateCheck(): UpdateCheck {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const dismissedVersion = useUpdatesStore((s) => s.dismissedVersion);
  const lastCheckedAt = useUpdatesStore((s) => s.lastCheckedAt);
  const cachedManifest = useUpdatesStore((s) => s.manifest);
  const remember = useUpdatesStore((s) => s.remember);
  const dismissVersion = useUpdatesStore((s) => s.dismiss);

  // Read through a ref inside the callbacks so they stay stable — they are
  // used by an AppState listener that must not be torn down and rebuilt on
  // every render.
  const state = useRef({ dismissedVersion, lastCheckedAt, cachedManifest });
  state.current = { dismissedVersion, lastCheckedAt, cachedManifest };
  const inFlight = useRef(false);

  /**
   * The decision is DERIVED from the store, never held in local state.
   *
   * It used to be a `useState` that each hook instance set from its own fetch.
   * That silently broke the moment a second instance existed: forcing a check
   * from Settings updated the store and Settings' own copy, while the instance
   * in the root layout — the one that actually renders the gate — kept showing
   * a stale decision, so a mandatory update went unenforced until the next
   * launch. Verified on the simulator before this was changed.
   *
   * Everything the decision depends on already lives in the store, so deriving
   * it means every instance agrees by construction.
   */
  const decision = useMemo(
    () =>
      decideUpdate({
        currentVersion: currentAppVersion(),
        manifest: cachedManifest,
        dismissedVersion,
      }),
    [cachedManifest, dismissedVersion],
  );

  /** Same decision for a manifest not yet committed to the store. */
  const decisionFor = useCallback(
    (manifest: UpdateManifest | null): UpdateDecision =>
      decideUpdate({
        currentVersion: currentAppVersion(),
        manifest,
        dismissedVersion: state.current.dismissedVersion,
      }),
    [],
  );

  const run = useCallback(
    async (force: boolean): Promise<UpdateDecision> => {
      if (inFlight.current) return { kind: 'none' };
      if (!isUpdateCheckConfigured()) {
        setChecked(true);
        return { kind: 'none' };
      }

      // A cached manifest is already driving `decision` through the store, so
      // the prompt is on screen before the network answers rather than after.
      const cached = state.current.cachedManifest;

      // The throttle only applies when there is a cached manifest to answer
      // from. Skipping the fetch *and* having nothing cached would report the
      // app as up to date without ever having looked.
      const since = state.current.lastCheckedAt;
      const throttled = since !== null && Date.now() - since < THROTTLE_MS;
      if (!force && throttled && cached) {
        setChecked(true);
        return decisionFor(cached);
      }

      inFlight.current = true;
      setChecking(true);
      try {
        const fresh = await fetchManifest();
        // Committing to the store is what re-renders every instance, including
        // the one in the root layout that owns the gate.
        if (fresh) remember(fresh);
        return decisionFor(fresh ?? cached ?? null);
      } finally {
        inFlight.current = false;
        setChecking(false);
        setChecked(true);
      }
    },
    [decisionFor, remember],
  );

  const check = useCallback(() => run(true), [run]);

  const dismiss = useCallback(() => {
    if (decision.kind === 'none') return;
    // Writing to the store is the whole of it — `decision` recomputes from
    // `dismissedVersion` and every instance follows.
    dismissVersion(decision.version);
  }, [decision, dismissVersion]);

  useEffect(() => {
    void run(false);
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void run(false);
    });
    return () => sub.remove();
  }, [run]);

  return {
    decision,
    checking,
    checked,
    configured: isUpdateCheckConfigured(),
    check,
    dismiss,
  };
}
