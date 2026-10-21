// Version 2.2 (approved P4): the pale green glow on a row that was just added. Put it
// inside the row (after any background fill); it fades away on its own. Plain and
// instant (no fade) when the phone is set to remove animations.
import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { ScrollIntoViewContext } from './KeyboardAwareScrollView';
import { useTheme } from '../ThemeContext';
import { reduceMotionNow } from '../reduceMotion';

export default function ArrivalGlow({ radius = 0 }: { radius?: number }) {
  const { colors } = useTheme();
  const o = useRef(new Animated.Value(1)).current;
  // Version 2.2 (Cath: a new bill was added but she had to scroll down to find it): the
  // page scrolls so the new row is in view, once the rows have moved into place.
  const scroller = useContext(ScrollIntoViewContext);
  const box = useRef<any>(null);
  useEffect(() => {
    const t = setTimeout(() => scroller?.scrollIntoView(box.current), 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (reduceMotionNow()) return;
    Animated.timing(o, { toValue: 0, duration: 800, delay: 800, useNativeDriver: true }).start();
  }, [o]);
  return (
    <Animated.View
      ref={box}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.accentTint, opacity: o, borderRadius: radius }]}
    />
  );
}
