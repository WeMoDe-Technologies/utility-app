import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, Pressable,
  ScrollView, TextInput,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, {
  Defs, LinearGradient, RadialGradient, Stop,
  Rect, Circle, Path,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { UtilityHeader } from '@/components/common/UtilityHeader';
import { useTheme } from '@/theme/ThemeProvider';
import { useUtilityState } from '@/hooks/useUtilityState';
import { spacing, radius, typography } from '@/theme';
import type { ColorPickerState } from '@/types';

const ACCENT = '#D946EF';
const WHEEL_SIZE = 260;
const WHEEL_CX = WHEEL_SIZE / 2;
const WHEEL_CY = WHEEL_SIZE / 2;
const WHEEL_R  = WHEEL_SIZE / 2 - 8;

// Convert HSB → RGB → HEX
function hsbToRgb(h: number, s: number, b: number) {
  s /= 100; b /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const DEFAULT_STATE: ColorPickerState = {
  hue: 210,
  saturation: 80,
  brightness: 90,
  palette: [],
};

type ColorFormat = 'HEX' | 'RGB' | 'HSL';

export default function ColorPickerScreen() {
  const { colors } = useTheme();
  const { state, setState, clearState } = useUtilityState<ColorPickerState>('colorPicker', DEFAULT_STATE);
  const [format, setFormat] = useState<ColorFormat>('HEX');
  const [copied, setCopied] = useState(false);

  const rgb = hsbToRgb(state.hue, state.saturation, state.brightness);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const colorValue =
    format === 'HEX' ? hex :
    format === 'RGB' ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` :
    `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(colorValue);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState((p) => ({
      ...p,
      palette: p.palette.length >= 16
        ? [...p.palette.slice(1), hex]
        : [...p.palette, hex],
    }));
  };

  const removeFromPalette = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((p) => ({ ...p, palette: p.palette.filter((_, i) => i !== idx) }));
  };

  // Touch on wheel → update hue + saturation
  const handleWheelTouch = useCallback((evt: any) => {
    const { locationX: lx, locationY: ly } = evt.nativeEvent;
    const dx = lx - WHEEL_CX, dy = ly - WHEEL_CY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > WHEEL_R) return;
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.round(Math.min((dist / WHEEL_R) * 100, 100));
    Haptics.selectionAsync();
    setState((p) => ({ ...p, hue: Math.round(angle), saturation: sat }));
  }, []);

  // Hue thumb position
  const hueRad = (state.hue * Math.PI) / 180;
  const thumbR = (state.saturation / 100) * WHEEL_R;
  const thumbX = WHEEL_CX + thumbR * Math.cos(hueRad);
  const thumbY = WHEEL_CY + thumbR * Math.sin(hueRad);

  // Generate conic gradient segments for the wheel
  const SEGMENTS = 360;
  const wheelPaths = Array.from({ length: SEGMENTS }).map((_, i) => {
    const a1 = ((i - 90) * Math.PI) / 180;
    const a2 = ((i + 1 - 90) * Math.PI) / 180;
    const r = WHEEL_R;
    const x1 = WHEEL_CX + r * Math.cos(a1), y1 = WHEEL_CY + r * Math.sin(a1);
    const x2 = WHEEL_CX + r * Math.cos(a2), y2 = WHEEL_CY + r * Math.sin(a2);
    const hsbRgb = hsbToRgb(i, 100, state.brightness);
    const segColor = `rgb(${hsbRgb.r},${hsbRgb.g},${hsbRgb.b})`;
    return { d: `M ${WHEEL_CX} ${WHEEL_CY} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`, color: segColor };
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <UtilityHeader title="Color Picker" utilityId="colorPicker" accentColor={ACCENT} onClearData={clearState} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Color Wheel */}
        <Animated.View entering={FadeInDown.delay(40).duration(300)}>
          <View style={styles.wheelWrap}>
            <Svg
              width={WHEEL_SIZE}
              height={WHEEL_SIZE}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handleWheelTouch}
              onResponderMove={handleWheelTouch}
            >
              <Defs>
                <RadialGradient id="white" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#fff" stopOpacity={1} />
                  <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              {/* Hue segments */}
              {wheelPaths.map((p, i) => (
                <Path key={i} d={p.d} fill={p.color} />
              ))}
              {/* White radial overlay for saturation */}
              <Circle cx={WHEEL_CX} cy={WHEEL_CY} r={WHEEL_R} fill="url(#white)" />
              {/* Center blank */}
              <Circle cx={WHEEL_CX} cy={WHEEL_CY} r={22} fill={colors.bg} />
              {/* Thumb */}
              <Circle cx={thumbX} cy={thumbY} r={11} fill={hex} stroke="#fff" strokeWidth={2.5} />
            </Svg>

            {/* Center preview */}
            <View style={[styles.centerPreview, { backgroundColor: hex }]} pointerEvents="none" />
          </View>
        </Animated.View>

        {/* Brightness slider */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <View style={[styles.sliderCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Brightness</Text>
            <View style={styles.sliderTrackWrap}>
              <Svg width="100%" height={28}>
                <Defs>
                  <LinearGradient id="brt" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#000" />
                    <Stop offset="100%" stopColor={rgbToHex(...Object.values(hsbToRgb(state.hue, state.saturation, 100)) as [number, number, number])} />
                  </LinearGradient>
                </Defs>
                <Rect x={0} y={8} width="100%" height={12} rx={6} fill="url(#brt)" />
              </Svg>
              <View
                style={[styles.sliderThumb, {
                  left: `${state.brightness}%` as any,
                  backgroundColor: hex,
                  borderColor: '#fff',
                }]}
              />
              <Pressable
                style={StyleSheet.absoluteFill}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  const x = e.nativeEvent.locationX;
                  const w = e.nativeEvent.target;
                  // approximate width
                }}
              />
            </View>
            <View style={styles.brtButtons}>
              {[0, 25, 50, 75, 100].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => { Haptics.selectionAsync(); setState((p) => ({ ...p, brightness: v })); }}
                  style={[styles.brtBtn, { backgroundColor: colors.card, borderColor: state.brightness === v ? ACCENT : colors.border }]}
                >
                  <Text style={[styles.brtBtnTxt, { color: state.brightness === v ? ACCENT : colors.textSecondary }]}>{v}%</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Color Value Display */}
        <Animated.View entering={FadeInDown.delay(120).duration(280)}>
          <View style={[styles.valueCard, { backgroundColor: hex }]}>
            <View style={styles.valueTop}>
              <View style={styles.valueSwatch} />
              <View>
                <Text style={styles.valueMain}>{hex}</Text>
                <Text style={styles.valueSub}>
                  {`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`}
                </Text>
              </View>
            </View>

            {/* Format tabs */}
            <View style={styles.formatTabs}>
              {(['HEX', 'RGB', 'HSL'] as ColorFormat[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFormat(f)}
                  style={[styles.formatTab, format === f && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
                >
                  <Text style={styles.formatTabTxt}>{f}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.copyRow}>
              <Text style={styles.copyValue} numberOfLines={1}>{colorValue}</Text>
              <Pressable onPress={handleCopy} style={styles.copyBtn}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={hex} />
                <Text style={[styles.copyBtnTxt, { color: hex }]}>{copied ? 'Copied!' : 'Copy'}</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleSave} style={styles.saveColorBtn}>
              <Ionicons name="bookmark-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.saveColorTxt}>Save to Palette</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* HSB Sliders */}
        <Animated.View entering={FadeInDown.delay(160).duration(280)}>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>HSB Values</Text>
            {[
              { label: 'H', value: state.hue, max: 359, key: 'hue' },
              { label: 'S', value: state.saturation, max: 100, key: 'saturation' },
              { label: 'B', value: state.brightness, max: 100, key: 'brightness' },
            ].map(({ label, value, max, key }) => (
              <View key={key} style={styles.hsbRow}>
                <Text style={[styles.hsbLabel, { color: colors.textSecondary }]}>{label}</Text>
                <View style={[styles.hsbBar, { backgroundColor: colors.card }]}>
                  <View style={[styles.hsbFill, { width: `${(value / max) * 100}%`, backgroundColor: ACCENT }]} />
                </View>
                <Text style={[styles.hsbValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Saved Palette */}
        {state.palette.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(280)}>
            <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Palette</Text>
              <View style={styles.paletteGrid}>
                {state.palette.map((c, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      // Load color back
                      Haptics.selectionAsync();
                    }}
                    onLongPress={() => removeFromPalette(i)}
                    style={[styles.paletteSwatch, { backgroundColor: c }]}
                  >
                    <Text style={styles.paletteHex}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.paletteHint, { color: colors.textTertiary }]}>
                Long press to remove
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.base, paddingTop: spacing.md, gap: spacing.md },
  wheelWrap: { alignItems: 'center', justifyContent: 'center' },
  centerPreview: {
    position: 'absolute', width: 36, height: 36,
    borderRadius: 18, borderWidth: 3, borderColor: '#fff',
  },
  sliderCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  sliderLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  sliderTrackWrap: { height: 28, justifyContent: 'center', position: 'relative' },
  sliderThumb: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11,
    borderWidth: 2.5, marginLeft: -11, top: 3,
  },
  brtButtons: { flexDirection: 'row', gap: spacing.sm },
  brtBtn: {
    flex: 1, paddingVertical: 6, borderRadius: radius.lg,
    borderWidth: 1, alignItems: 'center',
  },
  brtBtnTxt: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  valueCard: {
    borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3,
    shadowRadius: 16, elevation: 10,
  },
  valueTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valueSwatch: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  valueMain: { color: '#fff', fontSize: 22, fontWeight: typography.weights.extrabold, letterSpacing: 1 },
  valueSub: { color: 'rgba(255,255,255,0.7)', fontSize: typography.sizes.xs, marginTop: 2 },
  formatTabs: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: radius.lg, padding: 3 },
  formatTab: { flex: 1, paddingVertical: 6, borderRadius: radius.md, alignItems: 'center' },
  formatTabTxt: { color: '#fff', fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  copyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm,
  },
  copyValue: { flex: 1, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: '#1E293B' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyBtnTxt: { fontSize: typography.sizes.xs, fontWeight: typography.weights.bold },
  saveColorBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg, paddingVertical: spacing.sm,
  },
  saveColorTxt: { color: 'rgba(255,255,255,0.9)', fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  sectionCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  sectionTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  hsbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hsbLabel: { width: 16, fontSize: typography.sizes.sm, fontWeight: typography.weights.bold },
  hsbBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  hsbFill: { height: '100%', borderRadius: 3 },
  hsbValue: { width: 36, textAlign: 'right', fontSize: typography.sizes.sm, fontVariant: ['tabular-nums'] },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paletteSwatch: {
    width: 48, height: 48, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'flex-end', padding: 3,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  paletteHex: { fontSize: 7, color: 'rgba(255,255,255,0.85)', fontWeight: typography.weights.bold },
  paletteHint: { fontSize: typography.sizes.xs, textAlign: 'center' },
});