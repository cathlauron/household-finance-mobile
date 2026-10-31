import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';

// Mockup FP (Cath, 2026-10-30): Forgot password warns BEFORE sending (Recovery Key needed),
// then says "Check your email"; the email note shows until the email is confirmed and hides
// for a week on ✕.
test('Forgot password: warning first, then the email is sent and "Check your email" shows', async () => {
  const ForgotPasswordSheet = require('../src/components/ForgotPasswordSheet').default;
  const send = jest.fn(async () => {});
  render(<ThemeProvider><ForgotPasswordSheet visible initialEmail="cath@x.com" onClose={() => {}} send={send} /></ThemeProvider>);
  expect(screen.getByText(/Have your Recovery Key ready/)).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  await act(async () => { fireEvent.press(screen.getByTestId('forgot-send')); });
  expect(send).toHaveBeenCalledWith('cath@x.com');
  expect(screen.getByTestId('forgot-sent')).toBeTruthy();
});

test('Forgot password: "Send again" opens up after a minute, counting down', async () => {
  jest.useFakeTimers();
  try {
    const ForgotPasswordSheet = require('../src/components/ForgotPasswordSheet').default;
    const send = jest.fn(async () => {});
    render(<ThemeProvider><ForgotPasswordSheet visible initialEmail="cath@x.com" onClose={() => {}} send={send} /></ThemeProvider>);
    await act(async () => { fireEvent.press(screen.getByTestId('forgot-send')); });
    expect(screen.getByText(/Send again in (1:00|0:59)$/)).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('forgot-again')); });
    expect(send).toHaveBeenCalledTimes(1); // not yet
    await act(async () => { jest.advanceTimersByTime(61000); });
    expect(screen.getByText("Didn't get it? Send again")).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('forgot-again')); });
    expect(send).toHaveBeenCalledTimes(2);
  } finally {
    jest.useRealTimers();
  }
});

test('Forgot password: a typo in the email is caught before sending', async () => {
  const ForgotPasswordSheet = require('../src/components/ForgotPasswordSheet').default;
  const send = jest.fn(async () => {});
  render(<ThemeProvider><ForgotPasswordSheet visible initialEmail="" onClose={() => {}} send={send} /></ThemeProvider>);
  fireEvent.changeText(screen.getByTestId('forgot-email'), 'cath@');
  await act(async () => { fireEvent.press(screen.getByTestId('forgot-send')); });
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByText(/Type the email address/)).toBeTruthy();
});

let mockUid = 'cath';
describe('email note', () => {
  let confirmed = false;
  const sendConfirm = jest.fn(async () => {});
  beforeAll(() => {
    jest.doMock('../src/authFirebase', () => ({ emailConfirmed: async () => confirmed, sendConfirmEmail: sendConfirm, getCurrentFirebaseUser: () => ({ uid: mockUid }) }));
    jest.doMock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useFocusEffect: () => {} }));
  });
  test('shows until confirmed, sends the link, and ✕ hides it (for this account only)', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    mockUid = 'cath';
    const Note = require('../src/components/EmailCheckNote').default;
    const r = render(<ThemeProvider><Note /></ThemeProvider>);
    await act(async () => {});
    expect(screen.getByTestId('email-check-note')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('email-check-send')); });
    expect(sendConfirm).toHaveBeenCalled();
    expect(screen.getByText(/Sent. Open the link/)).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('email-check-hide')); });
    expect(screen.queryByTestId('email-check-note')).toBeNull();
    r.unmount();
    const r2 = render(<ThemeProvider><Note /></ThemeProvider>);
    await act(async () => {});
    expect(screen.queryByTestId('email-check-note')).toBeNull();
    r2.unmount();
    // H-59: another account on the same phone still sees its own note.
    mockUid = 'miguel';
    const r3 = render(<ThemeProvider><Note /></ThemeProvider>);
    await act(async () => {});
    expect(screen.getByTestId('email-check-note')).toBeTruthy();
    r3.unmount();
  });
  test('Settings › Account & Security › Email: always there; not confirmed sends the link', async () => {
    confirmed = false;
    sendConfirm.mockClear();
    const { EmailRow } = require('../src/components/EmailCheckNote');
    render(<ThemeProvider><EmailRow /></ThemeProvider>);
    await act(async () => {});
    expect(screen.getByText('Not confirmed')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByTestId('settings-email-row')); });
    expect(sendConfirm).toHaveBeenCalled();
    expect(screen.getByText('Link sent')).toBeTruthy();
  });
  test('a confirmed email: no note', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    confirmed = true;
    const Note = require('../src/components/EmailCheckNote').default;
    render(<ThemeProvider><Note /></ThemeProvider>);
    await act(async () => {});
    expect(screen.queryByTestId('email-check-note')).toBeNull();
  });
});
