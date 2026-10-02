import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, useHaptic, toast } from '@/components/ui';
import { formatNumber } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';
import type { UnitConverterState } from '@/types';

// ─── Unit Definitions ─────────────────────────────────────────────────────
const ACCENT = '#2E6A66';

const UNIT_CATEGORIES: Record<
  string,
  { label: string; units: Record<string, { label: string; toBase: number }> }
> = {
  length: {
    label: 'Length',
    units: {
      m: { label: 'Metre', toBase: 1 },
      km: { label: 'Kilometre', toBase: 1000 },
      cm: { label: 'Centimetre', toBase: 0.01 },
      mm: { label: 'Millimetre', toBase: 0.001 },
      mi: { label: 'Mile', toBase: 1609.34 },
      yd: { label: 'Yard', toBase: 0.9144 },
      ft: { label: 'Foot', toBase: 0.3048 },
      in: { label: 'Inch', toBase: 0.0254 },
    },
  },
  weight: {
    label: 'Weight',
    units: {
      kg: { label: 'Kilogram', toBase: 1 },
      g: { label: 'Gram', toBase: 0.001 },
      mg: { label: 'Milligram', toBase: 0.000001 },
      lb: { label: 'Pound', toBase: 0.453592 },
      oz: { label: 'Ounce', toBase: 0.0283495 },
      t: { label: 'Tonne', toBase: 1000 },
      st: { label: 'Stone', toBase: 6.35029 },
    },
  },
  temperature: {
    label: 'Temperature',
    units: {
      c: { label: 'Celsius', toBase: 1 },
      f: { label: 'Fahrenheit', toBase: 1 },
      k: { label: 'Kelvin', toBase: 1 },
    },
  },
  area: {
    label: 'Area',
    units: {
      'm2': { label: 'm²', toBase: 1 },
      'km2': { label: 'km²', toBase: 1000000 },
      'cm2': { label: 'cm²', toBase: 0.0001 },
      'ft2': { label: 'ft²', toBase: 0.092903 },
      acre: { label: 'Acre', toBase: 4046.86 },
      hectare: { label: 'Hectare', toBase: 10000 },
    },
  },
  volume: {
    label: 'Volume',
    units: {
      l: { label: 'Litre', toBase: 1 },
      ml: { label: 'Millilitre', toBase: 0.001 },
      m3: { label: 'm³', toBase: 1000 },
      gal: { label: 'Gallon (US)', toBase: 3.78541 },
      qt: { label: 'Quart', toBase: 0.946353 },
      cup: { label: 'Cup', toBase: 0.236588 },
      pt: { label: 'Pint (US)', toBase: 0.473176 },
      floz: { label: 'Fluid ounce (US)', toBase: 0.0295735 },
    },
  },
  speed: {
    label: 'Speed',
    units: {
      'km/h': { label: 'km/h', toBase: 1 },
      'm/s': { label: 'm/s', toBase: 3.6 },
      mph: { label: 'mph', toBase: 1.60934 },
      knot: { label: 'Knot', toBase: 1.852 },
    },
  },
  data: {
    label: 'Data',
    units: {
      b:   { label: 'Byte', toBase: 1 },
      // Decimal (SI) units — what storage vendors quote
      kb:  { label: 'Kilobyte (kB)', toBase: 1e3 },
      mb:  { label: 'Megabyte (MB)', toBase: 1e6 },
      gb:  { label: 'Gigabyte (GB)', toBase: 1e9 },
      tb:  { label: 'Terabyte (TB)', toBase: 1e12 },
      // Binary units — what operating systems report. These were previously
      // labelled "Kilobyte" while using 1024, which is a kibibyte.
      kib: { label: 'Kibibyte (KiB)', toBase: 1024 },
      mib: { label: 'Mebibyte (MiB)', toBase: 1048576 },
      gib: { label: 'Gibibyte (GiB)', toBase: 1073741824 },
      tib: { label: 'Tebibyte (TiB)', toBase: 1099511627776 },
    },
  },
};

function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  switch (from) {
    case 'f': celsius = (value - 32) * (5 / 9); break;
    case 'k': celsius = value - 273.15; break;
    default: celsius = value;
  }
  switch (to) {
    case 'f': return celsius * (9 / 5) + 32;
    case 'k': return celsius + 273.15;
    default: return celsius;
  }
}

