import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, PanResponder } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { Card, FieldLabel, Slider, Segmented, useHaptic, toast } from '@/components/ui';
import { spacing, radius, typography, border } from '@/theme';
import type { ColorPickerState } from '@/types';

const ACCENT = '#6B4A6E';
const WHEEL = 260;
const WCX = WHEEL / 2;
const WCY = WHEEL / 2;
const WR = WHEEL / 2 - 8;
const MAX_PALETTE = 24;

// ─── Colour maths ──────────────────────────────────────────────────────────
function hsbToRgb(h: number, s: number, b: number) {
  s /= 100; b /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Inverse of hsbToRgb — needed to load a saved swatch back into the wheel. */
function rgbToHsb(r: number, g: number, b: number) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  return {
    hue: Math.round((h + 360) % 360),
    saturation: Math.round(max === 0 ? 0 : (d / max) * 100),
    brightness: Math.round(max * 100),
  };
}

/** WCAG relative luminance, used for the contrast readout. */
function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const DEFAULT_STATE: ColorPickerState = {
  hue: 210,
  saturation: 80,
  brightness: 90,
  palette: [],
};

type ColorFormat = 'HEX' | 'RGB' | 'HSL';

// ─── Wheel ─────────────────────────────────────────────────────────────────
/**
 * The 360 hue wedges are expensive to build, so they are memoised and drawn at
 * full brightness. Brightness is applied with a black overlay instead — the old
 * build regenerated every wedge on each drag frame, which made the wheel crawl.
 *
 * Wedge angles and touch angles now share the same convention (0° at 12
 * o'clock, clockwise). They previously differed by 90°, so the colour you
 * tapped was never the colour you got.
 */
const WHEEL_WEDGES = Array.from({ length: 360 }).map((_, i) => {
  const a1 = ((i - 90) * Math.PI) / 180;
  const a2 = ((i + 1.2 - 90) * Math.PI) / 180;
  const x1 = WCX + WR * Math.cos(a1), y1 = WCY + WR * Math.sin(a1);
  const x2 = WCX + WR * Math.cos(a2), y2 = WCY + WR * Math.sin(a2);
  const { r, g, b } = hsbToRgb(i, 100, 100);
  return { d: `M ${WCX} ${WCY} L ${x1} ${y1} A ${WR} ${WR} 0 0 1 ${x2} ${y2} Z`, color: `rgb(${r},${g},${b})` };
});

