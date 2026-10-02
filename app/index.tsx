import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Keyboard,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { UtilityCard } from '@/components/common/UtilityCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { Plate, PressablePlate, Rule, useHaptic, onColour } from '@/components/ui';
import { UTILITY_REGISTRY } from '@/registry';
import { CATEGORIES, type CategoryKey } from '@/constants';
import { spacing, typography, radius, border, plate } from '@/theme';
import type { UtilityDefinition } from '@/types';

// Section order: most-reached-for first.
const CATEGORY_ORDER: CategoryKey[] = ['math', 'converter', 'finance', 'time', 'productivity', 'tools'];

/**
 * KIT — the logotype. Three letters in a ruled box, the way a tool is stamped
 * with its maker's mark.
 */
function KitMark({ fg, bg }: { fg: string; bg: string }) {
  return (
    <View style={[styles.mark, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[styles.markText, { color: fg }]}>KIT</Text>
    </View>
  );
}

// ─── Grid of tool keys, 4 per row ────────────────────────────────────────────
function Grid({ utilities }: { utilities: UtilityDefinition[] }) {
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < utilities.length; i += 4) {
    const chunk = utilities.slice(i, i + 4);
    rows.push(
      <View key={i} style={styles.row}>
        {chunk.map((u, j) => (
          <UtilityCard key={u.id} utility={u} index={i + j} />
        ))}
        {chunk.length < 4 &&
          Array.from({ length: 4 - chunk.length }).map((_, j) => (
            <View key={`empty-${j}`} style={styles.emptySlot} />
          ))}
      </View>
    );
  }
  return <View style={styles.gridRows}>{rows}</View>;
}

/** A ruled section title, numbered like an index. */
function SectionTitle({
  label,
  count,
  index,
}: {
  label: string;
  count?: number;
  index?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionRow}>
      {index ? (
        <Text style={[styles.sectionIndex, { color: colors.accent }]}>{index}</Text>
      ) : null}
      <Text style={[styles.sectionLabel, { color: colors.text }]}>{label.toUpperCase()}</Text>
      <Rule style={styles.sectionRule} />
      {count !== undefined && (
        <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>
          {String(count).padStart(2, '0')}
        </Text>
      )}
    </View>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const favouriteIds = useFavouritesStore((s) => s.favourites);
  const recentEntries = useRecentsStore((s) => s.recents);
  const haptic = useHaptic();

  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const totalCount = UTILITY_REGISTRY.length;
  const trimmedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return UTILITY_REGISTRY.filter((u) =>
      u.title.toLowerCase().includes(trimmedQuery) ||
      u.description.toLowerCase().includes(trimmedQuery) ||
      u.category.toLowerCase().includes(trimmedQuery)
    );
  }, [trimmedQuery]);

  const favourites = useMemo(
    () => UTILITY_REGISTRY.filter((u) => favouriteIds.includes(u.id)),
    [favouriteIds],
  );

  const recents = useMemo(() => {
    return [...recentEntries]
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 8)
      .map((e) => UTILITY_REGISTRY.find((u) => u.id === e.id))
      .filter((u): u is UtilityDefinition => !!u);
  }, [recentEntries]);

  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((key) => ({
      key,
      meta: CATEGORIES[key],
      items: UTILITY_REGISTRY.filter((u) => u.category === key),
    })).filter((g) => g.items.length > 0);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    Keyboard.dismiss();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>

      {/* ══════════ FASCIA ══════════ */}
      <View
        style={[
          styles.header,
          { paddingTop: top + spacing.sm, backgroundColor: colors.surface },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.brandRow}>
            <KitMark fg={colors.text} bg={colors.accent} />
            <View style={styles.wordmarkCol}>
              <Text style={[styles.wordmark, { color: colors.text }]}>KIT</Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                {String(totalCount).padStart(2, '0')} POCKET TOOLS
              </Text>
            </View>
          </View>

          <PressablePlate
            onPress={() => { haptic('light'); router.push('/settings'); }}
            accessibilityLabel="Settings"
            offset={plate.low}
            radius={radius.sm}
            fill={colors.card}
            contentStyle={styles.settingsBtn}
          >
            <Ionicons name="options-outline" size={18} color={colors.text} />
          </PressablePlate>
        </View>

        {/* Search well */}
        <Plate
          offset={plate.flush}
          radius={radius.sm}
          fill={colors.muted}
          borderColor={searchFocused ? colors.accent : colors.subtle}
          contentStyle={styles.search}
        >
          <Ionicons
            name="search"
            size={15}
            color={searchFocused ? colors.accent : colors.textTertiary}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="SEARCH TOOLS"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={colors.accent}
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </Plate>
      </View>

      <View style={[styles.fasciaRule, { backgroundColor: colors.border }]} />

      {/* ══════════ INDEX ══════════ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchResults ? (
          searchResults.length > 0 ? (
            <Animated.View entering={FadeIn.duration(140)}>
              <SectionTitle label="Results" count={searchResults.length} />
              <Grid utilities={searchResults} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(140)}>
              <Plate contentStyle={styles.noResults}>
                <Text style={[styles.noResultsTitle, { color: colors.text }]}>
                  NO MATCH
                </Text>
                <Text style={[styles.noResultsSub, { color: colors.textSecondary }]}>
                  Nothing in the kit matches “{query.trim()}”. Try a shorter word, or
                  browse the sections below.
                </Text>
                <PressablePlate
                  onPress={clearSearch}
                  offset={plate.low}
                  radius={radius.sm}
                  fill={colors.accent}
                  contentStyle={styles.noResultsBtn}
                >
                  <Text style={[styles.noResultsBtnTxt, { color: onColour(colors.accent) }]}>
                    CLEAR SEARCH
                  </Text>
                </PressablePlate>
              </Plate>
            </Animated.View>
          )
        ) : (
          <>
            {favourites.length > 0 && (
              <View style={styles.section}>
                <SectionTitle label="Favourites" count={favourites.length} index="★" />
                <Grid utilities={favourites} />
              </View>
            )}

            {recents.length > 0 && (
              <View style={styles.section}>
                <SectionTitle label="Recent" index="↻" />
                <Grid utilities={recents} />
              </View>
            )}

            {grouped.map((group, i) => (
              <View key={group.key} style={styles.section}>
                <SectionTitle
                  label={group.meta.label}
                  count={group.items.length}
                  index={String(i + 1).padStart(2, '0')}
                />
                <Grid utilities={group.items} />
              </View>
            ))}

            <Text style={[styles.colophon, { color: colors.textTertiary }]}>
              KIT · {String(totalCount).padStart(2, '0')} TOOLS · NO ACCOUNT · WORKS OFFLINE
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Brand
  mark: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wordmarkCol: { gap: 2 },
  wordmark: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
    lineHeight: 28,
  },
  tagline: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: typography.tracking.legend,
  },

  settingsBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 40,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.6,
    padding: 0,
  },

  fasciaRule: { height: border.thick },

  // Index
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  section: { marginBottom: spacing.xl },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIndex: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: typography.tracking.legend,
  },
  sectionRule: { flex: 1 },
  sectionCount: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Grid
  gridRows: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  emptySlot: { flex: 1 },

  // Empty search
  noResults: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  noResultsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '800',
    letterSpacing: typography.tracking.legend,
  },
  noResultsSub: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 19,
  },
  noResultsBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noResultsBtnTxt: { fontSize: typography.sizes.sm, fontWeight: '800', letterSpacing: 0.8 },

  colophon: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
