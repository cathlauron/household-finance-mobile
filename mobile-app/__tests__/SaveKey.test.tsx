import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { readFileSync } from 'fs';
import { ThemeProvider } from '../src/ThemeContext';

// Mockup R1 (Cath 2026-10-30): "Save to password manager" for the Secret Recovery Key.
let mockNative: any = null;
jest.mock('expo', () => ({ ...jest.requireActual('expo'), requireOptionalNativeModule: () => mockNative }));

function setup(native: any) {
  mockNative = native;
  Platform.OS = 'android';
  const SaveKeyButton = require('../src/components/SaveKeyButton').default;
  const onSaved = jest.fn();
  render(<ThemeProvider><SaveKeyButton username="cath" recoveryKey="4B9X-7M2K-W8Q3-P1Z6" onSaved={onSaved} /></ThemeProvider>);
  return onSaved;
}

test('not shown where the phone can\'t do it (Expo Go, iPhone for now)', () => {
  setup(null);
  expect(screen.queryByTestId('save-key')).toBeNull();
});

test('saves the key under "Finance Flow Recovery Key – cath", then says it\'s saved', async () => {
  const savePassword = jest.fn(async () => 'saved');
  const onSaved = setup({ savePassword });
  await act(async () => { fireEvent.press(screen.getByTestId('save-key')); });
  expect(savePassword).toHaveBeenCalledWith('Finance Flow Recovery Key – cath', '4B9X-7M2K-W8Q3-P1Z6');
  expect(screen.getByTestId('save-key-done')).toBeTruthy();
  expect(onSaved).toHaveBeenCalled();
});

test('tapping "Not now" on the phone\'s question leaves the button as it was', async () => {
  const onSaved = setup({ savePassword: jest.fn(async () => 'cancelled') });
  await act(async () => { fireEvent.press(screen.getByTestId('save-key')); });
  expect(screen.getByTestId('save-key')).toBeTruthy();
  expect(onSaved).not.toHaveBeenCalled();
});

test('if saving fails it says to use Copy key instead', async () => {
  setup({ savePassword: jest.fn(async () => { throw new Error('x'); }) });
  await act(async () => { fireEvent.press(screen.getByTestId('save-key')); });
  expect(screen.getByText(/Use Copy key/)).toBeTruthy();
});

test('the Android part asks the phone to save a password (Credential Manager), nothing else', () => {
  const kt = readFileSync('modules/ff-keysave/android/src/main/java/expo/modules/ffkeysave/FFKeySaveModule.kt', 'utf8');
  expect(kt).toMatch(/CreatePasswordRequest\(id, password\)/);
  expect(JSON.parse(readFileSync('modules/ff-keysave/expo-module.config.json', 'utf8')).android.modules).toEqual(['expo.modules.ffkeysave.FFKeySaveModule']);
});
