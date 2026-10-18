import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, AccessibilityInfo, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, Mask, Rect, G, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '../components/AppText';
import Reanimated, { useSharedValue, useAnimatedProps, withTiming, cancelAnimation, Easing as REasing, SharedValue } from 'react-native-reanimated';

// Redesign: the opening screen from the Finance Flow mockup.
// - Deep green background with a soft glow in the middle, and faint veined leaves
//   drifting slowly around the edges and toward the logo.
// - The cream line-art logo draws itself starting from the leaf inside the house
//   (stem, then the two leaf halves), then the roof from its peak outward, then the walls.
// - "FINANCE FLOW" settles in, then "Small steps. Bigger dreams." fades up.
// - A small veined leaf sways above a short progress bar; the bar fills once, then fades
//   away, leaving the leaf. App.tsx moves on once the app is ready (about 3 seconds).
// Light/dark mode is ignored on purpose so launch always looks the same.
// With Reduce Motion on, everything appears at once with no movement.
//
// Version 2.1 fix (Cath: "everything appears at once, the loader is gone"): unlocking your
// data keeps the app's main thread busy for a few seconds. Only the logo strokes need that
// thread (App.tsx waits for them, about 1.3 s, before unlocking); everything after them
// (wordmark, quote, leaf, bar) runs on the phone's animation thread, so it plays smoothly
// even while the unlock is working.

const CREAM = '#F6F3E7';
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

// Version 2.1 fix (Cath: "the opening animation froze again"): the logo strokes now draw on
// Reanimated's animation thread, so a busy start-up can't freeze them.
const DRAW_END = 1.3; // seconds until the last stroke is drawn
function IntroStroke({ d, len, at, t }: { d: string; len: number; at: number; t: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const s = t.value * DRAW_END;
    const raw = Math.min(1, Math.max(0, (s - at) / (DRAW_MS / 1000)));
    const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2; // ease in-out
    return { strokeDashoffset: len * (1 - k) };
  });
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={CREAM}
      strokeWidth={22}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[len, len]}
      animatedProps={props}
    />
  );
}
const AnimatedText = Animated.createAnimatedComponent(Text);

// The shared leaf shape (100 x 205 box): outline, stem, and the cut-out veins.
const LEAF_OUTLINE = 'M 62 8 C 86 34, 99 92, 88 136 C 81 160, 66 170, 52 172 C 36 170, 14 158, 10 122 C 6 84, 30 36, 62 8 Z';
const LEAF_STEM = 'M 52 172 C 50 182, 47 191, 44 198';
const LEAF_VEINS =
  'M 52 176 C 49 120, 54 62, 62 4 M 51.1 136.9 q 17.6 -5.6, 32 -28 M 53.5 82.8 q 14.3 -5.2, 26 -26 M 51.8 110.8 q -17.6 -5.6, -32 -28 M 55.7 58.1 q -11.0 -4.4, -20 -22';

// Logo strokes in drawing order, with each one's length (for the draw-on effect) and
// when it starts (seconds).
const LOGO: { d: string; len: number; at: number }[] = [
  { d: 'M 512 748 V 656', len: 94, at: 0.06 }, // stem
  { d: 'M 512 656 C 512 588, 578 508, 597 490 C 609 552, 584 636, 512 680 Z', len: 437, at: 0.21 }, // right leaf
  { d: 'M 502 668 C 453 664, 432 592, 428 548 C 442 544, 486 566, 505 658', len: 297, at: 0.27 }, // left leaf
  { d: 'M 512 270 C 507 270, 504 273, 501 276 L 215 512', len: 386, at: 0.51 }, // roof, left half
  { d: 'M 512 270 C 517 270, 520 273, 524 276 L 809 512', len: 386, at: 0.51 }, // roof, right half
  { d: 'M 268 470 V 700 C 268 726, 286 746, 307 746 H 414', len: 406, at: 0.69 }, // left wall
  { d: 'M 756 470 V 700 C 756 726, 738 746, 717 746 H 610', len: 406, at: 0.69 }, // right wall
];
const DRAW_MS = 540;

