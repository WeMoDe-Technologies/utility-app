import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  AppState,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { PomodoroState } from '@/types';

const DEFAULT_STATE: PomodoroState = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  currentPhase: 'work',
  sessionsCompleted: 0,
  isRunning: false,
  remainingSeconds: 25 * 60,
  startTimestamp: null,
  secondsAtPause: 0,
};

const PHASE_COLORS = {
  work: '#EC4899',
  break: '#10B981',
  longBreak: '#6366F1',
};

const PHASE_LABELS = {
  work: 'Focus',
  break: 'Short Break',
  longBreak: 'Long Break',
};

const SIZE = 260;
const STROKE = 12;
const R = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function PomodoroScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<PomodoroState>(
    'pomodoro',
    DEFAULT_STATE
  );
  const pulseAnim = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track whether we were running when the app went to background
  const wasRunningRef = useRef(false);

  // ── Helper: compute remaining seconds from wall-clock time ────────────────
  const computeRemaining = (s: PomodoroState): number => {
    if (!s.isRunning || s.startTimestamp === null) return s.remainingSeconds;
    const elapsed = Math.floor((Date.now() - s.startTimestamp) / 1000);
    return Math.max(0, s.secondsAtPause - elapsed);
  };

  // ── Tick: re-derive remaining from timestamps instead of decrementing ─────
  const tick = () => {
    setState((prev) => {
      if (!prev.isRunning || prev.startTimestamp === null) return prev;

      const elapsed = Math.floor((Date.now() - prev.startTimestamp) / 1000);
      const remaining = Math.max(0, prev.secondsAtPause - elapsed);

      if (remaining <= 0) {
        // Phase complete
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (intervalRef.current) clearInterval(intervalRef.current);
        const nextPhase = getNextPhase(prev);
        const nextDuration = getPhaseDuration(nextPhase, prev);
        return {
          ...prev,
          isRunning: false,
          currentPhase: nextPhase,
          remainingSeconds: nextDuration * 60,
          startTimestamp: null,
          secondsAtPause: nextDuration * 60,
          sessionsCompleted:
            prev.currentPhase === 'work'
              ? prev.sessionsCompleted + 1
              : prev.sessionsCompleted,
        };
      }

      return { ...prev, remainingSeconds: remaining };
    });
  };

  // ── Start/stop interval ───────────────────────────────────────────────────
  useEffect(() => {
    if (state.isRunning) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
      intervalRef.current = setInterval(tick, 500); // 500ms for snappy display
    } else {
      pulseAnim.value = withTiming(1);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning, state.startTimestamp, state.secondsAtPause]);

  // ── AppState: handle going to background / returning to foreground ─────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        wasRunningRef.current = state.isRunning;
      } else if (nextState === 'active' && wasRunningRef.current) {
        // App came back — force a tick immediately so the display snaps to
        // the correct time without waiting up to 500ms for the next interval
        tick();
      }
    });
    return () => sub.remove();
  }, [state.isRunning, state.startTimestamp, state.secondsAtPause]);

  const totalSeconds = getPhaseDuration(state.currentPhase, state) * 60;
  const progress = 1 - state.remainingSeconds / totalSeconds;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const minutes = Math.floor(state.remainingSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (state.remainingSeconds % 60).toString().padStart(2, '0');

  const accent = PHASE_COLORS[state.currentPhase];

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((p) => {
      if (p.isRunning) {
        // Pausing — save how many seconds remain right now
        const remaining = computeRemaining(p);
        return {
          ...p,
          isRunning: false,
          remainingSeconds: remaining,
          secondsAtPause: remaining,
          startTimestamp: null,
        };
      } else {
        // Starting/resuming — record the wall-clock start time
        return {
          ...p,
          isRunning: true,
          startTimestamp: Date.now(),
          secondsAtPause: p.remainingSeconds,
        };
      }
    });
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => {
      const totalSeconds = getPhaseDuration(p.currentPhase, p) * 60;
      return {
        ...p,
        isRunning: false,
        remainingSeconds: totalSeconds,
        startTimestamp: null,
        secondsAtPause: totalSeconds,
      };
    });
  };

  const handlePhaseSelect = (phase: PomodoroState['currentPhase']) => {
    setState((p) => {
      const totalSeconds = getPhaseDuration(phase, p) * 60;
      return {
        ...p,
        currentPhase: phase,
        isRunning: false,
        remainingSeconds: totalSeconds,
        startTimestamp: null,
        secondsAtPause: totalSeconds,
      };
    });
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Pomodoro"
        utilityId="pomodoro"
        accentColor={accent}
        onClearData={clearState}
      />

      <View style={styles.content}>
        {/* Phase Tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={[styles.phaseTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {(['work', 'break', 'longBreak'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => handlePhaseSelect(p)}
              style={[
                styles.phaseTab,
                state.currentPhase === p && {
                  backgroundColor: PHASE_COLORS[p] + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.phaseTabText,
                  {
                    color:
                      state.currentPhase === p
                        ? PHASE_COLORS[p]
                        : colors.textSecondary,
                    fontWeight:
                      state.currentPhase === p
                        ? typography.weights.bold
                        : typography.weights.medium,
                  },
                ]}
              >
                {PHASE_LABELS[p]}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Timer Ring */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={[styles.timerContainer, pulseStyle]}
        >
          <Svg width={SIZE} height={SIZE}>
            {/* Background ring */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={accent + '20'}
              strokeWidth={STROKE}
              fill="none"
            />
            {/* Progress ring */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={accent}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>

          <View style={styles.timerCenter}>
            <Text style={[styles.phaseLabel, { color: accent }]}>
              {PHASE_LABELS[state.currentPhase].toUpperCase()}
            </Text>
            <Text style={[styles.timerDigits, { color: colors.text }]}>
              {minutes}:{seconds}
            </Text>
            <Text style={[styles.sessionCount, { color: colors.textSecondary }]}>
              Session {state.sessionsCompleted + 1}
            </Text>
          </View>
        </Animated.View>

        {/* Controls */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.controls}
        >
          <Pressable
            onPress={handleReset}
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleToggle}
            style={[styles.playBtn, { backgroundColor: accent }]}
          >
            <Ionicons
              name={state.isRunning ? 'pause' : 'play'}
              size={28}
              color="#fff"
            />
          </Pressable>

          <Pressable
            onPress={() => handlePhaseSelect('work')}
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="stop" size={22} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Duration Settings */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={[styles.durationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <DurationSetting
            label="Focus"
            value={state.workDuration}
            onChange={(v) =>
              setState((p) => ({
                ...p,
                workDuration: v,
                remainingSeconds: p.currentPhase === 'work' ? v * 60 : p.remainingSeconds,
                secondsAtPause: p.currentPhase === 'work' ? v * 60 : p.secondsAtPause,
                startTimestamp: p.currentPhase === 'work' ? null : p.startTimestamp,
                isRunning: p.currentPhase === 'work' ? false : p.isRunning,
              }))
            }
            colors={colors}
            accent="#EC4899"
          />
          <DurationSetting
            label="Break"
            value={state.breakDuration}
            onChange={(v) =>
              setState((p) => ({
                ...p,
                breakDuration: v,
                remainingSeconds: p.currentPhase === 'break' ? v * 60 : p.remainingSeconds,
                secondsAtPause: p.currentPhase === 'break' ? v * 60 : p.secondsAtPause,
                startTimestamp: p.currentPhase === 'break' ? null : p.startTimestamp,
                isRunning: p.currentPhase === 'break' ? false : p.isRunning,
              }))
            }
            colors={colors}
            accent="#10B981"
          />
          <DurationSetting
            label="Long Break"
            value={state.longBreakDuration}
            onChange={(v) =>
              setState((p) => ({
                ...p,
                longBreakDuration: v,
                remainingSeconds: p.currentPhase === 'longBreak' ? v * 60 : p.remainingSeconds,
                secondsAtPause: p.currentPhase === 'longBreak' ? v * 60 : p.secondsAtPause,
                startTimestamp: p.currentPhase === 'longBreak' ? null : p.startTimestamp,
                isRunning: p.currentPhase === 'longBreak' ? false : p.isRunning,
              }))
            }
            colors={colors}
            accent="#6366F1"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function DurationSetting({
  label,
  value,
  onChange,
  colors,
  accent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  colors: any;
  accent: string;
}) {
  return (
    <View style={styles.durRow}>
      <Text style={[styles.durLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.durControls}>
        <Pressable
          onPress={() => onChange(Math.max(1, value - 1))}
          style={[styles.durBtn, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text style={[styles.durValue, { color: accent }]}>{value}m</Text>
        <Pressable
          onPress={() => onChange(Math.min(60, value + 1))}
          style={[styles.durBtn, { backgroundColor: colors.muted }]}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function getNextPhase(state: PomodoroState): PomodoroState['currentPhase'] {
  if (state.currentPhase === 'work') {
    return (state.sessionsCompleted + 1) % 4 === 0 ? 'longBreak' : 'break';
  }
  return 'work';
}

function getPhaseDuration(
  phase: PomodoroState['currentPhase'],
  state: PomodoroState
): number {
  switch (phase) {
    case 'work': return state.workDuration;
    case 'break': return state.breakDuration;
    case 'longBreak': return state.longBreakDuration;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  phaseTabs: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 4,
    alignSelf: 'stretch',
  },
  phaseTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  phaseTabText: { fontSize: typography.sizes.sm },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: spacing.xs,
  },
  phaseLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 2,
  },
  timerDigits: {
    fontSize: 60,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  sessionCount: { fontSize: typography.sizes.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  durationCard: {
    alignSelf: 'stretch',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  durRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  durControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  durBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    width: 36,
    textAlign: 'center',
  },
});