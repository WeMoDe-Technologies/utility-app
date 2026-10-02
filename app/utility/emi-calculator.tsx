import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { Card, FieldLabel, Segmented, NumericField, Notice, Pill } from '@/components/ui';
import { formatCurrency, formatCurrencyCompact, currencySymbol, parseAmount } from '@/utils/format';
import { spacing, radius, typography } from '@/theme';
import type { EMIState } from '@/types';

const ACCENT = '#C2902B';

const DEFAULT_STATE: EMIState = {
  principal: '',
  rate: '',
  tenure: '',
  tenureType: 'years',
  emi: '',
  totalAmount: '',
  totalInterest: '',
};

interface EMIResult {
  emi: number;
  total: number;
  interest: number;
}

/**
 * Standard reducing-balance EMI. A 0% loan is a legitimate input (the formula
 * divides by zero there), so it gets its own branch instead of being rejected.
 */
function calculateEMI(principal: number, annualRate: number, tenureMonths: number): EMIResult | null {
  if (!(principal > 0) || !(tenureMonths > 0) || annualRate < 0) return null;

  if (annualRate === 0) {
    const emi = principal / tenureMonths;
    return { emi, total: principal, interest: 0 };
  }

  const r = annualRate / 12 / 100;
  const factor = Math.pow(1 + r, tenureMonths);
  const emi = (principal * r * factor) / (factor - 1);
  if (!isFinite(emi)) return null;

  const total = emi * tenureMonths;
  return { emi, total, interest: total - principal };
}

const AMOUNT_PRESETS = [100000, 500000, 1000000, 2500000, 5000000];
const RATE_PRESETS = [7, 8.5, 9, 10.5, 12];
const TENURE_PRESETS = { years: [5, 10, 15, 20, 30], months: [6, 12, 18, 24, 36] };

