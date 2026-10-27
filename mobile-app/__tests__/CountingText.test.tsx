import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import CountingText from '../src/components/CountingText';
import { PageActiveContext } from '../src/pageActive';
import { formatPeso } from '../src/balanceProjection';

// Smoothness 2026-10-23 (Cath: "quick count to the new number").
let mockReduce = false;
jest.mock('../src/reduceMotion', () => ({ useReduceMotion: () => mockReduce, reduceMotionNow: () => mockReduce }));

const text = () => screen.getByTestId('amount').props.children;
function Amount({ value, showing = true, masked = false }: { value: number; showing?: boolean; masked?: boolean }) {
  return (
    <PageActiveContext.Provider value={showing}>
      <CountingText testID="amount" value={value} masked={masked} format={(n) => (masked ? '₱ *****' : formatPeso(n))} />
    </PageActiveContext.Provider>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReduce = false;
});
afterEach(() => jest.useRealTimers());

test('opening a screen shows the amount straight away (no counting)', () => {
  render(<Amount value={2000} />);
  expect(text()).toBe(formatPeso(2000));
});

test('a change you can see counts to the new amount, then stops on it', () => {
  const r = render(<Amount value={2000} />);
  r.rerender(<Amount value={1750} />);
  act(() => jest.advanceTimersByTime(200));
  const mid = text();
  expect(mid).not.toBe(formatPeso(2000));
  expect(mid).not.toBe(formatPeso(1750));
  act(() => jest.advanceTimersByTime(600));
  expect(text()).toBe(formatPeso(1750));
});

test('with the phone set to remove animations it changes at once', () => {
  mockReduce = true;
  const r = render(<Amount value={2000} />);
  r.rerender(<Amount value={1750} />);
  expect(text()).toBe(formatPeso(1750));
});

test('on a page that is not showing it changes at once', () => {
  const r = render(<Amount value={2000} showing={false} />);
  r.rerender(<Amount value={1750} showing={false} />);
  expect(text()).toBe(formatPeso(1750));
});

test('with amounts hidden nothing counts and the mask stays', () => {
  const r = render(<Amount value={2000} masked />);
  r.rerender(<Amount value={1750} masked />);
  expect(text()).toBe('₱ *****');
});

test('screen readers hear the new amount, not the numbers in between', () => {
  const r = render(<Amount value={2000} />);
  r.rerender(<Amount value={1750} />);
  act(() => jest.advanceTimersByTime(200));
  expect(screen.getByTestId('amount').props.accessibilityLabel).toBe(formatPeso(1750));
});
