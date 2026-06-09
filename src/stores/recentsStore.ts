import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';
import type { RecentEntry } from '@/types';

interface RecentsState {
  entries: RecentEntry[];
  recordUsage: (id: string) => void;
  clearRecent: () => void;
  getRecent: (limit?: number) => RecentEntry[];
}

const MAX_RECENTS = 20;

export const useRecentsStore = create<RecentsState>()((set, get) => {
  const saved = loadJSON<RecentEntry[]>(StorageKeys.RECENTS, []);

  const persist = (entries: RecentEntry[]) =>
    saveJSON(StorageKeys.RECENTS, entries);

  return {
    entries: saved,

    recordUsage: (id) => {
      const now = Date.now();
      const existing = get().entries.find((e) => e.utilityId === id);

      let entries: RecentEntry[];
      if (existing) {
        entries = get().entries.map((e) =>
          e.utilityId === id
            ? { ...e, lastUsedAt: now, useCount: e.useCount + 1 }
            : e
        );
      } else {
        entries = [
          { utilityId: id, lastUsedAt: now, useCount: 1 },
          ...get().entries,
        ].slice(0, MAX_RECENTS);
      }

      // Sort by lastUsedAt
      entries = [...entries].sort((a, b) => b.lastUsedAt - a.lastUsedAt);

      set({ entries });
      persist(entries);
    },

    clearRecent: () => {
      set({ entries: [] });
      persist([]);
    },

    getRecent: (limit = 8) =>
      get()
        .entries.slice(0, limit),
  };
});
