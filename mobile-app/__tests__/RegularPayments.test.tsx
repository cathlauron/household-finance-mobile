import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (canvas P2, option B): money sent regularly that isn't a bill (monthly
// money for family) is a "Regular payment": its own section under Bills, Sent not Paid.
let mockModel: any;
const mockSaved: any[] = [];
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
    model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockSaved.push(m); }, isLinked: false, username: 'cath',
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



function household() {
  const m: any = defaultModel();
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  m.bills = [
    { id: 'b1', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: '28' }, priority: '', owner: 'shared', notes: '', cycles: [{ id: 'c1', dueDate: '2099-01-28', amountDue: 2350, amountPaid: '', paidDate: '', notes: '' }] },
    { id: 'r1', name: 'For Mama', category: '', recurringType: 'monthly', dueDate: { day: String(end.getDate()) }, priority: '', owner: 'shared', notes: '', regular: true, cycles: [{ id: 'c2', dueDate: iso, amountDue: 5000, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  return m;
}

test('a regular payment has its own section, not with the bills', async () => {
  mockModel = household();
  mockParams = {};
  const Screen = require('../src/screens/BillsScreen').default;
  const r = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r.getByText('Regular payments')).toBeTruthy();
  expect(r.getByText('For Mama')).toBeTruthy();
  expect(r.getByText(/regular payments ₱5,000/)).toBeTruthy();
});

test('New bill > Regular payment: saved as a regular payment', async () => {
  mockModel = household();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, debit: [{ id: 'd1', name: 'BDO', amount: 9000 }] };
  mockParams = {};
  mockSaved.length = 0;
  const Screen = require('../src/screens/BillsScreen').default;
  const r = render(<ThemeProvider><Screen formOnly addCarry={{ amount: 3000, name: 'For Tita', nonce: 1 }} /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(r.getByTestId('bill-kind-regular')); });
  expect(r.getByText('New regular payment')).toBeTruthy();
  await act(async () => { fireEvent.press(r.getByTestId('simple-form-done')); });
  await act(async () => {});
  const saved = mockSaved.at(-1);
  expect(saved).toBeTruthy();
  const added = saved.bills.find((b: any) => b.name === 'For Tita');
  expect(added.regular).toBe(true);
});
