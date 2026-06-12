import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { CurrencyConverterState } from '@/types';

const DEFAULT_STATE: CurrencyConverterState = {
  fromCurrency: 'USD',
  toCurrency: 'INR',
  amount: '1',
  result: '',
  lastFetchedAt: null,
  rates: {},
};

const POPULAR_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED', 'MYR'];

const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', INR: '🇮🇳', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳', SGD: '🇸🇬',
  AED: '🇦🇪', MYR: '🇲🇾',
};

const CURRENCY_NAMES: Record<string, string> = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee',
  JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc', CNY: 'Chinese Yuan', SGD: 'Singapore Dollar',
  AED: 'UAE Dirham', MYR: 'Malaysian Ringgit',
};

// Static fallback rates relative to USD (last known rates)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.12, JPY: 149.50,
  AUD: 1.53, CAD: 1.36, CHF: 0.90, CNY: 7.24, SGD: 1.34,
  AED: 3.67, MYR: 4.72,
};

export default function CurrencyConverterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<CurrencyConverterState>(
    'currencyConverter',
    DEFAULT_STATE
  );
  const [loading, setLoading] = useState(false);
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://open.er-api.com/v6/latest/${state.fromCurrency}`
      );
      const data = await res.json();
      if (data.rates) {
        setState((p) => ({
          ...p,
          rates: data.rates,
          lastFetchedAt: Date.now(),
        }));
        return data.rates;
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
    return null;
  };

  const convert = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const amount = parseFloat(state.amount);
    if (isNaN(amount)) return;

    // Try to use cached rates (if < 1 hour old)
    let rates = state.rates;
    const cacheAge = state.lastFetchedAt ? Date.now() - state.lastFetchedAt : Infinity;
    if (!rates[state.toCurrency] || cacheAge > 3600000) {
      const fresh = await fetchRates();
      if (fresh) rates = fresh;
    }

    // API returns rates with fromCurrency as the base (rates[fromCurrency] === 1.0),
    // so the conversion is simply: amount × rates[toCurrency]
    // The fallback rates are all relative to USD, so we cross-rate them.
    let result: number;
    if (rates[state.toCurrency]) {
      result = amount * rates[state.toCurrency];
    } else {
      // Fallback: cross-rate via USD
      result = (amount * FALLBACK_RATES[state.toCurrency]) / FALLBACK_RATES[state.fromCurrency];
    }

    setState((p) => ({ ...p, result: result.toFixed(4) }));
  };

  const handleSwap = () => {
    setState((p) => ({
      ...p,
      fromCurrency: p.toCurrency,
      toCurrency: p.fromCurrency,
      result: '',
      rates: {},
    }));
  };

  const lastUpdated = state.lastFetchedAt
    ? new Date(state.lastFetchedAt).toLocaleTimeString()
    : 'Not fetched';

  if (pickerFor) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
        <View style={[styles.pickerHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setPickerFor(null)}>
            <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>
            Select Currency
          </Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView>
          {POPULAR_CURRENCIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => {
                setState((p) => ({
                  ...p,
                  [pickerFor === 'from' ? 'fromCurrency' : 'toCurrency']: c,
                  result: '',
                }));
                setPickerFor(null);
              }}
              style={[styles.currencyRow, { borderBottomColor: colors.border }]}
            >
              <Text style={styles.currencyFlag}>{CURRENCY_FLAGS[c] ?? '💱'}</Text>
              <View style={styles.currencyInfo}>
                <Text style={[styles.currencyCode, { color: colors.text }]}>{c}</Text>
                <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
                  {CURRENCY_NAMES[c] ?? c}
                </Text>
              </View>
              {(pickerFor === 'from' ? state.fromCurrency : state.toCurrency) === c && (
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Currency"
        utilityId="currencyConverter"
        accentColor="#10B981"
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* From */}
          <View style={styles.currencyBlock}>
            <Pressable
              onPress={() => setPickerFor('from')}
              style={[styles.currencySelector, { backgroundColor: colors.muted }]}
            >
              <Text style={styles.flagLarge}>{CURRENCY_FLAGS[state.fromCurrency] ?? '💱'}</Text>
              <View>
                <Text style={[styles.currencyCode, { color: colors.text, fontSize: 18 }]}>{state.fromCurrency}</Text>
                <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{CURRENCY_NAMES[state.fromCurrency]}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </Pressable>
            <TextInput
              style={[styles.amountInput, { color: colors.text, borderColor: colors.border }]}
              value={state.amount}
              onChangeText={(v) => setState((p) => ({ ...p, amount: v, result: '' }))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Swap */}
          <Pressable onPress={handleSwap} style={[styles.swapBtn, { backgroundColor: '#10B98120', borderColor: '#10B98140' }]}>
            <Ionicons name="swap-vertical" size={20} color="#10B981" />
          </Pressable>

          {/* To */}
          <View style={styles.currencyBlock}>
            <Pressable
              onPress={() => setPickerFor('to')}
              style={[styles.currencySelector, { backgroundColor: colors.muted }]}
            >
              <Text style={styles.flagLarge}>{CURRENCY_FLAGS[state.toCurrency] ?? '💱'}</Text>
              <View>
                <Text style={[styles.currencyCode, { color: colors.text, fontSize: 18 }]}>{state.toCurrency}</Text>
                <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{CURRENCY_NAMES[state.toCurrency]}</Text>
              </View>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
            </Pressable>
            <View style={[styles.resultBox, { borderColor: colors.border }]}>
              {loading ? (
                <ActivityIndicator color="#10B981" />
              ) : (
                <Text style={[styles.resultText, { color: state.result ? '#10B981' : colors.textTertiary }]}>
                  {state.result || '—'}
                </Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={convert}
            style={[styles.convertBtn, { backgroundColor: '#10B981' }]}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.convertBtnText}>Convert</Text>
          </Pressable>

          <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
            Rates: {lastUpdated}
          </Text>
        </Animated.View>

        {/* Quick conversion table */}
        {state.result && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK REFERENCE</Text>
            {[1, 5, 10, 50, 100, 500, 1000].map((amt) => {
              const rate = parseFloat(state.result) / parseFloat(state.amount || '1');
              return (
                <View key={amt} style={[styles.refRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.refFrom, { color: colors.textSecondary }]}>
                    {amt} {state.fromCurrency}
                  </Text>
                  <Text style={[styles.refTo, { color: colors.text }]}>
                    {(amt * rate).toFixed(2)} {state.toCurrency}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 40 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.base, gap: spacing.base, alignItems: 'center' },
  currencyBlock: { width: '100%', gap: spacing.sm },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  flagLarge: { fontSize: 28 },
  currencyCode: { fontWeight: '700' },
  currencyName: { fontSize: 12 },
  amountInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'right',
    color: '#fff',
  },
  resultBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 58,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultText: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    justifyContent: 'center',
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
  },
  convertBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lastUpdated: { fontSize: 11, alignSelf: 'center' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  refFrom: { fontSize: 15 },
  refTo: { fontSize: 15, fontWeight: '600' },
  // Picker styles
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerTitle: { fontSize: 17, fontWeight: '600' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  currencyFlag: { fontSize: 24 },
  currencyInfo: { flex: 1 },
});
