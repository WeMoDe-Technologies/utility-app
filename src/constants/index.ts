import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN = { width, height };

// Grid layout
export const GRID_COLUMNS = 4;
export const GRID_GAP = 8;
export const GRID_PADDING = 16;
export const CARD_SIZE =
  (width - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

// App metadata
export const APP_NAME = 'UtilityKit';
export const APP_VERSION = '1.0.0';
export const APP_BUILD = '1';

// Storage
export const MAX_RECENTS = 20;
export const MAX_HISTORY = 50;
export const SAVE_DEBOUNCE_MS = 400;

// Animations
export const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
};

export const FADE_DURATION = 300;
export const STAGGER_DELAY = 60;

// Haptics
export const HAPTIC_LIGHT = 'light' as const;
export const HAPTIC_MEDIUM = 'medium' as const;

// Utility categories
export const CATEGORIES = {
  math: { label: 'Math', emoji: '🔢' },
  converter: { label: 'Converters', emoji: '🔄' },
  finance: { label: 'Finance', emoji: '💰' },
  productivity: { label: 'Productivity', emoji: '⚡' },
  tools: { label: 'Tools', emoji: '🔧' },
  time: { label: 'Time', emoji: '⏱' },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
