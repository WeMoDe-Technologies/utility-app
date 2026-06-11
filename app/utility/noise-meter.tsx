import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { NoiseState } from '@/types';

const ACCENT = '#F43F5E';

const DEFAULT_STATE: NoiseState = {
  minDb: 999,
  maxDb: 0,
  avgDb: 0,
  sampleCount: 0,
};

// dB reference labels
const DB_REFS = [
  { db: 20,  label: 'Whisper',    color: '#10B981' },
  { db: 40,  label: 'Quiet room', color: '#10B981' },
  { db: 60,  label: 'Conversation', color: '#F59E0B' },
  { db: 80,  label: 'Traffic',    color: '#F97316' },
  { db: 100, label: 'Concert',    color: '#EF4444' },
  { db: 120, label: 'Threshold',  color: '#DC2626' },
];

function dbToColor(db: number): string {
  if (db < 50) return '#10B981';
  if (db < 70) return '#F59E0B';
  if (db < 85) return '#F97316';
  return '#EF4444';
}

function dbToLabel(db: number): string {
  if (db < 30) return 'Very Quiet';
  if (db < 50) return 'Quiet';
  if (db < 65) return 'Moderate';
  if (db < 80) return 'Loud';
  if (db < 95) return 'Very Loud';
  return 'Dangerous';
}

