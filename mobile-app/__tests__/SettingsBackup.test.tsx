import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-05 (2026-10-22): Save a backup asks for the password and writes a LOCKED file (it used
// to write every money detail as plain text). A wrong password writes nothing.
const mockSaveModel = jest.fn(async () => {});
let mockModel: any;
// The real data layer talks to Firebase; this check only needs the form, so it gets a
// stand-in with a household and a save that is counted.
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: mockSaveModel, isLinked: false, username: 'cath', storageUsed: 0, pendingChanges: 0, verifyPassword: async (p: string) => p === 'right password', changePassword: async () => ({}), getHouseholdKey: () => null }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
const mockWritten: string[] = [];
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: async (_uri: string, text: string) => { mockWritten.push(text); },
  readDirectoryAsync: async () => [],
  deleteAsync: async () => {},
}));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
// Fast, fixed "random" bytes and key stretching for the check (the app uses the real ones).
jest.mock('../src/encryption', () => {
  const CryptoJS = require('crypto-js');
  return {
    ...jest.requireActual('../src/encryption'),
    generateSalt: async () => '00112233445566778899aabbccddeeff',
    deriveKey: (pw: string, salt: string) => CryptoJS.PBKDF2(pw, CryptoJS.enc.Hex.parse(salt), { keySize: 8, iterations: 5, hasher: CryptoJS.algo.SHA256 }),
  };
});
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
// Settings also reaches Firebase code (household, sign-in); nothing here talks to it.
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'backup' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

async function openBackup() {
  mockModel = defaultModel();
  mockModel.bills = [{ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '15' }, cycles: [] }];
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  fireEvent.press(screen.getByText('Save a backup'));
  await act(async () => {});
}

test('a wrong password writes nothing and says so', async () => {
  mockWritten.length = 0;
  await openBackup();
  fireEvent.changeText(screen.getByTestId('backup-password-input'), 'wrong');
  await act(async () => {
    fireEvent.press(screen.getAllByText('Save').slice(-1)[0]);
  });
  // (Saving waits a moment so the busy drawing shows first.)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 600));
  });
  expect(mockWritten).toHaveLength(0);
  expect(screen.getByText('Incorrect password.')).toBeTruthy();
}, 30000);

test('the right password writes a locked file with nothing readable in it', async () => {
  mockWritten.length = 0;
  await openBackup();
  fireEvent.changeText(screen.getByTestId('backup-password-input'), 'right password');
  await act(async () => {
    fireEvent.press(screen.getAllByText('Save').slice(-1)[0]);
  });
  // (Saving waits a moment so the busy drawing shows first.)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 600));
  });
  expect(mockWritten).toHaveLength(1);
  expect(mockWritten[0]).not.toContain('Meralco');
  expect(JSON.parse(mockWritten[0]).kind).toBe('finance-flow-backup');
}, 30000);
