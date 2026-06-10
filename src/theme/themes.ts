import type { ThemeColors } from './index';

// ─── Theme Definition Type ────────────────────────────────────────────────
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

// ─── 1. Midnight (Original Dark) ─────────────────────────────────────────
const midnight: ThemeDefinition = {
  id: 'midnight',
  name: 'Midnight',
  description: 'Deep dark with indigo accent',
  emoji: '🌑',
  isDark: true,
  colors: {
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
  },
  preview: { bg: '#0A0A0F', surface: '#1C1C28', accent: '#6366F1', card: '#13131A' },
};

// ─── 2. Ivory (Original Light) ───────────────────────────────────────────
const ivory: ThemeDefinition = {
  id: 'ivory',
  name: 'Ivory',
  description: 'Clean light with indigo accent',
  emoji: '☀️',
  isDark: false,
  colors: {
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
    accentLight: 'rgba(99,102,241,0.10)',
  },
  preview: { bg: '#F7F7FC', surface: '#FFFFFF', accent: '#6366F1', card: '#F0F0F8' },
};

// ─── 3. Obsidian (Pure Black / OLED) ─────────────────────────────────────
const obsidian: ThemeDefinition = {
  id: 'obsidian',
  name: 'Obsidian',
  description: 'True black, perfect for OLED screens',
  emoji: '⬛',
  isDark: true,
  colors: {
    bg: '#000000',
    surface: '#0D0D0D',
    card: '#161616',
    border: '#222222',
    muted: '#2A2A2A',
    subtle: '#333333',
    text: '#F5F5F5',
    textSecondary: '#888888',
    textTertiary: '#555555',
    accent: '#6366F1',
    accentLight: 'rgba(99,102,241,0.12)',
  },
  preview: { bg: '#000000', surface: '#161616', accent: '#6366F1', card: '#0D0D0D' },
};

// ─── 4. Aurora (Dark + Emerald) ──────────────────────────────────────────
const aurora: ThemeDefinition = {
  id: 'aurora',
  name: 'Aurora',
  description: 'Dark canvas with emerald glow',
  emoji: '🌌',
  isDark: true,
  colors: {
    bg: '#080F0C',
    surface: '#101A14',
    card: '#18271F',
    border: '#1F3529',
    muted: '#2A4538',
    subtle: '#356050',
    text: '#E0F0E8',
    textSecondary: '#7AAA90',
    textTertiary: '#4A7A62',
    accent: '#10B981',
    accentLight: 'rgba(16,185,129,0.15)',
  },
  preview: { bg: '#080F0C', surface: '#18271F', accent: '#10B981', card: '#101A14' },
};

// ─── 5. Ember (Dark + Rose/Amber) ────────────────────────────────────────
const ember: ThemeDefinition = {
  id: 'ember',
  name: 'Ember',
  description: 'Warm dark with rose fire tones',
  emoji: '🔥',
  isDark: true,
  colors: {
    bg: '#0F0908',
    surface: '#1A1210',
    card: '#241918',
    border: '#3A2422',
    muted: '#4A2E2C',
    subtle: '#5F3C3A',
    text: '#F5E8E6',
    textSecondary: '#B08080',
    textTertiary: '#7A5050',
    accent: '#F43F5E',
    accentLight: 'rgba(244,63,94,0.15)',
  },
  preview: { bg: '#0F0908', surface: '#241918', accent: '#F43F5E', card: '#1A1210' },
};

// ─── 6. Galaxy (Dark + Violet) ────────────────────────────────────────────
const galaxy: ThemeDefinition = {
  id: 'galaxy',
  name: 'Galaxy',
  description: 'Deep space with violet nebula',
  emoji: '🌠',
  isDark: true,
  colors: {
    bg: '#07060F',
    surface: '#100E1C',
    card: '#1A1730',
    border: '#2A2548',
    muted: '#352F5A',
    subtle: '#443C6E',
    text: '#EAE8FF',
    textSecondary: '#9088C0',
    textTertiary: '#5C5490',
    accent: '#8B5CF6',
    accentLight: 'rgba(139,92,246,0.15)',
  },
  preview: { bg: '#07060F', surface: '#1A1730', accent: '#8B5CF6', card: '#100E1C' },
};

// ─── 7. Ocean (Dark + Cyan) ───────────────────────────────────────────────
const ocean: ThemeDefinition = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Deep sea dark with cyan waves',
  emoji: '🌊',
  isDark: true,
  colors: {
    bg: '#060D12',
    surface: '#0D1820',
    card: '#15242E',
    border: '#1C3040',
    muted: '#254050',
    subtle: '#2E5060',
    text: '#DFF5FA',
    textSecondary: '#6AB8CC',
    textTertiary: '#407A90',
    accent: '#06B6D4',
    accentLight: 'rgba(6,182,212,0.15)',
  },
  preview: { bg: '#060D12', surface: '#15242E', accent: '#06B6D4', card: '#0D1820' },
};

