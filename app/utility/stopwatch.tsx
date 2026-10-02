import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, FlatList, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader, HeaderKey } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { useHaptic, toast, onColour, PressablePlate } from '@/components/ui';
import { spacing, radius, typography, border, plate } from '@/theme';

const ACCENT = '#2E6A66';
const START_COLOR = '#4C6B3C';
const RESET_COLOR = '#A6392B';
const BEST_COLOR = '#4C6B3C';

// ─── Layout ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const H_PAD = 24;
const RING_SZ = Math.min(SW * 0.78, 290);
const CX = RING_SZ / 2;
const CY = RING_SZ / 2;
const RING_R = RING_SZ / 2 - 2;
const BAND_W = RING_SZ * 0.095;
const FACE_R = RING_R - BAND_W;
const TICK_COUNT = 120;

interface Lap { id: number; time: number; delta: number }

interface StopwatchPersisted {
  /** Epoch ms when the current run started, or null when stopped. */
  startedAt: number | null;
  /** Milliseconds banked before the current run began. */
  banked: number;
  laps: Lap[];
}

const DEFAULT_STATE: StopwatchPersisted = {
  startedAt: null,
  banked: 0,
  laps: [],
};

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function split(ms: number) {
  const t = Math.max(0, Math.floor(ms));
  return {
    hh: Math.floor(t / 3600000),
    mm: Math.floor((t % 3600000) / 60000),
    ss: Math.floor((t % 60000) / 1000),
    cs: Math.floor((t % 1000) / 10),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function fmtClock(ms: number) {
  const { hh, mm, ss, cs } = split(ms);
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}.${pad(cs)}`;
}

function fmtLap(ms: number) {
  const { hh, mm, ss, cs } = split(ms);
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}.${pad(cs)}`;
}

/**
 * Static tick ring. It only depends on the theme, so it is memoised — the old
 * build rebuilt all 120 <Line> elements on every 30 ms timer tick.
 */
const TickRing = React.memo(function TickRing({
  tickColor, faceColor, bezelColor, borderColor,
}: {
  tickColor: string; faceColor: string; bezelColor: string; borderColor: string;
}) {
  const ticks = useMemo(
    () =>
      Array.from({ length: TICK_COUNT }).map((_, i) => {
        const deg = (i / TICK_COUNT) * 360;
        const major = i % 5 === 0;
        const len = major ? BAND_W * 0.55 : BAND_W * 0.28;
        const o = pt(CX, CY, RING_R - 1, deg);
        const inn = pt(CX, CY, RING_R - 1 - len, deg);
        return { key: i, o, inn, major };
      }),
    [],
  );

  return (
    <>
      <Circle cx={CX} cy={CY} r={RING_R} fill={bezelColor} stroke={borderColor} strokeWidth={1.5} />
      {ticks.map((t) => (
        <Line
          key={t.key}
          x1={t.o.x} y1={t.o.y} x2={t.inn.x} y2={t.inn.y}
          stroke={tickColor}
          strokeWidth={t.major ? 1.6 : 0.8}
          opacity={t.major ? 0.7 : 0.3}
        />
      ))}
      <Circle cx={CX} cy={CY} r={FACE_R} fill={faceColor} stroke={borderColor} strokeWidth={1} />
    </>
  );
});

export default function StopwatchScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<StopwatchPersisted>('stopwatch', DEFAULT_STATE);
  const haptic = useHaptic();

  /**
   * The ticking value lives in local state, not in the persisted store.
   * Previously every 30 ms frame flowed through the debounced AsyncStorage
   * writer, so a running stopwatch hammered the disk. Only start/stop/lap —
   * events, not frames — touch storage now, and elapsed time is always derived
   * from wall-clock timestamps so it survives backgrounding.
   */
  const [elapsed, setElapsed] = useState(0);
  const frame = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = state.startedAt !== null;

  const computeElapsed = useCallback(
    (s: StopwatchPersisted) => (s.startedAt === null ? s.banked : s.banked + (Date.now() - s.startedAt)),
    [],
  );

  useEffect(() => {
    setElapsed(computeElapsed(state));
    if (state.startedAt === null) {
      if (frame.current) clearInterval(frame.current);
      frame.current = null;
      return;
    }
    frame.current = setInterval(() => setElapsed(computeElapsed(state)), 33);
    return () => {
      if (frame.current) clearInterval(frame.current);
      frame.current = null;
    };
  }, [state.startedAt, state.banked, computeElapsed]);

  const handleStartStop = useCallback(() => {
    haptic('medium');
    setState((p) =>
      p.startedAt === null
        ? { ...p, startedAt: Date.now() }
        : { ...p, banked: p.banked + (Date.now() - p.startedAt), startedAt: null },
    );
  }, [setState, haptic]);

  const handleLap = useCallback(() => {
    haptic('light');
    setState((p) => {
      if (p.startedAt === null) return p;
      const total = p.banked + (Date.now() - p.startedAt);
      const last = p.laps.length > 0 ? p.laps[p.laps.length - 1].time : 0;
      return { ...p, laps: [...p.laps, { id: p.laps.length + 1, time: total, delta: total - last }] };
    });
  }, [setState, haptic]);

  const handleReset = useCallback(() => {
    haptic('medium');
    setElapsed(0);
    setState(DEFAULT_STATE);
  }, [setState, haptic]);

  const deleteLap = useCallback(
    (id: number) => {
      haptic('light');
      setState((p) => {
        const kept = p.laps.filter((l) => l.id !== id);
        // Re-derive deltas so the remaining laps stay internally consistent
        let prev = 0;
        return {
          ...p,
          laps: kept.map((l, i) => {
            const lap = { ...l, id: i + 1, delta: l.time - prev };
            prev = l.time;
            return lap;
          }),
        };
      });
    },
    [setState, haptic],
  );

  const copyLaps = useCallback(async () => {
    if (state.laps.length === 0) return;
    const text = state.laps
      .map((l) => `Lap ${l.id}\t${fmtLap(l.delta)}\t(total ${fmtLap(l.time)})`)
      .join('\n');
    await Clipboard.setStringAsync(text);
    haptic('success');
    toast('Laps copied');
  }, [state.laps, haptic]);

  // Best/worst computed once per lap list, not once per rendered row
  const { best, worst } = useMemo(() => {
    if (state.laps.length < 2) return { best: -1, worst: -1 };
    const deltas = state.laps.map((l) => l.delta);
    return { best: Math.min(...deltas), worst: Math.max(...deltas) };
  }, [state.laps]);

  const showHours = elapsed >= 3600000;
  const dotDeg = ((elapsed / 1000) % 60 / 60) * 360;
  const dotPos = pt(CX, CY, RING_R - BAND_W / 2, dotDeg);

  const reversedLaps = useMemo(() => [...state.laps].reverse(), [state.laps]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Stopwatch"
        utilityId="stopwatch"
        accentColor={ACCENT}
        subtitle={state.laps.length > 0 ? `${state.laps.length} lap${state.laps.length === 1 ? '' : 's'}` : undefined}
        onClearData={clearState}
        rightAction={
          state.laps.length > 0 ? (
            <HeaderKey
              icon="copy-outline"
              label="Copy laps"
              fg={onColour(ACCENT)}
              onPress={copyLaps}
            />
          ) : undefined
        }
      />

      {/* Ring */}
      <Animated.View entering={FadeInDown.delay(40).duration(300)} style={styles.ringWrap}>
        <Svg width={RING_SZ} height={RING_SZ}>
          <TickRing
            tickColor={colors.textSecondary}
            faceColor={colors.surface}
            bezelColor={colors.card}
            borderColor={colors.border}
          />
          {elapsed > 0 && (
            <>
              <Circle cx={dotPos.x} cy={dotPos.y} r={BAND_W * 0.38} fill={RESET_COLOR} />
              <Circle
                cx={dotPos.x} cy={dotPos.y} r={BAND_W * 0.55}
                fill="none" stroke={RESET_COLOR} strokeWidth={1} opacity={0.35}
              />
            </>
          )}
        </Svg>

        <View style={styles.timeOverlay} pointerEvents="none">
          <Text
            style={[styles.timeDigits, { color: colors.text }, showHours && styles.timeDigitsSmall]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {fmtClock(elapsed)}
          </Text>
          {running && (
            <View style={[styles.runningPill, { backgroundColor: ACCENT + '20' }]}>
              <View style={[styles.runningDot, { backgroundColor: ACCENT }]} />
              <Text style={[styles.runningTxt, { color: ACCENT }]}>RUNNING</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Laps */}
      {state.laps.length > 0 ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.lapsSection}>
          <FlatList
            data={reversedLaps}
            keyExtractor={(l) => String(l.id)}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lapsGrid}
            columnWrapperStyle={styles.lapsRow}
            renderItem={({ item }) => {
              const isBest = state.laps.length > 1 && item.delta === best;
              const isWorst = state.laps.length > 1 && item.delta === worst && best !== worst;
              const timeClr = isBest ? BEST_COLOR : isWorst ? RESET_COLOR : colors.text;
              return (
                <View style={[styles.lapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.lapCardHeader}>
                    <Text style={[styles.lapCardLabel, { color: colors.textSecondary }]}>LAP {item.id}</Text>
                    <Pressable
                      onPress={() => deleteLap(item.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete lap ${item.id}`}
                    >
                      <Ionicons name="close" size={14} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.lapCardTime, { color: timeClr }]}>{fmtLap(item.delta)}</Text>
                  <Text style={[styles.lapCardTotal, { color: colors.textTertiary }]}>
                    {fmtLap(item.time)}
                  </Text>
                  {(isBest || isWorst) && (
                    <Text style={[styles.lapCardBadge, { color: isBest ? BEST_COLOR : RESET_COLOR }]}>
                      {isBest ? '▲ Fastest' : '▼ Slowest'}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        </Animated.View>
      ) : (
        <View style={styles.lapsSection}>
          <Text style={[styles.lapHint, { color: colors.textTertiary }]}>
            {running ? 'Tap LAP to record a split' : 'Tap START to begin'}
          </Text>
        </View>
      )}

      {/* Controls */}
      <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.controls}>
        <PressablePlate
          onPress={handleStartStop}
          accessibilityLabel={running ? 'Pause' : 'Start'}
          offset={plate.base}
          radius={radius.md}
          fill={running ? colors.card : START_COLOR}
          style={styles.ctrlOuter}
          contentStyle={styles.ctrlBtn}
        >
          <Text
            style={[
              styles.ctrlBtnTxt,
              { color: running ? START_COLOR : onColour(START_COLOR) },
            ]}
          >
            {running ? 'PAUSE' : elapsed > 0 ? 'RESUME' : 'START'}
          </Text>
        </PressablePlate>

        {running ? (
          <PressablePlate
            onPress={handleLap}
            accessibilityLabel="Record a lap"
            offset={plate.base}
            radius={radius.md}
            fill={colors.card}
            style={styles.ctrlOuter}
            contentStyle={styles.ctrlBtn}
          >
            <Text style={[styles.ctrlBtnTxt, { color: colors.text }]}>LAP</Text>
          </PressablePlate>
        ) : (
          <PressablePlate
            onPress={handleReset}
            disabled={elapsed === 0 && state.laps.length === 0}
            accessibilityLabel="Reset"
            offset={plate.base}
            radius={radius.md}
            fill={colors.card}
            style={styles.ctrlOuter}
            contentStyle={styles.ctrlBtn}
          >
            <Text style={[styles.ctrlBtnTxt, { color: RESET_COLOR }]}>RESET</Text>
          </PressablePlate>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  disabled: { opacity: 0.3 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12,
    borderWidth: border.base,
    alignItems: 'center', justifyContent: 'center',
  },

  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: FACE_R * 2 * 0.82,
    gap: 8,
  },
  timeDigits: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timeDigitsSmall: { fontSize: 38, letterSpacing: 1 },
  runningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  runningDot: { width: 5, height: 5, borderRadius: 3 },
  runningTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },

  lapsSection: { flex: 1, paddingHorizontal: H_PAD },
  lapHint: { textAlign: 'center', fontSize: typography.sizes.sm, paddingTop: spacing.lg },
  lapsGrid: { gap: 10, paddingBottom: spacing.md },
  lapsRow: { gap: 10 },
  lapCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: border.base,
    padding: spacing.md,
    gap: 2,
  },
  lapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  lapCardLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  lapCardTime: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  lapCardTotal: { fontSize: 11, fontVariant: ['tabular-nums'] },
  lapCardBadge: { fontSize: 10, fontWeight: '700', marginTop: 2 },

  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  ctrlOuter: { flex: 1 },
  ctrlBtn: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnTxt: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
