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
import { spacing, radius } from '@/theme';
import type { SimpleCalculatorState } from '@/types';

// ─── Accent ────────────────────────────────────────────────────────────────
const ACCENT = '#8B5CF6';

// ─── Layout: 4 columns ─────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const COLS  = 4;
const H_PAD = spacing.base;
const GAP   = 12;
// Square button size derived purely from width
const BTN   = (SCREEN_W - H_PAD * 2 - GAP * (COLS - 1)) / COLS;

// ─── Types ─────────────────────────────────────────────────────────────────
// 'op'   → accent-tinted bg, accent text  (operators + =)
// 'util' → slightly tinted bg             (C, ⌫, %)
// 'num'  → surface bg, primary text       (digits + .)
type Variant = 'op' | 'util' | 'num';

type BtnDef = {
  label:   string;
  variant: Variant;
  rowSpan?: number;   // vertical span (used for = button)
  span?:   number;    // horizontal span
};

// ─── Grid ──────────────────────────────────────────────────────────────────
//
//   Col →    0      1      2      3
//   Row 0    C      ⌫      ÷      ×
//   Row 1    7      8      9      −
//   Row 2    4      5      6      +
//   Row 3    1      2      3      = ↓ (rowSpan 2)
//   Row 4    %      0      .      (= continues)
//
// The = button occupies col 3 rows 3+4. We handle it by rendering rows 3
// and 4 together in a single "split" row (left 3 cols each row stacked,
// right col = tall button).
//
// Implementation: render rows 0-2 normally (4 cols each), then a special
// bottom section for rows 3+4 that uses absolute-height on = button.

const TOP_ROWS: BtnDef[][] = [
  [
    { label: 'C',   variant: 'util' },
    { label: '⌫',   variant: 'util' },
    { label: '÷',   variant: 'op'   },
    { label: '×',   variant: 'op'   },
  ],
  [
    { label: '7',   variant: 'num' },
    { label: '8',   variant: 'num' },
    { label: '9',   variant: 'num' },
    { label: '−',   variant: 'op'  },
  ],
  [
    { label: '4',   variant: 'num' },
    { label: '5',   variant: 'num' },
    { label: '6',   variant: 'num' },
    { label: '+',   variant: 'op'  },
  ],
];

// bottom two rows rendered as a combined block so = can span both
const BOT_LEFT_ROWS: BtnDef[][] = [
  [
    { label: '1', variant: 'num' },
    { label: '2', variant: 'num' },
    { label: '3', variant: 'num' },
  ],
  [
    { label: '%', variant: 'util' },
    { label: '0', variant: 'num'  },
    { label: '.', variant: 'num'  },
  ],
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (!isFinite(n) || isNaN(n)) return 'Error';
  // Show up to 10 significant digits, strip trailing zeros
  return Number(parseFloat(n.toFixed(10))).toString();
}

const DEFAULT_STATE: SimpleCalculatorState = {
  expression: '',
  result: '0',
  history: [],
};

