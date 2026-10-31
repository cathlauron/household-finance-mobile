import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../src/ThemeContext';
import GuestSetupScreen from '../src/screens/GuestSetupScreen';
import { emptyGuestSetup, GuestSetup } from '../src/guest';

// Set-up S1-S4 (Cath, 2026-10-31, mockups S1-S4 in O3a's look): the name shows in a
// "Good morning" preview, picks show what Home shows first, Day & night is a fourth look,
// and See my Home shows "You're all set" before Home.

function Probe() {
  const { mode } = useTheme();
  return <Text testID="probe">{mode}</Text>;
}

function Flow({ onDone }: { onDone: (s: GuestSetup) => void }) {
  const [setup, setSetup] = React.useState<GuestSetup>({ ...emptyGuestSetup(), step: 'setup' });
  return <GuestSetupScreen setup={setup} onChange={setSetup} onBackToWelcome={() => {}} onDone={onDone} />;
}

beforeEach(async () => {
  await AsyncStorage.removeItem('colorModePreference');
  delete process.env.FF_CHECK_START_LOOK; // act as a new person
  jest.useFakeTimers({ now: new Date(2026, 9, 31, 12, 0), doNotFake: ['nextTick', 'setImmediate'] });
});
afterEach(() => jest.useRealTimers());

test('all four steps, then "You\'re all set" and Home', async () => {
  const done = jest.fn();
  render(
    <ThemeProvider>
      <Probe />
      <Flow onDone={done} />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('1 of 4 · Morning')).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('guest-name'), 'Cath');
  expect(screen.getByLabelText('Home will greet you: Good morning, Cath')).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-continue'));
  await act(async () => {});

  expect(screen.getByText('2 of 4 · Midday')).toBeTruthy();
  fireEvent.press(screen.getByText('Pay off debt'));
  expect(screen.getByText('Your debt-free date')).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-continue'));
  await act(async () => {});

  expect(screen.getByText('3 of 4 · Afternoon')).toBeTruthy();
  expect(screen.getByTestId('probe').props.children).toBe('auto');
  // Smoothness rule (10-23, 'Light / Dark in set-up'): the shared switch whose highlight glides.
  expect(screen.UNSAFE_getByType(require('../src/components/SegmentedControl').default)).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-look-dark'));
  expect(screen.getByTestId('probe').props.children).toBe('dark');
  fireEvent.press(screen.getByTestId('guest-look-auto'));
  expect(screen.getByTestId('probe').props.children).toBe('auto');
  expect(screen.getByText('Light by day, dark from sunset to sunrise.')).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-continue'));
  await act(async () => {});

  expect(screen.getByText('4 of 4 · Evening')).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-phone-yes'));
  expect(screen.getByLabelText('Locked')).toBeTruthy();
  fireEvent.press(screen.getByTestId('guest-continue'));
  expect(screen.getByText("You're all set, Cath!")).toBeTruthy();
  expect(done).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(2500);
  });
  expect(done).toHaveBeenCalledTimes(1);
  expect(done.mock.calls[0][0]).toMatchObject({ name: 'Cath', helpWith: ['debt'], othersUsePhone: true });
});
