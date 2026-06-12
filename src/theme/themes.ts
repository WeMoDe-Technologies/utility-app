import type { ThemeColors } from './index';

// ─── Gradient Support (optional, additive) ─────────────────────────────────
// Tuple-typed so the arrays drop straight into expo-linear-gradient's
// `colors` prop without casting. Only the new "glass" themes define these;
// every existing theme omits them and falls back to solid `colors`.
export interface ThemeGradients {
  bg: readonly [string, string, ...string[]]; // screen background sweep
  accent: readonly [string, string, ...string[]]; // iridescent buttons / highlights
  card?: readonly [string, string, ...string[]]; // frosted-glass card fill
}

// ─── Theme Definition Type ────────────────────────────────────────────────
export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  isDark: boolean;
  colors: ThemeColors;
  gradients?: ThemeGradients; // optional — only iridescent/glass themes use this
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

// ════════════════════════════════════════════════════════════════════════
//  CLASSIC / MODERN THEMES — sourced from well-known design palettes
// ════════════════════════════════════════════════════════════════════════

// ─── 13. Mocha (Catppuccin Mocha — dark) ──────────────────────────────────
const mocha: ThemeDefinition = {
  id: 'mocha',
  name: 'Mocha',
  description: 'Soothing pastel dark with mauve accent',
  emoji: '🐱',
  isDark: true,
  colors: {
    bg: '#11111B',
    surface: '#181825',
    card: '#1E1E2E',
    border: '#313244',
    muted: '#45475A',
    subtle: '#585B70',
    text: '#CDD6F4',
    textSecondary: '#A6ADC8',
    textTertiary: '#6C7086',
    accent: '#CBA6F7',
    accentLight: 'rgba(203,166,247,0.15)',
  },
  preview: { bg: '#11111B', surface: '#1E1E2E', accent: '#CBA6F7', card: '#181825' },
};

// ─── 14. Latte (Catppuccin Latte — light) ─────────────────────────────────
const latte: ThemeDefinition = {
  id: 'latte',
  name: 'Latte',
  description: 'Soft pastel light with mauve accent',
  emoji: '🍵',
  isDark: false,
  colors: {
    bg: '#EFF1F5',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#CCD0DA',
    muted: '#E6E9EF',
    subtle: '#DCE0E8',
    text: '#4C4F69',
    textSecondary: '#5C5F77',
    textTertiary: '#8C8FA1',
    accent: '#8839EF',
    accentLight: 'rgba(136,57,239,0.10)',
  },
  preview: { bg: '#EFF1F5', surface: '#FFFFFF', accent: '#8839EF', card: '#E6E9EF' },
};

// ─── 15. Tokyo Night (dark) ────────────────────────────────────────────────
const tokyoNight: ThemeDefinition = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  description: 'Neon-lit city dark with blue accent',
  emoji: '🌃',
  isDark: true,
  colors: {
    bg: '#1A1B26',
    surface: '#1F2335',
    card: '#24283B',
    border: '#3B4261',
    muted: '#414868',
    subtle: '#565F89',
    text: '#C0CAF5',
    textSecondary: '#A9B1D6',
    textTertiary: '#565F89',
    accent: '#7AA2F7',
    accentLight: 'rgba(122,162,247,0.15)',
  },
  preview: { bg: '#1A1B26', surface: '#24283B', accent: '#7AA2F7', card: '#1F2335' },
};

// ─── 16. Nord (dark) ───────────────────────────────────────────────────────
const nord: ThemeDefinition = {
  id: 'nord',
  name: 'Nord',
  description: 'Arctic blue-gray dark with frost accent',
  emoji: '❄️',
  isDark: true,
  colors: {
    bg: '#2E3440',
    surface: '#353C4A',
    card: '#3B4252',
    border: '#434C5E',
    muted: '#4C566A',
    subtle: '#616E88',
    text: '#ECEFF4',
    textSecondary: '#D8DEE9',
    textTertiary: '#7B88A1',
    accent: '#88C0D0',
    accentLight: 'rgba(136,192,208,0.15)',
  },
  preview: { bg: '#2E3440', surface: '#3B4252', accent: '#88C0D0', card: '#353C4A' },
};

// ─── 17. Rosé Pine (dark) ──────────────────────────────────────────────────
const rosePine: ThemeDefinition = {
  id: 'rose-pine',
  name: 'Rosé Pine',
  description: 'Soho-vibe dark with iris accent',
  emoji: '🌹',
  isDark: true,
  colors: {
    bg: '#191724',
    surface: '#1F1D2E',
    card: '#26233A',
    border: '#403D52',
    muted: '#524F67',
    subtle: '#6E6A86',
    text: '#E0DEF4',
    textSecondary: '#908CAA',
    textTertiary: '#6E6A86',
    accent: '#C4A7E7',
    accentLight: 'rgba(196,167,231,0.15)',
  },
  preview: { bg: '#191724', surface: '#26233A', accent: '#C4A7E7', card: '#1F1D2E' },
};

