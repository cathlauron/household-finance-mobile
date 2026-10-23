import React, { createContext, useCallback, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { makeMutable } from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import { commitTabDrag, edgeGive, releaseTabDrag, setTabDrag } from './tabDrag';
import { settleTarget } from '../subPages';
import { hapticSelection } from '../haptics';

// Version 2.1 (Cath): swipe the page sideways to move between tabs (Home / Transactions /
// To-Pay / Plan, and inside pages like Bills / Debts / Loans). Tapping the tabs still works.
//
// Things that swipe sideways by themselves (the Left to Spend card pages, the wallet card
// stack, swipe-to-delete rows) keep their swipe: they spread `holdTabSwipe` on their outer
// view, and a page swipe gives way for any touch that starts on them.

// Version 2.2 (Cath: swipe-to-delete opened when she meant to change screens): a quick
// flick across a swipe-to-delete row still changes the tab. Rows ask the nearest swipe
// area through this.
export const SwipeTabsContext = createContext<((direction: 1 | -1) => void) | null>(null);

let held = false;
// The same "a row or card has this touch" flag, readable on the animation thread (the
// sliding sub-pages check it there).
export const heldOnUI = makeMutable(false);
export const holdTabSwipe = {
  onTouchStart: () => {
    held = true;
    heldOnUI.value = true;
  },
  onTouchEnd: () => {
    held = false;
    heldOnUI.value = false;
  },
  onTouchCancel: () => {
    held = false;
    heldOnUI.value = false;
  },
};

// Smoothness 2026-10-23 (Cath picked "follows your finger"): sliding sub-pages (Bills /
// Debts / Loans and others, components/SlidingPages.tsx) handle their own sideways swipe,
// so the page-wide swipe that changes the main tab stands aside for touches that start on
// them. Past the last sub-page they bounce instead of changing tab (Cath's choice).
let subHeld = false;
export const holdForSubPages = {
  onTouchStart: () => {
    subHeld = true;
  },
  onTouchEnd: () => {
    subHeld = false;
  },
  onTouchCancel: () => {
    subHeld = false;
  },
};

const START = 24; // pixels sideways before it counts as a swipe
const DISTANCE = 70; // how far to swipe to change tab (or a quick flick)
const FLICK = 600;
// A swipe area inside another (Bills/Debts/Loans inside the To-Pay tab): the inner one wins,
// and the outer one stands down if the inner one just acted.
let lastSwipeAt = 0;

// How far the finger has moved past the first few points it takes to start a swipe (so
// the page starts moving from where it is, never backwards).
function pastStart(t: number): number {
  return Math.sign(t) * Math.max(0, Math.abs(t) - START);
}

// direction: +1 = to the next tab (finger moves left), -1 = to the previous tab.
// Smoothness 2026-10-23 (Cath: the bottom tabs follow your finger too): `follow` = the main
// tab pages. While you swipe they move with your finger (tabDrag.ts); let go past a
// quarter of the screen, or flick, and the tab changes; otherwise they glide back. Past
// Home or Plan they give a little and bounce back.
export function SwipeTabs({
  onSwipe,
  children,
  enabled = true,
  inner = false,
  follow,
}: {
  onSwipe: (direction: 1 | -1) => void;
  children: React.ReactNode;
  enabled?: boolean;
  inner?: boolean;
  follow?: { index: number; count: number };
}) {
  const followIndex = follow ? follow.index : -1;
  const followCount = follow ? follow.count : 0;
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(followIndex >= 0 ? 'tab-swipe' : 'swipe-tabs')
        .runOnJS(true)
        .enabled(enabled)
        .activeOffsetX([-START, START])
        .failOffsetY([-14, 14])
        .onTouchesDown((_e, manager) => {
          // Touch started on something that swipes by itself: let it have the swipe.
          // (Its onTouchStart runs first, so `held` is already set.)
          setTimeout(() => {
            if (held || subHeld) manager.fail();
          }, 0);
        })
        .onUpdate((e) => {
          if (followIndex < 0 || held || subHeld) return;
          const dx = pastStart(e.translationX);
          setTabDrag(edgeGive(dx, followIndex, followCount));
        })
        .onFinalize((_e, success) => {
          if (followIndex >= 0 && !success) releaseTabDrag();
        })
        .onEnd((e) => {
          if (held || subHeld) {
            if (followIndex >= 0) releaseTabDrag();
            return;
          }
          if (followIndex >= 0) {
            const dx = pastStart(e.translationX);
            const target = settleTarget(followIndex, dx, e.velocityX, Dimensions.get('window').width, followCount);
            if (target === followIndex || Math.abs(e.translationY) > Math.abs(e.translationX)) {
              releaseTabDrag();
              return;
            }
            lastSwipeAt = Date.now();
            hapticSelection();
            commitTabDrag();
            onSwipeRef.current(target > followIndex ? 1 : -1);
            return;
          }
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
    [enabled, inner, followIndex, followCount]
  );
  const flick = useCallback((dir: 1 | -1) => {
    if (Date.now() - lastSwipeAt < 300) return;
    lastSwipeAt = Date.now();
    hapticSelection();
    onSwipeRef.current(dir);
  }, []);
  return (
    <SwipeTabsContext.Provider value={enabled ? flick : null}>
      <GestureDetector gesture={gesture}>{children}</GestureDetector>
    </SwipeTabsContext.Provider>
  );
}
