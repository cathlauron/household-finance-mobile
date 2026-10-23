import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-14 (2026-10-22): Settings > Budgeting, the Running-low percent: clearing the box and
// pausing saved 0 (and showed 0) while you were still typing.
const mockSaveModel = jest.fn(async () => {});
let mockModel: any;
// The real data layer talks to Firebase; this check only needs the form, so it gets a
// stand-in with a household and a save that is counted.
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: mockSaveModel, isLinked: false, username: 'cath', storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
// Settings also reaches Firebase code (household, sign-in); nothing here talks to it.
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'budget' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test('clearing the box and pausing does not save 0 or put 0 in the box', async () => {
  jest.useFakeTimers();
  mockModel = defaultModel();
  mockModel.settings = { ...mockModel.settings, cautionThresholdPercent: 25 };
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  const box = screen.getByDisplayValue('25');
  fireEvent.changeText(box, '');
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  expect(mockSaveModel).not.toHaveBeenCalled();
  expect(screen.queryByDisplayValue('0')).toBeNull();
  jest.useRealTimers();
}, 30000);
