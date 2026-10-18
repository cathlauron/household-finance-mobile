import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import FallingRain from './FallingRain';
import Svg, { Circle, Defs, Ellipse, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { SkyPhase, SkyWeather, useSkyPhase, useSkyPrefs, useSkyWeather } from '../sky';

// The time-of-day glow behind the top of Home (approved on the "Forms Redesign" canvas,
// greeting round 5). No sun or moon shape: the light just glows out of the top-right
// corner and fades into the page, with a light sprinkle of detail:
//   morning   - pale butter to blush, floating specks of light and a faint wisp of cloud
//   afternoon - soft honey, three soft blurry rays from the corner and a wisp of cloud
//   evening   - peach to rose dusk with the first few stars
//   night     - cool blue with a scatter of stars and three small twinkles
// With Live weather on, cloudy and rainy weather swap in their own looks (greying glow and
// a wider bank of cloud; rain adds fine slanted drops that fade before the Left to Spend
// card). Evening counts as day for these; night keeps a few faint stars when cloudy.
// Drawn once per phase and weather (no animation yet), so it costs almost nothing.

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

// Weather looks, from the "Live weather: cloudy and rain" boards.
const WEATHER_LOOKS: Record<Exclude<SkyWeather, 'clear'>, { day: { light: Look; dark: Look }; night: { light: Look; dark: Look } }> = {
  cloudy: {
    day: {
      light: { c: '#E3E1DA', co: 0.95, m: '#ECE9E4', mo: 0.45, tex: '#5E6AA0' },
      dark: { c: '#3F3D38', co: 0.9, m: '#2A2926', mo: 0.45, tex: '#FFFFFF' },
    },
    night: {
      light: { c: '#C3C6D6', co: 0.9, m: '#DADCE6', mo: 0.45, tex: '#5E6AA0' },
      dark: { c: '#2A2F45', co: 0.95, m: '#1B1F30', mo: 0.5, tex: '#FFFFFF' },
    },
  },
  rain: {
    day: {
      light: { c: '#C9D3DE', co: 0.95, m: '#DCE3EA', mo: 0.45, tex: '#6F86A6' },
      dark: { c: '#2C3A4A', co: 0.9, m: '#1C2632', mo: 0.45, tex: '#AFC4E0' },
    },
    night: {
      light: { c: '#B6C2D6', co: 0.92, m: '#D3DAE6', mo: 0.45, tex: '#6F86A6' },
      dark: { c: '#233149', co: 0.95, m: '#161F30', mo: 0.5, tex: '#AFC4E0' },
    },
  },
};
const CLOUD_BANK: [number, number, number, number][] = [
  [300, 30, 80, 22], [220, 52, 60, 16], [355, 78, 54, 17], [160, 34, 46, 12], [260, 104, 66, 15], [110, 70, 40, 11],
];

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
const CLOUD_STARS = scatter(9, 10, [0.8], 0.2, 0.5);

// Rain: short slanted strokes, fading out towards the bottom of the glow.
type Drop = { x: number; y: number; len: number; o: number };
const DROPS: Drop[] = (() => {
  const r = seeded(3);
  return Array.from({ length: 70 }, () => {
    const y = r() * 310;
    return { x: r() * 400, y, len: 9 + r() * 7, o: (0.18 + r() * 0.24) * (1 - y / 320) };
  });
})();

const twinkle = (x: number, y: number, k: number) =>
  `M ${x} ${y - k} Q ${x} ${y} ${x + k} ${y} Q ${x} ${y} ${x} ${y + k} Q ${x} ${y} ${x - k} ${y} Q ${x} ${y} ${x} ${y - k} Z`;

// Soft afternoon rays (option A on the "Softer rays & matching forms" canvas): three wide,
// blurry beams fanning down-left from the corner. Each is a wide outer wedge with a narrower,
// slightly brighter one inside it, both fading in from the corner and out towards the end,
// so there are no hard edges or lines.
const RAY_LEN = 360;
const wedge = (deg: number, spread: number) => {
  const a = (deg * Math.PI) / 180;
  const p = (ang: number) => `${(CX + RAY_LEN * Math.cos(ang)).toFixed(1)},${(CY + RAY_LEN * Math.sin(ang)).toFixed(1)}`;
  return `${CX},${CY} ${p(a - spread)} ${p(a + spread)}`;
};
const RAYS = [118, 140, 162].map((deg) => ({ outer: wedge(deg, 0.08), inner: wedge(deg, 0.035) }));

// Version 2.1 (Cath): `plain` is the same time-of-day glow without the sun rays, rain,
// clouds and stars (those stay on Home), for every other page and the bottom sheets.
export default function SkyGlow({ plain = false }: { plain?: boolean } = {}) {
  const { isDark } = useTheme();
  const { glowOn, rainAnimOn } = useSkyPrefs();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appSub = AppState.addEventListener('change', (st) => setAppActive(st !== 'background'));
    return () => {
      motionSub.remove();
      appSub.remove();
    };
  }, []);
  const phase = useSkyPhase();
  const sky = useSkyWeather();
  const { width } = useWindowDimensions();
  // Rain falls only when the switch is on, Reduce Motion is off and the app is in front;
  // otherwise the drops are drawn still.
  const rainFalls = !plain && sky === 'rain' && rainAnimOn && !reduceMotion;

  const art = useMemo(() => {
    const mode = isDark ? 'dark' : 'light';
    const look = sky === 'clear' ? LOOKS[phase][mode] : WEATHER_LOOKS[sky][phase === 'night' ? 'night' : 'day'][mode];
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
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? (sky === 'rain' ? 0.05 : 0.07) : sky === 'rain' ? 0.45 : 0.6} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="skyRayOuter" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={RAY_LEN}>
            <Stop offset="0" stopColor={isDark ? look.tex : '#FFF4DC'} stopOpacity={0} />
            <Stop offset="0.22" stopColor={isDark ? look.tex : '#FFF4DC'} stopOpacity={isDark ? 0.09 : 0.28} />
            <Stop offset="0.7" stopColor={isDark ? look.tex : '#FFF4DC'} stopOpacity={isDark ? 0.03 : 0.1} />
            <Stop offset="1" stopColor={isDark ? look.tex : '#FFF4DC'} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="skyRayInner" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={RAY_LEN}>
            <Stop offset="0" stopColor={isDark ? '#F2D7A6' : '#FFF8E8'} stopOpacity={0} />
            <Stop offset="0.22" stopColor={isDark ? '#F2D7A6' : '#FFF8E8'} stopOpacity={isDark ? 0.1 : 0.3} />
            <Stop offset="0.7" stopColor={isDark ? '#F2D7A6' : '#FFF8E8'} stopOpacity={isDark ? 0.03 : 0.1} />
            <Stop offset="1" stopColor={isDark ? '#F2D7A6' : '#FFF8E8'} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={390} height={H} fill="url(#skyGlow)" />
        {!plain && sky !== 'clear' && (
          <>
            {CLOUD_BANK.map(([cx, cy, rx, ry], i) => (
              <React.Fragment key={i}>{wisp(cx, cy, rx, ry)}</React.Fragment>
            ))}
            {sky === 'cloudy' && phase === 'night' && dots(CLOUD_STARS)}
            {sky === 'rain' &&
              !rainFalls &&
              DROPS.map((d, i) => (
                <Path
                  key={i}
                  d={`M ${d.x} ${d.y} L ${d.x - d.len * 0.22} ${d.y + d.len}`}
                  stroke={look.tex}
                  strokeOpacity={d.o}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                />
              ))}
          </>
        )}
        {!plain && sky === 'clear' && phase === 'morning' && (
          <>
            {dots(MOTES)}
            {wisp(248, 78, 52, 12)}
          </>
        )}
        {!plain && sky === 'clear' && phase === 'afternoon' && (
          <>
            {RAYS.map((r, i) => (
              <React.Fragment key={i}>
                <Polygon points={r.outer} fill="url(#skyRayOuter)" />
                <Polygon points={r.inner} fill="url(#skyRayInner)" />
              </React.Fragment>
            ))}
            {wisp(236, 70, 48, 11)}
            {dots(SPARKS)}
          </>
        )}
        {!plain && sky === 'clear' && phase === 'evening' && (
          <>
            {dots(DUSK)}
            <Path d={twinkle(262, 46, 4)} fill={look.tex} fillOpacity={0.7} />
          </>
        )}
        {!plain && sky === 'clear' && phase === 'night' && (
          <>
            {dots(STARS, isDark ? 1 : 0.8)}
            <Path d={twinkle(232, 38, 5)} fill={look.tex} fillOpacity={0.8} />
            <Path d={twinkle(318, 150, 4)} fill={look.tex} fillOpacity={0.8} />
            <Path d={twinkle(150, 90, 3.5)} fill={look.tex} fillOpacity={0.8} />
          </>
        )}
      </>
    );
  }, [phase, isDark, sky, rainFalls, plain]);

  const rainColor = WEATHER_LOOKS.rain[phase === 'night' ? 'night' : 'day'][isDark ? 'dark' : 'light'].tex;
  if (!glowOn) return null;
  // The art is drawn for a 390-wide phone; wider phones stretch it a little sideways only.
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width={width} height={H} viewBox={`0 0 390 ${H}`} preserveAspectRatio="none">
        {art}
      </Svg>
      {rainFalls && appActive && <FallingRain color={rainColor} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, height: H },
});
