import React, { useEffect, useRef, useState } from 'react';
import { Easing, TextProps } from 'react-native';
import { Text } from './AppText';
import { useReduceMotion } from '../reduceMotion';
import { usePageActive } from '../pageActive';
import { COUNT_MS, CURVE } from '../motion';
import { countFrame, shouldCount } from '../countUp';

// Smoothness 2026-10-23 (Cath: "quick count to the new number"): a money number that
// counts to its new value when it changes while you're looking (about half a second,
// the app's usual curve). It shows the new value at once when the phone is set to remove
// animations, when its page or tab isn't showing, and while amounts are hidden.
//
// Why this redraws text a few dozen times instead of using the animation thread: the
// big numbers shrink to fit their space (adjustsFontSizeToFit), which only plain text can
// do. Only this one label redraws, nothing around it, and only for COUNT_MS.

type Props = TextProps & {
  value: number;
  format: (n: number) => string;
  // Amounts hidden (the eye button): no counting, the mask shows.
  masked?: boolean;
};

export default function CountingText({ value, format, masked, accessibilityLabel, ...rest }: Props) {
  const reduce = useReduceMotion();
  const showing = usePageActive();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = shownRef.current;
    const stop = () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
    stop();
    if (!shouldCount(from, value, { reduce, showing, masked: !!masked })) {
      shownRef.current = value;
      setShown(value);
      return stop;
    }
    const ease = Easing.bezier(...CURVE);
    const start = Date.now();
    const tick = () => {
      const t = (Date.now() - start) / COUNT_MS;
      const v = countFrame(from, value, t, ease);
      shownRef.current = v;
      setShown(v);
      frame.current = t < 1 ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
    return stop;
  }, [value, reduce, showing, masked]);

  return (
    <Text {...rest} accessibilityLabel={accessibilityLabel ?? (masked ? undefined : format(value))}>
      {format(shown)}
    </Text>
  );
}
