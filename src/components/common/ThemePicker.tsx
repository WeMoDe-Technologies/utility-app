import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { THEMES, DARK_THEMES, LIGHT_THEMES, type ThemeDefinition } from '@/theme/themes';
import { PressablePlate, Segmented, onColour } from '@/components/ui';
import { spacing, radius, typography, border, plate } from '@/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD = spacing.base;
const GRID_GAP = spacing.sm;
const CARD_W = (SCREEN_W - GRID_PAD * 2 - GRID_GAP * 2) / 3;

type FilterTab = 'all' | 'dark' | 'light';

/**
 * Themes are presented as material samples — a swatch card showing the actual
 * paper, ink and accent, the way a printer's sample book works.
 */
export function ThemePicker() {
  const { themeId: activeThemeId } = useTheme();
  const setThemeId = usePreferencesStore((s) => s.setThemeId);
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered =
    filter === 'dark' ? DARK_THEMES : filter === 'light' ? LIGHT_THEMES : THEMES;

  return (
    <View style={styles.wrapper}>
      <Segmented
        options={[
          { value: 'all', label: 'All' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <View style={styles.grid}>
        {filtered.map((theme) => (
          <ThemeSwatch
            key={theme.id}
            theme={theme}
            isActive={theme.id === activeThemeId}
            onSelect={() => setThemeId(theme.id)}
          />
        ))}
      </View>
    </View>
  );
}

function ThemeSwatch({
  theme,
  isActive,
  onSelect,
}: {
  theme: ThemeDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { colors } = useTheme();

  return (
    <PressablePlate
      onPress={onSelect}
      accessibilityLabel={`${theme.name} theme. ${theme.description}`}
      selected={isActive}
      offset={isActive ? plate.base : plate.low}
      radius={radius.md}
      borderWidth={isActive ? border.thick : border.base}
      fill={theme.colors.bg}
      borderColor={isActive ? colors.accent : colors.border}
      style={styles.cardOuter}
      contentStyle={styles.card}
    >
      {/* Material sample: the theme's own surfaces, drawn in miniature */}
      <View style={styles.sample}>
        <View style={[styles.sampleBar, { backgroundColor: theme.colors.accent }]} />
        <View style={styles.sampleBody}>
          <View
            style={[
              styles.sampleTile,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          />
          <View
            style={[
              styles.sampleTile,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          />
          <View
            style={[
              styles.sampleTile,
              { backgroundColor: theme.colors.accent, borderColor: theme.colors.border },
            ]}
          />
        </View>
      </View>

      {/* Stamped label */}
      <View style={[styles.label, { borderTopColor: theme.colors.border }]}>
        <Text
          style={[styles.name, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {theme.name.toUpperCase()}
        </Text>
        <Text style={[styles.kind, { color: theme.colors.textTertiary }]}>
          {theme.isDark ? 'DARK' : 'LIGHT'}
        </Text>
      </View>

      {isActive && (
        <View style={[styles.check, { backgroundColor: colors.accent, borderColor: colors.border }]}>
          <Ionicons name="checkmark" size={10} color={onColour(colors.accent)} />
        </View>
      )}
    </PressablePlate>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cardOuter: { width: CARD_W - plate.base },
  card: { overflow: 'hidden' },

  sample: { height: 62 },
  sampleBar: { height: 10 },
  sampleBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  sampleTile: {
    flex: 1,
    height: 22,
    borderWidth: 1,
    borderRadius: 2,
  },

  label: {
    borderTopWidth: border.base,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 1,
  },
  name: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  kind: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
  },

  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
