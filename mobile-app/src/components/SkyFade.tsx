import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import SkyGlow from './SkyGlow';
import type { SkyPhase } from '../sky';
import { CURVE, PAGE_OPEN_MS } from '../motion';
import { useReduceMotion } from '../reduceMotion';

// Home's sky set to a chosen time of day, fading softly from one time to the next
// (welcome O3a and set-up, Cath 2026-10-31). With Reduce Motion it changes in place.

const PHASES: SkyPhase[] = ['morning', 'afternoon', 'evening', 'night'];

export default function SkyFade({ phase }: { phase: SkyPhase }) {
  return (
    <>
      {PHASES.map((p) => (
        <Layer key={p} phase={p} on={p === phase} />
      ))}
    </>
  );
}

function Layer({ phase, on }: { phase: SkyPhase; on: boolean }) {
  const o = useRef(new Animated.Value(on ? 1 : 0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return o.setValue(on ? 1 : 0);
    const a = Animated.timing(o, { toValue: on ? 1 : 0, duration: PAGE_OPEN_MS * 3, easing: Easing.bezier(...CURVE), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [on, o, reduce]);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: o }]}>
      <SkyGlow phase={phase} />
    </Animated.View>
  );
}
