import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { AntDesign } from '@expo/vector-icons';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Ellipse,
  Polyline,
} from 'react-native-svg';
import type { UtilityDefinition } from '@/types';

interface UtilityIconProps {
  // `id` is used to look up a bespoke SVG icon; `icon`/`iconFamily` are the
  // vector-icon fallback used when no SVG exists for that id.
  utility: Pick<UtilityDefinition, 'id' | 'icon' | 'iconFamily'>;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Renders a utility icon.
 *  1. If a bespoke SVG icon is registered for `utility.id`, render that.
 *  2. Otherwise fall back to the original vector icon (`icon` + `iconFamily`).
 *
 * Drop-in compatible with the previous vector-only component — it just
 * additionally reads `utility.id`, which the card already passes.
 */
export function UtilityIcon({
  utility,
  size = 24,
  color = '#fff',
  strokeWidth = 1.7,
}: UtilityIconProps) {
  const { id, icon, iconFamily } = utility;

  // ── 1. Bespoke SVG icon, if one exists for this id ──────────────────
  const renderSvg = id ? SVG_ICONS[id] : undefined;
  if (renderSvg) {
    const s = {
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      fill: 'none' as const,
    };
    const solid = { fill: color };
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {renderSvg(s, solid, color)}
      </Svg>
    );
  }

