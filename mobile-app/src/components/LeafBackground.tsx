import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, AccessibilityInfo, AppState } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import { useTheme } from '../ThemeContext';
import { useMood } from '../mood';
import { useData } from '../DataContext';
import FallingLeaves from './FallingLeaves';
import { LEAF_OUTLINE, LEAF_STEM, LEAF_VEINS } from './leafShape';

// Redesign: the faint leaf field behind every screen, from the Finance Flow mockups.
// Same leaf shape as the opening screen (pointed oval with a stem), with a centre vein
// and four side veins cut out in the page colour. The leaves take the mood colour:
// green normally, burnt orange when Running low, red when Overspent.
// The layout is the mockup's 750 x 1120 field, drawn for a 390-wide phone and scaled.

// Falling leaves: when Settings › Appearance › Falling leaves is on (the default) and
// the phone's Reduce Motion is off, the leaves fall and sway (src/components/
// FallingLeaves.tsx) instead of this still field. They stop while the app is in the
// background.


// [x, y, rotation in degrees, scale] for each leaf in the mockup field.
const FIELD: [number, number, number, number][] = [
  [575.7, 914.2, 38.4, 0.972],
  [-15.9, 518.7, 23.8, 1.068],
  [411.3, 648.7, -45.3, 1.260],
  [621.6, 126.5, -59.7, 0.830],
  [775.4, 1006.9, 73.8, 0.540],
  [208.0, 393.4, -56.7, 0.810],
  [210.1, 683.7, 28.5, 0.480],
  [217.3, 942.2, -29.5, 0.590],
  [-21.0, 859.8, -77.1, 0.571],
  [-1.2, 177.1, -48.6, 0.306],
  [722.0, 368.0, 7.2, 0.469],
  [222.9, 173.0, -56.2, 0.570],
  [779.0, 600.2, -42.0, 0.470],
  [645.8, 506.8, -71.1, 0.690],
  [667.4, 1131.2, -1.9, 0.850],
  [357.6, 309.2, -56.6, 0.740],
  [261.6, 805.4, -2.3, 0.750],
  [533.4, 312.6, 24.0, 0.517],
  [512.4, 465.0, 44.0, 0.462],
  [120.5, 2.8, -19.2, 0.520],
  [270.3, 3.3, -64.8, 0.530],
  [701.6, -38.9, 10.5, 0.590],
  [201.9, 1126.9, 73.8, 0.540],
  [360.0, 1054.1, -17.3, 0.700],
  [123.1, 315.7, -69.4, 0.204],
  [788.6, 801.5, 54.7, 0.320],
  [496.0, 1102.7, -58.5, 0.143],
  [-3.8, 89.9, -68.5, 0.270],
  [85.4, 717.6, 65.7, 0.280],
  [171.0, 860.7, -58.6, 0.260],
  [552.0, 746.0, 26.9, 0.210],
  [649.8, 737.5, -10.7, 0.136],
  [95.6, 248.6, 70.5, 0.190],
  [19.1, 1038.6, 69.7, 0.190],
  [9.9, 266.5, -31.0, 0.240],
  [-8.8, 1125.9, 1.4, 0.190],
  [401.0, 61.2, -62.7, 0.240],
  [724.7, 677.9, -45.7, 0.177],
  [584.4, 627.3, 24.7, 0.150],
  [422.5, -7.0, -59.2, 0.290],
  [400.2, 165.4, -8.6, 0.129],
  [127.0, 634.9, 40.2, 0.220],
  [252.0, 257.9, 54.4, 0.143],
  [100.7, 78.5, 64.0, 0.129],
  [277.8, 531.3, -16.1, 0.150],
  [762.2, 184.7, -61.5, 0.260],
  [460.9, 180.7, 15.1, 0.260],
  [729.2, 234.9, 54.5, 0.184],
  [201.2, 558.5, 46.2, 0.156],
  [157.4, 759.4, -36.6, 0.240],
  [595.7, 393.3, -39.9, 0.180],
  [442.8, 1119.0, 11.0, 0.250],
  [412.6, 837.7, -3.0, 0.220],
  [207.1, 500.0, 68.0, 0.122]
];

const MOOD_LEAF = {
  good: { light: ['#2E6B47', 0.045], dark: ['#5FC48A', 0.04] },
  low: { light: ['#D4500A', 0.055], dark: ['#F59055', 0.045] },
  over: { light: ['#C42B32', 0.05], dark: ['#F26B6B', 0.04] },
} as const;

export default function LeafBackground() {
  const { colors, isDark } = useTheme();
  const mood = useMood();
  const { model } = useData();
  const { width, height } = useWindowDimensions();
  const fallingOn = model?.settings?.fallingLeavesEnabled !== false;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const appSub = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => {
      motionSub.remove();
      appSub.remove();
    };
  }, []);

  const [leaf, opacity] = MOOD_LEAF[mood][isDark ? 'dark' : 'light'];
  const scale = width / 390;
  const leaves = useMemo(
    () =>
      FIELD.filter(([, y]) => y * scale < height + 120).map(([x, y, r, s], i) => (
        <G key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s}) translate(-50 -103)`}>
          <Path d={LEAF_STEM} fill="none" stroke={leaf} strokeOpacity={opacity} strokeWidth={3.22} strokeLinecap="round" />
          <Path d={LEAF_OUTLINE} fill={leaf} fillOpacity={opacity} />
          <Path d={LEAF_VEINS} fill="none" stroke={colors.navy2} strokeWidth={2.3} strokeLinecap="round" />
        </G>
      )),
    [leaf, opacity, colors.navy2, scale, height]
  );
  const falling = fallingOn && !reduceMotion;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
        <Rect x="0" y="0" width={width} height={height} fill={colors.navy2} />
        {!falling && <G transform={`scale(${scale})`}>{leaves}</G>}
      </Svg>
      {falling && appActive && <FallingLeaves color={leaf} opacity={opacity} veinColor={colors.navy2} />}
    </View>
  );
}
