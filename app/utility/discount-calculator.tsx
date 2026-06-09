import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { DiscountCalculatorState } from '@/types';

const DEFAULT_STATE: DiscountCalculatorState = {
  originalPrice: '',
  discountPercent: '',
  result: '',
};

const QUICK_DISCOUNTS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

export default function DiscountCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<DiscountCalculatorState>(
    'discountCalculator',
    DEFAULT_STATE
  );

  const calculation = useMemo(() => {
    const price = parseFloat(state.originalPrice);
    const discount = parseFloat(state.discountPercent);
    if (isNaN(price) || isNaN(discount) || price <= 0) return null;
    const saving = (price * discount) / 100;
    const finalPrice = price - saving;
    return { saving, finalPrice, effectiveRate: discount };
  }, [state.originalPrice, state.discountPercent]);

  const handleQuickDiscount = (pct: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({ ...p, discountPercent: pct.toString() }));
  };

  // Reverse: find original price from discounted price
  const reverseCalc = useMemo(() => {
    const discounted = parseFloat(state.result);
    const discount = parseFloat(state.discountPercent);
    if (isNaN(discounted) || isNaN(discount)) return null;
    const original = (discounted * 100) / (100 - discount);
    return original;
  }, [state.result, state.discountPercent]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Discount Calculator"
        utilityId="discountCalculator"
        accentColor="#10B981"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Input */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Original Price (₹)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={state.originalPrice}
              onChangeText={(v) => setState((p) => ({ ...p, originalPrice: v }))}
              placeholder="e.g. 1999"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Discount (%)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={state.discountPercent}
              onChangeText={(v) => setState((p) => ({ ...p, discountPercent: v }))}
              placeholder="e.g. 20"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Quick discount buttons */}
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quick Select</Text>
            <View style={styles.quickRow}>
              {QUICK_DISCOUNTS.map((pct) => (
                <Pressable
                  key={pct}
                  onPress={() => handleQuickDiscount(pct)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor:
                        state.discountPercent === pct.toString() ? '#10B981' : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      {
                        color:
                          state.discountPercent === pct.toString() ? '#fff' : colors.textSecondary,
                      },
                    ]}
                  >
                    {pct}%
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Result */}
        {calculation && (
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={{ gap: spacing.sm }}>
            {/* Final Price Hero */}
            <View style={[styles.heroPriceCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
              <Text style={[styles.heroPriceLabel, { color: '#10B981' }]}>YOU PAY</Text>
              <Text style={[styles.heroPrice, { color: colors.text }]}>
                ₹{calculation.finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Breakdown row */}
            <View style={styles.breakRow}>
              <View style={[styles.breakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.breakLabel, { color: colors.textSecondary }]}>Original</Text>
                <Text style={[styles.breakValue, { color: colors.text }]}>
                  ₹{parseFloat(state.originalPrice).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.breakCard, { backgroundColor: '#F43F5E12', borderColor: '#F43F5E30' }]}>
                <Text style={[styles.breakLabel, { color: colors.textSecondary }]}>You Save</Text>
                <Text style={[styles.breakValue, { color: '#F43F5E' }]}>
                  ₹{calculation.saving.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Savings bar */}
            <View style={[styles.savingsBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.savingsFill,
                  {
                    backgroundColor: '#10B981',
                    width: `${100 - calculation.effectiveRate}%`,
                  },
                ]}
              />
              <View style={[styles.savingsFill, { backgroundColor: '#F43F5E', flex: 1 }]} />
            </View>
            <View style={styles.barLegend}>
              <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '600' }}>
                Pay {(100 - calculation.effectiveRate).toFixed(1)}%
              </Text>
              <Text style={{ color: '#F43F5E', fontSize: 12, fontWeight: '600' }}>
                Save {calculation.effectiveRate}%
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Reverse Calculator */}
        <Animated.View
          entering={FadeInDown.delay(120).duration(300)}
          style={[styles.reverseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.reverseTitle, { color: colors.text }]}>
            Reverse Calculator
          </Text>
          <Text style={[styles.reverseSubtitle, { color: colors.textSecondary }]}>
            Find original price from discounted price
          </Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, marginTop: spacing.sm }]}
            value={state.result}
            onChangeText={(v) => setState((p) => ({ ...p, result: v }))}
            placeholder="Discounted price (₹)"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          {reverseCalc && (
            <View style={[styles.reverseResult, { backgroundColor: '#6366F112', borderColor: '#6366F130' }]}>
              <Text style={[styles.reverseResultLabel, { color: colors.textSecondary }]}>Original Price</Text>
              <Text style={[styles.reverseResultValue, { color: '#6366F1' }]}>
                ₹{reverseCalc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.base },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    fontWeight: '600',
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  quickChipText: { fontSize: 13, fontWeight: '700' },
  heroPriceCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroPriceLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  heroPrice: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  breakRow: { flexDirection: 'row', gap: spacing.sm },
  breakCard: {
    flex: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: 4,
  },
  breakLabel: { fontSize: 12 },
  breakValue: { fontSize: 20, fontWeight: '800' },
  savingsBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  savingsFill: { height: '100%' },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  reverseCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.xs },
  reverseTitle: { fontSize: 16, fontWeight: '700' },
  reverseSubtitle: { fontSize: 13 },
  reverseResult: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  reverseResultLabel: { fontSize: 14 },
  reverseResultValue: { fontSize: 22, fontWeight: '800' },
});
