import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing, radius, typography, shadows } from '@/theme';

// A live preview screen that shows the current theme applied to real UI elements
export default function ThemePreviewScreen() {
  const { colors, isDark, theme } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.themeEmoji}>{theme.emoji}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{theme.name}</Text>
        </View>
        <View style={[styles.darkBadge, { backgroundColor: colors.muted }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={12} color={colors.accent} />
          <Text style={[styles.darkBadgeText, { color: colors.accent }]}>
            {isDark ? 'Dark' : 'Light'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Accent palette block ─────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(350)}>
          <Label text="Accent Color" colors={colors} />
          <View style={styles.accentRow}>
            {[1, 0.7, 0.4, 0.15].map((op, i) => (
              <View
                key={i}
                style={[
                  styles.accentSwatch,
                  { backgroundColor: colors.accent, opacity: op, flex: 1 },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.accentHex, { color: colors.textTertiary }]}>
            {colors.accent}
          </Text>
        </Animated.View>

        {/* ── Typography scale ─────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <Label text="Typography" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { size: 28, weight: '800', label: 'Display' },
              { size: 22, weight: '700', label: 'Title' },
              { size: 17, weight: '600', label: 'Headline' },
              { size: 15, weight: '500', label: 'Body' },
              { size: 13, weight: '400', label: 'Caption' },
              { size: 11, weight: '700', label: 'OVERLINE' },
            ].map(({ size, weight, label }) => (
              <View key={label} style={styles.typRow}>
                <Text style={[styles.typLabel, { color: colors.textTertiary }]}>{label}</Text>
                <Text style={{ fontSize: size, fontWeight: weight as any, color: colors.text, letterSpacing: size > 20 ? -0.5 : 0 }}>
                  {label === 'OVERLINE' ? label : 'The quick brown fox'}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Color tokens ─────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(350)}>
          <Label text="Color Tokens" colors={colors} />
          <View style={styles.tokensGrid}>
            {[
              { name: 'Background', color: colors.bg },
              { name: 'Surface', color: colors.surface },
              { name: 'Card', color: colors.card },
              { name: 'Border', color: colors.border },
              { name: 'Muted', color: colors.muted },
              { name: 'Text', color: colors.text },
              { name: 'Secondary', color: colors.textSecondary },
              { name: 'Tertiary', color: colors.textTertiary },
              { name: 'Accent', color: colors.accent },
              { name: 'Accent BG', color: colors.accentLight },
            ].map(({ name, color }) => (
              <View key={name} style={[styles.tokenCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.tokenSwatch, { backgroundColor: color, borderColor: colors.border }]} />
                <Text style={[styles.tokenName, { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
                <Text style={[styles.tokenHex, { color: colors.textTertiary }]} numberOfLines={1}>
                  {color.length > 9 ? color.slice(0, 9) : color}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── UI Components preview ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(350)}>
          <Label text="Buttons" colors={colors} />
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.primaryBtnText}>Primary</Text>
            </Pressable>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[styles.secondaryBtn, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>Secondary</Text>
            </Pressable>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={[styles.ghostBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.ghostBtnText, { color: colors.textSecondary }]}>Ghost</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Cards preview ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <Label text="Cards" colors={colors} />
          <View style={styles.cardsRow}>
            {[
              { icon: 'calculator', label: 'Calculator', color: colors.accent },
              { icon: 'time', label: 'Stopwatch', color: '#14B8A6' },
              { icon: 'document-text', label: 'Notes', color: '#F43F5E' },
              { icon: 'qr-code', label: 'QR Scanner', color: '#0EA5E9' },
            ].map(({ icon, label, color }) => (
              <View
                key={label}
                style={[styles.previewUtilCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.previewUtilIcon, { backgroundColor: color + '20' }]}>
                  <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <Text style={[styles.previewUtilLabel, { color: colors.text }]} numberOfLines={1}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Input preview ────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(350)}>
          <Label text="Inputs & Chips" colors={colors} />
          <View style={[styles.inputPreview, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <Ionicons name="search" size={16} color={colors.accent} />
            <Text style={[styles.inputPreviewText, { color: colors.textTertiary }]}>Search utilities…</Text>
          </View>
          <View style={styles.chipsRow}>
            {['Math', 'Finance', 'Tools', 'Time', 'Converter'].map((c, i) => (
              <View
                key={c}
                style={[
                  styles.chip,
                  {
                    backgroundColor: i === 0 ? colors.accent : colors.muted,
                    borderColor: i === 0 ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: i === 0 ? '#fff' : colors.textSecondary }]}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Theme description ────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(280).duration(350)}
          style={[styles.descCard, { backgroundColor: colors.accentLight, borderColor: colors.accent + '30' }]}
        >
          <Text style={styles.descEmoji}>{theme.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.descName, { color: colors.accent }]}>{theme.name}</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>{theme.description}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Label({ text, colors }: { text: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  themeEmoji: { fontSize: 20 },
  headerTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold },
  darkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  darkBadgeText: { fontSize: 12, fontWeight: '700' },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: spacing.xs,
  },
  // Accent
  accentRow: { flexDirection: 'row', height: 36, borderRadius: radius.lg, overflow: 'hidden', gap: 2 },
  accentHex: { fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  // Typography
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  typRow: { gap: 2 },
  typLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  // Tokens
  tokensGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tokenCard: {
    width: '30%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
    alignItems: 'center',
  },
  tokenSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1 },
  tokenName: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  tokenHex: { fontSize: 9, fontFamily: 'monospace', textAlign: 'center' },
  // Buttons
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sizes.sm },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: typography.sizes.sm },
  ghostBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  ghostBtnText: { fontWeight: '600', fontSize: typography.sizes.sm },
  // Cards
  cardsRow: { flexDirection: 'row', gap: spacing.sm },
  previewUtilCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewUtilIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  previewUtilLabel: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  // Input
  inputPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  inputPreviewText: { fontSize: typography.sizes.base },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: '600' },
  // Desc
  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
  },
  descEmoji: { fontSize: 32 },
  descName: { fontSize: typography.sizes.md, fontWeight: '700' },
  descText: { fontSize: typography.sizes.sm, marginTop: 2 },
});
