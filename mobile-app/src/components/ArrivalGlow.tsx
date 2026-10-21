// Version 2.2 (approved P4): the pale green glow on a row that was just added. Put it
// inside the row (after any background fill); it fades away on its own. Plain and
// instant (no fade) when the phone is set to remove animations.
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeContext';
import { reduceMotionNow } from '../reduceMotion';

export default function ArrivalGlow({ radius = 0 }: { radius?: number }) {
  const { colors } = useTheme();
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduceMotionNow()) return;
    Animated.timing(o, { toValue: 0, duration: 800, delay: 800, useNativeDriver: true }).start();
  }, [o]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.accentTint, opacity: o, borderRadius: radius }]}
    />
  );
}
