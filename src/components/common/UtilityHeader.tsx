import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useHaptic, toast, onColour } from '@/components/ui';
import { getUtilityById } from '@/registry';
import { UtilityIcon } from './UtilityIcon';
import { spacing, typography, radius, border } from '@/theme';

interface UtilityHeaderProps {
  title: string;
  /** Registry id — also the key this tool's state is stored under. */
  utilityId: string;
  accentColor: string;
  /** Optional one-line status shown under the title (mode, last update…). */
  subtitle?: string;
  onClearData?: () => void;
  /** Extra action rendered to the left of the clear/favourite buttons. */
  rightAction?: React.ReactNode;
}

/**
 * The nameplate at the top of every tool: a solid bar in the tool's ink, with
 * the title stencilled across it and a heavy rule closing it off. It reads as
 * the labelled fascia of a machine rather than a floating app bar.
 */
export function UtilityHeader({
  title,
  utilityId,
  accentColor,
  subtitle,
  onClearData,
  rightAction,
}: UtilityHeaderProps) {
  const { colors } = useTheme();
  const { top } = useSafeAreaInsets();
  const favourite = useFavouritesStore((s) => s.favourites.includes(utilityId));
  const toggleFavourite = useFavouritesStore((s) => s.toggleFavourite);
  const haptic = useHaptic();

  const utility = getUtilityById(utilityId);
  const fg = onColour(accentColor);

  const handleBack = useCallback(() => {
    haptic('light');
    // A deep link can land here with nothing to go back to
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [haptic]);

  const handleFav = useCallback(() => {
    haptic('medium');
    toggleFavourite(utilityId);
    toast(favourite ? 'Removed from favourites' : 'Added to favourites', 'info');
  }, [utilityId, favourite, haptic, toggleFavourite]);

  const handleClear = useCallback(() => {
    haptic('warning');
    Alert.alert(
      `Reset ${title}?`,
      'This clears everything saved for this tool. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            onClearData?.();
            toast('Tool data cleared', 'info');
          },
        },
      ],
    );
  }, [title, onClearData, haptic]);

  return (
    <View style={{ backgroundColor: accentColor, paddingTop: top }}>
      {/* The fascia is the tool's own ink, so the status bar has to contrast
          with *that*, not with the theme — a dark accent under a light theme
          would otherwise render dark-on-dark. */}
      <StatusBar style={fg === '#1E1C19' ? 'dark' : 'light'} />
      <View style={styles.bar}>
        <HeaderKey
          icon="arrow-back"
          label="Go back"
          fg={fg}
          onPress={handleBack}
        />

        <View style={styles.titleContainer}>
          <View style={[styles.iconChip, { borderColor: fg }]}>
            {utility ? (
              <UtilityIcon utility={utility} size={13} color={fg} />
            ) : (
              <View style={[styles.titleDot, { backgroundColor: fg }]} />
            )}
          </View>
          <View style={styles.titleCol}>
            <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: fg }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightActions}>
          {rightAction}
          {onClearData && (
            <HeaderKey icon="trash-outline" label="Reset this tool" fg={fg} onPress={handleClear} />
          )}
          <HeaderKey
            icon={favourite ? 'star' : 'star-outline'}
            label={favourite ? 'Remove from favourites' : 'Add to favourites'}
            fg={fg}
            active={favourite}
            onPress={handleFav}
          />
        </View>
      </View>

      {/* Heavy rule closes the fascia off from the work area */}
      <View style={[styles.closingRule, { backgroundColor: colors.border }]} />
    </View>
  );
}

/**
 * A punched key on the nameplate, outlined in the fascia's own foreground.
 * Exported so a screen's `rightAction` matches the built-in keys instead of
 * dropping a card-coloured button onto the coloured bar.
 */
export function HeaderKey({
  icon,
  label,
  fg,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Foreground of the fascia this key sits on — use `onColour(accent)`. */
  fg: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.key,
        { borderColor: fg, backgroundColor: active || pressed ? fg + '2E' : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={16} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  key: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: border.base,
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
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleDot: { width: 8, height: 8 },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  titleCol: { flex: 1 },
  title: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.tracking.label,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    letterSpacing: 0.3,
    opacity: 0.75,
    marginTop: 1,
  },
  closingRule: { height: border.thick },
});
