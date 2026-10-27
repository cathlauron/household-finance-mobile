import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Filter, FeGaussianBlur, G, Path } from 'react-native-svg';
import { subscribeToLeafTransition } from '../leafTransition';
import { LEAF_OUTLINE, LEAF_STEM, LEAF_VEINS } from './leafShape';

// Redesign: the falling leaves behind the whole app (Finance Flow design system,
// "Background › Falling, with depth"). About 27 single leaves fall slowly in three
// depths: far (small, slow, faint), middle, and near (big, quicker). Each sways and
// tilts as it falls and starts at a random point, so the screen is never empty and
// never in sync. Switching tabs is a gust of wind that pushes every leaf sideways,
// near leaves furthest. Only position and rotation animate, on the native thread.
// LeafBackground decides when to show these (setting on, Reduce Motion off).

type Depth = {
  count: number;
  size: [number, number]; // leaf height in px
  fall: [number, number]; // seconds from top to bottom
  sway: [number, number]; // px each side
  swayPeriod: [number, number]; // seconds per full sway
  strength: [number, number]; // share of the leaf colour's opacity
  wind: [number, number]; // how far a gust pushes it, times the base push
  blur: number; // soft focus in px (near leaves only)
};

const DEPTHS: Depth[] = [
  { count: 6, size: [16, 30], fall: [40, 56], sway: [5, 10], swayPeriod: [6, 9], strength: [0.5, 0.65], wind: [0.4, 0.6], blur: 0 },
  { count: 6, size: [38, 74], fall: [22, 32], sway: [12, 24], swayPeriod: [4, 7], strength: [0.8, 1], wind: [0.85, 1.15], blur: 0 },
  { count: 2, size: [110, 170], fall: [12, 17], sway: [26, 42], swayPeriod: [3, 5], strength: [0.9, 1], wind: [1.45, 1.75], blur: 0 }, // blur off: costly to draw for an almost invisible effect
];

// Leaves can drift this far past either side before wrapping round to the other side,
// so the wrap always happens off screen.
const SIDE_MARGIN = 200;
// The leaf is drawn in a 100 x 205 box; a little room is added round it so a blurred
// edge is not cut off.
const PAD = 8;
const BOX_W = 100 + PAD * 2;
const BOX_H = 205 + PAD * 2;
const TILT_DEG = 22;

// Cath's tuning (slower and calmer than the design system's numbers): every fall and
// sway takes this many times longer, and a gust pushes and tilts leaves this much.
// Raise SLOWDOWN for slower leaves; raise WIND_STRENGTH for a stronger gust.
const FALL_SLOWDOWN = 2.5;
const SWAY_SLOWDOWN = 1.6;
const WIND_STRENGTH = 0.3;
const GUST_TILT_DEG = 6;

