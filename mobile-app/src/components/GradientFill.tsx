import React, { useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as LinearGradient2, RadialGradient, Stop, Rect } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../ThemeContext';

// Redesign: a soft gradient that fills its parent, used instead of flat colour fills.
// Put it as the FIRST child of a View or button. It fills the parent and clips itself
// to the parent's rounded corners. Drawn with expo-linear-gradient (one native view);
// Wallet cards use react-native-svg for their extra glow.
//
// Two ways to use it:
// - Explicit: <GradientFill color=... kind=... radius=... /> (Left to Spend, Wallet cards).
// - Matching: <GradientFill match={sameStyleAsTheParent} />. It reads the parent's
//   background colour and corners from that style and picks the right look by itself
//   (and draws nothing for colours it doesn't handle, or for tiny shapes like dots):
//     white/grey boxes (navy3)       -> "surface": white fading to a faint tint
//     light green fills (accentTint) -> "tint": lighter top-left, a touch deeper bottom-right
//     filled buttons (buttonFill/gold)-> "solid": lighter top-left, deeper bottom-right
//
// kind="card" (Wallet cards): a light wash of `color` over `surface`, deepening from
//   left to right, with a soft white glow from the top-left corner.

type Kind = 'solid' | 'card' | 'surface' | 'tint';

type Props = {
  color?: string;
  kind?: Kind;
  strength?: number;
  radius?: number;
  surface?: string;
  isDark?: boolean;
  match?: StyleProp<ViewStyle>;
};

function parse(h: string): number[] | null {
  if (typeof h !== 'string' || !h.startsWith('#')) return null;
  const v = h.replace('#', '');
  const full = v.length === 3 ? v.split('').map((x) => x + x).join('') : v.slice(0, 6);
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return rgb.some(isNaN) ? null : rgb;
}

// `amount` of `a` mixed into `b`.
export function mixHex(a: string, b: string, amount: number): string {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a;
  return '#' + pa.map((v, i) => Math.round(v * amount + pb[i] * (1 - amount)).toString(16).padStart(2, '0')).join('');
}

// 13 offsets with an S-curve ease, so colour changes start and stop gently (no lines).
const STOPS = Array.from({ length: 13 }, (_, i) => {
  const o = i / 12;
  return { o, s: o * o * (3 - 2 * o) };
});

// Three colours blended smoothly: a at the start, b in the middle, c at the end.
function three(a: string, b: string, c: string) {
  return STOPS.map(({ o, s }) => ({ o, c: s < 0.5 ? mixHex(b, a, s * 2) : mixHex(c, b, (s - 0.5) * 2) }));
}

let counter = 0;

const END_DIAGONAL = { x: 1, y: 1 }; // top-left to bottom-right
const END_DOWN = { x: 0.25, y: 1 }; // mostly top to bottom

// Smoothness: the colour stops for each look are worked out once and reused, instead of
// being recalculated by every one of the few hundred gradients on every redraw.
type Grad = { gradColors: readonly [string, string, ...string[]]; locations: readonly [number, number, ...number[]] };
const gradCache = new Map<string, Grad>();
function gradientFor(k: Kind, bg: string, strength: number, accentTint: string, navy3: string, gold: string): Grad {
  const key = `${k}|${bg}|${strength}|${accentTint}|${navy3}|${gold}`;
  const hit = gradCache.get(key);
  if (hit) return hit;
  let stops: { o: number; c: string }[];
  if (k === 'surface') {
    const tintEnd = mixHex(accentTint, bg, 0.45);
    stops = STOPS.map(({ o, s }) => ({ o, c: mixHex(tintEnd, bg, s) }));
  } else if (k === 'tint') {
    stops = three(mixHex(bg, navy3, 0.7), bg, mixHex(bg, gold, 0.9));
  } else {
    stops = three(mixHex('#FFFFFF', bg, strength), bg, mixHex('#000000', bg, strength));
  }
  const g: Grad = {
    gradColors: stops.map((st) => st.c) as unknown as Grad['gradColors'],
    locations: stops.map((st) => st.o) as unknown as Grad['locations'],
  };
  if (gradCache.size > 200) gradCache.clear();
  gradCache.set(key, g);
  return g;
}

