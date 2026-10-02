import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { Card, FieldLabel, Segmented, NumericField, Notice, Pill, useHaptic, toast } from '@/components/ui';
import { formatCurrency, currencySymbol, parseAmount } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';
import type { GSTState } from '@/types';

const ACCENT = '#B4441C';
const GST_RATES = [0, 5, 12, 18, 28];

const DEFAULT_STATE: GSTState = {
  amount: '',
  gstRate: '18',
  calculationType: 'exclusive',
  cgst: '',
  sgst: '',
  igst: '',
  totalAmount: '',
};

interface GSTResult {
  base: number;
  totalGst: number;
  half: number;
  total: number;
}

/**
 * Exclusive: the amount is the pre-tax base, GST is added on top.
 * Inclusive: the amount already contains GST, so the base is backed out of it.
 */
function calculateGST(amount: number, rate: number, type: 'exclusive' | 'inclusive'): GSTResult | null {
  if (!(amount > 0) || isNaN(rate) || rate < 0) return null;

  const base = type === 'exclusive' ? amount : (amount * 100) / (100 + rate);
  const totalGst = (base * rate) / 100;
  const total = type === 'exclusive' ? base + totalGst : amount;

  if (!isFinite(base) || !isFinite(totalGst)) return null;
  return { base, totalGst, half: totalGst / 2, total };
}

export default function GSTCalculatorScreen() {
  const { colors } = useTheme();
  const currency = usePreferencesStore((s) => s.currency);
  const { state, setState, clearState } = useUtilityState<GSTState>('gst', DEFAULT_STATE);
  const haptic = useHaptic();

  // Tracked separately so typing "1" then "2" doesn't jump the field to the
  // 12% preset chip and wipe what the user was mid-way through typing.
  const [customMode, setCustomMode] = useState(false);

  const amount = parseAmount(state.amount);
  const rate = parseAmount(state.gstRate);

  const result = useMemo(
    () => calculateGST(amount, rate, state.calculationType),
    [amount, rate, state.calculationType],
  );

  const fmt = (n: number) => formatCurrency(n, currency);

  const validation = useMemo(() => {
    if (!state.amount) return null;
    if (!(amount > 0)) return 'Enter an amount greater than zero.';
    if (isNaN(rate)) return 'Enter a GST rate.';
    if (rate > 100) return 'A GST rate above 100% is not valid.';
    return null;
  }, [state.amount, amount, rate]);

  const copySummary = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(
      [
        `Base: ${fmt(result.base)}`,
        `CGST (${rate / 2}%): ${fmt(result.half)}`,
        `SGST (${rate / 2}%): ${fmt(result.half)}`,
        `IGST (${rate}%): ${fmt(result.totalGst)}`,
        `Total: ${fmt(result.total)}`,
      ].join('\n'),
    );
    haptic('success');
    toast('Breakdown copied');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="GST Calculator"
        utilityId="gst"
        accentColor={ACCENT}
        subtitle={result ? `${rate}% · ${state.calculationType}` : undefined}
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card>
            <View>
              <FieldLabel>Amount</FieldLabel>
              <NumericField
                value={state.amount}
                onChangeText={(v) => setState((p) => ({ ...p, amount: v }))}
                placeholder="0"
                prefix={currencySymbol(currency)}
                accent={ACCENT}
                size="lg"
              />
            </View>

            <View>
              <FieldLabel>GST rate</FieldLabel>
              <View style={styles.rateRow}>
                {GST_RATES.map((r) => (
                  <Pill
                    key={r}
                    label={`${r}%`}
                    accent={ACCENT}
                    active={!customMode && rate === r}
                    onPress={() => {
                      setCustomMode(false);
                      setState((p) => ({ ...p, gstRate: String(r) }));
                    }}
                  />
                ))}
                <Pill
                  label="Custom"
                  accent={ACCENT}
                  active={customMode}
                  onPress={() => setCustomMode(true)}
                />
              </View>
              {customMode && (
                <NumericField
                  value={state.gstRate}
                  onChangeText={(v) => setState((p) => ({ ...p, gstRate: v }))}
                  placeholder="Rate"
                  suffix="%"
                  accent={ACCENT}
                  autoFocus
                  style={styles.customRate}
                />
              )}
            </View>

            <View>
              <FieldLabel>The amount above is…</FieldLabel>
              <Segmented
                options={[
                  { value: 'exclusive', label: 'Before GST' },
                  { value: 'inclusive', label: 'GST included' },
                ]}
                value={state.calculationType}
                onChange={(v) => setState((p) => ({ ...p, calculationType: v }))}
                accent={ACCENT}
              />
            </View>

            {validation && <Notice text={validation} tone="warn" />}
          </Card>
        </Animated.View>

        {result && (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.results}>
            <Card tone="accent" accent="#4C6B3C" style={styles.totalCard}>
              <Text style={[styles.totalLabel, { color: '#4C6B3C' }]}>TOTAL AMOUNT</Text>
              <Text
                style={[styles.totalValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {fmt(result.total)}
              </Text>
              <Text style={[styles.totalSub, { color: colors.textSecondary }]}>
                {fmt(result.base)} base + {fmt(result.totalGst)} GST
              </Text>
            </Card>

            <View style={styles.splitRow}>
              <ResultCard
                label={`CGST ${rate / 2}%`}
                value={fmt(result.half)}
                color={ACCENT}
                colors={colors}
              />
              <ResultCard
                label={`SGST ${rate / 2}%`}
                value={fmt(result.half)}
                color={ACCENT}
                colors={colors}
              />
            </View>

            <ResultCard
              label={`IGST ${rate}%`}
              value={fmt(result.totalGst)}
              color="#7A3246"
              colors={colors}
              subtitle="Applies instead of CGST + SGST on inter-state supply"
            />

            <Pressable
              onPress={copySummary}
              style={[styles.copyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.copyTxt, { color: colors.textSecondary }]}>Copy breakdown</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({
  label, value, color, colors, subtitle,
}: {
  label: string; value: string; color: string; colors: any; subtitle?: string;
}) {
  return (
    <View
      style={[
        styles.resultCard,
        { backgroundColor: color + '12', borderColor: color + '30' },
      ]}
    >
      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.resultValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {subtitle && <Text style={[styles.resultSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },

  rateRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  customRate: { marginTop: spacing.sm },

  results: { gap: spacing.sm },
  totalCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  totalValue: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  totalSub: { fontSize: typography.sizes.sm },

  splitRow: { flexDirection: 'row', gap: spacing.sm },
  resultCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: border.base,
    padding: spacing.base,
    gap: 4,
  },
  resultLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  resultValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  resultSubtitle: { fontSize: typography.sizes.xs, lineHeight: 15 },

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: border.base,
  },
  copyTxt: { fontSize: typography.sizes.sm, fontWeight: '700' },
});
