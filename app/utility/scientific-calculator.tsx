import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { ScientificCalculatorState } from '@/types';

// ─── Accent ────────────────────────────────────────────────────────────────
const ACCENT = '#8B5CF6';

// ─── Layout: 5 columns, buttons sized from available width ─────────────────
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLS   = 5;
const H_PAD  = spacing.base;          // left/right padding
const GAP    = 10;                     // gap between buttons (px)
// Button size: fill width across 5 cols with gaps
const BTN    = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

// ─── Types ─────────────────────────────────────────────────────────────────
type Variant = 'op' | 'util' | 'fn' | 'num';
type BtnDef  = { label: string; span?: number; variant: Variant };

// ─── Grid: 5 cols × 8 rows ──────────────────────────────────────────────────
//
//  Row 0  [scientific fns group A]  sin   cos   tan   ln    log
//  Row 1  [scientific fns group B]  x²    x³    xⁿ    √x    ∛x
//  Row 2  [scientific fns group C]  1/x   x!    eˣ    π     e
//  Row 3  [utility + memory]        AC    ⌫     (     )     ÷
//  Row 4  [numpad top]              7     8     9     ×     %
//  Row 5  [numpad mid]              4     5     6     −     +/-
//  Row 6  [numpad bot]              1     2     3     +     Rad
//  Row 7  [numpad base]             0(×2) .     =
//
const GRID: BtnDef[][] = [
  [
    { label: 'sin',  variant: 'fn' },
    { label: 'cos',  variant: 'fn' },
    { label: 'tan',  variant: 'fn' },
    { label: 'ln',   variant: 'fn' },
    { label: 'log',  variant: 'fn' },
  ],
  [
    { label: 'x²',   variant: 'fn' },
    { label: 'x³',   variant: 'fn' },
    { label: 'xⁿ',   variant: 'fn' },
    { label: '√x',   variant: 'fn' },
    { label: '∛x',   variant: 'fn' },
  ],
  [
    { label: '1/x',  variant: 'fn' },
    { label: 'x!',   variant: 'fn' },
    { label: 'eˣ',   variant: 'fn' },
    { label: 'π',    variant: 'fn' },
    { label: 'e',    variant: 'fn' },
  ],
  [
    { label: 'AC',   variant: 'util' },
    { label: '⌫',    variant: 'util' },
    { label: '(',    variant: 'util' },
    { label: ')',    variant: 'util' },
    { label: '÷',    variant: 'op'   },
  ],
  [
    { label: '7',    variant: 'num' },
    { label: '8',    variant: 'num' },
    { label: '9',    variant: 'num' },
    { label: '%',    variant: 'util'},
    { label: '×',    variant: 'op'  },

  ],
  [
    { label: '4',    variant: 'num' },
    { label: '5',    variant: 'num' },
    { label: '6',    variant: 'num' },
      { label: '+/-',  variant: 'util'},
    { label: '−',    variant: 'op'  },
  ],
  [
    { label: '1',    variant: 'num' },
    { label: '2',    variant: 'num' },
    { label: '3',    variant: 'num' },
      { label: 'Rad',  variant: 'fn'  },
    { label: '+',    variant: 'op'  },
  
  ],
  [
    { label: '0',    variant: 'num', span: 2 },
    { label: '.',    variant: 'num' },
    { label: 'EE',   variant: 'fn'  },
    { label: '=',    variant: 'op'  },
  ],
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function fmt(n: number): string {
  if (!isFinite(n) || isNaN(n)) return 'Error';
  return Number(parseFloat(n.toFixed(10))).toString();
}

const DEFAULT_STATE: ScientificCalculatorState = {
  expression: '',
  result: '0',
  isRadians: true,
  history: [],
};

// ─── Screen ────────────────────────────────────────────────────────────────
export default function ScientificCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ScientificCalculatorState>(
    'scientificCalculator',
    DEFAULT_STATE,
  );
  const [memory, setMemory] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const handleButton = useCallback(
    (btn: string) => {
      if (!btn) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Memory
      if (btn === 'mc') { setMemory(0); return; }
      if (btn === 'mr') { setState((p) => ({ ...p, expression: p.expression + memory.toString() })); return; }
      if (btn === 'm+') { const v = parseFloat(state.result); if (!isNaN(v)) setMemory((m) => m + v); return; }
      if (btn === 'm-') { const v = parseFloat(state.result); if (!isNaN(v)) setMemory((m) => m - v); return; }

      // Mode toggle
      if (btn === 'Rad') { setState((p) => ({ ...p, isRadians: !p.isRadians })); return; }

      setState((prev) => {
        const { expression, result, isRadians, history } = prev;
        const toRad = (d: number) => (d * Math.PI) / 180;
        const curVal = () => parseFloat(expression || result);

        const applyFn = (fn: string): string => {
          const v = curVal();
          if (isNaN(v)) return 'Error';
          const r = isRadians ? v : toRad(v);
          switch (fn) {
            case 'sin':  return fmt(Math.sin(r));
            case 'cos':  return fmt(Math.cos(r));
            case 'tan':  return fmt(Math.tan(r));
            case 'ln':   return v <= 0 ? 'Error' : fmt(Math.log(v));
            case 'log':  return v <= 0 ? 'Error' : fmt(Math.log10(v));
            case 'x²':   return fmt(v * v);
            case 'x³':   return fmt(v * v * v);
            case '√x':   return v < 0 ? 'Error' : fmt(Math.sqrt(v));
            case '∛x':   return fmt(Math.cbrt(v));
            case '1/x':  return v === 0 ? 'Error' : fmt(1 / v);
            case 'x!':   return fmt(factorial(v));
            case 'eˣ':   return fmt(Math.exp(v));
            default:     return expression;
          }
        };

        const INSTANT = ['sin','cos','tan','ln','log','x²','x³','√x','∛x','1/x','x!','eˣ'];

        switch (btn) {
          case 'AC':
            return DEFAULT_STATE;
          case '⌫':
            return { ...prev, expression: expression.slice(0, -1) };
          case '+/-': {
            const n = parseFloat(expression || result);
            if (isNaN(n)) return prev;
            const neg = (-n).toString();
            return expression ? { ...prev, expression: neg } : { ...prev, result: neg };
          }
          case '%': {
            const n = curVal();
            if (isNaN(n)) return prev;
            return { ...prev, expression: '', result: fmt(n / 100) };
          }
          case 'π':
            return { ...prev, expression: expression + Math.PI.toFixed(10) };
          case 'e':
            return { ...prev, expression: expression + Math.E.toFixed(10) };
          case 'EE':
            return { ...prev, expression: expression + 'e' };
          case 'xⁿ':
            return { ...prev, expression: expression + '**' };
          case '=': {
            if (!expression) return prev;
            try {
              const sanitized = expression
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/−/g, '-');
              // eslint-disable-next-line no-eval
              const raw = eval(sanitized);
              const res = fmt(raw);
              const entry = { expression, result: res, timestamp: Date.now() };
              return { ...prev, expression: '', result: res, history: [entry, ...history].slice(0, 50) };
            } catch {
              return { ...prev, expression: '', result: 'Error' };
            }
          }
          default:
            if (INSTANT.includes(btn)) {
              const res = applyFn(btn);
              const entry = { expression: `${btn}(${expression || result})`, result: res, timestamp: Date.now() };
              return { ...prev, expression: '', result: res, history: [entry, ...history].slice(0, 50) };
            }
            return { ...prev, expression: expression + btn };
        }
      });
    },
    [setState, memory, state.result],
  );

  // Variant → colors
  const bg = (v: Variant) => {
    switch (v) {
      case 'op':   return ACCENT;
      case 'util': return colors.card;
      case 'fn':   return colors.muted;
      default:     return colors.surface;
    }
  };
  const fg = (v: Variant) => {
    switch (v) {
      case 'op': return '#fff';
      case 'fn': return ACCENT;
      default:   return colors.text;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Scientific Calc"
        utilityId="scientificCalculator"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      {/* ── Display ─────────────────────────────────────────────────────── */}
      <Pressable
        onPress={() => state.history.length > 0 && setShowHistory((s) => !s)}
        style={styles.display}
      >
        {/* top row: mode badge + memory indicator */}
        <View style={styles.displayMeta}>
          <View style={[styles.modeBadge, { backgroundColor: ACCENT + '22', borderColor: ACCENT + '44' }]}>
            <Text style={[styles.modeBadgeText, { color: ACCENT }]}>
              {state.isRadians ? 'RAD' : 'DEG'}
            </Text>
          </View>
          {memory !== 0 && (
            <View style={[styles.modeBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.modeBadgeText, { color: colors.textSecondary }]}>M</Text>
            </View>
          )}
          {state.history.length > 0 && (
            <Pressable onPress={() => setShowHistory((s) => !s)} style={styles.historyToggle}>
              <Text style={[styles.historyToggleText, { color: colors.textTertiary }]}>
                {showHistory ? 'Hide history' : `${state.history.length} entries ›`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* History inline */}
        {showHistory && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScroll}
            style={styles.historyView}
          >
            {state.history.slice(0, 8).map((h, i) => (
              <Pressable
                key={i}
                onPress={() => { setState((p) => ({ ...p, result: h.result, expression: '' })); setShowHistory(false); }}
                style={[styles.historyChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.historyExpr, { color: colors.textSecondary }]}>{h.expression}</Text>
                <Text style={[styles.historyRes,  { color: colors.text        }]}>{h.result}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Expression */}
        <Text
          style={[styles.expression, { color: colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="head"
        >
          {state.expression || ' '}
        </Text>

        {/* Result */}
        <Text
          style={[styles.result, { color: colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.35}
        >
          {state.result}
        </Text>
      </Pressable>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── Keypad ──────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(280)}
        style={styles.keypad}
      >
        {GRID.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn, bi) => {
              const label = btn.label === 'Rad'
                ? (state.isRadians ? 'Rad' : 'Deg')
                : btn.label;
              const w = BTN * (btn.span ?? 1) + GAP * ((btn.span ?? 1) - 1);
              return (
                <CalcButton
                  key={`${ri}-${bi}`}
                  label={label}
                  width={w}
                  bg={bg(btn.variant)}
                  fg={fg(btn.variant)}
                  isFn={btn.variant === 'fn'}
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
  label, width, bg, fg, isFn, onPress,
}: {
  label: string; width: number; bg: string; fg: string; isFn: boolean; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const charCount = label.length;
  const fs = charCount > 4 ? 10 : charCount > 3 ? 11 : charCount > 2 ? 13 : charCount > 1 ? 15 : 18;

  return (
    <Animated.View style={[anim, { width, height: BTN }]}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.86, { damping: 14, stiffness: 280 }, () => {
            scale.value = withSpring(1, { damping: 14, stiffness: 280 });
          });
          onPress();
        }}
        style={[
          styles.btn,
          {
            width,
            height: BTN,
            borderRadius: BTN / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.btnLabel, { color: fg, fontSize: fs }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Display — fixed compact region
  display: {
    paddingHorizontal: H_PAD,
    paddingTop: 6,
    paddingBottom: 8,
    justifyContent: 'flex-end',
  },
  displayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  historyToggle: { marginLeft: 'auto' },
  historyToggleText: { fontSize: 12 },
  historyView: { maxHeight: 68, marginBottom: 6 },
  historyScroll: { gap: 8, paddingVertical: 2 },
  historyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
    minWidth: 72,
  },
  historyExpr: { fontSize: 10 },
  historyRes:  { fontSize: 14, fontWeight: '600', letterSpacing: -0.3 },
  expression: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'right',
    letterSpacing: -0.3,
    marginBottom: 0,
  },
  result: {
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'right',
    letterSpacing: -2,
    lineHeight: 54,
  },

  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: H_PAD, marginBottom: 6 },

  // Keypad
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

  // Button
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontWeight: '500',
    includeFontPadding: false,
    textAlign: 'center',
  },
});