import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';

import { UtilityIcon } from './UtilityIcon';
import { QuickActionsSheet } from './QuickActionsSheet';
import { useTheme } from '@/theme/ThemeProvider';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { PressablePlate, useHaptic, onColour } from '@/components/ui';
import { spacing, radius, typography, border, plate } from '@/theme';
import { CARD_SIZE } from '@/constants';
import type { UtilityDefinition } from '@/types';

interface UtilityCardProps {
  utility: UtilityDefinition;
  /** Index within its grid — drives the staggered entrance. */
  index?: number;
}

/**
 * A labelled key on the panel. Flat ink block for the icon, stencilled legend
 * beneath, and the whole tile depresses into its own shadow when pressed.
 */
function UtilityCardBase({ utility, index = 0 }: UtilityCardProps) {
  const { colors } = useTheme();
  const favourite = useFavouritesStore((s) => s.favourites.includes(utility.id));
  const recordUsage = useRecentsStore((s) => s.recordUsage);
  const haptic = useHaptic();
  const [sheetVisible, setSheetVisible] = useState(false);

  const handlePress = useCallback(() => {
    haptic('light');
    recordUsage(utility.id);
    router.push(utility.route as any);
  }, [utility.id, utility.route, haptic, recordUsage]);

  const handleLongPress = useCallback(() => {
    haptic('medium');
    setSheetVisible(true);
  }, [haptic]);

  return (
    <>
      <Animated.View
        entering={FadeIn.delay(Math.min(index * 22, 220)).duration(200)}
        style={styles.slot}
      >
        <PressablePlate
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          accessibilityLabel={`${utility.title}. ${utility.description}`}
          accessibilityHint="Double tap to open. Long press for quick actions."
          offset={plate.base}
          radius={radius.md}
          fill={colors.card}
          style={styles.plate}
          contentStyle={styles.tile}
        >
          {/* Flat ink block — no gradient, no glow */}
          <View
            style={[
              styles.iconBlock,
              { backgroundColor: utility.color, borderColor: colors.border },
            ]}
          >
            <UtilityIcon utility={utility} size={18} color={onColour(utility.color)} />
          </View>

          {/* Fixed-height label block: without it a one-line tile is shorter
              than a two-line one, and tiles in the same row stop aligning. */}
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {utility.title.toUpperCase()}
            </Text>
          </View>

          {favourite && (
            <View
              style={[
                styles.favTab,
                { backgroundColor: colors.accent, borderColor: colors.border },
              ]}
            />
          )}
        </PressablePlate>
      </Animated.View>

      <QuickActionsSheet
        utility={utility}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
      />
    </>
  );
}

/**
 * Memoised: the home screen renders every tool several times over (favourites,
 * recents, category sections), and re-rendering the whole grid on each keystroke
 * of the search field was visibly janky.
 */
export const UtilityCard = React.memo(UtilityCardBase);

const styles = StyleSheet.create({
  slot: { flex: 1 },
  plate: { flex: 1 },
  tile: {
    minHeight: CARD_SIZE + 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
  },
  iconBlock: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    height: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    // 9pt at 0.2 tracking keeps the longest label ("CALCULATOR", 10 caps)
    // on one line inside an ~74pt tile interior.
    fontSize: 9,
    fontWeight: typography.weights.extrabold,
    textAlign: 'center',
    lineHeight: 11,
    letterSpacing: 0.2,
  },
  /** A stamped corner tab rather than a glyph — reads at 10pt. */
  favTab: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderWidth: border.base,
    transform: [{ rotate: '45deg' }],
  },
});
