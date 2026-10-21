import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing as RNEasing, StyleSheet, View } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming, SharedValue } from 'react-native-reanimated';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { hapticLight } from '../haptics';

// Version 2.1 (Cath picked round 7, option C, "Leaf tick"): after every Save / Add / Pay,
// a small card in the middle of the screen shows the logo's leaf drawing itself, then a
// word ("Added", "Saved", "Paid"), and fades away. Call showLeafTick('Added') from
// anywhere; <LeafTickHost /> is mounted once in App.

const EASE_OUT = RNEasing.bezier(0.23, 1, 0.32, 1);

type Listener = (label: string) => void;
let listener: Listener | null = null;

export function showLeafTick(label = 'Saved') {
  listener?.(label);
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The leaf from the logo: stem, right half, left half (same shapes and order as the opening).
const LEAF = [
  { d: 'M 512 748 V 656', len: 94, from: 0, to: 0.3 },
  { d: 'M 512 656 C 512 588, 578 508, 597 490 C 609 552, 584 636, 512 680 Z', len: 437, from: 0.2, to: 1 },
  { d: 'M 502 668 C 453 664, 432 592, 428 548 C 442 544, 486 566, 505 658', len: 297, from: 0.3, to: 1 },
];

function LeafStroke({ d, len, from, to, t, color }: { d: string; len: number; from: number; to: number; t: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => {
    const raw = Math.min(1, Math.max(0, (t.value - from) / (to - from)));
    const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    return { strokeDashoffset: len * (1 - k) };
  });
  return (
    <AnimatedPath d={d} stroke={color} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[len, len]} animatedProps={props} />
  );
}

export function LeafTickHost() {
  const { colors } = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const card = useRef(new RNAnimated.Value(0)).current;
  const word = useRef(new RNAnimated.Value(0)).current;
  const t = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (text) => {
      if (timer.current) clearTimeout(timer.current);
      setLabel(text);
      setRun((n) => n + 1);
      hapticLight();
      card.stopAnimation();
      word.setValue(0);
      t.value = 0;
      // Version 2.2 (approved P4): quicker, since it shows after every save. The leaf
      // draws in 0.32 s (was 0.48 s at one flat speed), the card pops in with a strong
      // ease-out, and the whole tick is gone a little sooner. With the phone set to remove
      // animations, the finished leaf simply appears and fades.
      if (reduceMotionNow()) {
        card.setValue(1);
        word.setValue(1);
        t.value = 1;
      } else {
        RNAnimated.timing(card, { toValue: 1, duration: 160, easing: EASE_OUT, useNativeDriver: true }).start();
        t.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
        RNAnimated.timing(word, { toValue: 1, duration: 160, delay: 220, easing: EASE_OUT, useNativeDriver: true }).start();
      }
      timer.current = setTimeout(() => {
        RNAnimated.timing(card, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
          if (finished) setLabel(null);
        });
      }, 900);
    };
    return () => {
      listener = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [card, word, t]);

  if (!label) return null;
  const scale = card.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={s.center}>
        <RNAnimated.View
          key={run}
          accessibilityLiveRegion="polite"
          accessibilityLabel={label}
          style={[s.card, { backgroundColor: colors.navy3 + 'A6', borderColor: colors.navy3 + 'CC', opacity: card, transform: [{ scale }] }]}
        >
          <Svg width={24} height={32} viewBox="395 455 240 320">
            {LEAF.map((p, i) => (
              <LeafStroke key={i} {...p} t={t} color={colors.gold} />
            ))}
          </Svg>
          <RNAnimated.Text style={[s.text, { color: colors.gold, opacity: word }]}>{label}</RNAnimated.Text>
        </RNAnimated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    minWidth: 84,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08, // Cath: see-through card (65% white), softer shadow
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
  },
  text: { fontSize: 15, fontWeight: '700' },
});
