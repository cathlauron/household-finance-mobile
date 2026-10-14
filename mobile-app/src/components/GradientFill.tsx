import React, { useRef, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';

// Redesign: a soft gradient that fills its parent, used instead of flat colour fills.
// Put it as the FIRST child of a View/button (the parent should have overflow: 'hidden'
// or pass the parent's corner `radius`). It measures itself so the gradient always covers
// the whole shape.
//
// kind="solid" (Left to Spend, filled buttons): the colour runs from a lighter version
//   at the top-left, through the colour itself, to a deeper version at the bottom-right.
//   `strength` is how far the ends move away from the colour (0.2 = 20%).
// kind="card" (Wallet cards): a light wash of `color` over `surface`, deepening from
//   left to right, with a soft white glow from the top-left corner.

type Props = {
  color: string;
  kind?: 'solid' | 'card';
  strength?: number;
  radius?: number;
  surface?: string;
  isDark?: boolean;
};

function parse(h: string): number[] | null {
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

let counter = 0;

export default function GradientFill({ color, kind = 'solid', strength = 0.2, radius = 0, surface = '#FFFFFF', isDark = false }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useRef(`gf${++counter}`).current;
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) setSize({ w: width, h: height });
  };
  const { w, h } = size;

  let stops: { o: number; c: string; a?: number }[];
  let x2 = w;
  let y2 = h;
  if (kind === 'card') {
    const from = isDark ? 0.14 : 0.06;
    const to = isDark ? 0.26 : 0.16;
    stops = STOPS.map(({ o, s }) => ({ o, c: mixHex(color, surface, from + (to - from) * s) }));
    y2 = w * 0.36; // mostly left to right
  } else {
    const light = mixHex('#FFFFFF', color, strength);
    const dark = mixHex('#000000', color, strength);
    stops = STOPS.map(({ o, s }) => ({ o, c: s < 0.5 ? mixHex(color, light, s * 2) : mixHex(dark, color, (s - 0.5) * 2) }));
  }

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]} onLayout={onLayout}>
      {w > 0 && h > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={`${id}l`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={x2} y2={y2}>
              {stops.map((st) => (
                <Stop key={st.o} offset={st.o} stopColor={st.c} />
              ))}
            </LinearGradient>
            {kind === 'card' && (
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
          <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#${id}l)`} />
          {kind === 'card' && <Rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} fill={`url(#${id}r)`} />}
        </Svg>
      )}
    </View>
  );
}
