import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  TextInput,
} from 'react-native';

// A ScrollView that keeps what you're typing above the keyboard.
//
// The app draws edge to edge, so on Android the screen no longer shrinks when the
// keyboard opens: anything near the bottom ends up behind it. This works it out itself:
// - where the keyboard's top edge is (from its position on screen, not only its reported
//   height, which on some phones leaves out the navigation bar);
// - how much of THIS scroll area the keyboard covers (0 if something else, like a sheet
//   that lifts itself, already moved it clear), and adds that much space at the bottom;
// - then scrolls the field being typed in up above the keyboard. Tapping another field
//   while the keyboard is open does the same.

const MARGIN = 24; // gap kept between the field and the keyboard

function keyboardTopFrom(e: KeyboardEvent): number {
  const screenH = Dimensions.get('screen').height;
  const { screenY, height } = e.endCoordinates;
  const fromY = typeof screenY === 'number' && screenY > 0 ? screenY : screenH;
  return Math.min(fromY, screenH - height);
}

export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(function KeyboardAwareScrollView(
  { contentContainerStyle, onScroll, onTouchEnd, scrollEventThrottle, ...rest },
  ref
) {
  const inner = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => inner.current as ScrollView);
  const [extra, setExtra] = useState(0);
  const offsetY = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const scrollFocusedIntoView = useCallback(() => {
    const top = keyboardTop.current;
    const input: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (top == null || !input || typeof input.measureInWindow !== 'function' || !inner.current) return;
    input.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      const limit = top - MARGIN;
      if (y + h > limit) {
        inner.current?.scrollTo({ y: Math.max(0, offsetY.current + (y + h - limit)), animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      const top = keyboardTopFrom(e);
      keyboardTop.current = top;
      const node: any = inner.current;
      if (node && typeof node.measureInWindow === 'function') {
        node.measureInWindow((_x: number, y: number, _w: number, h: number) => {
          setExtra(Math.max(0, Math.round(y + h - top)));
          // Give the new space a moment to lay out before scrolling to the field.
          setTimeout(scrollFocusedIntoView, Platform.OS === 'ios' ? 280 : 80);
        });
      } else {
        setTimeout(scrollFocusedIntoView, 80);
      }
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setExtra(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollFocusedIntoView]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll]
  );

  const handleTouchEnd = useCallback(
    (e: any) => {
      // Tapped another field while the keyboard is already open.
      if (keyboardTop.current != null) setTimeout(scrollFocusedIntoView, 250);
      onTouchEnd?.(e);
    },
    [onTouchEnd, scrollFocusedIntoView]
  );

  const base = StyleSheet.flatten(contentContainerStyle) || {};
  const basePad = typeof base.paddingBottom === 'number' ? base.paddingBottom : typeof base.padding === 'number' ? base.padding : 0;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      {...rest}
      ref={inner}
      onScroll={handleScroll}
      scrollEventThrottle={scrollEventThrottle ?? 16}
      onTouchEnd={handleTouchEnd}
      contentContainerStyle={extra > 0 ? [contentContainerStyle, { paddingBottom: basePad + extra }] : contentContainerStyle}
    />
  );
});

export default KeyboardAwareScrollView;
