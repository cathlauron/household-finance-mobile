import React from 'react';
import { Dimensions, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { SwipeTabs } from '../src/navigation/swipeTabs';
import { edgeGive, takeCommittedDrag } from '../src/navigation/tabDrag';

// Smoothness 2026-10-23 (Cath: the bottom tabs follow your finger too).
const W = Dimensions.get('window').width;

// 2026-10-26: the swipe runs on the animation thread; letting go hands the decision back
// to the app a moment later, so the checks wait a tick.
const tick = () => new Promise((r) => setTimeout(r, 0));
async function swipe(dx: number, vx = 0) {
  fireGestureHandler(getByGestureTestId('tab-swipe'), [
    { state: State.BEGAN, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX: dx / 2, translationY: 0 },
    { state: State.ACTIVE, translationX: dx, translationY: 0 },
    { state: State.END, translationX: dx, translationY: 0, velocityX: vx },
  ]);
  await tick();
}
function tabs(index: number) {
  const onSwipe = jest.fn();
  render(
    <SwipeTabs follow={{ index, count: 4 }} onSwipe={onSwipe}>
      <View />
    </SwipeTabs>
  );
  return onSwipe;
}

test('a long swipe left on Transactions goes on to To-Pay, from where the finger left it', async () => {
  const onSwipe = tabs(1);
  await swipe(-W * 0.6);
  expect(onSwipe).toHaveBeenCalledWith(1);
  // The pages carry on from the finger's spot (minus the first few points it takes to start).
  expect(takeCommittedDrag()).toBeCloseTo(-W * 0.6 + 24);
});

test('a short slow swipe glides back and stays', async () => {
  const onSwipe = tabs(1);
  await swipe(-60, -100);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('a quick flick changes the tab even if short', async () => {
  const onSwipe = tabs(2);
  await swipe(60, 1200);
  expect(onSwipe).toHaveBeenCalledWith(-1);
});

test('past Plan (the last tab) it only bounces', async () => {
  const onSwipe = tabs(3);
  await swipe(-W * 0.8, -2000);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('past Home (the first tab) it only bounces', async () => {
  const onSwipe = tabs(0);
  await swipe(W * 0.8, 2000);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('at the ends the page gives a third as much', () => {
  expect(edgeGive(90, 0, 4)).toBe(30);
  expect(edgeGive(-90, 3, 4)).toBe(-30);
  expect(edgeGive(-90, 1, 4)).toBe(-90);
});
