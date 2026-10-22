import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-01 (2026-10-22): on the real Backup & Data page, in a shared household, a member gets
// no clear button (offered Leave household); the owner gets the for-everyone warning.
const mockSaveModel = jest.fn(async () => {});
let mockModel: any;
// The real data layer talks to Firebase; this check only needs the form, so it gets a
// stand-in with a household and a save that is counted.
jest.mock('../src/DataContext', () => ({
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: mockSaveModel, isLinked: true, username: 'miguel', storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
// Settings also reaches Firebase code (household, sign-in); nothing here talks to it.
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
let mockUid = 'u2';
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => ({ uid: mockUid }) }));
jest.mock('../src/storage', () => ({
  ...jest.requireActual('../src/storage'),
  loadProfilesIndex: async () => [{ username: 'miguel', householdId: 'h1' }, { username: 'cath', householdId: 'h1' }],
}));
jest.mock('../src/sessions', () => ({
  ...jest.requireActual('../src/sessions'),
  subscribeToUserDevices: () => () => {},
}));
jest.mock('../src/household', () => ({
  getHouseholdMembers: async () => [
    { uid: 'u1', username: 'cath', isOwner: true },
    { uid: 'u2', username: 'miguel', isOwner: false },
  ],
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'backup' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

async function openClear() {
  mockModel = defaultModel();
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  await act(async () => {});
  fireEvent.press(screen.getByText('Clear all data & start fresh'));
}

test('a member: no clear button, told only the owner can, offered to leave', async () => {
  mockUid = 'u2';
  await openClear();
  expect(screen.queryByText(/Yes, clear/)).toBeNull();
  expect(screen.getByText(/Only cath, the household's owner, can clear/)).toBeTruthy();
  expect(screen.getByText('Leave household')).toBeTruthy();
}, 30000);

test('the owner: warned it clears it for the partner too', async () => {
  mockUid = 'u1';
  await openClear();
  expect(screen.getByText(/for you and miguel/)).toBeTruthy();
  expect(screen.getByText('Yes, clear it for everyone')).toBeTruthy();
}, 30000);
