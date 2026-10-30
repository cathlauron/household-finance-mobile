import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-40 + H-41 (Cath, 2026-10-29, canvas A2): Debts shows what's paid (like Bills), the
// still-to-pay-this-month total, and a separate total for debts with no due date.
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

test('A2: paid this month shows, with the no-due-date total', async () => {
  const m: any = defaultModel();
  const t = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const next = new Date(t.getFullYear(), t.getMonth() + 1, Math.min(t.getDate(), 28));
  m.debts = [
    { id: 'a', creditorOrPerson: 'Atome', category: '', recurringType: 'monthly', dueDate: { day: String(t.getDate()) }, notes: '', owner: 'shared',
      cycles: [{ id: 'c1', dueDate: iso(t), amountDue: 1850, amountPaid: 1850, paidDate: iso(t), notes: '' }, { id: 'c2', dueDate: iso(next), amountDue: 1850, amountPaid: '', paidDate: '', notes: '' }] },
    { id: 'k', creditorOrPerson: 'Kuya Ben', category: '', recurringType: 'onetime', dueDate: {}, notes: '', owner: 'shared', cycles: [{ id: 'c3', dueDate: '', amountDue: 3000, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  mockModel = m;
  const Screen = require('../src/screens/DebtsScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getAllByText('Paid this month', { exact: false }).length).toBe(2); // the card's line and the section
  expect(screen.getByTestId('debt-paid-row-a')).toBeTruthy();
  expect(screen.getAllByText('No due date', { exact: false }).length).toBe(2);
  expect(screen.getByTestId('debts-no-date-total').props.children).toBe('₱3,000.00');
  expect(screen.getByText('Still to pay this month')).toBeTruthy();
  // H-45 (canvas B14): the paid row has its one line from the name to the amount; unpaid rows don't.
  expect(screen.getByTestId('debt-paid-row-a-paid-line')).toBeTruthy();
  expect(screen.queryByTestId('debt-row-k-paid-line')).toBeNull();
}, 30000);
