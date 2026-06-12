import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';

interface FavouritesState {
  favourites: string[];
  toggleFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
  reset: () => void;
  hydrate: () => Promise<void>;
}

export const useFavouritesStore = create<FavouritesState>((set, get) => ({
  favourites: [],

  toggleFavourite: (id) => {
    const current = get().favourites;
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id];
    set({ favourites: next });
    saveJSON(StorageKeys.FAVOURITES, next);
  },

  isFavourite: (id) => get().favourites.includes(id),

  reset: () => {
    set({ favourites: [] });
    saveJSON(StorageKeys.FAVOURITES, []);
  },

  hydrate: async () => {
    const saved = await loadJSON<string[]>(StorageKeys.FAVOURITES, []);
    set({ favourites: Array.isArray(saved) ? saved : [] });
  },
}));