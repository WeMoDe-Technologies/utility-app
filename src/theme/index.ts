import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Spacing & Sizing ─────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const screen = { width, height };

// ─── Typography ────────────────────────────────────────────────────────────
export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ─── Color Palette ─────────────────────────────────────────────────────────
export const palette = {
  // Brand / Accent
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  violet: '#8B5CF6',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  orange: '#F97316',
  sky: '#0EA5E9',
  teal: '#14B8A6',
  pink: '#EC4899',
  lime: '#84CC16',
  fuchsia: '#D946EF',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Dark palette
  dark: {
    bg: '#0A0A0F',
    surface: '#13131A',
    card: '#1C1C28',
    border: '#2A2A3A',
    muted: '#3A3A50',
    subtle: '#4A4A62',
    text: '#E8E8F0',
    textSecondary: '#9090A8',
    textTertiary: '#6060780',
  },

  // Light palette
  light: {
    bg: '#F7F7FC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E8E8F0',
    muted: '#F0F0F8',
    subtle: '#E0E0EC',
    text: '#0A0A1A',
    textSecondary: '#5A5A72',
    textTertiary: '#9090A8',
  },
} as const;

// ─── Utility Category Colors ───────────────────────────────────────────────
export const utilityColors = {
  calculator: '#6366F1',
  scientificCalculator: '#8B5CF6',
  unitConverter: '#06B6D4',
  currencyConverter: '#10B981',
  emi: '#F59E0B',
  gst: '#F97316',
  qrScanner: '#0EA5E9',
  notes: '#F43F5E',
  pomodoro: '#EC4899',
  stopwatch: '#14B8A6',
  worldClock: '#6366F1',
  passwordGenerator: '#84CC16',
  textUtility: '#D946EF',
  ageCalculator: '#06B6D4',
  discountCalculator: '#10B981',
  counter: '#F59E0B',
} as const;

// ─── Theme Tokens ──────────────────────────────────────────────────────────
export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  muted: string;
  subtle: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentLight: string;
}

export const darkTheme: ThemeColors = {
  bg: '#0A0A0F',
  surface: '#13131A',
  card: '#1C1C28',
  border: '#2A2A3A',
  muted: '#3A3A50',
  subtle: '#4A4A62',
  text: '#E8E8F0',
  textSecondary: '#9090A8',
  textTertiary: '#606078',
  accent: '#6366F1',
  accentLight: 'rgba(99,102,241,0.15)',
};

export const lightTheme: ThemeColors = {
  bg: '#F7F7FC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8E8F0',
  muted: '#F0F0F8',
  subtle: '#E8E8F4',
  text: '#0A0A1A',
  textSecondary: '#5A5A72',
  textTertiary: '#9090A8',
  accent: '#6366F1',
  accentLight: 'rgba(99,102,241,0.1)',
};

// ─── Shadow Presets ────────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ─── Re-export new theme registry for convenience ──────────────────────────
export { THEMES, DARK_THEMES, LIGHT_THEMES, getThemeById, DEFAULT_THEME_ID } from './themes';
export type { ThemeDefinition } from './themes';
