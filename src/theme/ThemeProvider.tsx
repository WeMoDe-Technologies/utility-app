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
  const { themeId, theme: legacyTheme } = usePreferencesStore();

  const resolvedThemeId = useMemo(() => {
    // Handle legacy 'system', 'light', 'dark' values from old preferences
    if (themeId === 'system') {
      return systemScheme === 'dark' ? 'midnight' : 'ivory';
    }
    if (themeId === 'light') return 'ivory';
    if (themeId === 'dark') return 'midnight';
    // If it's a valid theme id, use it
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
