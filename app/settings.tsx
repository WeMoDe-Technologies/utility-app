import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { storage } from '@/utils/storage';
import { spacing, radius, typography } from '@/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const prefs = usePreferencesStore();
  const { reset: resetFavs } = useFavouritesStore();
  const { clearRecent } = useRecentsStore();

  const clearAllCache = () => {
    Alert.alert(
      'Clear All Cache',
      'This will clear all utility data and history. Settings will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            // Clear all utility-specific keys
            const keys = storage.getAllKeys();
            keys.filter((k) => k.startsWith('utility:')).forEach((k) => storage.delete(k));
            clearRecent();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'All utility cache cleared.');
          },
        },
      ]
    );
  };

  const resetFavourites = () => {
    Alert.alert('Reset Favourites', 'Remove all favourites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetFavs();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const clearHistory = () => {
    Alert.alert('Clear History', 'Remove all recently used history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearRecent();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme */}
        <Animated.View entering={FadeInDown.delay(50).duration(300)}>
          <SectionTitle title="Appearance" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => prefs.setTheme(t)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: prefs.theme === t ? colors.accent : colors.muted,
                    },
                  ]}
                >
                  <Ionicons
                    name={t === 'light' ? 'sunny' : t === 'dark' ? 'moon' : 'phone-portrait'}
                    size={14}
                    color={prefs.theme === t ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: prefs.theme === t ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <SectionTitle title="Preferences" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ToggleRow
              label="Haptic Feedback"
              description="Vibration on interactions"
              value={prefs.hapticFeedback}
              onChange={prefs.setHapticFeedback}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ToggleRow
              label="Show Usage Count"
              description="Display how often you use each tool"
              value={prefs.showUsageCount}
              onChange={prefs.setShowUsageCount}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Data Management */}
        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <SectionTitle title="Data & Storage" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActionRow
              icon="trash-outline"
              iconColor="#F43F5E"
              label="Clear All Cache"
              description="Remove all utility data and history"
              onPress={clearAllCache}
              colors={colors}
              destructive
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ActionRow
              icon="star-outline"
              iconColor="#F59E0B"
              label="Reset Favourites"
              description="Remove all starred utilities"
              onPress={resetFavourites}
              colors={colors}
              destructive
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ActionRow
              icon="time-outline"
              iconColor="#6366F1"
              label="Clear History"
              description="Clear recently used list"
              onPress={clearHistory}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <SectionTitle title="About" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActionRow
              icon="information-circle-outline"
              iconColor="#06B6D4"
              label="About UtilityKit"
              description="Version 1.0.0"
              onPress={() => Alert.alert('UtilityKit', 'Version 1.0.0\nBuilt with Expo React Native')}
              colors={colors}
              showChevron
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ActionRow
              icon="lock-closed-outline"
              iconColor="#10B981"
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://example.com/privacy')}
              colors={colors}
              showChevron
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ActionRow
              icon="chatbubble-outline"
              iconColor="#8B5CF6"
              label="Send Feedback"
              onPress={() => Linking.openURL('mailto:feedback@utilitykit.app')}
              colors={colors}
              showChevron
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ActionRow
              icon="star"
              iconColor="#F59E0B"
              label="Rate UtilityKit"
              description="Love the app? Rate us ⭐"
              onPress={() => Linking.openURL('https://apps.apple.com')}
              colors={colors}
              showChevron
            />
          </View>
        </Animated.View>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          UtilityKit v1.0.0 · Made with ♥
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
  );
}

function ToggleRow({ label, description, value, onChange, colors }: any) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.muted, true: colors.accent + '80' }}
        thumbColor={value ? colors.accent : colors.subtle}
      />
    </View>
  );
}

function ActionRow({ icon, iconColor, label, description, onPress, colors, destructive, showChevron }: any) {
  return (
    <Pressable onPress={onPress} style={styles.actionRow}>
      <View style={[styles.actionIconBg, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.actionInfo}>
        <Text style={[styles.rowLabel, { color: destructive ? '#F43F5E' : colors.text }]}>{label}</Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  themeChipText: { fontSize: 13, fontWeight: '600' },
  settingLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, padding: spacing.base, paddingBottom: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.base,
  },
  toggleInfo: { flex: 1 },
  rowLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  rowDesc: { fontSize: typography.sizes.sm, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  actionIconBg: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: { flex: 1 },
  versionText: { textAlign: 'center', fontSize: 12, marginTop: spacing.xl },
});
