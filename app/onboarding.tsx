import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  SpaceGrotesk_700Bold,
  SpaceGrotesk_500Medium,
} from '@expo-google-fonts/space-grotesk';

import { useTheme } from '@/theme/ThemeProvider';
import { ThemePicker } from '@/components/common/ThemePicker';
import { UtilityIcon } from '@/components/common/UtilityIcon';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { UTILITY_REGISTRY } from '@/registry';
import { spacing, radius, typography } from '@/theme';

const STEP_COUNT = 3;
// A spread of real tools to preview on step 2 — picked for category variety.
const PREVIEW_IDS = [
  'calculator',
  'unitConverter',
  'currencyConverter',
  'qrScanner',
  'pomodoro',
  'worldClock',
  'passwordGenerator',
  'colorPicker',
  'compass',
];

// ─── Onboarding ──────────────────────────────────────────────────────────────
export default function Onboarding() {
  const { colors, theme: activeTheme, isDark } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
  });

  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const accent = activeTheme?.colors?.accent ?? colors.accent ?? '#6366F1';
  const display = fontsLoaded ? 'SpaceGrotesk_700Bold' : undefined;
  const medium = fontsLoaded ? 'SpaceGrotesk_500Medium' : undefined;

  const previewTools = PREVIEW_IDS
    .map((id) => UTILITY_REGISTRY.find((u) => u.id === id))
    .filter(Boolean)
    .slice(0, 9) as typeof UTILITY_REGISTRY;

  const goTo = (p: number) => {
    scrollRef.current?.scrollTo({ x: p * width, animated: true });
    setPage(p);
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) {
      setPage(p);
      Haptics.selectionAsync();
    }
  };

  const handlePrimary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (page < STEP_COUNT - 1) goTo(page + 1);
    else finish();
  };

  const finish = () => {
    usePreferencesStore.getState().setOnboardingCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  };

  const isLast = page === STEP_COUNT - 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: top }]}>
      {/* ── Top bar: progress + skip ─────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === page ? 22 : 7,
                  backgroundColor: i === page ? accent : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {!isLast && (
          <Pressable onPress={finish} hitSlop={12}>
            <Text style={[styles.skip, { color: colors.textTertiary, fontFamily: medium }]}>
              Skip
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Paged steps ──────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
      >
        {/* STEP 1 — Welcome ----------------------------------------- */}
        <View style={[styles.page, { width }]}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(450)} style={styles.heroIconWrap}>
              <Image
                source={require('../assets/icon.png')}
                style={[styles.heroIcon, { borderColor: colors.border }]}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.Text
              entering={FadeInUp.delay(120).duration(450)}
              style={[styles.title, { color: colors.text, fontFamily: display }]}
            >
              Welcome to Toolr
            </Animated.Text>

            <Animated.Text
              entering={FadeInUp.delay(200).duration(450)}
              style={[styles.subtitle, { color: colors.textSecondary, fontFamily: medium }]}
            >
              Your pocket utility kit
            </Animated.Text>

            <Animated.View entering={FadeIn.delay(320).duration(500)} style={styles.bulletList}>
              {[
                { icon: 'flash', label: `${UTILITY_REGISTRY.length} fast tools in one app` },
                { icon: 'cloud-offline', label: 'Works offline, no account needed' },
                { icon: 'lock-closed', label: 'Your data stays on your device' },
              ].map((b) => (
                <View key={b.label} style={styles.bullet}>
                  <View style={[styles.bulletIcon, { backgroundColor: accent + '18' }]}>
                    <Ionicons name={b.icon as any} size={15} color={accent} />
                  </View>
                  <Text style={[styles.bulletText, { color: colors.text }]}>{b.label}</Text>
                </View>
              ))}
            </Animated.View>
          </ScrollView>
        </View>

        {/* STEP 2 — What's inside ----------------------------------- */}
        <View style={[styles.page, { width }]}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInUp.duration(400)}
              style={[styles.title, { color: colors.text, fontFamily: display }]}
            >
              Everything in one tap
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(80).duration(400)}
              style={[styles.subtitle, { color: colors.textSecondary, fontFamily: medium }]}
            >
              Calculators, converters, timers and more — ready when you are
            </Animated.Text>

            <View style={styles.previewGrid}>
              {previewTools.map((u, i) => (
                <Animated.View
                  key={u.id}
                  entering={FadeInDown.delay(120 + i * 50).duration(350)}
                  style={[
                    styles.previewCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.previewIcon, { backgroundColor: u.color + '1A' }]}>
                    <UtilityIcon utility={u} size={20} color={u.color} />
                  </View>
                  <Text
                    style={[styles.previewLabel, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {u.title}
                  </Text>
                </Animated.View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* STEP 3 — Pick a theme ------------------------------------ */}
        <View style={[styles.page, { width }]}>
          <ScrollView
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.Text
              entering={FadeInUp.duration(400)}
              style={[styles.title, { color: colors.text, fontFamily: display }]}
            >
              Make it yours
            </Animated.Text>
            <Animated.Text
              entering={FadeInUp.delay(80).duration(400)}
              style={[styles.subtitle, { color: colors.textSecondary, fontFamily: medium }]}
            >
              Pick a theme to start with. You can change it anytime in Settings.
            </Animated.Text>

            {/* Live preview of the currently selected theme */}
            <Animated.View
              entering={FadeInDown.delay(120).duration(400)}
              style={[
                styles.themeBanner,
                { backgroundColor: accent + '14', borderColor: accent + '30' },
              ]}
            >
              <Text style={styles.themeEmoji}>{activeTheme?.emoji ?? '🎨'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.themeName, { color: colors.text }]}>
                  {activeTheme?.name ?? 'Default'}
                </Text>
                {!!activeTheme?.description && (
                  <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                    {activeTheme.description}
                  </Text>
                )}
              </View>
              <View style={[styles.modeBadge, { backgroundColor: isDark ? '#ffffff12' : '#00000010' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={11} color={accent} />
                <Text style={[styles.modeBadgeText, { color: accent }]}>
                  {isDark ? 'Dark' : 'Light'}
                </Text>
              </View>
            </Animated.View>

            {/* Reuses your existing picker — it owns the theme-setting logic */}
            <Animated.View entering={FadeInDown.delay(180).duration(400)}>
              <ThemePicker />
            </Animated.View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Bottom action ────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: bottom + spacing.base }]}>
        <Pressable
          onPress={handlePrimary}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: accent, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.ctaText, { fontFamily: display }]}>
            {isLast ? 'Get started' : 'Continue'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#fff"
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
  skip: { fontSize: typography.sizes.base, fontWeight: '600' },

  page: { flex: 1 },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base + 4,
    paddingVertical: spacing.xl,
  },

  // Hero (step 1)
  heroIconWrap: { alignItems: 'center', marginBottom: spacing.lg },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },

  title: {
    fontSize: 30,
    letterSpacing: -0.9,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },

  bulletList: { gap: spacing.sm, alignSelf: 'center', maxWidth: 320, width: '100%' },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: { flex: 1, fontSize: typography.sizes.base, fontWeight: '500' },

  // Preview grid (step 2)
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  previewCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Theme step (step 3)
  themeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  themeEmoji: { fontSize: 30 },
  themeName: { fontSize: typography.sizes.md, fontWeight: '800' },
  themeDesc: { fontSize: typography.sizes.sm, marginTop: 2 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  modeBadgeText: { fontSize: 11, fontWeight: '700' },

  // Footer CTA
  footer: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radius.full,
  },
  ctaText: { color: '#fff', fontSize: 17, letterSpacing: -0.2 },
});