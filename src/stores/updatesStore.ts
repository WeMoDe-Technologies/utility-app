import { create } from 'zustand';

import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';
import type { UpdateManifest } from '@/update/manifest';

/**
 * Update-prompt state.
 *
 * Remembers which optional update has been waved away, so the prompt appears
 * once per release rather than at every launch. Mandatory updates ignore all
 * of it — see `src/update/decide.ts`.
 *
 * Follows the app's store convention: plain zustand over the `loadJSON` /
 * `saveJSON` helpers with an explicit `hydrate()` called from the root layout,
 * rather than zustand's persist middleware. Mixing the two would mean two
 * different rehydration timings in one app.
 */

interface PersistedShape {
  dismissedVersion: string | null;
  lastCheckedAt: number | null;
  manifest: UpdateManifest | null;
}

const EMPTY: PersistedShape = {
  dismissedVersion: null,
  lastCheckedAt: null,
  manifest: null,
};

interface UpdatesState extends PersistedShape {
  /** Skip this version until a newer one is published. */
  dismiss: (version: string) => void;
  /** Record a manifest read successfully, and stamp the check time. */
  remember: (manifest: UpdateManifest) => void;
  hydrate: () => Promise<void>;
}

function persist(state: UpdatesState): void {
  const { dismissedVersion, lastCheckedAt, manifest } = state;
  void saveJSON<PersistedShape>(StorageKeys.UPDATES, {
    dismissedVersion,
    lastCheckedAt,
    manifest,
  });
}

export const useUpdatesStore = create<UpdatesState>((set, get) => ({
  ...EMPTY,

  dismiss: (version) => {
    set({ dismissedVersion: version });
    persist(get());
  },

  remember: (manifest) => {
    set({ manifest, lastCheckedAt: Date.now() });
    persist(get());
  },

  hydrate: async () => {
    const saved = await loadJSON<PersistedShape>(StorageKeys.UPDATES, EMPTY);
    // A hand-rolled or outdated payload must not poison the gate: anything
    // that is not the shape we expect falls back to the empty state, which
    // simply means "nothing dismissed, nothing cached".
    if (!saved || typeof saved !== 'object') {
      set(EMPTY);
      return;
    }
    set({
      dismissedVersion:
        typeof saved.dismissedVersion === 'string' ? saved.dismissedVersion : null,
      lastCheckedAt: typeof saved.lastCheckedAt === 'number' ? saved.lastCheckedAt : null,
      manifest:
        saved.manifest && typeof saved.manifest === 'object' ? saved.manifest : null,
    });
  },
}));
