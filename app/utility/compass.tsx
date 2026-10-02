import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Platform } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, Segmented, Notice, StatTile, useHaptic, toast } from '@/components/ui';
import { spacing, radius, typography } from '@/theme';
import type { CompassState } from '@/types';

const ACCENT = '#2E6A66';
const NEEDLE_NORTH = '#A6392B';

const SIZE = 268;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE / 2 - 4;
const TICK_MAJOR_INNER = OUTER_R - 17;
const TICK_MINOR_INNER = OUTER_R - 9;
const LABEL_R = OUTER_R - 33;
const DEGREE_R = OUTER_R - 33;

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

const degToRad = (deg: number) => (deg * Math.PI) / 180;

function cardinalFor(deg: number): string {
  return COMPASS_POINTS[Math.round(deg / 22.5) % 16];
}

interface CompassStateV2 extends CompassState {}

const DEFAULT_STATE: CompassStateV2 = { trueNorth: true };

// ─── Rose ──────────────────────────────────────────────────────────────────
/**
 * Drawn once at heading 0 and rotated by its parent, so nothing here re-renders
 * as the device turns. Every colour comes from the theme — the previous version
 * hardcoded a dark palette, which turned into an unreadable dark disc on the
 * light themes.
 */
const CompassRose = React.memo(function CompassRose({
  faceColor, bezelColor, tickColor, majorTickColor, labelColor, degreeColor, borderColor,
}: {
  faceColor: string;
  bezelColor: string;
  tickColor: string;
  majorTickColor: string;
  labelColor: string;
  degreeColor: string;
  borderColor: string;
}) {
  const ticks = useMemo(
    () =>
      Array.from({ length: 72 }).map((_, i) => {
        const rad = degToRad(i * 5 - 90);
        const major = i % 9 === 0;
        const innerR = major ? TICK_MAJOR_INNER : TICK_MINOR_INNER;
        return {
          key: i,
          major,
          x1: CX + OUTER_R * Math.cos(rad),
          y1: CY + OUTER_R * Math.sin(rad),
          x2: CX + innerR * Math.cos(rad),
          y2: CY + innerR * Math.sin(rad),
        };
      }),
    [],
  );

  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={CX} cy={CY} r={OUTER_R + 2} stroke={ACCENT} strokeWidth={1} fill="none" opacity={0.3} />
      <Circle cx={CX} cy={CY} r={OUTER_R} stroke={borderColor} strokeWidth={2} fill={bezelColor} />

      {ticks.map((t) => (
        <Line
          key={t.key}
          x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? majorTickColor : tickColor}
          strokeWidth={t.major ? 2 : 1}
          strokeLinecap="round"
        />
      ))}

      {CARDINALS.map((dir, i) => {
        const rad = degToRad(i * 45 - 90);
        const isCardinal = i % 2 === 0;
        const isNorth = dir === 'N';
        return (
          <SvgText
            key={dir}
            x={CX + LABEL_R * Math.cos(rad)}
            y={CY + LABEL_R * Math.sin(rad) + 4}
            textAnchor="middle"
            fontSize={isCardinal ? (isNorth ? 16 : 13) : 9}
            fontWeight={isCardinal ? '700' : '500'}
            fill={isNorth ? ACCENT : isCardinal ? labelColor : degreeColor}
          >
            {dir}
          </SvgText>
        );
      })}

      {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => {
        const rad = degToRad(deg - 90);
        return (
          <SvgText
            key={`deg-${deg}`}
            x={CX + DEGREE_R * Math.cos(rad)}
            y={CY + DEGREE_R * Math.sin(rad) + 3}
            textAnchor="middle"
            fontSize={8}
            fill={degreeColor}
          >
            {deg}
          </SvgText>
        );
      })}

      <Circle cx={CX} cy={CY} r={OUTER_R - 56} stroke={borderColor} strokeWidth={1.5} fill={faceColor} />
    </Svg>
  );
});

