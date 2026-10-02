import React, { useMemo } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Share } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { usePreferencesStore } from '@/stores/preferencesStore';
import {
  Card, FieldLabel, NumericField, Pill, Notice, useHaptic, toast, onColour,
} from '@/components/ui';
import { formatCurrency, currencySymbol, parseAmount } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';

const ACCENT = '#B4441C';
const TIP_PRESETS = [5, 10, 15, 18, 20, 25];
const MAX_PEOPLE = 50;

interface TipStateV2 {
  billAmount: string;
  tipPercent: number;
  people: number;
  /** Custom tip is persisted too — it used to vanish on every revisit. */
  useCustomTip: boolean;
  customTip: string;
  /** Round the per-person total up to a whole unit. */
  roundUp: boolean;
}

const DEFAULT_STATE: TipStateV2 = {
  billAmount: '',
  tipPercent: 15,
  people: 1,
  useCustomTip: false,
  customTip: '',
  roundUp: false,
};

export default function TipCalculatorScreen() {
  const { colors } = useTheme();
  const currency = usePreferencesStore((s) => s.currency);
  const { state, setState, clearState } = useUtilityState<TipStateV2>('tip', DEFAULT_STATE);
  const haptic = useHaptic();

  const bill = parseAmount(state.billAmount);
  const tipPercent = state.useCustomTip ? parseAmount(state.customTip) : state.tipPercent;

  const fmt = (n: number) => formatCurrency(n, currency);

  const totals = useMemo(() => {
    const safeBill = isFinite(bill) && bill > 0 ? bill : 0;
    const safeTip = isFinite(tipPercent) && tipPercent >= 0 ? tipPercent : 0;
    const people = Math.max(1, state.people);

    const tipAmount = (safeBill * safeTip) / 100;
    const total = safeBill + tipAmount;

    // Round the *per-person* figure up, then work the group total back from it
    const rawPerPerson = total / people;
    const perPerson = state.roundUp ? Math.ceil(rawPerPerson) : rawPerPerson;
    const roundedTotal = state.roundUp ? perPerson * people : total;

    return {
      bill: safeBill,
      tipAmount: state.roundUp ? roundedTotal - safeBill : tipAmount,
      total: roundedTotal,
      perPerson,
      billPerPerson: safeBill / people,
      tipPerPerson: (state.roundUp ? roundedTotal - safeBill : tipAmount) / people,
      people,
      roundingExtra: roundedTotal - total,
    };
  }, [bill, tipPercent, state.people, state.roundUp]);

  const splitting = totals.people > 1;

  const handleShare = async () => {
    if (totals.bill <= 0) return;
    haptic('light');
    const lines = [
      `Bill: ${fmt(totals.bill)}`,
      `Tip (${isFinite(tipPercent) ? tipPercent : 0}%): ${fmt(totals.tipAmount)}`,
      `Total: ${fmt(totals.total)}`,
    ];
    if (splitting) lines.push(`Each of ${totals.people} pays: ${fmt(totals.perPerson)}`);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      toast('Could not open the share sheet', 'error');
    }
  };

  const setPeople = (delta: number) => {
    haptic('light');
    setState((p) => ({ ...p, people: Math.max(1, Math.min(MAX_PEOPLE, p.people + delta)) }));
  };

  const customTipInvalid =
    state.useCustomTip && state.customTip !== '' && (isNaN(tipPercent) || tipPercent < 0 || tipPercent > 100);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Tip & Split"
        utilityId="tip"
        accentColor={ACCENT}
        subtitle={splitting ? `Split ${totals.people} ways` : undefined}
        onClearData={clearState}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Bill */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card>
            <FieldLabel>Bill amount</FieldLabel>
            <NumericField
              value={state.billAmount}
              onChangeText={(v) => setState((p) => ({ ...p, billAmount: v }))}
              placeholder="0.00"
              prefix={currencySymbol(currency)}
              accent={ACCENT}
              size="lg"
            />
          </Card>
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <Card>
            <FieldLabel>Tip percentage</FieldLabel>
            <View style={styles.presetGrid}>
              {TIP_PRESETS.map((p) => (
                <Pill
                  key={p}
                  label={`${p}%`}
                  accent={ACCENT}
                  active={!state.useCustomTip && state.tipPercent === p}
                  onPress={() => setState((s) => ({ ...s, useCustomTip: false, tipPercent: p }))}
                />
              ))}
              <Pill
                label="Custom"
                accent={ACCENT}
                active={state.useCustomTip}
                onPress={() => setState((s) => ({ ...s, useCustomTip: true }))}
              />
            </View>

            {state.useCustomTip && (
              <NumericField
                value={state.customTip}
                onChangeText={(v) => setState((p) => ({ ...p, customTip: v }))}
                placeholder="Enter tip %"
                suffix="%"
                accent={ACCENT}
                autoFocus
              />
            )}
            {customTipInvalid && <Notice tone="warn" text="Enter a tip between 0% and 100%." />}

            <View style={[styles.tipAmtRow, { backgroundColor: ACCENT + '12' }]}>
              <Text style={[styles.tipAmtLabel, { color: colors.textSecondary }]}>Tip amount</Text>
              <Text style={[styles.tipAmtValue, { color: ACCENT }]}>{fmt(totals.tipAmount)}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* Split */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <Card>
            <FieldLabel>Split between</FieldLabel>
            <View style={styles.splitRow}>
              <Pressable
                onPress={() => setPeople(-1)}
                disabled={state.people <= 1}
                accessibilityRole="button"
                accessibilityLabel="One fewer person"
                style={[
                  styles.splitBtn,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                  state.people <= 1 && styles.disabled,
                ]}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>

              <View style={styles.splitCountWrap}>
                <Text style={[styles.splitCount, { color: colors.text }]}>{state.people}</Text>
                <Text style={[styles.splitCountLabel, { color: colors.textSecondary }]}>
                  {state.people === 1 ? 'person' : 'people'}
                </Text>
              </View>

              <Pressable
                onPress={() => setPeople(1)}
                disabled={state.people >= MAX_PEOPLE}
                accessibilityRole="button"
                accessibilityLabel="One more person"
                style={[
                  styles.splitBtn,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                  state.people >= MAX_PEOPLE && styles.disabled,
                ]}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => { haptic('select'); setState((p) => ({ ...p, roundUp: !p.roundUp })); }}
              style={[
                styles.roundRow,
                {
                  backgroundColor: state.roundUp ? ACCENT + '14' : colors.muted,
                  borderColor: state.roundUp ? ACCENT + '45' : colors.border,
                },
              ]}
            >
              <Ionicons
                name={state.roundUp ? 'checkbox' : 'square-outline'}
                size={18}
                color={state.roundUp ? ACCENT : colors.textTertiary}
              />
              <Text style={[styles.roundLabel, { color: colors.text }]}>
                Round each share up to a whole {currencySymbol(currency)}
              </Text>
            </Pressable>
            {state.roundUp && totals.roundingExtra > 0 && (
              <Text style={[styles.roundNote, { color: colors.textTertiary }]}>
                Rounding adds {fmt(totals.roundingExtra)} to the tip.
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* Result */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={[styles.resultsCard, { backgroundColor: ACCENT }]}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>{splitting ? 'Each person pays' : 'Total'}</Text>
              <Text
                style={styles.resultsMain}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {fmt(splitting ? totals.perPerson : totals.total)}
              </Text>
            </View>

            <View style={styles.resultsDivider} />

            {/* Every row below is for the SAME payer — the whole group when
                splitting is off, one person when it's on. */}
            <View style={styles.resultsBreakdown}>
              <ResultRow
                label={splitting ? 'Their share of the bill' : 'Bill'}
                value={fmt(splitting ? totals.billPerPerson : totals.bill)}
              />
              <ResultRow
                label={`Tip (${isFinite(tipPercent) ? tipPercent : 0}%)`}
                value={fmt(splitting ? totals.tipPerPerson : totals.tipAmount)}
              />
              <ResultRow
                label={splitting ? 'Their total' : 'Total'}
                value={fmt(splitting ? totals.perPerson : totals.total)}
                bold
              />
              {splitting && (
                <ResultRow label={`Group total (${totals.people})`} value={fmt(totals.total)} faded />
              )}
            </View>

            <Pressable
              onPress={handleShare}
              disabled={totals.bill <= 0}
              accessibilityRole="button"
              style={[styles.shareBtn, totals.bill <= 0 && styles.disabled]}
            >
              <Ionicons name="share-outline" size={16} color={onColour(ACCENT)} />
              <Text style={[styles.shareBtnTxt, { color: onColour(ACCENT) }]}>Share split</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Per-person breakdown */}
        {splitting && totals.bill > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(280)}>
            <Card>
              <FieldLabel>Who owes what</FieldLabel>
              {Array.from({ length: Math.min(totals.people, 20) }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.personRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <View style={[styles.personAvatar, { backgroundColor: ACCENT + '20' }]}>
                    <Text style={[styles.personAvatarTxt, { color: ACCENT }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.personLabel, { color: colors.textSecondary }]}>Person {i + 1}</Text>
                  <Text style={[styles.personAmount, { color: colors.text }]}>{fmt(totals.perPerson)}</Text>
                </View>
              ))}
              {totals.people > 20 && (
                <Text style={[styles.moreNote, { color: colors.textTertiary }]}>
                  + {totals.people - 20} more, each paying {fmt(totals.perPerson)}
                </Text>
              )}
            </Card>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultRow({ label, value, bold, faded }: { label: string; value: string; bold?: boolean; faded?: boolean }) {
  const fg = onColour(ACCENT);
  return (
    <View style={styles.resultsRow}>
      <Text style={[styles.resultsRowLabel, { color: fg, opacity: faded ? 0.6 : 0.8 }]}>{label}</Text>
      <Text
        style={[
          styles.resultsRowValue,
          { color: fg, opacity: faded ? 0.7 : 1, fontWeight: bold ? '800' : '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },
  disabled: { opacity: 0.35 },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tipAmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  tipAmtLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  tipAmtValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },

  splitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  splitBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCountWrap: { alignItems: 'center', minWidth: 84 },
  splitCount: { fontSize: 40, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  splitCountLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },

  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.base,
  },
  roundLabel: { flex: 1, fontSize: typography.sizes.sm, fontWeight: '600' },
  roundNote: { fontSize: typography.sizes.xs, textAlign: 'center' },

  resultsCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultsHeader: { alignItems: 'center', gap: 4 },
  resultsTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
  resultsMain: { color: '#fff', fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  resultsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  resultsBreakdown: { gap: spacing.sm },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resultsRowLabel: { fontSize: typography.sizes.sm },
  resultsRowValue: { fontSize: typography.sizes.sm, fontVariant: ['tabular-nums'] },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.xl,
  },
  shareBtnTxt: { fontSize: typography.sizes.sm, fontWeight: '800' },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  personAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  personAvatarTxt: { fontSize: typography.sizes.sm, fontWeight: '800' },
  personLabel: { flex: 1, fontSize: typography.sizes.sm },
  personAmount: { fontSize: typography.sizes.sm, fontWeight: '800', fontVariant: ['tabular-nums'] },
  moreNote: { fontSize: typography.sizes.xs, textAlign: 'center', paddingTop: spacing.xs },
});
