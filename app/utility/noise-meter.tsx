import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet, View, Text, Pressable, Dimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, {
  Path, Circle, Line, Text as SvgText,
  Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { NoiseState } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCENT      = '#F43F5E';
const DB_MAX      = 120;
const HISTORY_LEN = 60;   // number of data points in the line chart

const DEFAULT_STATE: NoiseState = {
  minDb: 999, maxDb: 0, avgDb: 0, sampleCount: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dbToColor(db: number): string {
  if (db < 50)  return '#84CC16';   // lime-green
  if (db < 70)  return '#F59E0B';
  if (db < 85)  return '#F97316';
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

// ─── Semicircle Gauge ─────────────────────────────────────────────────────────
// Flat-bottom 180° gauge matching the reference image exactly.
// The gauge lives in a square canvas; the flat diameter is the bottom edge.

const { width: SW } = Dimensions.get('window');
const GW  = Math.min(SW - 32, 340);  // gauge SVG width
const GH  = GW * 0.58;               // height = radius + padding
const GCX = GW / 2;
const GCY = GH - 10;                 // pivot sits near the bottom
const GR  = GH - 24;                 // radius of the main arc

// polar coords: 0° = 3 o'clock, gauge runs 180°→0° (left to right, flat bottom)
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

// db → angle: 0 dB = 180° (left), 120 dB = 0° (right)
function dbToAngle(db: number): number {
  const pct = Math.min(Math.max(db / DB_MAX, 0), 1);
  return 180 - pct * 180;  // 180° → 0°
}

interface GaugeProps {
  db: number;
  targetDb: number;   // raw (un-smoothed) for the target marker
  colors: any;
}

function SemicircleGauge({ db, targetDb, colors }: GaugeProps) {
  const needleAngle = dbToAngle(db);
  const needleTip   = polar(GCX, GCY, GR - 14, needleAngle);
  const needleColor = dbToColor(db);

  // Build tick marks: 25 ticks across 180°, every 7.5°
  const TICK_COUNT = 25;
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const angleDeg = 180 - (i / (TICK_COUNT - 1)) * 180;
    const isMajor  = i % 6 === 0;           // major tick every ~45°
    const isMid    = i % 3 === 0;           // medium tick every ~22.5°
    const outerR   = GR + 4;
    const innerR   = isMajor ? GR - 16 : isMid ? GR - 10 : GR - 6;
    const o = polar(GCX, GCY, outerR, angleDeg);
    const n = polar(GCX, GCY, innerR, angleDeg);
    return { o, n, isMajor, isMid, angleDeg };
  });

  // Label positions: 0, 60, 120
  const labelAngles = [
    { db: 0,   angle: 180, label: '0' },
    { db: 60,  angle: 90,  label: '60' },
    { db: 120, angle: 0,   label: '120' },
  ];

  return (
    <Svg width={GW} height={GH}>
      {/* Arc track */}
      <Path
        d={`M ${polar(GCX, GCY, GR, 180).x} ${polar(GCX, GCY, GR, 180).y}
            A ${GR} ${GR} 0 0 1 ${polar(GCX, GCY, GR, 0).x} ${polar(GCX, GCY, GR, 0).y}`}
        fill="none"
        stroke={colors.border}
        strokeWidth={2}
      />

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <Line
          key={i}
          x1={t.o.x} y1={t.o.y}
          x2={t.n.x} y2={t.n.y}
          stroke={t.isMajor ? colors.text : colors.textSecondary}
          strokeWidth={t.isMajor ? 2 : t.isMid ? 1.5 : 1}
          opacity={t.isMajor ? 0.8 : t.isMid ? 0.5 : 0.35}
          strokeLinecap="round"
        />
      ))}

      {/* Labels: 0, 60, 120 */}
      {labelAngles.map(({ db: d, angle, label }) => {
        const pos = polar(GCX, GCY, GR - 28, angle);
        return (
          <SvgText
            key={d}
            x={pos.x} y={pos.y + 4}
            textAnchor="middle"
            fontSize={13}
            fontWeight="600"
            fill={colors.textSecondary}
          >
            {label}
          </SvgText>
        );
      })}

      {/* Needle shadow (subtle) */}
      <Line
        x1={GCX} y1={GCY}
        x2={needleTip.x + 1} y2={needleTip.y + 1}
        stroke="rgba(0,0,0,0.12)"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* Needle */}
      <Line
        x1={GCX} y1={GCY}
        x2={needleTip.x} y2={needleTip.y}
        stroke={needleColor}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Pivot circle */}
      <Circle cx={GCX} cy={GCY} r={9}  fill={needleColor} />
      <Circle cx={GCX} cy={GCY} r={4}  fill={colors.bg} />
    </Svg>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
