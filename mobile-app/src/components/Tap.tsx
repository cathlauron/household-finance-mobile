// Version 2.2 (approved P1, Emil Kowalski's "buttons must feel responsive"): one press feel
// for everything you can tap. It is React Native's own TouchableOpacity (same props and
// behaviour), plus a tiny squeeze while your finger is down:
//  - it shrinks to 98% while pressed and the fade is the same everywhere (85%);
//  - activeOpacity={1} still means "no press feedback at all";
//  - nothing squeezes when the phone is set to remove animations, or when disabled.
//
// 2.2 speed fix (Cath's screen recording, Oct 21): the first version gave every tappable
// item its own little animation engine, and all of them re-wired themselves on every
// redraw (hundreds after each save), which made saving and closing forms slow. Now an
// item only changes while your finger is actually on it; the rest of the time it is the
// plain, fast TouchableOpacity. The fade is still animated by TouchableOpacity itself.
// Every screen imports TouchableOpacity from here instead of from 'react-native'.
import React, { forwardRef, useState } from 'react';
import { StyleSheet, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import type { GestureResponderEvent, TouchableOpacityProps, View } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';

const PRESSED_OPACITY = 0.85;

export type { TouchableOpacityProps };

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps>(function Tap(props, ref) {
  const { style, onPressIn, onPressOut, activeOpacity, disabled, ...rest } = props;
  const [down, setDown] = useState(false);
  const noFeedback = activeOpacity === 1;

  const handleIn = (e: GestureResponderEvent) => {
    if (!noFeedback && !disabled && !reduceMotionNow()) setDown(true);
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    setDown(false);
    onPressOut?.(e);
  };

  // While pressed only: keep any move or turn the button already has, and add the squeeze.
  let pressedStyle: any = style;
  if (down) {
    const own = (StyleSheet.flatten(style) as any)?.transform;
    pressedStyle = [style, { transform: [...(Array.isArray(own) ? own : []), { scale: 0.98 }] }];
  }

  return (
    <RNTouchableOpacity
      ref={ref}
      {...rest}
      disabled={disabled}
      activeOpacity={noFeedback ? 1 : PRESSED_OPACITY}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={pressedStyle}
    />
  );
});

export default TouchableOpacity;
