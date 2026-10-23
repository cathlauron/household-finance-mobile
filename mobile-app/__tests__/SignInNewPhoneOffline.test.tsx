import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';

// H-19 (2026-10-22, Cath agreed): signing in on a NEW phone to a shared household, with the
// connection dropping while the household is read, asked for the recovery key as if the
// password were wrong. It must say to check the connection instead.
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({
  signInWithFirebase: async () => ({}),
  createFirebaseAccount: async () => ({}),
  signOutFirebase: async () => {},
  getCurrentFirebaseUser: () => ({ uid: 'u1' }),
}));
jest.mock('../src/usernameClaim', () => ({ usernameOwner: async () => 'mine', ensureUsernameClaim: () => {} }));
jest.mock('../src/encryption', () => ({
  ...jest.requireActual('../src/encryption'),
  deriveKey: () => 'PERSONAL-KEY',
}));
jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  loadProfilesIndex: async () => [], // new phone: nothing saved here yet
}));
jest.mock('../src/cloudBackup', () => ({
  loadProfileCloudBackup: async () => ({ salt: 'aa', householdId: 'h1' }),
  saveProfileCloudBackup: async () => 0,
}));
jest.mock('../src/household', () => ({
  loadWrappedHouseholdKey: async () => ({ householdId: 'h1', wrappedKey: 'W' }),
  unwrapHouseholdKey: () => 'HOUSEHOLD-KEY', // the password is right
  loadHouseholdData: async () => {
    throw Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' });
  },
  wrapHouseholdKey: async () => '',
  saveWrappedHouseholdKey: async () => {},
}));

test('new phone, connection drops while reading the household: says so, no recovery key', async () => {
  const SignInScreen = require('../src/screens/SignInScreen').default;
  const onSignedIn = jest.fn();
  render(
    <ThemeProvider>
      <SignInScreen onSignedIn={onSignedIn} onGoToCreateProfile={() => {}} />
    </ThemeProvider>,
  );
  await act(async () => {});
  fireEvent.changeText(screen.getByTestId('email-input'), 'cath@example.com');
  fireEvent.changeText(screen.getByTestId('username-input'), 'cath');
  fireEvent.changeText(screen.getByTestId('password-input'), 'right password');
  await act(async () => {
    fireEvent.press(screen.getByTestId('sign-in-button'));
    await new Promise((r) => setTimeout(r, 600));
  });
  expect(screen.getByText(/Check your connection/)).toBeTruthy();
  expect(screen.queryByPlaceholderText('e.g. 4B9X-7M2K-W8Q3-P1Z6')).toBeNull();
  expect(onSignedIn).not.toHaveBeenCalled();
}, 30000);