const CW   = SW - 32;  // chart width
const CH   = 160;      // chart height
const PADL = 34;       // left padding for Y labels
const PADB = 20;       // bottom padding for X labels
const PADT = 10;
const PADR = 8;
const PLOT_W = CW - PADL - PADR;
const PLOT_H = CH - PADB - PADT;

const Y_LABELS = [0, 20, 40, 60, 80, 100, 120];

interface LineChartProps {
  data: number[];
  colors: any;
}

function LineChart({ data, colors }: LineChartProps) {
  if (data.length < 2) {
    return (
      <Svg width={CW} height={CH}>
        {Y_LABELS.map((y) => {
          const yPos = PADT + PLOT_H - (y / 120) * PLOT_H;
          return (
            <React.Fragment key={y}>
              <Line x1={PADL} y1={yPos} x2={CW - PADR} y2={yPos}
                stroke={colors.border} strokeWidth={0.5} opacity={0.5} />
              <SvgText x={PADL - 4} y={yPos + 4} textAnchor="end"
                fontSize={10} fill={colors.textTertiary}>{y}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    );
  }

  // Build SVG polyline points
  const points = data.map((v, i) => {
    const x = PADL + (i / (HISTORY_LEN - 1)) * PLOT_W;
    const y = PADT + PLOT_H - (Math.min(v, 120) / 120) * PLOT_H;
    return `${x},${y}`;
  });

  // Area fill path (close down to baseline)
  const firstX = PADL;
  const lastX  = PADL + ((data.length - 1) / (HISTORY_LEN - 1)) * PLOT_W;
  const baseY  = PADT + PLOT_H;
  const areaPath = `M ${firstX},${baseY} L ${points.join(' L ')} L ${lastX},${baseY} Z`;
  const linePath = `M ${points.join(' L ')}`;

  // X labels: show at 0, 5, 10, 15 (every 5 seconds at 150ms interval → every ~33 points)
  const xLabels = [0, Math.floor(HISTORY_LEN / 3), Math.floor((2 * HISTORY_LEN) / 3), HISTORY_LEN - 1];

  return (
    <Svg width={CW} height={CH}>
      <Defs>
        <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%"   stopColor="#84CC16" />
          <Stop offset="60%"  stopColor="#06B6D4" />
          <Stop offset="100%" stopColor="#8B5CF6" />
        </LinearGradient>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor="#84CC16" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#84CC16" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Horizontal grid lines + Y labels */}
      {Y_LABELS.map((y) => {
        const yPos = PADT + PLOT_H - (y / 120) * PLOT_H;
        return (
          <React.Fragment key={y}>
            <Line
              x1={PADL} y1={yPos} x2={CW - PADR} y2={yPos}
              stroke={colors.border} strokeWidth={0.5} opacity={0.6}
            />
            <SvgText
              x={PADL - 4} y={yPos + 4}
              textAnchor="end" fontSize={10}
              fill={colors.textTertiary}
            >
              {y}
            </SvgText>
          </React.Fragment>
        );
      })}

      {/* Area fill */}
      <Path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <Path
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X labels */}
      {xLabels.map((xi, i) => {
        const xPos = PADL + (xi / (HISTORY_LEN - 1)) * PLOT_W;
        return (
          <SvgText
            key={i}
            x={xPos} y={CH - 4}
            textAnchor="middle" fontSize={10}
            fill={colors.textTertiary}
          >
            {i * 5}
          </SvgText>
        );
      })}

      {/* X-axis baseline */}
      <Line
        x1={PADL} y1={PADT + PLOT_H}
        x2={CW - PADR} y2={PADT + PLOT_H}
        stroke={colors.border} strokeWidth={1}
      />
      {/* Y-axis */}
      <Line
        x1={PADL} y1={PADT}
        x2={PADL} y2={PADT + PLOT_H}
        stroke={colors.border} strokeWidth={1}
      />
    </Svg>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NoiseMeterScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<NoiseState>('noise', DEFAULT_STATE);

  const [currentDb,  setCurrentDb]  = useState(0);
  const [isActive,   setIsActive]   = useState(false);
  const [permError,  setPermError]  = useState(false);
  const [history,    setHistory]    = useState<number[]>([]);

  const recordingRef   = useRef<Audio.Recording | null>(null);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const smoothedDbRef  = useRef<number>(0);

  // ── Meter control ──────────────────────────────────────────────────────────
  const stopMeter = async () => {
    smoothedDbRef.current = 0;
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

        const dBFS   = Math.max(status.metering ?? -60, -60);
        const rawSPL = dBFS + 90;
        const spl    = Math.min(120, Math.max(25, rawSPL));

        const ALPHA = 0.25;
        smoothedDbRef.current = smoothedDbRef.current === 0
          ? spl
          : ALPHA * spl + (1 - ALPHA) * smoothedDbRef.current;

        const db = Math.round(smoothedDbRef.current);
        setCurrentDb(db);

        setHistory((prev) => {
          const next = [...prev, db];
          return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
        });

        if (db > 28) {
          setState((p) => {
            const minDb       = Math.min(p.minDb === 999 ? db : p.minDb, db);
            const maxDb       = Math.max(p.maxDb, db);
            const sampleCount = p.sampleCount + 1;
            const avgDb       = (p.avgDb * p.sampleCount + db) / sampleCount;
            return { ...p, minDb, maxDb, avgDb, sampleCount };
          });
        }
      } catch {}
    }, 150);
  };

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isActive) stopMeter(); else startMeter();
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState({ minDb: 999, maxDb: 0, avgDb: 0, sampleCount: 0 });
    setHistory([]);
    smoothedDbRef.current = 0;
    setCurrentDb(0);
  };

  useEffect(() => () => { stopMeter(); }, []);

  const accentColor = dbToColor(currentDb);
  const roundDb     = currentDb;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader title="Noise Meter" utilityId="noise" accentColor={ACCENT} onClearData={clearState} />

      <View style={styles.content}>

        {/* ── Gauge card ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <View style={[styles.gaugeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.gaugeWrap}>
              <SemicircleGauge db={currentDb} targetDb={currentDb} colors={colors} />
            </View>

            {/* dB value directly below needle pivot */}
            <View style={styles.dbRow}>
              <Text style={[styles.dbValue, { color: colors.text }]}>{roundDb}</Text>
              <Text style={[styles.dbUnit, { color: colors.textSecondary }]}> dB</Text>
            </View>
            <Text style={[styles.dbLabel, { color: accentColor }]}>
              {dbToLabel(currentDb)}
            </Text>
          </View>
        </Animated.View>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { label: 'MIN', value: state.minDb === 999 ? '—' : `${Math.round(state.minDb)} dB` },
              { label: 'AVG', value: state.sampleCount > 0 ? `${Math.round(state.avgDb)} dB` : '—' },
              { label: 'MAX', value: state.maxDb > 0 ? `${Math.round(state.maxDb)} dB` : '—' },
            ].map(({ label, value }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </Animated.View>

        {/* ── Line chart ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LineChart data={history} colors={colors} />
          </View>
        </Animated.View>

        {/* ── Controls ────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={styles.controls}>
            <Pressable
              onPress={startMeter}
              disabled={isActive}
              style={[
                styles.ctrlBtn,
                { backgroundColor: !isActive ? colors.text : colors.card,
                  borderColor: colors.border },
              ]}
            >
              <Text style={[styles.ctrlTxt, { color: !isActive ? colors.bg : colors.textTertiary }]}>
                Start
              </Text>
            </Pressable>
            <Pressable
              onPress={stopMeter}
              disabled={!isActive}
              style={[
                styles.ctrlBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.ctrlTxt, { color: isActive ? colors.text : colors.textTertiary }]}>
                Stop
              </Text>
            </Pressable>
            <Pressable
              onPress={handleReset}
              style={[styles.ctrlBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.ctrlTxt, { color: colors.text }]}>Reset</Text>
            </Pressable>
          </View>
        </Animated.View>

        {permError && (
          <Text style={[styles.permErr, { color: colors.textSecondary }]}>
            ⚠️  Microphone permission required
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },

  // Gauge card
  gaugeCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  gaugeWrap: { alignItems: 'center' },
  dbRow: { flexDirection: 'row', alignItems: 'baseline' },
  dbValue: {
    fontSize: 48,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  dbUnit: { fontSize: 20, fontWeight: typography.weights.medium },
  dbLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, letterSpacing: 0.5 },

  // Stats
  statsCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold, letterSpacing: 0.8 },
  statDivider: { width: 1, marginVertical: spacing.xs },

  // Chart
  chartCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    paddingLeft: spacing.sm,
  },

  // Controls — three equal buttons matching reference
  controls: { flexDirection: 'row', gap: spacing.sm },
  ctrlBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  ctrlTxt: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  permErr: { textAlign: 'center', fontSize: typography.sizes.sm },
});