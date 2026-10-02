import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader, HeaderKey } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, NumericField, Notice, useHaptic, toast, onColour } from '@/components/ui';
import { formatNumber, parseAmount } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';

const ACCENT = '#4C6B3C';
const CACHE_TTL_MS = 60 * 60 * 1000; // rates are free-tier daily; an hour is plenty

interface RateCache {
  /** The currency the cached rates are quoted against. Without this the app
   *  silently reused USD-based rates after the user switched the "from"
   *  currency, producing badly wrong conversions. */
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

interface ConverterState {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  cache: RateCache | null;
}

const DEFAULT_STATE: ConverterState = {
  fromCurrency: 'USD',
  toCurrency: 'INR',
  amount: '1',
  cache: null,
};

interface CurrencyMeta { code: string; flag: string; name: string }

const SUPPORTED: CurrencyMeta[] = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'CNY', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'SGD', flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'MYR', flag: '🇲🇾', name: 'Malaysian Ringgit' },
  { code: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'NZD', flag: '🇳🇿', name: 'New Zealand Dollar' },
  { code: 'ZAR', flag: '🇿🇦', name: 'South African Rand' },
  { code: 'THB', flag: '🇹🇭', name: 'Thai Baht' },
];

const META = Object.fromEntries(SUPPORTED.map((c) => [c.code, c])) as Record<string, CurrencyMeta>;

/** Offline fallback, all quoted against USD. Approximate — clearly labelled in the UI. */
const FALLBACK_USD: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.12, JPY: 149.5, AUD: 1.53, CAD: 1.36,
  CHF: 0.9, CNY: 7.24, SGD: 1.34, AED: 3.67, MYR: 4.72, SAR: 3.75, NZD: 1.66,
  ZAR: 18.6, THB: 35.4,
};

type Status = 'idle' | 'loading' | 'live' | 'offline';