  // ── 2. Vector-icon fallback (unchanged from the original) ───────────
  switch (iconFamily) {
    case 'MaterialCommunityIcons':
      return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
    case 'MaterialIcons':
      return <MaterialIcons name={icon as any} size={size} color={color} />;
    case 'Feather':
      return <Feather name={icon as any} size={size} color={color} />;
    case 'FontAwesome5':
      return <FontAwesome5 name={icon as any} size={size} color={color} />;
    case 'AntDesign':
      return <AntDesign name={icon as any} size={size} color={color} />;
    case 'Ionicons':
      return <Ionicons name={icon as any} size={size} color={color} />;
    default:
      return <MaterialIcons name={icon as any} size={size} color={color} />;
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Bespoke SVG icon set
 * One cohesive visual language: 24×24 grid, rounded 1.7px strokes, designed
 * to render in white on the card's gradient tile. Keyed by `utility.id`.
 * Add or remove entries freely — any id NOT present here automatically uses
 * the vector icon instead.
 * ──────────────────────────────────────────────────────────────────────── */

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};
type SolidProps = { fill: string };
type IconFn = (s: StrokeProps, solid: SolidProps, color: string) => React.ReactNode;

const SVG_ICONS: Record<string, IconFn> = {
  // ── Basic calculator ──────────────────────────────────────────────
  calculator: (s, solid) => (
    <>
      <Rect x={5} y={2.5} width={14} height={19} rx={2.6} {...s} />
      <Rect x={8} y={5.2} width={8} height={3.4} rx={1} {...s} />
      <Circle cx={9} cy={13} r={0.95} {...solid} />
      <Circle cx={12} cy={13} r={0.95} {...solid} />
      <Circle cx={15} cy={13} r={0.95} {...solid} />
      <Circle cx={9} cy={17} r={0.95} {...solid} />
      <Circle cx={12} cy={17} r={0.95} {...solid} />
      <Circle cx={15} cy={17} r={0.95} {...solid} />
    </>
  ),

  // ── Scientific calculator (sine wave = functions) ─────────────────
  scientificCalculator: (s, solid) => (
    <>
      <Rect x={5} y={2.5} width={14} height={19} rx={2.6} {...s} />
      <Rect x={8} y={5.2} width={8} height={3.4} rx={1} {...s} />
      <Path d="M7.6 14 q1.4 -2.3 2.8 0 t2.8 0 t2.8 0" {...s} />
      <Circle cx={9} cy={18} r={0.95} {...solid} />
      <Circle cx={12} cy={18} r={0.95} {...solid} />
      <Circle cx={15} cy={18} r={0.95} {...solid} />
    </>
  ),

  // ── Unit converter (ruler) ────────────────────────────────────────
  unitConverter: (s) => (
    <>
      <Rect x={2.5} y={8.5} width={19} height={7} rx={1.6} {...s} />
      <Line x1={6} y1={8.5} x2={6} y2={12} {...s} />
      <Line x1={9.5} y1={8.5} x2={9.5} y2={11} {...s} />
      <Line x1={13} y1={8.5} x2={13} y2={12} {...s} />
      <Line x1={16.5} y1={8.5} x2={16.5} y2={11} {...s} />
    </>
  ),

  // ── Currency converter (exchange arrows + $) ──────────────────────
  currencyConverter: (s) => (
    <>
      <Path d="M5.5 9.6 A7 7 0 0 1 17.4 7.9" {...s} />
      <Polyline points="15.4,6.5 17.6,7.8 16.7,10.2" {...s} />
      <Path d="M18.5 14.4 A7 7 0 0 1 6.6 16.1" {...s} />
      <Polyline points="8.6,17.5 6.4,16.2 7.3,13.8" {...s} />
      <Line x1={12} y1={8.4} x2={12} y2={15.6} {...s} />
      <Path d="M14 10.1 C14 8.7 10 8.7 10 10.7 C10 12.5 14 11.9 14 13.7 C14 15.5 10 15.5 10 14.1" {...s} />
    </>
  ),

  // ── EMI (coin stack) ──────────────────────────────────────────────
  emi: (s) => (
    <>
      <Ellipse cx={12} cy={7.5} rx={6.5} ry={2.4} {...s} />
      <Path d="M5.5 7.5 V12 a6.5 2.4 0 0 0 13 0 V7.5" {...s} />
      <Path d="M5.5 12 V16 a6.5 2.4 0 0 0 13 0 V12" {...s} />
    </>
  ),

  // ── GST (receipt + %) ─────────────────────────────────────────────
  gst: (s) => (
    <>
      <Polyline
        points="6,3 18,3 18,19.5 16,18.2 14,19.5 12,18.2 10,19.5 8,18.2 6,19.5 6,3"
        {...s}
      />
      <Circle cx={9.7} cy={8} r={1.15} {...s} />
      <Circle cx={14.3} cy={13} r={1.15} {...s} />
      <Line x1={15} y1={7} x2={9} y2={14} {...s} />
    </>
  ),

  // ── QR scanner (corner frame + modules) ───────────────────────────
  qrScanner: (s, solid) => (
    <>
      <Path d="M4 8.5 V5.5 A1.5 1.5 0 0 1 5.5 4 H8.5" {...s} />
      <Path d="M15.5 4 H18.5 A1.5 1.5 0 0 1 20 5.5 V8.5" {...s} />
      <Path d="M20 15.5 V18.5 A1.5 1.5 0 0 1 18.5 20 H15.5" {...s} />
      <Path d="M8.5 20 H5.5 A1.5 1.5 0 0 1 4 18.5 V15.5" {...s} />
      <Rect x={8.4} y={8.4} width={3} height={3} rx={0.6} {...solid} />
      <Rect x={12.8} y={8.6} width={2.7} height={2.7} rx={0.6} {...s} />
      <Rect x={8.6} y={12.8} width={2.7} height={2.7} rx={0.6} {...s} />
      <Rect x={13} y={13} width={2.6} height={2.6} rx={0.6} {...solid} />
    </>
  ),

  // ── Notes (document + folded corner + lines) ──────────────────────
  notes: (s) => (
    <>
      <Path d="M6 3.5 H14.8 L18.5 7.2 V20.5 A0.5 0.5 0 0 1 18 21 H6 A0.5 0.5 0 0 1 5.5 20.5 V4 A0.5 0.5 0 0 1 6 3.5 Z" {...s} />
      <Path d="M14.6 3.7 V7 H18.3" {...s} />
      <Line x1={8.5} y1={11.5} x2={15.5} y2={11.5} {...s} />
      <Line x1={8.5} y1={14.5} x2={15.5} y2={14.5} {...s} />
      <Line x1={8.5} y1={17.5} x2={13} y2={17.5} {...s} />
    </>
  ),

  // ── Pomodoro (tomato) ─────────────────────────────────────────────
  pomodoro: (s) => (
    <>
      <Path d="M12 7.5 C7 7.5 4.5 11 4.5 14.6 C4.5 18.6 8 21 12 21 C16 21 19.5 18.6 19.5 14.6 C19.5 11 17 7.5 12 7.5 Z" {...s} />
      <Path d="M12 7.4 C12 5.4 10.4 4.4 8.4 4.7" {...s} />
      <Path d="M12 7.4 C12 5.4 13.6 4.4 15.6 4.7" {...s} />
      <Line x1={12} y1={5.1} x2={12} y2={7.4} {...s} />
    </>
  ),

  // ── Stopwatch ─────────────────────────────────────────────────────
  stopwatch: (s) => (
    <>
      <Circle cx={12} cy={14} r={7.5} {...s} />
      <Line x1={12} y1={14} x2={12} y2={9.6} {...s} />
      <Rect x={10.5} y={2} width={3} height={2.3} rx={0.6} {...s} />
      <Line x1={12} y1={4.3} x2={12} y2={6.5} {...s} />
      <Line x1={17.6} y1={6} x2={19} y2={4.6} {...s} />
    </>
  ),

  // ── World clock (globe) ───────────────────────────────────────────
  worldClock: (s) => (
    <>
      <Circle cx={12} cy={12} r={8.5} {...s} />
      <Ellipse cx={12} cy={12} rx={3.6} ry={8.5} {...s} />
      <Line x1={3.5} y1={12} x2={20.5} y2={12} {...s} />
      <Path d="M5 7.2 H19" {...s} />
      <Path d="M5 16.8 H19" {...s} />
    </>
  ),

  // ── Password generator (key) ──────────────────────────────────────
  passwordGenerator: (s) => (
    <>
      <Circle cx={8} cy={16} r={3.3} {...s} />
      <Line x1={10.4} y1={13.6} x2={19} y2={5} {...s} />
      <Line x1={15.4} y1={8.6} x2={17.6} y2={10.8} {...s} />
      <Line x1={17} y1={7} x2={19} y2={9} {...s} />
    </>
  ),

  // ── Text utility ("Aa") ───────────────────────────────────────────
  textUtility: (s) => (
    <>
      <Polyline points="3.5,18 8,6 12.5,18" {...s} />
      <Line x1={5.2} y1={14} x2={10.8} y2={14} {...s} />
      <Circle cx={16.6} cy={15} r={2.8} {...s} />
      <Line x1={19.4} y1={12.2} x2={19.4} y2={17.8} {...s} />
    </>
  ),

  // ── Age calculator (hourglass) ────────────────────────────────────
  ageCalculator: (s, solid) => (
    <>
      <Line x1={7} y1={3} x2={17} y2={3} {...s} />
      <Line x1={7} y1={21} x2={17} y2={21} {...s} />
      <Path d="M8 3.5 C8 8 12 10.8 12 12 C12 13.2 8 16 8 20.5" {...s} />
      <Path d="M16 3.5 C16 8 12 10.8 12 12 C12 13.2 16 16 16 20.5" {...s} />
      <Path d="M10 5.4 H14 L12 8 Z" {...solid} />
      <Path d="M10.7 18.8 H13.3 L12 16.4 Z" {...solid} />
    </>
  ),

  // ── Discount calculator (price tag + %) ───────────────────────────
  discountCalculator: (s) => (
    <>
      <Path d="M12.6 2.6 A2 2 0 0 0 11.2 2 H4 A2 2 0 0 0 2 4 V11.2 A2 2 0 0 0 2.6 12.6 L11.3 21.3 A2.43 2.43 0 0 0 14.7 21.3 L21.3 14.7 A2.43 2.43 0 0 0 21.3 11.3 Z" {...s} />
      <Circle cx={7.4} cy={7.4} r={1.2} {...s} />
      <Circle cx={10.6} cy={11} r={1.05} {...s} />
      <Circle cx={14} cy={14.4} r={1.05} {...s} />
      <Line x1={15} y1={10.4} x2={9.6} y2={15} {...s} />
    </>
  ),

  // ── Counter (tally of five) ───────────────────────────────────────
  counter: (s) => (
    <>
      <Line x1={6} y1={7} x2={6} y2={17} {...s} />
      <Line x1={9.3} y1={7} x2={9.3} y2={17} {...s} />
      <Line x1={12.6} y1={7} x2={12.6} y2={17} {...s} />
      <Line x1={15.9} y1={7} x2={15.9} y2={17} {...s} />
      <Line x1={4.5} y1={16.6} x2={17.4} y2={7.4} {...s} />
    </>
  ),
};