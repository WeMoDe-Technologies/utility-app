import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, typography, shadows } from '@/theme';

interface UtilityHeaderProps {
  title: string;
  utilityId: string;
  accentColor: string;
  onClearData?: () => void;
}

export function UtilityHeader({
  title,
  utilityId,
  accentColor,
  onClearData,
}: UtilityHeaderProps) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const { isFavourite, toggleFavourite } = useFavouritesStore();
  const { hapticFeedback } = usePreferencesStore();
  const favourite = isFavourite(utilityId);

  const handleBack = () => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleFav = () => {
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavourite(utilityId);
  };

  const handleClear = () => {
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClearData?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingTop: top + spacing.sm,
          borderBottomColor: colors.border,
        },
        shadows.sm,
      ]}
    >
      <StatusBar
        barStyle={colors.bg === '#0A0A0F' ? 'light-content' : 'dark-content'}
      />

      {/* Back button */}
      <Pressable onPress={handleBack} style={styles.iconBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>

      {/* Title */}
      <View style={styles.titleContainer}>
        <View
          style={[styles.titleDot, { backgroundColor: accentColor }]}
        />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Right actions */}
      <View style={styles.rightActions}>
        {onClearData && (
          <Pressable onPress={handleClear} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable onPress={handleFav} style={styles.iconBtn} hitSlop={8}>
          <Ionicons
            name={favourite ? 'star' : 'star-outline'}
            size={20}
            color={favourite ? '#F59E0B' : colors.textSecondary}
          />
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
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.xs,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
