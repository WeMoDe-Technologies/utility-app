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
const BTN_SIZE = Math.floor((width - spacing.base * 2 - spacing.sm * 3) / 4);

const DEFAULT_STATE: CalculatorState = {
  expression: '',
  result: '0',
  history: [],
};

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
            // Operator or number
            const isOperator = ['÷', '×', '−', '+'].includes(btn);
            if (isOperator) {
              const lastChar = expression.slice(-1);
              const lastIsOp = ['÷', '×', '−', '+'].includes(lastChar);
              const newExpr = lastIsOp
                ? expression.slice(0, -1) + btn
                : expression + btn;
              return { ...prev, expression: newExpr };
            }

            // Decimal
            if (btn === '.') {
              const parts = expression.split(/[÷×−+]/);
              const lastPart = parts[parts.length - 1];
              if (lastPart.includes('.')) return prev;

              const newExpr = expression + btn;
              return { ...prev, expression: newExpr };
            }

            // number
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
              { color: colors.text, maxWidth: '100%' },
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
              { color: colors.text, maxWidth: '100%' },
              isLong ? { fontSize: typography.sizes.lg - 6 } : {},
            ]}
            numberOfLines={1}
            ellipsizeMode="head"
            allowFontScaling={false}
          >
            {state.expression ? (state.result !== '0' ? state.result : state.expression) : state.result}
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
                    { backgroundColor: colors.card, borderColor: colors.border, maxWidth: width - spacing.base * 2 },
                  ]}
                >
                  <Text style={[styles.historyExpr, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
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
        <View style={[styles.keypad]}>
          {BUTTONS.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((btn) => (
                <CalcButton
                  key={btn + ri}
                  label={btn}
                  onPress={() => handleButton(btn)}
                  colors={colors}
                  isOperator={['÷', '×', '−', '+', '='].includes(btn)}
                  isUtility={['AC', '+/-', '%'].includes(btn)}
                  isWide={btn === '0'}
                />
              ))}
            </View>
          ))}
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

    const bgColor = isOperator ? '#6366F1' : isUtility ? colors.muted : colors.card;
    const textColor = isOperator ? '#fff' : colors.text;

    return (
      <Animated.View entering={FadeInDown} style={[animStyle, isWide ? { flexBasis: (BTN_SIZE * 2) + spacing.sm, flexGrow: 1 } : { width: BTN_SIZE }]}>
        <Pressable
          onPress={handlePress}
          android_ripple={{ color: colors.border }}
          style={[
            styles.btn,
            {
              backgroundColor: bgColor,
              borderColor: colors.border,
              width: isWide ? undefined : BTN_SIZE,
            },
            isWide ? styles.wideBtn : undefined,
          ]}
        >
          <Text style={[styles.btnLabel, { color: textColor }]} allowFontScaling={false} numberOfLines={1}>
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
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
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
  wideBtn: {
    borderRadius: radius.xl,
    height: BTN_SIZE,
    justifyContent: 'center',
  },
});