export default function EMICalculatorScreen() {
  const { colors } = useTheme();
  const currency = usePreferencesStore((s) => s.currency);
  const { state, setState, clearState } = useUtilityState<EMIState>('emi', DEFAULT_STATE);

  const principal = parseAmount(state.principal);
  const rate = parseAmount(state.rate);
  const tenure = parseAmount(state.tenure);
  const months = state.tenureType === 'years' ? tenure * 12 : tenure;

  // Recomputed live — there is no "Calculate" button to forget to press
  const result = useMemo(
    () => calculateEMI(principal, rate, months),
    [principal, rate, months],
  );

  const fmt = (n: number) => formatCurrency(n, currency, { decimals: 0 });

  // Explain exactly which field is holding the calculation up
  const validation = useMemo(() => {
    if (!state.principal && !state.rate && !state.tenure) return null;
    if (!(principal > 0)) return 'Enter a loan amount greater than zero.';
    if (isNaN(rate) || rate < 0) return 'Enter an interest rate (use 0 for an interest-free loan).';
    if (!(months > 0)) return 'Enter a tenure greater than zero.';
    if (months > 600) return 'Tenure is capped at 50 years.';
    return null;
  }, [state.principal, state.rate, state.tenure, principal, rate, months]);

  const principalRatio = result && result.total > 0
    ? Math.min(100, Math.max(0, (principal / result.total) * 100))
    : 0;

  const set = (patch: Partial<EMIState>) => setState((p) => ({ ...p, ...patch }));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="EMI Calculator"
        utilityId="emi"
        accentColor={ACCENT}
        subtitle={result ? `${months} monthly payments` : undefined}
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Inputs ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card>
            <View>
              <FieldLabel>Loan amount</FieldLabel>
              <NumericField
                value={state.principal}
                onChangeText={(v) => set({ principal: v })}
                placeholder="0"
                prefix={currencySymbol(currency)}
                accent={ACCENT}
                size="lg"
              />
              <View style={styles.presetRow}>
                {AMOUNT_PRESETS.map((amt) => (
                  <Pill
                    key={amt}
                    label={formatCurrencyCompact(amt, currency)}
                    active={parseAmount(state.principal) === amt}
                    accent={ACCENT}
                    onPress={() => set({ principal: String(amt) })}
                  />
                ))}
              </View>
            </View>

            <View>
              <FieldLabel>Annual interest rate</FieldLabel>
              <NumericField
                value={state.rate}
                onChangeText={(v) => set({ rate: v })}
                placeholder="0"
                suffix="%"
                accent={ACCENT}
              />
              <View style={styles.presetRow}>
                {RATE_PRESETS.map((r) => (
                  <Pill
                    key={r}
                    label={`${r}%`}
                    active={parseAmount(state.rate) === r}
                    accent={ACCENT}
                    onPress={() => set({ rate: String(r) })}
                  />
                ))}
              </View>
            </View>

            <View>
              <FieldLabel>Tenure</FieldLabel>
              <View style={styles.tenureRow}>
                <NumericField
                  value={state.tenure}
                  onChangeText={(v) => set({ tenure: v })}
                  placeholder="0"
                  accent={ACCENT}
                  style={styles.tenureInput}
                />
                <Segmented
                  options={[
                    { value: 'years', label: 'Years' },
                    { value: 'months', label: 'Months' },
                  ]}
                  value={state.tenureType}
                  onChange={(v) => set({ tenureType: v })}
                  accent={ACCENT}
                  style={styles.tenureToggle}
                />
              </View>
              <View style={styles.presetRow}>
                {TENURE_PRESETS[state.tenureType].map((t) => (
                  <Pill
                    key={t}
                    label={`${t}`}
                    active={parseAmount(state.tenure) === t}
                    accent={ACCENT}
                    onPress={() => set({ tenure: String(t) })}
                  />
                ))}
              </View>
            </View>

            {validation && <Notice text={validation} tone="warn" />}
          </Card>
        </Animated.View>

        {/* ── Result ─────────────────────────────────────────────────────── */}
        {result && (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.resultBlock}>
            <Card tone="accent" accent={ACCENT} style={styles.emiCard}>
              <Text style={[styles.emiLabel, { color: ACCENT }]}>MONTHLY EMI</Text>
              <Text
                style={[styles.emiAmount, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {fmt(result.emi)}
              </Text>
              <Text style={[styles.emiSub, { color: colors.textSecondary }]}>
                for {months} month{months === 1 ? '' : 's'}
                {state.tenureType === 'years' && tenure ? ` (${tenure} years)` : ''}
              </Text>
            </Card>

            <Card>
              <BreakdownRow
                dot="#3C5A7D"
                label="Principal"
                value={fmt(principal)}
                colors={colors}
              />
              <BreakdownRow
                dot="#A6392B"
                label="Total interest"
                value={fmt(result.interest)}
                valueColor="#A6392B"
                colors={colors}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <BreakdownRow
                dot={ACCENT}
                label="Total payable"
                value={fmt(result.total)}
                bold
                colors={colors}
              />

              {/* Principal vs interest split */}
              <View style={[styles.ratioBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.ratioFill, { backgroundColor: '#3C5A7D', width: `${principalRatio}%` }]} />
                <View style={[styles.ratioFill, { backgroundColor: '#A6392B', flex: 1 }]} />
              </View>
              <View style={styles.ratioLegend}>
                <Text style={[styles.legendTxt, { color: '#3C5A7D' }]}>
                  Principal {principalRatio.toFixed(1)}%
                </Text>
                <Text style={[styles.legendTxt, { color: '#A6392B' }]}>
                  Interest {(100 - principalRatio).toFixed(1)}%
                </Text>
              </View>

              {result.interest > principal && (
                <Notice
                  tone="warn"
                  text={`Over the full term you pay ${(result.interest / principal).toFixed(1)}× the loan amount in interest.`}
                />
              )}
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BreakdownRow({
  dot, label, value, valueColor, bold, colors,
}: {
  dot: string;
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  colors: any;
}) {
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: dot }]} />
      <Text
        style={[
          styles.breakdownLabel,
          { color: bold ? colors.text : colors.textSecondary, fontWeight: bold ? '700' : '400' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.breakdownValue,
          { color: valueColor ?? colors.text, fontWeight: bold ? '800' : '600' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tenureRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  tenureInput: { flex: 1 },
  tenureToggle: { width: 168 },

  resultBlock: { gap: spacing.base },
  emiCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  emiLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  emiAmount: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2 },
  emiSub: { fontSize: typography.sizes.sm },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { flex: 1, fontSize: typography.sizes.base },
  breakdownValue: { fontSize: typography.sizes.base, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth },

  ratioBar: {
    height: 10,
    borderRadius: radius.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  ratioFill: { height: '100%' },
  ratioLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendTxt: { fontSize: 12, fontWeight: '700' },
});