function GradientFill({ color, kind, strength = 0.2, radius, surface, isDark: isDarkProp, match }: Props) {
  const theme = useTheme();
  const colors = theme.colors;
  const isDark = isDarkProp ?? theme.isDark;

  const flat = (match ? StyleSheet.flatten(match) : {}) as ViewStyle;
  const bg = (color ?? (flat.backgroundColor as string | undefined)) || '';
  let k: Kind | null = kind ?? null;
  if (!k) {
    if (bg === colors.navy3) k = 'surface';
    else if (bg === colors.accentTint) k = 'tint';
    else if (bg === colors.buttonFill || bg === colors.gold || bg === (colors as any).cardTealEnd) k = 'solid';
  }
  if (!k || !parse(bg)) return null;

  // The parent's corners (inside its border), so the gradient never pokes out.
  const bw = typeof flat.borderWidth === 'number' ? flat.borderWidth : 0;
  const r0 = radius ?? (typeof flat.borderRadius === 'number' ? flat.borderRadius : 0);
  const corner = (v: unknown) => Math.max(0, (typeof v === 'number' ? v : r0) - (radius !== undefined ? 0 : bw));
  const clip: ViewStyle = {
    borderTopLeftRadius: corner(flat.borderTopLeftRadius),
    borderTopRightRadius: corner(flat.borderTopRightRadius),
    borderBottomLeftRadius: corner(flat.borderBottomLeftRadius),
    borderBottomRightRadius: corner(flat.borderBottomRightRadius),
    overflow: 'hidden',
  };

  // Wallet cards (only a handful) keep the SVG version, which also draws a soft glow.
  if (k === 'card') {
    return <CardGradient bg={bg} base={surface ?? colors.navy3} isDark={isDark} clip={clip} />;
  }

  // Everything else is one native gradient view: it fills its parent by itself, so there
  // is no measuring step and no SVG to build. This is what keeps screens quick to open.
  const end = k === 'surface' ? END_DOWN : END_DIAGONAL;
  const { gradColors, locations } = gradientFor(k, bg, strength, colors.accentTint, colors.navy3, colors.gold);

  return (
    <LinearGradient
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, clip]}
      colors={gradColors}
      locations={locations}
      start={{ x: 0, y: 0 }}
      end={end}
    />
  );
}

// Wallet card wash: a light tint of the card's colour over the surface, deepening left
// to right, plus a soft white glow from the top-left corner.
function CardGradient({ bg, base, isDark, clip }: { bg: string; base: string; isDark: boolean; clip: ViewStyle }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useRef(`gf${++counter}`).current;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) setSize({ w: width, h: height });
  };
  const { w, h } = size;
  const from = isDark ? 0.14 : 0.06;
  const to = isDark ? 0.26 : 0.16;
  const stops = STOPS.map(({ o, s }) => ({ o, c: mixHex(bg, base, from + (to - from) * s) }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, clip]} onLayout={onLayout}>
      {w > 0 && h > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient2 id={`${id}l`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={w} y2={w * 0.36}>
              {stops.map((st) => (
                <Stop key={st.o} offset={st.o} stopColor={st.c} />
              ))}
            </LinearGradient2>
            <RadialGradient id={`${id}r`} gradientUnits="userSpaceOnUse" cx={0} cy={0} fx={0} fy={0} rx={w * 1.2} ry={h * 1.4}>
              {[
                ...STOPS.map(({ o, s }) => (
                  <Stop key={o} offset={o * 0.6} stopColor="#FFFFFF" stopOpacity={(1 - s) * (isDark ? 0.05 : 0.35)} />
                )),
                <Stop key="end" offset={1} stopColor="#FFFFFF" stopOpacity={0} />,
              ]}
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}l)`} />
          <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}r)`} />
        </Svg>
      )}
    </View>
  );
}

// Responsiveness: there are a few hundred of these across the app, so they only redraw
// when something they actually use changes. Parents usually pass a fresh `match` array
// on every redraw, so the comparison looks at the style values inside it.
const STYLE_KEYS: (keyof ViewStyle)[] = [
  'backgroundColor',
  'borderWidth',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
];

function sameProps(a: Props, b: Props): boolean {
  if (
    a.color !== b.color ||
    a.kind !== b.kind ||
    a.strength !== b.strength ||
    a.radius !== b.radius ||
    a.surface !== b.surface ||
    a.isDark !== b.isDark
  ) {
    return false;
  }
  if (a.match === b.match) return true;
  const fa = (StyleSheet.flatten(a.match) || {}) as ViewStyle;
  const fb = (StyleSheet.flatten(b.match) || {}) as ViewStyle;
  return STYLE_KEYS.every((key) => fa[key] === fb[key]);
}

export default React.memo(GradientFill, sameProps);
