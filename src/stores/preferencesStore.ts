import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';

export type ThemeId =
  | 'midnight' | 'ivory' | 'obsidian' | 'aurora' | 'ember'
  | 'galaxy' | 'ocean' | 'sand' | 'rose' | 'forest' | 'slate' | 'neon';

interface PreferencesState {
  themeId: ThemeId;
  hapticsEnabled: boolean;
  // ── Actions ──
  setThemeId: (id: ThemeId) => void;
  setHapticsEnabled: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const DEFAULTS = {
  themeId: 'midnight' as ThemeId,
  hapticsEnabled: true,
};

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,

  setThemeId: (themeId) => {
    set({ themeId });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), themeId });
  },

  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled });
    saveJSON(StorageKeys.PREFERENCES, { ...get(), hapticsEnabled });
  },

  hydrate: async () => {
    const saved = await loadJSON(StorageKeys.PREFERENCES, DEFAULTS);
    set({
      themeId: saved.themeId ?? DEFAULTS.themeId,
      hapticsEnabled: saved.hapticsEnabled ?? DEFAULTS.hapticsEnabled,
    });
  },
}));