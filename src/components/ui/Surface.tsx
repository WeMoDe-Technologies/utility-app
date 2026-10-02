import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius, typography, border, plate } from '@/theme';
import { Plate, Rule } from './Plate';

/**
 * Card — the standard panel. A plate with a hard shadow and a drawn border.
 * `tone="accent"` tints the fill for hero/result blocks; `tone="flush"` drops
 * the shadow for panels that sit inside another panel.
 */
export function Card({
  children,
  style,
  contentStyle,
  outerStyle,
  tone = 'surface',
  accent,
  padded = true,
}: {
  children: React.ReactNode;
  /**
   * Styles for the card's own surface — padding, gap, alignment, minHeight.
   * This is where every call site expects its styles to land, and the plate's
   * shadow is sized to the surface, so putting padding on the outer box
   * instead would inflate the shadow away from the card it belongs to.
   */
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Layout styles for the outer box — flex, margin, width. */
  outerStyle?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'accent' | 'flush';
  accent?: string;
  padded?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const tint = accent ?? colors.accent;

  const fill =
    tone === 'accent'
      ? isDark
        ? colors.surface
        : colors.accentLight
      : colors.card;

  return (
    <Plate
      offset={tone === 'flush' ? plate.flush : plate.base}
      radius={radius.lg}
      borderWidth={border.base}
      fill={fill}
      borderColor={tone === 'accent' ? tint : colors.border}
      style={outerStyle}
      contentStyle={[padded && cardStyles.padded, style, contentStyle]}
    >
      {children}
    </Plate>
  );
}

const cardStyles = StyleSheet.create({
  padded: {
    padding: spacing.base,
    gap: spacing.md,
  },
});

/**
 * FieldLabel — a silkscreened control legend. Always uppercase and
 * wide-tracked; this is the only label style in the app.
 */
export function FieldLabel({
  children,
  style,
  color,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Text style={[labelStyles.label, { color: color ?? colors.textSecondary }, style]}>
      {children}
    </Text>
  );
}

/**
 * SectionLabel — a legend followed by a rule that runs to the edge, the way a
 * technical drawing titles a region.
 */
export function SectionLabel({
  title,
  trailing,
  color,
}: {
  title: string;
  trailing?: React.ReactNode;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={labelStyles.sectionRow}>
      <Text style={[labelStyles.section, { color: color ?? colors.textTertiary }]}>
        {title}
      </Text>
      <Rule style={labelStyles.sectionRule} color={color ?? colors.border} />
      {trailing}
    </View>
  );
}

const labelStyles = StyleSheet.create({
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.legend,
    marginBottom: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  section: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.legend,
  },
  sectionRule: { flex: 1 },
});
