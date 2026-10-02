import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Kit — design tokens.
 *
 * The visual language is mid-century industrial: flat surfaces, hard offset
 * shadows instead of blurs, tight corner radii, 2px rules, and uppercase
 * instrument legends. Nothing here uses gradients or translucency.
 */

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

/**
 * Deliberately tight. Rounded-off plastic, not glass — a 1970s keycap has a
 * 4–8pt corner, not a 24pt one.
 */
export const radius = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 12,
  full: 9999,
} as const;

/** Rule weights. Retro panels are drawn, not blurred — borders carry the structure. */
export const border = {
  hair: 1,
  base: 2,
  thick: 3,
} as const;

/** Hard-shadow offsets, in points. Used by <Plate>. */
export const plate = {
  flush: 0,
  low: 2,
  base: 3,
  high: 5,
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
  /** Uppercase legends are wide-tracked, like a silkscreened control panel. */
  tracking: {
    legend: 1.6,
    label: 0.8,
    tight: -0.4,
    display: -1.2,
  },
} as const;

// ─── Printed-ink palette ───────────────────────────────────────────────────
/**
 * Muted, slightly desaturated colours that read as enamel or printed ink
 * rather than backlit pixels. These are the per-tool accents.
 */
export const ink = {
  signal: '#E2561E',
  rust: '#B4441C',
  brick: '#A6392B',
  maroon: '#7A3246',
  clay: '#B5705A',
  mustard: '#C2902B',
  sand: '#A08963',
  olive: '#6E7A33',
  moss: '#4C6B3C',
  teal: '#2E6A66',
  petrol: '#27566B',
  slate: '#3C5A7D',
  plum: '#6B4A6E',
  graphite: '#2B2A28',
} as const;

/** Legacy alias — some older modules import `palette`. */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  ...ink,
} as const;

/** Per-tool accents, keyed by registry id. */
export const utilityColors = {
  calculator: ink.signal,
  scientificCalculator: ink.plum,
  unitConverter: ink.teal,
  currencyConverter: ink.moss,
  emi: ink.mustard,
  gst: ink.rust,
  qrScanner: ink.petrol,
  pomodoro: ink.maroon,
  stopwatch: ink.moss,
  worldClock: ink.slate,
  passwordGenerator: ink.olive,
  ageCalculator: ink.petrol,
  discountCalculator: ink.olive,
  counter: ink.mustard,
  compass: ink.teal,
  expense: ink.slate,
  tip: ink.clay,
  colorPicker: ink.plum,
  sip: ink.moss,
  noise: ink.brick,
} as const;

// ─── Theme tokens ──────────────────────────────────────────────────────────
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
  /** Colour of the hard offset shadow cast by plates and keys. */
  shadow: string;
}

export const lightTheme: ThemeColors = {
  bg: '#EDEAE1',
  surface: '#F7F4EC',
  card: '#FFFDF7',
  border: '#1E1C19',
  muted: '#E2DED3',
  subtle: '#D3CEC1',
  text: '#1E1C19',
  textSecondary: '#5A554C',
  textTertiary: '#8A8377',
  accent: '#E2561E',
  accentLight: '#F6DFD3',
  shadow: '#1E1C19',
};

export const darkTheme: ThemeColors = {
  bg: '#171614',
  surface: '#201E1B',
  card: '#2A2724',
  border: '#0E0D0C',
  muted: '#312E2A',
  subtle: '#413D38',
  text: '#F2EEE4',
  textSecondary: '#A8A196',
  textTertiary: '#746D64',
  accent: '#FF6A2C',
  accentLight: '#3A2318',
  shadow: '#0E0D0C',
};

// ─── Soft shadows ──────────────────────────────────────────────────────────
/**
 * Reserved for floating layers (modals, sheets, toasts) that genuinely sit
 * above the page. Flat surfaces use <Plate> and cast a hard shadow instead.
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 22,
    elevation: 14,
  },
};

// ─── Re-export the theme registry ──────────────────────────────────────────
export { THEMES, DARK_THEMES, LIGHT_THEMES, getThemeById, DEFAULT_THEME_ID } from './themes';
export type { ThemeDefinition } from './themes';
