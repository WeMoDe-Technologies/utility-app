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
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { ThemePicker } from '@/components/common/ThemePicker';
import { storage } from '@/utils/storage';
import { spacing, radius, typography } from '@/theme';

export default function SettingsScreen() {
  const { colors, isDark, themeId, theme: activeTheme } = useTheme();
  const { top } = useSafeAreaInsets();
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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(200)}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, paddingTop: top + 6, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.muted }]} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: activeTheme.colors.accent }]} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Active theme banner ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(30).duration(350)}>
          <View style={[styles.activeBanner, { backgroundColor: activeTheme.colors.accent + '14', borderColor: activeTheme.colors.accent + '30' }]}>
            <Text style={styles.bannerEmoji}>{activeTheme.emoji}</Text>

            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerLabel, { color: activeTheme.colors.accent }]}>
                ACTIVE THEME
              </Text>
              <Text style={[styles.bannerName, { color: colors.text }]}>{activeTheme.name}</Text>
              <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                {activeTheme.description}
              </Text>
            </View>

            <View style={styles.bannerRight}>
              <View style={[styles.modeBadge, { backgroundColor: isDark ? '#ffffff12' : '#00000010' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={11} color={activeTheme.colors.accent} />
                <Text style={[styles.modeBadgeText, { color: activeTheme.colors.accent }]}>
                  {isDark ? 'Dark' : 'Light'}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/theme-preview' as any)}
                style={[styles.previewBtn, { backgroundColor: activeTheme.colors.accent }]}
              >
                <Ionicons name="eye-outline" size={12} color="#fff" />
                <Text style={styles.previewBtnText}>Preview</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* ── Theme picker ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <SectionTitle title="Choose Theme" colors={colors} />
          <ThemePicker />
        </Animated.View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <SectionTitle title="Preferences" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ToggleRow
              icon="pulse"
              iconColor="#EC4899"
              label="Haptic Feedback"
              description="Vibration on button presses"
              value={prefs.hapticFeedback}
              onChange={prefs.setHapticFeedback}
              colors={colors}
              accent={colors.accent}
            />
            <Divider colors={colors} />
            <ToggleRow
              icon="stats-chart"
              iconColor="#06B6D4"
              label="Show Usage Count"
              description="Show how often each tool is used"
              value={prefs.showUsageCount}
              onChange={prefs.setShowUsageCount}
              colors={colors}
              accent={colors.accent}
            />
          </View>
        </Animated.View>

        {/* ── Data & Storage ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)}>
          <SectionTitle title="Data & Storage" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActionRow icon="trash-outline" iconColor="#F43F5E" label="Clear All Cache"
              description="Remove all utility data and history" onPress={clearAllCache} colors={colors} destructive />
            <Divider colors={colors} />
            <ActionRow icon="star-outline" iconColor="#F59E0B" label="Reset Favourites"
              description="Remove all starred utilities" onPress={resetFavourites} colors={colors} destructive />
            <Divider colors={colors} />
            <ActionRow icon="time-outline" iconColor="#8B5CF6" label="Clear History"
              description="Clear recently used list" onPress={clearHistory} colors={colors} />
          </View>
        </Animated.View>

        {/* ── About ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(350)}>
          <SectionTitle title="About" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActionRow icon="information-circle-outline" iconColor="#06B6D4" label="About UtilityKit"
              description="Version 1.0.0 · 12 Themes · 16 Utilities"
              onPress={() => Alert.alert('UtilityKit', 'Version 1.0.0\n16 Utilities · 12 Themes\nBuilt with Expo React Native')}
              colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="lock-closed-outline" iconColor="#10B981" label="Privacy Policy"
              onPress={() => Linking.openURL('https://example.com/privacy')} colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="chatbubble-outline" iconColor="#8B5CF6" label="Send Feedback"
              onPress={() => Linking.openURL('mailto:feedback@utilitykit.app')} colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="star" iconColor="#F59E0B" label="Rate UtilityKit"
              description="Love the app? Rate us ⭐"
              onPress={() => Linking.openURL('https://apps.apple.com')} colors={colors} showChevron />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(340).duration(350)}>
        <View style={styles.footer}>
          <Text style={styles.footerEmoji}>{activeTheme.emoji}</Text>
          <Text style={[styles.footerVersion, { color: colors.textTertiary }]}>
            UtilityKit v1.0.0 · {activeTheme.name} Theme
          </Text>
          <Text style={[styles.footerMade, { color: colors.textTertiary }]}>Made with ♥ using Expo</Text>
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Reusable sub-components ────────────────────────────────────────────────
function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>;
}

function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function ToggleRow({ icon, iconColor, label, description, value, onChange, colors, accent }: any) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {description && <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.muted, true: accent + '70' }}
        thumbColor={value ? accent : colors.subtle}
      />
    </View>
  );
}

function ActionRow({ icon, iconColor, label, description, onPress, colors, destructive, showChevron }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.muted }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: destructive ? '#F43F5E' : colors.text }]}>{label}</Text>
        {description && <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    gap: spacing.sm,
  },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, letterSpacing: -0.3 },

  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: 60 },

  // Active theme banner
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  bannerEmoji: { fontSize: 34 },
  bannerInfo: { flex: 1, gap: 2 },
  bannerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  bannerName: { fontSize: typography.sizes.md, fontWeight: '800' },
  bannerDesc: { fontSize: typography.sizes.sm },
  bannerRight: { alignItems: 'flex-end', gap: spacing.xs },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  modeBadgeText: { fontSize: 11, fontWeight: '700' },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  previewBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  card: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  rowIcon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  rowDesc: { fontSize: typography.sizes.sm, marginTop: 2 },

  // Footer
  footer: { alignItems: 'center', paddingTop: spacing.lg, gap: 4 },
  footerEmoji: { fontSize: 24, marginBottom: spacing.xs },
  footerVersion: { fontSize: 13, fontWeight: '600' },
  footerMade: { fontSize: 12 },
});