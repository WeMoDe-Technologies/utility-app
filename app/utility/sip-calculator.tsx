import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { Card, FieldLabel, Segmented, Slider, Pill, useHaptic } from '@/components/ui';
import {
  formatCurrency, formatCurrencyCompact, currencySymbol, type CurrencyCode,
} from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';
import type { SipState } from '@/types';

const ACCENT  = '#4C6B3C';  // invested
const ACCENT2 = '#3C5A7D';  // returns
const ACCENT3 = '#B4441C';  // duration

type Mode = 'sip' | 'lumpsum';

const DEFAULT_STATE: SipState = {
  mode: 'sip',
  monthlyAmount: 5000,
  lumpsum: 100000,
  rate: 12,
  years: 10,
};

// ─── Donut geometry ────────────────────────────────────────────────────────
const DONUT = 200, CX = 100, CY = 100, R = 72, STROKE = 22;

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Arc path between two angles. A sweep of ~360° would collapse to a point in
 * SVG, so it is clamped just short of a full turn.
 */
function describeArc(cx: number, cy: number, r: number, start: number, end: number): string | null {
  const sweep = Math.min(Math.max(end - start, 0), 359.9);
  if (sweep < 0.5) return null;
  const s = polarXY(cx, cy, r, start);
  const e = polarXY(cx, cy, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── One input: slider + typed value + quick picks ─────────────────────────
interface InputRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  accent: string;
  quickSteps: number[];
  formatValue: (v: number) => string;
  formatChip: (v: number) => string;
  onChange: (v: number) => void;
}

function InputRow({
  label, value, min, max, step,
  prefix, suffix, accent, quickSteps,
  formatValue, formatChip, onChange,
}: InputRowProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  const commit = () => {
    setEditing(false);
    const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  return (
    <View style={irStyles.wrap}>
      <View style={irStyles.headerRow}>
        <FieldLabel style={irStyles.noMargin}>{label}</FieldLabel>
        <Text style={[irStyles.range, { color: colors.textTertiary }]}>
          {formatChip(min)} – {formatChip(max)}
        </Text>
      </View>

      <View style={[irStyles.pill, { backgroundColor: accent + '14', borderColor: accent + '40' }]}>
        {prefix ? <Text style={[irStyles.affix, { color: accent }]}>{prefix}</Text> : null}

        {editing ? (
          <TextInput
            style={[irStyles.input, { color: accent }]}
            value={raw}
            onChangeText={(t) => setRaw(t.replace(/[^0-9.]/g, ''))}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable
            onPress={() => { setRaw(String(value)); setEditing(true); }}
            style={irStyles.valueTouch}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${formatValue(value)}. Tap to type a value.`}
          >
            <Text style={[irStyles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatValue(value)}
            </Text>
          </Pressable>
        )}

        {suffix ? <Text style={[irStyles.suffix, { color: accent + 'CC' }]}>{suffix}</Text> : null}
      </View>

      {/* Drag to change — the old build only had a decorative bar */}
      <Slider value={value} min={min} max={max} step={step} accent={accent} onChange={onChange} />

      <View style={irStyles.chips}>
        {quickSteps.map((q) => (
          <Pill key={q} label={formatChip(q)} accent={accent} active={value === q} onPress={() => onChange(q)} />
        ))}
      </View>
    </View>
  );
}

const irStyles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noMargin: { marginBottom: 0 },
  range: { fontSize: 10, fontWeight: '600' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: border.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
    marginTop: spacing.xs,
  },
  affix: { fontSize: 22, fontWeight: typography.weights.bold, marginRight: 2 },
  valueTouch: { flex: 1 },
  value: { fontSize: 28, fontWeight: typography.weights.extrabold, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  input: {
    flex: 1, fontSize: 28, fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5, padding: 0, fontVariant: ['tabular-nums'],
  },
  suffix: { fontSize: 16, fontWeight: typography.weights.bold, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});

// ─── Screen ────────────────────────────────────────────────────────────────
export default function SipCalculatorScreen() {
  const { colors } = useTheme();
  const currency = usePreferencesStore((s) => s.currency) as CurrencyCode;
  const { state, setState, clearState } = useUtilityState<SipState>('sip', DEFAULT_STATE);
  const haptic = useHaptic();

  const money = (n: number) => formatCurrency(n, currency, { decimals: 0 });
  const compact = (n: number) => formatCurrencyCompact(n, currency);

  const { invested, returns, total, yearlyData } = useMemo(() => {
    const r = state.rate / 100;
    const years = Math.max(1, Math.round(state.years));

    /** Future value at the end of year `y`. */
    const valueAt = (y: number) => {
      if (state.mode === 'sip') {
        const n = y * 12;
        const mr = r / 12;
        // Annuity-due: contributions are made at the start of each month
        if (mr === 0) return state.monthlyAmount * n;
        return state.monthlyAmount * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
      }
      return state.lumpsum * Math.pow(1 + r, y);
    };

    const total = valueAt(years);
    const invested = state.mode === 'sip' ? state.monthlyAmount * years * 12 : state.lumpsum;
    const yearlyData = Array.from({ length: years }, (_, i) => valueAt(i + 1));

    return { invested, returns: total - invested, total, yearlyData };
  }, [state]);

  const investedPct = total > 0 ? Math.min(100, (invested / total) * 100) : 100;
  const investedEnd = (investedPct / 100) * 360;

  const investedArc = describeArc(CX, CY, R, 0, Math.max(0, investedEnd - 2));
  const returnsArc  = describeArc(CX, CY, R, investedEnd + 2, 360);

  const maxVal = Math.max(...yearlyData, 1);
  const years = Math.max(1, Math.round(state.years));
  const labelEvery = Math.max(1, Math.ceil(years / 6));

  // Effective annualised growth on the money actually invested
  const cagr = invested > 0 && total > 0
    ? (Math.pow(total / invested, 1 / years) - 1) * 100
    : 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="SIP / Lumpsum"
        utilityId="sip"
        accentColor={ACCENT}
        subtitle={`${state.rate}% for ${years} year${years === 1 ? '' : 's'}`}
        onClearData={clearState}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Mode */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Segmented
            options={[
              { value: 'sip', label: 'SIP (monthly)' },
              { value: 'lumpsum', label: 'Lumpsum' },
            ]}
            value={state.mode}
            onChange={(m: Mode) => { haptic('light'); setState((p) => ({ ...p, mode: m })); }}
            accent={ACCENT}
          />
        </Animated.View>

        {/* Inputs */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <Card style={styles.inputCard}>
            {state.mode === 'sip' ? (
              <InputRow
                label="Monthly investment"
                value={state.monthlyAmount}
                min={500} max={200000} step={500}
                prefix={currencySymbol(currency)}
                accent={ACCENT}
                quickSteps={[1000, 5000, 10000, 25000, 50000]}
                formatValue={(v) => formatCurrency(v, currency, { decimals: 0, symbol: false })}
                formatChip={compact}
                onChange={(v) => setState((p) => ({ ...p, monthlyAmount: v }))}
              />
            ) : (
              <InputRow
                label="Lumpsum amount"
                value={state.lumpsum}
                min={10000} max={10000000} step={10000}
                prefix={currencySymbol(currency)}
                accent={ACCENT}
                quickSteps={[100000, 500000, 1000000, 5000000]}
                formatValue={(v) => formatCurrency(v, currency, { decimals: 0, symbol: false })}
                formatChip={compact}
                onChange={(v) => setState((p) => ({ ...p, lumpsum: v }))}
              />
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <InputRow
              label="Expected annual return"
              value={state.rate}
              min={1} max={30} step={0.5}
              suffix="%"
              accent={ACCENT2}
              quickSteps={[8, 10, 12, 15, 18]}
              formatValue={(v) => String(v)}
              formatChip={(v) => `${v}%`}
              onChange={(v) => setState((p) => ({ ...p, rate: v }))}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <InputRow
              label="Time period"
              value={state.years}
              min={1} max={40} step={1}
              suffix="yr"
              accent={ACCENT3}
              quickSteps={[3, 5, 10, 20, 30]}
              formatValue={(v) => String(v)}
              formatChip={(v) => `${v}y`}
              onChange={(v) => setState((p) => ({ ...p, years: v }))}
            />
          </Card>
        </Animated.View>

        {/* Donut + legend */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <Card>
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <Svg width={DONUT} height={DONUT}>
                  <Circle cx={CX} cy={CY} r={R} fill="none" stroke={colors.muted} strokeWidth={STROKE} />
                  {returnsArc && (
                    <Path d={returnsArc} fill="none" stroke={ACCENT2} strokeWidth={STROKE} strokeLinecap="round" />
                  )}
                  {investedArc && (
                    <Path d={investedArc} fill="none" stroke={ACCENT} strokeWidth={STROKE} strokeLinecap="round" />
                  )}
                </Svg>
                <View style={styles.donutCenter} pointerEvents="none">
                  <Text
                    style={[styles.donutTotal, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {compact(total)}
                  </Text>
                  <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Total value</Text>
                </View>
              </View>

              <View style={styles.legendCol}>
                <Legend color={ACCENT} label="Invested" value={compact(invested)} colors={colors} />
                <Legend color={ACCENT2} label="Returns" value={compact(returns)} colors={colors} valueColor={ACCENT2} />
                <View style={[styles.roiChip, { backgroundColor: ACCENT + '1F' }]}>
                  <Text style={[styles.roiTxt, { color: ACCENT }]}>
                    {invested > 0 ? `+${((returns / invested) * 100).toFixed(0)}% gain` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Growth chart */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <Card>
            <FieldLabel>Year-wise growth</FieldLabel>
            <View style={styles.barChart}>
              {yearlyData.map((v, i) => (
                <View key={i} style={styles.barWrap}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${Math.max(3, (v / maxVal) * 100)}%`,
                        backgroundColor: ACCENT,
                        opacity: 0.45 + (i / years) * 0.55,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
            <View style={styles.barLabels}>
              {yearlyData.map((_, i) => (
                <View key={i} style={styles.barWrap}>
                  {(i === 0 || (i + 1) % labelEvery === 0) && (
                    <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{i + 1}</Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={[styles.chartNote, { color: colors.textTertiary }]}>
              Year 1 {compact(yearlyData[0])} → Year {years} {compact(yearlyData[years - 1])}
            </Text>
          </Card>
        </Animated.View>

        {/* Summary */}
        <Animated.View entering={FadeInDown.delay(200).duration(280)}>
          <View style={styles.summaryRow}>
            <SummaryChip label="Total invested" value={compact(invested)} colors={colors} />
            <SummaryChip label="Wealth gained" value={compact(returns)} colors={colors} />
            <SummaryChip
              label={state.mode === 'sip' ? 'Effective CAGR' : 'CAGR'}
              value={`${cagr.toFixed(1)}%`}
              colors={colors}
            />
          </View>
        </Animated.View>

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
          Projections assume a constant {state.rate}% annual return and ignore fees, taxes and inflation.
          Real returns vary.
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({
  color, label, value, colors, valueColor,
}: { color: string; label: string; value: string; colors: any; valueColor?: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendText}>
        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.legendValue, { color: valueColor ?? colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SummaryChip({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.summaryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.summaryChipLabel, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
      <Text
        style={[styles.summaryChipValue, { color: colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },
  inputCard: { gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center', maxWidth: R * 1.6 },
  donutTotal: { fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  donutLabel: { fontSize: typography.sizes.xs },

  legendCol: { flex: 1, gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1 },
  legendLabel: { fontSize: typography.sizes.xs },
  legendValue: { fontSize: typography.sizes.base, fontWeight: '800', marginTop: 1 },
  roiChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  roiTxt: { fontSize: typography.sizes.sm, fontWeight: '800' },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 2 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabels: { flexDirection: 'row', gap: 2 },
  barLabel: { fontSize: 8, fontVariant: ['tabular-nums'] },
  chartNote: { fontSize: typography.sizes.xs },

  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryChip: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: border.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  summaryChipLabel: { fontSize: 10 },
  summaryChipValue: { fontSize: typography.sizes.sm, fontWeight: '800' },

  disclaimer: { fontSize: typography.sizes.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
