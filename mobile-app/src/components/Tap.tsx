// Version 2.2 (approved P1): one press feel for everything you can tap: the same fade
// everywhere (85%), instead of six different amounts. activeOpacity={1} still means "no
// press feedback at all".
//
// 2.2 speed fix #2 (Cath, Oct 21: taps didn't respond at once, typing lagged): the squeeze
// on every item is gone. Animating it made every redraw slow; switching it on and off made
// each tap redraw the whole item (a full row or card) twice before the app could react.
// This is now React Native's plain TouchableOpacity again, which fades on its own without
// redrawing anything. The squeeze stays only on the main buttons (Button.tsx), which are
// small. Every screen imports TouchableOpacity from here instead of from 'react-native'.
import React, { forwardRef } from 'react';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
import type { TouchableOpacityProps, View } from 'react-native';

const PRESSED_OPACITY = 0.85;

export type { TouchableOpacityProps };

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps>(function Tap(props, ref) {
  return <RNTouchableOpacity ref={ref} {...props} activeOpacity={props.activeOpacity === 1 ? 1 : PRESSED_OPACITY} />;
});

export default TouchableOpacity;
