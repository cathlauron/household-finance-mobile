import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, FADE_IN_MS } from '../motion';

// Opening a page: the slide starts straight away, and the page's contents are built a
// moment later (the next frame), while the slide is already moving. Building a busy page
// first used to hold the old screen still for a beat before anything moved.
//
// Smoothness 2026-10-23 (Cath: no page may flicker): the contents fade in as they arrive
// instead of popping onto a page that slid in empty. With the phone set to remove
// animations they appear at once.
export default function DeferredContent({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const opacity = useRef(new Animated.Value(reduceMotionNow() ? 1 : 0)).current;
  useEffect(() => {
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, []);
  useEffect(() => {
    if (!ready || reduceMotionNow()) return;
    Animated.timing(opacity, { toValue: 1, duration: FADE_IN_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [ready, opacity]);
  return <Animated.View style={[styles.fill, { opacity }]}>{ready ? children : null}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