// Arc gauge
const G_SIZE  = 280;
const G_CX    = G_SIZE / 2;
const G_CY    = G_SIZE / 2 + 20;
const G_R     = 110;
const START_A = 220; // degrees
const END_A   = 320; // total sweep = 260°
const SWEEP   = (360 - START_A + END_A);

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function gaugePath(cx: number, cy: number, r: number, start: number, sweep: number) {
  const end = start + sweep;
  const s = polarXY(cx, cy, r, start);
  const e = polarXY(cx, cy, r, end);
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

function needleXY(cx: number, cy: number, r: number, db: number) {
  const pct = Math.min(Math.max((db - 0) / 130, 0), 1);
  const angle = START_A + pct * SWEEP;
  return polarXY(cx, cy, r, angle);
}

export default function NoiseMeterScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<NoiseState>('noise', DEFAULT_STATE);

  const [currentDb, setCurrentDb]   = useState(0);
  const [isActive,  setIsActive]    = useState(false);
  const [permError, setPermError]   = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyRef   = useRef<number[]>([]);

  // Waveform bars
  const [bars, setBars] = useState<number[]>(Array(32).fill(0));

  // Animated needle
  const needleAnim = useSharedValue(0);
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAnim.value}deg` }],
  }));

  const stopMeter = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
    setIsActive(false);
  };

  const startMeter = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') { setPermError(true); return; }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const rec = new Audio.Recording();
    try {
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android },
        ios: { ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios },
        isMeteringEnabled: true,
      });
      await rec.startAsync();
      recordingRef.current = rec;
      setIsActive(true);
    } catch { return; }

    intervalRef.current = setInterval(async () => {
      try {
        const status = await rec.getStatusAsync();
        if (!status.isRecording) return;

        const raw = status.metering ?? -160;
        // Convert metering (-160..0) to approx dB SPL (30..120)
        const db = Math.max(0, Math.min(130, ((raw + 160) / 160) * 130));
        setCurrentDb(db);

        // Needle animation
        const pct = db / 130;
        needleAnim.value = withTiming(START_A + pct * SWEEP - 90, {
          duration: 120, easing: Easing.out(Easing.quad),
        });

        // Waveform
        setBars((prev) => {
          const next = [...prev.slice(1), db];
          return next;
        });

        // Stats
        historyRef.current.push(db);
        setState((p) => {
          const minDb = Math.min(p.minDb === 999 ? db : p.minDb, db);
          const maxDb = Math.max(p.maxDb, db);
          const sampleCount = p.sampleCount + 1;
          const avgDb = (p.avgDb * p.sampleCount + db) / sampleCount;
          return { ...p, minDb, maxDb, avgDb, sampleCount };
        });
      } catch {}
    }, 150);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) stopMeter(); else startMeter();
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    historyRef.current = [];
    setState({ minDb: 999, maxDb: 0, avgDb: 0, sampleCount: 0 });
    setBars(Array(32).fill(0));
    setCurrentDb(0);
    needleAnim.value = withTiming(START_A - 90, { duration: 300 });
  };

  useEffect(() => () => { stopMeter(); }, []);

  const accentColor = dbToColor(currentDb);
  const roundDb = Math.round(currentDb);

  // Gauge paths
  const trackPath  = gaugePath(G_CX, G_CY, G_R, START_A, SWEEP);
  const fillSweep  = (Math.min(currentDb, 130) / 130) * SWEEP;
  const fillPath   = fillSweep > 2 ? gaugePath(G_CX, G_CY, G_R, START_A, fillSweep) : null;

  // Needle tip
  const needleTip = needleXY(G_CX, G_CY, G_R - 12, currentDb);
  const needleBase = polarXY(G_CX, G_CY, 14, START_A + (currentDb / 130) * SWEEP);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader title="Noise Meter" utilityId="noise" accentColor={ACCENT} onClearData={clearState} />

      <View style={styles.content}>

        {/* Gauge */}
        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <View style={styles.gaugeWrap}>
            <Svg width={G_SIZE} height={G_SIZE * 0.72}>
              <Defs>
                <LinearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%"   stopColor="#10B981" />
                  <Stop offset="40%"  stopColor="#F59E0B" />
                  <Stop offset="70%"  stopColor="#F97316" />
                  <Stop offset="100%" stopColor="#EF4444" />
                </LinearGradient>
              </Defs>

              {/* Track */}
              <Path d={trackPath} fill="none" stroke={colors.card} strokeWidth={18} strokeLinecap="round" />

              {/* Fill */}
              {fillPath && (
                <Path d={fillPath} fill="none" stroke="url(#gaugeFill)" strokeWidth={18} strokeLinecap="round" />
              )}

              {/* Tick marks at dB references */}
              {DB_REFS.map(({ db, label, color }) => {
                const pct   = db / 130;
                const angle = START_A + pct * SWEEP;
                const outer = polarXY(G_CX, G_CY, G_R + 14, angle);
                const inner = polarXY(G_CX, G_CY, G_R + 2, angle);
                const text  = polarXY(G_CX, G_CY, G_R + 26, angle);
                return (
                  <React.Fragment key={db}>
                    <Path
                      d={`M ${inner.x} ${inner.y} L ${outer.x} ${outer.y}`}
                      stroke={color} strokeWidth={2} strokeLinecap="round"
                    />
                    <SvgText
                      x={text.x} y={text.y}
                      textAnchor="middle" alignmentBaseline="middle"
                      fontSize={8} fill={color} fontWeight="600"
                    >
                      {db}
                    </SvgText>
                  </React.Fragment>
                );
              })}

              {/* Needle */}
              <Path
                d={`M ${G_CX} ${G_CY} L ${needleTip.x} ${needleTip.y}`}
                stroke={accentColor} strokeWidth={2.5} strokeLinecap="round"
              />
              <Circle cx={G_CX} cy={G_CY} r={8} fill={accentColor} />
              <Circle cx={G_CX} cy={G_CY} r={4} fill={colors.bg} />
            </Svg>

            {/* Center dB display */}
            <View style={styles.dbDisplay} pointerEvents="none">
              <Text style={[styles.dbValue, { color: accentColor }]}>{roundDb}</Text>
              <Text style={[styles.dbUnit, { color: colors.textSecondary }]}>dB</Text>
              <Text style={[styles.dbLabel, { color: accentColor }]}>{dbToLabel(currentDb)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Waveform */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.waveCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.waveBars}>
              {bars.map((b, i) => {
                const h = Math.max(3, (b / 130) * 48);
                const alpha = 0.3 + (i / bars.length) * 0.7;
                return (
                  <View
                    key={i}
                    style={[styles.waveBar, {
                      height: h,
                      backgroundColor: dbToColor(b),
                      opacity: alpha,
                    }]}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <View style={styles.statsRow}>
            {[
              { label: 'MIN',  value: state.minDb === 999 ? '—' : `${Math.round(state.minDb)} dB`, color: '#10B981' },
              { label: 'AVG',  value: state.sampleCount > 0 ? `${Math.round(state.avgDb)} dB` : '—', color: '#F59E0B' },
              { label: 'MAX',  value: state.maxDb > 0 ? `${Math.round(state.maxDb)} dB` : '—', color: '#EF4444' },
            ].map(({ label, value, color }) => (
              <View key={label} style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.statBoxValue, { color }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* dB reference */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={[styles.refCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.refTitle, { color: colors.text }]}>Sound Reference</Text>
            <View style={styles.refGrid}>
              {DB_REFS.map(({ db, label, color }) => (
                <View key={db} style={styles.refItem}>
                  <View style={[styles.refDot, { backgroundColor: color }]} />
                  <Text style={[styles.refLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.refDb, { color }]}>{db} dB</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Controls */}
        <Animated.View entering={FadeInDown.delay(200).duration(280)}>
          <View style={styles.controls}>
            <Pressable
              onPress={handleReset}
              style={[styles.resetBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.resetTxt, { color: colors.textSecondary }]}>Reset</Text>
            </Pressable>
            <Pressable
              onPress={handleToggle}
              style={[styles.mainBtn, { backgroundColor: isActive ? '#EF4444' : ACCENT }]}
            >
              <Text style={styles.mainBtnTxt}>{isActive ? 'Stop' : 'Start'}</Text>
            </Pressable>
          </View>
        </Animated.View>

        {permError && (
          <Text style={[styles.permErr, { color: colors.textSecondary }]}>
            ⚠️ Microphone permission required
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1, paddingHorizontal: spacing.base,
    paddingTop: spacing.sm, gap: spacing.md,
  },
  gaugeWrap: { alignItems: 'center', justifyContent: 'center' },
  dbDisplay: {
    position: 'absolute', alignItems: 'center',
    bottom: 10,
  },
  dbValue: { fontSize: 56, fontWeight: typography.weights.extrabold, letterSpacing: -2, lineHeight: 60 },
  dbUnit: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginTop: -4 },
  dbLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, letterSpacing: 1, marginTop: 2 },

  waveCard: {
    borderRadius: radius.xl, borderWidth: 1,
    padding: spacing.md, height: 72, justifyContent: 'center',
  },
  waveBars: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 56 },
  waveBar: { flex: 1, borderRadius: 2 },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1,
    padding: spacing.md, alignItems: 'center', gap: 4,
  },
  statBoxLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, letterSpacing: 1 },
  statBoxValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.extrabold, fontVariant: ['tabular-nums'] },

  refCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.sm },
  refTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  refGrid: { gap: spacing.xs },
  refItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  refDot: { width: 8, height: 8, borderRadius: 4 },
  refLabel: { flex: 1, fontSize: typography.sizes.xs },
  refDb: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, fontVariant: ['tabular-nums'] },

  controls: { flexDirection: 'row', gap: spacing.md },
  resetBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.xl,
    borderWidth: 1, alignItems: 'center',
  },
  resetTxt: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  mainBtn: {
    flex: 2, paddingVertical: spacing.md, borderRadius: radius.xl,
    alignItems: 'center', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  mainBtnTxt: { color: '#fff', fontSize: typography.sizes.base, fontWeight: typography.weights.bold, letterSpacing: 1 },
  permErr: { textAlign: 'center', fontSize: typography.sizes.sm },
});