import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
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
};

const DEPTHS: Depth[] = [
  { count: 12, size: [16, 30], fall: [40, 56], sway: [5, 10], swayPeriod: [6, 9], strength: [0.5, 0.65], wind: [0.4, 0.6] },
  { count: 11, size: [38, 74], fall: [22, 32], sway: [12, 24], swayPeriod: [4, 7], strength: [0.8, 1], wind: [0.85, 1.15] },
  { count: 4, size: [110, 170], fall: [12, 17], sway: [26, 42], swayPeriod: [3, 5], strength: [0.9, 1], wind: [1.45, 1.75] },
];

// Leaves can drift this far past either side before wrapping round to the other side,
// so the wrap always happens off screen.
const SIDE_MARGIN = 200;
const TILT_DEG = 22;

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
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeLeaves(): LeafSpec[] {
  const out: LeafSpec[] = [];
  DEPTHS.forEach((d) => {
    for (let i = 0; i < d.count; i++) {
      out.push({
        x: Math.random(),
        size: rand(d.size[0], d.size[1]),
        fallMs: rand(d.fall[0], d.fall[1]) * 1000,
        phase: Math.random(),
        sway: rand(d.sway[0], d.sway[1]),
        swayMs: rand(d.swayPeriod[0], d.swayPeriod[1]) * 1000,
        swayStart: rand(-1, 1),
        strength: rand(d.strength[0], d.strength[1]),
        wind: rand(d.wind[0], d.wind[1]),
        angle: rand(-60, 60),
        gustDelay: rand(0, 260),
      });
    }
  });
  return out;
}

type Props = {
  color: string; // the mood leaf colour
  opacity: number; // the mood leaf strength (about 0.045)
  veinColor: string; // the page colour, so the veins look cut out
};

export default function FallingLeaves({ color, opacity, veinColor }: Props) {
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
        />
      ))}
    </View>
  );
}

function FallingLeaf({
  leaf,
  screenW,
  screenH,
  color,
  opacity,
  veinColor,
}: {
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
    run(leaf.phase);
    return () => {
      stopped = true;
      fall.stopAnimation();
    };
  }, [fall, leaf]);

  // Swaying side to side (and tilting with it), forever.
  useEffect(() => {
    const half = leaf.swayMs / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sway, leaf]);

  // Wind: each gust pushes the leaf sideways (quick start, slow settle) and tilts it
  // the way it is pushed, then it carries on falling.
  useEffect(() => {
    return subscribeToLeafTransition((push) => {
      const dx = push * leaf.wind;
      windTarget.current += dx;
      Animated.timing(wind, {
        toValue: windTarget.current,
        duration: 1300,
        delay: leaf.gustDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.sequence([
        Animated.delay(leaf.gustDelay),
        Animated.timing(tilt, {
          toValue: dx > 0 ? 18 : -18,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tilt, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    });
  }, [wind, tilt, leaf]);

  const w = leaf.size * (100 / 205);
  const span = screenW + SIDE_MARGIN * 2;
  // Horizontal spot: starting x + wind + sway, wrapped round so blown leaves come back
  // in from the other side.
  const translateX = Animated.subtract(
    Animated.modulo(
      Animated.add(Animated.add(wind, Animated.multiply(sway, leaf.sway)), leaf.x * screenW + SIDE_MARGIN),
      span
    ),
    SIDE_MARGIN + w / 2
  );
  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-leaf.size - 40, screenH + 40],
  });
  const rotate = Animated.add(Animated.add(Animated.multiply(sway, TILT_DEG), tilt), leaf.angle).interpolate({
    inputRange: [-720, 720],
    outputRange: ['-720deg', '720deg'],
  });

  return (
    <Animated.View
      style={[styles.leaf, { width: w, height: leaf.size, transform: [{ translateX }, { translateY }, { rotate }] }]}
    >
      <Svg width={w} height={leaf.size} viewBox="0 0 100 205">
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
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
