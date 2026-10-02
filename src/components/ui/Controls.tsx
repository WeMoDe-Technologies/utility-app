import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  type KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { spacing, radius, typography, border, plate } from '@/theme';
import { sanitiseDecimalInput } from '@/utils/format';
import { Plate, PressablePlate } from './Plate';

/** Fire haptics only when the user has them switched on. */
export function useHaptic() {
  const enabled = usePreferencesStore((s) => s.hapticFeedback);
  return useCallback(
    (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'select' = 'light') => {
      if (!enabled) return;
      if (style === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (style === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (style === 'select') {
        Haptics.selectionAsync();
      } else {
        Haptics.impactAsync(
          style === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : style === 'heavy'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : Haptics.ImpactFeedbackStyle.Light,
        );
      }
    },
    [enabled],
  );
}

/**
 * Pick ink or paper for text sitting on a coloured fill, so a key legend stays
 * legible whichever accent a theme or tool uses.
 */
export function onColour(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const num = parseInt(full, 16);
  if (isNaN(num)) return '#FFFFFF';
  const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1E1C19' : '#FFFDF7';
}

// ─── Button ────────────────────────────────────────────────────────────────
export function Button({
  label,
  onPress,
  accent,
  icon,
  variant = 'primary',
  disabled,
  style,
  full = true,
}: {
  label: string;
  onPress: () => void;
  accent?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const tint = accent ?? colors.accent;

  const fill =
    variant === 'primary' ? tint : variant === 'secondary' ? colors.muted : colors.card;
  const fg = variant === 'primary' ? onColour(tint) : colors.text;

  return (
    <PressablePlate
      onPress={() => { haptic('medium'); onPress(); }}
      disabled={disabled}
      accessibilityLabel={label}
      offset={plate.base}
      radius={radius.md}
      fill={fill}
      style={[full && btnStyles.full, style]}
      contentStyle={btnStyles.base}
    >
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <Text style={[btnStyles.label, { color: fg }]}>{label}</Text>
    </PressablePlate>
  );
}

const btnStyles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.label,
  },
});

// ─── Segmented control ─────────────────────────────────────────────────────
/**
 * A panel switch: one recessed well, with the active segment raised out of it
 * as a key. Inactive segments are flat against the well.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent,
  style,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const tint = accent ?? colors.accent;

  return (
    <Plate
      offset={plate.flush}
      radius={radius.md}
      fill={colors.muted}
      style={style}
      contentStyle={segStyles.bar}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => { haptic('select'); onChange(opt.value); }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              segStyles.tab,
              active && {
                backgroundColor: tint,
                borderColor: colors.border,
                borderWidth: border.base,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                segStyles.label,
                { color: active ? onColour(tint) : colors.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Plate>
  );
}

const segStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.base,
    borderColor: 'transparent',
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.label,
  },
});

// ─── Pill ──────────────────────────────────────────────────────────────────
/** A stamped tab. Square-ish, bordered, flat — not a rounded capsule. */
export function Pill({
  label,
  active,
  onPress,
  accent,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  accent?: string;
}) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const tint = accent ?? colors.accent;

  return (
    <PressablePlate
      onPress={() => { haptic('select'); onPress(); }}
      accessibilityLabel={label}
      selected={active}
      offset={active ? plate.low : plate.flush}
      radius={radius.sm}
      fill={active ? tint : colors.muted}
      borderColor={active ? colors.border : colors.subtle}
      contentStyle={pillStyles.pill}
    >
      <Text
        style={[pillStyles.label, { color: active ? onColour(tint) : colors.textSecondary }]}
      >
        {label}
      </Text>
    </PressablePlate>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.tracking.label,
  },
});

