import Constants from 'expo-constants';
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
export const APP_NAME = 'Kit';

/**
 * Read from the Expo config, which is what a build is actually stamped with.
 *
 * This was a hardcoded '1.0.0' sitting next to `version` in app.config.ts —
 * two sources of truth for the same number. The update gate compares this
 * against the published manifest, so a bumped config with a stale constant
 * would have gated the wrong version. The literal remains only as a fallback
 * for the case where the config is somehow unreadable.
 */
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_BUILD =
  Constants.expoConfig?.android?.versionCode?.toString() ??
  Constants.expoConfig?.ios?.buildNumber ??
  '1';

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
