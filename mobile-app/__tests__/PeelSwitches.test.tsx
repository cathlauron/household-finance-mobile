import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';
import PeelSticker from '../src/components/PeelSticker';

// Peel-off switches (mockup K2e, Cath 2026-10-29): Appearance's on/off settings are stickers;
// Theme is "Match my phone" + "Dark mode" (Dark is greyed out while Match my phone is on).
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

const checked = (id: string) => screen.getByTestId(id).props.accessibilityState;

async function openAppearance() {
  mockModel = defaultModel();
  const SettingsScreen = require('../src/screens/SettingsScreen').default;
  render(<ThemeProvider><SettingsScreen /></ThemeProvider>);
  await act(async () => {});
}

test('Appearance shows every on/off setting as a sticker, and no 3-way Theme switch', async () => {
  await openAppearance();
  for (const id of ['settings-theme-match', 'settings-theme-dark', 'settings-sky-glow', 'settings-live-weather', 'settings-rain-anim', 'settings-mood-colors', 'settings-falling-leaves']) {
    expect(screen.getByTestId(id).props.accessibilityRole).toBe('switch');
  }
  expect(screen.queryByText('Auto')).toBeNull();
  expect(screen.getByText('Match my phone')).toBeTruthy();
}, 30000);

test('turning on Dark mode, then Match my phone greys out Dark mode', async () => {
  await openAppearance();
  expect(checked('settings-theme-dark')).toEqual({ checked: false, disabled: false });
  await act(async () => { fireEvent(screen.getByTestId('settings-theme-dark'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } }); });
  expect(checked('settings-theme-dark').checked).toBe(true);
  await act(async () => { fireEvent(screen.getByTestId('settings-theme-match'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } }); });
  expect(checked('settings-theme-match').checked).toBe(true);
  expect(checked('settings-theme-dark').disabled).toBe(true);
}, 30000);

// Day & night (Cath, 2026-10-31, mockup D3): a third Theme sticker. Turning it on turns Match my
// phone off and greys out Dark mode, which then says what decides it.
test('Day & night sticker: on turns Match my phone off and greys out Dark mode', async () => {
  await require('@react-native-async-storage/async-storage').removeItem('colorModePreference'); // (an earlier check saved Match my phone)
  await openAppearance();
  await act(async () => { fireEvent(screen.getByTestId('settings-theme-match'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } }); });
  expect(checked('settings-theme-match').checked).toBe(true);
  await act(async () => { fireEvent(screen.getByTestId('settings-theme-daynight'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } }); });
  expect(checked('settings-theme-daynight').checked).toBe(true);
  expect(checked('settings-theme-match').checked).toBe(false);
  expect(checked('settings-theme-dark').disabled).toBe(true);
  expect(screen.getByText(/^Set by Day & night: (on|off) until /)).toBeTruthy();
  expect(screen.getByText(/^Today: dark from /)).toBeTruthy();
}, 30000);

test('a setting sticker saves the setting (Falling leaves off, then on again)', async () => {
  await openAppearance();
  expect(checked('settings-falling-leaves').checked).toBe(true);
  await act(async () => { fireEvent(screen.getByTestId('settings-falling-leaves'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } }); });
  expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ settings: expect.objectContaining({ fallingLeavesEnabled: false }) }));
}, 30000);

function Harness({ start = false, onFlip }: { start?: boolean; onFlip: (on: boolean) => void }) {
  const [on, setOn] = React.useState(start);
  return (
    <PeelSticker
      testID="s"
      accessibilityLabel="Test"
      value={on}
      onChange={(v) => {
        onFlip(v);
        setOn(v);
      }}
    />
  );
}
const drag = (dx: number, dy: number) =>
  fireGestureHandler(getByGestureTestId('s-pan'), [
    { state: State.BEGAN, translationX: 0, translationY: 0 },
    { state: State.ACTIVE, translationX: dx / 2, translationY: dy / 2 },
    { state: State.ACTIVE, translationX: dx, translationY: dy },
    { state: State.END, translationX: dx, translationY: dy },
  ]);
const wait = () => act(async () => { jest.advanceTimersByTime(1500); await Promise.resolve(); });

describe('peeling with a finger', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('past halfway it comes off and turns the setting on', async () => {
    const flips: boolean[] = [];
    render(<ThemeProvider><Harness onFlip={(v) => flips.push(v)} /></ThemeProvider>);
    drag(-70, 30);
    await wait();
    expect(flips).toEqual([true]);
    expect(checked('s').checked).toBe(true);
  });

  test('before halfway it settles back and nothing changes', async () => {
    const flips: boolean[] = [];
    render(<ThemeProvider><Harness onFlip={(v) => flips.push(v)} /></ThemeProvider>);
    drag(-20, 8);
    await wait();
    expect(flips).toEqual([]);
    expect(checked('s').checked).toBe(false);
  });

  test('the green "On" sticker peels off the same way to turn it off', async () => {
    const flips: boolean[] = [];
    render(<ThemeProvider><Harness start onFlip={(v) => flips.push(v)} /></ThemeProvider>);
    drag(-70, 30);
    await wait();
    expect(flips).toEqual([false]);
  });

  test('a tap is one steady peel', async () => {
    const flips: boolean[] = [];
    render(<ThemeProvider><Harness onFlip={(v) => flips.push(v)} /></ThemeProvider>);
    fireGestureHandler(getByGestureTestId('s-tap'), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]);
    await wait();
    expect(flips).toEqual([true]);
  });
});