// ─── Numeric field ─────────────────────────────────────────────────────────
/** An inset well, like a recessed readout on an instrument face. */
export function NumericField({
  value,
  onChangeText,
  placeholder,
  prefix,
  suffix,
  accent,
  autoFocus,
  size = 'md',
  keyboardType = 'decimal-pad',
  allowNegative = false,
  sanitise = true,
  maxLength,
  style,
  inputStyle,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  accent?: string;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
  keyboardType?: KeyboardTypeOptions;
  allowNegative?: boolean;
  /** Set false when the field holds something other than a plain number. */
  sanitise?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const tint = accent ?? colors.accent;

  return (
    <Plate
      offset={plate.flush}
      radius={radius.md}
      borderWidth={border.base}
      fill={colors.muted}
      borderColor={focused ? tint : colors.subtle}
      style={style}
      contentStyle={fieldStyles.wrap}
    >
      {prefix ? (
        <Text style={[fieldStyles.affix, size === 'lg' && fieldStyles.affixLg, { color: colors.textSecondary }]}>
          {prefix}
        </Text>
      ) : null}
      <TextInput
        style={[
          fieldStyles.input,
          size === 'lg' && fieldStyles.inputLg,
          { color: colors.text },
          inputStyle,
        ]}
        value={value}
        onChangeText={(t) => onChangeText(sanitise ? sanitiseDecimalInput(t, allowNegative) : t)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        maxLength={maxLength}
        selectionColor={tint}
      />
      {suffix ? (
        <Text style={[fieldStyles.affix, size === 'lg' && fieldStyles.affixLg, { color: colors.textSecondary }]}>
          {suffix}
        </Text>
      ) : null}
    </Plate>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  inputLg: {
    fontSize: 30,
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.tracking.tight,
    paddingVertical: spacing.sm,
  },
  affix: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  affixLg: { fontSize: 24, fontWeight: typography.weights.extrabold },
});

// ─── Stat tile ─────────────────────────────────────────────────────────────
export function StatTile({
  label,
  value,
  color,
  sublabel,
  style,
}: {
  label: string;
  value: string;
  color?: string;
  sublabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const tint = color ?? colors.text;
  return (
    <Plate
      offset={plate.low}
      radius={radius.md}
      fill={colors.card}
      style={[statStyles.outer, style]}
      contentStyle={statStyles.tile}
    >
      <Text
        style={[statStyles.value, { color: tint }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={[statStyles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      {sublabel ? (
        <Text style={[statStyles.sub, { color: colors.textTertiary }]} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </Plate>
  );
}

const statStyles = StyleSheet.create({
  outer: { flex: 1 },
  tile: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 2,
    alignItems: 'center',
  },
  value: {
    fontSize: 19,
    fontWeight: typography.weights.extrabold,
    letterSpacing: typography.tracking.tight,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: typography.tracking.label,
  },
  sub: { fontSize: 10 },
});

// ─── Notice ────────────────────────────────────────────────────────────────
/** A stamped advisory strip, marked with a rule down its leading edge. */
export function Notice({
  text,
  tone = 'info',
  icon,
}: {
  text: string;
  tone?: 'info' | 'warn' | 'error';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const tint =
    tone === 'error' ? '#A6392B' : tone === 'warn' ? '#C2902B' : colors.textSecondary;
  const glyph = icon ?? (tone === 'info' ? 'information-circle-outline' : 'alert-circle-outline');

  return (
    <Plate
      offset={plate.flush}
      radius={radius.sm}
      borderWidth={border.hair}
      fill={colors.muted}
      borderColor={colors.subtle}
      contentStyle={noticeStyles.wrap}
    >
      <View style={[noticeStyles.bar, { backgroundColor: tint }]} />
      <Ionicons name={glyph} size={15} color={tint} />
      <Text style={[noticeStyles.text, { color: colors.textSecondary }]}>{text}</Text>
    </Plate>
  );
}

const noticeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm + 2,
    overflow: 'hidden',
  },
  bar: { width: 4, alignSelf: 'stretch', marginRight: spacing.xs },
  text: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 18 },
});
