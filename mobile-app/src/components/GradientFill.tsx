import React, { useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../ThemeContext';

// Redesign: a soft gradient that fills its parent, used instead of flat colour fills.
// Put it as the FIRST child of a View or button. It measures itself so the gradient
// always covers the whole shape, and clips itself to the parent's rounded corners.
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

export default function GradientFill({ color, kind, strength = 0.2, radius, surface, isDark: isDarkProp, match }: Props) {
  const theme = useTheme();
  const colors = theme.colors;
  const isDark = isDarkProp ?? theme.isDark;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useRef(`gf${++counter}`).current;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) setSize({ w: width, h: height });
  };

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

  const { w, h } = size;
  // Too small to show a gradient (dots, checkboxes, thin progress bars): leave it flat.
  const tiny = w > 0 && (w < 28 || h < 14);

  let stops: { o: number; c: string }[];
  let x2 = w;
  let y2 = h;
  if (k === 'card') {
    const base = surface ?? colors.navy3;
    const from = isDark ? 0.14 : 0.06;
    const to = isDark ? 0.26 : 0.16;
    stops = STOPS.map(({ o, s }) => ({ o, c: mixHex(bg, base, from + (to - from) * s) }));
    y2 = w * 0.36; // mostly left to right
  } else if (k === 'surface') {
    const end = mixHex(colors.accentTint, bg, 0.45);
    stops = STOPS.map(({ o, s }) => ({ o, c: mixHex(end, bg, s) }));
    x2 = h * 0.36; // mostly top to bottom
  } else if (k === 'tint') {
    stops = three(mixHex(bg, colors.navy3, 0.7), bg, mixHex(bg, colors.gold, 0.9));
  } else {
    stops = three(mixHex('#FFFFFF', bg, strength), bg, mixHex('#000000', bg, strength));
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, clip]} onLayout={onLayout}>
      {w > 0 && h > 0 && !tiny && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={`${id}l`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={x2} y2={y2}>
              {stops.map((st) => (
                <Stop key={st.o} offset={st.o} stopColor={st.c} />
              ))}
            </LinearGradient>
            {k === 'card' && (
              <RadialGradient id={`${id}r`} gradientUnits="userSpaceOnUse" cx={0} cy={0} fx={0} fy={0} rx={w * 1.2} ry={h * 1.4}>
                {[
                  ...STOPS.map(({ o, s }) => (
                    <Stop key={o} offset={o * 0.6} stopColor="#FFFFFF" stopOpacity={(1 - s) * (isDark ? 0.05 : 0.35)} />
                  )),
                  <Stop key="end" offset={1} stopColor="#FFFFFF" stopOpacity={0} />,
                ]}
              </RadialGradient>
            )}
          </Defs>
          <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}l)`} />
          {k === 'card' && <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}r)`} />}
        </Svg>
      )}
    </View>
  );
}
