import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { Card, FieldLabel, NumericField, Notice, Pill, StatTile } from '@/components/ui';
import { formatCurrency, currencySymbol, parseAmount } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';

const ACCENT = '#4C6B3C';
const QUICK_DISCOUNTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

interface DiscountState {
  originalPrice: string;
  discountPercent: string;
  /** Second (extra) discount applied on the already-discounted price. */
  extraPercent: string;
  /** Independent input for the reverse calculator. */
  reversePrice: string;
}

const DEFAULT_STATE: DiscountState = {
  originalPrice: '',
  discountPercent: '',
  extraPercent: '',
  reversePrice: '',
};

export default function DiscountCalculatorScreen() {
  const { colors } = useTheme();
  const currency = usePreferencesStore((s) => s.currency);
  const { state, setState, clearState } = useUtilityState<DiscountState>(
    'discountCalculator',
    DEFAULT_STATE,
  );

  const price = parseAmount(state.originalPrice);
  const discount = parseAmount(state.discountPercent);
  const extra = parseAmount(state.extraPercent);

  const fmt = (n: number) => formatCurrency(n, currency, { trimWholeNumbers: true });

  const calculation = useMemo(() => {
    if (!(price > 0) || isNaN(discount) || discount < 0 || discount > 100) return null;

    const afterFirst = price * (1 - discount / 100);
    const hasExtra = !isNaN(extra) && extra > 0 && extra <= 100;
    const finalPrice = hasExtra ? afterFirst * (1 - extra / 100) : afterFirst;

    const saving = price - finalPrice;
    // Two stacked discounts are NOT additive — 20% then 10% is 28%, not 30%
    const effectiveRate = (saving / price) * 100;

    return { afterFirst, finalPrice, saving, effectiveRate, hasExtra };
  }, [price, discount, extra]);

  const validation = useMemo(() => {
    if (!state.originalPrice && !state.discountPercent) return null;
    if (!(price > 0)) return 'Enter a price greater than zero.';
    if (isNaN(discount)) return 'Enter a discount percentage.';
    if (discount < 0 || discount > 100) return 'Discount must be between 0% and 100%.';
    if (!isNaN(extra) && (extra < 0 || extra > 100)) return 'The extra discount must be between 0% and 100%.';
    return null;
  }, [state.originalPrice, state.discountPercent, price, discount, extra]);

  // Reverse: recover the pre-discount price from the price on the tag
  type Reverse = { kind: 'value'; value: number } | { kind: 'error'; message: string };
  const reverse = useMemo<Reverse | null>(() => {
    const discounted = parseAmount(state.reversePrice);
    if (!(discounted > 0) || isNaN(discount)) return null;
    if (discount >= 100) {
      return { kind: 'error', message: 'A 100% discount has no original price to recover.' };
    }
    if (discount <= 0) return null;
    return { kind: 'value', value: (discounted * 100) / (100 - discount) };
  }, [state.reversePrice, discount]);

  const payPct = calculation ? Math.max(0, 100 - calculation.effectiveRate) : 100;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Discount"
        utilityId="discountCalculator"
        accentColor={ACCENT}
        subtitle={calculation ? `Effective ${calculation.effectiveRate.toFixed(1)}% off` : undefined}
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card>
            <View>
              <FieldLabel>Original price</FieldLabel>
              <NumericField
                value={state.originalPrice}
                onChangeText={(v) => setState((p) => ({ ...p, originalPrice: v }))}
                placeholder="0"
                prefix={currencySymbol(currency)}
                accent={ACCENT}
                size="lg"
              />
            </View>

            <View>
              <FieldLabel>Discount</FieldLabel>
              <NumericField
                value={state.discountPercent}
                onChangeText={(v) => setState((p) => ({ ...p, discountPercent: v }))}
                placeholder="0"
                suffix="%"
                accent={ACCENT}
              />
              <View style={styles.quickRow}>
                {QUICK_DISCOUNTS.map((pct) => (
                  <Pill
                    key={pct}
                    label={`${pct}%`}
                    accent={ACCENT}
                    active={discount === pct}
                    onPress={() => setState((p) => ({ ...p, discountPercent: String(pct) }))}
                  />
                ))}
              </View>
            </View>

            <View>
              <FieldLabel>Extra discount at checkout (optional)</FieldLabel>
              <NumericField
                value={state.extraPercent}
                onChangeText={(v) => setState((p) => ({ ...p, extraPercent: v }))}
                placeholder="0"
                suffix="%"
                accent={ACCENT}
              />
            </View>

            {validation && <Notice text={validation} tone="warn" />}
          </Card>
        </Animated.View>

        {calculation && (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.results}>
            <Card tone="accent" accent={ACCENT} style={styles.heroCard}>
              <Text style={[styles.heroLabel, { color: ACCENT }]}>YOU PAY</Text>
              <Text
                style={[styles.heroPrice, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {fmt(calculation.finalPrice)}
              </Text>
              <Text style={[styles.heroStrike, { color: colors.textTertiary }]}>
                {fmt(price)}
              </Text>
            </Card>

            <View style={styles.tiles}>
              <StatTile label="You save" value={fmt(calculation.saving)} color="#A6392B" />
              <StatTile
                label="Effective off"
                value={`${calculation.effectiveRate.toFixed(1)}%`}
                color={ACCENT}
              />
            </View>

            {calculation.hasExtra && (
              <Notice
                tone="info"
                text={`Stacked discounts compound: ${discount}% then ${extra}% is ${calculation.effectiveRate.toFixed(1)}% off, not ${(discount + extra).toFixed(0)}%.`}
              />
            )}

            <Card>
              <View style={[styles.savingsBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.savingsFill, { backgroundColor: ACCENT, width: `${payPct}%` }]} />
                <View style={[styles.savingsFill, { backgroundColor: '#A6392B', flex: 1 }]} />
              </View>
              <View style={styles.barLegend}>
                <Text style={[styles.legendTxt, { color: ACCENT }]}>Pay {payPct.toFixed(1)}%</Text>
                <Text style={[styles.legendTxt, { color: '#A6392B' }]}>
                  Save {calculation.effectiveRate.toFixed(1)}%
                </Text>
              </View>
              {calculation.hasExtra && (
                <View style={styles.stepRow}>
                  <Text style={[styles.stepLabel, { color: colors.textSecondary }]}>
                    After {discount}% off
                  </Text>
                  <Text style={[styles.stepValue, { color: colors.text }]}>{fmt(calculation.afterFirst)}</Text>
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {/* Reverse calculator */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <Card>
            <View>
              <Text style={[styles.reverseTitle, { color: colors.text }]}>Reverse calculator</Text>
              <Text style={[styles.reverseSubtitle, { color: colors.textSecondary }]}>
                Know the sale price? Find what it was before the {isNaN(discount) ? '—' : `${discount}%`} discount.
              </Text>
            </View>
            <NumericField
              value={state.reversePrice}
              onChangeText={(v) => setState((p) => ({ ...p, reversePrice: v }))}
              placeholder="Sale price"
              prefix={currencySymbol(currency)}
              accent="#3C5A7D"
            />
            {reverse?.kind === 'error' && <Notice text={reverse.message} tone="warn" />}
            {reverse?.kind === 'value' && (
              <View style={[styles.reverseResult, { backgroundColor: '#3C5A7D12', borderColor: '#3C5A7D30' }]}>
                <Text style={[styles.reverseResultLabel, { color: colors.textSecondary }]}>
                  Original price
                </Text>
                <Text style={[styles.reverseResultValue, { color: '#3C5A7D' }]}>
                  {fmt(reverse.value)}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },

  results: { gap: spacing.sm },
  heroCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  heroLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  heroPrice: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  heroStrike: { fontSize: typography.sizes.base, textDecorationLine: 'line-through' },

  tiles: { flexDirection: 'row', gap: spacing.sm },

  savingsBar: { height: 10, borderRadius: radius.sm, flexDirection: 'row', overflow: 'hidden' },
  savingsFill: { height: '100%' },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendTxt: { fontSize: 12, fontWeight: '700' },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepLabel: { fontSize: typography.sizes.sm },
  stepValue: { fontSize: typography.sizes.sm, fontWeight: '700' },

  reverseTitle: { fontSize: typography.sizes.md, fontWeight: '700' },
  reverseSubtitle: { fontSize: typography.sizes.sm, marginTop: 2, lineHeight: 18 },
  reverseResult: {
    borderRadius: radius.lg,
    borderWidth: border.base,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reverseResultLabel: { fontSize: typography.sizes.sm },
  reverseResultValue: { fontSize: 22, fontWeight: '800' },
});
