import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-20 (2026-10-22): turning on "Notify me on this phone" waits for the phone's permission
// pop-up, then saved using the data from BEFORE the pop-up, quietly undoing anything that
// arrived meanwhile (e.g. the partner's change).
const mockSaveModel = jest.fn(async () => {});
let mockModel: any;
let mockLatest: any = null;
// The real data layer talks to Firebase; this check only needs the form, so it gets a
// stand-in with a household and a save that is counted.
jest.mock('../src/DataContext', () => ({
  useData: () => ({ model: mockModel, getModel: () => mockLatest ?? mockModel, saveModel: mockSaveModel, isLinked: false, username: 'cath', storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
jest.mock('../src/pushNotifications', () => ({
  ...jest.requireActual('../src/pushNotifications'),
  // While the permission pop-up is open, the partner adds a bill.
  requestNotificationPermission: async () => {
    mockLatest = { ...mockModel, bills: [...(mockModel.bills || []), { id: 'b-partner', name: 'Water', recurringType: 'monthly', dueDate: { day: '5' }, cycles: [] }] };
    return true;
  },
  rescheduleBillNotifications: async () => {},
}));
// Settings also reaches Firebase code (household, sign-in); nothing here talks to it.
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'notify' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test("turning on reminders keeps a change that arrived while the permission pop-up was open", async () => {
  mockModel = defaultModel();
  mockModel.settings = { ...mockModel.settings, pushNotificationsEnabled: false };
  const { Switch } = require('react-native');
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('Notify me on this phone')).toBeTruthy();
  const sw = screen.UNSAFE_getAllByType(Switch)[0];
  await act(async () => {
    fireEvent(sw, 'valueChange', true);
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(mockSaveModel).toHaveBeenCalledTimes(1);
  const saved: any = (mockSaveModel.mock.calls[0] as any)[0];
  expect(saved.settings.pushNotificationsEnabled).toBe(true);
  expect(saved.bills.map((b: any) => b.id)).toContain('b-partner');
}, 30000);
