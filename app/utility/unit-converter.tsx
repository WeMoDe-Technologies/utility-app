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

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { UnitConverterState } from '@/types';

// ─── Unit Definitions ─────────────────────────────────────────────────────
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
      b: { label: 'Byte', toBase: 1 },
      kb: { label: 'Kilobyte', toBase: 1024 },
      mb: { label: 'Megabyte', toBase: 1048576 },
      gb: { label: 'Gigabyte', toBase: 1073741824 },
      tb: { label: 'Terabyte', toBase: 1099511627776 },
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

function convert(value: string, category: string, from: string, to: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (from === to) return value;

  if (category === 'temperature') {
    const res = convertTemperature(num, from, to);
    return parseFloat(res.toFixed(6)).toString();
  }

  const units = UNIT_CATEGORIES[category]?.units;
  if (!units) return '';
  const fromFactor = units[from]?.toBase ?? 1;
  const toFactor = units[to]?.toBase ?? 1;
  const result = (num * fromFactor) / toFactor;
  return parseFloat(result.toFixed(8)).toString();
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

  const currentUnits = UNIT_CATEGORIES[state.category]?.units ?? {};

  const handleFromChange = (val: string) => {
    const toVal = convert(val, state.category, state.fromUnit, state.toUnit);
    setState((p) => ({ ...p, fromValue: val, toValue: toVal }));
  };

  const handleSwap = () => {
    setState((p) => ({
      ...p,
      fromUnit: p.toUnit,
      toUnit: p.fromUnit,
      fromValue: p.toValue,
      toValue: p.fromValue,
    }));
  };

  const handleCategorySelect = (cat: string) => {
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
        accentColor="#06B6D4"
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
                    state.category === key ? '#06B6D4' : colors.card,
                  borderColor:
                    state.category === key ? '#06B6D4' : colors.border,
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
              accent="#06B6D4"
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
            style={[styles.swapBtn, { backgroundColor: '#06B6D420', borderColor: '#06B6D440' }]}
          >
            <Ionicons name="swap-vertical" size={18} color="#06B6D4" />
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
              accent="#06B6D4"
            />
            <View style={[styles.resultBox, { borderColor: colors.border }]}>
              <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                {state.toValue || '0'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick reference */}
        <Animated.View entering={FadeInDown.delay(160).duration(300)}>
          <Text style={[styles.refTitle, { color: colors.textSecondary }]}>
            All Units
          </Text>
          {Object.entries(currentUnits).map(([key, unit]) => {
            const converted = convert('1', state.category, state.fromUnit, key);
            return (
              <View
                key={key}
                style={[styles.refRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.refLabel, { color: colors.text }]}>
                  {unit.label}
                </Text>
                <Text style={[styles.refValue, { color: colors.textSecondary }]}>
                  1 {UNIT_CATEGORIES[state.category]?.units[state.fromUnit]?.label} ={' '}
                  {converted} {unit.label}
                </Text>
              </View>
            );
          })}
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
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
    // Android: elevation renders the shadow AND controls draw order (zIndex equivalent)
    elevation: 8,
    // iOS: shadow stack
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
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
    borderWidth: 1,
    letterSpacing: -0.5,
  },
  resultBox: {
    flex: 1.5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
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
    borderWidth: 1,
  },
  refTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  refRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  refLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  refValue: { fontSize: typography.sizes.sm, marginTop: 2 },
});