import { Animated, Easing } from 'react-native';
import { reduceMotionNow } from '../reduceMotion';
import { CURVE, TAB_MS } from '../motion';

// Smoothness 2026-10-23 (Cath: the bottom tabs follow your finger too, like Bills / Debts /
// Loans): while you swipe across a tab page, the page you're on and the one beside it move
// with your finger by this many points. TabPage adds it to their position.
//
// When you let go far enough, the tab changes: the swipe's distance is handed to the
// pages (`committed`), which carry on from exactly where your finger left them, and the
// drag goes back to 0 in the same moment, so nothing jumps.
export const tabDrag = new Animated.Value(0);
let current = 0;
let committed = 0;

export function setTabDrag(px: number) {
  current = px;
  tabDrag.setValue(px);
}

// Let go without changing tab: glide back.
export function releaseTabDrag() {
  current = 0;
  Animated.timing(tabDrag, {
    toValue: 0,
    duration: reduceMotionNow() ? 0 : TAB_MS,
    easing: Easing.bezier(...CURVE),
    useNativeDriver: true,
  }).start();
}

// Let go and the tab is changing: remember how far the finger had moved.
export function commitTabDrag() {
  committed = current;
  current = 0;
}

// For the pages taking over: how far they had been dragged (in points). Read by both the
// page leaving and the page arriving, in the same moment; then cleared.
export function takeCommittedDrag(): number {
  const d = committed;
  if (d !== 0) {
    tabDrag.setValue(0);
    setTimeout(() => {
      committed = 0;
    }, 0);
  }
  return d;
}

// Past the first or last tab it only gives a third as much (then glides back).
export function edgeGive(dx: number, index: number, count: number): number {
  if ((index <= 0 && dx > 0) || (index >= count - 1 && dx < 0)) return dx / 3;
  return dx;
}
