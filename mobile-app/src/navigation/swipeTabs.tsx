import React, { useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { hapticSelection } from '../haptics';

// Version 2.1 (Cath): swipe the page sideways to move between tabs (Home / Transactions /
// To-Pay / Plan, and inside pages like Bills / Debts / Loans). Tapping the tabs still works.
//
// Things that swipe sideways by themselves (the Left to Spend card pages, the wallet card
// stack, swipe-to-delete rows) keep their swipe: they spread `holdTabSwipe` on their outer
// view, and a page swipe gives way for any touch that starts on them.

let held = false;
export const holdTabSwipe = {
  onTouchStart: () => {
    held = true;
  },
  onTouchEnd: () => {
    held = false;
  },
  onTouchCancel: () => {
    held = false;
  },
};

const START = 24; // pixels sideways before it counts as a swipe
const DISTANCE = 70; // how far to swipe to change tab (or a quick flick)
const FLICK = 600;
// A swipe area inside another (Bills/Debts/Loans inside the To-Pay tab): the inner one wins,
// and the outer one stands down if the inner one just acted.
let lastSwipeAt = 0;

// direction: +1 = to the next tab (finger moves left), -1 = to the previous tab.
export function SwipeTabs({ onSwipe, children, enabled = true, inner = false }: { onSwipe: (direction: 1 | -1) => void; children: React.ReactNode; enabled?: boolean; inner?: boolean }) {
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .enabled(enabled)
        .activeOffsetX([-START, START])
        .failOffsetY([-14, 14])
        .onTouchesDown((_e, manager) => {
          // Touch started on something that swipes by itself: let it have the swipe.
          // (Its onTouchStart runs first, so `held` is already set.)
          setTimeout(() => {
            if (held) manager.fail();
          }, 0);
        })
        .onEnd((e) => {
          if (held) return;
          const dx = e.translationX;
          if (Math.abs(dx) < DISTANCE && Math.abs(e.velocityX) < FLICK) return;
          if (Math.abs(e.translationY) > Math.abs(dx)) return;
          const dir: 1 | -1 = dx < 0 ? 1 : -1;
          setTimeout(
            () => {
              if (Date.now() - lastSwipeAt < 300) return;
              lastSwipeAt = Date.now();
              hapticSelection();
              onSwipeRef.current(dir);
            },
            inner ? 0 : 60
          );
        }),
    [enabled, inner]
  );
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