function CompassNeedle({ southColor, capColor }: { southColor: string; capColor: string }) {
  const len = OUTER_R - 64;
  return (
    <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Path d={`M ${CX} ${CY - len} L ${CX - 9} ${CY + 10} L ${CX} ${CY - 6} Z`} fill={NEEDLE_NORTH} />
      <Path d={`M ${CX} ${CY + len} L ${CX + 9} ${CY - 10} L ${CX} ${CY + 6} Z`} fill={southColor} opacity={0.8} />
      <Circle cx={CX} cy={CY} r={7} fill={capColor} stroke={ACCENT} strokeWidth={1.5} />
      <Circle cx={CX} cy={CY} r={3} fill={ACCENT} />
    </Svg>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function CompassScreen() {
  const { colors, isDark } = useTheme();
  const { state, setState, clearState } = useUtilityState<CompassStateV2>('compass', DEFAULT_STATE);
  const haptic = useHaptic();

  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [source, setSource] = useState<'heading' | 'magnetometer' | 'none'>('none');
  const [location, setLocation] = useState<{
    lat: string; lng: string; altitude: string; latRaw: number; lngRaw: number;
  } | null>(null);
  const [locationName, setLocationName] = useState('Locating…');
  const [locationDenied, setLocationDenied] = useState(false);

  const unwrapRef = useRef(0);
  const headingSub = useRef<Location.LocationSubscription | null>(null);
  const magSub = useRef<{ remove: () => void } | null>(null);

  const animHeading = useSharedValue(0);
  const roseStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${animHeading.value}deg` }] }));

  /** Feed a new absolute heading in, unwrapping it so 359→0 doesn't spin. */
  const pushHeading = useCallback(
    (deg: number) => {
      const normalised = ((deg % 360) + 360) % 360;
      let delta = normalised - (((unwrapRef.current % 360) + 360) % 360);
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      unwrapRef.current += delta;

      setHeading(Math.round(normalised));
      animHeading.value = withTiming(-unwrapRef.current, {
        duration: 140,
        easing: Easing.out(Easing.quad),
      });
    },
    [animHeading],
  );

  /**
   * expo-location's heading stream is the right source: it is tilt-compensated
   * and reports both magnetic and TRUE north, so the "true north" toggle can
   * actually do something. The raw magnetometer is only a fallback — it gives
   * magnetic north with no declination correction and no tilt compensation.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status === 'granted') {
        try {
          headingSub.current = await Location.watchHeadingAsync((h) => {
            if (cancelled) return;
            setSource('heading');
            setAccuracy(h.accuracy ?? null);
            // trueHeading is -1 when the device can't resolve declination
            const useTrue = state.trueNorth && h.trueHeading >= 0;
            pushHeading(useTrue ? h.trueHeading : h.magHeading);
          });
          return;
        } catch {
          // fall through to the magnetometer
        }
      } else {
        setLocationDenied(true);
      }

      const available = await Magnetometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      if (!available) {
        setSource('none');
        return;
      }
      setSource('magnetometer');
      Magnetometer.setUpdateInterval(100);
      magSub.current = Magnetometer.addListener(({ x, y }) => {
        if (cancelled) return;
        // atan2(y, x) measures from the +x axis; compass bearings run clockwise
        // from north, hence the 90° rotation.
        pushHeading(90 - (Math.atan2(y, x) * 180) / Math.PI);
      });
    })();

    return () => {
      cancelled = true;
      headingSub.current?.remove();
      headingSub.current = null;
      magSub.current?.remove();
      magSub.current = null;
    };
  }, [state.trueNorth, pushHeading]);

  // Position + place name
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // `request` rather than `get`: this effect races the heading effect's
      // own permission prompt, and `get` would read "undetermined" while the
      // dialog is still on screen — leaving the "location is off" notice up
      // even after the user granted access. Requesting twice is safe; iOS
      // shows one dialog and resolves both calls with the same answer.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setLocationDenied(true);
        setLocationName('Location unavailable');
        return;
      }
      setLocationDenied(false);
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const { latitude, longitude, altitude } = loc.coords;
        setLocation({
          lat: `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? 'N' : 'S'}`,
          lng: `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? 'E' : 'W'}`,
          altitude: altitude != null ? `${Math.round(altitude)} m` : '—',
          latRaw: latitude,
          lngRaw: longitude,
        });

        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (cancelled || !place) return;
        const city = place.city || place.subregion || place.region || '';
        const country = place.country || '';
        setLocationName([city, country].filter(Boolean).join(', ') || 'Unknown location');
      } catch {
        if (!cancelled) setLocationName('Could not get a fix');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copyCoords = useCallback(async () => {
    if (!location) return;
    await Clipboard.setStringAsync(`${location.latRaw.toFixed(6)}, ${location.lngRaw.toFixed(6)}`);
    haptic('success');
    toast('Coordinates copied');
  }, [location, haptic]);

  const cardinal = cardinalFor(heading);
  const needsCalibration = accuracy !== null && accuracy > 2;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Compass"
        utilityId="compass"
        accentColor={ACCENT}
        subtitle={
          source === 'none' ? 'No compass sensor'
          : source === 'magnetometer' ? 'Magnetic north (raw sensor)'
          : state.trueNorth ? 'True north' : 'Magnetic north'
        }
        onClearData={clearState}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Heading */}
        <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.headingBlock}>
          <View style={styles.headingRow}>
            <Text style={[styles.headingDeg, { color: colors.text }]}>{heading}°</Text>
            <Text style={[styles.headingCardinal, { color: ACCENT }]}> {cardinal}</Text>
          </View>
          <Text style={[styles.locationName, { color: colors.textSecondary }]}>{locationName}</Text>
        </Animated.View>

        {/* Rose */}
        <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.compassWrapper}>
          <Animated.View style={[styles.roseWrapper, roseStyle]}>
            <CompassRose
              faceColor={colors.bg}
              bezelColor={colors.surface}
              tickColor={colors.textTertiary}
              majorTickColor={colors.textSecondary}
              labelColor={colors.text}
              degreeColor={colors.textTertiary}
              borderColor={colors.border}
            />
          </Animated.View>

          <CompassNeedle
            southColor={isDark ? '#F1F5F9' : '#8A8377'}
            capColor={colors.surface}
          />

          <View style={[styles.northDot, { backgroundColor: ACCENT }]} />
        </Animated.View>

        {/* North reference — the toggle now actually changes the reading */}
        {source === 'heading' && (
          <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.fullWidth}>
            <Segmented
              options={[
                { value: 'true', label: 'True north' },
                { value: 'magnetic', label: 'Magnetic north' },
              ]}
              value={state.trueNorth ? 'true' : 'magnetic'}
              onChange={(v) => {
                haptic('select');
                setState((p) => ({ ...p, trueNorth: v === 'true' }));
              }}
              accent={ACCENT}
            />
          </Animated.View>
        )}

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.infoRow}>
          <StatTile label="Bearing" value={`${heading}°`} color={ACCENT} />
          <StatTile label="Direction" value={cardinal} color="#6B4A6E" />
          <StatTile label="Altitude" value={location?.altitude ?? '—'} color="#C2902B" />
        </Animated.View>

        {/* Coordinates */}
        {location && (
          <Animated.View entering={FadeInDown.delay(200).duration(280)} style={styles.fullWidth}>
            <Pressable onPress={copyCoords} accessibilityRole="button" accessibilityLabel="Copy coordinates">
              <Card>
                <View style={styles.coordRow}>
                  <View style={styles.coordItem}>
                    <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>LAT</Text>
                    <Text style={[styles.coordValue, { color: ACCENT }]}>{location.lat}</Text>
                  </View>
                  <View style={[styles.coordDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.coordItem}>
                    <Text style={[styles.coordLabel, { color: colors.textSecondary }]}>LNG</Text>
                    <Text style={[styles.coordValue, { color: ACCENT }]}>{location.lng}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={16} color={colors.textTertiary} />
                </View>
              </Card>
            </Pressable>
          </Animated.View>
        )}

        {/* Diagnostics */}
        <View style={styles.notices}>
          {source === 'none' && (
            <Notice
              tone="warn"
              text="This device has no usable compass sensor (simulators usually don't). The dial won't move."
            />
          )}
          {source === 'magnetometer' && (
            <Notice
              tone="info"
              text="Using the raw magnetometer. Readings are magnetic north only and are affected by tilt — grant location access for a tilt-compensated true-north heading."
            />
          )}
          {needsCalibration && (
            <Notice
              tone="warn"
              text="Compass accuracy is low. Move away from metal and electronics, then wave the device in a figure-8."
            />
          )}
          {locationDenied && (
            <Notice
              tone="info"
              text="Location access is off, so coordinates, altitude and true north are unavailable."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: 48,
    gap: spacing.lg,
  },
  fullWidth: { alignSelf: 'stretch' },

  headingBlock: { alignItems: 'center', gap: 2 },
  headingRow: { flexDirection: 'row', alignItems: 'baseline' },
  headingDeg: { fontSize: 50, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  headingCardinal: { fontSize: 27, fontWeight: '700', letterSpacing: 1 },
  locationName: { fontSize: typography.sizes.sm, fontWeight: '500' },

  compassWrapper: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  roseWrapper: { position: 'absolute' },
  northDot: { position: 'absolute', top: 6, width: 6, height: 6, borderRadius: 3 },

  infoRow: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },

  coordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coordItem: { flex: 1, alignItems: 'center', gap: 2 },
  coordLabel: { fontSize: typography.sizes.xs, fontWeight: '800', letterSpacing: 1.5 },
  coordValue: { fontSize: typography.sizes.sm, fontWeight: '800', fontVariant: ['tabular-nums'] },
  coordDivider: { width: 1, height: 32 },

  notices: { alignSelf: 'stretch', gap: spacing.sm },
});
