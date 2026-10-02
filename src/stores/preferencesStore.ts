import { create } from 'zustand';
import { loadJSON, saveJSON, StorageKeys } from '@/utils/storage';
import { THEME_MAP, DEFAULT_THEME_ID } from '@/theme/themes';
import { CURRENCIES, type CurrencyCode } from '@/utils/format';

/**
 * A theme id is any key in the theme registry. Legacy installs may still hold
 * 'system' | 'light' | 'dark' from an older build — ThemeProvider maps those
 * onto real themes, so the type stays wide on purpose.
 */
export type ThemeId = string;

interface PreferencesState {
  themeId: ThemeId;
  hapticsEnabled: boolean;
  /** Alias of hapticsEnabled — components read either name. */
  hapticFeedback: boolean;
  showUsageCount: boolean;
  currency: CurrencyCode;
  onboardingCompleted: boolean;
  // ── Actions ──
  setThemeId: (id: ThemeId) => void;
  setHapticsEnabled: (v: boolean) => void;
  setHapticFeedback: (v: boolean) => void;
  setShowUsageCount: (v: boolean) => void;
  setCurrency: (c: CurrencyCode) => void;
  setOnboardingCompleted: (v: boolean) => void;
  hydrate: () => Promise<void>;
}

const DEFAULTS = {
  themeId: DEFAULT_THEME_ID as ThemeId,
  hapticsEnabled: true,
  showUsageCount: true,
  currency: 'INR' as CurrencyCode,
  onboardingCompleted: false,
};

/** Only persist data — never the action functions that also live on the store. */
function persist(state: PreferencesState) {
  saveJSON(StorageKeys.PREFERENCES, {
    themeId: state.themeId,
    hapticsEnabled: state.hapticsEnabled,
    showUsageCount: state.showUsageCount,
    currency: state.currency,
    onboardingCompleted: state.onboardingCompleted,
  });
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  hapticFeedback: DEFAULTS.hapticsEnabled,

  setThemeId: (themeId) => {
    set({ themeId });
    persist(get());
  },

  setHapticsEnabled: (hapticsEnabled) => {
    set({ hapticsEnabled, hapticFeedback: hapticsEnabled });
    persist(get());
  },

  setHapticFeedback: (v) => {
    set({ hapticsEnabled: v, hapticFeedback: v });
    persist(get());
  },

  setShowUsageCount: (showUsageCount) => {
    set({ showUsageCount });
    persist(get());
  },

  setCurrency: (currency) => {
    set({ currency });
    persist(get());
  },

  setOnboardingCompleted: (onboardingCompleted) => {
    set({ onboardingCompleted });
    persist(get());
  },

  hydrate: async () => {
    const saved = await loadJSON<Partial<typeof DEFAULTS>>(StorageKeys.PREFERENCES, DEFAULTS);
    const hapticsEnabled = saved.hapticsEnabled ?? DEFAULTS.hapticsEnabled;
    // A theme that was removed from the registry must not brick the app
    const savedTheme = saved.themeId ?? DEFAULTS.themeId;
    const themeId =
      THEME_MAP[savedTheme] || ['system', 'light', 'dark'].includes(savedTheme)
        ? savedTheme
        : DEFAULTS.themeId;
    const currency = saved.currency && CURRENCIES[saved.currency]
      ? saved.currency
      : DEFAULTS.currency;

    set({
      themeId,
      hapticsEnabled,
      hapticFeedback: hapticsEnabled,
      showUsageCount: saved.showUsageCount ?? DEFAULTS.showUsageCount,
      currency,
      onboardingCompleted: saved.onboardingCompleted ?? DEFAULTS.onboardingCompleted,
    });
  },
}));

/** Convenience selector — the active currency, for screens that show money. */
export function useCurrency(): CurrencyCode {
  return usePreferencesStore((s) => s.currency);
}
