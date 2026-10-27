import { Easing, makeMutable, withTiming } from 'react-native-reanimated';
import { CURVE, TAB_MS } from '../motion';

// The main tabs, left to right.
export const TAB_ORDER = ['Home', 'Transactions', 'To-Pay', 'Plan'];

// Smoothness 2026-10-23 (Cath: the bottom tabs follow your finger too, like Bills / Debts /
// Loans): while you swipe across a tab page, the page you're on and the one beside it move
// with your finger by this many points. TabPage adds it to their position.
//
// When you let go far enough, the tab changes: the swipe's distance is handed to the
// pages (`committed`), which carry on from exactly where your finger left them, and the
// drag goes back to 0 in the same moment, so nothing jumps.
//
// Smoothness sweep 2026-10-26: the drag lives on the phone's animation thread (a Reanimated
// shared value) and the swipe moves it there directly. Before, every finger movement went
// through the app's JavaScript side first, so when the app was busy (saving, syncing,
// building a page) the pages fell behind the finger.
export const tabDrag = makeMutable(0);
// "Remove animations" as the animation thread sees it (kept up to date by SwipeTabs).
export const reduceMotionOnUI = makeMutable(false);
const EASE = Easing.bezier(...CURVE);
let committed = 0;

export function setTabDrag(px: number) {
  'worklet';
  tabDrag.value = px;
}

// Let go without changing tab: glide back.
export function releaseTabDrag() {
  'worklet';
  tabDrag.value = reduceMotionOnUI.value ? 0 : withTiming(0, { duration: TAB_MS, easing: EASE });
}

// Let go and the tab is changing: remember how far the finger had moved (in points, after
// the start slack and the edge give).
export function commitTabDrag(px: number) {
  committed = px;
}

// For the pages taking over: how far they had been dragged (in points). Read by both the
// page leaving and the page arriving, in the same moment; then cleared. The drag goes to
// 0 in the same batch as the pages' new positions, so the screen never jumps.
export function takeCommittedDrag(): number {
  const d = committed;
  if (d !== 0) {
    tabDrag.value = 0;
    setTimeout(() => {
      committed = 0;
    }, 0);
  }
  return d;
}

// Past the first or last tab it only gives a third as much (then glides back).
export function edgeGive(dx: number, index: number, count: number): number {
  'worklet';
  if ((index <= 0 && dx > 0) || (index >= count - 1 && dx < 0)) return dx / 3;
  return dx;
}