// ─── Screen ────────────────────────────────────────────────────────────────
export default function SimpleCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<SimpleCalculatorState>(
    'simpleCalculator',
    DEFAULT_STATE,
  );
  const [showHistory, setShowHistory] = useState(false);

  const handleButton = useCallback(
    (btn: string) => {
      if (!btn) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setState((prev) => {
        const { expression, result, history } = prev;
        const curVal = () => parseFloat(expression || result);

        switch (btn) {
          // ── Clear ──────────────────────────────────────────────────────
          case 'C':
            return DEFAULT_STATE;

          // ── Backspace ──────────────────────────────────────────────────
          case '⌫':
            if (!expression) return prev;
            return { ...prev, expression: expression.slice(0, -1) };

          // ── Negate ─────────────────────────────────────────────────────
          case '+/-': {
            const n = parseFloat(expression || result);
            if (isNaN(n)) return prev;
            const neg = (-n).toString();
            return expression
              ? { ...prev, expression: neg }
              : { ...prev, result: neg };
          }

          // ── Percent ────────────────────────────────────────────────────
          case '%': {
            const n = curVal();
            if (isNaN(n)) return prev;
            return { ...prev, expression: '', result: fmt(n / 100) };
          }

          // ── Evaluate ───────────────────────────────────────────────────
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
              return {
                ...prev,
                expression: '',
                result: res,
                history: [entry, ...history].slice(0, 50),
              };
            } catch {
              return { ...prev, expression: '', result: 'Error' };
            }
          }

          // ── Default: append token ──────────────────────────────────────
          default: {
            const OPERATORS = ['÷', '×', '−', '+'];
            const isOperator = OPERATORS.includes(btn);
            if (!expression) {
              // expression empty = just evaluated or fresh start
              // operator tap → seed with last result: "15" + "+" = "15+"
              // digit tap → start fresh
              const seed = isOperator ? result : '';
              return { ...prev, expression: seed + btn };
            }
            return { ...prev, expression: expression + btn };
          }
        }
      });
    },
    [setState],
  );

  // ── Button color helpers ─────────────────────────────────────────────────
  const btnBg = (v: Variant): string => {
    switch (v) {
      case 'op':   return colors.surface;   // same white as nums — diff only in text
      case 'util': return colors.card;      // slightly darker
      default:     return colors.surface;
    }
  };
  const btnFg = (v: Variant): string => {
    switch (v) {
      case 'op': return ACCENT;             // accent-colored text for operators
      default:   return colors.text;
    }
  };
  const utilFg = (v: Variant): string =>
    v === 'util' ? colors.textSecondary : btnFg(v);

  // ─── Render ───────────────────────────────────────────────────────────────
  // Tall = button height: 2 rows + 1 gap between them
  const TALL_BTN_H = BTN * 2 + GAP;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Calculator"
        utilityId="simpleCalculator"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      {/* ── Display ───────────────────────────────────────────────────────── */}
      <View style={styles.display}>
        {/* History toggle */}
        {state.history.length > 0 && (
          <Pressable
            onPress={() => setShowHistory((s) => !s)}
            style={styles.historyToggle}
          >
            <Text style={[styles.historyToggleText, { color: colors.textTertiary }]}>
              {showHistory ? 'Hide' : `${state.history.length} entries ›`}
            </Text>
          </Pressable>
        )}

        {/* History chips */}
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
                onPress={() => {
                  setState((p) => ({ ...p, result: h.result, expression: '' }));
                  setShowHistory(false);
                }}
                style={[
                  styles.historyChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.historyExpr, { color: colors.textSecondary }]}>
                  {h.expression}
                </Text>
                <Text style={[styles.historyRes, { color: colors.text }]}>
                  {h.result}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* While typing: show expression large + last result small above.
            After =   : expression clears, show computed result large. */}
        {state.expression ? (
          <>
            <Text
              style={[styles.expression, { color: colors.textTertiary }]}
              numberOfLines={1}
              ellipsizeMode="head"
            >
              {state.result !== '0' ? state.result : ' '}
            </Text>
            <Text
              style={[styles.result, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.3}
            >
              {state.expression}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.expression}>{' '}</Text>
            <Text
              style={[styles.result, { color: colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.3}
            >
              {state.result}
            </Text>
          </>
        )}
      </View>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* ── Keypad ────────────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(60).duration(280)}
        style={styles.keypad}
      >
        {/* Top rows: 0–2, all 4 columns, uniform */}
        {TOP_ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn) => (
              <CalcButton
                key={btn.label}
                label={btn.label}
                width={BTN}
                height={BTN}
                borderRadius={BTN / 2}
                bg={btnBg(btn.variant)}
                fg={btn.variant === 'util' ? utilFg(btn.variant) : btnFg(btn.variant)}
                colors={colors}
                onPress={() => handleButton(btn.label)}
              />
            ))}
          </View>
        ))}

        {/* Bottom block: rows 3+4 left (3 cols) + tall = right */}
        <View style={styles.botBlock}>
          {/* Left: two stacked rows of 3 */}
          <View style={styles.botLeft}>
            {BOT_LEFT_ROWS.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((btn) => (
                  <CalcButton
                    key={btn.label}
                    label={btn.label}
                    width={BTN}
                    height={BTN}
                    borderRadius={BTN / 2}
                    bg={btnBg(btn.variant)}
                    fg={btn.variant === 'util' ? utilFg(btn.variant) : btnFg(btn.variant)}
                    colors={colors}
                    onPress={() => handleButton(btn.label)}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Right: tall = button */}
          <CalcButton
            label="="
            width={BTN}
            height={TALL_BTN_H}
            borderRadius={BTN / 2}
            bg={ACCENT}
            fg="#fff"
            colors={colors}
            onPress={() => handleButton('=')}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── CalcButton ────────────────────────────────────────────────────────────
function CalcButton({
  label,
  width,
  height,
  borderRadius,
  bg,
  fg,
  colors,
  onPress,
}: {
  label: string;
  width: number;
  height: number;
  borderRadius: number;
  bg: string;
  fg: string;
  colors: any;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const charCount = label.length;
  const fs = charCount > 2 ? 14 : charCount > 1 ? 18 : 22;

  return (
    <Animated.View style={[anim, { width, height }]}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.88, { damping: 14, stiffness: 300 }, () => {
            scale.value = withSpring(1, { damping: 14, stiffness: 300 });
          });
          onPress();
        }}
        style={[
          styles.btn,
          {
            width,
            height,
            borderRadius,
            backgroundColor: bg,
            // Subtle shadow for the neumorphic-light feel from the reference
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
          },
        ]}
      >
        <Text
          style={[styles.btnLabel, { color: fg, fontSize: fs }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Display
  display: {
    flex: 1,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
  historyToggle: { alignSelf: 'flex-end', marginBottom: 2 },
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
    textAlign: 'right',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  result: {
    fontSize: 64,
    fontWeight: '200',
    textAlign: 'right',
    letterSpacing: -3,
    lineHeight: 70,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: H_PAD,
    marginBottom: spacing.sm,
  },

  // Keypad
  keypad: {
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.md,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Bottom combined block (rows 3+4 + tall =)
  botBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  botLeft: {
    gap: GAP,
    // 3 buttons + 2 gaps
    width: BTN * 3 + GAP * 2,
  },

  // Button
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontWeight: '400',
    includeFontPadding: false,
    textAlign: 'center',
  },
});