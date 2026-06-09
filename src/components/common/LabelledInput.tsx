import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius, typography } from '@/theme';

interface LabelledInputProps extends TextInputProps {
  label: string;
  accent?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export const LabelledInput = forwardRef<TextInput, LabelledInputProps>(
  function LabelledInput(
    { label, accent = '#6366F1', error, hint, prefix, suffix, style, ...rest },
    ref
  ) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    const borderAnim = React.useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
      setFocused(true);
      Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
      rest.onFocus?.(null as any);
    };

    const handleBlur = () => {
      setFocused(false);
      Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
      rest.onBlur?.(null as any);
    };

    const borderColor = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [error ? '#F43F5E' : colors.border, error ? '#F43F5E' : accent],
    });

    return (
      <View style={styles.wrapper}>
        <Text style={[styles.label, { color: focused ? accent : colors.textSecondary }]}>
          {label}
        </Text>
        <Animated.View
          style={[
            styles.inputWrapper,
            { backgroundColor: colors.card, borderColor },
          ]}
        >
          {prefix && (
            <Text style={[styles.affix, { color: colors.textTertiary }]}>{prefix}</Text>
          )}
          <TextInput
            ref={ref}
            style={[styles.input, { color: colors.text }, style]}
            placeholderTextColor={colors.textTertiary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...rest}
          />
          {suffix && (
            <Text style={[styles.affix, { color: colors.textTertiary }]}>{suffix}</Text>
          )}
        </Animated.View>
        {(error || hint) && (
          <Text style={[styles.helper, { color: error ? '#F43F5E' : colors.textTertiary }]}>
            {error ?? hint}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    paddingVertical: spacing.sm,
  },
  affix: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  helper: {
    fontSize: typography.sizes.xs,
    marginLeft: 2,
  },
});