function ColorWheel({
  hue, saturation, brightness, hex, bgColor, borderColor, onPick,
}: {
  hue: number;
  saturation: number;
  brightness: number;
  hex: string;
  bgColor: string;
  borderColor: string;
  onPick: (hue: number, saturation: number) => void;
}) {
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => handle(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => handle(e.nativeEvent.locationX, e.nativeEvent.locationY),
      }),
    [onPick],
  );

  function handle(lx: number, ly: number) {
    const dx = lx - WCX;
    const dy = ly - WCY;
    const dist = Math.hypot(dx, dy);
    // Measure from 12 o'clock, clockwise — matching how the wedges are drawn
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const h = Math.round((angle + 360) % 360);
    const s = Math.round(Math.min(100, (dist / WR) * 100));
    onPick(h, s);
  }

  // Thumb uses the same 12-o'clock convention as the wedges
  const rad = ((hue - 90) * Math.PI) / 180;
  const thumbR = (saturation / 100) * WR;
  const thumbX = WCX + thumbR * Math.cos(rad);
  const thumbY = WCY + thumbR * Math.sin(rad);

  return (
    <View style={styles.wheelWrap} {...responder.panHandlers}>
      <Svg width={WHEEL} height={WHEEL}>
        <Defs>
          <RadialGradient id="whiteCore" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#fff" stopOpacity={1} />
            <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {WHEEL_WEDGES.map((w, i) => (
          <Path key={i} d={w.d} fill={w.color} />
        ))}

        {/* Saturation falls off towards the centre */}
        <Circle cx={WCX} cy={WCY} r={WR} fill="url(#whiteCore)" />

        {/* Brightness as a black veil — cheap, and keeps the wedges static */}
        <Circle cx={WCX} cy={WCY} r={WR} fill="#000" opacity={1 - brightness / 100} />

        {/* Drawn bezel — the wheel is an instrument face, not a floating disc */}
        <Circle
          cx={WCX} cy={WCY} r={WR}
          fill="none" stroke={borderColor} strokeWidth={3}
        />

        {/* Centre well showing the live colour */}
        <Circle cx={WCX} cy={WCY} r={31} fill={borderColor} />
        <Circle cx={WCX} cy={WCY} r={29} fill={bgColor} />
        <Circle cx={WCX} cy={WCY} r={26} fill={hex} />

        {/* Selection thumb */}
        <Circle cx={thumbX} cy={thumbY} r={12} fill={hex} stroke={borderColor} strokeWidth={3} />
      </Svg>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function ColorPickerScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ColorPickerState>('colorPicker', DEFAULT_STATE);
  const haptic = useHaptic();
  const [format, setFormat] = useState<ColorFormat>('HEX');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rgb = hsbToRgb(state.hue, state.saturation, state.brightness);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const colorValue =
    format === 'HEX' ? hex
    : format === 'RGB' ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const onWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const onBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });
  const bestOn = onWhite >= onBlack ? 'white' : 'black';
  const bestRatio = Math.max(onWhite, onBlack);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(colorValue);
    haptic('success');
    toast(`${colorValue} copied`);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  }, [colorValue, haptic]);

  const handleSave = useCallback(() => {
    haptic('medium');
    setState((p) => {
      if (p.palette.includes(hex)) {
        toast('Already in your palette', 'info');
        return p;
      }
      const next = [...p.palette, hex];
      return { ...p, palette: next.length > MAX_PALETTE ? next.slice(next.length - MAX_PALETTE) : next };
    });
  }, [hex, setState, haptic]);

  /** Load a saved swatch back into the wheel — the swatches used to be inert. */
  const loadSwatch = useCallback(
    (value: string) => {
      haptic('select');
      const { hue, saturation, brightness } = rgbToHsb(...(Object.values(hexToRgb(value)) as [number, number, number]));
      setState((p) => ({ ...p, hue, saturation, brightness }));
      toast(`Loaded ${value}`, 'info');
    },
    [setState, haptic],
  );

  const removeFromPalette = useCallback(
    (index: number) => {
      haptic('warning');
      setState((p) => ({ ...p, palette: p.palette.filter((_, i) => i !== index) }));
    },
    [setState, haptic],
  );

  const handlePick = useCallback(
    (hue: number, saturation: number) => {
      setState((p) => (p.hue === hue && p.saturation === saturation ? p : { ...p, hue, saturation }));
    },
    [setState],
  );

  // Harmonies derived from the current hue
  const harmonies = useMemo(() => {
    const build = (h: number) => {
      const c = hsbToRgb((h + 360) % 360, state.saturation, state.brightness);
      return rgbToHex(c.r, c.g, c.b);
    };
    return [
      { label: 'Complementary', values: [hex, build(state.hue + 180)] },
      { label: 'Analogous', values: [build(state.hue - 30), hex, build(state.hue + 30)] },
      { label: 'Triadic', values: [hex, build(state.hue + 120), build(state.hue + 240)] },
    ];
  }, [state.hue, state.saturation, state.brightness, hex]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader
        title="Color Picker"
        utilityId="colorPicker"
        accentColor={ACCENT}
        subtitle={hex}
        onClearData={clearState}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Wheel */}
        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <ColorWheel
            hue={state.hue}
            saturation={state.saturation}
            brightness={state.brightness}
            hex={hex}
            bgColor={colors.bg}
            borderColor={colors.border}
            onPick={handlePick}
          />
        </Animated.View>

        {/* HSB sliders — all three are now draggable */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <Card>
            <SliderRow
              label="Hue"
              value={state.hue}
              max={359}
              suffix="°"
              accent={hex}
              onChange={(v) => setState((p) => ({ ...p, hue: v }))}
            />
            <SliderRow
              label="Saturation"
              value={state.saturation}
              max={100}
              suffix="%"
              accent={hex}
              onChange={(v) => setState((p) => ({ ...p, saturation: v }))}
            />
            <SliderRow
              label="Brightness"
              value={state.brightness}
              max={100}
              suffix="%"
              accent={hex}
              onChange={(v) => setState((p) => ({ ...p, brightness: v }))}
            />
          </Card>
        </Animated.View>

        {/* Value card */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <View style={[styles.valueCard, { backgroundColor: hex, shadowColor: hex }]}>
            <View style={styles.valueTop}>
              <View style={styles.valueSwatch} />
              <View style={styles.valueTextCol}>
                <Text style={styles.valueMain}>{hex}</Text>
                <Text style={styles.valueSub}>{`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}</Text>
              </View>
            </View>

            <Segmented
              options={[
                { value: 'HEX', label: 'HEX' },
                { value: 'RGB', label: 'RGB' },
                { value: 'HSL', label: 'HSL' },
              ]}
              value={format}
              onChange={setFormat}
              accent="rgba(255,255,255,0.3)"
              style={styles.formatTabs}
            />

            <View style={styles.copyRow}>
              <Text style={styles.copyValue} numberOfLines={1}>{colorValue}</Text>
              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel={`Copy ${colorValue}`}
                style={styles.copyBtn}
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={hex} />
                <Text style={[styles.copyBtnTxt, { color: hex }]}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleSave} accessibilityRole="button" style={styles.saveColorBtn}>
              <Ionicons name="bookmark-outline" size={16} color="rgba(255,255,255,0.95)" />
              <Text style={styles.saveColorTxt}>Save to palette</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Contrast */}
        <Animated.View entering={FadeInDown.delay(150).duration(280)}>
          <Card>
            <FieldLabel>Text contrast</FieldLabel>
            <View style={styles.contrastRow}>
              <ContrastChip bg={hex} fg="#FFFFFF" ratio={onWhite} label="White text" />
              <ContrastChip bg={hex} fg="#000000" ratio={onBlack} label="Black text" />
            </View>
            <Text style={[styles.contrastNote, { color: colors.textTertiary }]}>
              {bestRatio >= 4.5
                ? `Use ${bestOn} text — ${bestRatio.toFixed(1)}:1 passes WCAG AA for body copy.`
                : `Best is ${bestOn} at ${bestRatio.toFixed(1)}:1, below the 4.5:1 AA minimum. Use it for large text only.`}
            </Text>
          </Card>
        </Animated.View>

        {/* Harmonies */}
        <Animated.View entering={FadeInDown.delay(180).duration(280)}>
          <Card>
            <FieldLabel>Harmonies</FieldLabel>
            {harmonies.map((h) => (
              <View key={h.label} style={styles.harmonyRow}>
                <Text style={[styles.harmonyLabel, { color: colors.textSecondary }]}>{h.label}</Text>
                <View style={styles.harmonySwatches}>
                  {h.values.map((v, i) => (
                    <Pressable
                      key={`${h.label}-${i}`}
                      onPress={() => loadSwatch(v)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${v}`}
                      style={[styles.harmonySwatch, { backgroundColor: v, borderColor: colors.border }]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Saved palette */}
        {state.palette.length > 0 && (
          <Animated.View entering={FadeInDown.delay(210).duration(280)}>
            <Card>
              <FieldLabel>Saved palette</FieldLabel>
              <View style={styles.paletteGrid}>
                {state.palette.map((c, i) => (
                  <Pressable
                    key={`${c}-${i}`}
                    onPress={() => loadSwatch(c)}
                    onLongPress={() => removeFromPalette(i)}
                    delayLongPress={400}
                    accessibilityRole="button"
                    accessibilityLabel={`${c}. Tap to load, long press to remove.`}
                    style={[styles.paletteSwatch, { backgroundColor: c, borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.paletteHex,
                        { color: contrastRatio(hexToRgb(c), { r: 255, g: 255, b: 255 }) > 2.5 ? '#fff' : '#111' },
                      ]}
                    >
                      {c.replace('#', '')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.paletteHint, { color: colors.textTertiary }]}>
                Tap a swatch to load it · long press to remove
              </Text>
            </Card>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SliderRow({
  label, value, max, suffix, accent, onChange,
}: {
  label: string; value: number; max: number; suffix: string; accent: string; onChange: (v: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: colors.text }]}>{value}{suffix}</Text>
      </View>
      <Slider value={value} min={0} max={max} step={1} accent={accent} thumbColor={accent} onChange={onChange} />
    </View>
  );
}

function ContrastChip({ bg, fg, ratio, label }: { bg: string; fg: string; ratio: number; label: string }) {
  const passes = ratio >= 4.5;
  return (
    <View style={[styles.contrastChip, { backgroundColor: bg }]}>
      <Text style={[styles.contrastSample, { color: fg }]}>{label}</Text>
      <Text style={[styles.contrastRatio, { color: fg }]}>
        {ratio.toFixed(2)}:1 {passes ? '✓ AA' : '✗ AA'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },

  wheelWrap: { alignItems: 'center', justifyContent: 'center' },

  sliderRow: { gap: 2 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderLabel: { fontSize: typography.sizes.sm, fontWeight: '600' },
  sliderValue: { fontSize: typography.sizes.sm, fontWeight: '800', fontVariant: ['tabular-nums'] },

  valueCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  valueTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valueSwatch: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
  valueTextCol: { flex: 1 },
  valueMain: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  valueSub: { color: 'rgba(255,255,255,0.75)', fontSize: typography.sizes.xs, marginTop: 2 },
  formatTabs: { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'transparent' },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  copyValue: { flex: 1, fontSize: typography.sizes.sm, fontWeight: '600', color: '#2B2A28' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnTxt: { fontSize: typography.sizes.xs, fontWeight: '800' },
  saveColorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
  },
  saveColorTxt: { color: 'rgba(255,255,255,0.95)', fontSize: typography.sizes.sm, fontWeight: '800' },

  contrastRow: { flexDirection: 'row', gap: spacing.sm },
  contrastChip: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  contrastSample: { fontSize: typography.sizes.sm, fontWeight: '700' },
  contrastRatio: { fontSize: typography.sizes.xs, fontWeight: '600', opacity: 0.9 },
  contrastNote: { fontSize: typography.sizes.xs, lineHeight: 16 },

  harmonyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  harmonyLabel: { fontSize: typography.sizes.sm, fontWeight: '600' },
  harmonySwatches: { flexDirection: 'row', gap: spacing.xs },
  harmonySwatch: { width: 34, height: 34, borderRadius: radius.md, borderWidth: border.base },

  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paletteSwatch: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: border.base,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 3,
  },
  paletteHex: { fontSize: 8, fontWeight: '800' },
  paletteHint: { fontSize: typography.sizes.xs, textAlign: 'center' },
});
