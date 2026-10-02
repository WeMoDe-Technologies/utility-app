import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useHaptic, toast, onColour, Rule } from '@/components/ui';
import { clearUtilityData } from '@/utils/storage';
import { spacing, radius, typography, border } from '@/theme';
import { UtilityIcon } from './UtilityIcon';
import type { UtilityDefinition } from '@/types';

interface QuickActionsSheetProps {
  utility: UtilityDefinition | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * A drawer that slides out of the bottom edge: hard-edged, ruled, and capped
 * with a heavy bar in the tool's own ink.
 */
export function QuickActionsSheet({ utility, visible, onClose }: QuickActionsSheetProps) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const isFavourite = useFavouritesStore((s) => s.isFavourite);
  const toggleFavourite = useFavouritesStore((s) => s.toggleFavourite);
  const haptic = useHaptic();

  if (!utility) return null;
  const favourite = isFavourite(utility.id);

  const actions = [
    {
      id: 'open',
      icon: 'arrow-forward' as const,
      label: 'Open tool',
      tint: utility.color,
      onPress: () => {
        onClose();
        setTimeout(() => router.push(utility.route as any), 180);
      },
    },
    {
      id: 'favourite',
      icon: (favourite ? 'star' : 'star-outline') as keyof typeof Ionicons.glyphMap,
      label: favourite ? 'Remove from favourites' : 'Add to favourites',
      tint: colors.accent,
      onPress: () => {
        toggleFavourite(utility.id);
        haptic('medium');
        toast(favourite ? 'Removed from favourites' : 'Added to favourites', 'info');
        onClose();
      },
    },
    {
      id: 'clear',
      icon: 'trash-outline' as const,
      label: 'Reset tool data',
      tint: '#A6392B',
      destructive: true,
      onPress: () => {
        haptic('warning');
        Alert.alert(
          `Reset ${utility.title}?`,
          'This clears everything saved for this tool. It cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: () => {
                // The storage key IS the registry id — every screen persists
                // under `useUtilityState(<registry id>, …)`.
                clearUtilityData(utility.id);
                toast(`${utility.title} data cleared`, 'info');
              },
            },
          ],
        );
        onClose();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss" />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.duration(220)}
        exiting={SlideOutDown.duration(180)}
        style={styles.sheetWrap}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: bottom + spacing.base },
          ]}
        >
          {/* Ink cap in the tool's colour */}
          <View style={[styles.cap, { backgroundColor: utility.color }]} />

          <View style={styles.info}>
            <View style={[styles.iconBlock, { backgroundColor: utility.color, borderColor: colors.border }]}>
              <UtilityIcon utility={utility} size={22} color={onColour(utility.color)} />
            </View>
            <View style={styles.infoText}>
              <Text style={[styles.name, { color: colors.text }]}>
                {utility.title.toUpperCase()}
              </Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                {utility.description}
              </Text>
            </View>
          </View>

          <Rule weight={border.base} />

          {actions.map((action, i) => (
            <React.Fragment key={action.id}>
              {i > 0 && <Rule />}
              <Pressable
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Ionicons name={action.icon} size={18} color={action.tint} />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? action.tint : colors.text },
                  ]}
                >
                  {action.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </Pressable>
            </React.Fragment>
          ))}

          <Rule weight={border.base} />

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>CANCEL</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,16,0.55)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopWidth: border.thick,
    borderLeftWidth: border.base,
    borderRightWidth: border.base,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  cap: { height: 6 },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
  },
  iconBlock: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: '800',
    letterSpacing: typography.tracking.label,
  },
  desc: { fontSize: typography.sizes.sm, lineHeight: 17 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + 2,
  },
  actionLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  cancel: { paddingVertical: spacing.md + 2, alignItems: 'center' },
  cancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: '800',
    letterSpacing: typography.tracking.legend,
  },
});
