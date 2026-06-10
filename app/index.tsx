import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { UtilityCard } from '@/components/common/UtilityCard';
import { SearchBar } from '@/components/common/SearchBar';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import {
  UTILITY_REGISTRY,
  searchUtilities,
  getUtilityById,
} from '@/registry';
import { spacing, typography, radius } from '@/theme';
import { CATEGORIES } from '@/constants';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type UtilityEntry = typeof UTILITY_REGISTRY[number];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { ids: favouriteIds } = useFavouritesStore();
  const { entries: recentEntries } = useRecentsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0.96], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 60], [0, -3], Extrapolate.CLAMP),
      },
    ],
  }));

  const filteredUtilities = useMemo(
    () => searchUtilities(searchQuery),
    [searchQuery]
  );

  const favouriteUtilities = useMemo(
    () =>
      favouriteIds
        .map((id) => getUtilityById(id))
        .filter(Boolean) as UtilityEntry[],
    [favouriteIds]
  );

  const recentUtilities = useMemo(() => {
    return recentEntries
      .slice(0, 8)
      .map((e) => getUtilityById(e.utilityId))
      .filter((u): u is UtilityEntry => !!u);
  }, [recentEntries]);

  // Group all utilities by category (excluding already shown fav/recent)
  const groupedUtilities = useMemo(() => {
    const groups: Record<string, UtilityEntry[]> = {};
    const filteredIds = new Set(filteredUtilities.map((u) => u.id));
    UTILITY_REGISTRY.forEach((u) => {
      if (!filteredIds.has(u.id)) return;
      if (!groups[u.category]) groups[u.category] = [];
      groups[u.category].push(u);
    });
    return groups;
  }, [filteredUtilities]);

  const renderGrid = (utilities: UtilityEntry[]) => {
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < utilities.length; i += 4) {
      const chunk = utilities.slice(i, i + 4);
      rows.push(
        <View key={i} style={styles.cardRow}>
          {chunk.map((u) => (
            <UtilityCard
              key={u.id}
              utility={u}
              recentEntry={recentEntries.find((r) => r.utilityId === u.id)}
            />
          ))}
        </View>
      );
    }
    return <View style={styles.gridContainer}>{rows}</View>;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={colors.bg === '#0A0A0F' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />

      {/* Sticky Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            paddingTop: top + spacing.xs,
            borderBottomColor: colors.border,
          },
          headerAnimatedStyle,
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.appName, { color: colors.textSecondary }]}>
              UtilityKit
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Tools
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.settingsBtn, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Ionicons
              name="settings-outline"
              size={19}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </Animated.View>

      {/* Scrollable body */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: spacing['5xl'] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {searchQuery.trim() ? (
          /* ── Search results ───────────────────────────────────────── */
          <Animated.View entering={FadeInDown.duration(200)}>
            <SectionLabel
              title={`${filteredUtilities.length} result${filteredUtilities.length !== 1 ? 's' : ''}`}
              colors={colors}
            />
            {renderGrid(filteredUtilities)}
            {filteredUtilities.length === 0 && (
              <View style={styles.emptySearch}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No tools found
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Try a different search term
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <>
            {/* ── Favourites ─────────────────────────────────────────── */}
            {favouriteUtilities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(0).duration(400)}>
                <SectionLabel
                  title="Favourites"
                  icon="star"
                  iconColor="#F59E0B"
                  colors={colors}
                  count={favouriteUtilities.length}
                />
                {renderGrid(favouriteUtilities)}
              </Animated.View>
            )}

            {/* ── Recently Used ──────────────────────────────────────── */}
            {recentUtilities.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).duration(400)}>
                <SectionLabel
                  title="Recently Used"
                  icon="time"
                  iconColor="#6366F1"
                  colors={colors}
                />
                {renderGrid(recentUtilities)}
              </Animated.View>
            )}

            {/* ── All tools by category ──────────────────────────────── */}
            {Object.entries(groupedUtilities).map(([category, utilities], idx) => {
              const catInfo = CATEGORIES[category as keyof typeof CATEGORIES];
              return (
                <Animated.View
                  key={category}
                  entering={FadeInDown.delay(160 + idx * 50).duration(400)}
                >
                  <SectionLabel
                    title={catInfo?.label ?? category}
                    emoji={catInfo?.emoji}
                    colors={colors}
                  />
                  {renderGrid(utilities)}
                </Animated.View>
              );
            })}
          </>
        )}
      </AnimatedScrollView>
    </View>
  );
}

// ── Section label sub-component ────────────────────────────────────────────
function SectionLabel({
  title,
  icon,
  iconColor,
  emoji,
  colors,
  count,
}: {
  title: string;
  icon?: string;
  iconColor?: string;
  emoji?: string;
  colors: any;
  count?: number;
}) {
  return (
    <View style={styles.sectionLabel}>
      {emoji ? (
        <Text style={styles.sectionEmoji}>{emoji}</Text>
      ) : icon ? (
        <Ionicons
          name={icon as any}
          size={12}
          color={iconColor ?? colors.textSecondary}
        />
      ) : null}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.countText, { color: colors.textTertiary }]}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  appName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: -1.2,
    lineHeight: 36,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  gridContainer: { gap: spacing.sm },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionEmoji: { fontSize: 12 },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 20,
  },
  countText: { fontSize: 10, fontWeight: typography.weights.bold },
  emptySearch: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  emptySub: { fontSize: typography.sizes.base },
});
