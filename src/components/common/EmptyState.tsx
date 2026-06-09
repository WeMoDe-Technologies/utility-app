import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  emoji?: string;
}

export function EmptyState({ icon, title, subtitle, emoji }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : icon ? (
        <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
          <Ionicons name={icon as any} size={32} color={colors.textTertiary} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
});
