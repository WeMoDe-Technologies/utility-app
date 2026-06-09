import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, typography } from '@/theme';

interface SettingRowProps {
  icon?: string;
  iconColor?: string;
  label: string;
  description?: string;
  type: 'toggle' | 'action' | 'chevron';
  value?: boolean;
  onPress?: () => void;
  onChange?: (val: boolean) => void;
  destructive?: boolean;
}

export function SettingRow({
  icon,
  iconColor = '#6366F1',
  label,
  description,
  type,
  value,
  onPress,
  onChange,
  destructive,
}: SettingRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={type !== 'toggle' ? onPress : undefined}
      style={styles.row}
    >
      {icon && (
        <View style={[styles.iconBg, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon as any} size={17} color={iconColor} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.label, { color: destructive ? '#F43F5E' : colors.text }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.desc, { color: colors.textTertiary }]}>{description}</Text>
        )}
      </View>
      {type === 'toggle' && (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.muted, true: iconColor + '60' }}
          thumbColor={value ? iconColor : colors.subtle}
        />
      )}
      {type === 'chevron' && (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    gap: spacing.md,
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  desc: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
});