/** Numeric conversion. Returns NaN when the input isn't a number. */
function convertValue(value: string, category: string, from: string, to: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) return NaN;
  if (from === to) return num;

  if (category === 'temperature') return convertTemperature(num, from, to);

  const units = UNIT_CATEGORIES[category]?.units;
  if (!units) return NaN;
  const fromFactor = units[from]?.toBase ?? 1;
  const toFactor = units[to]?.toBase ?? 1;
  return (num * fromFactor) / toFactor;
}

/**
 * Display a converted value without either losing tiny results to rounding
 * (1 mm in miles) or dumping float noise on screen.
 */
function present(n: number): string {
  if (!isFinite(n)) return '';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(4).replace(/\.?0+e/, 'e');
  const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  return formatNumber(n, { decimals, trim: true, grouping: abs >= 10000 ? 'western' : 'none' });
}

function convert(value: string, category: string, from: string, to: string): string {
  const n = convertValue(value, category, from, to);
  return isNaN(n) ? '' : present(n);
}

const DEFAULT_STATE: UnitConverterState = {
  category: 'length',
  fromUnit: 'm',
  toUnit: 'km',
  fromValue: '',
  toValue: '',
};

export default function UnitConverterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<UnitConverterState>(
    'unitConverter',
    DEFAULT_STATE
  );
  const haptic = useHaptic();

  const currentUnits = UNIT_CATEGORIES[state.category]?.units ?? {};

  /**
   * The converted value is DERIVED, never read back from storage. `toValue` is
   * only written when an input changes, so a restored session would otherwise
   * show a stale (or empty) result in the headline box while the table below
   * showed the correct figures.
   */
  const derivedTo = convert(state.fromValue, state.category, state.fromUnit, state.toUnit);

  const handleFromChange = (val: string) => {
    const toVal = convert(val, state.category, state.fromUnit, state.toUnit);
    setState((p) => ({ ...p, fromValue: val, toValue: toVal }));
  };

  const handleSwap = () => {
    haptic('medium');
    setState((p) => {
      // Recompute from the swapped input rather than reusing the old display
      // string, so repeated swaps can't drift through rounding.
      const nextFromValue = convert(p.fromValue, p.category, p.fromUnit, p.toUnit);
      return {
        ...p,
        fromUnit: p.toUnit,
        toUnit: p.fromUnit,
        fromValue: nextFromValue,
        toValue: convert(nextFromValue, p.category, p.toUnit, p.fromUnit),
      };
    });
  };

  const handleCategorySelect = (cat: string) => {
    haptic('select');
    const units = Object.keys(UNIT_CATEGORIES[cat]?.units ?? {});
    setState({
      category: cat,
      fromUnit: units[0] ?? '',
      toUnit: units[1] ?? '',
      fromValue: '',
      toValue: '',
    });
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Unit Converter"
        utilityId="unitConverter"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          {Object.entries(UNIT_CATEGORIES).map(([key, cat]) => (
            <Pressable
              key={key}
              onPress={() => handleCategorySelect(key)}
              style={[
                styles.pill,
                {
                  backgroundColor:
                    state.category === key ? ACCENT : colors.card,
                  borderColor:
                    state.category === key ? ACCENT : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color:
                      state.category === key ? '#fff' : colors.textSecondary,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Conversion Card */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {/* From */}
          <View style={styles.inputRow}>
            <UnitPicker
              units={currentUnits}
              selected={state.fromUnit}
              onSelect={(u) => {
                setState((p) => {
                  const toVal = convert(p.fromValue, p.category, u, p.toUnit);
                  return { ...p, fromUnit: u, toValue: toVal };
                });
              }}
              colors={colors}
              accent={ACCENT}
            />
            <TextInput
              style={[styles.valueInput, { color: colors.text, borderColor: colors.border }]}
              value={state.fromValue}
              onChangeText={handleFromChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {/* Swap */}
          <Pressable
            onPress={handleSwap}
            style={[styles.swapBtn, { backgroundColor: ACCENT + '1F', borderColor: ACCENT + '45' }]}
          >
            <Ionicons name="swap-vertical" size={18} color={ACCENT} />
          </Pressable>

          {/* To */}
          <View style={styles.inputRow}>
            <UnitPicker
              units={currentUnits}
              selected={state.toUnit}
              onSelect={(u) => {
                setState((p) => {
                  const toVal = convert(p.fromValue, p.category, p.fromUnit, u);
                  return { ...p, toUnit: u, toValue: toVal };
                });
              }}
              colors={colors}
              accent={ACCENT}
            />
            <Pressable
              onLongPress={async () => {
                if (!derivedTo) return;
                await Clipboard.setStringAsync(derivedTo);
                haptic('success');
                toast('Copied to clipboard');
              }}
              delayLongPress={300}
              accessibilityRole="button"
              accessibilityLabel={`Result ${derivedTo || 0}. Long press to copy.`}
              style={[styles.resultBox, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text
                style={[styles.resultText, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {derivedTo || '0'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Quick reference */}
        <Animated.View entering={FadeInDown.delay(160).duration(300)}>
          <Text style={[styles.refTitle, { color: colors.textSecondary }]}>
            All units
          </Text>
          <Card padded={false}>
            {Object.entries(currentUnits).map(([key, unit], i) => {
              // Show the *entered* amount in every unit, not a fixed 1
              const source = state.fromValue || '1';
              const converted = convert(source, state.category, state.fromUnit, key);
              const isSource = key === state.fromUnit;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    haptic('select');
                    setState((p) => ({
                      ...p,
                      toUnit: key,
                      toValue: convert(p.fromValue, p.category, p.fromUnit, key),
                    }));
                  }}
                  style={({ pressed }) => [
                    styles.refRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    isSource && { backgroundColor: ACCENT + '10' },
                    pressed && { backgroundColor: colors.muted },
                  ]}
                >
                  <Text
                    style={[
                      styles.refLabel,
                      { color: isSource ? ACCENT : colors.text, fontWeight: isSource ? '700' : '500' },
                    ]}
                    numberOfLines={1}
                  >
                    {unit.label}
                  </Text>
                  <Text
                    style={[styles.refValue, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {converted}
                  </Text>
                </Pressable>
              );
            })}
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function UnitPicker({
  units,
  selected,
  onSelect,
  colors,
  accent,
}: {
  units: Record<string, { label: string; toBase: number }>;
  selected: string;
  onSelect: (key: string) => void;
  colors: any;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  // Stores the screen-absolute position of the trigger button
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = React.useRef<View>(null);

  const handleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Measure the button's position in the window (screen-absolute coords)
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPos({ top: y + height + 4, left: x, width });
      setOpen(true);
    });
  };

  return (
    <View style={styles.pickerContainer}>
      {/* Trigger button — ref needed for measureInWindow */}
      <View ref={btnRef} collapsable={false}>
        <Pressable
          onPress={handleOpen}
          style={[
            styles.pickerBtn,
            { backgroundColor: accent + '20', borderColor: accent + '40' },
          ]}
        >
          <Text style={[styles.pickerLabel, { color: accent }]}>
            {units[selected]?.label ?? selected}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={accent} />
        </Pressable>
      </View>

      {/* Dropdown rendered in a Modal so it escapes all parent clipping/overflow/zIndex stacks */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Full-screen backdrop — tap outside to close */}
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        {/* Dropdown list, positioned at measured screen coords */}
        {dropdownPos && (
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 200 }}
            >
              {Object.entries(units).map(([key, unit]) => (
                <Pressable
                  key={key}
                  onPress={() => { onSelect(key); setOpen(false); }}
                  style={[
                    styles.dropdownItem,
                    { backgroundColor: key === selected ? accent + '15' : 'transparent' },
                  ]}
                >
                  <Text style={[styles.dropdownText, { color: key === selected ? accent : colors.text }]}>
                    {unit.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.base, gap: spacing.base },
  pills: { gap: spacing.sm, paddingVertical: spacing.xs },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: border.base,
  },
  pillText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  card: {
    borderRadius: radius.xl,
    borderWidth: border.base,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  pickerContainer: { position: 'relative', flex: 1 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: border.base,
  },
  pickerLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, flex: 1 },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdown: {
    position: 'absolute',
    borderRadius: radius.md,
    borderWidth: border.base,
    // Android: elevation renders the shadow AND controls draw order (zIndex equivalent)
    // iOS: shadow stack
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownText: { fontSize: typography.sizes.sm },
  valueInput: {
    flex: 1.5,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    textAlign: 'right',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: border.base,
    letterSpacing: -0.5,
  },
  resultBox: {
    flex: 1.5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: border.base,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  resultText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    letterSpacing: -0.5,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: border.base,
  },
  refTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  refLabel: { fontSize: typography.sizes.base, flexShrink: 1 },
  refValue: {
    fontSize: typography.sizes.base,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
});