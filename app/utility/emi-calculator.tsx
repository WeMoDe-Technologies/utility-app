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
import type { EMIState } from '@/types';

const DEFAULT_STATE: EMIState = {
  principal: '',
  rate: '',
  tenure: '',
  tenureType: 'years',
  emi: '',
  totalAmount: '',
  totalInterest: '',
};

function calculateEMI(principal: number, annualRate: number, tenureMonths: number) {
  if (!principal || !annualRate || !tenureMonths) return null;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const total = emi * tenureMonths;
  const interest = total - principal;
  return { emi, total, interest };
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EMICalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<EMIState>(
    'emi',
    DEFAULT_STATE
  );

  const handleCalculate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const p = parseFloat(state.principal);
    const r = parseFloat(state.rate);
    const t = parseFloat(state.tenure);
    const months = state.tenureType === 'years' ? t * 12 : t;
    const result = calculateEMI(p, r, months);
    if (result) {
      setState((prev) => ({
        ...prev,
        emi: result.emi.toFixed(2),
        totalAmount: result.total.toFixed(2),
        totalInterest: result.interest.toFixed(2),
      }));
    }
  };

  const hasResult = !!state.emi;
  const principalRatio = hasResult
    ? (parseFloat(state.principal) / parseFloat(state.totalAmount)) * 100
    : 0;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="EMI Calculator"
        utilityId="emi"
        accentColor="#F59E0B"
        onClearData={clearState}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Inputs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <InputField
            label="Loan Amount (₹)"
            value={state.principal}
            onChangeText={(v) => setState((p) => ({ ...p, principal: v, emi: '', totalAmount: '', totalInterest: '' }))}
            placeholder="e.g. 500000"
            colors={colors}
            accent="#F59E0B"
          />
          <InputField
            label="Annual Interest Rate (%)"
            value={state.rate}
            onChangeText={(v) => setState((p) => ({ ...p, rate: v, emi: '' }))}
            placeholder="e.g. 8.5"
            colors={colors}
            accent="#F59E0B"
          />

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tenure</Text>
            <View style={styles.tenureRow}>
              <TextInput
                style={[styles.input, styles.tenureInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                value={state.tenure}
                onChangeText={(v) => setState((p) => ({ ...p, tenure: v, emi: '' }))}
                placeholder="e.g. 5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
              <View style={[styles.tenureToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {(['years', 'months'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setState((p) => ({ ...p, tenureType: type, emi: '' }))}
                    style={[
                      styles.tenureOption,
                      state.tenureType === type && { backgroundColor: '#F59E0B' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tenureOptionText,
                        { color: state.tenureType === type ? '#000' : colors.textSecondary },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleCalculate}
            style={[styles.calcBtn, { backgroundColor: '#F59E0B' }]}
          >
            <Text style={styles.calcBtnText}>Calculate EMI</Text>
          </Pressable>
        </Animated.View>

        {/* Result */}
        {hasResult && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            {/* Main EMI */}
            <View style={[styles.emiDisplay, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
              <Text style={[styles.emiLabel, { color: '#F59E0B' }]}>Monthly EMI</Text>
              <Text style={[styles.emiAmount, { color: colors.text }]}>
                {formatINR(parseFloat(state.emi))}
              </Text>
            </View>

            {/* Breakdown */}
            <View style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownDot, { backgroundColor: '#6366F1' }]} />
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                  Principal
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.text }]}>
                  {formatINR(parseFloat(state.principal))}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownDot, { backgroundColor: '#F43F5E' }]} />
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                  Total Interest
                </Text>
                <Text style={[styles.breakdownValue, { color: '#F43F5E' }]}>
                  {formatINR(parseFloat(state.totalInterest))}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: '600' }]}>
                  Total Amount
                </Text>
                <Text style={[styles.breakdownValue, { color: colors.text, fontWeight: '700' }]}>
                  {formatINR(parseFloat(state.totalAmount))}
                </Text>
              </View>
            </View>

            {/* Visual bar */}
            <View style={[styles.ratioBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.ratioFill, { backgroundColor: '#6366F1', width: `${principalRatio}%` }]} />
              <View style={[styles.ratioFill, { backgroundColor: '#F43F5E', flex: 1 }]} />
            </View>
            <View style={styles.ratioLegend}>
              <Text style={{ color: '#6366F1', fontSize: 12, fontWeight: '600' }}>
                Principal {principalRatio.toFixed(1)}%
              </Text>
              <Text style={{ color: '#F43F5E', fontSize: 12, fontWeight: '600' }}>
                Interest {(100 - principalRatio).toFixed(1)}%
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ label, value, onChangeText, placeholder, colors, accent }: any) {
  return (
    <View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.base,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  tenureRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  tenureInput: { flex: 1 },
  tenureToggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
    gap: 3,
  },
  tenureOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  tenureOptionText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  calcBtn: {
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  calcBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: '#000' },
  emiDisplay: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  emiLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emiAmount: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold,
    letterSpacing: -1,
  },
  breakdownCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.base,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { flex: 1, fontSize: typography.sizes.base },
  breakdownValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  divider: { height: StyleSheet.hairlineWidth },
  ratioBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  ratioFill: { height: '100%' },
  ratioLegend: { flexDirection: 'row', justifyContent: 'space-between' },
});
