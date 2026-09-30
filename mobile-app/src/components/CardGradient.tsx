import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

export default function CardGradient({ start, end }: { start: string; end: string }) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      {size.w > 0 && size.h > 0 && (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id="leftCardTeal" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={start} />
              <Stop offset="1" stopColor={end} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#leftCardTeal)" />
        </Svg>
      )}
    </View>
  );
}