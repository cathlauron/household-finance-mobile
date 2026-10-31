import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import WelcomeScreen from '../src/screens/WelcomeScreen';

// The welcome (Cath, mockup O3a, 2026-10-31): plays through a day by itself, tapping a time
// jumps there, the night moment shows the app dark without saving it, and leaving the
// welcome puts the real look back.

function Probe() {
  const { isDark, mode } = useTheme();
  return <Text testID="probe">{`${mode} ${isDark ? 'dark' : 'light'}`}</Text>;
}

beforeEach(async () => {
  await AsyncStorage.removeItem('colorModePreference');
  delete process.env.FF_CHECK_START_LOOK; // act as a new person
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 12, 0), doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => jest.useRealTimers());

test('the day plays by itself: morning widgets, then Say it at lunch', async () => {
  render(<ThemeProvider><WelcomeScreen onStart={() => {}} onSignIn={() => {}} /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText('One glance from your home screen')).toBeTruthy();
  expect(screen.getByText('Plus Due soon, Month at a glance and Trip')).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(4300);
  });
  expect(screen.getByText('Say it at the till. Done.')).toBeTruthy();
});

test('tapping Night shows it dark (not saved); leaving the welcome puts the real look back', async () => {
  const view = render(
    <ThemeProvider>
      <Probe />
      <WelcomeScreen onStart={() => {}} onSignIn={() => {}} />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByTestId('probe').props.children).toBe('auto light');
  fireEvent.press(screen.getByLabelText('Show night, 10:00 PM'));
  await act(async () => {
    jest.advanceTimersByTime(1200);
  });
  expect(screen.getByText('Sleep knowing where you stand')).toBeTruthy();
  expect(screen.getByTestId('probe').props.children).toBe('auto dark');
  view.rerender(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await act(async () => {
    jest.advanceTimersByTime(1200);
  });
  expect(screen.getByTestId('probe').props.children).toBe('auto light');
});

test('Get started and I already have an account do their jobs', async () => {
  const start = jest.fn();
  const signIn = jest.fn();
  render(<ThemeProvider><WelcomeScreen onStart={start} onSignIn={signIn} /></ThemeProvider>);
  await act(async () => {});
  fireEvent.press(screen.getByText('Get started'));
  fireEvent.press(screen.getByText('I already have an account'));
  expect(start).toHaveBeenCalledTimes(1);
  expect(signIn).toHaveBeenCalledTimes(1);
});
