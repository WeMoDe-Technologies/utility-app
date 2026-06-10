# UtilityKit — Premium Expo React Native Utility App

A production-grade, fully-featured utility app ecosystem built with Expo React Native + TypeScript.

---

## Tech Stack

| Dependency | Purpose |
|---|---|
| Expo 51 + Expo Router | Navigation, app shell |
| TypeScript | Type safety |
| Zustand | Global state (favourites, recents, prefs) |
| react-native-mmkv | Ultra-fast local storage |
| React Native Reanimated 3 | Smooth animations |
| React Native Gesture Handler | Gesture support |
| @shopify/flash-list | Performant lists |
| expo-camera / expo-barcode-scanner | QR scanning |
| expo-haptics | Haptic feedback |
| expo-clipboard | Copy/paste |

---

## Project Structure

```
UtilityKit/
├── app/
│   ├── _layout.tsx              # Root layout (providers, Stack nav)
│   ├── index.tsx                # Home dashboard
│   ├── settings.tsx             # Settings screen
│   └── utility/
│       ├── calculator.tsx
│       ├── scientific-calculator.tsx
│       ├── unit-converter.tsx
│       ├── currency-converter.tsx
│       ├── emi-calculator.tsx
│       ├── gst-calculator.tsx
│       ├── qr-scanner.tsx
│       ├── notes.tsx
│       ├── pomodoro.tsx
│       ├── stopwatch.tsx
│       ├── world-clock.tsx
│       ├── password-generator.tsx
│       ├── text-utility.tsx
│       ├── age-calculator.tsx
│       ├── discount-calculator.tsx
│       └── counter.tsx
│
├── src/
│   ├── types/index.ts           # All TypeScript interfaces
│   ├── theme/
│   │   ├── index.ts             # Design tokens (spacing, colors, typography)
│   │   └── ThemeProvider.tsx    # Theme context + hook
│   ├── registry/index.ts        # Utility registry (central metadata)
│   ├── stores/
│   │   ├── preferencesStore.ts  # Theme, haptics, display prefs
│   │   ├── favouritesStore.ts   # Starred utilities
│   │   └── recentsStore.ts      # Recently used tracking
│   ├── hooks/
│   │   └── useUtilityState.ts   # Generic persisted state hook
│   ├── utils/
│   │   └── storage.ts           # MMKV helpers
│   └── components/
│       └── common/
│           ├── UtilityCard.tsx  # Home grid card
│           ├── UtilityHeader.tsx # Screen header w/ fav/clear
│           ├── UtilityIcon.tsx  # Multi-family icon renderer
│           └── SearchBar.tsx    # Animated search input
```

---

## Setup

### 1. Install dependencies

```bash
cd UtilityKit
npm install
```

### 2. Install Expo CLI (if needed)

```bash
npm install -g expo-cli
```

### 3. Start development server

```bash
npx expo start
```

### 4. Run on device/simulator

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android
```

### 5. Native modules (if needed for bare workflow)

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

---

## Architecture Deep Dive

### Persistence Layer

Every utility uses `useUtilityState<T>(utilityId, defaultState)`:

```typescript
const { state, setState, clearState } = useUtilityState<CalculatorState>(
  'calculator',
  DEFAULT_STATE
);
```

- Auto-saves to MMKV on every change (debounced 400ms)
- Hydrates from storage on mount
- `clearState()` resets and wipes storage for that utility only

### Zustand Stores

Three global stores backed by MMKV:

| Store | Persists |
|---|---|
| `usePreferencesStore` | Theme, haptics, display settings |
| `useFavouritesStore` | Array of favourite utility IDs |
| `useRecentsStore` | Recently used list with timestamps + counts |

### Utility Registry

Centralized `UTILITY_REGISTRY` array in `src/registry/index.ts`:
- Defines id, title, icon, route, category, color
- Powers home grid, search, and sorting

### Home Screen Sorting

1. Favourites (in order added)
2. Recently used (sorted by `lastUsedAt`)
3. All utilities by category

---

## Utilities Implemented

| # | Utility | Features |
|---|---|---|
| 1 | Calculator | Full arithmetic, history, history chips |
| 2 | Scientific Calculator | Trig, log, power, π, e, RAD/DEG |
| 3 | Unit Converter | 7 categories, 40+ units, live conversion |
| 4 | Currency Converter | Live rates + fallback, quick table |
| 5 | EMI Calculator | Monthly EMI, total interest, ratio bar |
| 6 | GST Calculator | Exclusive/inclusive, CGST/SGST/IGST split |
| 7 | QR Scanner | Camera scanning, history, copy/open |
| 8 | Notes | Full CRUD notes, pin, color coding |
| 9 | Pomodoro | Work/break/long break cycles, session count |
| 10 | Stopwatch | Lap timer, best/worst lap highlighting |
| 11 | World Clock | Multi-city, add/remove, day/night indicator |
| 12 | Password Generator | Configurable charset, strength meter, history |
| 13 | Text Tools | 16 transformations, stats, copy |
| 14 | Age Calculator | Exact age, zodiac, next birthday, total stats |
| 15 | Discount Calculator | Quick discounts, reverse calculator |
| 16 | Counter | Multi-counter, configurable step, label edit |

---

## Design System

### Color Palette
- Background: `#0A0A0F` (dark) / `#F7F7FC` (light)
- Surface: `#13131A` / `#FFFFFF`
- Card: `#1C1C28` / `#FFFFFF`
- Accent: `#6366F1` (Indigo)