// Drifting background leaves, laid out for a 390 x 844 screen and scaled to fit.
export const DRIFT = [
  { x: -150, y: -220, w: 240, rot: 135, dx: 5.6, dy: 8.3, ms: 9000, op: 0.06 },
  { x: 290, y: 560, w: 300, rot: -45, dx: -6.1, dy: -12.7, ms: 10500, op: 0.06 },
  { x: 28, y: 210, w: 54, rot: -24, dx: 3.5, dy: 2.4, ms: 12000, op: 0.05 },
  { x: 300, y: 150, w: 40, rot: 34, dx: -3.1, dy: 4.2, ms: 13500, op: 0.045 },
  { x: 318, y: 400, w: 66, rot: 18, dx: -3.9, dy: -2.7, ms: 9000, op: 0.05 },
  { x: 10, y: 505, w: 48, rot: -42, dx: 4.0, dy: -4.9, ms: 10500, op: 0.045 },
  { x: 282, y: 640, w: 38, rot: 58, dx: -2.7, dy: -8.0, ms: 12000, op: 0.04 },
  { x: 70, y: 690, w: 34, rot: -12, dx: 2.7, dy: -9.1, ms: 13500, op: 0.04 },
  { x: 186, y: 96, w: 32, rot: 8, dx: -0.2, dy: 5.8, ms: 9000, op: 0.04 },
  { x: 118, y: 600, w: 28, rot: -30, dx: 1.6, dy: -6.7, ms: 10500, op: 0.035 },
  { x: 236, y: 560, w: 30, rot: 26, dx: -1.4, dy: -5.8, ms: 12000, op: 0.035 },
];

export function VeinedLeaf({ id, opacity, withStem = false, color = CREAM }: { id: string; opacity: number; withStem?: boolean; color?: string }) {
  return (
    <>
      <Defs>
        <Mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="205">
          <Rect x="0" y="0" width="100" height="205" fill="#fff" />
          <Path d={LEAF_VEINS} fill="none" stroke="#000" strokeWidth={2.2} strokeLinecap="round" />
        </Mask>
      </Defs>
      {withStem && <Path d={LEAF_STEM} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={3} strokeLinecap="round" />}
      <Path d={LEAF_OUTLINE} fill={color} fillOpacity={opacity} mask={`url(#${id})`} />
    </>
  );
}

export function DriftLeaf({ leaf, index, scale, still, color, opacityScale = 1, idPrefix = 'drift' }: { leaf: (typeof DRIFT)[number]; index: number; scale: number; still: boolean; color?: string; opacityScale?: number; idPrefix?: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: leaf.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: leaf.ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [still, t, leaf.ms]);
  const w = leaf.w * scale;
  const h = w * 2.05;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: leaf.x * scale,
        top: leaf.y * scale,
        width: w,
        height: h,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, leaf.dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, leaf.dy] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: [`${leaf.rot}deg`, `${leaf.rot + 4}deg`] }) },
        ],
      }}
    >
      <Svg width={w} height={h} viewBox="0 0 100 205">
        <VeinedLeaf id={`${idPrefix}${index}`} opacity={leaf.op * opacityScale} color={color} />
      </Svg>
    </Animated.View>
  );
}

