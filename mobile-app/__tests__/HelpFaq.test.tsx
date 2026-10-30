import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Mockup H1 (Cath, 2026-10-29): Help & FAQ replaces "Help & guides: Coming soon" (the app
// stores reject unfinished screens). Questions open in place; search narrows them.
let mockModel: any;
const mockPush = jest.fn();
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath', storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => ({ uid: 'u1' }) }));
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), push: mockPush, setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'helpabout' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test('About & Help: no "Coming soon"; Help & FAQ, privacy policy and delete account are there', async () => {
  mockModel = defaultModel();
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.queryByText(/coming soon/i)).toBeNull();
  expect(screen.queryByText(/coming later/i)).toBeNull();
  fireEvent.press(screen.getByTestId('settings-help-faq'));
  expect(mockPush).toHaveBeenCalledWith('HelpFaq');
  fireEvent.press(screen.getByTestId('settings-privacy'));
  expect(open).toHaveBeenCalledWith('https://household-finance-mobile.web.app/privacy');
  fireEvent.press(screen.getByTestId('settings-delete-account'));
  expect(open).toHaveBeenCalledWith('https://household-finance-mobile.web.app/delete-account');
}, 30000);

test('a question opens in place and closes again', async () => {
  const HelpFaqScreen = require('../src/screens/HelpFaqScreen').default;
  render(<ThemeProvider><HelpFaqScreen /></ThemeProvider>);
  const q = 'What is Left to Spend?';
  expect(screen.queryByTestId(`help-a-${q}`)).toBeNull();
  fireEvent.press(screen.getByTestId(`help-q-${q}`));
  expect(screen.getByTestId(`help-a-${q}`)).toBeTruthy();
  fireEvent.press(screen.getByTestId(`help-q-${q}`));
  expect(screen.queryByTestId(`help-a-${q}`)).toBeNull();
});

test('search narrows the questions; nonsense shows the "no answers" note', async () => {
  const HelpFaqScreen = require('../src/screens/HelpFaqScreen').default;
  render(<ThemeProvider><HelpFaqScreen /></ThemeProvider>);
  fireEvent.changeText(screen.getByTestId('help-search'), 'undo');
  expect(screen.getByTestId('help-q-I made a mistake on a payment. Can I undo it?')).toBeTruthy();
  expect(screen.queryByTestId('help-q-What is Left to Spend?')).toBeNull();
  fireEvent.changeText(screen.getByTestId('help-search'), 'zzzz');
  expect(screen.getByTestId('help-none')).toBeTruthy();
  expect(screen.getByTestId('help-contact')).toBeTruthy();
});

test('the "New" tag on Help & FAQ goes away once it has been opened', async () => {
  mockModel = defaultModel();
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.removeItem('helpFaqSeenV1');
  require('../src/helpSeen').resetHelpSeenForTests();
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => {});
  expect(screen.getByText('New')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('settings-help-faq')); });
  expect(screen.queryByText('New')).toBeNull();
  expect(await AsyncStorage.getItem('helpFaqSeenV1')).toBe('1');
}, 30000);
