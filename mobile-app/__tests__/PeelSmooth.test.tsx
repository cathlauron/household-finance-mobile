import React from 'react';
import { act, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';
// Cath's phone video 2026-10-30 (Dark mode peel not smooth): the sticker froze half peeled
// while the screen copy was being drawn, the screen jumped in late, the copy sat higher than
// the page, and stickers in the copy showed both faces ("Daght") or a pink corner.
let mockModel: any;
const mockSave = jest.fn(async (m: any) => { mockModel = m; });
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: mockSave, isLinked: false, username: 'cath', storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null }),
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
  useNavigation: () => ({ navigate: jest.fn(), push: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ name: 'SettingsPage', params: { subPage: 'look' } }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));


const { ScreenPeelHost } = require('../src/screenPeel');

test('the screen copy is ready (drawn, hidden) as soon as Appearance has opened, before any peel', async () => {
  mockModel = defaultModel();
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(<ThemeProvider><SettingsScreen /><ScreenPeelHost /></ThemeProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
  expect(screen.getByTestId('screen-peel-ready')).toBeTruthy();
}, 30000);

test('at rest a sticker draws only its top face: the one underneath and the lifted corner are hidden', async () => {
  mockModel = defaultModel();
  const AppearancePage = require('../src/screens/AppearancePage').default;
  render(<ThemeProvider><AppearancePage /></ThemeProvider>);
  // The groups that hold the face underneath (clipped to the sticker's own shape, id r…).
  const under = screen.UNSAFE_root.findAll((n: any) => typeof n.props?.clipPath === 'string' && /^url\(#r/.test(n.props.clipPath) && typeof n.type !== 'string');
  expect(under.length).toBeGreaterThan(0);
  for (const g of under) {
    const ap: any = g.props.animatedProps;
    const op = ap?.initial?.value?.opacity ?? g.props.opacity;
    expect(op).toBe(0);
  }
});
