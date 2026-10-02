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
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader, HeaderKey } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Plate, PressablePlate, useHaptic, toast, onColour } from '@/components/ui';
import { spacing, radius, typography, border, plate } from '@/theme';
import { evaluateExpression, formatResult, appendToken, endsWithOperator } from '@/utils/expression';
import type { SimpleCalculatorState } from '@/types';

const ACCENT = '#E2561E';

// ─── Layout: a plain 4×5 grid, sized from the screen width ─────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const COLS  = 4;
const H_PAD = spacing.base;
const GAP   = 12;
const BTN   = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

type Variant = 'op' | 'util' | 'num' | 'equals';
type BtnDef = { label: string; variant: Variant };

const GRID: BtnDef[][] = [
  [
    { label: 'C',   variant: 'util' },
    { label: '⌫',   variant: 'util' },
    { label: '%',   variant: 'util' },
    { label: '÷',   variant: 'op'   },
  ],
  [
    { label: '7', variant: 'num' },
    { label: '8', variant: 'num' },
    { label: '9', variant: 'num' },
    { label: '×', variant: 'op'  },
  ],
  [
    { label: '4', variant: 'num' },
    { label: '5', variant: 'num' },
    { label: '6', variant: 'num' },
    { label: '−', variant: 'op'  },
  ],
  [
    { label: '1', variant: 'num' },
    { label: '2', variant: 'num' },
    { label: '3', variant: 'num' },
    { label: '+', variant: 'op'  },
  ],
  [
    { label: '±', variant: 'util'   },
    { label: '0', variant: 'num'    },
    { label: '.', variant: 'num'    },
    { label: '=', variant: 'equals' },
  ],
];

interface CalcState extends SimpleCalculatorState {
  /** Set when the last "=" failed, so the display can explain why. */
  error?: string;
}

const DEFAULT_STATE: CalcState = {
  expression: '',
  result: '0',
  history: [],
};

/**
 * Percent, the way a pocket calculator does it:
 *   200 + 10%  → 200 + 20   (percentage *of the left operand*)
 *   200 × 10%  → 200 × 0.1  (plain division by 100)
 * Returns the rewritten expression, or null when there is nothing to convert.
 */
