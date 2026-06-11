import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, Pressable, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { SipState } from '@/types';

const ACCENT   = '#10B981';
const ACCENT2  = '#6366F1';

type Mode = 'sip' | 'lumpsum';

const DEFAULT_STATE: SipState = {
  mode: 'sip',
  monthlyAmount: 5000,
  lumpsum: 100000,
  rate: 12,
  years: 10,
};

// Donut math
function describeArc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarXY(cx, cy, r, start), e = polarXY(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}
function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

interface InputRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;           // '₹' | '%' | ' yr'
  suffix?: string;        // displayed after input e.g. '%', 'yr'
  prefix?: string;        // displayed before input e.g. '₹'
  colors: any;
  accent: string;
  quickSteps: number[];   // e.g. [500, 1000, 2000, 5000]
  onChange: (v: number) => void;
}

function InputRow({
  label, value, min, max, step,
  unit, prefix, suffix,
  colors, accent, quickSteps, onChange,
}: InputRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [raw, setRaw]         = React.useState('');
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const displayValue =
    unit === '₹'
      ? value.toLocaleString('en-IN')
      : `${value}`;

  const handleFocus = () => {
    setRaw(String(value));
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const n = parseInt(raw.replace(/,/g, ''), 10);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
  };

  const handleChangeText = (t: string) => {
    // allow only digits
    setRaw(t.replace(/[^0-9]/g, ''));
  };

  const nudge = (delta: number) => {
    Haptics.selectionAsync();
    onChange(Math.min(max, Math.max(min, value + delta)));
  };

  return (
    <View style={irStyles.wrap}>
      {/* Label row */}
      <Text style={[irStyles.label, { color: colors.textSecondary }]}>{label}</Text>

      {/* Main input pill */}
      <View style={[irStyles.pill, { backgroundColor: accent + '14', borderColor: accent + '40' }]}>
        {prefix ? (
          <Text style={[irStyles.pillPrefix, { color: accent }]}>{prefix}</Text>
        ) : null}

        {editing ? (
          <TextInput
            style={[irStyles.pillInput, { color: accent }]}
            value={raw}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <TouchableOpacity onPress={handleFocus} activeOpacity={0.7} style={irStyles.pillTouchable}>
            <Text style={[irStyles.pillValue, { color: accent }]}>{displayValue}</Text>
          </TouchableOpacity>
        )}

        {suffix ? (
          <Text style={[irStyles.pillSuffix, { color: accent + 'CC' }]}>{suffix}</Text>
        ) : null}

        {/* Nudge ±1 */}
        <View style={[irStyles.nudgeWrap, { borderLeftColor: accent + '30' }]}>
          <Pressable onPress={() => nudge(step)} style={irStyles.nudgeBtn}>
            <Text style={[irStyles.nudgeTxt, { color: accent }]}>＋</Text>
          </Pressable>
          <View style={[irStyles.nudgeDivider, { backgroundColor: accent + '30' }]} />
          <Pressable onPress={() => nudge(-step)} style={irStyles.nudgeBtn}>
            <Text style={[irStyles.nudgeTxt, { color: accent }]}>－</Text>
          </Pressable>
        </View>
      </View>

      {/* Progress track */}
      <View style={[irStyles.track, { backgroundColor: colors.card }]}>
        <View style={[irStyles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
      </View>

      {/* Quick-select chips */}
      <View style={irStyles.chips}>
        {quickSteps.map((q) => {
          const active = value === q;
          return (
            <Pressable
              key={q}
              onPress={() => { Haptics.selectionAsync(); onChange(q); }}
              style={[
                irStyles.chip,
                { backgroundColor: active ? accent : colors.card, borderColor: active ? accent : colors.border },
              ]}
            >
              <Text style={[irStyles.chipTxt, { color: active ? '#fff' : colors.textSecondary }]}>
                {unit === '₹'
                  ? q >= 100000 ? `₹${q / 100000}L` : `₹${(q / 1000).toFixed(0)}k`
                  : `${q}${suffix ?? ''}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const irStyles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, letterSpacing: 0.8, textTransform: 'uppercase' },

  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.xl, borderWidth: 1.5,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: 4,
  },
  pillPrefix: { fontSize: 22, fontWeight: typography.weights.bold, marginRight: 2 },
  pillTouchable: { flex: 1 },
  pillValue: {
    fontSize: 28, fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  pillInput: {
    flex: 1, fontSize: 28, fontWeight: typography.weights.extrabold,
    letterSpacing: -0.5, padding: 0, fontVariant: ['tabular-nums'],
  },
  pillSuffix: { fontSize: 16, fontWeight: typography.weights.bold, marginLeft: 2 },

  nudgeWrap: {
    borderLeftWidth: 1, paddingLeft: spacing.sm,
    gap: 0, alignItems: 'center',
  },
  nudgeBtn: { paddingHorizontal: 6, paddingVertical: 3 },
  nudgeTxt: { fontSize: 18, fontWeight: typography.weights.bold, lineHeight: 22 },
  nudgeDivider: { width: 20, height: 1 },

  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.xl, borderWidth: 1,
  },
  chipTxt: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
});

export default function SipCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<SipState>('sip', DEFAULT_STATE);

  const { invested, returns, total, yearlyData } = useMemo(() => {
    const r = state.rate / 100;

    let invested = 0, total = 0;
    if (state.mode === 'sip') {
      const n = state.years * 12;
      const monthly = state.monthlyAmount;
      const mr = r / 12;
      total = monthly * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
      invested = monthly * n;
    } else {
      invested = state.lumpsum;
      total = state.lumpsum * Math.pow(1 + r, state.years);
    }
    const returns = total - invested;

    // Year by year data for chart
    const yearlyData = Array.from({ length: state.years }, (_, i) => {
      const y = i + 1;
      let v = 0;
      if (state.mode === 'sip') {
        const n = y * 12, mr = r / 12;
        v = state.monthlyAmount * ((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr);
      } else {
        v = state.lumpsum * Math.pow(1 + r, y);
      }
      return v;
    });

    return { invested, returns, total, yearlyData };
  }, [state]);

  const investedPct = total > 0 ? (invested / total) * 100 : 50;
  const DONUT_SIZE = 200, CX = 100, CY = 100, R = 72, SW = 24;
  const investedEnd = (investedPct / 100) * 358;
  const fmtINR = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  };

  // Bar chart max
  const maxVal = Math.max(...yearlyData, 1);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader title="SIP / Lumpsum" utilityId="sip" accentColor={ACCENT} onClearData={clearState} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Mode Toggle */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {(['sip', 'lumpsum'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setState((p) => ({ ...p, mode: m })); }}
                style={[styles.modeTab, state.mode === m && { backgroundColor: ACCENT }]}
              >
                <Text style={[styles.modeTxt, { color: state.mode === m ? '#fff' : colors.textSecondary }]}>
                  {m === 'sip' ? 'SIP (Monthly)' : 'Lumpsum'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Inputs */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {state.mode === 'sip' ? (
              <InputRow
                label="Monthly Investment" value={state.monthlyAmount}
                min={500} max={100000} step={500} unit="₹"
                prefix="₹" quickSteps={[1000, 3000, 5000, 10000, 25000, 50000]}
                colors={colors} accent={ACCENT}
                onChange={(v) => setState((p) => ({ ...p, monthlyAmount: v }))}
              />
            ) : (
              <InputRow
                label="Lumpsum Amount" value={state.lumpsum}
                min={10000} max={10000000} step={10000} unit="₹"
                prefix="₹" quickSteps={[50000, 100000, 500000, 1000000, 5000000]}
                colors={colors} accent={ACCENT}
                onChange={(v) => setState((p) => ({ ...p, lumpsum: v }))}
              />
            )}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InputRow
              label="Expected Annual Return" value={state.rate}
              min={1} max={30} step={1} unit="%"
              suffix="%" quickSteps={[8, 10, 12, 15, 18, 24]}
              colors={colors} accent={ACCENT2}
              onChange={(v) => setState((p) => ({ ...p, rate: v }))}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InputRow
              label="Time Period" value={state.years}
              min={1} max={40} step={1} unit=" yr"
              suffix=" yr" quickSteps={[3, 5, 10, 15, 20, 30]}
              colors={colors} accent="#F97316"
              onChange={(v) => setState((p) => ({ ...p, years: v }))}
            />
          </View>
        </Animated.View>

        {/* Donut + Results */}
        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
                  {/* Background */}
                  <Circle cx={CX} cy={CY} r={R} fill="none" stroke={colors.card} strokeWidth={SW} />
                  {/* Returns arc */}
                  <Path
                    d={describeArc(CX, CY, R, investedEnd + 1, 359)}
                    fill="none" stroke={ACCENT2} strokeWidth={SW} strokeLinecap="round"
                  />
                  {/* Invested arc */}
                  <Path
                    d={describeArc(CX, CY, R, 0, investedEnd)}
                    fill="none" stroke={ACCENT} strokeWidth={SW} strokeLinecap="round"
                  />
                </Svg>
                <View style={styles.donutCenter} pointerEvents="none">
                  <Text style={[styles.donutTotal, { color: colors.text }]}>{fmtINR(total)}</Text>
                  <Text style={[styles.donutLabel, { color: colors.textSecondary }]}>Total Value</Text>
                </View>
              </View>

              <View style={styles.legendCol}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
                  <View>
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Invested</Text>
                    <Text style={[styles.legendValue, { color: colors.text }]}>{fmtINR(invested)}</Text>
                  </View>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: ACCENT2 }]} />
                  <View>
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Returns</Text>
                    <Text style={[styles.legendValue, { color: ACCENT2 }]}>{fmtINR(returns)}</Text>
                  </View>
                </View>
                <View style={[styles.roiChip, { backgroundColor: ACCENT + '20' }]}>
                  <Text style={[styles.roiTxt, { color: ACCENT }]}>
                    {invested > 0 ? `${((returns / invested) * 100).toFixed(0)}% gain` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Year by year bar chart */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Year-wise Growth</Text>
            <View style={styles.barChart}>
              {yearlyData.map((v, i) => {
                const h = Math.max(4, (v / maxVal) * 100);
                return (
                  <View key={i} style={styles.barWrap}>
                    <View style={[styles.bar, { height: h, backgroundColor: ACCENT, opacity: 0.6 + (i / state.years) * 0.4 }]} />
                    {(i === 0 || (i + 1) % Math.ceil(state.years / 5) === 0) && (
                      <Text style={[styles.barLabel, { color: colors.textTertiary }]}>{i + 1}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.chartFooter}>
              <Text style={[styles.chartNote, { color: colors.textTertiary }]}>
                Year 1: {fmtINR(yearlyData[0])}  →  Year {state.years}: {fmtINR(yearlyData[state.years - 1])}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Summary chips */}
        <Animated.View entering={FadeInDown.delay(200).duration(280)}>
          <View style={styles.summaryRow}>
            {[
              { label: 'Duration', value: `${state.years} yrs` },
              { label: 'Rate', value: `${state.rate}%` },
              { label: 'CAGR approx', value: `${(((Math.pow(total / Math.max(invested, 1), 1 / state.years)) - 1) * 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <View key={label} style={[styles.summaryChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.summaryChipLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.summaryChipValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },
  modeToggle: { flexDirection: 'row', borderRadius: radius.xl, borderWidth: 1, padding: 3 },
  modeTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.lg, alignItems: 'center' },
  modeTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  inputCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.lg },
  divider: { height: 1 },
  resultCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontSize: 20, fontWeight: typography.weights.extrabold, letterSpacing: -0.5 },
  donutLabel: { fontSize: typography.sizes.xs },
  legendCol: { flex: 1, gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: typography.sizes.xs },
  legendValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, marginTop: 1 },
  roiChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.xl, alignSelf: 'flex-start' },
  roiTxt: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  chartCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  chartTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  bar: { width: '100%', borderRadius: 2 },
  barLabel: { fontSize: 8, fontVariant: ['tabular-nums'] },
  chartFooter: {},
  chartNote: { fontSize: typography.sizes.xs },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryChip: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, alignItems: 'center', gap: 3 },
  summaryChipLabel: { fontSize: typography.sizes.xs },
  summaryChipValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
});