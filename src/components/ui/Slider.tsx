import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, PanResponder, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, border, spacing } from '@/theme';
import { useHaptic } from './Controls';

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  accent?: string;
  /** Optional custom track (e.g. a colour ramp) rendered inside the slot. */
  trackContent?: React.ReactNode;
  /** Hide the accent fill when trackContent already conveys the value. */
  hideFill?: boolean;
  thumbColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A fader: a routed slot with a hard-edged cap riding in it. Dependency-free —
 * PanResponder against the measured track width, so the cap tracks the finger
 * exactly, including taps anywhere along the slot.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  accent,
  trackContent,
  hideFill,
  thumbColor,
  style,
}: SliderProps) {
  const { colors } = useTheme();
  const haptic = useHaptic();
  const tint = accent ?? colors.accent;
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const lastEmitted = useRef(value);
  const containerPageX = useRef<number | null>(null);
  const containerRef = useRef<View>(null);

  const clampToStep = useCallback(
    (raw: number) => {
      const clamped = Math.min(max, Math.max(min, raw));
      const snapped = step > 0 ? Math.round((clamped - min) / step) * step + min : clamped;
      return parseFloat(Math.min(max, Math.max(min, snapped)).toFixed(6));
    },
    [min, max, step],
  );

  const emitFromX = useCallback(
    (x: number) => {
      const w = widthRef.current;
      if (w <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / w));
      const next = clampToStep(min + ratio * (max - min));
      if (next !== lastEmitted.current) {
        lastEmitted.current = next;
        haptic('select');
        onChange(next);
      }
    },
    [clampToStep, min, max, onChange, haptic],
  );

  /** Re-measure where the track sits on screen. */
  const measure = useCallback(() => {
    containerRef.current?.measureInWindow((x, _y, w) => {
      containerPageX.current = x;
      if (w > 0) widthRef.current = w;
    });
  }, []);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          // locationX is correct at grant time and needs no measurement.
          emitFromX(e.nativeEvent.locationX);
          // Refresh the page offset for the move phase: this control lives
          // inside a ScrollView, so a position measured once at layout goes
          // stale as soon as the user scrolls.
          measure();
        },
        onPanResponderMove: (e) => {
          // pageX is absolute and reliable on both platforms mid-drag, so the
          // move phase is derived from the same origin as the grant rather
          // than from an accumulated delta.
          const left = containerPageX.current;
          if (left === null) return;
          emitFromX(e.nativeEvent.pageX - left);
        },
      }),
    [emitFromX, measure],
  );

  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[styles.wrap, style]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        widthRef.current = w;
        setWidth(w);
        measure();
      }}
      {...responder.panHandlers}
    >
      {/* Routed slot */}
      <View
        style={[
          styles.track,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        {trackContent}
        {!hideFill && (
          <View style={[styles.fill, { width: `${clampedPct}%`, backgroundColor: tint }]} />
        )}
      </View>

      {/* Cap */}
      <View
        pointerEvents="none"
        style={[
          styles.cap,
          {
            left: (width * clampedPct) / 100,
            backgroundColor: thumbColor ?? colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.capGrip, { backgroundColor: tint }]} />
      </View>
    </View>
  );
}

const CAP_W = 18;
const CAP_H = 30;

const styles = StyleSheet.create({
  wrap: { height: 40, justifyContent: 'center' },
  track: {
    height: 12,
    borderRadius: radius.sm,
    borderWidth: border.base,
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
  },
  cap: {
    position: 'absolute',
    width: CAP_W,
    height: CAP_H,
    marginLeft: -CAP_W / 2,
    borderRadius: radius.sm,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capGrip: { width: 2, height: CAP_H * 0.45 },
});
