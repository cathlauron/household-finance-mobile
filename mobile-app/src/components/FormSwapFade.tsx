import React, { useLayoutEffect } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, CURVE_OUT, DIP_MS, FADE_IN_MS } from '../motion';

// Smoothness 2026-10-23 (Cath: switches inside a form that change the form, Bill / Debt /
// Loan in the + form and I borrowed / I lent, glide their highlight while the fields below
// softly fade out and the new ones fade in): the fields sit in <FormSwapFade>, and the
// switch calls dipFormFields(channel, change). The fields fade out, the change happens at
// the bottom of the fade, and the new fields fade in as soon as they're on screen. Nothing
// is rebuilt (the amount box keeps its place and the keyboard stays up). With the phone
// set to remove animations the change simply happens.
//
// Channels: 'kind' = Bill / Debt / Loan, 'detail' = I borrowed / I lent.

export type FormChannel = 'kind' | 'detail';
const values: Record<FormChannel, Animated.Value> = { kind: new Animated.Value(1), detail: new Animated.Value(1) };
const waitingToShow: Record<FormChannel, boolean> = { kind: false, detail: false };
const SAFETY_MS = 600; // if the new fields never report in, they fade in anyway

// While a form switch is happening, the pop-up sheet glides to the new form's height
// instead of jumping (components/BottomSheet.tsx asks this).
let switchingUntil = 0;
export function formSwitching(): boolean {
  return Date.now() < switchingUntil;
}

function fadeIn(channel: FormChannel) {
  if (!waitingToShow[channel]) return;
  waitingToShow[channel] = false;
  Animated.timing(values[channel], { toValue: 1, duration: FADE_IN_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
}

export function dipFormFields(channel: FormChannel, change: () => void) {
  if (reduceMotionNow()) {
    change();
    return;
  }
  const v = values[channel];
  v.stopAnimation();
  Animated.timing(v, { toValue: 0, duration: DIP_MS, easing: Easing.bezier(...CURVE_OUT), useNativeDriver: true }).start(() => {
    waitingToShow[channel] = true;
    switchingUntil = Date.now() + SAFETY_MS;
    change();
    setTimeout(() => fadeIn(channel), SAFETY_MS);
  });
}

export default function FormSwapFade({
  channels,
  swapKey,
  children,
  style,
}: {
  channels: FormChannel[];
  // Changes when the form changes (e.g. 'bills', 'loans-lent'): the new fields are on
  // screen, so they fade in.
  swapKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  useLayoutEffect(() => {
    channels.forEach((c) => {
      if (waitingToShow[c]) fadeIn(c);
      // A form opened fresh always shows its fields (never left faded by an earlier switch).
      else values[c].setValue(1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey]);
  const opacity = channels.length === 2 ? Animated.multiply(values[channels[0]], values[channels[1]]) : values[channels[0]];
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
