import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Vibration,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { CalculatorState } from '@/types';

const { width } = Dimensions.get('window');
const PAD_H = spacing.base;
const GAP = 7;
const BTN_SIZE = (width - PAD_H * 2 - GAP * 3) / 4;
const BTN_HEIGHT = BTN_SIZE * 0.82;

// ─── Default state ─────────────────────────────────────────────────────────
const DEFAULT_STATE: CalculatorState = {
  display: '0',
  expression: '',
  result: '0',
  memory: 0,
  hasMemory: false,
  justEvaluated: false,
  history: [],
};

// ─── Button layout — mirrors the reference image exactly ──────────────────
//  Row 0: memory row
//  Row 1: function row
//  Row 2–5: number + operator rows
const BUTTON_ROWS: Array<Array<{ label: string; type: string; wide?: boolean }>> = [
  [
    { label: 'CM',   type: 'memory' },
    { label: 'RM',   type: 'memory' },
    { label: 'M−',   type: 'memory' },
    { label: 'M+',   type: 'memory' },
  ],
  [
    { label: 'C/CE', type: 'utility' },
    { label: '±',    type: 'utility' },
    { label: '%',    type: 'utility' },
    { label: '÷',    type: 'operator' },
  ],
  [
    { label: '7', type: 'digit' },
    { label: '8', type: 'digit' },
    { label: '9', type: 'digit' },
    { label: '×', type: 'operator' },
  ],
  [
    { label: '4', type: 'digit' },
    { label: '5', type: 'digit' },
    { label: '6', type: 'digit' },
    { label: '−', type: 'operator' },
  ],
  [
    { label: '1', type: 'digit' },
    { label: '2', type: 'digit' },
    { label: '3', type: 'digit' },
    { label: '+', type: 'operator' },
  ],
  [
    { label: '0',  type: 'digit', wide: false },
    { label: '00', type: 'digit' },
    { label: '.',  type: 'digit' },
    { label: '=',  type: 'equals' },
  ],
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function safeEval(expr: string): number | null {
  try {
    const sanitized = expr
      .replace(/÷/g, '/')
      .replace(/×/g, '*')
      .replace(/−/g, '-');
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
}

function formatDisplay(value: string): string {
  // Add thousands separators to integer part only
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  // Keep original string if it ends with operator or dot
  return value;
}

function cleanNum(n: number): string {
  return Number(parseFloat(n.toFixed(10))).toString();
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function CalculatorScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<CalculatorState>(
    'calculator',
    DEFAULT_STATE
  );
  const [showHistory, setShowHistory] = useState(false);

  // Shake animation for error
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const handleButton = useCallback(
    (label: string, type: string) => {
      Haptics.impactAsync(
        type === 'operator' || type === 'equals'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );

      setState((prev) => {
        const {
          display, expression, result, memory,
          hasMemory, justEvaluated, history,
        } = prev;

        // ── Memory operations ──────────────────────────────────────
        if (type === 'memory') {
          const currentVal = parseFloat(display) || 0;
          switch (label) {
            case 'CM': // Clear Memory
              return { ...prev, memory: 0, hasMemory: false };
            case 'RM': // Recall Memory
              return {
                ...prev,
                display: cleanNum(memory),
                expression: justEvaluated ? '' : expression,
                justEvaluated: false,
              };
            case 'M+':
              return { ...prev, memory: memory + currentVal, hasMemory: true };
            case 'M−':
              return { ...prev, memory: memory - currentVal, hasMemory: true };
          }
          return prev;
        }

        // ── Clear / CE ─────────────────────────────────────────────
        if (label === 'C/CE') {
          // CE if mid-expression, C (full reset) if at start or just evaluated
          if (expression && !justEvaluated) {
            // Clear Entry: remove last number entered
            const trimmed = expression.replace(/[\d.]+$/, '');
            return {
              ...prev,
              expression: trimmed,
              display: trimmed || '0',
            };
          }
          return { ...DEFAULT_STATE, memory, hasMemory };
        }

        // ── Sign toggle ────────────────────────────────────────────
        if (label === '±') {
          const val = parseFloat(display) * -1;
          const valStr = cleanNum(val);
          if (justEvaluated) {
            return { ...prev, display: valStr, expression: valStr, justEvaluated: false };
          }
          // Replace last number in expression with negated value
          const newExpr = expression.replace(/(-?[\d.]+)$/, valStr);
          return { ...prev, display: valStr, expression: newExpr };
        }

        // ── Percent ────────────────────────────────────────────────
        if (label === '%') {
          const val = parseFloat(display) / 100;
          const valStr = cleanNum(val);
          if (justEvaluated) {
            return { ...prev, display: valStr, expression: valStr, justEvaluated: false };
          }
          const newExpr = expression.replace(/(-?[\d.]+)$/, valStr);
          return { ...prev, display: valStr, expression: newExpr };
        }

        // ── Equals ─────────────────────────────────────────────────
        if (label === '=') {
          if (!expression) return prev;
          const computed = safeEval(expression);
          if (computed === null) {
            shake();
            return { ...prev, display: 'Error' };
          }
          const resStr = cleanNum(computed);
          return {
            ...prev,
            display: resStr,
            expression: '',
            result: resStr,
            justEvaluated: true,
            history: [
              { expression, result: resStr, timestamp: Date.now() },
              ...history,
            ].slice(0, 50),
          };
        }

        // ── Operators ──────────────────────────────────────────────
        if (type === 'operator') {
          const operators = ['÷', '×', '−', '+'];
          const lastChar = expression.slice(-1);
          const lastIsOp = operators.includes(lastChar);

          if (justEvaluated) {
            // Continue from result
            return {
              ...prev,
              expression: result + label,
              display: result,
              justEvaluated: false,
            };
          }
          if (lastIsOp) {
            // Replace operator
            return {
              ...prev,
              expression: expression.slice(0, -1) + label,
            };
          }
          // Auto-evaluate if full expression
          if (expression) {
            const computed = safeEval(expression);
            const base = computed !== null ? cleanNum(computed) : display;
            return {
              ...prev,
              expression: base + label,
              display: base,
              justEvaluated: false,
            };
          }
          return {
            ...prev,
            expression: display + label,
            justEvaluated: false,
          };
        }

        // ── Digits & dot ───────────────────────────────────────────
        if (type === 'digit') {
          // After evaluate, start fresh number
          if (justEvaluated) {
            if (label === '.') {
              return { ...prev, display: '0.', expression: '0.', justEvaluated: false };
            }
            return { ...prev, display: label, expression: label, justEvaluated: false };
          }

          // Decimal guard: don't allow two dots in current number segment
          if (label === '.') {
            const segments = expression.split(/[÷×−+]/);
            const last = segments[segments.length - 1];
            if (last.includes('.')) return prev;
          }

          // Leading zero guard
          const segments = expression.split(/[÷×−+]/);
          const lastSeg = segments[segments.length - 1];
          let newExpr = expression;

          if (label === '00') {
            if (!lastSeg || lastSeg === '0') return prev; // don't allow 000
            newExpr = expression + '00';
          } else {
            if (lastSeg === '0' && label !== '.') {
              // replace leading zero
              newExpr = expression.slice(0, -1) + label;
            } else {
              newExpr = expression + label;
            }
          }

          // Update display (show current number being typed)
          const newSegments = newExpr.split(/[÷×−+]/);
          const newDisplay = newSegments[newSegments.length - 1] || '0';

          return {
            ...prev,
            expression: newExpr,
            display: newDisplay,
            justEvaluated: false,
          };
        }

        return prev;
      });
    },
    [setState, shake]
  );

  // ─── Display values ──────────────────────────────────────────────────
  const mainDisplay = state.display;
  const subDisplay = state.expression
    ? state.justEvaluated
      ? state.expression + ' ='
      : state.expression
    : '';

  const displayFontSize = mainDisplay.length > 12 ? 28
    : mainDisplay.length > 9 ? 36
    : mainDisplay.length > 6 ? 44
    : 56;

  // Theme-derived button colors
  const btnDigitBg = isDark ? colors.card : colors.muted;
  const btnUtilBg = isDark ? colors.muted : colors.subtle;
  const btnMemBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const btnOperatorBg = colors.accent + '22';
  const btnEqualsBg = colors.accent;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Calculator"
        utilityId="calculator"
        accentColor={colors.accent}
        onClearData={clearState}
      />

      {/* ── Display panel ──────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(40).duration(280)}
        style={[styles.displayPanel, { backgroundColor: colors.surface }]}
      >
        {/* Memory register indicator */}
        <View style={styles.memRow}>
          {state.hasMemory && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.memBadge, { backgroundColor: colors.accent + '25', borderColor: colors.accent + '50' }]}
            >
              <Text style={[styles.memBadgeText, { color: colors.accent }]}>
                M = {cleanNum(state.memory)}
              </Text>
            </Animated.View>
          )}
          {/* History toggle */}
          <Pressable
            onPress={() => setShowHistory(!showHistory)}
            style={[styles.histToggle, { backgroundColor: colors.muted }]}
            hitSlop={8}
          >
            <Ionicons
              name={showHistory ? 'chevron-down' : 'time-outline'}
              size={14}
              color={colors.textSecondary}
            />
            {!showHistory && state.history.length > 0 && (
              <Text style={[styles.histCount, { color: colors.textSecondary }]}>
                {state.history.length}
              </Text>
            )}
          </Pressable>
        </View>

        {/* History panel */}
        {showHistory && state.history.length > 0 && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.historyPanel}>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 120 }}>
              {state.history.slice(0, 8).map((h, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setState((p) => ({ ...p, display: h.result, expression: '', result: h.result, justEvaluated: true }));
                    setShowHistory(false);
                  }}
                  style={[styles.historyRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.historyExprText, { color: colors.textTertiary }]} numberOfLines={1}>
                    {h.expression}
                  </Text>
                  <Text style={[styles.historyResultText, { color: colors.text }]}>
                    = {h.result}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Expression line */}
        <Text
          style={[styles.expressionLine, { color: colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="head"
        >
          {subDisplay || ' '}
        </Text>

        {/* Main result / display */}
        <Animated.Text
          style={[
            styles.mainDisplay,
            { color: colors.text, fontSize: displayFontSize },
            shakeStyle,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {mainDisplay}
        </Animated.Text>
      </Animated.View>

      {/* ── Keypad ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(300)}
        style={styles.keypad}
      >
        {BUTTON_ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn) => {
              let bg: string;
              let fg: string;
              let borderColor: string;

              switch (btn.type) {
                case 'memory':
                  bg = btnMemBg;
                  fg = colors.accent;
                  borderColor = colors.accent + '30';
                  break;
                case 'utility':
                  bg = btnUtilBg;
                  fg = colors.text;
                  borderColor = colors.border;
                  break;
                case 'operator':
                  bg = btnOperatorBg;
                  fg = colors.accent;
                  borderColor = colors.accent + '40';
                  break;
                case 'equals':
                  bg = btnEqualsBg;
                  fg = '#fff';
                  borderColor = colors.accent;
                  break;
                default: // digit
                  bg = btnDigitBg;
                  fg = colors.text;
                  borderColor = colors.border;
              }

              return (
                <CalcButton
                  key={btn.label}
                  label={btn.label}
                  type={btn.type}
                  bg={bg}
                  fg={fg}
                  borderColor={borderColor}
                  onPress={() => handleButton(btn.label, btn.type)}
                  colors={colors}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Button component ──────────────────────────────────────────────────────
function CalcButton({
  label,
  type,
  bg,
  fg,
  borderColor,
  onPress,
  colors,
}: {
  label: string;
  type: string;
  bg: string;
  fg: string;
  borderColor: string;
  onPress: () => void;
  colors: any;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.87, { damping: 18, stiffness: 400 });
    opacity.value = withTiming(0.85, { duration: 60 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 100 });
    onPress();
  };

  const isMemory = type === 'memory';
  const fontSize = isMemory ? 13
    : label === 'C/CE' ? 15
    : label.length > 1 ? 16
    : 22;

  return (
    <Animated.View style={[animStyle, styles.btnWrapper]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.btn,
          {
            backgroundColor: bg,
            borderColor,
            height: isMemory ? BTN_HEIGHT * 0.75 : BTN_HEIGHT,
          },
        ]}
      >
        <Text
          style={[
            styles.btnLabel,
            {
              color: fg,
              fontSize,
              fontWeight: type === 'equals' || type === 'operator' ? '700' : '600',
              letterSpacing: isMemory ? 0.5 : 0,
            },
          ]}
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

  // Display panel
  displayPanel: {
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    minHeight: 148,
    justifyContent: 'flex-end',
    gap: 6,
  },
  memRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
  },
  memBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  memBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  histToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginLeft: 'auto',
  },
  histCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    paddingTop: spacing.xs,
  },
  historyRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 1,
  },
  historyExprText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  historyResultText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  expressionLine: {
    fontSize: 15,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
    minHeight: 20,
  },
  mainDisplay: {
    textAlign: 'right',
    fontWeight: '800',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 62,
  },

  // Keypad
  keypad: {
    flex: 1,
    paddingHorizontal: PAD_H,
    paddingBottom: spacing.sm,
    gap: GAP,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  btnWrapper: { flex: 1 },
  btn: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    textAlign: 'center',
  },
});
