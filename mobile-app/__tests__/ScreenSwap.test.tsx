import React from 'react';
import { Animated, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import ScreenSwap from '../src/components/ScreenSwap';

// 2026-10-26 (Cath's screen recording): opening a Plan page showed a SECOND copy of the
// app (on Home, with its own tab bar) underneath. The soft dip between whole screens keeps
// the old screen until its fade-out ends; on her phone that animation never reported back
// (the red "easing is not supported by native animated module" error), so the old copy
// stayed forever. Now the old screen is removed when the dip's time is up, whatever the
// animation does.
jest.mock('../src/reduceMotion', () => ({ useReduceMotion: () => false, reduceMotionNow: () => false }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function swap(key: string, label: string) {
  return (
    <ScreenSwap screenKey={key}>
      <Text>{label}</Text>
    </ScreenSwap>
  );
}

test('the old screen is gone after the dip even if the animation never reports back', () => {
  // An animation that starts but never calls back (what the phone did).
  jest.spyOn(Animated, 'timing').mockImplementation(() => ({ start: () => {}, stop: () => {}, reset: () => {} }) as any);
  const r = render(swap('guest', 'old app'));
  r.rerender(swap('home', 'new app'));
  expect(screen.getByText('new app')).toBeTruthy();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.queryByText('old app')).toBeNull();
  expect(screen.getByText('new app')).toBeTruthy();
});

test('normal dip: both show during the dip, then only the new one', () => {
  const r = render(swap('welcome', 'welcome'));
  r.rerender(swap('setup', 'set-up'));
  expect(screen.queryByText('welcome')).toBeTruthy();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.queryByText('welcome')).toBeNull();
  expect(screen.getByText('set-up')).toBeTruthy();
});

test('two changes in a row: never more than the two newest, and the end leaves one', () => {
  const r = render(swap('welcome', 'welcome'));
  r.rerender(swap('setup', 'set-up'));
  r.rerender(swap('guest', 'home'));
  expect(screen.queryByText('welcome')).toBeNull();
  act(() => jest.advanceTimersByTime(1000));
  expect(screen.queryByText('set-up')).toBeNull();
  expect(screen.getByText('home')).toBeTruthy();
});
