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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { useFavouritesStore } from '@/stores/favouritesStore';
import { useRecentsStore } from '@/stores/recentsStore';
import { ThemePicker } from '@/components/common/ThemePicker';
import {
  Card, FieldLabel, SectionLabel, Plate, PressablePlate, Rule, Pill,
  useHaptic, toast, onColour,
} from '@/components/ui';
import { CURRENCY_LIST, type CurrencyCode } from '@/utils/format';
import { APP_NAME, APP_VERSION } from '@/constants';
import { UTILITY_REGISTRY } from '@/registry';
import { THEMES } from '@/theme/themes';
import { useUpdateCheck } from '@/update/useUpdateCheck';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, radius, typography, border, plate } from '@/theme';

/**
 * What the Settings row says underneath "Check for updates".
 *
 * A build with no manifest URL configured says so plainly rather than
 * pretending to be up to date — the two are very different, and only one of
 * them is worth investigating.
 */
function updateStatusLine(update: ReturnType<typeof useUpdateCheck>): string {
  if (!update.configured) return 'Update checking is not configured in this build';
  if (update.checking) return 'Contacting the update server';
  const { decision } = update;
  if (decision.kind === 'none') {
    return update.checked ? `Version ${APP_VERSION} · up to date` : `Version ${APP_VERSION}`;
  }
  if (decision.downloadUrl === null) {
    return `Version ${decision.version} published, but no download link`;
  }
  return decision.kind === 'mandatory'
    ? `Version ${decision.version} is required`
    : `Version ${decision.version} is available`;
}

