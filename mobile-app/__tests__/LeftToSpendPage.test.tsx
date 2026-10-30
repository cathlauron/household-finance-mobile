import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-54 (Cath, 2026-10-29, canvas L4): tapping Left to Spend shows why: the card, a "why"
// line, bars, every account, and every item still to go out before payday.
let mockModel: any;
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
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'LeftToSpend', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test('L4: why, bars, accounts and each item; a past-due bill is listed and makes it negative', async () => {
  const m: any = defaultModel();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const past = new Date(); past.setDate(past.getDate() - 3);
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: iso(new Date()), asOfAt: Date.now(), debit: [{ id: 'mb', name: 'Maribank', amount: 1000 }] };
  m.bills = [{ id: 'b', name: 'Meralco', category: '', recurringType: 'onetime', dueDate: { date: iso(past) }, priority: '', owner: '', notes: '', cycles: [{ id: 'c', dueDate: iso(past), amountDue: 2500, amountPaid: '', paidDate: '', notes: '' }] }];
  m.groceries = [{ id: 'g', item: 'Rice', plannedAmount: 300, actualAmount: '', purchased: false }];
  mockModel = m;
  const Screen = require('../src/screens/LeftToSpendScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByTestId('lts-why').props.children).toMatch(/You have ₱1,000.00\. Before payday ₱2,800.00 still goes out/);
  expect(screen.getByTestId('lts-bar-Past due')).toBeTruthy();
  expect(screen.getByTestId('lts-bar-Plans')).toBeTruthy();
  expect(screen.getByText('Maribank')).toBeTruthy();
  expect(screen.getByText('Meralco')).toBeTruthy();
  expect(screen.getByText(/Past due · was due/)).toBeTruthy();
  expect(screen.getByText('Grocery list')).toBeTruthy();
  expect(screen.getByText('-₱1,800.00')).toBeTruthy(); // 1,000 − 2,500 − 300
}, 30000);
