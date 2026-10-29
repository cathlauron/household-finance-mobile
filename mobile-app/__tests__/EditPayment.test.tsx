import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-48 (Cath, 2026-10-29, canvas C1-C3): Undo only for 15 minutes after logging; after that,
// tap a payment to edit it (receipt, a higher amount, date, account). Never lower.
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
    model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockSaved.push(m); mockModel = m; }, isLinked: false, username: 'cath',
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



jest.mock('../src/components/BottomSheet', () => ({ __esModule: true, default: ({ visible, header, children }: any) => (visible ? <>{header}{children}</> : null), startSheetHandoff: () => {} }));

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d); })();
function loanWith(createdAt: number) {
  const m: any = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: '2020-01-01', debit: [{ id: 'mb', name: 'Maribank', amount: 90000 }] };
  m.loans = [{ id: 'o', name: 'Olive', direction: 'borrowed', totalAmount: 1200000, expectedPayment: 24550, recurringType: 'monthly', dueDate: { day: '16' },
    actualPayments: [{ id: 'p1', date: yesterday, actual: 24550, paymentMethod: { type: 'debit', accountId: 'mb' }, createdAt }] }];
  return m;
}
function draw() {
  const Screen = require('../src/screens/PayDetailScreen').default;
  return render(<ThemeProvider><Screen /></ThemeProvider>);
}

test('Undo shows for 15 minutes after logging, with how long is left', async () => {
  mockModel = loanWith(Date.now() - 2 * 60000);
  mockParams = { kind: 'loan', id: 'o' };
  draw();
  await act(async () => {});
  expect(screen.getByTestId('loan-undo')).toBeTruthy();
  expect(screen.getByTestId('loan-undo-note').props.children.join('')).toMatch(/13 more minutes/);
});

test('after 15 minutes there is no Undo; tapping the payment opens Edit payment', async () => {
  mockModel = loanWith(Date.now() - 20 * 60000);
  mockParams = { kind: 'loan', id: 'o' };
  draw();
  await act(async () => {});
  expect(screen.queryByTestId('loan-undo')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByTestId('loan-payment-row-p1')); });
  expect(screen.getByTestId('pay-edit-note')).toBeTruthy();
  expect(screen.getByText('Edit payment')).toBeTruthy();
});

test('Edit payment: a lower amount is refused; a higher one is saved', async () => {
  mockModel = loanWith(Date.now() - 20 * 60000);
  mockParams = { kind: 'loan', id: 'o' };
  mockSaved.length = 0;
  draw();
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByTestId('loan-payment-row-p1')); });
  const { TextInput } = require('react-native');
  const box = screen.UNSAFE_getAllByType(TextInput)[0];
  await act(async () => { fireEvent.changeText(box, '20000'); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(mockSaved).toHaveLength(0);
  expect(screen.getByText(/can't be less than/)).toBeTruthy();
  await act(async () => { fireEvent.changeText(box, '25000'); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(mockSaved).toHaveLength(1);
  expect(mockSaved[0].loans[0].actualPayments[0].actual).toBe(25000);
});
