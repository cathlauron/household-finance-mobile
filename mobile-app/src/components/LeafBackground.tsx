import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../ThemeContext';

// Leaf shapes copied from assets/eco_house_logo.svg (the logo's own leaves).
// The left leaf was an open curve in the logo; a closing "Z" makes it fillable.
export const RIGHT_LEAF = 'M 512 656 C 512 588, 578 508, 597 490 C 609 552, 584 636, 512 680 Z';
export const LEFT_LEAF =  'M 502 668 C 453 664, 432 592, 428 548 C 442 544, 486 566, 505 658 Z';

// Crops the 1024x1024 logo canvas down to just the leaf area.
export const LEAF_VIEWBOX = '420 480 200 210';

type LeafProps = {
  d: string;
  size: number;
  rotate: string;
  color: string;
  opacity: number;
  position: { top?: number; bottom?: number; left?: number; right?: number };
};

function Leaf({ d, size, rotate, color, opacity, position }: LeafProps) {
  return (
    <View style={[styles.leaf, position, { transform: [{ rotate }] }]}>
      <Svg width={size} height={size * 1.05} viewBox={LEAF_VIEWBOX}>
        <Path d={d} fill={color} fillOpacity={opacity} />
      </Svg>
    </View>
  );
}

// Faint decorative background. Sits behind everything, ignores touches.
export default function LeafBackground() {
  const { colors } = useTheme();
  const c = colors.gold;
  const o = 0.07;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Leaf d={RIGHT_LEAF} size={200} rotate="20deg" color={c} opacity={o} position={{ top: 40, right: -50 }} />
      <Leaf d={LEFT_LEAF} size={150} rotate="-25deg" color={c} opacity={o} position={{ top: 330, right: -45 }} />
      <Leaf d={RIGHT_LEAF} size={170} rotate="-15deg" color={c} opacity={o} position={{ bottom: 190, left: -55 }} />
      <Leaf d={LEFT_LEAF} size={210} rotate="30deg" color={c} opacity={o} position={{ bottom: -30, left: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  leaf: { position: 'absolute' },
});
