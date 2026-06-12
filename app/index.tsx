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
import Svg, { Rect } from 'react-native-svg';
import {
  useFonts,
  SpaceGrotesk_700Bold,
  SpaceGrotesk_500Medium,
} from '@expo-google-fonts/space-grotesk';

import { UtilityCard } from '@/components/common/UtilityCard';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { UTILITY_REGISTRY } from '@/registry';
import { spacing, typography, radius } from '@/theme';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
type UtilityEntry = typeof UTILITY_REGISTRY[number];

// ─── Toolr wordmark logo ─────────────────────────────────────────────────────
// A compact "T" glyph mark in a rounded square, matching app accent colour
function ToolrMark({ accent, bg }: { accent: string; bg: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34">
      {/* Rounded square background */}
      <Rect x={0} y={0} width={34} height={34} rx={10} fill={accent} />
      {/* Bold "T" crossbar */}
      <Rect x={7} y={9} width={20} height={4} rx={2} fill={bg} />
      {/* Bold "T" stem */}
      <Rect x={15} y={9} width={4} height={17} rx={2} fill={bg} />
    </Svg>
  );
}

// ─── Settings icon — custom modern grid icon ─────────────────────────────────
function SettingsIcon({ color }: { color: string }) {
  // Three horizontal lines with a dot indicator — modern "tune" style
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      {/* Line 1 + knob */}
      <Rect x={2} y={4} width={16} height={1.8} rx={0.9} fill={color} opacity={0.9} />
      <Rect x={10} y={2.4} width={4} height={5} rx={2} fill={color} opacity={0.9} />
      {/* Line 2 + knob */}
      <Rect x={2} y={9.1} width={16} height={1.8} rx={0.9} fill={color} opacity={0.9} />
      <Rect x={4} y={7.5} width={4} height={5} rx={2} fill={color} opacity={0.9} />
      {/* Line 3 + knob */}
      <Rect x={2} y={14.2} width={16} height={1.8} rx={0.9} fill={color} opacity={0.9} />
      <Rect x={12} y={12.6} width={4} height={5} rx={2} fill={color} opacity={0.9} />
    </Svg>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { colors, theme } = useTheme();
  const { top } = useSafeAreaInsets();
  const { favourites: favouriteIds = [] }   = useFavouritesStore();
  const { recents: recentEntries = [] }     = useRecentsStore();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
  });

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Subtle header compress on scroll
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [1, 0.97], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, 80], [0, -2], Extrapolate.CLAMP) },
    ],
  }));

  // Pill badge: total utility count
  const totalCount = UTILITY_REGISTRY.length;

  // Sort: recents first, then registry order
  const sortedUtilities = useMemo<UtilityEntry[]>(() => {
    const recentMap = new Map(recentEntries.map((e) => [e.id, e.lastUsedAt]));
    return [...UTILITY_REGISTRY].sort((a, b) => {
      const at = recentMap.get(a.id) ?? 0;
      const bt = recentMap.get(b.id) ?? 0;
      if (at && bt) return bt - at;
      if (at) return -1;
      if (bt) return 1;
      return 0;
    });
  }, [recentEntries]);

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
              recentEntry={recentEntries.find((r) => r.id === u.id)}
            />
          ))}
          {chunk.length < 4 &&
            Array.from({ length: 4 - chunk.length }).map((_, j) => (
              <View key={`empty-${j}`} style={styles.emptySlot} />
            ))}
        </View>
      );
    }
    return rows;
  };

  const accent = theme?.colors?.accent ?? '#6366F1';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>

      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: top + 10,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          headerStyle,
        ]}
      >
        {/* ── Top row: logo + wordmark + settings ── */}
        <View style={styles.headerTop}>

          {/* Left: mark + wordmark stacked */}
          <View style={styles.brandRow}>
            <ToolrMark accent={accent} bg={colors.surface} />
            <View style={styles.wordmarkCol}>
              <Text
                style={[
                  styles.wordmark,
                  {
                    color: colors.text,
                    fontFamily: fontsLoaded ? 'SpaceGrotesk_700Bold' : undefined,
                  },
                ]}
              >
                Toolr
              </Text>
              <Text
                style={[
                  styles.tagline,
                  {
                    color: colors.textSecondary,
                    fontFamily: fontsLoaded ? 'SpaceGrotesk_500Medium' : undefined,
                  },
                ]}
              >
                Your pocket utility kit
              </Text>
            </View>
          </View>

          {/* Right: count badge + settings */}
          <View style={styles.headerActions}>
            {/* Utility count badge */}
            <View style={[styles.countBadge, { backgroundColor: accent + '18', borderColor: accent + '35' }]}>
              <Text style={[styles.countBadgeTxt, { color: accent }]}>
                {totalCount} tools
              </Text>
            </View>

            {/* Settings button */}
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={10}
              style={({ pressed }) => [
                styles.settingsBtn,
                {
                  backgroundColor: pressed ? colors.card : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <SettingsIcon color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* ── Divider with gradient shimmer ── */}
        <View style={[styles.headerDivider, { backgroundColor: colors.border }]} />
      </Animated.View>

      {/* ══════════════════════════════════════════
          GRID
      ══════════════════════════════════════════ */}
      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={styles.grid}>
            {renderGrid(sortedUtilities)}
          </View>
        </Animated.View>
      </AnimatedScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  wordmarkCol: {
    gap: 1,
  },
  wordmark: {
    fontSize: 26,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 0.1,
    lineHeight: 14,
  },

  // Right actions
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  countBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
    opacity: 0.6,
  },

  // Grid
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing['5xl'],
  },
  grid: { gap: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm },
  emptySlot: { flex: 1 },
});