function applyPercent(expression: string, fallback: string): string | null {
  const source = expression || fallback;
  const match = source.match(/^(.*?)([+−×÷]?)(\d*\.?\d+)$/);
  if (!match) return null;

  const [, head, operator, numberStr] = match;
  const value = parseFloat(numberStr);
  if (isNaN(value)) return null;

  if (operator === '+' || operator === '−') {
    const base = evaluateExpression(head);
    if (!base.ok) return null;
    return `${head}${operator}${formatResult((base.value * value) / 100)}`;
  }
  return `${head}${operator}${formatResult(value / 100)}`;
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function SimpleCalculatorScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<CalcState>(
    'calculator',
    DEFAULT_STATE,
  );
  const haptic = useHaptic();
  const [showHistory, setShowHistory] = useState(false);

  const handleButton = useCallback(
    (btn: string) => {
      if (!btn) return;
      haptic(btn === '=' ? 'medium' : 'light');

      setState((prev) => {
        const { expression, result, history } = prev;

        switch (btn) {
          case 'C':
            return { ...DEFAULT_STATE, history };

          case '⌫':
            if (!expression) return { ...prev, error: undefined };
            return { ...prev, expression: expression.slice(0, -1), error: undefined };

          case '±': {
            // Negate the number currently being typed (or the last result)
            if (!expression) {
              const n = parseFloat(result);
              if (isNaN(n)) return prev;
              return { ...prev, result: formatResult(-n), error: undefined };
            }
            // Already negated → unwrap, so ± toggles instead of nesting
            const wrapped = expression.match(/\(-(\d*\.?\d+)\)$/);
            if (wrapped) {
              return {
                ...prev,
                expression: expression.slice(0, wrapped.index) + wrapped[1],
                error: undefined,
              };
            }
            const m = expression.match(/(\d*\.?\d+)$/);
            if (!m) return prev;
            return {
              ...prev,
              expression: `${expression.slice(0, m.index)}(-${m[1]})`,
              error: undefined,
            };
          }

          case '%': {
            const next = applyPercent(expression, result);
            if (!next) return prev;
            return { ...prev, expression: next, error: undefined };
          }

          case '=': {
            if (!expression) return prev;
            const evaluated = evaluateExpression(expression);
            if (!evaluated.ok) {
              return { ...prev, error: evaluated.error };
            }
            const res = formatResult(evaluated.value);
            return {
              expression: '',
              result: res,
              error: undefined,
              history: [
                { expression, result: res, timestamp: Date.now() },
                ...history,
              ].slice(0, 50),
            };
          }

          default: {
            const OPERATORS = ['÷', '×', '−', '+'];
            // Starting with an operator continues from the last result
            if (!expression && OPERATORS.includes(btn)) {
              return { ...prev, expression: result + btn, error: undefined };
            }
            return { ...prev, expression: appendToken(expression, btn), error: undefined };
          }
        }
      });
    },
    [setState, haptic],
  );

  const copyResult = useCallback(async () => {
    const value = state.expression || state.result;
    await Clipboard.setStringAsync(value);
    haptic('success');
    toast('Copied to clipboard');
  }, [state.expression, state.result, haptic]);

  // ── Button colours ───────────────────────────────────────────────────────
  const btnBg = (v: Variant): string => {
    switch (v) {
      case 'equals': return ACCENT;
      case 'op':     return colors.surface;
      case 'util':   return colors.muted;
      default:       return colors.card;
    }
  };
  const btnFg = (v: Variant): string => {
    switch (v) {
      case 'equals': return onColour(ACCENT);
      case 'op':     return ACCENT;
      case 'util':   return colors.textSecondary;
      default:       return colors.text;
    }
  };

  const liveResult = state.expression && !endsWithOperator(state.expression)
    ? evaluateExpression(state.expression)
    : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Calculator"
        utilityId="calculator"
        accentColor={ACCENT}
        onClearData={clearState}
        rightAction={
          state.history.length > 0 ? (
            <HeaderKey
              icon="time-outline"
              label="Toggle calculation history"
              fg={onColour(ACCENT)}
              active={showHistory}
              onPress={() => setShowHistory((s) => !s)}
            />
          ) : undefined
        }
      />

      {/* ── History strip ──────────────────────────────────────────────── */}
      {showHistory && state.history.length > 0 && (
        <Animated.View entering={FadeIn.duration(180)} style={[styles.historyBar, { borderBottomColor: colors.border }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScroll}
          >
            {state.history.slice(0, 12).map((h, i) => (
              <Pressable
                key={`${h.timestamp}-${i}`}
                onPress={() => {
                  haptic('light');
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

      {/* ── Readout ────────────────────────────────────────────────────── */}
      <Pressable style={styles.display} onLongPress={copyResult} delayLongPress={350}>
        <Plate
          offset={plate.flush}
          radius={radius.md}
          borderWidth={border.base}
          fill={colors.muted}
          borderColor={colors.subtle}
          contentStyle={styles.readout}
        >
          {/* Secondary line: live preview while typing, last result otherwise */}
          <Text
          style={[
            styles.secondary,
            { color: state.error ? '#A6392B' : colors.textTertiary },
          ]}
          numberOfLines={1}
          ellipsizeMode="head"
        >
          {state.error
            ? state.error
            : liveResult?.ok
              ? `= ${formatResult(liveResult.value)}`
              : state.expression
                ? ' '
                : state.history[0]
                  ? state.history[0].expression
                  : ' '}
        </Text>

        <Text
          style={[styles.primary, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.3}
          selectable
        >
          {state.expression || state.result}
        </Text>

          <Text style={[styles.copyHint, { color: colors.textTertiary }]}>
            Long press to copy
          </Text>
        </Plate>
      </Pressable>

      {/* ── Keypad ─────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.keypad}>
        {GRID.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn) => (
              <CalcButton
                key={btn.label}
                label={btn.label}
                size={BTN}
                bg={btnBg(btn.variant)}
                fg={btnFg(btn.variant)}
                onPress={() => handleButton(btn.label)}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── CalcButton ────────────────────────────────────────────────────────────
/**
 * A moulded key. It sits proud of the panel on its own hard shadow and sinks
 * flush when pressed — the one interaction motif used throughout Kit.
 */
function CalcButton({
  label,
  size,
  bg,
  fg,
  onPress,
}: {
  label: string;
  size: number;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  return (
    <PressablePlate
      onPress={onPress}
      accessibilityLabel={label}
      offset={plate.base}
      radius={radius.md}
      borderWidth={border.base}
      fill={bg}
      style={{ width: size - plate.base }}
      contentStyle={[styles.btn, { height: size - plate.base }]}
    >
      <Text style={[styles.btnLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </PressablePlate>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // History
  historyBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  historyScroll: { gap: spacing.sm, padding: spacing.md },
  historyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'flex-end',
    minWidth: 84,
    maxWidth: 160,
  },
  historyExpr: { fontSize: 10 },
  historyRes: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },

  // Display
  display: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    justifyContent: 'flex-end',
  },
  /** The recessed readout the numbers sit in. */
  readout: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  secondary: {
    fontSize: 15,
    textAlign: 'right',
    minHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  primary: {
    fontSize: 58,
    fontWeight: '800',
    textAlign: 'right',
    letterSpacing: -2,
    lineHeight: 66,
    fontVariant: ['tabular-nums'],
  },
  copyHint: {
    fontSize: 8.5,
    textAlign: 'right',
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Keypad
  keypad: {
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  btn: { alignItems: 'center', justifyContent: 'center' },
  btnLabel: {
    fontSize: 24,
    fontWeight: '800',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
