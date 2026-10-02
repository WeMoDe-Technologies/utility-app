import React, { useCallback, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable, TextInput, FlatList, Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutRight,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { UtilityHeader, HeaderKey } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { useHaptic, Pill, onColour } from '@/components/ui';
import { formatNumber } from '@/utils/format';
import { spacing, radius, typography, border } from '@/theme';
import type { CounterState } from '@/types';

const ACCENT = '#C2902B';
const COUNTER_COLORS = ['#3C5A7D', '#4C6B3C', '#C2902B', '#A6392B', '#2E6A66', '#6B4A6E', '#7A3246', '#2E6A66'];
const STEPS = [1, 2, 5, 10, 25, 100];

type Counter = CounterState['counters'][number];

const DEFAULT_STATE: CounterState = {
  counters: [{ id: 'c1', label: 'Counter', value: 0, step: 1, color: '#3C5A7D' }],
};

/** Unique even when two counters are added in the same millisecond. */
let idSeed = 0;
function genId() {
  idSeed += 1;
  return `${Date.now().toString(36)}-${idSeed}`;
}

export default function CounterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<CounterState>('counter', DEFAULT_STATE);
  const haptic = useHaptic();

  const addCounter = useCallback(() => {
    haptic('light');
    setState((p) => ({
      counters: [
        ...p.counters,
        {
          id: genId(),
          label: `Counter ${p.counters.length + 1}`,
          value: 0,
          step: 1,
          color: COUNTER_COLORS[p.counters.length % COUNTER_COLORS.length],
        },
      ],
    }));
  }, [setState, haptic]);

  const updateCounter = useCallback(
    (id: string, changes: Partial<Counter>) => {
      setState((p) => ({
        counters: p.counters.map((c) => (c.id === id ? { ...c, ...changes } : c)),
      }));
    },
    [setState],
  );

  /**
   * Increment from the *previous state*, not from the value captured in the
   * render closure — tapping faster than React re-renders used to drop counts.
   */
  const bump = useCallback(
    (id: string, direction: 1 | -1) => {
      haptic('light');
      setState((p) => ({
        counters: p.counters.map((c) =>
          c.id === id ? { ...c, value: c.value + c.step * direction } : c,
        ),
      }));
    },
    [setState, haptic],
  );

  const removeCounter = useCallback(
    (id: string, label: string) => {
      haptic('warning');
      Alert.alert(`Remove “${label}”?`, 'Its count will be lost.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setState((p) => ({ counters: p.counters.filter((c) => c.id !== id) })),
        },
      ]);
    },
    [setState, haptic],
  );

  const resetAll = useCallback(() => {
    haptic('warning');
    Alert.alert('Reset all counters?', 'Every count goes back to zero.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset all',
        style: 'destructive',
        onPress: () => setState((p) => ({ counters: p.counters.map((c) => ({ ...c, value: 0 })) })),
      },
    ]);
  }, [setState, haptic]);

  const total = state.counters.reduce((sum, c) => sum + c.value, 0);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Counter"
        utilityId="counter"
        accentColor={ACCENT}
        subtitle={state.counters.length > 1 ? `${state.counters.length} counters · total ${formatNumber(total, { decimals: 0 })}` : undefined}
        onClearData={clearState}
        rightAction={
          state.counters.length > 1 ? (
            <HeaderKey
              icon="refresh"
              label="Reset all counters"
              fg={onColour(ACCENT)}
              onPress={resetAll}
            />
          ) : undefined
        }
      />

      <FlatList
        data={state.counters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔢</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No counters yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Add one to start tracking reps, stock, guests — anything countable.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <CounterCard
            counter={item}
            index={index}
            colors={colors}
            onIncrement={() => bump(item.id, 1)}
            onDecrement={() => bump(item.id, -1)}
            onReset={() => { haptic('light'); updateCounter(item.id, { value: 0 }); }}
            onLabelChange={(label: string) => updateCounter(item.id, { label })}
            onStepChange={(step: number) => updateCounter(item.id, { step })}
            onColorChange={(color: string) => updateCounter(item.id, { color })}
            onRemove={() => removeCounter(item.id, item.label)}
          />
        )}
        ListFooterComponent={
          <Pressable
            onPress={addCounter}
            accessibilityRole="button"
            style={[styles.addBtn, { borderColor: ACCENT + '55' }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
            <Text style={[styles.addBtnTxt, { color: ACCENT }]}>Add counter</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

interface CardProps {
  counter: Counter;
  index: number;
  colors: any;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
  onLabelChange: (label: string) => void;
  onStepChange: (step: number) => void;
  onColorChange: (color: string) => void;
  onRemove: () => void;
}

function CounterCard({
  counter, index, colors,
  onIncrement, onDecrement, onReset,
  onLabelChange, onStepChange, onColorChange, onRemove,
}: CardProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pulse = () => {
    scale.value = withSpring(1.03, { damping: 12 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 50, 250)).duration(300)}
      exiting={FadeOutRight.duration(200)}
      layout={Layout.springify()}
    >
      {/* The press-scale transform lives on its own view: sharing one with the
          layout animation lets Reanimated overwrite it. */}
      <Animated.View style={animStyle}>
      <View
        style={[
          styles.counterCard,
          { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: counter.color },
        ]}
      >
        {/* Header */}
        <View style={styles.counterHeader}>
          {editingLabel ? (
            <TextInput
              autoFocus
              style={[styles.labelInput, { color: colors.text, borderColor: counter.color }]}
              value={counter.label}
              onChangeText={onLabelChange}
              onBlur={() => setEditingLabel(false)}
              onSubmitEditing={() => setEditingLabel(false)}
              returnKeyType="done"
              maxLength={32}
              selectionColor={counter.color}
            />
          ) : (
            <Pressable
              onPress={() => setEditingLabel(true)}
              style={styles.labelRow}
              accessibilityRole="button"
              accessibilityLabel={`Rename ${counter.label}`}
            >
              <View style={[styles.colorDot, { backgroundColor: counter.color }]} />
              <Text style={[styles.counterLabel, { color: colors.text }]} numberOfLines={1}>
                {counter.label}
              </Text>
              <Ionicons name="pencil" size={12} color={colors.textTertiary} />
            </Pressable>
          )}
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${counter.label}`}
            style={styles.removeBtn}
          >
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Value */}
        <Text
          style={[styles.counterValue, { color: counter.color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {formatNumber(counter.value, { decimals: 0 })}
        </Text>

        {/* Controls */}
        <View style={styles.counterControls}>
          <Pressable
            onPress={() => { onDecrement(); pulse(); }}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${counter.label} by ${counter.step}`}
            style={[styles.counterBtn, { backgroundColor: counter.color + '18', borderColor: counter.color + '38' }]}
          >
            <Ionicons name="remove" size={28} color={counter.color} />
          </Pressable>

          <Pressable
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel={`Reset ${counter.label}`}
            style={[styles.resetBtn, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={() => { onIncrement(); pulse(); }}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${counter.label} by ${counter.step}`}
            style={[styles.counterBtn, { backgroundColor: counter.color, borderColor: counter.color }]}
          >
            <Ionicons name="add" size={28} color={onColour(counter.color)} />
          </Pressable>
        </View>

        {/* Options */}
        <Pressable onPress={() => setShowOptions((s) => !s)} style={styles.optionsToggle}>
          <Text style={[styles.stepText, { color: colors.textTertiary }]}>
            Step {counter.step}
          </Text>
          <Ionicons
            name={showOptions ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.textTertiary}
          />
        </Pressable>

        {showOptions && (
          <Animated.View entering={FadeInDown.duration(180)} style={styles.options}>
            <View style={styles.optionRow}>
              {STEPS.map((s) => (
                <Pill
                  key={s}
                  label={String(s)}
                  accent={counter.color}
                  active={counter.step === s}
                  onPress={() => onStepChange(s)}
                />
              ))}
            </View>
            <View style={styles.optionRow}>
              {COUNTER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => onColorChange(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set colour ${c}`}
                  style={[
                    styles.swatch,
                    { backgroundColor: c, borderColor: counter.color === c ? colors.text : 'transparent' },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12,
    borderWidth: border.base,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.base, gap: spacing.base, paddingBottom: 48, paddingTop: spacing.base },

  counterCard: {
    borderRadius: radius.xl,
    borderWidth: border.base,
    borderLeftWidth: 4,
    padding: spacing.base,
    gap: spacing.md,
  },
  counterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  counterLabel: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  labelInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    borderBottomWidth: 1.5,
    paddingBottom: 2,
  },
  removeBtn: { padding: 4 },

  counterValue: {
    fontSize: 60,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },

  counterControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counterBtn: {
    flex: 1,
    height: 58,
    borderRadius: radius.xl,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  resetBtnText: { fontSize: 13, fontWeight: '700' },

  optionsToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  stepText: { fontSize: 12, fontWeight: '600' },
  options: { gap: spacing.sm, alignItems: 'center' },
  optionRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  swatch: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },

  empty: { alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: typography.sizes.md, fontWeight: '700' },
  emptySub: { fontSize: typography.sizes.sm, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 20 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: border.base,
    borderStyle: 'dashed',
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700' },
});
