import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (canvas I1): Plan > Investments: worth now, put in, and the page draws.
let mockModel: any;
let mockParams: any = {};
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
jest.mock('../src/pushNotifications', () => ({ ...jest.requireActual('../src/pushNotifications'), rescheduleBillNotifications: async () => {} }));
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({
    model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath',
    storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null,
    isOnline: true, guest: false, refreshModel: async () => 'up_to_date',
  }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'X', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));




test('the Investments page shows what they are worth and what was put in', async () => {
  const m: any = defaultModel();
  m.investments = [
    { id: 'i1', name: 'Pag-IBIG MP2', kind: 'mp2', entries: [{ id: 'a', date: '2026-01-01', type: 'add', amount: 60000 }, { id: 'v', date: '2026-10-01', type: 'value', amount: 64180 }] },
    { id: 'i2', name: 'Stocks (COL)', kind: 'stocks', entries: [{ id: 'b', date: '2026-02-01', type: 'add', amount: 50000 }, { id: 'w', date: '2026-10-24', type: 'value', amount: 48240 }] },
  ];
  mockModel = m;
  mockParams = {};
  const Screen = require('../src/screens/InvestmentsScreen').default;
  const r = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r.getByTestId('investments-worth').props.children).toBe('₱112,420.00');
  expect(r.getByText(/You put in ₱110,000.00/)).toBeTruthy();
  expect(r.getByText('Pag-IBIG MP2')).toBeTruthy();
  expect(r.getByText('+₱4,180.00')).toBeTruthy();
  expect(r.getByText('−₱1,760.00')).toBeTruthy();
});
