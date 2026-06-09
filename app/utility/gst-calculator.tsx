import React from 'react';
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
import type { GSTState } from '@/types';

const DEFAULT_STATE: GSTState = {
  amount: '',
  gstRate: '18',
  calculationType: 'exclusive',
  cgst: '',
  sgst: '',
  igst: '',
  totalAmount: '',
};

const GST_RATES = ['5', '12', '18', '28'];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n);
}

export default function GSTCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<GSTState>(
    'gst',
    DEFAULT_STATE
  );

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const amount = parseFloat(state.amount);
    const rate = parseFloat(state.gstRate);
    if (isNaN(amount) || isNaN(rate)) return;

    let baseAmount: number;
    if (state.calculationType === 'exclusive') {
      baseAmount = amount;
    } else {
      baseAmount = (amount * 100) / (100 + rate);
    }

    const totalGst = (baseAmount * rate) / 100;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const igst = totalGst;
    const total = state.calculationType === 'exclusive'
      ? baseAmount + totalGst
      : amount;

    setState((p) => ({
      ...p,
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      totalAmount: total.toFixed(2),
    }));
  };

  const hasResult = !!state.cgst;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="GST Calculator"
        utilityId="gst"
        accentColor="#F97316"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Input Card */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* Amount */}
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount (₹)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={state.amount}
              onChangeText={(v) => setState((p) => ({ ...p, amount: v, cgst: '' }))}
              placeholder="Enter amount"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* GST Rate */}
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>GST Rate</Text>
            <View style={styles.rateRow}>
              {GST_RATES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setState((p) => ({ ...p, gstRate: r, cgst: '' }))}
                  style={[
                    styles.rateChip,
                    {
                      backgroundColor: state.gstRate === r ? '#F97316' : colors.card,
                      borderColor: state.gstRate === r ? '#F97316' : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.rateChipText, { color: state.gstRate === r ? '#fff' : colors.text }]}>
                    {r}%
                  </Text>
                </Pressable>
              ))}
              <TextInput
                style={[styles.rateCustom, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                value={!GST_RATES.includes(state.gstRate) ? state.gstRate : ''}
                onChangeText={(v) => setState((p) => ({ ...p, gstRate: v, cgst: '' }))}
                placeholder="Custom"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Calculation Type */}
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <View style={[styles.typeToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['exclusive', 'inclusive'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setState((p) => ({ ...p, calculationType: type, cgst: '' }))}
                  style={[
                    styles.typeOption,
                    state.calculationType === type && { backgroundColor: '#F97316' },
                  ]}
                >
                  <Text style={[styles.typeText, { color: state.calculationType === type ? '#fff' : colors.textSecondary }]}>
                    {type === 'exclusive' ? 'GST Exclusive' : 'GST Inclusive'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleCalculate}
            style={[styles.calcBtn, { backgroundColor: '#F97316' }]}
          >
            <Text style={styles.calcBtnText}>Calculate GST</Text>
          </Pressable>
        </Animated.View>

        {/* Results */}
        {hasResult && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={{ gap: spacing.sm }}>
            <ResultCard
              label="Base Amount"
              value={formatINR(parseFloat(state.amount) - (state.calculationType === 'inclusive' ? parseFloat(state.igst) : 0))}
              color="#6366F1"
              colors={colors}
            />
            <View style={styles.gstSplitRow}>
              <ResultCard
                label={`CGST (${parseFloat(state.gstRate) / 2}%)`}
                value={formatINR(parseFloat(state.cgst))}
                color="#F97316"
                colors={colors}
                flex
              />
              <ResultCard
                label={`SGST (${parseFloat(state.gstRate) / 2}%)`}
                value={formatINR(parseFloat(state.sgst))}
                color="#F97316"
                colors={colors}
                flex
              />
            </View>
            <ResultCard
              label={`IGST (${state.gstRate}%)`}
              value={formatINR(parseFloat(state.igst))}
              color="#EC4899"
              colors={colors}
              subtitle="For inter-state transactions"
            />
            <ResultCard
              label="Total Amount"
              value={formatINR(parseFloat(state.totalAmount))}
              color="#10B981"
              colors={colors}
              large
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ label, value, color, colors, subtitle, large, flex }: any) {
  return (
    <View
      style={[
        styles.resultCard,
        {
          backgroundColor: color + '12',
          borderColor: color + '30',
          flex: flex ? 1 : undefined,
        },
      ]}
    >
      <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.resultValue, { color, fontSize: large ? 28 : 20 }]}>{value}</Text>
      {subtitle && <Text style={[styles.resultSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.base },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  rateRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  rateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  rateChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  rateCustom: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    minWidth: 70,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  typeOption: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  typeText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  calcBtn: { borderRadius: radius.xl, paddingVertical: spacing.md, alignItems: 'center' },
  calcBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: '#fff' },
  gstSplitRow: { flexDirection: 'row', gap: spacing.sm },
  resultCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: 4 },
  resultLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  resultValue: { fontWeight: typography.weights.extrabold, letterSpacing: -0.5 },
  resultSubtitle: { fontSize: typography.sizes.xs },
});
