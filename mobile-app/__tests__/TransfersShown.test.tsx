import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (canvas T1): money moved between your own accounts shows in
// Transactions with its note, never counted as spending, and has its own page.
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



function withTransfer() {
  const m: any = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, cash: [{ id: 'c1', name: 'Cash', amount: 1000 }], debit: [{ id: 'd1', name: 'BDO', amount: 5000 }] };
  m.manualTransactions = [{ id: 't1', date: '2026-10-20', label: 'Groceries', amount: 500, direction: 'out', owner: 'shared', category: 'Food', notes: '', paymentMethod: { type: 'cash', accountId: 'c1' } }];
  m.transfers = [{ id: 'x1', date: '2026-10-21', from: 'cash:c1', to: 'debit:d1', amount: 3000, note: 'Deposit at the branch' }];
  return m;
}

test('Transactions lists the transfer with its note; totals stay spending only', async () => {
  mockModel = withTransfer();
  mockParams = {};
  const Screen = require('../src/screens/TransactionsScreen').default;
  const r = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r.getByText('Moved: Cash → BDO')).toBeTruthy();
  expect(r.getByText('Deposit at the branch · not spending')).toBeTruthy();
  // Out is the groceries only, never the ₱3,000 move.
  expect(r.queryByText(/3,500/)).toBeNull();
});

test('the transfer page shows from, to and the note', async () => {
  mockModel = withTransfer();
  mockParams = { id: 'x1' };
  const Screen = require('../src/screens/TransferDetailScreen').default;
  const r = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r.getByText('Cash')).toBeTruthy();
  expect(r.getByText('BDO')).toBeTruthy();
  expect(r.getByText('Deposit at the branch')).toBeTruthy();
});

test('Undo: shown for a new move; an older move says why it cannot be undone', async () => {
  mockModel = withTransfer();
  mockModel.transfers[0].createdAt = Date.now();
  mockParams = { id: 'x1' };
  const Screen = require('../src/screens/TransferDetailScreen').default;
  const r = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r.getByTestId('transfer-undo')).toBeTruthy();
  r.unmount();
  mockModel = withTransfer();
  const r2 = render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(r2.queryByTestId('transfer-undo')).toBeNull();
  expect(r2.getByTestId('transfer-undo-why')).toBeTruthy();
});
