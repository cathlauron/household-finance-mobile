import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

// Gentle falling rain for the sky glow on Home (Step 4 of the live weather work).
// Fine slanted drops fall from the top of the screen and fade out before the Left to
// Spend card, slowly enough to feel calm rather than stormy.
// Plain Animated with the native driver (no reanimated); each drop loops on its own with
// a different speed and start delay, so the pattern never visibly repeats. SkyGlow only
// shows this when Rain animation is on, Reduce Motion is off and the app is in front.

const COUNT = 42;
const FALL = 330; // how far a drop travels (the glow is 340 tall)
const LEAN = 0.22; // drops drift left as they fall, matching the 12° slant

type DropSpec = { x: number; len: number; o: number; dur: number; delay: number };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SPECS: DropSpec[] = (() => {
  const r = seeded(21);
  return Array.from({ length: COUNT }, () => ({
    x: 20 + r() * 400,
    len: 9 + r() * 7,
    o: 0.22 + r() * 0.22,
    dur: 1500 + r() * 900,
    delay: r() * 2200,
  }));
})();

function Drop({ spec, color, scaleX }: { spec: DropSpec; color: string; scaleX: number }) {
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let stopped = false;
    let anim: Animated.CompositeAnimation | null = null;
    const fall = () => {
      if (stopped) return;
      y.setValue(0);
      anim = Animated.timing(y, { toValue: FALL, duration: spec.dur, easing: Easing.linear, useNativeDriver: true });
      anim.start(({ finished }) => finished && fall());
    };
    const t = setTimeout(fall, spec.delay);
    return () => {
      stopped = true;
      clearTimeout(t);
      anim?.stop();
    };
  }, [y, spec.dur, spec.delay]);

  const translateY = y.interpolate({ inputRange: [0, FALL], outputRange: [-20, FALL - 20] });
  const translateX = y.interpolate({ inputRange: [0, FALL], outputRange: [0, -FALL * LEAN] });
  const opacity = y.interpolate({ inputRange: [0, 30, FALL * 0.55, FALL], outputRange: [0, spec.o, spec.o * 0.7, 0] });

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: spec.x * scaleX,
          height: spec.len,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: '12deg' }],
        },
      ]}
    />
  );
}

export default function FallingRain({ color }: { color: string }) {
  const { width } = useWindowDimensions();
  const scaleX = width / 390;
  const drops = useMemo(() => SPECS, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((spec, i) => (
        <Drop key={i} spec={spec} color={color} scaleX={scaleX} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: { position: 'absolute', top: 0, width: 1.2, borderRadius: 1 },
});
