import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, AppState, Switch } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, FieldLabel, useHaptic, toast, onColour } from '@/components/ui';
import { spacing, radius, typography, border } from '@/theme';

type Phase = 'work' | 'break' | 'longBreak';

interface PomodoroPersisted {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  currentPhase: Phase;
  sessionsCompleted: number;
  /** Epoch ms the current run started, or null when paused/stopped. */
  startedAt: number | null;
  /** Seconds remaining when the timer was last paused. */
  remainingAtPause: number;
  /** Start the next phase automatically when one finishes. */
  autoAdvance: boolean;
}

const PHASE_COLORS: Record<Phase, string> = {
  work: '#7A3246',
  break: '#4C6B3C',
  longBreak: '#3C5A7D',
};

const PHASE_LABELS: Record<Phase, string> = {
  work: 'Focus',
  break: 'Short Break',
  longBreak: 'Long Break',
};

const DEFAULT_STATE: PomodoroPersisted = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  currentPhase: 'work',
  sessionsCompleted: 0,
  startedAt: null,
  remainingAtPause: 25 * 60,
  autoAdvance: false,
};

const SIZE = 250;
const STROKE = 12;
const R = (SIZE - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function phaseMinutes(phase: Phase, s: PomodoroPersisted): number {
  if (phase === 'work') return s.workDuration;
  if (phase === 'break') return s.breakDuration;
  return s.longBreakDuration;
}

/** After every 4th focus session the break is a long one. */
function nextPhase(s: PomodoroPersisted): Phase {
  if (s.currentPhase !== 'work') return 'work';
  return (s.sessionsCompleted + 1) % 4 === 0 ? 'longBreak' : 'break';
}

function remainingSeconds(s: PomodoroPersisted): number {
  if (s.startedAt === null) return s.remainingAtPause;
  const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
  return Math.max(0, s.remainingAtPause - elapsed);
}

export default function PomodoroScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<PomodoroPersisted>('pomodoro', DEFAULT_STATE);
  const haptic = useHaptic();

  // The countdown is local state derived from timestamps; only real events
  // (start, pause, phase change) are written to storage.
  const [remaining, setRemaining] = useState(() => remainingSeconds(state));
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = state.startedAt !== null;
  const accent = PHASE_COLORS[state.currentPhase];
  const totalSeconds = Math.max(1, phaseMinutes(state.currentPhase, state) * 60);

  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  /**
   * Phase completion is handled *here*, in an effect — not inside the state
   * updater. Updaters must stay pure; the old build fired haptics and cleared
   * intervals from inside one, which React may invoke more than once.
   */
  const completePhase = useCallback(() => {
    haptic('success');
    setState((p) => {
      const done = nextPhase(p);
      const nextSeconds = phaseMinutes(done, p) * 60;
      return {
        ...p,
        currentPhase: done,
        sessionsCompleted: p.currentPhase === 'work' ? p.sessionsCompleted + 1 : p.sessionsCompleted,
        remainingAtPause: nextSeconds,
        startedAt: p.autoAdvance ? Date.now() : null,
      };
    });
    toast(
      state.currentPhase === 'work' ? 'Focus session complete — take a break' : 'Break over — back to it',
      'success',
    );
  }, [setState, haptic, state.currentPhase]);

  // Countdown driver
  useEffect(() => {
    setRemaining(remainingSeconds(state));

    if (state.startedAt === null) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
      return;
    }

    pulse.value = withRepeat(
      withSequence(withTiming(1.025, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );

    tickRef.current = setInterval(() => {
      const left = remainingSeconds(state);
      setRemaining(left);
      if (left <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        completePhase();
      }
    }, 250);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [state.startedAt, state.remainingAtPause, state.currentPhase, completePhase]);

  // Snap the display back to the truth the moment the app returns
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setRemaining(remainingSeconds(state));
    });
    return () => sub.remove();
  }, [state]);

  const handleToggle = useCallback(() => {
    haptic('medium');
    setState((p) =>
      p.startedAt === null
        ? { ...p, startedAt: Date.now(), remainingAtPause: p.remainingAtPause > 0 ? p.remainingAtPause : phaseMinutes(p.currentPhase, p) * 60 }
        : { ...p, remainingAtPause: remainingSeconds(p), startedAt: null },
    );
  }, [setState, haptic]);

  const handleReset = useCallback(() => {
    haptic('light');
    setState((p) => ({ ...p, startedAt: null, remainingAtPause: phaseMinutes(p.currentPhase, p) * 60 }));
  }, [setState, haptic]);

  const handlePhaseSelect = useCallback(
    (phase: Phase) => {
      haptic('select');
      setState((p) => ({
        ...p,
        currentPhase: phase,
        startedAt: null,
        remainingAtPause: phaseMinutes(phase, p) * 60,
      }));
    },
    [setState, haptic],
  );

  /** Changing a duration only rewinds the timer if it's the phase on screen. */
  const setDuration = useCallback(
    (key: 'workDuration' | 'breakDuration' | 'longBreakDuration', phase: Phase, value: number) => {
      setState((p) => {
        const next = { ...p, [key]: value };
        if (p.currentPhase !== phase) return next;
        return { ...next, startedAt: null, remainingAtPause: value * 60 };
      });
    },
    [setState],
  );

  const progress = 1 - remaining / totalSeconds;
  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, progress)));
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Pomodoro"
        utilityId="pomodoro"
        accentColor={accent}
        subtitle={`${state.sessionsCompleted} session${state.sessionsCompleted === 1 ? '' : 's'} completed today`}
        onClearData={clearState}
      />

      {/* Scrollable — the fixed layout used to clip the settings card on
          shorter phones. */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Phase tabs */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(280)}
          style={[styles.phaseTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {(['work', 'break', 'longBreak'] as Phase[]).map((p) => {
            const active = state.currentPhase === p;
            return (
              <Pressable
                key={p}
                onPress={() => handlePhaseSelect(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.phaseTab, active && { backgroundColor: PHASE_COLORS[p] + '22' }]}
              >
                <Text
                  style={[
                    styles.phaseTabText,
                    {
                      color: active ? PHASE_COLORS[p] : colors.textSecondary,
                      fontWeight: active ? '800' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {PHASE_LABELS[p]}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Ring */}
        <Animated.View entering={FadeInDown.delay(80).duration(300)} style={[styles.timerContainer, pulseStyle]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={accent + '20'} strokeWidth={STROKE} fill="none" />
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
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i < state.sessionsCompleted % 4 ? accent : colors.muted,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Controls */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.controls}>
          <Pressable
            onPress={handleReset}
            accessibilityRole="button"
            accessibilityLabel="Reset this phase"
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            onPress={handleToggle}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause timer' : 'Start timer'}
            style={[styles.playBtn, { backgroundColor: accent, shadowColor: accent }]}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={28} color={onColour(accent)} />
          </Pressable>

          <Pressable
            onPress={() => {
              haptic('warning');
              setState((p) => ({
                ...p,
                currentPhase: 'work',
                sessionsCompleted: 0,
                startedAt: null,
                remainingAtPause: p.workDuration * 60,
              }));
            }}
            accessibilityRole="button"
            accessibilityLabel="Stop and clear session count"
            style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="stop" size={20} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.settingsWrap}>
          <Card>
            <FieldLabel>Durations</FieldLabel>
            <DurationSetting
              label="Focus"
              value={state.workDuration}
              accent={PHASE_COLORS.work}
              onChange={(v) => setDuration('workDuration', 'work', v)}
              colors={colors}
            />
            <DurationSetting
              label="Short break"
              value={state.breakDuration}
              accent={PHASE_COLORS.break}
              onChange={(v) => setDuration('breakDuration', 'break', v)}
              colors={colors}
            />
            <DurationSetting
              label="Long break"
              value={state.longBreakDuration}
              accent={PHASE_COLORS.longBreak}
              onChange={(v) => setDuration('longBreakDuration', 'longBreak', v)}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.autoRow}>
              <View style={styles.autoText}>
                <Text style={[styles.autoLabel, { color: colors.text }]}>Auto-start next phase</Text>
                <Text style={[styles.autoHint, { color: colors.textTertiary }]}>
                  Roll straight into the break, and back into focus
                </Text>
              </View>
              <Switch
                value={state.autoAdvance}
                onValueChange={(v) => { haptic('select'); setState((p) => ({ ...p, autoAdvance: v })); }}
                trackColor={{ false: colors.muted, true: accent + '70' }}
                thumbColor={state.autoAdvance ? accent : colors.subtle}
              />
            </View>
          </Card>

          <Text style={[styles.footnote, { color: colors.textTertiary }]}>
            The timer keeps counting while the app is in the background, but it can't
            notify you when a phase ends — keep Kit open to see the change.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DurationSetting({
  label, value, accent, onChange, colors,
}: {
  label: string;
  value: number;
  accent: string;
  onChange: (v: number) => void;
  colors: any;
}) {
  const haptic = useHaptic();
  const step = (delta: number) => {
    haptic('select');
    onChange(Math.max(1, Math.min(120, value + delta)));
  };
  return (
    <View style={styles.durRow}>
      <Text style={[styles.durLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.durControls}>
        <Pressable
          onPress={() => step(-1)}
          disabled={value <= 1}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label} duration`}
          style={[styles.durBtn, { backgroundColor: colors.muted }, value <= 1 && styles.disabled]}
        >
          <Ionicons name="remove" size={16} color={colors.text} />
        </Pressable>
        <Text style={[styles.durValue, { color: accent }]}>{value}m</Text>
        <Pressable
          onPress={() => step(1)}
          disabled={value >= 120}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label} duration`}
          style={[styles.durBtn, { backgroundColor: colors.muted }, value >= 120 && styles.disabled]}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  disabled: { opacity: 0.35 },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: 48,
    gap: spacing.lg,
  },

  phaseTabs: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: border.base,
    padding: 4,
    alignSelf: 'stretch',
    gap: 3,
  },
  phaseTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.lg, alignItems: 'center' },
  phaseTabText: { fontSize: typography.sizes.sm },

  timerContainer: { alignItems: 'center', justifyContent: 'center' },
  timerCenter: { position: 'absolute', alignItems: 'center', gap: spacing.xs },
  phaseLabel: { fontSize: typography.sizes.xs, fontWeight: '800', letterSpacing: 2 },
  timerDigits: {
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },

  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  controlBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: border.base,
  },
  playBtn: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center',
  },

  settingsWrap: { alignSelf: 'stretch', gap: spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  durRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  durLabel: { fontSize: typography.sizes.base, fontWeight: '500' },
  durControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  durBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  durValue: {
    fontSize: typography.sizes.base,
    fontWeight: '800',
    width: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  autoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  autoText: { flex: 1 },
  autoLabel: { fontSize: typography.sizes.base, fontWeight: '600' },
  autoHint: { fontSize: typography.sizes.xs, marginTop: 1 },

  footnote: { fontSize: typography.sizes.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.sm },
});
