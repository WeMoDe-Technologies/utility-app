import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { StorageKeys, loadJSON, saveJSON } from '@/utils/storage';

interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  hapticFeedback: boolean;
  showUsageCount: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHapticFeedback: (enabled: boolean) => void;
  setShowUsageCount: (show: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  theme: 'system' as const,
  hapticFeedback: true,
  showUsageCount: true,
};

export const usePreferencesStore = create<PreferencesState>()((set) => {
  // Hydrate from storage
  const saved = loadJSON(StorageKeys.PREFERENCES, DEFAULTS);

  const save = (partial: Partial<typeof DEFAULTS>) => {
    const current = loadJSON(StorageKeys.PREFERENCES, DEFAULTS);
    saveJSON(StorageKeys.PREFERENCES, { ...current, ...partial });
  };

  return {
    ...saved,

    setTheme: (theme) => {
      set({ theme });
      save({ theme });
    },

    setHapticFeedback: (hapticFeedback) => {
      set({ hapticFeedback });
      save({ hapticFeedback });
    },

    setShowUsageCount: (showUsageCount) => {
      set({ showUsageCount });
      save({ showUsageCount });
    },

    reset: () => {
      set(DEFAULTS);
      saveJSON(StorageKeys.PREFERENCES, DEFAULTS);
    },
  };
});
