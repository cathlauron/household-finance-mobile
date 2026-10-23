import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Reanimated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, SUBPAGE_MS } from '../motion';
import GradientFill from './GradientFill';

// Redesign: iPhone-style segmented control (a grey track with the chosen option on a
// raised white piece), as used in the Finance Flow mockups for Bills / Debts / Loans
// and similar switchers.
//
// Smoothness 2026-10-23 (Cath): the raised piece glides to the new choice instead of
// jumping. On pages with sliding sub-pages it follows the page as you swipe (`progress`,
// the page position from SlidingPages); everywhere else it glides on its own. With the
// phone set to remove animations it moves at once.

type Option<T extends string> = { id: T; label: string; testID?: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (id: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  // The sub-page position (0 = first, 0.5 = halfway to the second...). Leave out to glide by itself.
  progress?: SharedValue<number>;
};

const PAD = 3;
const GAP = 2;

export default function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel, style, progress }: Props<T>) {
  const { colors, isDark } = useTheme();
  const reduce = useReduceMotion();
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const own = useSharedValue(index);
  const [trackW, setTrackW] = useState(0);
  const segW = trackW > 0 ? (trackW - PAD * 2 - GAP * (options.length - 1)) / options.length : 0;

  useEffect(() => {
    if (progress) return;
    own.value = reduce ? index : withTiming(index, { duration: SUBPAGE_MS, easing: Easing.bezier(...CURVE) });
  }, [index, reduce, progress, own]);

  const pieceStyle = useAnimatedStyle(() => {
    const p = progress ? progress.value : own.value;
    const clamped = Math.max(0, Math.min(options.length - 1, p));
    return { width: segW, transform: [{ translateX: PAD + clamped * (segW + GAP) }] };
  }, [segW, options.length, progress]);

  const onColor = isDark ? '#636366' : colors.navy3;
  const pieceLook = [styles.segment, styles.segmentOn, { backgroundColor: onColor }];
  const gliding = segW > 0;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: isDark ? colors.navy1 : '#E3E3E8' }, style]}
    >
      {gliding && (
        <Reanimated.View pointerEvents="none" style={[styles.piece, pieceLook, pieceStyle]}>
          <GradientFill match={pieceLook} />
        </Reanimated.View>
      )}
      {options.map((opt) => {
        const on = opt.id === value;
        // Until the bar has been measured (its first moment on screen) the chosen option
        // carries the raised piece itself, as before.
        const look = [styles.segment, gliding && styles.above, on && !gliding && [styles.segmentOn, { backgroundColor: onColor }]];
        return (
          <TouchableOpacity
            key={opt.id}
            testID={opt.testID}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            activeOpacity={0.7}
            onPress={() => {
              if (!on) {
                hapticSelection();
                onChange(opt.id);
              }
            }}
            style={look}
          >
            {on && !gliding && <GradientFill match={look} />}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, { color: colors.ink, fontWeight: on ? '600' : '500' }]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: PAD, gap: GAP },
  segment: { flex: 1, minHeight: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segmentOn: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 15 },
  // The raised piece sits behind the labels and slides along the track.
  piece: { position: 'absolute', top: PAD, bottom: PAD, left: 0, flex: 0 },
  // Android draws raised things on top: the labels sit a step higher than the piece
  // (no shadow shows, as their background is clear).
  above: { zIndex: 1, elevation: 3 },
});
