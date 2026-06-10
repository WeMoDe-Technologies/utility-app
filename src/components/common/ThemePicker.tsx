import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { THEMES, DARK_THEMES, LIGHT_THEMES, ThemeDefinition } from '@/theme/themes';
import { spacing, radius, typography, shadows } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');
// 3-column grid with gaps
const GRID_PAD = spacing.base;
const GRID_GAP = spacing.sm;
const CARD_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;

type FilterTab = 'all' | 'dark' | 'light';

export function ThemePicker() {
  const { colors, themeId: activeThemeId } = useTheme();
  const { setThemeId } = usePreferencesStore();
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered =
    filter === 'dark' ? DARK_THEMES
    : filter === 'light' ? LIGHT_THEMES
    : THEMES;

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setThemeId(id);
  };

  return (
    <View style={styles.wrapper}>
      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <View style={[styles.filterBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        {([ 
          { id: 'all', label: 'All', icon: 'color-palette-outline' },
          { id: 'dark', label: 'Dark', icon: 'moon-outline' },
          { id: 'light', label: 'Light', icon: 'sunny-outline' },
        ] as { id: FilterTab; label: string; icon: string }[]).map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { setFilter(tab.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.filterTab,
              filter === tab.id && { backgroundColor: colors.accent },
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={13}
              color={filter === tab.id ? '#fff' : colors.textSecondary}
            />
            <Text style={[
              styles.filterTabText,
              { color: filter === tab.id ? '#fff' : colors.textSecondary },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Theme grid ──────────────────────────────────────────────── */}
      <View style={styles.grid}>
        {filtered.map((theme, index) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={theme.id === activeThemeId}
            onSelect={() => handleSelect(theme.id)}
            index={index}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Individual theme card ─────────────────────────────────────────────────
function ThemeCard({
  theme,
  isActive,
  onSelect,
  index,
  colors,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
  index: number;
  colors: any;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(280)}
      style={[animStyle, styles.cardOuter]}
    >
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.92, { damping: 14 }, () => {
            scale.value = withSpring(1, { damping: 12 });
          });
          onSelect();
        }}
        style={[
          styles.card,
          {
            borderColor: isActive ? theme.colors.accent : colors.border,
            borderWidth: isActive ? 2.5 : 1,
          },
          isActive ? {
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
          } : shadows.sm,
        ]}
      >
        {/* ── Mini app preview ──────────────────────────────────── */}
        <View style={[styles.preview, { backgroundColor: theme.preview.bg }]}>
          {/* Simulated status bar dot */}
          <View style={styles.previewStatusBar}>
            <View style={[styles.previewStatusDot, { backgroundColor: theme.preview.accent + '80' }]} />
          </View>

          {/* Simulated header */}
          <View style={[styles.previewHeader, { backgroundColor: theme.preview.surface }]}>
            <View style={[styles.previewHeaderDot, { backgroundColor: theme.preview.accent }]} />
            <View style={[styles.previewHeaderLine, { backgroundColor: theme.preview.accent + '50' }]} />
          </View>

          {/* Simulated utility cards grid */}
          <View style={styles.previewGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: theme.preview.card,
                    borderColor: theme.preview.accent + '25',
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewCardIcon,
                    { backgroundColor: theme.preview.accent + (i === 0 ? 'CC' : '40') },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Bottom accent bar */}
          <View style={[styles.previewAccent, { backgroundColor: theme.preview.accent }]} />
        </View>

        {/* ── Card label ───────────────────────────────────────── */}
        <View style={[styles.cardLabel, { backgroundColor: colors.card }]}>
          <Text style={styles.cardEmoji}>{theme.emoji}</Text>
          <View style={styles.cardLabelText}>
            <Text
              style={[
                styles.cardName,
                { color: isActive ? theme.colors.accent : colors.text },
              ]}
              numberOfLines={1}
            >
              {theme.name}
            </Text>
            <Text style={[styles.cardType, { color: colors.textTertiary }]}>
              {theme.isDark ? '🌙 Dark' : '☀️ Light'}
            </Text>
          </View>
          {isActive && (
            <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="checkmark" size={9} color="#fff" />
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  filterTabText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cardOuter: { width: CARD_W },

  // Card shell
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    width: '100%',
  },

  // Preview pane
  preview: {
    height: 96,
    padding: 7,
    gap: 5,
  },
  previewStatusBar: {
    alignItems: 'flex-end',
    marginBottom: -2,
  },
  previewStatusDot: { width: 14, height: 3, borderRadius: 2 },
  previewHeader: {
    height: 14,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    gap: 4,
  },
  previewHeaderDot: { width: 5, height: 5, borderRadius: 3 },
  previewHeaderLine: { flex: 1, height: 3, borderRadius: 2 },
  previewGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  previewCard: {
    width: '46%',
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  previewCardIcon: { width: 10, height: 10, borderRadius: 3 },
  previewAccent: {
    height: 3,
    borderRadius: 2,
    width: '55%',
    alignSelf: 'center',
  },

  // Label
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 7,
    gap: 4,
  },
  cardEmoji: { fontSize: 13 },
  cardLabelText: { flex: 1 },
  cardName: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.2,
  },
  cardType: { fontSize: 9, fontWeight: typography.weights.medium },
  activeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
