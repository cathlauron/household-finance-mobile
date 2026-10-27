import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, CURVE_OUT, DIP_MS, FADE_IN_MS, curvedRange } from '../motion';
import { swapPlan } from '../screenSwap';

// Smoothness 2026-10-23 (Cath: no blink between screens; old fades out, new fades in,
// never both at once; locking is instant): changing between whole screens (welcome,
// set-up, sign-in, unlock, Home). See src/screenSwap.ts for which changes are instant.
type Slot = { key: string; node: React.ReactNode } | null;
export default function ScreenSwap({ screenKey, children }: { screenKey: string; children: React.ReactNode }) {
  // Two fixed places that take turns: the new screen is built in the free one, invisible,
  // while the old one stays exactly where it is (so it never restarts). Then ONE animation
  // runs the whole dip: the old one fades out, then the new one fades in. It's one
  // animation (not two in a row) so nothing can squeeze in between the halves and hold the
  // screen empty (the frame recorder showed a 130-150 ms empty pause with two).
  const front = useRef<'A' | 'B'>('A');
  const slots = useRef<{ A: Slot; B: Slot }>({ A: { key: screenKey, node: children }, B: null });
  // The dip in progress: 0 = old fully showing, 1 = new fully showing.
  const dip = useRef<{ value: Animated.Value; from: 'A' | 'B' } | null>(null);
  const pendingFade = useRef(false);
  const [, redraw] = useState(0);

  const cur = slots.current[front.current];
  if (cur && cur.key !== screenKey) {
    const plan = swapPlan(cur.key, screenKey, reduceMotionNow());
    const next = front.current === 'A' ? 'B' : 'A';
    dip.current?.value.stopAnimation();
    if (plan === 'fade') {
      // A change while a dip is still running starts a new dip from the screen in front.
      if (slots.current[next]) slots.current[next] = null;
      dip.current = { value: new Animated.Value(0), from: front.current };
      pendingFade.current = true;
    } else {
      // Instant (locking, leaving the money screens): the old one goes at once.
      slots.current[front.current] = null;
      slots.current[next] = null;
      dip.current = null;
      pendingFade.current = false;
    }
    front.current = next;
  }
  // The screen in front always shows its newest content.
  slots.current[front.current] = { key: screenKey, node: children };

  useLayoutEffect(() => {
    if (!pendingFade.current || !dip.current) return;
    pendingFade.current = false;
    const d = dip.current;
    // 2026-10-26 (Cath's recording: a second copy of the app stayed underneath, on Home):
    // the old screen is removed when the dip is over, by the clock as well as by the
    // animation. On her phone the animation never reported back, so the old one stayed.
    const finish = () => {
      if (dip.current !== d) return;
      dip.current = null;
      slots.current[d.from] = null;
      redraw((n) => n + 1);
    };
    Animated.timing(d.value, { toValue: 1, duration: DIP_MS + FADE_IN_MS, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
      if (finished) finish();
    });
    const t = setTimeout(() => {
      d.value.setValue(1);
      finish();
    }, DIP_MS + FADE_IN_MS + 120);
    return () => clearTimeout(t);
  }, [screenKey]);

  const SPLIT = DIP_MS / (DIP_MS + FADE_IN_MS);
  // 2026-10-26: the curves are written out as points (curvedRange): the phone's native
  // animation engine refuses an `easing` inside interpolate (red error on Cath's phone).
  const opacityOf = (name: 'A' | 'B') => {
    const d = dip.current;
    if (!d) return 1;
    return name === d.from
      ? d.value.interpolate({ ...curvedRange(0, SPLIT, 1, 0, CURVE_OUT), extrapolate: 'clamp' })
      : d.value.interpolate({ ...curvedRange(SPLIT, 1, 0, 1, CURVE), extrapolate: 'clamp' });
  };
  const place = (name: 'A' | 'B') => {
    const slot = slots.current[name];
    if (!slot) return null;
    const isFront = front.current === name;
    const other = name === 'A' ? 'B' : 'A';
    return (
      <Animated.View
        key={name}
        style={[StyleSheet.absoluteFillObject, { opacity: opacityOf(name), zIndex: isFront ? 1 : 2 }]}
        // Only the screen in front takes touches, and only once the old one has gone.
        pointerEvents={isFront && !slots.current[other] ? 'auto' : 'none'}
      >
        <React.Fragment key={slot.key}>{slot.node}</React.Fragment>
      </Animated.View>
    );
  };
  return (
    <View style={{ flex: 1 }}>
      {place('A')}
      {place('B')}
    </View>
  );
}
