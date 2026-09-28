import React, { useEffect, useRef, useState } from 'react';
import { Animated, AccessibilityInfo, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { subscribeToLeafTransition } from '../leafTransition';
import { RIGHT_LEAF, LEFT_LEAF, LEAF_VIEWBOX } from './LeafBackground';

// A few faint leaves drift up and to the right, then fade out, each time
// the person moves to a different screen or tab. Touches pass straight
// through, and navigation itself is never delayed.
const DURATION_MS = 750;
const PEAK_OPACITY = 0.25;

// x / y = starting spot as a fraction of the screen.
// dx / dy = how far it drifts, as a fraction of screen width / height.
const LEAVES = [
  { d: RIGHT_LEAF, size: 120, x: 0.02, y: 0.78, dx: 0.6, dy: -0.55, r0: '-25deg', r1: '20deg' },
  { d: LEFT_LEAF, size: 90, x: 0.3, y: 0.92, dx: 0.5, dy: -0.6, r0: '10deg', r1: '55deg' },
  { d: RIGHT_LEAF, size: 100, x: 0.55, y: 0.85, dx: 0.4, dy: -0.5, r0: '-40deg', r1: '5deg' },
  { d: LEFT_LEAF, size: 70, x: 0.05, y: 0.55, dx: 0.7, dy: -0.4, r0: '0deg', r1: '40deg' },
];

export default function LeafTransitionOverlay() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        reduceMotionRef.current = enabled;
        setReduceMotion(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      reduceMotionRef.current = enabled;
      setReduceMotion(enabled);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return subscribeToLeafTransition(() => {
      if (reduceMotionRef.current) return;
      progress.stopAnimation();
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [progress]);

  if (reduceMotion) return null;

  const opacity = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, PEAK_OPACITY, 0],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {LEAVES.map((leaf, i) => {
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, width * leaf.dx] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, height * leaf.dy] });
        const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [leaf.r0, leaf.r1] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: width * leaf.x,
              top: height * leaf.y,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          >
            <Svg width={leaf.size} height={leaf.size * 1.05} viewBox={LEAF_VIEWBOX}>
              <Path d={leaf.d} fill={colors.gold} />
            </Svg>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}
