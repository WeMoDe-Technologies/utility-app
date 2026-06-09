import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Alert,
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
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { CounterState } from '@/types';

const COUNTER_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6'];

const DEFAULT_STATE: CounterState = {
  counters: [
    { id: '1', label: 'Counter', value: 0, step: 1, color: '#6366F1' },
  ],
};

function genId() { return Date.now().toString(36); }

export default function CounterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<CounterState>(
    'counter',
    DEFAULT_STATE
  );

  const addCounter = () => {
    const colorIdx = state.counters.length % COUNTER_COLORS.length;
    setState((p) => ({
      counters: [
        ...p.counters,
        {
          id: genId(),
          label: `Counter ${p.counters.length + 1}`,
          value: 0,
          step: 1,
          color: COUNTER_COLORS[colorIdx],
        },
      ],
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateCounter = (id: string, changes: Partial<CounterState['counters'][0]>) => {
    setState((p) => ({
      counters: p.counters.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    }));
  };

  const removeCounter = (id: string) => {
    Alert.alert('Remove Counter?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setState((p) => ({ counters: p.counters.filter((c) => c.id !== id) })),
      },
    ]);
  };

  const resetAll = () => {
    setState((p) => ({
      counters: p.counters.map((c) => ({ ...c, value: 0 })),
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Counter"
        utilityId="counter"
        accentColor="#F59E0B"
        onClearData={clearState}
      />

      {state.counters.length > 1 && (
        <Pressable onPress={resetAll} style={[styles.resetAllBtn, { borderColor: '#F59E0B40' }]}>
          <Ionicons name="refresh" size={14} color="#F59E0B" />
          <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '600' }}>Reset All</Text>
        </Pressable>
      )}

      <FlatList
        data={state.counters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <CounterCard
            counter={item}
            colors={colors}
            onIncrement={() => {
              updateCounter(item.id, { value: item.value + item.step });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onDecrement={() => {
              updateCounter(item.id, { value: item.value - item.step });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onReset={() => updateCounter(item.id, { value: 0 })}
            onLabelChange={(label) => updateCounter(item.id, { label })}
            onStepChange={(step) => updateCounter(item.id, { step })}
            onRemove={() => removeCounter(item.id)}
            index={index}
          />
        )}
        ListFooterComponent={
          <Pressable
            onPress={addCounter}
            style={[styles.addBtn, { borderColor: '#F59E0B40' }]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#F59E0B" />
            <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '600' }}>Add Counter</Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}

function CounterCard({ counter, colors, onIncrement, onDecrement, onReset, onLabelChange, onStepChange, onRemove, index }: any) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [showStepEdit, setShowStepEdit] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pulse = () => {
    scale.value = withSpring(1.04, { damping: 12 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(300)}
      exiting={FadeOutRight.duration(200)}
      layout={Layout.springify()}
      style={animStyle}
    >
      <View style={[styles.counterCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: counter.color }]}>
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
            />
          ) : (
            <Pressable onPress={() => setEditingLabel(true)} style={styles.labelRow}>
              <View style={[styles.colorDot, { backgroundColor: counter.color }]} />
              <Text style={[styles.counterLabel, { color: colors.text }]}>{counter.label}</Text>
              <Ionicons name="pencil" size={12} color={colors.textTertiary} />
            </Pressable>
          )}
          <Pressable onPress={onRemove} style={styles.removeBtn}>
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* Value display */}
        <Text style={[styles.counterValue, { color: counter.color }]}>
          {counter.value.toLocaleString()}
        </Text>

        {/* Controls */}
        <View style={styles.counterControls}>
          <Pressable
            onPress={() => { onDecrement(); pulse(); }}
            style={[styles.counterBtn, { backgroundColor: counter.color + '15', borderColor: counter.color + '30' }]}
          >
            <Ionicons name="remove" size={28} color={counter.color} />
          </Pressable>

          <Pressable
            onPress={onReset}
            style={[styles.resetBtn, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset</Text>
          </Pressable>

          <Pressable
            onPress={() => { onIncrement(); pulse(); }}
            style={[styles.counterBtn, { backgroundColor: counter.color, borderColor: counter.color }]}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Pressable>
        </View>

        {/* Step */}
        <Pressable onPress={() => setShowStepEdit(!showStepEdit)} style={styles.stepRow}>
          <Text style={[styles.stepText, { color: colors.textTertiary }]}>
            Step: {counter.step}
          </Text>
          <Ionicons name={showStepEdit ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
        </Pressable>
        {showStepEdit && (
          <View style={styles.stepButtons}>
            {[1, 2, 5, 10, 25, 100].map((s) => (
              <Pressable
                key={s}
                onPress={() => onStepChange(s)}
                style={[
                  styles.stepChip,
                  {
                    backgroundColor: counter.step === s ? counter.color : colors.muted,
                  },
                ]}
              >
                <Text style={{ color: counter.step === s ? '#fff' : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  resetAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-end',
    marginRight: spacing.base,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  list: { paddingHorizontal: spacing.base, gap: spacing.base, paddingBottom: 40, paddingTop: spacing.sm },
  counterCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.base,
    gap: spacing.md,
  },
  counterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  counterLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  labelInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    borderBottomWidth: 1.5,
    paddingBottom: 2,
  },
  removeBtn: { padding: 4 },
  counterValue: {
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counterBtn: {
    flex: 1,
    height: 60,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtn: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  stepText: { fontSize: 12 },
  stepButtons: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  stepChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
});