export default function SettingsScreen() {
  const { colors, isDark, themeId, theme: activeTheme } = useTheme();
  const { top } = useSafeAreaInsets();
  const prefs = usePreferencesStore();
  const resetFavs = useFavouritesStore((s) => s.reset);
  const favouriteCount = useFavouritesStore((s) => s.favourites.length);
  const clearRecent = useRecentsStore((s) => s.clearRecent);
  const recentCount = useRecentsStore((s) => s.recents.length);
  const update = useUpdateCheck();
  const haptic = useHaptic();

  const clearAllCache = () => {
    Alert.alert(
      'Clear All Cache',
      'This will clear all utility data and history. Settings will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const utilityKeys = allKeys.filter((k) => k.startsWith('utility:'));
              if (utilityKeys.length > 0) {
                await AsyncStorage.multiRemove(utilityKeys);
              }
              clearRecent();
              haptic('success');
              toast(
                utilityKeys.length > 0
                  ? `Cleared ${utilityKeys.length} tool${utilityKeys.length === 1 ? '' : 's'}`
                  : 'Nothing to clear',
              );
            } catch {
              toast('Could not clear cache — please try again', 'error');
            }
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
          haptic('warning');
          toast('Favourites cleared', 'info');
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
          haptic('medium');
          toast('History cleared', 'info');
        },
      },
    ]);
  };


  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* ── Fascia ──────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: colors.accent, paddingTop: top }}>
        <View style={styles.fascia}>
          <Pressable
            onPress={() => { haptic('light'); router.back(); }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.fasciaKey,
              {
                borderColor: onColour(colors.accent),
                backgroundColor: pressed ? onColour(colors.accent) + '2E' : 'transparent',
              },
            ]}
          >
            <Ionicons name="arrow-back" size={16} color={onColour(colors.accent)} />
          </Pressable>
          <Text style={[styles.fasciaTitle, { color: onColour(colors.accent) }]}>
            SETTINGS
          </Text>
        </View>
      </View>
      <View style={[styles.fasciaRule, { backgroundColor: colors.border }]} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Active theme plate ───────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(200)}>
          <Card tone="accent" accent={colors.accent} style={styles.banner}>
            <View style={styles.bannerLeft}>
              <Text style={[styles.bannerLabel, { color: colors.accent }]}>ACTIVE THEME</Text>
              <Text style={[styles.bannerName, { color: colors.text }]}>
                {activeTheme.name.toUpperCase()}
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.textSecondary }]}>
                {activeTheme.description}
              </Text>
            </View>
            <View style={styles.bannerRight}>
              <View style={[styles.modeTag, { borderColor: colors.border }]}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={10}
                  color={colors.textSecondary}
                />
                <Text style={[styles.modeTagText, { color: colors.textSecondary }]}>
                  {isDark ? 'DARK' : 'LIGHT'}
                </Text>
              </View>
              <PressablePlate
                onPress={() => router.push('/theme-preview' as any)}
                accessibilityLabel="Preview this theme"
                offset={plate.low}
                radius={radius.sm}
                fill={colors.accent}
                contentStyle={styles.previewBtn}
              >
                <Text style={[styles.previewBtnText, { color: onColour(colors.accent) }]}>
                  PREVIEW
                </Text>
              </PressablePlate>
            </View>
          </Card>
        </Animated.View>

        {/* ── Theme ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel title="Theme" />
          <ThemePicker />
        </View>

        {/* ── Currency ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel title="Currency" />
          <Card>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Used by the finance tools — EMI, GST, SIP, Tip &amp; Split, Discount
              and Expenses.
            </Text>
            <View style={styles.currencyGrid}>
              {CURRENCY_LIST.map((c) => (
                <Pill
                  key={c.code}
                  label={c.symbol === c.code ? c.code : `${c.symbol} ${c.code}`}
                  active={prefs.currency === c.code}
                  onPress={() => prefs.setCurrency(c.code as CurrencyCode)}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel title="Preferences" />
          <Card padded={false}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#7A3246', borderColor: colors.border }]}>
                <Ionicons name="pulse" size={15} color="#FFFDF7" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Haptic feedback</Text>
                <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>
                  Vibration on button presses
                </Text>
              </View>
              <Switch
                value={prefs.hapticFeedback}
                onValueChange={(v) => prefs.setHapticFeedback(v)}
                trackColor={{ false: colors.subtle, true: colors.accent }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.subtle}
              />
            </View>
          </Card>
        </View>

        {/* ── Data ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel title="Data & Storage" />
          <Card padded={false}>
            <ActionRow
              icon="trash-outline" tint="#A6392B" label="Clear all cache"
              description="Remove all tool data and history"
              onPress={clearAllCache} colors={colors} destructive
            />
            <Rule />
            <ActionRow
              icon="star-outline" tint="#C2902B" label="Reset favourites"
              description={favouriteCount === 0
                ? 'No favourites yet'
                : `Remove ${favouriteCount} starred tool${favouriteCount === 1 ? '' : 's'}`}
              onPress={resetFavourites} colors={colors} destructive
              disabled={favouriteCount === 0}
            />
            <Rule />
            <ActionRow
              icon="time-outline" tint="#6B4A6E" label="Clear history"
              description={recentCount === 0
                ? 'Nothing in your history'
                : `Clear ${recentCount} recently used tool${recentCount === 1 ? '' : 's'}`}
              onPress={clearHistory} colors={colors}
              disabled={recentCount === 0}
            />
          </Card>
        </View>

        {/* ── About ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionLabel title="About" />
          <Card padded={false}>
            <ActionRow
              icon="cloud-download-outline" tint="#4C6B3C"
              label={update.checking ? 'Checking for updates…' : 'Check for updates'}
              description={updateStatusLine(update)}
              onPress={async () => {
                const next = await update.check();
                // Only speak up when there is nothing to show. When there is,
                // the gate is already on screen saying it better than a toast.
                if (next.kind === 'none') toast(`${APP_NAME} ${APP_VERSION} is up to date`);
              }}
              colors={colors}
              disabled={update.checking || !update.configured}
            />
            <Rule />
            <ActionRow
              icon="information-circle-outline" tint="#27566B"
              label={`About ${APP_NAME}`}
              description={`Version ${APP_VERSION} · ${UTILITY_REGISTRY.length} tools · ${THEMES.length} themes`}
              onPress={() =>
                Alert.alert(
                  APP_NAME,
                  `Version ${APP_VERSION}\n${UTILITY_REGISTRY.length} tools · ${THEMES.length} themes\n\nEverything runs on your device. No account, no tracking, and nothing is uploaded.`,
                )
              }
              colors={colors} showChevron
            />
            <Rule />
            <ActionRow
              icon="lock-closed-outline" tint="#4C6B3C" label="Privacy policy"
              onPress={() => Linking.openURL('https://www.wemodetechnologies.com/en/privacy')}
              colors={colors} showChevron
            />
            <Rule />
            <ActionRow
              icon="chatbubble-outline" tint="#6B4A6E" label="Send feedback"
              onPress={() => Linking.openURL('mailto:wemodetechnologies@gmail.com')}
              colors={colors} showChevron
            />
          </Card>
        </View>

        {/* ── Colophon ─────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={[styles.footerMark, { backgroundColor: colors.accent, borderColor: colors.border }]}>
            <Text style={[styles.footerMarkText, { color: onColour(colors.accent) }]}>KIT</Text>
          </View>
          <Text style={[styles.footerVersion, { color: colors.textSecondary }]}>
            {APP_NAME} {APP_VERSION}
          </Text>
          <Text style={[styles.footerMade, { color: colors.textTertiary }]}>
            WEMODE TECHNOLOGIES
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Rows ──────────────────────────────────────────────────────────────────
function ActionRow({
  icon, tint, label, description, onPress, colors, destructive, showChevron, disabled,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.row,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { backgroundColor: colors.muted },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint, borderColor: colors.border }]}>
        <Ionicons name={icon} size={15} color="#FFFDF7" />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: destructive ? '#A6392B' : colors.text }]}>
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

  // Fascia
  fascia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  fasciaKey: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fasciaTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '800',
    letterSpacing: typography.tracking.legend,
  },
  fasciaRule: { height: border.thick },

  content: {
    padding: spacing.base,
    paddingBottom: spacing['4xl'],
  },
  section: { marginTop: spacing.lg },

  // Active theme banner
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerLeft: { flex: 1, gap: 2 },
  bannerLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: typography.tracking.legend },
  bannerName: { fontSize: typography.sizes.lg, fontWeight: '800', letterSpacing: 0.5 },
  bannerDesc: { fontSize: typography.sizes.sm },
  bannerRight: { alignItems: 'flex-end', gap: spacing.sm },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: border.base,
  },
  modeTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  previewBtn: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  previewBtnText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  hint: { fontSize: typography.sizes.sm, lineHeight: 19 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    gap: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: typography.sizes.base, fontWeight: '700' },
  rowDesc: { fontSize: typography.sizes.sm, marginTop: 2 },

  // Colophon
  footer: { alignItems: 'center', paddingTop: spacing['2xl'], gap: spacing.sm },
  footerMark: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMarkText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  footerVersion: { fontSize: typography.sizes.sm, fontWeight: '800', letterSpacing: 0.5 },
  footerMade: { fontSize: 9, fontWeight: '700', letterSpacing: typography.tracking.legend },
});
