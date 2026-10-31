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
  // Each under-face layer is a drawing clipped to the sticker (ru… / rp…) inside a view
  // that is see-through at rest.
  const clips = screen.UNSAFE_root.findAll((n: any) => typeof n.props?.clipPath === 'string' && /^url\(#r[up]/.test(n.props.clipPath) && typeof n.type !== 'string');
  expect(clips.length).toBe(14);
  for (const g of clips) {
    let v: any = g.parent;
    while (v && !(v.props?.style && JSON.stringify(v.props.style).includes('"position":"absolute"'))) v = v.parent;
    const flat = [].concat(v.props.style).flat(9).reduce((a: any, x: any) => ({ ...a, ...(x || {}) }), {});
    expect(flat.opacity).toBe(0);
  }
});

// B-081 (Cath's crash log 2026-10-30, "Underflow in restore" inside the drawing library):
// nothing inside a sticker's drawing may fade; only whole layers (ordinary views) do.
test('no fading groups inside a sticker drawing (the phone crash)', () => {
  const src = require('fs').readFileSync('src/components/PeelSticker.tsx', 'utf8');
  expect(src).not.toMatch(/createAnimatedComponent\(G\)/);
  expect(src).not.toMatch(/animatedProps=\{[a-zA-Z]*\}\s*clipPath|opacity: topOn\.value \}\)\);\s*\n\s*const topOffProps/);
});

test('while the screen is still turning over from a peel, Dark mode waits (a quick 2nd tap closed the app)', async () => {
  const { getByGestureTestId } = require('react-native-gesture-handler/jest-utils');
  const peel = require('../src/screenPeel');
  mockModel = defaultModel();
  const AppearancePage = require('../src/screens/AppearancePage').default;
  render(<ThemeProvider><AppearancePage getFrame={async () => ({ y: 0, height: 800, scrollY: 0, padTop: 16, padX: 12 })} /></ThemeProvider>);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  expect(getByGestureTestId('settings-theme-dark-tap').config.enabled).toBe(true);
  await act(async () => { peel.showScreenPeel(null, true); peel.endScreenPeel(true); });
  expect(getByGestureTestId('settings-theme-dark-tap').config.enabled).toBe(false);
  // Not greyed out meanwhile.
  expect(screen.getByTestId('settings-theme-dark').props.style.opacity).toBe(1);
  await act(async () => { peel.releaseScreenPeel(); });
  expect(getByGestureTestId('settings-theme-dark-tap').config.enabled).toBe(true);
});

// Cath's screenshot 2026-10-30: after ~4 quick taps the Dark mode sticker stayed half cut and blank.
test('at rest the sticker is always drawn whole, and a peel always finishes', () => {
  const src = require('fs').readFileSync('src/components/PeelSticker.tsx', 'utf8');
  expect(src).toMatch(/d: busy\.value \? pathOf\(stickerPeel\(W, H, \[px\.value, py\.value\]\)\.keep, PAD, PAD\) : flatKeep/);
  expect(src).not.toMatch(/if \(ok\) done\(\)/);
});