type LeafSpec = {
  x: number; // 0..1 across the screen
  size: number;
  fallMs: number;
  phase: number; // 0..1, where in its fall it starts
  sway: number;
  swayMs: number;
  swayStart: number; // -1..1
  strength: number;
  wind: number;
  angle: number; // resting angle in degrees
  gustDelay: number; // ms, 0..260
  blur: number;
  blurId: number;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeLeaves(): LeafSpec[] {
  const out: LeafSpec[] = [];
  DEPTHS.forEach((d) => {
    for (let i = 0; i < d.count; i++) {
      out.push({
        x: Math.random(),
        size: rand(d.size[0], d.size[1]),
        fallMs: rand(d.fall[0], d.fall[1]) * 1000 * FALL_SLOWDOWN,
        phase: Math.random(),
        sway: rand(d.sway[0], d.sway[1]),
        swayMs: rand(d.swayPeriod[0], d.swayPeriod[1]) * 1000 * SWAY_SLOWDOWN,
        swayStart: rand(-1, 1),
        strength: rand(d.strength[0], d.strength[1]),
        wind: rand(d.wind[0], d.wind[1]),
        angle: rand(-60, 60),
        gustDelay: rand(0, 260),
        blur: d.blur,
        blurId: out.length,
      });
    }
  });
  return out;
}

type Props = {
  color: string; // the mood leaf colour
  opacity: number; // the mood leaf strength (about 0.045)
  veinColor: string; // the page colour, so the veins look cut out
  // Version 2.2 (Cath): Falling leaves off = the leaves stop where they are (and carry on
  // from there when it's turned back on), instead of switching to a different still layout.
  paused?: boolean;
};

export default function FallingLeaves({ color, opacity, veinColor, paused = false }: Props) {
  const { width, height } = useWindowDimensions();
  const leaves = useMemo(makeLeaves, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {leaves.map((leaf, i) => (
        <FallingLeaf
          key={i}
          leaf={leaf}
          screenW={width}
          screenH={height}
          color={color}
          opacity={opacity}
          veinColor={veinColor}
          paused={paused}
        />
      ))}
    </View>
  );
}

const FallingLeaf = React.memo(function FallingLeaf({
  leaf,
  screenW,
  screenH,
  color,
  opacity,
  veinColor,
  paused,
}: {
  paused: boolean;
  leaf: LeafSpec;
  screenW: number;
  screenH: number;
  color: string;
  opacity: number;
  veinColor: string;
}) {
  const fall = useRef(new Animated.Value(leaf.phase)).current;
  const sway = useRef(new Animated.Value(leaf.swayStart)).current;
  const wind = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const windTarget = useRef(0);

  // Falling: from just above the screen to just below it, then start again at the top.
  useEffect(() => {
    if (paused) return;
    let stopped = false;
    function run(from: number) {
      fall.setValue(from);
      Animated.timing(fall, {
        toValue: 1,
        duration: leaf.fallMs * (1 - from),
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !stopped) run(0);
      });
    }
    // Starts (or carries on) from wherever the leaf is now.
    fall.stopAnimation((now) => {
      if (!stopped) run(typeof now === 'number' ? now : leaf.phase);
    });
    return () => {
      stopped = true;
      fall.stopAnimation();
    };
  }, [fall, leaf, paused]);

  // Swaying side to side (and tilting with it), forever. Each half-swing starts exactly
  // where the last one ended, so there is never a jump. (Animated.loop resets the value
  // between rounds, which made the leaves twitch.) The first half-swing starts from a
  // random spot, with a duration to match, so the leaves stay out of step.
  const swayTo = useRef(1);
  const swayStarted = useRef(false);
  useEffect(() => {
    if (paused) return;
    let stopped = false;
    const half = leaf.swayMs / 2;
    function swing(from: number, to: number) {
      swayTo.current = to;
      const share = Math.abs(to - from) / 2; // 1 for a full half-swing
      Animated.timing(sway, {
        toValue: to,
        duration: Math.max(1, half * share),
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !stopped) swing(to, -to);
      });
    }
    if (!swayStarted.current) {
      swayStarted.current = true;
      sway.setValue(leaf.swayStart);
      swing(leaf.swayStart, 1);
    } else {
      sway.stopAnimation((now) => {
        if (!stopped) swing(typeof now === 'number' ? now : 0, swayTo.current);
      });
    }
    return () => {
      stopped = true;
      sway.stopAnimation();
    };
  }, [sway, leaf, paused]);

  // Wind: each gust pushes the leaf sideways (quick start, slow settle) and tilts it
  // the way it is pushed, then it carries on falling.
  useEffect(() => {
    if (paused) return;
    return subscribeToLeafTransition((push) => {
      const dx = push * leaf.wind * WIND_STRENGTH;
      windTarget.current += dx;
      Animated.timing(wind, {
        toValue: windTarget.current,
        duration: 1600,
        delay: leaf.gustDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.sequence([
        Animated.delay(leaf.gustDelay),
        Animated.timing(tilt, {
          toValue: dx > 0 ? GUST_TILT_DEG : -GUST_TILT_DEG,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tilt, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    });
  }, [wind, tilt, leaf, paused]);

  // Drawn size including the padding, so the leaf itself is leaf.size tall.
  const unit = leaf.size / 205;
  const w = BOX_W * unit;
  const h = BOX_H * unit;
  const filterId = `leafBlur${leaf.blurId}`;
  // The moving parts are built once (not on every redraw of the screen), so the native
  // animation keeps running untouched when the app updates its data.
  const { translateX, translateY, rotate } = useMemo(() => {
    const span = screenW + SIDE_MARGIN * 2;
    // Horizontal spot: starting x + wind + sway, wrapped round so blown leaves come
    // back in from the other side (the wrap happens off screen).
    const tx = Animated.subtract(
      Animated.modulo(
        Animated.add(Animated.add(wind, Animated.multiply(sway, leaf.sway)), leaf.x * screenW + SIDE_MARGIN),
        span
      ),
      SIDE_MARGIN + w / 2
    );
    const ty = fall.interpolate({
      inputRange: [0, 1],
      outputRange: [-h - 40, screenH + 40],
    });
    const rot = Animated.add(Animated.add(Animated.multiply(sway, TILT_DEG), tilt), leaf.angle).interpolate({
      inputRange: [-720, 720],
      outputRange: ['-720deg', '720deg'],
    });
    return { translateX: tx, translateY: ty, rotate: rot };
  }, [wind, sway, fall, tilt, leaf, screenW, screenH, w, h]);

  return (
    <Animated.View
      style={[styles.leaf, { width: w, height: h, transform: [{ translateX }, { translateY }, { rotate }] }]}
      // Keep the drawn leaf as a ready-made picture while it moves, instead of redrawing
      // the SVG (and its blur) every frame.
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
    >
      <Svg width={w} height={h} viewBox={`${-PAD} ${-PAD} ${BOX_W} ${BOX_H}`}>
        {leaf.blur > 0 && (
          <Defs>
            <Filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              {/* blur is in screen px; the drawing is scaled by `unit`, so divide. */}
              <FeGaussianBlur stdDeviation={leaf.blur / unit} />
            </Filter>
          </Defs>
        )}
        <G filter={leaf.blur > 0 ? `url(#${filterId})` : undefined}>
        <Path
          d={LEAF_STEM}
          fill="none"
          stroke={color}
          strokeOpacity={opacity * leaf.strength}
          strokeWidth={3.22}
          strokeLinecap="round"
        />
        <Path d={LEAF_OUTLINE} fill={color} fillOpacity={opacity * leaf.strength} />
        <Path d={LEAF_VEINS} fill="none" stroke={veinColor} strokeWidth={2.3} strokeLinecap="round" />
        </G>
      </Svg>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
