import React from 'react';
import { AppState, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { useToday, msUntilNextMidnight } from '../src/useToday';

// H-09 (2026-10-22): Home's day-based numbers went stale when the app was left open
// overnight. useToday() must change when the date does.
function Probe() {
  return <Text>{useToday()}</Text>;
}

describe('useToday', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('changes at midnight while the app is open', () => {
    jest.setSystemTime(new Date(2026, 9, 22, 23, 59, 0));
    render(<Probe />);
    expect(screen.getByText('2026-10-22')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });
    expect(screen.getByText('2026-10-23')).toBeTruthy();
  });

  test('changes when the app comes back to the front on a new day', () => {
    const listeners: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_e: any, fn: any) => {
      listeners.push(fn);
      return { remove: () => {} } as any;
    });
    jest.setSystemTime(new Date(2026, 9, 22, 22, 0, 0));
    render(<Probe />);
    // The phone slept: the clock moved on without timers running.
    jest.setSystemTime(new Date(2026, 9, 23, 8, 0, 0));
    act(() => listeners.forEach((fn) => fn('active')));
    expect(screen.getByText('2026-10-23')).toBeTruthy();
    spy.mockRestore();
  });

  test('time until the next midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 22, 23, 59, 0))).toBe(61 * 1000);
    expect(msUntilNextMidnight(new Date(2026, 9, 22, 23, 59, 59, 500))).toBe(1500);
  });
});
