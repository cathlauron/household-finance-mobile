// Version 2.2 (approved P1, Emil Kowalski's "buttons must feel responsive"): one press feel
// for everything you can tap. It is React Native's TouchableOpacity with the same props
// and behaviour, plus a tiny squeeze while your finger is down:
//  - everything shrinks to 98% (2.2 speed fix: no longer measures each item's width,
//    which slowed long lists down as they opened);
//  - the fade is the same everywhere (85%), instead of six different amounts;
//  - activeOpacity={1} still means "no press feedback at all" (kept for things that
//    animate on their own);
//  - nothing squeezes when the phone is set to remove animations, or when disabled.
// Every screen imports TouchableOpacity from here instead of from 'react-native'.
import React, { forwardRef, useRef } from 'react';
import { Animated, Easing, StyleSheet, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import type { GestureResponderEvent, TouchableOpacityProps, View } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';

const AnimatedTO = Animated.createAnimatedComponent(RNTouchableOpacity);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const PRESSED_OPACITY = 0.85;

export type { TouchableOpacityProps };

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps>(function Tap(props, ref) {
  const { style, onPressIn, onPressOut, activeOpacity, disabled, ...rest } = props;
  const scale = useRef(new Animated.Value(1)).current;
  const noFeedback = activeOpacity === 1;

  function to(value: number, duration: number) {
    Animated.timing(scale, { toValue: value, duration, easing: EASE_OUT, useNativeDriver: true }).start();
  }
  const handleIn = (e: GestureResponderEvent) => {
    if (!noFeedback && !disabled && !reduceMotionNow()) to(0.98, 110);
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    if (!noFeedback) to(1, 160);
    onPressOut?.(e);
  };

  // Keep any transform the caller set (a rotated or moved button) and add the squeeze.
  let animatedStyle: any = style;
  if (!noFeedback) {
    const flat = (StyleSheet.flatten(style) || {}) as any;
    const theirs = Array.isArray(flat.transform) ? flat.transform : [];
    animatedStyle = [style, { transform: [...theirs, { scale }] }];
  }

  return (
    <AnimatedTO
      ref={ref as any}
      {...rest}
      disabled={disabled}
      activeOpacity={noFeedback ? 1 : PRESSED_OPACITY}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={animatedStyle as any}
    />
  );
});

export default TouchableOpacity;
