import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-06 (speed): Transactions keeps a day's rows between saves. Whatever changes must
// still show straight away, and a change on one day must leave the other days' rows alone.
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
  useRoute: () => ({ name: 'Transactions', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

// Counts how often each row is drawn.
const mockDrawn: Record<string, number> = {};
jest.mock('../src/components/SwipeableRow', () => ({
  __esModule: true,
  default: ({ children, testID }: any) => {
    mockDrawn[testID] = (mockDrawn[testID] || 0) + 1;
    return children;
  },
}));

function household() {
  const m: any = defaultModel();
  const pm = { type: 'debit', accountId: 'd1' };
  m.balanceAccounts = { ...m.balanceAccounts, debit: [{ id: 'd1', name: 'Maribank', amount: 5000 }] };
  m.manualTransactions = [
    { id: 't1', date: '2026-11-06', label: 'Lunch', amount: 250, direction: 'out', category: 'Food', owner: 'shared', paymentMethod: pm, source: 'manual' },
    { id: 't2', date: '2026-11-05', label: 'Grab', amount: 186, direction: 'out', category: 'Transport', owner: 'shared', paymentMethod: pm, source: 'manual' },
  ];
  return m;
}

function shown() {
  const Screen = require('../src/screens/TransactionsScreen').default;
  return <ThemeProvider><Screen /></ThemeProvider>;
}
const change = (fn: (m: any) => any) => { mockModel = fn(mockModel); };
const editTxn = (id: string, over: object) => (m: any) => ({ ...m, manualTransactions: m.manualTransactions.map((t: any) => (t.id === id ? { ...t, ...over } : t)) });

test('edits, renames and removals show straight away', async () => {
  mockModel = household();
  const view = render(shown());
  await act(async () => {});
  expect(screen.getByText('Lunch')).toBeTruthy();

  change(editTxn('t1', { amount: 300, label: 'Dinner' }));
  view.rerender(shown());
  await act(async () => {});
  expect(screen.getByText('Dinner')).toBeTruthy();
  expect(screen.queryByText('Lunch')).toBeNull();
  expect(screen.getAllByText(/300\.00/).length).toBeGreaterThan(0);

  change((m) => ({ ...m, balanceAccounts: { ...m.balanceAccounts, debit: [{ id: 'd1', name: 'BPI', amount: 5000 }] } }));
  view.rerender(shown());
  await act(async () => {});
  expect(screen.getByText(/Food · BPI/)).toBeTruthy();

  change(editTxn('t1', { refundExpectedAmount: 100 }));
  view.rerender(shown());
  await act(async () => {});
  expect(screen.getByText(/Refund pending/)).toBeTruthy();

  change((m) => ({ ...m, manualTransactions: m.manualTransactions.filter((t: any) => t.id !== 't1') }));
  view.rerender(shown());
  await act(async () => {});
  expect(screen.queryByText('Dinner')).toBeNull();
  expect(screen.getByText('Grab')).toBeTruthy();
}, 30000);

test('saving on one day leaves the other day\'s rows alone', async () => {
  mockModel = household();
  const view = render(shown());
  await act(async () => {});
  const key = (id: string) => Object.keys(mockDrawn).find((k) => k.includes(id)) as string;
  const today = mockDrawn[key('t1')];
  const yesterday = mockDrawn[key('t2')];
  expect(today).toBeGreaterThan(0);
  change(editTxn('t1', { amount: 300 }));
  view.rerender(shown());
  await act(async () => {});
  expect(mockDrawn[key('t1')]).toBeGreaterThan(today);
  expect(mockDrawn[key('t2')]).toBe(yesterday);
}, 30000);
