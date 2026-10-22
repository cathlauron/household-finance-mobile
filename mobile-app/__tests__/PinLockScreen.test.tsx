import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';

// H-18 (2026-10-22): the lock screen, opened while the PIN is blocked (e.g. after reopening
// the app following 5 wrong PINs), must not let the PIN unlock; the password still can.
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/biometrics', () => ({
  getBiometricState: async () => 'UNAVAILABLE',
  getBiometricLabel: async () => 'Fingerprint',
  attemptBiometricAuth: async () => ({ success: false }),
  biometricErrorMessage: () => '',
}));
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));
jest.mock('expo-crypto', () => {
  const C = require('crypto-js');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: async (_a: string, s: string) => C.SHA256(s).toString(),
    getRandomBytesAsync: async (n: number) => new Uint8Array(n).fill(7),
  };
});

async function openLockScreen(onUnlocked: jest.Mock) {
  const PinUnlockScreen = require('../src/screens/PinUnlockScreen').default;
  render(
    <ThemeProvider>
      <PinUnlockScreen username="cath" onUnlocked={onUnlocked} onSignOut={() => {}} />
    </ThemeProvider>,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

test('opened while the PIN is blocked: says so, offers the password, PIN cannot unlock', async () => {
  const { savePin } = require('../src/pin');
  const { registerPinFailure } = require('../src/quickUnlock');
  await savePin('cath', '1234');
  for (let i = 0; i < 5; i++) await registerPinFailure('cath');
  const onUnlocked = jest.fn();
  await openLockScreen(onUnlocked);
  expect(screen.getByText(/Too many incorrect PINs\. Use your password, or try your PIN again in 5 minutes\./)).toBeTruthy();
  // Even switching back to the PIN and typing the right one doesn't open it.
  fireEvent.press(screen.getByText('Use PIN or biometrics'));
  fireEvent.changeText(screen.getByTestId('unlock-pin-input'), '1234');
  await act(async () => {
    fireEvent.press(screen.getByTestId('unlock-button'));
    await new Promise((r) => setTimeout(r, 400));
  });
  expect(onUnlocked).not.toHaveBeenCalled();
}, 30000);
