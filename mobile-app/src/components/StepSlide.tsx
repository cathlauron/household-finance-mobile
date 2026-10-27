import React, { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, PAGE_BACK_MS, PAGE_OPEN_MS } from '../motion';

// Smoothness 2026-10-23 (Cath: the set-up steps slide like opening a page): steps in a
// flow (Continue / Back). Going on, the next step slides in from the right while the old
// one slides out to the left, side by side (they never overlap); going back is the mirror.
// Same speeds and curve as opening a page. With the phone set to remove animations the
// step simply changes.
//
// `order` is the step's place in the flow (a higher number = further on), which decides
// the direction.

type Shown = { key: string; order: number; node: React.ReactNode };

export default function StepSlide({ stepKey, order, children }: { stepKey: string; order: number; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const current = useRef<Shown>({ key: stepKey, order, node: children });
  const leaving = useRef<(Shown & { dir: 1 | -1 }) | null>(null);
  const progress = useRef(new Animated.Value(1)).current;
  const pending = useRef(false);
  const [, redraw] = useState(0);

  if (current.current.key !== stepKey) {
    progress.stopAnimation();
    if (reduceMotionNow()) {
      leaving.current = null;
    } else {
      leaving.current = { ...current.current, dir: order > current.current.order ? 1 : -1 };
      progress.setValue(0);
      pending.current = true;
    }
  }
  current.current = { key: stepKey, order, node: children };

  useLayoutEffect(() => {
    if (!pending.current || !leaving.current) return;
    pending.current = false;
    const forward = leaving.current.dir === 1;
    const goingAway = leaving.current;
    Animated.timing(progress, {
      toValue: 1,
      duration: forward ? PAGE_OPEN_MS : PAGE_BACK_MS,
      easing: Easing.bezier(...CURVE),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || leaving.current !== goingAway) return;
      leaving.current = null;
      redraw((n) => n + 1);
    });
  }, [stepKey, progress]);

  const out = leaving.current;
  const dir = out?.dir ?? 1;
  const inX = out ? progress.interpolate({ inputRange: [0, 1], outputRange: [dir * width, 0] }) : 0;
  const outX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * width] });
  return (
    <View style={styles.wrap}>
      {out && (
        <Animated.View key={out.key} pointerEvents="none" style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: outX }] }]}>
          {out.node}
        </Animated.View>
      )}
      <Animated.View key={stepKey} style={[styles.fill, { transform: [{ translateX: inX }] }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
});
