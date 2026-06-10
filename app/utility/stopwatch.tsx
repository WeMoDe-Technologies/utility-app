import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { StopwatchState } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────────
const ACCENT      = '#14B8A6';
const START_COLOR = '#8B5CF6';   // purple — matches START label in reference
const RESET_COLOR = '#F43F5E';   // red    — matches RESET label in reference
const DOT_COLOR   = '#F43F5E';   // progress dot colour

// ─── Layout — computed once ────────────────────────────────────────────────
const { width: SW } = Dimensions.get('window');
const H_PAD   = 24;
// Ring fits comfortably: 80% of screen width, max 300px
const RING_SZ = Math.min(SW * 0.80, 300);
const CX      = RING_SZ / 2;
const CY      = RING_SZ / 2;
const RING_R  = RING_SZ / 2 - 2;       // outer edge of tick band (2px SVG margin)
const BAND_W  = RING_SZ * 0.095;       // width of the tick band (9.5% of diameter)
const TICK_R  = RING_R;                // ticks start at outer edge
const FACE_R  = RING_R - BAND_W;       // inner face radius

// ─── Helpers ───────────────────────────────────────────────────────────────
function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function fmt(ms: number) {
  const t  = Math.max(0, Math.floor(ms));
  const hh = Math.floor(t / 3600000).toString().padStart(2, '0');
  const mm = Math.floor((t % 3600000) / 60000).toString().padStart(2, '0');
  const ss = Math.floor((t % 60000) / 1000).toString().padStart(2, '0');
  const cs = Math.floor((t % 1000) / 10).toString().padStart(2, '0');
  return { hh, mm, ss, cs };
}

function fmtLap(ms: number) {
  const { hh, mm, ss, cs } = fmt(ms);
  if (parseInt(hh) > 0) return `${hh}:${mm}:${ss}`;
  return `${mm}:${ss}:${cs}`;
}

// ─── Tick marks — built inside component so theme color is available ──────
const TICK_COUNT = 120;

// ─── Default state ─────────────────────────────────────────────────────────
const DEFAULT_STATE: StopwatchState = {
  isRunning: false,
  elapsedMs: 0,
  laps: [],
};

