import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText, G, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { CompassState } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

const DEFAULT_STATE: CompassState = {
  trueNorth: false,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ACCENT = '#06B6D4';
const ACCENT_GLOW = 'rgba(6, 182, 212, 0.18)';
const NEEDLE_RED = '#EF4444';
const NEEDLE_WHITE = '#F1F5F9';

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE / 2 - 4;
const TICK_MAJOR_INNER = OUTER_R - 18;
const TICK_MINOR_INNER = OUTER_R - 10;
const LABEL_R = OUTER_R - 32;

const CARDINAL_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MAJOR_TICKS = [0, 45, 90, 135, 180, 225, 270, 315]; // every 45°
const CARDINAL_LABELS: Record<string, string> = {
  N: 'N', NE: 'NE', E: 'E', SE: 'SE',
  S: 'S', SW: 'SW', W: 'W', NW: 'NW',
};

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function getCardinalLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CompassRing({ heading }: { heading: number }) {
  const ticks: React.ReactNode[] = [];

  // Draw 72 ticks every 5°
  for (let i = 0; i < 72; i++) {
    const angleDeg = i * 5 - heading;
    const rad = degToRad(angleDeg - 90);
    const isMajor = i % 9 === 0; // every 45°
    const innerR = isMajor ? TICK_MAJOR_INNER : TICK_MINOR_INNER;

    const x1 = CX + OUTER_R * Math.cos(rad);
    const y1 = CY + OUTER_R * Math.sin(rad);
    const x2 = CX + innerR * Math.cos(rad);
    const y2 = CY + innerR * Math.sin(rad);

    ticks.push(
      <Line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={isMajor ? '#94A3B8' : '#334155'}
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
      />
    );
  }

  // Cardinal and intercardinal labels
  const labels: React.ReactNode[] = CARDINAL_DIRS.map((dir, i) => {
    const labelDeg = i * 45 - heading;
    const rad = degToRad(labelDeg - 90);
    const lx = CX + LABEL_R * Math.cos(rad);
    const ly = CY + LABEL_R * Math.sin(rad);
    const isCardinal = i % 2 === 0;
    const isNorth = dir === 'N';

    return (
      <SvgText
        key={dir}
        x={lx}
        y={ly}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize={isCardinal ? (isNorth ? 15 : 12) : 9}
        fontWeight={isCardinal ? '700' : '500'}
        fill={isNorth ? ACCENT : isCardinal ? '#CBD5E1' : '#64748B'}
      >
        {dir}
      </SvgText>
    );
  });

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#1C2333" />
          <Stop offset="100%" stopColor="#0D1117" />
        </RadialGradient>
      </Defs>

      {/* Outer glow ring */}
      <Circle cx={CX} cy={CY} r={OUTER_R + 3} stroke={ACCENT} strokeWidth={1} fill="none" opacity={0.25} />
      {/* Main bezel */}
      <Circle cx={CX} cy={CY} r={OUTER_R} stroke="#1E293B" strokeWidth={2} fill="url(#bgGrad)" />

      {ticks}
      {labels}

      {/* Degree markers every 30° */}
      {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const labelDeg = deg - heading;
        const rad = degToRad(labelDeg - 90);
        const lx = CX + LABEL_R * Math.cos(rad);
        const ly = CY + LABEL_R * Math.sin(rad);
        return (
          <SvgText
            key={`deg-${deg}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            alignmentBaseline="middle"
            fontSize={8}
            fontWeight="400"
            fill="#475569"
          >
            {deg}
          </SvgText>
        );
      })}

      {/* Inner cutout circle */}
      <Circle cx={CX} cy={CY} r={OUTER_R - 56} stroke="#1E293B" strokeWidth={1.5} fill="#0D1117" />
    </Svg>
  );
}

function CompassNeedle() {
  // Needle is fixed — the ring rotates around it
  const needleLength = OUTER_R - 62;
  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {/* North needle (red) */}
      <Path
        d={`M ${CX} ${CY - needleLength} L ${CX - 9} ${CY + 10} L ${CX} ${CY - 6} Z`}
        fill={NEEDLE_RED}
      />
      {/* South needle (white/silver) */}
      <Path
        d={`M ${CX} ${CY + needleLength} L ${CX + 9} ${CY - 10} L ${CX} ${CY + 6} Z`}
        fill={NEEDLE_WHITE}
        opacity={0.85}
      />
      {/* Center cap */}
      <Circle cx={CX} cy={CY} r={7} fill="#1E293B" stroke={ACCENT} strokeWidth={1.5} />
      <Circle cx={CX} cy={CY} r={3} fill={ACCENT} />
    </Svg>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
  colors,
  accent = ACCENT,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  accent?: string;
}) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CompassScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<CompassState>(
    'compass',
    DEFAULT_STATE
  );

  const [heading, setHeading] = useState(0);
  const [smoothHeading, setSmoothHeading] = useState(0);
  const [location, setLocation] = useState<{
    lat: string;
    lng: string;
    altitude: string;
  } | null>(null);
  const [locationName, setLocationName] = useState<string>('Locating…');
  const [permissionError, setPermissionError] = useState(false);
  const [sensorAvailable, setSensorAvailable] = useState(true);

  const prevHeadingRef = useRef(0);
  const magnetometerSub = useRef<any>(null);

  // Smooth heading animation
  const animHeading = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${animHeading.value}deg` }],
  }));

  // ── Magnetometer ──────────────────────────────────────────────────────────

  const startMagnetometer = useCallback(() => {
    Magnetometer.setUpdateInterval(100);
    magnetometerSub.current = Magnetometer.addListener(({ x, y }) => {
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      // Unwrap to avoid 359→0 spinning
      let prev = prevHeadingRef.current;
      let delta = angle - prev;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      const unwrapped = prev + delta;
      prevHeadingRef.current = unwrapped;

      setSmoothHeading(unwrapped % 360);
      setHeading(Math.round(((unwrapped % 360) + 360) % 360));

      // Animate ring
      animHeading.value = withTiming(-unwrapped, {
        duration: 150,
        easing: Easing.out(Easing.quad),
      });
    });
  }, []);

  useEffect(() => {
    Magnetometer.isAvailableAsync().then((available) => {
      if (available) {
        startMagnetometer();
      } else {
        setSensorAvailable(false);
      }
    });
    return () => {
      magnetometerSub.current?.remove();
    };
  }, []);

  // ── Location ──────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError(true);
        setLocationName('Location unavailable');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, altitude } = loc.coords;

      setLocation({
        lat: `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`,
        lng: `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`,
        altitude: altitude != null ? `${Math.round(altitude)} m` : '—',
      });

      // Reverse geocode
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (place) {
          const city = place.city || place.subregion || place.region || '';
          const country = place.country || '';
          setLocationName([city, country].filter(Boolean).join(', ') || 'Unknown location');
        }
      } catch {
        setLocationName('Unknown location');
      }
    })();
  }, []);

  const normalizedHeading = Math.round(((heading % 360) + 360) % 360);
  const cardinal = getCardinalLabel(normalizedHeading);

  const handleToggleTrueNorth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({ ...p, trueNorth: !p.trueNorth }));
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['bottom']}
    >
      <UtilityHeader
        title="Compass"
        utilityId="compass"
        accentColor={ACCENT}
        onClearData={clearState}
      />

      <View style={styles.content}>

        {/* Heading display */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={styles.headingBlock}
        >
          <View style={styles.headingRow}>
            <Text style={[styles.headingDeg, { color: colors.text }]}>
              {normalizedHeading}°
            </Text>
            <Text style={[styles.headingCardinal, { color: ACCENT }]}>
              {' '}{cardinal}
            </Text>
          </View>
          <Text style={[styles.locationName, { color: colors.textSecondary }]}>
            {locationName}
          </Text>
          {location && (
            <Text style={[styles.coords, { color: colors.textTertiary ?? colors.textSecondary }]}>
              {location.lat}  {location.lng}
            </Text>
          )}
        </Animated.View>

        {/* Compass Rose */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(350)}
          style={styles.compassWrapper}
        >
          {/* Glow backdrop */}
          <View style={[styles.compassGlow, { shadowColor: ACCENT }]} />

          {/* Rotating bezel */}
          <Animated.View style={[styles.ringSvgWrapper, ringStyle]}>
            <CompassRing heading={0} />
          </Animated.View>

          {/* Fixed needle always points up (N) */}
          <CompassNeedle />

          {/* North indicator dot at top */}
          <View style={[styles.northDot, { backgroundColor: ACCENT }]} />
        </Animated.View>

        {/* Info cards */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.infoRow}
        >
          <InfoCard
            icon="🧭"
            label="Bearing"
            value={`${normalizedHeading}°`}
            colors={colors}
          />
          <InfoCard
            icon="⬆️"
            label="Altitude"
            value={location?.altitude ?? '—'}
            colors={colors}
          />
          <InfoCard
            icon="📍"
            label="Direction"
            value={cardinal}
            colors={colors}
          />
        </Animated.View>

        {/* Coordinate strip */}
        {location && (
          <Animated.View
            entering={FadeInDown.delay(250).duration(300)}
            style={[styles.coordStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>LAT</Text>
              <Text style={[styles.coordValue, { color: ACCENT }]}>{location.lat}</Text>
            </View>
            <View style={[styles.coordDivider, { backgroundColor: colors.border }]} />
            <View style={styles.coordItem}>
              <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>LNG</Text>
              <Text style={[styles.coordValue, { color: ACCENT }]}>{location.lng}</Text>
            </View>
          </Animated.View>
        )}

        {/* Sensor unavailable notice */}
        {!sensorAvailable && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              ⚠️  Magnetometer not available on this device or simulator.
            </Text>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },

  // Heading block
  headingBlock: {
    alignItems: 'center',
    gap: 2,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  headingDeg: {
    fontSize: 52,
    fontWeight: typography.weights.extrabold,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  headingCardinal: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
  },
  locationName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginTop: 2,
  },
  coords: {
    fontSize: typography.sizes.xs,
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // Compass
  compassWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassGlow: {
    position: 'absolute',
    width: SIZE - 20,
    height: SIZE - 20,
    borderRadius: (SIZE - 20) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  ringSvgWrapper: {
    position: 'absolute',
  },
  northDot: {
    position: 'absolute',
    top: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Info cards
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  infoCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 3,
  },
  infoIcon: { fontSize: 18 },
  infoValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },

  // Coordinate strip
  coordStrip: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  coordLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    letterSpacing: 1.5,
  },
  coordValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  coordDivider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing.md,
  },

  // Notice
  notice: {
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  noticeText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});