import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';

interface ResultDisplayProps {
  label: string;
  value: string;
  accent?: string;
  large?: boolean;
  copyable?: boolean;
  subtitle?: string;
}

export function ResultDisplay({
  label,
  value,
  accent = '#6366F1',
  large,
  copyable,
  subtitle,
}: ResultDisplayProps) {
  const { colors } = useTheme();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: accent + '12',
          borderColor: accent + '30',
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: accent }]}>{label.toUpperCase()}</Text>
        {copyable && (
          <Pressable onPress={handleCopy} hitSlop={8}>
            <Ionicons name="copy-outline" size={14} color={accent} />
          </Pressable>
        )}
      </View>
      <Text
        style={[
          styles.value,
          { color: colors.text, fontSize: large ? 34 : 24 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  value: {
    fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
  },
});
