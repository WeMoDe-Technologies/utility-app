import type { ThemeColors } from './index';

/**
 * Kit's themes.
 *
 * Each one is a material, not a colour scheme: paper stock, enamel, blueprint
 * linen, phosphor glass. `border` is a near-black ink in every theme because
 * the whole language is drawn with rules — the border colour is structural,
 * not decorative, and must stay high-contrast against both bg and card.
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isDark: boolean;
  colors: ThemeColors;
  preview: {
    bg: string;
    surface: string;
    accent: string;
    card: string;
  };
}

// ─── 1. Bone — warm paper, signal orange (default) ────────────────────────
const bone: ThemeDefinition = {
  id: 'bone',
  name: 'Bone',
  description: 'Warm paper stock and signal orange',
  emoji: '🗒',
  isDark: false,
  colors: {
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
  },
  preview: { bg: '#EDEAE1', surface: '#FFFDF7', accent: '#E2561E', card: '#E2DED3' },
};

// ─── 2. Graphite — dark enamel, warm orange ───────────────────────────────
const graphite: ThemeDefinition = {
  id: 'graphite',
  name: 'Graphite',
  description: 'Dark enamel with a warm signal lamp',
  emoji: '🪨',
  isDark: true,
  colors: {
    bg: '#171614',
    surface: '#201E1B',
    card: '#2A2724',
    border: '#0C0B0A',
    muted: '#322F2B',
    subtle: '#44403A',
    text: '#F2EEE4',
    textSecondary: '#A8A196',
    textTertiary: '#746D64',
    accent: '#FF6A2C',
    accentLight: '#3A2318',
    shadow: '#0C0B0A',
  },
  preview: { bg: '#171614', surface: '#2A2724', accent: '#FF6A2C', card: '#201E1B' },
};

// ─── 3. Blueprint — drafting linen, chalk white ───────────────────────────
const blueprint: ThemeDefinition = {
  id: 'blueprint',
  name: 'Blueprint',
  description: 'Drafting linen and chalk lines',
  emoji: '📐',
  isDark: true,
  colors: {
    bg: '#11304A',
    surface: '#164058',
    card: '#1C4C68',
    border: '#071D2E',
    muted: '#235A78',
    subtle: '#2F6D8E',
    text: '#EAF4FA',
    textSecondary: '#A6C9DC',
    textTertiary: '#6E9BB4',
    accent: '#F2C14E',
    accentLight: '#2B4A5E',
    shadow: '#071D2E',
  },
  preview: { bg: '#11304A', surface: '#1C4C68', accent: '#F2C14E', card: '#164058' },
};

// ─── 4. Olive — field equipment, stencilled ───────────────────────────────
const olive: ThemeDefinition = {
  id: 'olive',
  name: 'Olive',
  description: 'Field equipment, stencilled markings',
  emoji: '🫒',
  isDark: false,
  colors: {
    bg: '#E4E2D2',
    surface: '#EFEDE0',
    card: '#F8F7EE',
    border: '#22251A',
    muted: '#D6D4C1',
    subtle: '#C3C1AC',
    text: '#22251A',
    textSecondary: '#55593F',
    textTertiary: '#848769',
    accent: '#6E7A33',
    accentLight: '#DFE4C8',
    shadow: '#22251A',
  },
  preview: { bg: '#E4E2D2', surface: '#F8F7EE', accent: '#6E7A33', card: '#D6D4C1' },
};

// ─── 5. Oxide — cream and brick, enamel signage ───────────────────────────
const oxide: ThemeDefinition = {
  id: 'oxide',
  name: 'Oxide',
  description: 'Cream enamel with brick lettering',
  emoji: '🧱',
  isDark: false,
  colors: {
    bg: '#F2E9DC',
    surface: '#F9F2E8',
    card: '#FFFBF4',
    border: '#2A1D18',
    muted: '#E6D9C8',
    subtle: '#D6C6B2',
    text: '#2A1D18',
    textSecondary: '#6B5143',
    textTertiary: '#9C8171',
    accent: '#A6392B',
    accentLight: '#F0D9D2',
    shadow: '#2A1D18',
  },
  preview: { bg: '#F2E9DC', surface: '#FFFBF4', accent: '#A6392B', card: '#E6D9C8' },
};

// ─── 6. Terminal — phosphor glass ─────────────────────────────────────────
const terminal: ThemeDefinition = {
  id: 'terminal',
  name: 'Terminal',
  description: 'Phosphor glass and scan lines',
  emoji: '🖥',
  isDark: true,
  colors: {
    bg: '#0B100C',
    surface: '#111810',
    card: '#172115',
    border: '#040704',
    muted: '#1E2B1B',
    subtle: '#2C3D27',
    text: '#C8F2B8',
    textSecondary: '#7FAE73',
    textTertiary: '#4F7347',
    accent: '#6FE26A',
    accentLight: '#162614',
    shadow: '#040704',
  },
  preview: { bg: '#0B100C', surface: '#172115', accent: '#6FE26A', card: '#111810' },
};

// ─── Registry ─────────────────────────────────────────────────────────────
export const THEMES: ThemeDefinition[] = [
  bone,
  graphite,
  oxide,
  olive,
  blueprint,
  terminal,
];

export const THEME_MAP = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
) as Record<string, ThemeDefinition>;

export const DEFAULT_THEME_ID = 'bone';

export function getThemeById(id: string): ThemeDefinition {
  return THEME_MAP[id] ?? THEME_MAP[DEFAULT_THEME_ID];
}

export const DARK_THEMES = THEMES.filter((t) => t.isDark);
export const LIGHT_THEMES = THEMES.filter((t) => !t.isDark);
