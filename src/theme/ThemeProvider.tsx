import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors } from './index';
import { getThemeById, DEFAULT_THEME_ID, ThemeDefinition } from './themes';
import { usePreferencesStore } from '@/stores/preferencesStore';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  themeId: string;
  theme: ThemeDefinition;
}

const defaultTheme = getThemeById(DEFAULT_THEME_ID);

const ThemeContext = createContext<ThemeContextValue>({
  colors: defaultTheme.colors,
  isDark: defaultTheme.isDark,
  themeId: DEFAULT_THEME_ID,
  theme: defaultTheme,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themeId = usePreferencesStore((s) => s.themeId);

  const resolvedThemeId = useMemo(() => {
    // Installs from before the Kit redesign may hold 'system' | 'light' | 'dark',
    // or one of the retired theme ids. The first three map onto the closest
    // current themes; anything unrecognised falls through to getThemeById's
    // default rather than leaving the app unstyled.
    if (themeId === 'system') return systemScheme === 'dark' ? 'graphite' : 'bone';
    if (themeId === 'light') return 'bone';
    if (themeId === 'dark') return 'graphite';
    return themeId ?? DEFAULT_THEME_ID;
  }, [themeId, systemScheme]);

  const activeTheme = useMemo(
    () => getThemeById(resolvedThemeId),
    [resolvedThemeId]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: activeTheme.colors,
      isDark: activeTheme.isDark,
      themeId: resolvedThemeId,
      theme: activeTheme,
    }),
    [activeTheme, resolvedThemeId]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
