import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { CURVE, SUN_ARC_MS } from '../motion';
import { reduceMotionNow } from '../reduceMotion';

// The sun on its arc (Cath, mockup O3a, 2026-10-31): the welcome's day and the set-up steps.
// A dotted arc; the sun (or moon) travels along it to the time of day, with its own look for
// each (sunrise, midday, low sun, sunset, moon). Tapping a dot jumps there.
// It moves on the native animation thread; with Reduce Motion it is simply in place.

export type SunLook = 'sunrise' | 'midday' | 'afternoon' | 'sunset' | 'moon';

const LOOKS: Record<SunLook, { fill: string; ink: string; d: string }> = {
  sunrise: { fill: '#F2A65A', ink: '#FFFFFF', d: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5.6 10.6l1.4 1.4M18.4 10.6l-1.4 1.4' },
  midday: { fill: '#F5B83D', ink: '#FFFFFF', d: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  afternoon: { fill: '#E8892E', ink: '#FFFFFF', d: 'M3 17h18M8 17a4 4 0 0 1 8 0M12 9v2M6.3 11.3l1.2 1.2M17.7 11.3l-1.2 1.2M6 21h12' },
  sunset: { fill: '#D9667A', ink: '#FFFFFF', d: 'M3 18h18M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5L12 9l2.5-2.5' },
  moon: { fill: '#DDE2F5', ink: '#1C2450', d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
};

type Props = {
  width: number;
  radius: number;
  sweep: number; // degrees either side of straight up
  at: number; // where the sun is, 0 (left end) to 1 (right end)
  look: SunLook;
  stops: { at: number; label: string; onPress?: () => void }[];
  current: number; // which stop is showing (its dot hides under the sun)
  orb?: number;
  children?: React.ReactNode; // drawn in the middle (the time, on the welcome)
};

export default function SunArc({ width, radius, sweep, at, look, stops, current, orb = 30, children }: Props) {
  const { colors } = useTheme();
  const cx = width / 2;
  const top = orb / 2 + 2;
  const cy = top + radius;
  const height = Math.ceil(cy - radius * Math.cos((sweep * Math.PI) / 180)) + 6;
  const angle = -sweep + at * 2 * sweep;
  const turn = useRef(new Animated.Value(angle)).current;

  useEffect(() => {
    if (reduceMotionNow()) {
      turn.setValue(angle);
      return;
    }
    const a = Animated.timing(turn, { toValue: angle, duration: SUN_ARC_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [angle, turn]);

  const point = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.sin(r), y: cy - radius * Math.cos(r) };
  };
  const a = point(-sweep);
  const b = point(sweep);
  const L = LOOKS[look];
  const rotate = turn.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] });
  const unrotate = turn.interpolate({ inputRange: [-180, 180], outputRange: ['180deg', '-180deg'] });

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={`M ${a.x} ${a.y} A ${radius} ${radius} 0 0 1 ${b.x} ${b.y}`} stroke={colors.navy4} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
      </Svg>
      {stops.map((st, i) => {
        const p = point(-sweep + st.at * 2 * sweep);
        return (
          <Pressable
            key={i}
            onPress={st.onPress}
            disabled={!st.onPress}
            accessibilityRole={st.onPress ? 'button' : undefined}
            accessibilityLabel={st.label}
            style={{ position: 'absolute', left: p.x - 22, top: p.y - 22, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i <= current ? colors.gold : colors.navy4, opacity: i === current ? 0 : 1 }} />
          </Pressable>
        );
      })}
      {children ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end' }]}>{children}</View> : null}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx, top: cy, width: 0, height: 0, transform: [{ rotate }] }}>
        <Animated.View
          style={{
            position: 'absolute',
            left: -orb / 2,
            top: -radius - orb / 2,
            width: orb,
            height: orb,
            borderRadius: orb / 2,
            backgroundColor: L.fill,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: L.fill,
            shadowOpacity: 0.7,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
            transform: [{ rotate: unrotate }],
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Svg width={orb * 0.58} height={orb * 0.58} viewBox="0 0 24 24">
            <Path d={L.d} stroke={L.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
