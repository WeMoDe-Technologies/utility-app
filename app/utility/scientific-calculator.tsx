import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Plate, PressablePlate, useHaptic, toast, onColour } from '@/components/ui';
import { spacing, radius, typography, border, plate } from '@/theme';
import { evaluateExpression, formatResult, appendToken, endsWithOperator } from '@/utils/expression';
import type { ScientificCalculatorState } from '@/types';

const ACCENT = '#6B4A6E';

// ─── Layout: 5 columns sized from the available width ──────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const COLS  = 5;
const H_PAD = spacing.base;
const GAP   = 9;
const BTN   = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

type Variant = 'op' | 'util' | 'fn' | 'num' | 'equals' | 'mem';
type BtnDef  = { label: string; span?: number; variant: Variant };

const GRID: BtnDef[][] = [
  [
    { label: 'MC', variant: 'mem' },
    { label: 'MR', variant: 'mem' },
    { label: 'M+', variant: 'mem' },
    { label: 'M−', variant: 'mem' },
    { label: 'Rad', variant: 'fn' },
  ],
  [
    { label: 'sin', variant: 'fn' },
    { label: 'cos', variant: 'fn' },
    { label: 'tan', variant: 'fn' },
    { label: 'ln',  variant: 'fn' },
    { label: 'log', variant: 'fn' },
  ],
  [
    { label: 'x²',  variant: 'fn' },
    { label: 'x³',  variant: 'fn' },
    { label: 'xⁿ',  variant: 'fn' },
    { label: '√x',  variant: 'fn' },
    { label: '∛x',  variant: 'fn' },
  ],
  [
    { label: '1/x', variant: 'fn' },
    { label: 'x!',  variant: 'fn' },
    { label: 'eˣ',  variant: 'fn' },
    { label: 'π',   variant: 'fn' },
    { label: 'e',   variant: 'fn' },
  ],
  [
    { label: 'AC', variant: 'util' },
    { label: '⌫',  variant: 'util' },
    { label: '(',  variant: 'util' },
    { label: ')',  variant: 'util' },
    { label: '÷',  variant: 'op'   },
  ],
  [
    { label: '7', variant: 'num' },
    { label: '8', variant: 'num' },
    { label: '9', variant: 'num' },
    { label: '%', variant: 'util' },
    { label: '×', variant: 'op'   },
  ],
  [
    { label: '4', variant: 'num' },
    { label: '5', variant: 'num' },
    { label: '6', variant: 'num' },
    { label: '±', variant: 'util' },
    { label: '−', variant: 'op'   },
  ],
  [
    { label: '1', variant: 'num' },
    { label: '2', variant: 'num' },
    { label: '3', variant: 'num' },
    { label: 'EE', variant: 'fn'  },
    { label: '+',  variant: 'op'  },
  ],
  [
    { label: '0', variant: 'num', span: 2 },
    { label: '.', variant: 'num' },
    { label: '=', variant: 'equals', span: 2 },
  ],
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity; // beyond IEEE-754 range
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

interface SciState extends ScientificCalculatorState {
  memory: number;
  error?: string;
}

const DEFAULT_STATE: SciState = {
  expression: '',
  result: '0',
  isRadians: true,
  memory: 0,
  history: [],
};

/** Functions that act immediately on the current value. */
const INSTANT = ['sin', 'cos', 'tan', 'ln', 'log', 'x²', 'x³', '√x', '∛x', '1/x', 'x!', 'eˣ'] as const;
type InstantFn = typeof INSTANT[number];

/** Apply an instant function. Returns a number or an error string. */
function applyInstant(fn: InstantFn, v: number, isRadians: boolean): number | string {
  const angle = isRadians ? v : (v * Math.PI) / 180;
  switch (fn) {
    case 'sin': return Math.sin(angle);
    case 'cos': return Math.cos(angle);
    case 'tan': {
      // cos ≈ 0 → tan is undefined (90°, 270°, …)
      if (Math.abs(Math.cos(angle)) < 1e-12) return 'tan is undefined here';
      return Math.tan(angle);
    }
    case 'ln':  return v <= 0 ? 'ln needs a positive number' : Math.log(v);
    case 'log': return v <= 0 ? 'log needs a positive number' : Math.log10(v);
    case 'x²':  return v * v;
    case 'x³':  return v * v * v;
    case '√x':  return v < 0 ? 'No real square root of a negative' : Math.sqrt(v);
    case '∛x':  return Math.cbrt(v);
    case '1/x': return v === 0 ? "Can't divide by zero" : 1 / v;
    case 'x!': {
      const f = factorial(v);
      return isNaN(f) ? 'Factorial needs a whole number ≥ 0' : f;
    }
    case 'eˣ':  return Math.exp(v);
  }
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function ScientificCalculatorScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<SciState>(
    'scientificCalculator',
    DEFAULT_STATE,
  );
  const haptic = useHaptic();
  const [showHistory, setShowHistory] = useState(false);

  const handleButton = useCallback(
    (btn: string) => {
      if (!btn) return;
      haptic(btn === '=' ? 'medium' : 'light');

      setState((prev) => {
        const { expression, result, isRadians, history, memory } = prev;
        const clearError = { error: undefined };

        // ── Memory ────────────────────────────────────────────────────────
        if (btn === 'MC') return { ...prev, memory: 0, ...clearError };
        if (btn === 'MR') return { ...prev, expression: expression + formatResult(memory), ...clearError };
        if (btn === 'M+' || btn === 'M−') {
          const current = evaluateExpression(expression || result);
          if (!current.ok) return { ...prev, error: current.error };
          return {
            ...prev,
            memory: btn === 'M+' ? memory + current.value : memory - current.value,
            ...clearError,
          };
        }

        if (btn === 'Rad') return { ...prev, isRadians: !isRadians, ...clearError };

        switch (btn) {
          case 'AC':
            return { ...DEFAULT_STATE, memory, isRadians, history };

          case '⌫':
            return { ...prev, expression: expression.slice(0, -1), ...clearError };

          case '±': {
            if (!expression) {
              const n = parseFloat(result);
              return isNaN(n) ? prev : { ...prev, result: formatResult(-n), ...clearError };
            }
            const wrapped = expression.match(/\(-(\d*\.?\d+)\)$/);
            if (wrapped) {
              return { ...prev, expression: expression.slice(0, wrapped.index) + wrapped[1], ...clearError };
            }
            const m = expression.match(/(\d*\.?\d+)$/);
            if (!m) return prev;
            return { ...prev, expression: `${expression.slice(0, m.index)}(-${m[1]})`, ...clearError };
          }

          case '%': {
            const current = evaluateExpression(expression || result);
            if (!current.ok) return { ...prev, error: current.error };
            return { ...prev, expression: '', result: formatResult(current.value / 100), ...clearError };
          }

          case 'π':  return { ...prev, expression: expression + '3.14159265359', ...clearError };
          case 'e':  return { ...prev, expression: expression + '2.71828182846', ...clearError };
          case 'EE': return { ...prev, expression: expression + 'e', ...clearError };
          case 'xⁿ': return { ...prev, expression: appendToken(expression, '^'), ...clearError };

          case '=': {
            if (!expression) return prev;
            const evaluated = evaluateExpression(expression);
            if (!evaluated.ok) return { ...prev, error: evaluated.error };
            const res = formatResult(evaluated.value);
            return {
              ...prev,
              expression: '',
              result: res,
              ...clearError,
              history: [{ expression, result: res, timestamp: Date.now() }, ...history].slice(0, 50),
            };
          }

          default: {
            if ((INSTANT as readonly string[]).includes(btn)) {
              // Evaluate what's on screen first, then transform it
              const current = evaluateExpression(expression || result);
              if (!current.ok) return { ...prev, error: current.error };

              const outcome = applyInstant(btn as InstantFn, current.value, isRadians);
              if (typeof outcome === 'string') return { ...prev, error: outcome };
              if (!isFinite(outcome)) return { ...prev, error: 'Result out of range' };

              const res = formatResult(outcome);
              const label = `${btn.replace('x', '')}(${formatResult(current.value)})`;
              return {
                ...prev,
                expression: '',
                result: res,
                ...clearError,
                history: [{ expression: label, result: res, timestamp: Date.now() }, ...history].slice(0, 50),
              };
            }

            const OPERATORS = ['÷', '×', '−', '+'];
            if (!expression && OPERATORS.includes(btn)) {
              return { ...prev, expression: result + btn, ...clearError };
            }
            if (btn === '(' || btn === ')') {
              return { ...prev, expression: expression + btn, ...clearError };
            }
            return { ...prev, expression: appendToken(expression, btn), ...clearError };
          }
        }
      });
    },
    [setState, haptic],
  );

  const copyResult = useCallback(async () => {
    await Clipboard.setStringAsync(state.expression || state.result);
    haptic('success');
    toast('Copied to clipboard');
  }, [state.expression, state.result, haptic]);

  // Variant → colours
  const bg = (v: Variant) => {
    switch (v) {
      case 'equals': return ACCENT;
      case 'op':     return colors.surface;
      case 'util':   return colors.muted;
      case 'mem':    return colors.muted;
      case 'fn':     return colors.surface;
      default:       return colors.card;
    }
  };
  const fg = (v: Variant) => {
    switch (v) {
      case 'equals': return onColour(ACCENT);
      case 'op':     return ACCENT;
      case 'fn':     return ACCENT;
      case 'mem':    return colors.textSecondary;
      case 'util':   return colors.textSecondary;
      default:       return colors.text;
    }
  };

  const livePreview = state.expression && !endsWithOperator(state.expression)
    ? evaluateExpression(state.expression)
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Scientific"
        utilityId="scientificCalculator"
        accentColor={ACCENT}
        subtitle={`${state.isRadians ? 'Radians' : 'Degrees'}${state.memory !== 0 ? ` · M ${formatResult(state.memory)}` : ''}`}
        onClearData={clearState}
      />

      {/* ── Display ─────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => state.history.length > 0 && setShowHistory((s) => !s)}
        onLongPress={copyResult}
        delayLongPress={350}
        style={styles.display}
      >
        <View style={styles.displayMeta}>
          <View style={[styles.badge, { backgroundColor: ACCENT + '1F', borderColor: ACCENT + '40' }]}>
            <Text style={[styles.badgeText, { color: ACCENT }]}>
              {state.isRadians ? 'RAD' : 'DEG'}
            </Text>
          </View>
          {state.memory !== 0 && (
            <View style={[styles.badge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>M</Text>
            </View>
          )}
          {state.history.length > 0 && (
            <Text style={[styles.historyToggleText, { color: colors.textTertiary }]}>
              {showHistory ? 'Hide history' : `${state.history.length} entries ›`}
            </Text>
          )}
        </View>

        {showHistory && (
          <Animated.View entering={FadeIn.duration(160)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyScroll}
              style={styles.historyView}
            >
              {state.history.slice(0, 12).map((h, i) => (
                <Pressable
                  key={`${h.timestamp}-${i}`}
                  onPress={() => {
                    setState((p) => ({ ...p, result: h.result, expression: '', error: undefined }));
                    setShowHistory(false);
                  }}
                  style={[styles.historyChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={[styles.historyExpr, { color: colors.textTertiary }]} numberOfLines={1}>
                    {h.expression}
                  </Text>
                  <Text style={[styles.historyRes, { color: colors.text }]} numberOfLines={1}>
                    {h.result}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <Plate
          offset={plate.flush}
          radius={radius.md}
          borderWidth={border.base}
          fill={colors.muted}
          borderColor={colors.subtle}
          contentStyle={styles.readout}
        >
        <Text
          style={[styles.expression, { color: state.error ? '#A6392B' : colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="head"
        >
          {state.error
            ? state.error
            : livePreview?.ok
              ? `= ${formatResult(livePreview.value)}`
              : ' '}
        </Text>

        <Text
          style={[styles.result, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.35}
        >
          {state.expression || state.result}
        </Text>
        </Plate>
      </Pressable>

      {/* ── Keypad ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.keypad}>
        {GRID.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn, bi) => {
              const label = btn.label === 'Rad' ? (state.isRadians ? 'Rad' : 'Deg') : btn.label;
              const span = btn.span ?? 1;
              const w = BTN * span + GAP * (span - 1);
              return (
                <CalcButton
                  key={`${ri}-${bi}`}
                  label={label}
                  width={w}
                  bg={bg(btn.variant)}
                  fg={fg(btn.variant)}
                  onPress={() => handleButton(btn.label)}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── CalcButton ────────────────────────────────────────────────────────────
function CalcButton({
  label, width, bg, fg, onPress,
}: {
  label: string; width: number; bg: string; fg: string; onPress: () => void;
}) {
  const len = label.length;
  const fs = len > 3 ? 11 : len > 2 ? 12.5 : len > 1 ? 14 : 18;

  return (
    <PressablePlate
      onPress={onPress}
      accessibilityLabel={label}
      offset={plate.low}
      radius={radius.sm}
      borderWidth={border.base}
      fill={bg}
      style={{ width: width - plate.low }}
      contentStyle={[styles.btn, { height: BTN - plate.low }]}
    >
      <Text style={[styles.btnLabel, { color: fg, fontSize: fs }]} numberOfLines={1}>
        {label}
      </Text>
    </PressablePlate>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  display: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
  /** Recessed readout, matching the basic calculator. */
  readout: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  displayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: border.base,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  historyToggleText: { fontSize: 12, marginLeft: 'auto' },
  historyView: { maxHeight: 64, marginBottom: 6 },
  historyScroll: { gap: 8, paddingVertical: 2 },
  historyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'flex-end',
    minWidth: 76,
    maxWidth: 150,
  },
  historyExpr: { fontSize: 10 },
  historyRes: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  expression: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    minHeight: 19,
    fontVariant: ['tabular-nums'],
  },
  result: {
    fontSize: 44,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: -1.5,
    lineHeight: 52,
    fontVariant: ['tabular-nums'],
  },

  keypad: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.sm,
    justifyContent: 'space-evenly',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  btn: { alignItems: 'center', justifyContent: 'center' },
  btnLabel: {
    fontWeight: '800',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
