import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { UtilityCard } from '@/components/common/UtilityCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { UTILITY_REGISTRY } from '@/registry';
import { spacing, typography, radius } from '@/theme';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

type UtilityEntry = typeof UTILITY_REGISTRY[number];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { ids: favouriteIds = [] }    = useFavouritesStore();
  const { entries: recentEntries = [] } = useRecentsStore();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0.96], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 60], [0, -3], Extrapolate.CLAMP) },
    ],
  }));

  // ── Sort: recents first (by lastUsed desc), then the rest in registry order
  const sortedUtilities = useMemo<UtilityEntry[]>(() => {
    const recentMap = new Map(recentEntries.map(e => [e.utilityId, e.lastUsed]));

    return [...UTILITY_REGISTRY].sort((a, b) => {
      const aTime = recentMap.get(a.id) ?? 0;
      const bTime = recentMap.get(b.id) ?? 0;
      // Both recently used → most recent first
      if (aTime && bTime) return bTime - aTime;
      // One recently used → it goes first
      if (aTime) return -1;
      if (bTime) return 1;
      // Neither used → preserve original registry order (stable sort)
      return 0;
    });
  }, [recentEntries]);

  // ── Render flat 4-column grid ──────────────────────────────────────────
  const renderGrid = (utilities: UtilityEntry[]) => {
    const rows: React.ReactNode[] = [];
    for (let i = 0; i < utilities.length; i += 4) {
      const chunk = utilities.slice(i, i + 4);
      rows.push(
        <View key={i} style={styles.row}>
          {chunk.map((u) => (
            <UtilityCard
              key={u.id}
              utility={u}
              recentEntry={recentEntries.find((r) => r.utilityId === u.id)}
            />
          ))}
          {/* Fill empty slots in the last row so cards stay left-aligned */}
          {chunk.length < 4 &&
            Array.from({ length: 4 - chunk.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.emptySlot} />
            ))}
        </View>
      );
    }
    return rows;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
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
            <Ionicons name="settings-outline" size={19} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── Grid ── */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.grid}
        >
          {renderGrid(sortedUtilities)}
        </Animated.View>
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    padding: spacing.base,
    paddingBottom: spacing['5xl'],
  },
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptySlot: {
    flex: 1,
  },
});