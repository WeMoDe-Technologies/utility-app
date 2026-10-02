import { useState, useEffect, useRef, useCallback } from 'react';
import { loadJSON, saveJSON, clearUtilityData, getStorageKey } from '@/utils/storage';

const DEBOUNCE_MS = 400;

/**
 * Overlay persisted state on top of the current defaults.
 *
 * Saved state is written by whichever version of the app the user last ran, so
 * a field added in a later release is simply absent from their stored object.
 * Replacing the defaults wholesale left those fields `undefined`, which surfaced
 * as things like a scientific-calculator memory register reading "Error".
 * Merging keeps the user's data and backfills anything new.
 *
 * Only own top-level keys that exist on the defaults are taken, so a stale field
 * from an older shape cannot linger either.
 */
function mergeWithDefaults<T>(defaults: T, loaded: unknown): T {
  if (
    loaded === null ||
    typeof loaded !== 'object' ||
    Array.isArray(loaded) ||
    defaults === null ||
    typeof defaults !== 'object' ||
    Array.isArray(defaults)
  ) {
    // Primitives and arrays are replaced outright — there is nothing to merge
    return (loaded === undefined || loaded === null ? defaults : (loaded as T));
  }

  const result = { ...(defaults as Record<string, unknown>) };
  for (const key of Object.keys(result)) {
    const value = (loaded as Record<string, unknown>)[key];
    if (value !== undefined) result[key] = value;
  }
  return result as T;
}


export function useUtilityState<T>(utilityId: string, defaultState: T) {
  const [state, setStateRaw] = useState<T>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref so the debounced save always captures the latest value
  const latestStateRef = useRef<T>(defaultState);

  // ── Hydrate from AsyncStorage on mount ──────────────────────────────────
  useEffect(() => {
    loadJSON<T>(getStorageKey(utilityId), defaultState).then((loaded) => {
      const merged = mergeWithDefaults(defaultState, loaded);
      setStateRaw(merged);
      latestStateRef.current = merged;
      setHydrated(true);
    });
  }, [utilityId]);

  // ── Debounced persist whenever state changes (after hydration) ───────────
  useEffect(() => {
    if (!hydrated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveJSON(getStorageKey(utilityId), latestStateRef.current);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, hydrated, utilityId]);

  // ── setState wrapper keeps the ref in sync ───────────────────────────────
  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: T) => T)(prev)
            : updater;
        latestStateRef.current = next;
        return next;
      });
    },
    []
  );

  // ── Clear: reset to default and wipe storage ─────────────────────────────
  const clearState = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStateRaw(defaultState);
    latestStateRef.current = defaultState;
    clearUtilityData(utilityId);
  }, [utilityId, defaultState]);

  return { state, setState, clearState, hydrated };
}