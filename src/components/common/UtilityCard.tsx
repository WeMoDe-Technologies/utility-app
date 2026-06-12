import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { UtilityIcon } from './UtilityIcon';
import { QuickActionsSheet } from './QuickActionsSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, radius, typography } from '@/theme';
import { CARD_SIZE } from '@/constants';
import type { UtilityDefinition, RecentEntry } from '@/types';

interface UtilityCardProps {
  utility: UtilityDefinition;
  recentEntry?: RecentEntry;
  /** Optional index for staggered entrance animation (backwards compatible) */
  index?: number;
}

/** Darken a hex colour by `amount` (0–1) — used for the gradient's bottom stop. */
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function UtilityCard({ utility, recentEntry, index = 0 }: UtilityCardProps) {
  const { colors, isDark } = useTheme();
  const { isFavourite } = useFavouritesStore();
  const { recordUsage } = useRecentsStore();
  const { hapticFeedback, showUsageCount } = usePreferencesStore();
  const [sheetVisible, setSheetVisible] = useState(false);

  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 18, stiffness: 320 });
    iconScale.value = withSpring(1.12, { damping: 14, stiffness: 260 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    iconScale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, []);

  const handlePress = useCallback(() => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordUsage(utility.id);
    router.push(utility.route as any);
  }, [utility, hapticFeedback]);

  const handleLongPress = useCallback(() => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    iconScale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 10 })
    );
    setSheetVisible(true);
  }, [hapticFeedback]);

  const favourite = isFavourite(utility.id);
  const gradTop = utility.color;
  const gradBottom = shade(utility.color, 0.35);

  return (
    <>
      <Animated.View
        entering={FadeInDown.delay(Math.min(index * 35, 450)).duration(360).springify().damping(16)}
        style={[animatedStyle, { width: CARD_SIZE }]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          delayLongPress={350}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: pressed ? utility.color + '60' : colors.border,
              // Soft glow tinted in the utility colour — reads "premium" on both modes
              shadowColor: isDark ? utility.color : '#1A1A2E',
              shadowOpacity: isDark ? 0.22 : 0.08,
            },
          ]}
        >
          {/* Gradient icon tile with colour-matched glow */}
          <Animated.View style={iconAnimatedStyle}>
            <LinearGradient
              colors={[gradTop, gradBottom]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[
                styles.iconTile,
                {
                  shadowColor: utility.color,
                },
              ]}
            >
              {/* Glass highlight on top half of the tile */}
              <View style={styles.iconTileSheen} />
              <UtilityIcon utility={utility} size={20} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Name */}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {utility.title}
          </Text>

          {/* Usage count */}
         {/* {showUsageCount && recentEntry && recentEntry.useCount > 1 && (
            <View style={[styles.usagePill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.usageCount, { color: colors.textSecondary }]}>
                {recentEntry.useCount}×
              </Text>
            </View>
          )}  */}

          {/* Favourite badge */}
          {favourite && (
            <View style={styles.favBadge}>
              <Ionicons name="star" size={9} color="#F59E0B" />
            </View>
          )}
        </Pressable>
      </Animated.View>

      <QuickActionsSheet
        utility={utility}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: CARD_SIZE + 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  iconTileSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  title: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    lineHeight: 14,
    letterSpacing: -0.1,
  },
  usagePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radius.full,
  },
  usageCount: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  favBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});