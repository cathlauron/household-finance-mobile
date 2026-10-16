import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { SkyPhase, useSkyPhase, useSkyPrefs } from '../sky';

// The time-of-day glow behind the top of Home (approved on the "Forms Redesign" canvas,
// greeting round 5). No sun or moon shape: the light just glows out of the top-right
// corner and fades into the page, with a light sprinkle of detail:
//   morning   - pale butter to blush, floating specks of light and a faint wisp of cloud
//   afternoon - soft honey, faint rays fanning down from the corner and a wisp of cloud
//   evening   - peach to rose dusk with the first few stars
//   night     - cool blue with a scatter of stars and three small twinkles
// Drawn once per phase (no animation), so it costs almost nothing.

const H = 340; // how far down the screen the glow reaches
const CX = 392; // the light source: just off the top-right corner
const CY = -14;

type Look = { c: string; co: number; m: string; mo: number; tex: string };

const LOOKS: Record<SkyPhase, { light: Look; dark: Look }> = {
  morning: {
    light: { c: '#F6E2AE', co: 0.95, m: '#F3D9D2', mo: 0.45, tex: '#C9A24A' },
    dark: { c: '#5E5530', co: 0.9, m: '#3A3424', mo: 0.45, tex: '#E8D49A' },
  },
  afternoon: {
    light: { c: '#F5D79C', co: 0.95, m: '#F4E7C8', mo: 0.45, tex: '#D9A75A' },
    dark: { c: '#6B5126', co: 0.9, m: '#3E3020', mo: 0.45, tex: '#E9C58A' },
  },
  evening: {
    light: { c: '#F2BBAA', co: 0.95, m: '#E9C6D6', mo: 0.45, tex: '#B9708A' },
    dark: { c: '#6A3440', co: 0.9, m: '#3B2238', mo: 0.45, tex: '#F0C2CF' },
  },
  night: {
    light: { c: '#AFBBE6', co: 0.9, m: '#D6DBF1', mo: 0.45, tex: '#5E6AA0' },
    dark: { c: '#2F3D78', co: 0.95, m: '#1C2450', mo: 0.5, tex: '#FFFFFF' },
  },
};

// A fixed "random" scatter (the same every time), denser near the corner.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(r() || 1e-6)) * Math.cos(2 * Math.PI * r());
}
type Dot = { x: number; y: number; r: number; o: number };
function scatter(seed: number, n: number, sizes: number[], omin: number, omax: number): Dot[] {
  const r = seeded(seed);
  const dots: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const x = 390 - Math.abs(gauss(r) * 150);
    const y = Math.abs(gauss(r) * 110);
    const size = sizes[Math.floor(r() * sizes.length)];
    const o = omin + r() * (omax - omin);
    if (x >= 0 && y <= 300) dots.push({ x, y, r: size, o });
  }
  return dots;
}
const STARS = scatter(7, 46, [0.6, 0.7, 0.8, 1.0, 1.2], 0.25, 0.75);
const DUSK = scatter(11, 14, [0.6, 0.8, 1.0], 0.25, 0.6);
const MOTES = scatter(5, 30, [0.8, 1.0, 1.3, 1.6], 0.2, 0.55);
const SPARKS = scatter(13, 12, [0.8, 1.0, 1.2], 0.2, 0.45);

const twinkle = (x: number, y: number, k: number) =>
  `M ${x} ${y - k} Q ${x} ${y} ${x + k} ${y} Q ${x} ${y} ${x} ${y + k} Q ${x} ${y} ${x - k} ${y} Q ${x} ${y} ${x} ${y - k} Z`;

// Thin wedges fanning down-left from the corner, for the afternoon rays.
const RAYS = [112, 126, 140, 154, 168].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const spread = 0.022;
  const p = (ang: number) => `${CX + 340 * Math.cos(ang)},${CY + 340 * Math.sin(ang)}`;
  return `${CX},${CY} ${p(a - spread)} ${p(a + spread)}`;
});

export default function SkyGlow() {
  const { isDark } = useTheme();
  const { glowOn } = useSkyPrefs();
  const phase = useSkyPhase();
  const { width } = useWindowDimensions();

  const art = useMemo(() => {
    const look = LOOKS[phase][isDark ? 'dark' : 'light'];
    const dots = (list: Dot[], scale = 1) =>
      list.map((d, i) => <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={look.tex} fillOpacity={d.o * scale} />);
    const wisp = (cx: number, cy: number, rx: number, ry: number) => (
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#skyWisp)" />
    );
    return (
      <>
        <Defs>
          <RadialGradient id="skyGlow" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={370}>
            <Stop offset="0" stopColor={look.c} stopOpacity={look.co} />
            <Stop offset="0.2" stopColor={look.c} stopOpacity={look.co * 0.7} />
            <Stop offset="0.48" stopColor={look.m} stopOpacity={look.mo} />
            <Stop offset="0.75" stopColor={look.m} stopOpacity={look.mo * 0.3} />
            <Stop offset="1" stopColor={look.m} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="skyWisp" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? 0.07 : 0.6} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="skyRay" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={340}>
            <Stop offset="0" stopColor={look.tex} stopOpacity={isDark ? 0.14 : 0.2} />
            <Stop offset="1" stopColor={look.tex} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={390} height={H} fill="url(#skyGlow)" />
        {phase === 'morning' && (
          <>
            {dots(MOTES)}
            {wisp(248, 78, 52, 12)}
          </>
        )}
        {phase === 'afternoon' && (
          <>
            {RAYS.map((pts, i) => (
              <Polygon key={i} points={pts} fill="url(#skyRay)" />
            ))}
            {wisp(236, 70, 48, 11)}
            {dots(SPARKS)}
          </>
        )}
        {phase === 'evening' && (
          <>
            {dots(DUSK)}
            <Path d={twinkle(262, 46, 4)} fill={look.tex} fillOpacity={0.7} />
          </>
        )}
        {phase === 'night' && (
          <>
            {dots(STARS, isDark ? 1 : 0.8)}
            <Path d={twinkle(232, 38, 5)} fill={look.tex} fillOpacity={0.8} />
            <Path d={twinkle(318, 150, 4)} fill={look.tex} fillOpacity={0.8} />
            <Path d={twinkle(150, 90, 3.5)} fill={look.tex} fillOpacity={0.8} />
          </>
        )}
      </>
    );
  }, [phase, isDark]);

  if (!glowOn) return null;
  // The art is drawn for a 390-wide phone; wider phones stretch it a little sideways only.
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={width} height={H} viewBox={`0 0 390 ${H}`} preserveAspectRatio="none">
        {art}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, height: H },
});
