import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { UtilityIcon } from './UtilityIcon';
import { QuickActionsSheet } from './QuickActionsSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, radius, typography, shadows } from '@/theme';
import { CARD_SIZE } from '@/constants';
import type { UtilityDefinition, RecentEntry } from '@/types';

interface UtilityCardProps {
  utility: UtilityDefinition;
  recentEntry?: RecentEntry;
}

export function UtilityCard({ utility, recentEntry }: UtilityCardProps) {
  const { colors } = useTheme();
  const { isFavourite } = useFavouritesStore();
  const { recordUsage } = useRecentsStore();
  const { hapticFeedback, showUsageCount } = usePreferencesStore();
  const [sheetVisible, setSheetVisible] = useState(false);

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordUsage(utility.id);
    router.push(utility.route as any);
  }, [utility, hapticFeedback]);

  const handleLongPress = useCallback(() => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSheetVisible(true);
  }, [hapticFeedback]);

  const favourite = isFavourite(utility.id);

  return (
    <>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed ? colors.muted : colors.card,
              borderColor: pressed ? utility.color + '50' : colors.border,
              width: CARD_SIZE,
            },
            shadows.sm,
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: utility.color + '1A' },
            ]}
          >
            <UtilityIcon utility={utility} size={20} color={utility.color} />
          </View>

          {/* Name */}
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={2}
          >
            {utility.title}
          </Text>

          {/* Usage count */}
          {showUsageCount && recentEntry && recentEntry.useCount > 1 && (
            <Text style={[styles.usageCount, { color: colors.textTertiary }]}>
              {recentEntry.useCount}×
            </Text>
          )}

          {/* Favourite star */}
          {favourite && (
            <View style={styles.favBadge}>
              <Ionicons name="star" size={8} color="#F59E0B" />
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
    minHeight: CARD_SIZE + 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    lineHeight: 14,
  },
  usageCount: {
    fontSize: 9,
    fontWeight: typography.weights.medium,
  },
  favBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
