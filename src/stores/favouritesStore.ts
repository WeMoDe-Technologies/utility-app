import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';

interface FavouritesState {
  ids: string[];
  addFavourite: (id: string) => void;
  removeFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string) => void;
  reset: () => void;
}

export const useFavouritesStore = create<FavouritesState>()((set, get) => {
  const saved = loadJSON<string[]>(StorageKeys.FAVOURITES, []);

  const persist = (ids: string[]) =>
    saveJSON(StorageKeys.FAVOURITES, ids);

  return {
    ids: saved,

    addFavourite: (id) => {
      const ids = [...new Set([...get().ids, id])];
      set({ ids });
      persist(ids);
    },

    removeFavourite: (id) => {
      const ids = get().ids.filter((fid) => fid !== id);
      set({ ids });
      persist(ids);
    },

    isFavourite: (id) => get().ids.includes(id),

    toggleFavourite: (id) => {
      if (get().isFavourite(id)) {
        get().removeFavourite(id);
      } else {
        get().addFavourite(id);
      }
    },

    reset: () => {
      set({ ids: [] });
      persist([]);
    },
  };
});
