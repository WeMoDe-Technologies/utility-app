import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing, typography } from '@/theme';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  iconColor?: string;
  count?: number;
}

export function SectionHeader({ title, icon, iconColor, count }: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <Ionicons
          name={icon as any}
          size={13}
          color={iconColor ?? colors.textSecondary}
        />
      )}
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {title}
      </Text>
      {count !== undefined && (
        <View style={[styles.badge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.badgeText, { color: colors.textTertiary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});