// ─── Screen ────────────────────────────────────────────────────────────────
export default function StopwatchScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<StopwatchState>(
    'stopwatch',
    DEFAULT_STATE,
  );
  const startRef    = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.isRunning) {
      startRef.current = Date.now() - state.elapsedMs;
      intervalRef.current = setInterval(() => {
        setState((p) => ({ ...p, elapsedMs: Date.now() - startRef.current }));
      }, 30);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state.isRunning]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStartStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((p) => ({ ...p, isRunning: !p.isRunning }));
  };

  const handleLap = () => {
    if (!state.isRunning) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => {
      const last = p.laps.length > 0 ? p.laps[p.laps.length - 1].time : 0;
      return {
        ...p,
        laps: [...p.laps, { id: p.laps.length + 1, time: p.elapsedMs, delta: p.elapsedMs - last }],
      };
    });
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState({ isRunning: false, elapsedMs: 0, laps: [] });
  };

  const deleteLap = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({
      ...p,
      laps: p.laps.filter(l => l.id !== id).map((l, i) => ({ ...l, id: i + 1 })),
    }));
  };

  // ── Time display ──────────────────────────────────────────────────────────
  const { hh, mm, ss, cs } = fmt(state.elapsedMs);
  const showHours = parseInt(hh) > 0;

  // ── Progress dot position (rotates around ring, 1 rev per 60s) ───────────
  const dotDeg = (state.elapsedMs / 1000 % 60) / 60 * 360;
  const dotPos = pt(CX, CY, RING_R - BAND_W / 2, dotDeg);  // midpoint of tick band

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Stopwatch"
        utilityId="stopwatch"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      {/* ── Ring + digital display ──────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.delay(40).duration(300)} style={styles.ringWrap}>
        <Svg width={RING_SZ} height={RING_SZ}>

          {/* ── Outer bezel ring (theme-aware border) ── */}
          <Circle cx={CX} cy={CY} r={RING_R}
            fill={colors.card}
            stroke={colors.border}
            strokeWidth={1.5}
          />

          {/* ── Tick marks — built here so they use theme color ── */}
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            const deg   = (i / TICK_COUNT) * 360;
            const major = i % 5 === 0;
            const len   = major ? BAND_W * 0.55 : BAND_W * 0.28;
            const o     = pt(CX, CY, TICK_R - 1, deg);
            const inn   = pt(CX, CY, TICK_R - 1 - len, deg);
            return (
              <Line key={i}
                x1={o.x} y1={o.y} x2={inn.x} y2={inn.y}
                stroke={colors.textSecondary}
                strokeWidth={major ? 1.6 : 0.8}
                opacity={major ? 0.7 : 0.3}
              />
            );
          })}

          {/* ── Inner face circle ── */}
          <Circle cx={CX} cy={CY} r={FACE_R}
            fill={colors.surface}
            stroke={colors.border}
            strokeWidth={1}
          />

          {/* ── Progress dot — sits on midpoint of tick band ── */}
          {state.elapsedMs > 0 && (
            <>
              <Circle
                cx={dotPos.x} cy={dotPos.y} r={BAND_W * 0.38}
                fill={DOT_COLOR}
              />
              <Circle
                cx={dotPos.x} cy={dotPos.y} r={BAND_W * 0.55}
                fill="none"
                stroke={DOT_COLOR}
                strokeWidth={1}
                opacity={0.35}
              />
            </>
          )}

        </Svg>

        {/* Digital time — absolutely centred over SVG */}
        <View style={styles.timeOverlay} pointerEvents="none">
          <Text style={[styles.timeDigits, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {showHours ? `${hh}:${mm}:${ss}` : `${mm}:${ss}:${cs}`}
          </Text>
          {state.laps.length > 0 && (
            <Text style={[styles.lapIndicator, { color: colors.textTertiary }]}>
              LAP {state.laps.length + (state.isRunning ? 1 : 0)}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* ── Lap cards ───────────────────────────────────────────────────────── */}
      {state.laps.length > 0 && (
        <Animated.View entering={FadeIn.duration(220)} style={styles.lapsSection}>
          <FlatList
            data={[...state.laps].reverse()}
            keyExtractor={(l) => l.id.toString()}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lapsGrid}
            columnWrapperStyle={styles.lapsRow}
            renderItem={({ item }) => {
              const minLap = Math.min(...state.laps.map(l => l.delta));
              const maxLap = Math.max(...state.laps.map(l => l.delta));
              const best   = state.laps.length > 1 && item.delta === minLap;
              const worst  = state.laps.length > 1 && item.delta === maxLap;
              const timeClr = best ? '#10B981' : worst ? RESET_COLOR : colors.text;
              return (
                <View style={[styles.lapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.lapCardHeader}>
                    <Text style={[styles.lapCardLabel, { color: colors.textSecondary }]}>
                      LAP {item.id}
                    </Text>
                    <Pressable
                      onPress={() => deleteLap(item.id)}
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.lapCardTime, { color: timeClr }]}>
                    {fmtLap(item.delta)}
                  </Text>
                  {(best || worst) && (
                    <Text style={[styles.lapCardBadge, { color: best ? '#10B981' : RESET_COLOR }]}>
                      {best ? '▲ Best' : '▼ Worst'}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        </Animated.View>
      )}

      {/* ── Bottom controls ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(280)}
        style={styles.controls}
      >
        {/* START / PAUSE */}
        <Pressable
          onPress={handleStartStop}
          style={[styles.ctrlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.ctrlBtnTxt, { color: START_COLOR }]}>
            {state.isRunning ? 'PAUSE' : 'START'}
          </Text>
        </Pressable>

        {/* LAP (only while running) or RESET (when stopped) */}
        {state.isRunning ? (
          <Pressable
            onPress={handleLap}
            style={[styles.ctrlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.ctrlBtnTxt, { color: colors.textSecondary }]}>LAP</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleReset}
            disabled={state.elapsedMs === 0}
            style={[
              styles.ctrlBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
              state.elapsedMs === 0 && { opacity: 0.3 },
            ]}
          >
            <Text style={[styles.ctrlBtnTxt, { color: RESET_COLOR }]}>RESET</Text>
          </Pressable>
        )}
      </Animated.View>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Ring
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
    width: FACE_R * 2 * 0.8,
  },
  timeDigits: {
    fontSize: 42,
    fontWeight: '200',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  lapIndicator: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 6,
  },

  // Laps grid
  lapsSection: {
    flex: 1,
    paddingHorizontal: H_PAD,
  },
  lapsGrid: {
    gap: 10,
    paddingBottom: spacing.md,
  },
  lapsRow: {
    gap: 10,
  },
  lapCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 4,
  },
  lapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  lapCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lapCardTime: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  lapCardBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: H_PAD,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  ctrlBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
});