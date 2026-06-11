import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, Pressable, TextInput,
  ScrollView, Share,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { TipState } from '@/types';

const ACCENT = '#F97316';
const TIP_PRESETS = [5, 10, 15, 18, 20, 25];

const DEFAULT_STATE: TipState = {
  billAmount: '',
  tipPercent: 15,
  people: 1,
  splitEvenly: true,
};

export default function TipCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<TipState>('tip', DEFAULT_STATE);
  const [customTip, setCustomTip] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const bill = parseFloat(state.billAmount) || 0;
  const tip  = showCustom ? (parseFloat(customTip) || 0) : state.tipPercent;

  const { tipAmount, total, perPerson, tipPerPerson } = useMemo(() => {
    const tipAmount   = (bill * tip) / 100;
    const total       = bill + tipAmount;
    const perPerson   = state.people > 0 ? total / state.people : total;
    const tipPerPerson = state.people > 0 ? tipAmount / state.people : tipAmount;
    return { tipAmount, total, perPerson, tipPerPerson };
  }, [bill, tip, state.people]);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const handleShare = () => {
    Share.share({
      message:
        `Bill: ${fmt(bill)}\nTip (${tip}%): ${fmt(tipAmount)}\nTotal: ${fmt(total)}\nPer person: ${fmt(perPerson)}`,
    });
  };

  const setPeople = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({ ...p, people: Math.max(1, Math.min(20, p.people + delta)) }));
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader title="Tip & Split" utilityId="tip" accentColor={ACCENT} onClearData={clearState} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Bill Input */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <View style={[styles.billCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Bill Amount</Text>
            <View style={styles.billRow}>
              <Text style={[styles.billCurrency, { color: ACCENT }]}>$</Text>
              <TextInput
                style={[styles.billInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={state.billAmount}
                onChangeText={(v) => setState((p) => ({ ...p, billAmount: v }))}
              />
            </View>
          </View>
        </Animated.View>

        {/* Tip Presets */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tip %</Text>
            <View style={styles.presetGrid}>
              {TIP_PRESETS.map((p) => {
                const active = !showCustom && state.tipPercent === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowCustom(false);
                      setState((s) => ({ ...s, tipPercent: p }));
                    }}
                    style={[
                      styles.presetChip,
                      { backgroundColor: colors.card, borderColor: active ? ACCENT : colors.border },
                      active && { backgroundColor: ACCENT + '18' },
                    ]}
                  >
                    <Text style={[styles.presetTxt, { color: active ? ACCENT : colors.textSecondary }]}>
                      {p}%
                    </Text>
                  </Pressable>
                );
              })}
              {/* Custom */}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCustom(true); }}
                style={[
                  styles.presetChip,
                  { backgroundColor: colors.card, borderColor: showCustom ? ACCENT : colors.border },
                  showCustom && { backgroundColor: ACCENT + '18' },
                ]}
              >
                <Text style={[styles.presetTxt, { color: showCustom ? ACCENT : colors.textSecondary }]}>
                  Custom
                </Text>
              </Pressable>
            </View>

            {showCustom && (
              <View style={[styles.customRow, { borderColor: colors.border }]}>
                <TextInput
                  style={[styles.customInput, { color: colors.text }]}
                  placeholder="Enter %"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  value={customTip}
                  onChangeText={setCustomTip}
                  autoFocus
                />
                <Text style={[styles.customPct, { color: colors.textSecondary }]}>%</Text>
              </View>
            )}

            {/* Tip amount display */}
            <View style={[styles.tipAmtRow, { backgroundColor: ACCENT + '12', borderRadius: radius.lg }]}>
              <Text style={[styles.tipAmtLabel, { color: colors.textSecondary }]}>Tip Amount</Text>
              <Text style={[styles.tipAmtValue, { color: ACCENT }]}>{fmt(tipAmount)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Split */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Split Between</Text>
            <View style={styles.splitRow}>
              <Pressable
                onPress={() => setPeople(-1)}
                style={[styles.splitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="remove" size={20} color={state.people <= 1 ? colors.textTertiary : colors.text} />
              </Pressable>
              <View style={styles.splitCountWrap}>
                <Text style={[styles.splitCount, { color: colors.text }]}>{state.people}</Text>
                <Text style={[styles.splitCountLabel, { color: colors.textSecondary }]}>
                  {state.people === 1 ? 'person' : 'people'}
                </Text>
              </View>
              <Pressable
                onPress={() => setPeople(1)}
                style={[styles.splitBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Ionicons name="add" size={20} color={state.people >= 20 ? colors.textTertiary : colors.text} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        {/* Results Card */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={[styles.resultsCard, { backgroundColor: ACCENT, }]}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {state.people > 1 ? `Each pays` : 'Total'}
              </Text>
              <Text style={styles.resultsMain}>
                {state.people > 1 ? fmt(perPerson) : fmt(total)}
              </Text>
            </View>

            <View style={[styles.resultsDivider, { backgroundColor: 'rgba(255,255,255,0.25)' }]} />

            <View style={styles.resultsBreakdown}>
              <View style={styles.resultsRow}>
                <Text style={styles.resultsRowLabel}>Subtotal</Text>
                <Text style={styles.resultsRowValue}>{fmt(bill)}</Text>
              </View>
              <View style={styles.resultsRow}>
                <Text style={styles.resultsRowLabel}>Tip ({tip}%)</Text>
                <Text style={styles.resultsRowValue}>
                  {state.people > 1 ? fmt(tipPerPerson) : fmt(tipAmount)}
                </Text>
              </View>
              <View style={styles.resultsRow}>
                <Text style={styles.resultsRowLabel}>Total</Text>
                <Text style={[styles.resultsRowValue, { fontWeight: typography.weights.bold }]}>
                  {state.people > 1 ? fmt(perPerson) : fmt(total)}
                </Text>
              </View>
            </View>

            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.shareBtnTxt}>Share Split</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* People quick grid for 2-8 */}
        {state.people > 1 && (
          <Animated.View entering={FadeInDown.delay(200).duration(280)}>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Breakdown</Text>
              {Array.from({ length: state.people }).map((_, i) => (
                <View key={i} style={[styles.personRow, { borderColor: colors.border }]}>
                  <View style={[styles.personAvatar, { backgroundColor: ACCENT + '20' }]}>
                    <Text style={[styles.personAvatarTxt, { color: ACCENT }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.personLabel, { color: colors.textSecondary }]}>Person {i + 1}</Text>
                  <Text style={[styles.personAmount, { color: colors.text }]}>{fmt(perPerson)}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },

  billCard: {
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing.lg, gap: spacing.xs,
  },
  billLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, letterSpacing: 1 },
  billRow: { flexDirection: 'row', alignItems: 'center' },
  billCurrency: { fontSize: 36, fontWeight: typography.weights.bold, marginRight: spacing.xs },
  billInput: { flex: 1, fontSize: 48, fontWeight: typography.weights.extrabold, letterSpacing: -2 },

  sectionCard: {
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing.md, gap: spacing.md,
  },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.xl, borderWidth: 1.5, minWidth: 60, alignItems: 'center',
  },
  presetTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  customRow: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1.5, paddingBottom: spacing.sm,
  },
  customInput: { flex: 1, fontSize: 24, fontWeight: typography.weights.bold },
  customPct: { fontSize: 18, fontWeight: typography.weights.medium },
  tipAmtRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: spacing.md,
  },
  tipAmtLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  tipAmtValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },

  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  splitBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  splitCountWrap: { alignItems: 'center', minWidth: 80 },
  splitCount: { fontSize: 40, fontWeight: typography.weights.extrabold, letterSpacing: -1 },
  splitCountLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },

  resultsCard: {
    borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  resultsHeader: { alignItems: 'center', gap: 4 },
  resultsTitle: { color: 'rgba(255,255,255,0.8)', fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  resultsMain: { color: '#fff', fontSize: 52, fontWeight: typography.weights.extrabold, letterSpacing: -2 },
  resultsDivider: { height: 1 },
  resultsBreakdown: { gap: spacing.sm },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resultsRowLabel: { color: 'rgba(255,255,255,0.75)', fontSize: typography.sizes.sm },
  resultsRowValue: { color: '#fff', fontSize: typography.sizes.sm },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.xl,
  },
  shareBtnTxt: { color: '#fff', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },

  personRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.md,
  },
  personAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  personAvatarTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  personLabel: { flex: 1, fontSize: typography.sizes.sm },
  personAmount: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },
});