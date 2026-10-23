import React, { useState } from 'react';
import { LayoutAnimation, Text } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { PickerRow } from '../src/components/SimpleForm';
import KindSwitch from '../src/components/KindSwitch';
import LargeHeader from '../src/navigation/LargeHeader';
import DeferredContent from '../src/navigation/DeferredContent';

// Smoothness 2026-10-23 (Cath: no button or page may flicker or jump; fades smooth).
let mockReduce = false;
jest.mock('../src/reduceMotion', () => ({ useReduceMotion: () => mockReduce, reduceMotionNow: () => mockReduce }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ isOnline: true, pendingChanges: 0, model: null }),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const inApp = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

beforeEach(() => {
  mockReduce = false;
  jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

function Row() {
  const [open, setOpen] = useState(false);
  return (
    <PickerRow label="Repeats" value="Once" open={open} onToggle={() => setOpen((o) => !o)} testID="row">
      <Text>Every month</Text>
    </PickerRow>
  );
}

test('opening a row glides (the rows below make room smoothly)', () => {
  inApp(<Row />);
  fireEvent.press(screen.getByTestId('row'));
  expect(LayoutAnimation.configureNext).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Every month')).toBeTruthy();
  fireEvent.press(screen.getByTestId('row'));
  expect(LayoutAnimation.configureNext).toHaveBeenCalledTimes(2);
});

test('with the phone set to remove animations, rows open at once', () => {
  mockReduce = true;
  inApp(<Row />);
  fireEvent.press(screen.getByTestId('row'));
  expect(LayoutAnimation.configureNext).not.toHaveBeenCalled();
  expect(screen.getByText('Every month')).toBeTruthy();
});

test('the ? help under Bill / Debt / Loan opens smoothly too', () => {
  inApp(<KindSwitch current="bills" onSwitch={() => {}} />);
  fireEvent.press(screen.getByLabelText('What is the difference?'));
  expect(LayoutAnimation.configureNext).toHaveBeenCalled();
});

const header = (title: string) => (
  <LargeHeader navigation={{ goBack: () => {} }} route={{ name: 'Report' }} options={{ title }} back={{ title: 'Insights' }} />
);

test('a page whose title comes later keeps the title line, so nothing below moves', () => {
  const r = inApp(header(' '));
  expect(screen.getByRole('header')).toBeTruthy();
  r.rerender(<ThemeProvider>{header('Monthly close-out')}</ThemeProvider>);
  expect(screen.getByRole('header').props.children).toBe('Monthly close-out');
});

test('a page with no title (it shows its own heading) has no title line', () => {
  inApp(header(''));
  expect(screen.queryByRole('header')).toBeNull();
});

test('page contents arrive a moment after the slide starts, fading in', async () => {
  jest.useFakeTimers();
  inApp(
    <DeferredContent>
      <Text>Page body</Text>
    </DeferredContent>
  );
  expect(screen.queryByText('Page body')).toBeNull();
  await act(async () => {
    jest.advanceTimersByTime(100);
  });
  expect(screen.getByText('Page body')).toBeTruthy();
  jest.useRealTimers();
});
