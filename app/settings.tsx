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
import { LinearGradient } from 'expo-linear-gradient';
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

  const accent = activeTheme.colors.accent;

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
      {/* Accent aura behind the header */}
      <LinearGradient
        colors={[accent + (isDark ? '22' : '12'), accent + '00']}
        style={styles.aura}
        pointerEvents="none"
      />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(200)}>
        <View style={[styles.header, { paddingTop: top + 6 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ width: 36 }} />
        </View>

        {/* Large title */}
        <View style={styles.heroTitleWrap}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Themes, preferences & data
          </Text>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Active theme banner (gradient glass) ─────────────────── */}
        <Animated.View entering={FadeInDown.delay(30).duration(350)}>
          <View style={[styles.activeBannerWrap, { borderColor: accent + '35' }]}>
            <LinearGradient
              colors={[accent + (isDark ? '2A' : '1A'), accent + (isDark ? '10' : '06')]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeBanner}
            >
              <View style={[styles.bannerEmojiTile, { backgroundColor: accent + '22' }]}>
                <Text style={styles.bannerEmoji}>{activeTheme.emoji}</Text>
              </View>

              <View style={styles.bannerInfo}>
                <Text style={[styles.bannerLabel, { color: accent }]}>ACTIVE THEME</Text>
                <Text style={[styles.bannerName, { color: colors.text }]}>{activeTheme.name}</Text>
                <Text style={[styles.bannerDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                  {activeTheme.description}
                </Text>
              </View>

              <View style={styles.bannerRight}>
                <View
                  style={[
                    styles.modeBadge,
                    { backgroundColor: isDark ? '#ffffff12' : '#00000010' },
                  ]}
                >
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={11} color={accent} />
                  <Text style={[styles.modeBadgeText, { color: accent }]}>
                    {isDark ? 'Dark' : 'Light'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push('/theme-preview' as any)}
                  style={({ pressed }) => [
                    styles.previewBtn,
                    { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="eye-outline" size={12} color="#fff" />
                  <Text style={styles.previewBtnText}>Preview</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ── Theme picker ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <SectionTitle title="Choose Theme" colors={colors} accent={accent} />
          <ThemePicker />
        </Animated.View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <SectionTitle title="Preferences" colors={colors} accent={accent} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ToggleRow
              icon="pulse"
              iconColor="#EC4899"
              label="Haptic Feedback"
              description="Vibration on button presses"
              value={prefs.hapticFeedback}
              onChange={prefs.setHapticFeedback}
              colors={colors}
              accent={accent}
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
              accent={accent}
            />
          </View>
        </Animated.View>

        {/* ── Data & Storage ───────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(220).duration(350)}>
          <SectionTitle title="Data & Storage" colors={colors} accent={accent} />
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

        {/* ── About ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(280).duration(350)}>
          <SectionTitle title="About" colors={colors} accent={accent} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActionRow icon="information-circle-outline" iconColor="#06B6D4" label="About Toolr"
              description="Version 1.0.0 · 12 Themes · 22 Utilities"
              onPress={() => Alert.alert('Toolr', 'Version 1.0.0\n22 Utilities · 12 Themes\nBuilt with Expo React Native')}
              colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="lock-closed-outline" iconColor="#10B981" label="Privacy Policy"
              onPress={() => Linking.openURL('https://example.com/privacy')} colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="chatbubble-outline" iconColor="#8B5CF6" label="Send Feedback"
              onPress={() => Linking.openURL('mailto:feedback@utilitykit.app')} colors={colors} showChevron />
            <Divider colors={colors} />
            <ActionRow icon="star" iconColor="#F59E0B" label="Rate Toolr"
              description="Love the app? Rate us ⭐"
              onPress={() => Linking.openURL('https://apps.apple.com')} colors={colors} showChevron />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(340).duration(350)}>
          <View style={styles.footer}>
            <Text style={styles.footerEmoji}>{activeTheme.emoji}</Text>
            <Text style={[styles.footerVersion, { color: colors.textTertiary }]}>
              Toolr v1.0.0 · {activeTheme.name} Theme
            </Text>
            <Text style={[styles.footerMade, { color: colors.textTertiary }]}>
              Made with ♥ using Expo
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Reusable sub-components ────────────────────────────────────────────────
function SectionTitle({ title, colors, accent }: { title: string; colors: any; accent: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTick, { backgroundColor: accent }]} />
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
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
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
        )}
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
        <Text style={[styles.rowLabel, { color: destructive ? '#F43F5E' : colors.text }]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{description}</Text>
        )}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  aura: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroSub: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },

  content: { padding: spacing.base, gap: spacing.sm, paddingBottom: 60, paddingTop: spacing.sm },

  // Active theme banner
  activeBannerWrap: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  bannerEmojiTile: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: { fontSize: 28 },
  bannerInfo: { flex: 1, gap: 2 },
  bannerLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  bannerName: { fontSize: typography.sizes.md, fontWeight: '800', letterSpacing: -0.3 },
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
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  previewBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Section
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTick: { width: 3, height: 12, borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  card: { borderRadius: radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.base },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 1 },
  rowLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, letterSpacing: -0.2 },
  rowDesc: { fontSize: typography.sizes.xs },

  // Footer
  footer: { alignItems: 'center', gap: 4, paddingVertical: spacing.xl },
  footerEmoji: { fontSize: 22 },
  footerVersion: { fontSize: typography.sizes.xs, fontWeight: '600' },
  footerMade: { fontSize: typography.sizes.xs },
});