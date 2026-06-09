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
import type { ScientificCalculatorState } from '@/types';

const { width } = Dimensions.get('window');
const BTN_WIDTH = (width - spacing.base * 2 - spacing.xs * 4) / 5;

const DEFAULT_STATE: ScientificCalculatorState = {
  expression: '',
  result: '0',
  isRadians: true,
  history: [],
};

const SCI_ROWS = [
  ['sin', 'cos', 'tan', 'log', 'ln'],
  ['√', 'x²', 'xⁿ', '(', ')'],
  ['π', 'e', 'AC', '⌫', '÷'],
  ['7', '8', '9', '×', '%'],
  ['4', '5', '6', '−', '1/x'],
  ['1', '2', '3', '+', '='],
  ['0', '.', 'EXP', '±', ''],
];

export default function ScientificCalculatorScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ScientificCalculatorState>(
    'scientificCalculator',
    DEFAULT_STATE
  );

  const handleButton = useCallback(
    (btn: string) => {
      if (!btn) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setState((prev) => {
        let { expression, result, isRadians, history } = prev;
        const toRad = (deg: number) => (deg * Math.PI) / 180;

        const applyFn = (fn: string, expr: string): string => {
          const val = parseFloat(expr || result);
          if (isNaN(val)) return 'Error';
          const rad = isRadians ? val : toRad(val);
          switch (fn) {
            case 'sin': return Math.sin(rad).toFixed(8).replace(/\.?0+$/, '');
            case 'cos': return Math.cos(rad).toFixed(8).replace(/\.?0+$/, '');
            case 'tan': return Math.tan(rad).toFixed(8).replace(/\.?0+$/, '');
            case 'log': return Math.log10(val).toFixed(8).replace(/\.?0+$/, '');
            case 'ln': return Math.log(val).toFixed(8).replace(/\.?0+$/, '');
            case '√': return Math.sqrt(val).toFixed(8).replace(/\.?0+$/, '');
            case 'x²': return (val * val).toString();
            case '1/x': return (1 / val).toFixed(8).replace(/\.?0+$/, '');
            default: return expr;
          }
        };

        switch (btn) {
          case 'AC': return DEFAULT_STATE;
          case '⌫':
            return { ...prev, expression: expression.slice(0, -1) };
          case 'π':
            return { ...prev, expression: expression + Math.PI.toFixed(10) };
          case 'e':
            return { ...prev, expression: expression + Math.E.toFixed(10) };
          case '±': {
            const num = parseFloat(expression || result);
            const neg = (-num).toString();
            return { ...prev, expression: neg };
          }
          case 'EXP':
            return { ...prev, expression: expression + 'e' };
          case 'xⁿ':
            return { ...prev, expression: expression + '**' };
          case 'sin':
          case 'cos':
          case 'tan':
          case 'log':
          case 'ln':
          case '√':
          case 'x²':
          case '1/x': {
            const res = applyFn(btn, expression);
            const histEntry = { expression: `${btn}(${expression || result})`, result: res, timestamp: Date.now() };
            return {
              ...prev,
              expression: '',
              result: res,
              history: [histEntry, ...history].slice(0, 50),
            };
          }
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
              return {
                ...prev,
                expression: '',
                result: resStr,
                history: [{ expression, result: resStr, timestamp: Date.now() }, ...history].slice(0, 50),
              };
            } catch {
              return { ...prev, result: 'Error' };
            }
          }
          default: {
            return { ...prev, expression: expression + btn };
          }
        }
      });
    },
    [setState]
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Scientific Calc"
        utilityId="scientificCalculator"
        accentColor="#8B5CF6"
        onClearData={clearState}
      />

      {/* Display */}
      <View style={[styles.display, { backgroundColor: colors.surface }]}>
        <View style={styles.radDegToggle}>
          <Pressable
            onPress={() => setState((p) => ({ ...p, isRadians: true }))}
            style={[styles.radBtn, state.isRadians && { backgroundColor: '#8B5CF620' }]}
          >
            <Text style={[styles.radBtnText, { color: state.isRadians ? '#8B5CF6' : colors.textTertiary }]}>RAD</Text>
          </Pressable>
          <Pressable
            onPress={() => setState((p) => ({ ...p, isRadians: false }))}
            style={[styles.radBtn, !state.isRadians && { backgroundColor: '#8B5CF620' }]}
          >
            <Text style={[styles.radBtnText, { color: !state.isRadians ? '#8B5CF6' : colors.textTertiary }]}>DEG</Text>
          </Pressable>
        </View>
        <Text style={[styles.expression, { color: colors.textSecondary }]} numberOfLines={1}>
          {state.expression || ' '}
        </Text>
        <Text style={[styles.result, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {state.expression ? state.result : state.result}
        </Text>
      </View>

      {/* Keypad */}
      <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.keypad}>
        {SCI_ROWS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((btn, bi) => (
              <SciButton
                key={`${ri}-${bi}`}
                label={btn}
                onPress={() => handleButton(btn)}
                colors={colors}
                isOperator={['÷', '×', '−', '+', '='].includes(btn)}
                isFunction={['sin','cos','tan','log','ln','√','x²','xⁿ','1/x','π','e','EXP'].includes(btn)}
                isUtility={['AC', '⌫', '(', ')', '%', '±'].includes(btn)}
              />
            ))}
          </View>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

function SciButton({ label, onPress, colors, isOperator, isFunction, isUtility }: any) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!label) return <View style={{ width: BTN_WIDTH, height: 44 }} />;

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.88, { damping: 15 }, () => {
            scale.value = withSpring(1, { damping: 15 });
          });
          onPress();
        }}
        style={[
          styles.btn,
          {
            backgroundColor: isOperator
              ? '#8B5CF6'
              : isFunction
              ? colors.muted
              : isUtility
              ? colors.card
              : colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.btnLabel,
            {
              color: isOperator ? '#fff' : isFunction ? '#8B5CF6' : colors.text,
              fontSize: isFunction ? 12 : 16,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  display: {
    margin: spacing.base,
    borderRadius: radius.xl,
    padding: spacing.base,
    gap: spacing.xs,
  },
  radDegToggle: { flexDirection: 'row', gap: spacing.xs, alignSelf: 'flex-start' },
  radBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  radBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  expression: { fontSize: 15, textAlign: 'right' },
  result: { fontSize: 40, fontWeight: '800', textAlign: 'right', letterSpacing: -1 },
  keypad: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  row: { flexDirection: 'row', gap: spacing.xs },
  btn: {
    width: BTN_WIDTH,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { fontWeight: '600' },
});