export default function CurrencyConverterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ConverterState>(
    'currencyConverter',
    DEFAULT_STATE,
  );
  const haptic = useHaptic();

  const [status, setStatus] = useState<Status>('idle');
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null);
  const inFlight = useRef<string | null>(null);

  const { fromCurrency, toCurrency, amount, cache } = state;

  const cacheIsUsable =
    !!cache &&
    cache.base === fromCurrency &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS &&
    typeof cache.rates[toCurrency] === 'number';

  const fetchRates = useCallback(
    async (base: string) => {
      if (inFlight.current === base) return;
      inFlight.current = base;
      setStatus('loading');
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
        const data = await res.json();
        if (data?.result === 'success' && data.rates) {
          setState((p) => ({
            ...p,
            cache: { base, rates: data.rates, fetchedAt: Date.now() },
          }));
          setStatus('live');
          return;
        }
        setStatus('offline');
      } catch {
        setStatus('offline');
      } finally {
        inFlight.current = null;
      }
    },
    [setState],
  );

  // Refresh whenever the base currency changes or the cache goes stale.
  useEffect(() => {
    if (!cacheIsUsable) fetchRates(fromCurrency);
    else setStatus('live');
  }, [fromCurrency, cacheIsUsable, fetchRates]);

  /** The rate actually used, plus whether it came from the network. */
  const { rate, isLive } = useMemo(() => {
    if (cache && cache.base === fromCurrency && typeof cache.rates[toCurrency] === 'number') {
      return { rate: cache.rates[toCurrency], isLive: true };
    }
    // Cross-rate through USD from the bundled table
    const from = FALLBACK_USD[fromCurrency];
    const to = FALLBACK_USD[toCurrency];
    if (!from || !to) return { rate: NaN, isLive: false };
    return { rate: to / from, isLive: false };
  }, [cache, fromCurrency, toCurrency]);

  const parsedAmount = parseAmount(amount);
  const converted = isFinite(parsedAmount) && isFinite(rate) ? parsedAmount * rate : NaN;

  const swap = () => {
    haptic('medium');
    setState((p) => ({ ...p, fromCurrency: p.toCurrency, toCurrency: p.fromCurrency }));
  };

  const copyResult = async () => {
    if (!isFinite(converted)) return;
    await Clipboard.setStringAsync(`${formatNumber(converted, { decimals: 2 })} ${toCurrency}`);
    haptic('success');
    toast('Copied to clipboard');
  };

  const lastUpdated = cache?.fetchedAt
    ? new Date(cache.fetchedAt).toLocaleString(undefined, {
        hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
      })
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Currency"
        utilityId="currencyConverter"
        accentColor={ACCENT}
        subtitle={
          status === 'loading' ? 'Fetching rates…'
          : isLive && lastUpdated ? `Live · ${lastUpdated}`
          : 'Offline rates'
        }
        onClearData={clearState}
        rightAction={
          <HeaderKey
            icon={status === 'loading' ? 'hourglass-outline' : 'refresh'}
            label="Refresh exchange rates"
            fg={onColour(ACCENT)}
            active={status === 'loading'}
            onPress={() => { haptic('light'); fetchRates(fromCurrency); }}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(40).duration(280)}>
          <Card style={styles.converterCard}>
            {/* From */}
            <CurrencyRow
              label="From"
              code={fromCurrency}
              onPickCurrency={() => setPickerFor('from')}
              colors={colors}
            >
              <NumericField
                value={amount}
                onChangeText={(v) => setState((p) => ({ ...p, amount: v }))}
                placeholder="0"
                accent={ACCENT}
                size="lg"
                inputStyle={styles.amountInput}
              />
            </CurrencyRow>

            {/* Swap */}
            <View style={styles.swapWrap}>
              <View style={[styles.swapLine, { backgroundColor: colors.border }]} />
              <Pressable
                onPress={swap}
                accessibilityRole="button"
                accessibilityLabel="Swap currencies"
                style={[styles.swapBtn, { backgroundColor: ACCENT + '1A', borderColor: ACCENT + '45' }]}
              >
                <Ionicons name="swap-vertical" size={20} color={ACCENT} />
              </Pressable>
              <View style={[styles.swapLine, { backgroundColor: colors.border }]} />
            </View>

            {/* To */}
            <CurrencyRow
              label="To"
              code={toCurrency}
              onPickCurrency={() => setPickerFor('to')}
              colors={colors}
            >
              <Pressable
                onLongPress={copyResult}
                delayLongPress={300}
                style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text
                  style={[styles.resultText, { color: isFinite(converted) ? ACCENT : colors.textTertiary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {isFinite(converted) ? formatNumber(converted, { decimals: 2 }) : '—'}
                </Text>
              </Pressable>
            </CurrencyRow>

            <Text style={[styles.rateLine, { color: colors.textSecondary }]}>
              1 {fromCurrency} = {isFinite(rate) ? formatNumber(rate, { decimals: 4, trim: true }) : '—'} {toCurrency}
            </Text>
          </Card>
        </Animated.View>

        {!isLive && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Notice
              tone="warn"
              text="Showing bundled offline rates — they may be out of date. Tap refresh once you're back online."
            />
          </Animated.View>
        )}

        {/* Quick reference */}
        {isFinite(rate) && (
          <Animated.View entering={FadeInDown.delay(90).duration(280)}>
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>QUICK REFERENCE</Text>
              {[1, 5, 10, 50, 100, 500, 1000].map((amt, i) => (
                <View
                  key={amt}
                  style={[
                    styles.refRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <Text style={[styles.refFrom, { color: colors.textSecondary }]}>
                    {formatNumber(amt, { decimals: 0 })} {fromCurrency}
                  </Text>
                  <Text style={[styles.refTo, { color: colors.text }]}>
                    {formatNumber(amt * rate, { decimals: 2 })} {toCurrency}
                  </Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}
      </ScrollView>

      <CurrencyPicker
        visible={pickerFor !== null}
        selected={pickerFor === 'from' ? fromCurrency : toCurrency}
        exclude={pickerFor === 'from' ? toCurrency : fromCurrency}
        onSelect={(code) => {
          haptic('select');
          setState((p) => ({
            ...p,
            ...(pickerFor === 'from' ? { fromCurrency: code } : { toCurrency: code }),
          }));
          setPickerFor(null);
        }}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

// ─── Currency row ──────────────────────────────────────────────────────────
function CurrencyRow({
  label, code, onPickCurrency, colors, children,
}: {
  label: string;
  code: string;
  onPickCurrency: () => void;
  colors: any;
  children: React.ReactNode;
}) {
  const meta = META[code];
  return (
    <View style={styles.currencyBlock}>
      <Text style={[styles.blockLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Pressable
        onPress={onPickCurrency}
        accessibilityRole="button"
        accessibilityLabel={`Change ${label.toLowerCase()} currency, currently ${meta?.name ?? code}`}
        style={({ pressed }) => [
          styles.currencySelector,
          { backgroundColor: pressed ? colors.subtle : colors.muted },
        ]}
      >
        <Text style={styles.flagLarge}>{meta?.flag ?? '💱'}</Text>
        <View style={styles.currencyText}>
          <Text style={[styles.currencyCode, { color: colors.text }]}>{code}</Text>
          <Text style={[styles.currencyName, { color: colors.textSecondary }]} numberOfLines={1}>
            {meta?.name ?? code}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </Pressable>
      {children}
    </View>
  );
}

// ─── Picker (a real modal sheet, not a screen takeover) ────────────────────
function CurrencyPicker({
  visible, selected, exclude, onSelect, onClose,
}: {
  visible: boolean;
  selected: string;
  exclude: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  useEffect(() => { if (!visible) setQuery(''); }, [visible]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? SUPPORTED.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : SUPPORTED;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: bottom + spacing.base },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Select currency</Text>

        <View style={[styles.search, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          style={styles.sheetList}
          ListEmptyComponent={
            <Text style={[styles.emptyTxt, { color: colors.textTertiary }]}>No currency matches “{query}”</Text>
          }
          renderItem={({ item }) => {
            const isSelected = item.code === selected;
            const isExcluded = item.code === exclude;
            return (
              <Pressable
                onPress={() => onSelect(item.code)}
                disabled={isExcluded}
                style={({ pressed }) => [
                  styles.currencyRow,
                  { borderBottomColor: colors.border, opacity: isExcluded ? 0.35 : 1 },
                  pressed && { backgroundColor: colors.muted },
                ]}
              >
                <Text style={styles.currencyFlag}>{item.flag}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={[styles.currencyCode, { color: colors.text }]}>{item.code}</Text>
                  <Text style={[styles.currencyName, { color: colors.textSecondary }]}>{item.name}</Text>
                </View>
                {isExcluded ? (
                  <Text style={[styles.inUse, { color: colors.textTertiary }]}>in use</Text>
                ) : isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base, paddingBottom: 48 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },

  converterCard: { gap: spacing.sm },
  currencyBlock: { gap: spacing.sm },
  blockLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  currencyText: { flex: 1 },
  flagLarge: { fontSize: 26 },
  currencyCode: { fontWeight: '700', fontSize: 17 },
  currencyName: { fontSize: 12 },
  amountInput: { textAlign: 'right' },
  resultBox: {
    borderRadius: radius.lg,
    borderWidth: border.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 62,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultText: { fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  rateLine: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  swapWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  swapLine: { flex: 1, height: StyleSheet.hairlineWidth },
  swapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.base,
  },

  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  refRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  refFrom: { fontSize: typography.sizes.base },
  refTo: { fontSize: typography.sizes.base, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Picker sheet
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: border.base,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetTitle: { fontSize: typography.sizes.md, fontWeight: '700', textAlign: 'center', marginTop: spacing.xs },
  sheetList: { marginTop: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: border.base,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.base, padding: 0 },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  currencyFlag: { fontSize: 24 },
  currencyInfo: { flex: 1 },
  inUse: { fontSize: 11, fontStyle: 'italic' },
  emptyTxt: { textAlign: 'center', paddingVertical: spacing.xl, fontSize: typography.sizes.sm },
});