export default function IntroScreen() {
  const { width, height } = useWindowDimensions();
  const scale = width / 390;
  const [still, setStill] = useState(false);

  const drawT = useSharedValue(0);
  // Start drawing straight away (not after the Reduce Motion check), on the animation thread.
  useEffect(() => {
    drawT.value = withTiming(1, { duration: DRAW_END * 1000, easing: REasing.linear });
  }, [drawT]);
  // Version 2.1 fix: ONE clock (milliseconds since the screen appeared) drives everything
  // after the strokes. It runs on the native animation thread with no delays: Animated's
  // `delay` waits on the app's main thread, which is busy unlocking your data, so the
  // delayed steps used to fire all at once afterwards.
  const clock = useRef(new Animated.Value(0)).current;
  const C = 'clamp' as const;
  const word = clock.interpolate({ inputRange: [0, 1140, 1440, 1740], outputRange: [0, 0, 0.75, 1], extrapolate: C });
  const quote = clock.interpolate({ inputRange: [0, 1440, 1680, 1920], outputRange: [0, 0, 0.8, 1], extrapolate: C });
  const loader = clock.interpolate({ inputRange: [0, 1620, 1980], outputRange: [0, 0, 1], extrapolate: C });
  const fillX = clock.interpolate({ inputRange: [0, 1620, 1980, 2340, 2700], outputRange: [-64, -64, -40, -10, 0], extrapolate: C });
  const track = clock.interpolate({ inputRange: [0, 2820, 3090], outputRange: [1, 1, 0], extrapolate: C });
  const sway = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    // Start everything straight away (a busy start-up can't hold it back); the movement
    // after the strokes runs on the native animation thread.
    const timeline = Animated.timing(clock, { toValue: 3100, duration: 3100, easing: Easing.linear, useNativeDriver: true });
    timeline.start();
    // One timing looped natively (a sequence would restart through the busy main thread).
    const swayLoop = Animated.loop(Animated.timing(sway, { toValue: 2, duration: 3200, easing: Easing.linear, useNativeDriver: true }));
    swayLoop.start();
    // With Reduce Motion on, jump to the end: everything shows at once, nothing moves.
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || !reduce) return;
        setStill(true);
        timeline.stop();
        swayLoop.stop();
        cancelAnimation(drawT);
        drawT.value = 1;
        clock.setValue(2800); // everything shown, the bar still there
      });
    return () => {
      cancelled = true;
      swayLoop.stop();
    };
  }, [drawT, clock, sway]);

  // "FINANCE FLOW" starts a little wider and settles in (a gentle scale, so it can run on
  // the animation thread).
  const settle = word.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] });

  return (
    <View style={styles.container} accessible accessibilityLabel="Finance Flow. Small steps. Bigger dreams. Opening.">
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="44%" rx="60%" ry="40%" fx="50%" fy="44%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#21503B" />
            <Stop offset="0.55" stopColor="#173829" />
            <Stop offset="1" stopColor="#0E2419" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#glow)" />
      </Svg>

      {DRIFT.map((leaf, i) => (
        <DriftLeaf key={i} leaf={leaf} index={i} scale={scale} still={still} />
      ))}

      <View style={styles.center}>
        <Svg width={124} height={102} viewBox="190 240 644 530">
          {LOGO.map((p, i) => (
            <IntroStroke key={i} d={p.d} len={p.len} at={p.at} t={drawT} />
          ))}
        </Svg>
        <AnimatedText
          numberOfLines={1}
          style={[styles.wordmark, { opacity: word, letterSpacing: 7.1, paddingLeft: 7.1, transform: [{ scaleX: settle }] }]}
        >
          FINANCE FLOW
        </AnimatedText>
        <AnimatedText
          style={[
            styles.quote,
            { opacity: quote, transform: [{ translateY: quote.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] },
          ]}
        >
          Small steps. Bigger dreams.
        </AnimatedText>
      </View>

      <Animated.View style={[styles.loader, { opacity: loader }]} pointerEvents="none">
        <Animated.View
          style={{
            width: 19,
            height: 32,
            transform: [
              { translateY: 16 },
              { rotate: sway.interpolate({ inputRange: [0, 0.5, 1, 1.5, 2], outputRange: ['-8deg', '-1deg', '6deg', '-1deg', '-8deg'] }) },
              { translateY: -16 },
            ],
          }}
        >
          <Svg width={19} height={32} viewBox="-10 0 120 205">
            <G transform="rotate(14 50 100)">
              <VeinedLeaf id="small" opacity={0.62} withStem />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.track, { opacity: track }]}>
          <Animated.View style={[styles.fill, { transform: [{ translateX: fillX }] }]} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#173829', overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  wordmark: { marginTop: 26, fontSize: 21, lineHeight: 26, fontWeight: '500', color: CREAM },
  quote: { marginTop: 12, fontSize: 16, lineHeight: 22, color: 'rgba(246,243,231,0.82)', textAlign: 'center' },
  loader: { position: 'absolute', left: 0, right: 0, bottom: 60, alignItems: 'center', gap: 14 },
  track: { width: 64, height: 3, borderRadius: 999, backgroundColor: 'rgba(246,243,231,0.16)', overflow: 'hidden' },
  fill: { width: 64, height: '100%', borderRadius: 999, backgroundColor: CREAM },
});
