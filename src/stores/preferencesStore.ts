import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';

export type ThemeId =
  | 'midnight' | 'ivory' | 'obsidian' | 'aurora' | 'ember'
  | 'galaxy' | 'ocean' | 'sand' | 'rose' | 'forest' | 'slate' | 'neon';

interface PreferencesState {
  themeId: ThemeId;
  hapticsEnabled: boolean;
  // hapticFeedback is an alias for hapticsEnabled — used by components
  hapticFeedback: boolean;
  showUsageCount: boolean;
  // ── Actions ──
  setThemeId: (id: ThemeId) => void;
  setHapticsEnabled: (v: boolean) => void;
  setHapticFeedback: (v: boolean) => void;  // alias for setHapticsEnabled
  setShowUsageCount: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const DEFAULTS = {
  themeId: 'midnight' as ThemeId,
  hapticsEnabled: true,
  showUsageCount: true,
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  // hapticFeedback mirrors hapticsEnabled — always kept in sync
  hapticFeedback: DEFAULTS.hapticsEnabled,

  setThemeId: (themeId) => {
    set({ themeId });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), themeId });
  },

  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled, hapticFeedback: hapticsEnabled });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), hapticsEnabled });
  },

  // Alias so settings UI and components can use either name
  setHapticFeedback: (v) => {
    set({ hapticsEnabled: v, hapticFeedback: v });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), hapticsEnabled: v });
  },

  setShowUsageCount: (showUsageCount) => {
    set({ showUsageCount });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), showUsageCount });
  },

  hydrate: async () => {
    const saved = await loadJSON(StorageKeys.PREFERENCES, DEFAULTS);
    const hapticsEnabled = saved.hapticsEnabled ?? DEFAULTS.hapticsEnabled;
    set({
      themeId: saved.themeId ?? DEFAULTS.themeId,
      hapticsEnabled,
      hapticFeedback: hapticsEnabled,
      showUsageCount: saved.showUsageCount ?? DEFAULTS.showUsageCount,
    });
  },
}));