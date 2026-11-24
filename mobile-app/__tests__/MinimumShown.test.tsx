import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-24 (mockup three-updates, part 3, approved): a debt with "Pay at least" shows
// the minimum on its due date and in To-Pay › Debts, with "of" the full amount under it.
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
  useRoute: () => ({ name: 'Debts', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

beforeEach(() => {
  const m: any = defaultModel();
  const t = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  m.debts = [
    { id: 'l', creditorOrPerson: 'Tita Lorna', category: '', recurringType: 'onetime', dueDate: { date: iso(t) }, notes: '', owner: 'shared', minPayment: 1000, cycles: [{ id: 'c1', dueDate: iso(t), amountDue: 5000, amountPaid: '', paidDate: '', notes: '' }] },
    { id: 'k', creditorOrPerson: 'Kuya', category: '', recurringType: 'onetime', dueDate: {}, notes: '', owner: 'shared', cycles: [{ id: 'c2', dueDate: '', amountDue: 800, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  mockModel = m;
});

test('To-Pay › Debts: the minimum, "of" the full amount, and the minimums in Still to pay', async () => {
  const Screen = require('../src/screens/DebtsScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getAllByText('₱1,000.00').length).toBe(2); // the row, and Still to pay (the card counts up to it)
  expect(screen.getByText('of ₱5,000.00')).toBeTruthy();
  expect(screen.getByText(/^Due .* · pay at least$/)).toBeTruthy();
  expect(screen.getByText('minimums · ₱5,000.00 in all')).toBeTruthy();
  expect(screen.getByTestId('debt-row-k').props.accessibilityLabel).toMatch(/₱800.00/); // no minimum: as before
}, 30000);

test('Calendar: the day it is due shows the minimum and "of" the full amount', () => {
  const { calendarRowParts } = require('../src/screens/CalendarScreen');
  const ev = { type: 'debt', label: 'Tita Lorna', amount: 1000, full: 5000, id: 'l' };
  expect(calendarRowParts(ev)).toEqual({ sub: 'Debt · minimum', of: 'of ₱5,000.00' });
  expect(calendarRowParts({ type: 'debt', label: 'Kuya', amount: 800, id: 'k' })).toEqual({ sub: 'Debt payment', of: '' });
});
