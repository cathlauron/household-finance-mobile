import React from 'react';
import { Dimensions, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { State } from 'react-native-gesture-handler';
import { SwipeTabs } from '../src/navigation/swipeTabs';
import { edgeGive, takeCommittedDrag } from '../src/navigation/tabDrag';

// Smoothness 2026-10-23 (Cath: the bottom tabs follow your finger too).
const W = Dimensions.get('window').width;

function swipe(dx: number, vx = 0) {
  fireGestureHandler(getByGestureTestId('tab-swipe'), [
    { state: State.BEGAN, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX: dx / 2, translationY: 0 },
    { state: State.ACTIVE, translationX: dx, translationY: 0 },
    { state: State.END, translationX: dx, translationY: 0, velocityX: vx },
  ]);
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

test('a long swipe left on Transactions goes on to To-Pay, from where the finger left it', () => {
  const onSwipe = tabs(1);
  swipe(-W * 0.6);
  expect(onSwipe).toHaveBeenCalledWith(1);
  // The pages carry on from the finger's spot (minus the first few points it takes to start).
  expect(takeCommittedDrag()).toBeCloseTo(-W * 0.6 + 24);
});

test('a short slow swipe glides back and stays', () => {
  const onSwipe = tabs(1);
  swipe(-60, -100);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('a quick flick changes the tab even if short', () => {
  const onSwipe = tabs(2);
  swipe(60, 1200);
  expect(onSwipe).toHaveBeenCalledWith(-1);
});

test('past Plan (the last tab) it only bounces', () => {
  const onSwipe = tabs(3);
  swipe(-W * 0.8, -2000);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('past Home (the first tab) it only bounces', () => {
  const onSwipe = tabs(0);
  swipe(W * 0.8, 2000);
  expect(onSwipe).not.toHaveBeenCalled();
});

test('at the ends the page gives a third as much', () => {
  expect(edgeGive(90, 0, 4)).toBe(30);
  expect(edgeGive(-90, 3, 4)).toBe(-30);
  expect(edgeGive(-90, 1, 4)).toBe(-90);
});
