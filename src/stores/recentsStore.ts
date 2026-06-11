import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';

export interface RecentEntry {
  id: string;
  lastUsedAt: number;
  useCount: number;
}

interface RecentsState {
  recents: RecentEntry[];
  // Both names exist — trackRecent is the canonical one,
  // recordUsage is the alias the rest of the app calls
  trackRecent: (id: string) => void;
  recordUsage: (id: string) => void;
  hydrate: () => Promise<void>;
}

const MAX_RECENTS = 20;

export const useRecentsStore = create<RecentsState>((set, get) => {
  const record = (id: string) => {
    const now = Date.now();
    const existing = get().recents;
    const idx = existing.findIndex((r) => r.id === id);
    let next: RecentEntry[];

    if (idx >= 0) {
      next = existing.map((r) =>
        r.id === id
          ? { ...r, lastUsedAt: now, useCount: r.useCount + 1 }
          : r
      );
    } else {
      next = [{ id, lastUsedAt: now, useCount: 1 }, ...existing].slice(
        0,
        MAX_RECENTS
      );
    }

    set({ recents: next });
    saveJSON(StorageKeys.RECENTS, next);
  };

  return {
    recents: [],

    trackRecent: record,
    recordUsage: record,   // alias — same function, both names work

    hydrate: async () => {
      const saved = await loadJSON<RecentEntry[]>(StorageKeys.RECENTS, []);
      set({ recents: Array.isArray(saved) ? saved : [] });
    },
  };
});