// ─── 8. Sand (Light Warm Beige) ───────────────────────────────────────────
const sand: ThemeDefinition = {
  id: 'sand',
  name: 'Sand',
  description: 'Warm parchment with amber tones',
  emoji: '🏜️',
  isDark: false,
  colors: {
    bg: '#FAF6F0',
    surface: '#FFFCF8',
    card: '#FFFCF8',
    border: '#EDE5D8',
    muted: '#F2EBE0',
    subtle: '#E8DDD0',
    text: '#2C1F10',
    textSecondary: '#7A6248',
    textTertiary: '#B09070',
    accent: '#F59E0B',
    accentLight: 'rgba(245,158,11,0.12)',
  },
  preview: { bg: '#FAF6F0', surface: '#FFFCF8', accent: '#F59E0B', card: '#F2EBE0' },
};

// ─── 9. Rose (Light Soft Pink) ────────────────────────────────────────────
const rose: ThemeDefinition = {
  id: 'rose',
  name: 'Rose',
  description: 'Soft blush light with pink accent',
  emoji: '🌸',
  isDark: false,
  colors: {
    bg: '#FDF5F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#F0DDE2',
    muted: '#FAF0F3',
    subtle: '#F5E5EA',
    text: '#1A0810',
    textSecondary: '#8A5060',
    textTertiary: '#C09090',
    accent: '#EC4899',
    accentLight: 'rgba(236,72,153,0.10)',
  },
  preview: { bg: '#FDF5F7', surface: '#FFFFFF', accent: '#EC4899', card: '#FAF0F3' },
};

// ─── 10. Forest (Light Green) ─────────────────────────────────────────────
const forest: ThemeDefinition = {
  id: 'forest',
  name: 'Forest',
  description: 'Fresh mint light with teal accent',
  emoji: '🌿',
  isDark: false,
  colors: {
    bg: '#F3FAF6',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#D8EDE4',
    muted: '#EBF5EF',
    subtle: '#DFF0E8',
    text: '#0A1F14',
    textSecondary: '#3A7055',
    textTertiary: '#7AAA90',
    accent: '#10B981',
    accentLight: 'rgba(16,185,129,0.10)',
  },
  preview: { bg: '#F3FAF6', surface: '#FFFFFF', accent: '#10B981', card: '#EBF5EF' },
};

// ─── 11. Slate (Cool Gray Dark) ───────────────────────────────────────────
const slate: ThemeDefinition = {
  id: 'slate',
  name: 'Slate',
  description: 'Cool blue-gray dark with sky accent',
  emoji: '🩶',
  isDark: true,
  colors: {
    bg: '#0C0F14',
    surface: '#141820',
    card: '#1E2430',
    border: '#2A3040',
    muted: '#354050',
    subtle: '#42505E',
    text: '#E0E8F0',
    textSecondary: '#7A90A8',
    textTertiary: '#506070',
    accent: '#0EA5E9',
    accentLight: 'rgba(14,165,233,0.15)',
  },
  preview: { bg: '#0C0F14', surface: '#1E2430', accent: '#0EA5E9', card: '#141820' },
};

// ─── 12. Neon (Dark + Lime) ────────────────────────────────────────────────
const neon: ThemeDefinition = {
  id: 'neon',
  name: 'Neon',
  description: 'Cyberpunk dark with electric lime',
  emoji: '⚡',
  isDark: true,
  colors: {
    bg: '#080A06',
    surface: '#0F1209',
    card: '#161C10',
    border: '#202E14',
    muted: '#2A3C1A',
    subtle: '#354C20',
    text: '#E8F8D0',
    textSecondary: '#88B848',
    textTertiary: '#506830',
    accent: '#84CC16',
    accentLight: 'rgba(132,204,22,0.15)',
  },
  preview: { bg: '#080A06', surface: '#161C10', accent: '#84CC16', card: '#0F1209' },
};

// ─── Master Registry ──────────────────────────────────────────────────────
export const THEMES: ThemeDefinition[] = [
  midnight,
  ivory,
  obsidian,
  aurora,
  ember,
  galaxy,
  ocean,
  sand,
  rose,
  forest,
  slate,
  neon,
];

export const THEME_MAP = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
) as Record<string, ThemeDefinition>;

export const DEFAULT_THEME_ID = 'midnight';

export function getThemeById(id: string): ThemeDefinition {
  return THEME_MAP[id] ?? THEME_MAP[DEFAULT_THEME_ID];
}

export const DARK_THEMES = THEMES.filter((t) => t.isDark);
export const LIGHT_THEMES = THEMES.filter((t) => !t.isDark);
