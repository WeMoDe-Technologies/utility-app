import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { border as borderTokens, plate as plateTokens, radius as radiusTokens } from '@/theme';

/**
 * Plate — the surface every panel, key and tile in Kit is built from.
 *
 * It draws a flat fill with a drawn border and a *hard* offset shadow. React
 * Native can't produce a hard shadow from style props: iOS honours
 * `shadowRadius: 0`, but Android's `elevation` always blurs and always tints
 * with its own algorithm. So the shadow here is a real View offset behind the
 * surface — identical on both platforms, and it costs one extra node.
 *
 * The outer box reserves `offset` of margin so the shadow occupies real layout
 * space; without it, plates in a row would overlap each other's shadows.
 */
export interface PlateProps {
  children?: React.ReactNode;
  /** Hard-shadow offset in points. 0 renders a flush plate with no shadow. */
  offset?: number;
  radius?: number;
  borderWidth?: number;
  /** Surface fill. Defaults to the theme card colour. */
  fill?: string;
  /** Rule colour. Defaults to the theme border ink. */
  borderColor?: string;
  /** Hard-shadow colour. Defaults to the theme shadow ink. */
  shadowColor?: string;
  /** Layout styles — applied to the outer box (margins, flex, width). */
  style?: StyleProp<ViewStyle>;
  /** Paint styles — applied to the surface itself (padding, alignment). */
  contentStyle?: StyleProp<ViewStyle>;
}

export function Plate({
  children,
  offset = plateTokens.base,
  radius = radiusTokens.lg,
  borderWidth = borderTokens.base,
  fill,
  borderColor,
  shadowColor,
  style,
  contentStyle,
}: PlateProps) {
  const { colors } = useTheme();
  const showShadow = offset > 0;

  return (
    <View style={[showShadow && { marginRight: offset, marginBottom: offset }, style]}>
      {showShadow && (
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              left: offset,
              top: offset,
              right: -offset,
              bottom: -offset,
              borderRadius: radius,
              backgroundColor: shadowColor ?? colors.shadow,
            },
          ]}
        />
      )}
      <View
        style={[
          {
            backgroundColor: fill ?? colors.card,
            borderColor: borderColor ?? colors.border,
            borderWidth,
            borderRadius: radius,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Pressable plate ───────────────────────────────────────────────────────
export interface PressablePlateProps extends PlateProps {
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Marks the control as selected for assistive tech. */
  selected?: boolean;
}

/**
 * A plate that physically depresses: on press the surface slides into its own
 * shadow and the shadow fades out, so the key reads as having been pushed flush
 * with the panel. This is the single interaction motif used across the app.
 */
export function PressablePlate({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  selected,
  offset = plateTokens.base,
  radius = radiusTokens.lg,
  borderWidth = borderTokens.base,
  fill,
  borderColor,
  shadowColor,
  style,
  contentStyle,
}: PressablePlateProps) {
  const { colors } = useTheme();
  const sink = useSharedValue(0);
  const showShadow = offset > 0;

  // 70ms down / 110ms up — fast enough to feel mechanical, slow enough to see
  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: sink.value * offset },
      { translateY: sink.value * offset },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 1 - sink.value,
  }));

  const press = (down: boolean) => {
    sink.value = withTiming(down ? 1 : 0, {
      duration: down ? 70 : 110,
      easing: down ? Easing.out(Easing.quad) : Easing.out(Easing.back(1.4)),
    });
  };

  return (
    <View style={[showShadow && { marginRight: offset, marginBottom: offset }, style]}>
      {showShadow && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shadow,
            {
              left: offset,
              top: offset,
              right: -offset,
              bottom: -offset,
              borderRadius: radius,
              backgroundColor: shadowColor ?? colors.shadow,
            },
            shadowStyle,
          ]}
        />
      )}
      <Animated.View style={surfaceStyle}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={delayLongPress}
          onPressIn={() => press(true)}
          onPressOut={() => press(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled: !!disabled, selected }}
          style={[
            {
              backgroundColor: fill ?? colors.card,
              borderColor: borderColor ?? colors.border,
              borderWidth,
              borderRadius: radius,
              opacity: disabled ? 0.4 : 1,
            },
            contentStyle,
          ]}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Rule ──────────────────────────────────────────────────────────────────
/** A drawn divider. Structure in this design comes from rules, not shadows. */
export function Rule({
  weight = borderTokens.hair,
  color,
  style,
}: {
  weight?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { height: weight, backgroundColor: color ?? colors.border, opacity: 0.28 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute' },
});
