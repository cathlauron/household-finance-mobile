import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import ThemeMenu from '../src/components/ThemeMenu';

// Day & night (Cath, 2026-10-31, mockups D1 + D3): new people start on it, it's dark from
// sunset to sunrise (6 PM / 6 AM without location), and Home's moon button opens a menu
// with Light, Dark, Day & night and Match my phone.

function Probe() {
  const { mode, isDark } = useTheme();
  return <Text testID="probe">{`${mode} ${isDark ? 'dark' : 'light'}`}</Text>;
}

beforeEach(async () => {
  await AsyncStorage.removeItem('colorModePreference');
  delete process.env.FF_CHECK_START_LOOK; // act as a new person
});
afterEach(() => {
  jest.useRealTimers();
});

test('a new person (nothing saved) starts on Day & night: dark in the evening', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 20, 0), doNotFake: ['nextTick', 'setImmediate'] });
  render(<ThemeProvider><Probe /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('probe').props.children).toBe('auto dark');
});

test('Day & night is light at noon', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 12, 0), doNotFake: ['nextTick', 'setImmediate'] });
  render(<ThemeProvider><Probe /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('probe').props.children).toBe('auto light');
});

test('someone who chose Light keeps Light, even at night', async () => {
  await AsyncStorage.setItem('colorModePreference', 'light');
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 22, 0), doNotFake: ['nextTick', 'setImmediate'] });
  render(<ThemeProvider><Probe /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('probe').props.children).toBe('light light');
});

test('with the app open, sunset turns it dark by itself', async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 17, 59, 30), doNotFake: ['nextTick', 'setImmediate'] });
  render(<ThemeProvider><Probe /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('probe').props.children).toBe('auto light');
  await act(async () => {
    jest.advanceTimersByTime(61000);
  });
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(screen.getByTestId('probe').props.children).toBe('auto dark');
});

test("the moon button's menu: picking Dark, then Day & night, changes the look at once", async () => {
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 12, 0), doNotFake: ['nextTick', 'setImmediate'] });
  render(
    <ThemeProvider>
      <Probe />
      <ThemeMenu open top={100} onClose={() => {}} />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('Dark 6:00 PM to 6:00 AM')).toBeTruthy();
  fireEvent.press(screen.getByTestId('theme-menu-dark'));
  expect(screen.getByTestId('probe').props.children).toBe('dark dark');
  fireEvent.press(screen.getByTestId('theme-menu-auto'));
  expect(screen.getByTestId('probe').props.children).toBe('auto light');
  fireEvent.press(screen.getByTestId('theme-menu-device'));
  expect(screen.getByTestId('probe').props.children).toMatch(/^device /);
});