### Typography
- Weights: 400 / 500 / 600 / 700 / 800
- Sizes: 11px → 40px scale

### Animations
- Card press: spring scale 0.93 → 1
- Screen entry: FadeInDown with stagger
- Pomodoro ring: SVG strokeDashoffset
- Timer: Reanimated pulse loop

---

## Environment Notes

- `react-native-mmkv` requires a development build (not Expo Go)
- For Expo Go testing, replace MMKV with `@react-native-async-storage/async-storage`
- Camera permission required for QR scanner on physical devices

### AsyncStorage Fallback (for Expo Go)

In `src/utils/storage.ts`, replace MMKV with:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveJSON<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}
```

Then update `useUtilityState.ts` to be async (use `useEffect` for hydration).

---

## Adding a New Utility

1. Add entry to `src/registry/index.ts`
2. Add type to `src/types/index.ts`
3. Create screen at `app/utility/your-utility.tsx`
4. Use `useUtilityState<YourState>('yourUtilityId', DEFAULT)` for persistence
5. Add `<UtilityHeader>` with `utilityId` and `onClearData`

---

## License

MIT

---

## Theme System (v1.1)

### 12 Built-in Themes

| # | Theme | Mode | Accent | Description |
|---|---|---|---|---|
| 1 | 🌑 Midnight | Dark | Indigo `#6366F1` | Deep dark with indigo accent (default) |
| 2 | ☀️ Ivory | Light | Indigo `#6366F1` | Clean light with indigo accent |
| 3 | ⬛ Obsidian | Dark | Indigo `#6366F1` | True black, OLED optimised |
| 4 | 🌌 Aurora | Dark | Emerald `#10B981` | Dark canvas with emerald glow |
| 5 | 🔥 Ember | Dark | Rose `#F43F5E` | Warm dark with rose fire tones |
| 6 | 🌠 Galaxy | Dark | Violet `#8B5CF6` | Deep space with violet nebula |
| 7 | 🌊 Ocean | Dark | Cyan `#06B6D4` | Deep sea dark with cyan waves |
| 8 | 🏜️ Sand | Light | Amber `#F59E0B` | Warm parchment with amber tones |
| 9 | 🌸 Rose | Light | Pink `#EC4899` | Soft blush light with pink accent |
| 10 | 🌿 Forest | Light | Emerald `#10B981` | Fresh mint light with teal accent |
| 11 | 🩶 Slate | Dark | Sky `#0EA5E9` | Cool blue-gray dark with sky accent |
| 12 | ⚡ Neon | Dark | Lime `#84CC16` | Cyberpunk dark with electric lime |

### Theme Architecture

```
src/theme/
├── index.ts          # Design tokens + re-exports
├── themes.ts         # ThemeDefinition × 12, THEMES[], DARK_THEMES[], LIGHT_THEMES[]
└── ThemeProvider.tsx # Context with themeId, colors, isDark, theme
```

### Using themes in components

```tsx
import { useTheme } from '@/theme/ThemeProvider';

function MyComponent() {
  const { colors, isDark, themeId, theme } = useTheme();
  return (
    <View style={{ backgroundColor: colors.bg }}>
      <Text style={{ color: colors.text }}>Hello</Text>
      <View style={{ backgroundColor: colors.accent }}>...</View>
    </View>
  );
}
```

### Adding a custom theme

In `src/theme/themes.ts`, add a new entry to the `THEMES` array:

```typescript
const myTheme: ThemeDefinition = {
  id: 'my-theme',
  name: 'My Theme',
  description: 'Custom theme description',
  emoji: '🎨',
  isDark: true,
  colors: {
    bg: '#...',
    surface: '#...',
    card: '#...',
    border: '#...',
    muted: '#...',
    subtle: '#...',
    text: '#...',
    textSecondary: '#...',
    textTertiary: '#...',
    accent: '#...',
    accentLight: 'rgba(..., 0.15)',
  },
  preview: {
    bg: '#...',
    surface: '#...',
    accent: '#...',
    card: '#...',
  },
};
```

### Theme Picker UI

- Lives in **Settings → Choose Theme**
- Filterable by All / Dark / Light tabs
- 3-column grid with live mini-app previews
- Each card shows a simulated home screen with the theme applied
- Active theme highlighted with accent-coloured border + glow shadow
- Tap to instantly switch — persisted to MMKV

### Theme Preview Screen

`/theme-preview` — reachable via "Preview" button in Settings banner.
Shows the active theme applied to: typography scale, color token swatches, buttons, utility cards, input, and chips.
