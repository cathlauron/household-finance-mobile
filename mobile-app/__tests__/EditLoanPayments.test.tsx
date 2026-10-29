import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-50 (Cath, 2026-10-29, canvas D2): inside Edit loan, "Log a payment" opens the usual pay
// sheet and tapping a payment opens Edit payment; both save straight away.
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
function loanModel() {
  const m: any = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: '2020-01-01', debit: [{ id: 'mb', name: 'Maribank', amount: 90000 }] };
  m.loans = [{ id: 'o', name: 'Olive', direction: 'borrowed', totalAmount: 1200000, expectedPayment: 24550, recurringType: 'monthly', dueDate: { day: '16' },
    actualPayments: [{ id: 'p1', date: yesterday, actual: 24550, paymentMethod: { type: 'debit', accountId: 'mb' }, createdAt: Date.now() - 3600000 }] }];
  return m;
}
function drawForm() {
  const LoansScreen = require('../src/screens/LoansScreen').default;
  return render(<ThemeProvider><LoansScreen formOnly openLoanId="o" /></ThemeProvider>);
}

test('Edit loan > tap a payment: Edit payment opens and a higher amount is saved now', async () => {
  mockModel = loanModel();
  mockSaved.length = 0;
  drawForm();
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByText(/1 logged/)); });
  await act(async () => { fireEvent.press(screen.getByTestId('loan-form-payment-p1')); });
  expect(screen.getByTestId('pay-edit-note')).toBeTruthy();
  await act(async () => { fireEvent.changeText(screen.getByTestId('pay-amount-input'), '25000'); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(mockSaved).toHaveLength(1);
  expect(mockSaved[0].loans[0].actualPayments[0].actual).toBe(25000);
});

test('Edit loan > Log a payment opens the pay sheet and saves the payment now', async () => {
  mockModel = loanModel();
  mockSaved.length = 0;
  drawForm();
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByText(/1 logged/)); });
  await act(async () => { fireEvent.press(screen.getByTestId('loan-form-log-payment')); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-mode-record')); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(mockSaved).toHaveLength(1);
  expect(mockSaved[0].loans[0].actualPayments).toHaveLength(2);
  expect(mockSaved[0].loans[0].actualPayments[1].recordedOnly).toBe(true);
});
