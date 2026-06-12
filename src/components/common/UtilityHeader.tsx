import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { UTILITY_REGISTRY } from '@/registry';
import { UtilityIcon } from './UtilityIcon';
import { spacing, typography, radius } from '@/theme';

interface UtilityHeaderProps {
  title: string;
  utilityId: string;
  accentColor: string;
  onClearData?: () => void;
}

export function UtilityHeader({ title, utilityId, accentColor, onClearData }: UtilityHeaderProps) {
  const { colors, isDark } = useTheme();
  const { top } = useSafeAreaInsets();
  const { isFavourite, toggleFavourite } = useFavouritesStore();
  const { hapticFeedback } = usePreferencesStore();
  const favourite = isFavourite(utilityId);

  // Look up the utility's icon so the header carries its identity
  const utility = UTILITY_REGISTRY.find((u) => u.id === utilityId);

  const starScale = useSharedValue(1);
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  const handleBack = () => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleFav = useCallback(() => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Pop animation on toggle
    starScale.value = withSequence(
      withTiming(0.7, { duration: 70 }),
      withSpring(1.25, { damping: 7, stiffness: 300 }),
      withSpring(1, { damping: 12 })
    );
    toggleFavourite(utilityId);
  }, [utilityId, hapticFeedback]);

  const handleClear = () => {
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Clear Data', 'This will reset all saved state for this utility.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: onClearData },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingTop: top + spacing.sm,
          borderBottomColor: colors.border,
          shadowColor: isDark ? accentColor : '#000',
        },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Accent gradient wash — subtle identity tint across the header */}
      <LinearGradient
        colors={[accentColor + (isDark ? '20' : '12'), accentColor + '00']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Back */}
      <Pressable
        onPress={handleBack}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: pressed ? colors.muted : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      {/* Icon chip + Title */}
      <View style={styles.titleContainer}>
        <View style={[styles.iconChip, { backgroundColor: accentColor + '1E' }]}>
          {utility ? (
            <UtilityIcon utility={utility} size={14} color={accentColor} />
          ) : (
            <View style={[styles.titleDot, { backgroundColor: accentColor }]} />
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right actions */}
      <View style={styles.rightActions}>
        {onClearData && (
          <Pressable
            onPress={handleClear}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable
          onPress={handleFav}
          hitSlop={8}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: favourite ? '#F59E0B1A' : pressed ? colors.muted : colors.card,
              borderColor: favourite ? '#F59E0B40' : colors.border,
            },
          ]}
        >
          <Animated.View style={starStyle}>
            <Ionicons
              name={favourite ? 'star' : 'star-outline'}
              size={16}
              color={favourite ? '#F59E0B' : colors.textSecondary}
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleDot: { width: 8, height: 8, borderRadius: 4 },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
});