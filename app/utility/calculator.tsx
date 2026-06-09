// (Full file with UI fixes — replace your calculator.tsx with this content)
// Note: This edit preserves all logic and handlers; only styling and layout props changed.

import React, { useCallback } from 'react';
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
import type { CalculatorState } from '@/types';

const { width } = Dimensions.get('window');

// Gap between buttons
const BTN_GAP = spacing.sm;
// 4 buttons per row, 3 gaps between them, padding on both sides
const BTN_SIZE = Math.floor((width - spacing.base * 2 - BTN_GAP * 3) / 4);

const DEFAULT_STATE: CalculatorState = {
  expression: '',
  result: '0',
  history: [],
};

// Last row uses a different layout: '0' is wide, then '.', '⌫', '='
// We model this explicitly so we can flex them correctly.
const BUTTONS = [
  ['AC', '+/-', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

export default function CalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState(
    'calculator',
    DEFAULT_STATE
  );

  const handleButton = useCallback(
    (btn: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setState((prev) => {
        let { expression, result, history } = prev;

        switch (btn) {
          case 'AC':
            return DEFAULT_STATE;

          case '⌫':
            if (expression.length > 0) {
              return { ...prev, expression: expression.slice(0, -1) };
            }
            return prev;

          case '+/-':
            if (result !== '0') {
              const neg = (parseFloat(result) * -1).toString();
              return { ...prev, result: neg, expression: neg };
            }
            return prev;

          case '%':
            if (expression) {
              const val = (parseFloat(expression) / 100).toString();
              return { ...prev, expression: val, result: val };
            }
            return prev;

          case '=': {
            if (!expression) return prev;
            try {
              const sanitized = expression
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/−/g, '-');
              // eslint-disable-next-line no-eval
              const res = eval(sanitized);
              const resStr = Number(parseFloat(res.toFixed(10))).toString();
              const newHistory = [
                { expression, result: resStr, timestamp: Date.now() },
                ...history,
              ].slice(0, 50);
              return {
                expression: '',
                result: resStr,
                history: newHistory,
              };
            } catch {
              return { ...prev, result: 'Error' };
            }
          }

          default: {
            const isOperator = ['÷', '×', '−', '+'].includes(btn);
            if (isOperator) {
              const lastChar = expression.slice(-1);
              const lastIsOp = ['÷', '×', '−', '+'].includes(lastChar);
              const newExpr = lastIsOp
                ? expression.slice(0, -1) + btn
                : expression + btn;
              return { ...prev, expression: newExpr };
            }

            if (btn === '.') {
              const parts = expression.split(/[÷×−+]/);
              const lastPart = parts[parts.length - 1];
              if (lastPart.includes('.')) return prev;
              return { ...prev, expression: expression + btn };
            }

            return { ...prev, expression: expression + btn };
          }
        }
      });
    },
    [setState]
  );

  const displayValue = state.expression || state.result;
  const isLong = displayValue.length > 9;

  return (
    <SafeAreaView style={styles.root}>
      <UtilityHeader title="Calculator" onClear={clearState} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Display */}
        <View style={[styles.display, { backgroundColor: colors.card }]}>
          <Text
            style={[
              styles.expression,
              { color: colors.text },
              displayValue.length > 20 ? { fontSize: typography.sizes.sm } : {},
            ]}
            numberOfLines={1}
            ellipsizeMode="head"
            allowFontScaling={false}
          >
            {state.expression || ' '}
          </Text>

          <Text
            style={[
              styles.result,
              { color: colors.text },
              isLong ? { fontSize: typography.sizes.lg - 6 } : {},
            ]}
            numberOfLines={1}
            ellipsizeMode="head"
            allowFontScaling={false}
          >
            {state.expression
              ? state.result !== '0'
                ? state.result
                : state.expression
              : state.result}
          </Text>
        </View>

        {/* History strip */}
        {state.history.length > 0 && (
          <View style={styles.historyStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {state.history.slice(0, 5).map((h, i) => (
                <Pressable
                  key={i}
                  onPress={() =>
                    setState((p) => ({ ...p, result: h.result, expression: '' }))
                  }
                  style={[
                    styles.historyChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      maxWidth: width - spacing.base * 2,
                    },
                  ]}
                >
                  <Text
                    style={[styles.historyExpr, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {h.expression}
                  </Text>
                  <Text style={[styles.historyResult, { color: colors.text }]}>
                    = {h.result}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {BUTTONS.map((row, ri) => {
            const isLastRow = ri === BUTTONS.length - 1;

            if (isLastRow) {
              // Last row: '0' wide (2 cols), then '.', '⌫', '=' each normal
              const [zero, dot, back, eq] = row;
              return (
                <View key={ri} style={styles.row}>
                  {/* Wide '0' button */}
                  <CalcButton
                    key="0"
                    label={zero}
                    onPress={() => handleButton(zero)}
                    colors={colors}
                    isWide={false}
                  />
                  <CalcButton
                    key={dot}
                    label={dot}
                    onPress={() => handleButton(dot)}
                    colors={colors}
                  />
                  <CalcButton
                    key={back}
                    label={back}
                    onPress={() => handleButton(back)}
                    colors={colors}
                  />
                  <CalcButton
                    key={eq}
                    label={eq}
                    onPress={() => handleButton(eq)}
                    colors={colors}
                    isOperator
                  />
                </View>
              );
            }

            return (
              <View key={ri} style={styles.row}>
                {row.map((btn) => (
                  <CalcButton
                    key={btn + ri}
                    label={btn}
                    onPress={() => handleButton(btn)}
                    colors={colors}
                    isOperator={['÷', '×', '−', '+', '='].includes(btn)}
                    isUtility={['AC', '+/-', '%'].includes(btn)}
                  />
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function CalcButton({
    label,
    onPress,
    colors,
    isOperator,
    isUtility,
    isWide,
  }: {
    label: string;
    onPress: () => void;
    colors: any;
    isOperator?: boolean;
    isUtility?: boolean;
    isWide?: boolean;
  }) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
      scale.value = withSpring(0.88, { damping: 15 }, () => {
        scale.value = withSpring(1, { damping: 15 });
      });
      onPress();
    };

    const bgColor = isOperator
      ? '#6366F1'
      : isUtility
      ? colors.muted
      : colors.card;
    const textColor = isOperator ? '#fff' : colors.text;

    // Wide button = BTN_SIZE * 2 + one gap (the gap that would have been between the two cells)
    const btnWidth = isWide ? BTN_SIZE * 2 + BTN_GAP : BTN_SIZE;

    return (
      <Animated.View
        entering={FadeInDown}
        style={[animStyle, { width: btnWidth }]}
      >
        <Pressable
          onPress={handlePress}
          android_ripple={{ color: colors.border }}
          style={[
            styles.btn,
            {
              width: btnWidth,
              backgroundColor: bgColor,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.btnLabel, { color: textColor }]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  display: {
    margin: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.xl,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  expression: {
    fontSize: typography.sizes.lg,
    textAlign: 'right',
    fontWeight: typography.weights.medium,
  },
  result: {
    fontWeight: typography.weights.extrabold,
    textAlign: 'right',
    letterSpacing: -2,
    fontSize: typography.sizes.xxl || 36,
  },

  historyStrip: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
  },
  historyChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  historyExpr: {
    fontSize: typography.sizes.xs,
  },
  historyResult: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },

  keypad: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  row: {
    flexDirection: 'row',
    // Use gap so spacing is uniform and buttons don't need manual margin math
    gap: BTN_GAP,
    marginBottom: BTN_GAP,
    alignItems: 'center',
  },

  btn: {
    height: BTN_SIZE,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
  },
});