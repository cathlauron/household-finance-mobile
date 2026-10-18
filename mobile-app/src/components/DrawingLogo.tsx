import React, { useEffect, useRef, useState } from 'react';
import { View, Animated as RNAnimated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withRepeat, withTiming, SharedValue } from 'react-native-reanimated';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { LOGO_PATHS } from './LogoMark';

// Version 2.1 (Cath, round 5): while signing in or unlocking, the logo that's already on
// the screen draws itself like the opening (leaf, then roof, then walls), holds, fades and
// starts again. It runs on Reanimated's animation thread, so it keeps drawing while the
// password work keeps the app's main thread busy. When not busy it's the normal logo.

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The opening's strokes, in its drawing order: stem, right leaf, left leaf, roof halves,
// walls (with each one's length and start time in seconds).
const STROKES = [
  { d: 'M 512 748 V 656', len: 94, at: 0.06 },
  { d: 'M 512 656 C 512 588, 578 508, 597 490 C 609 552, 584 636, 512 680 Z', len: 437, at: 0.21 },
  { d: 'M 502 668 C 453 664, 432 592, 428 548 C 442 544, 486 566, 505 658', len: 297, at: 0.27 },
  { d: 'M 512 270 C 507 270, 504 273, 501 276 L 215 512', len: 386, at: 0.51 },
  { d: 'M 512 270 C 517 270, 520 273, 524 276 L 809 512', len: 386, at: 0.51 },
  { d: 'M 268 470 V 700 C 268 726, 286 746, 307 746 H 414', len: 406, at: 0.69 },
  { d: 'M 756 470 V 700 C 756 726, 738 746, 717 746 H 610', len: 406, at: 0.69 },
];
const CYCLE = 3.6; // seconds for one draw, hold and fade
const DRAW = 0.54;
const HOLD_UNTIL = 2.8;
const FADE = 0.5;

function Stroke({ d, len, at, t, color }: { d: string; len: number; at: number; t: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => {
    const s = t.value * CYCLE;
    const raw = Math.min(1, Math.max(0, (s - at) / DRAW));
    // ease in-out, like the opening
    const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
    const fade = s < HOLD_UNTIL ? 1 : Math.max(0, 1 - (s - HOLD_UNTIL) / FADE);
    return { strokeDashoffset: len * (1 - k), strokeOpacity: fade };
  });
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={22}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[len, len]}
      animatedProps={props}
    />
  );
}

export default function DrawingLogo({ width = 84, drawing, color, wordmark = true }: { width?: number; drawing: boolean; color?: string; wordmark?: boolean }) {
  const { colors } = useTheme();
  const stroke = color ?? colors.gold;
  const height = Math.round((width * 530) / 644);
  const t = useSharedValue(1);

  useEffect(() => {
    if (drawing) {
      t.value = 0;
      t.value = withRepeat(withTiming(1, { duration: CYCLE * 1000, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(t);
      t.value = 1; // fully drawn
    }
    return () => cancelAnimation(t);
  }, [drawing, t]);

  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityRole="image" accessibilityLabel="Finance Flow">
      <Svg width={width} height={height} viewBox="190 240 644 530" fill="none">
        {drawing
          ? STROKES.map((p, i) => <Stroke key={i} d={p.d} len={p.len} at={p.at} t={t} color={stroke} />)
          : LOGO_PATHS.map((d, i) => <Path key={i} d={d} stroke={stroke} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />)}
      </Svg>
      {wordmark && (
        <Text style={{ marginTop: Math.round(width * 0.16), fontSize: 13, fontWeight: '600', letterSpacing: 4, paddingLeft: 4, color: stroke }}>
          FINANCE FLOW
        </Text>
      )}
    </View>
  );
}

// The line under the title while working: changes every couple of seconds, in green.
export function BusyWords({ messages, style }: { messages: string[]; style?: any }) {
  const { colors } = useTheme();
  const fade = useRef(new RNAnimated.Value(1)).current;
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const timer = setInterval(() => {
      RNAnimated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setI((n) => (n + 1 < messages.length ? n + 1 : n));
        RNAnimated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(timer);
  }, [messages.length, fade]);
  return (
    <RNAnimated.Text
      accessibilityLiveRegion="polite"
      style={[{ fontSize: 16, fontWeight: '700', textAlign: 'center', color: colors.gold, opacity: fade }, style]}
    >
      {messages[i] || 'Working…'}
    </RNAnimated.Text>
  );
}
