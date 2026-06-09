import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { StopwatchState } from '@/types';

const DEFAULT_STATE: StopwatchState = {
  isRunning: false,
  elapsedMs: 0,
  laps: [],
};

function formatTime(ms: number) {
  const totalMs = Math.floor(ms);
  const minutes = Math.floor(totalMs / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((totalMs % 60000) / 1000).toString().padStart(2, '0');
  const centiseconds = Math.floor((totalMs % 1000) / 10).toString().padStart(2, '0');
  return { minutes, seconds, centiseconds };
}

export default function StopwatchScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<StopwatchState>(
    'stopwatch',
    DEFAULT_STATE
  );
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state.isRunning) {
      startTimeRef.current = Date.now() - state.elapsedMs;
      intervalRef.current = setInterval(() => {
        setState((p) => ({
          ...p,
          elapsedMs: Date.now() - startTimeRef.current,
        }));
      }, 10);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  const handleStartStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((p) => ({ ...p, isRunning: !p.isRunning }));
  };

  const handleLap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => {
      const lastLapTime = p.laps.length > 0 ? p.laps[p.laps.length - 1].time : 0;
      const newLap = {
        id: p.laps.length + 1,
        time: p.elapsedMs,
        delta: p.elapsedMs - lastLapTime,
      };
      return { ...p, laps: [...p.laps, newLap] };
    });
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState({ isRunning: false, elapsedMs: 0, laps: [] });
  };

  const { minutes, seconds, centiseconds } = formatTime(state.elapsedMs);

  const minLapTime = state.laps.length > 1 ? Math.min(...state.laps.map((l) => l.delta)) : -1;
  const maxLapTime = state.laps.length > 1 ? Math.max(...state.laps.map((l) => l.delta)) : -1;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Stopwatch"
        utilityId="stopwatch"
        accentColor="#14B8A6"
        onClearData={clearState}
      />

      {/* Display */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(300)}
        style={styles.displayContainer}
      >
        <View style={styles.timeDisplay}>
          <Text style={[styles.timeMain, { color: colors.text }]}>
            {minutes}:{seconds}
          </Text>
          <Text style={[styles.timeCentis, { color: colors.textSecondary }]}>
            .{centiseconds}
          </Text>
        </View>
        {state.laps.length > 0 && (
          <Text style={[styles.lapCount, { color: colors.textTertiary }]}>
            Lap {state.laps.length}
          </Text>
        )}
      </Animated.View>

      {/* Controls */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(300)}
        style={styles.controls}
      >
        {state.isRunning ? (
          <Pressable
            onPress={handleLap}
            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="flag" size={20} color={colors.text} />
            <Text style={[styles.btnText, { color: colors.text }]}>Lap</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleReset}
            style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={20} color={colors.text} />
            <Text style={[styles.btnText, { color: colors.text }]}>Reset</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleStartStop}
          style={[
            styles.primaryBtn,
            { backgroundColor: state.isRunning ? '#F43F5E' : '#14B8A6' },
          ]}
        >
          <Ionicons
            name={state.isRunning ? 'pause' : 'play'}
            size={28}
            color="#fff"
          />
        </Pressable>
      </Animated.View>

      {/* Laps */}
      {state.laps.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.lapsContainer}
        >
          <Text style={[styles.lapsTitle, { color: colors.textSecondary }]}>
            LAPS
          </Text>
          <FlatList
            data={[...state.laps].reverse()}
            keyExtractor={(l) => l.id.toString()}
            renderItem={({ item }) => {
              const isBest = item.delta === minLapTime;
              const isWorst = item.delta === maxLapTime;
              const t = formatTime(item.delta);
              const full = formatTime(item.time);
              return (
                <View
                  style={[
                    styles.lapRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.lapNum, { color: colors.textTertiary }]}>
                    #{item.id}
                  </Text>
                  <Text
                    style={[
                      styles.lapDelta,
                      {
                        color: isBest
                          ? '#10B981'
                          : isWorst
                          ? '#F43F5E'
                          : colors.text,
                      },
                    ]}
                  >
                    {t.minutes}:{t.seconds}.{t.centiseconds}
                  </Text>
                  <Text style={[styles.lapTotal, { color: colors.textSecondary }]}>
                    {full.minutes}:{full.seconds}.{full.centiseconds}
                  </Text>
                </View>
              );
            }}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  displayContainer: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  timeMain: {
    fontSize: 72,
    fontWeight: '800',
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  timeCentis: {
    fontSize: 36,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  lapCount: { fontSize: typography.sizes.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3xl'],
    paddingVertical: spacing.lg,
  },
  primaryBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  btnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  lapsContainer: { flex: 1, paddingHorizontal: spacing.base },
  lapsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  lapRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lapNum: {
    flex: 0.5,
    fontSize: typography.sizes.base,
  },
  lapDelta: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
  lapTotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.sizes.base,
    fontVariant: ['tabular-nums'],
  },
});
