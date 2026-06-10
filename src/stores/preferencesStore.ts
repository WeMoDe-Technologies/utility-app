import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';
import { DEFAULT_THEME_ID } from '@/theme/themes';

interface PreferencesState {
  themeId: string;
  /** Legacy field — kept for backward compat, maps to themeId internally */
  theme: string;
  hapticFeedback: boolean;
  showUsageCount: boolean;
  setThemeId: (id: string) => void;
  /** @deprecated Use setThemeId instead */
  setTheme: (theme: string) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setShowUsageCount: (show: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  themeId: DEFAULT_THEME_ID,
  theme: DEFAULT_THEME_ID,
  hapticFeedback: true,
  showUsageCount: true,
};

export const usePreferencesStore = create<PreferencesState>()((set, get) => {
  const saved = loadJSON(StorageKeys.PREFERENCES, DEFAULTS);

  // Migrate: if old 'theme' value is 'system'|'light'|'dark', map to new themeId
  let migratedThemeId = saved.themeId ?? saved.theme ?? DEFAULT_THEME_ID;
  if (migratedThemeId === 'system') migratedThemeId = DEFAULT_THEME_ID;
  if (migratedThemeId === 'light') migratedThemeId = 'ivory';
  if (migratedThemeId === 'dark') migratedThemeId = 'midnight';

  const persist = (partial: Partial<typeof DEFAULTS>) => {
    const current = loadJSON(StorageKeys.PREFERENCES, DEFAULTS);
    saveJSON(StorageKeys.PREFERENCES, { ...current, ...partial });
  };

  return {
    ...saved,
    themeId: migratedThemeId,
    theme: migratedThemeId,

    setThemeId: (id) => {
      set({ themeId: id, theme: id });
      persist({ themeId: id, theme: id });
    },

    setTheme: (theme) => {
      // Alias for backward compat
      get().setThemeId(theme);
    },

    setHapticFeedback: (hapticFeedback) => {
      set({ hapticFeedback });
      persist({ hapticFeedback });
    },

    setShowUsageCount: (showUsageCount) => {
      set({ showUsageCount });
      persist({ showUsageCount });
    },

    reset: () => {
      set(DEFAULTS);
      saveJSON(StorageKeys.PREFERENCES, DEFAULTS);
    },
  };
});
