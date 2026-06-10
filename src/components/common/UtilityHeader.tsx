import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  StatusBar,
  Alert,
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
  const { colors, isDark } = useTheme();
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
    Alert.alert(
      'Clear Data',
      'This will reset all saved state for this utility.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClearData },
      ]
    );
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Back */}
      <Pressable onPress={handleBack} style={[styles.iconBtn, { backgroundColor: colors.muted }]} hitSlop={10}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      {/* Title */}
      <View style={styles.titleContainer}>
        <View style={[styles.titleDot, { backgroundColor: accentColor }]} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Right actions */}
      <View style={styles.rightActions}>
        {onClearData && (
          <Pressable onPress={handleClear} style={[styles.iconBtn, { backgroundColor: colors.muted }]} hitSlop={8}>
            <Ionicons name="trash-outline" size={17} color={colors.textSecondary} />
          </Pressable>
        )}
        <Pressable onPress={handleFav} style={[styles.iconBtn, { backgroundColor: favourite ? '#F59E0B18' : colors.muted }]} hitSlop={8}>
          <Ionicons
            name={favourite ? 'star' : 'star-outline'}
            size={17}
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
    gap: spacing.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
