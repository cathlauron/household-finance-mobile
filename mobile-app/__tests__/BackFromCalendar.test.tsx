import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Sweep 2026-11-06: a trip opened from the Calendar, To-Pay or Home took two Backs to get home
// (first the trip list), and pages opened from the Calendar named the wrong place on Back.
let mockModel: any;
let mockParams: any = {};
const mockListeners: Record<string, (e: any) => void> = {};
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: (n: string, l: any) => { mockListeners[n] = l; return () => {}; }, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Travel', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));
jest.mock('../src/components/OfflineBanner', () => ({ __esModule: true, default: () => null, OfflineCloud: () => null }));
jest.mock('../src/components/SkyGlow', () => () => null);

function household() {
  const m: any = defaultModel();
  m.travel = [{ id: 'tr1', name: 'Cebu', startDate: '2026-12-01', endDate: '2026-12-03', checklist: [], todos: [] }];
  return m;
}

test('a trip opened from another page goes straight back there', async () => {
  mockModel = household();
  mockParams = { tripId: 'tr1', backTitle: 'Calendar' };
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('travel-add-item')).toBeTruthy();
  const e = { preventDefault: jest.fn() };
  mockListeners.beforeRemove(e);
  expect(e.preventDefault).not.toHaveBeenCalled();
}, 30000);

test('a trip opened from the Travel list still goes back to the list', async () => {
  mockModel = household();
  mockParams = {};
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
  const e = { preventDefault: jest.fn() };
  mockListeners.beforeRemove(e);
  expect(e.preventDefault).toHaveBeenCalled();
}, 30000);

test('the top bar names the page you came from', () => {
  const LargeHeader = require('../src/navigation/LargeHeader').default;
  render(<ThemeProvider><LargeHeader navigation={{ goBack: jest.fn() }} route={{ name: 'Events', params: { backTitle: 'Calendar' } }} options={{ title: 'Events', headerBackTitle: 'Plan' }} back={{ title: 'x' }} /></ThemeProvider>);
  expect(screen.getByLabelText('Back to Calendar')).toBeTruthy();
});