// ─── 18. Rosé Pine Dawn (light) ────────────────────────────────────────────
const rosePineDawn: ThemeDefinition = {
  id: 'rose-pine-dawn',
  name: 'Rosé Pine Dawn',
  description: 'Soft warm light with iris accent',
  emoji: '🌷',
  isDark: false,
  colors: {
    bg: '#FAF4ED',
    surface: '#FFFAF3',
    card: '#FFFAF3',
    border: '#F2E9E1',
    muted: '#F4EDE8',
    subtle: '#DFDAD9',
    text: '#575279',
    textSecondary: '#797593',
    textTertiary: '#9893A5',
    accent: '#907AA9',
    accentLight: 'rgba(144,122,169,0.12)',
  },
  preview: { bg: '#FAF4ED', surface: '#FFFAF3', accent: '#907AA9', card: '#F2E9E1' },
};

// ════════════════════════════════════════════════════════════════════════
//  IRIDESCENT / HOLOGRAPHIC GLASS THEMES — sampled from reference images.
//  These define `gradients`; render with expo-linear-gradient (see usage
//  notes). `colors` still hold representative solids as a fallback so any
//  component that doesn't use the gradient still renders correctly.
// ════════════════════════════════════════════════════════════════════════

// ─── 19. Prism (Light — frosted holographic glass) ─────────────────────────
// Cool periwinkle → lilac → pink, like backlit frosted panels.
const prism: ThemeDefinition = {
  id: 'prism',
  name: 'Prism',
  description: 'Frosted holographic glass, periwinkle to pink',
  emoji: '🔮',
  isDark: false,
  colors: {
    bg: '#EBEAF7',
    surface: '#FFFFFF',
    card: '#F4F2FE',
    border: '#DAD8F0',
    muted: '#E8E6F8',
    subtle: '#DEDCF2',
    text: '#211D3D',
    textSecondary: '#5B5680',
    textTertiary: '#9A95BD',
    accent: '#8B7CF6',
    accentLight: 'rgba(139,124,246,0.12)',
  },
  gradients: {
    bg: ['#E3E6FB', '#ECE3FB', '#FBE3F4'],
    accent: ['#A5B4FC', '#C4B5FD', '#F0ABFC'],
    card: ['rgba(255,255,255,0.70)', 'rgba(240,238,255,0.45)'],
  },
  preview: { bg: '#EBEAF7', surface: '#F4F2FE', accent: '#8B7CF6', card: '#FBE3F4' },
};

// ─── 20. Iridescence (Light — chrome liquid) ───────────────────────────────
// Warm lavender ground with a purple → cyan → magenta chrome sweep.
const iridescence: ThemeDefinition = {
  id: 'iridescence',
  name: 'Iridescence',
  description: 'Liquid chrome, purple to cyan to magenta',
  emoji: '🫧',
  isDark: false,
  colors: {
    bg: '#ECE7EF',
    surface: '#FFFFFF',
    card: '#F6F1F6',
    border: '#E0D9E2',
    muted: '#EDE7EE',
    subtle: '#E4DCE6',
    text: '#241B30',
    textSecondary: '#6A5F76',
    textTertiary: '#A79CAE',
    accent: '#7C5CFF',
    accentLight: 'rgba(124,92,255,0.12)',
  },
  gradients: {
    bg: ['#F3EEE9', '#EAE5F0', '#E6ECF3'],
    accent: ['#7C5CFF', '#22D3EE', '#E879C9'],
    card: ['rgba(255,255,255,0.65)', 'rgba(245,240,248,0.45)'],
  },
  preview: { bg: '#ECE7EF', surface: '#F6F1F6', accent: '#7C5CFF', card: '#EAE5F0' },
};

// ─── 21. Nebula Glass (Dark — iridescent on violet-black) ──────────────────
// The same shimmer as Iridescence, glowing on a deep violet-black ground.
const nebulaGlass: ThemeDefinition = {
  id: 'nebula-glass',
  name: 'Nebula Glass',
  description: 'Iridescent glow on deep violet-black glass',
  emoji: '🌌',
  isDark: true,
  colors: {
    bg: '#0D0A1A',
    surface: '#15112A',
    card: '#1D1738',
    border: '#2C2452',
    muted: '#372C63',
    subtle: '#473A7D',
    text: '#EDE9FF',
    textSecondary: '#A99FD6',
    textTertiary: '#6E6498',
    accent: '#A78BFA',
    accentLight: 'rgba(167,139,250,0.18)',
  },
  gradients: {
    bg: ['#0D0A1A', '#150F2E', '#1B1340'],
    accent: ['#22D3EE', '#A78BFA', '#F472B6'],
    card: ['rgba(40,30,80,0.55)', 'rgba(25,18,55,0.40)'],
  },
  preview: { bg: '#0D0A1A', surface: '#1D1738', accent: '#A78BFA', card: '#15112A' },
};

// ─── Master Registry ──────────────────────────────────────────────────────
export const THEMES: ThemeDefinition[] = [
  // Originals
  midnight,
  // ivory,
  // obsidian,
  // aurora,
  // ember,
  // galaxy,
  // ocean,
  // sand,
  // rose,
  // forest,
  // slate,
  // neon,
  // // Classic / modern palettes
  // mocha,
  latte,
  tokyoNight,
  // nord,
  // rosePine,
  // rosePineDawn,
  // Iridescent / holographic glass
  prism,
  iridescence,
  nebulaGlass,
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

// ─── Convenience: themes that ship an iridescent gradient ──────────────────
export const GRADIENT_THEMES = THEMES.filter((t) => !!t.gradients);