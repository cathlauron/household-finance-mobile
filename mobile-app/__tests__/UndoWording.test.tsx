import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (phone): a payment logged today but dated in the past said "Undo today's
// payment" (and "Paid today"); a loan with Oct 16 unpaid said "next Nov 16"; and catching
// up on several past payments hid "Log payment" after the first one.
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



const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
function monthsAgo(n: number, day = 16) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); d.setDate(day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const short = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function draw() {
  const Screen = require('../src/screens/PayDetailScreen').default;
  return render(<ThemeProvider><Screen /></ThemeProvider>);
}

test('a loan payment logged today for a past date: Undo names that date; Log payment stays while one is past due', async () => {
  const m: any = defaultModel();
  const old = [4, 3, 2].map((n, i) => ({ id: `p${i}`, date: monthsAgo(n), actual: 7000, paymentMethod: { type: 'cash' } }));
  const backDated = { id: 'pb', date: monthsAgo(2 - 1 + 0, 16), actual: 7000, recordedOnly: true, createdAt: Date.now() };
  // Paid 4, 3 and 2 months ago, and (logged today) last month: nothing for this month
  // or later yet; with day 1 this month's date has passed.
  m.loans = [{ id: 'l1', name: 'Miduri', direction: 'borrowed', totalAmount: 200001, expectedPayment: 7000, recurringType: 'monthly', dueDate: { day: '1' },
    actualPayments: [...old.map((p) => ({ ...p, date: p.date.slice(0, 8) + '01' })), { ...backDated, date: backDated.date.slice(0, 8) + '01' }] }];
  mockModel = m;
  mockParams = { kind: 'loan', id: 'l1' };
  const r = draw();
  await act(async () => {});
  const lastDate = m.loans[0].actualPayments[3].date;
  expect(r.getByTestId('loan-undo').props.children).toBe(`Undo the ${short(lastDate)} payment`);
  // This month's payment (the 1st) is past due, so Log payment is still there.
  if (TODAY.slice(8) !== '01') {
    expect(r.getByText(/^Log payment/)).toBeTruthy();
    expect(r.getByText(new RegExp(`next ${short(TODAY.slice(0, 8) + '01')}`))).toBeTruthy();
  }
});

test('a bill paid today for an earlier date says that date, not "today"', async () => {
  const m: any = defaultModel();
  const paidOn = monthsAgo(0, 1) === TODAY ? monthsAgo(1, 28) : monthsAgo(0, 1);
  m.bills = [{ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '1' }, cycles: [
    { id: 'c1', dueDate: paidOn, amountDue: 2300, amountPaid: 2300, paidDate: paidOn, paidAt: Date.now(), paymentMethod: { type: 'cash' } },
    { id: 'c2', dueDate: monthsAgo(-1, 1), amountDue: 2300, amountPaid: '', paidDate: '' },
  ] }];
  mockModel = m;
  mockParams = { kind: 'bill', id: 'b1' };
  const r = draw();
  await act(async () => {});
  expect(r.getByTestId('pay-detail-undo').props.children).toBe(`Undo the ${short(paidOn)} payment`);
  expect(r.queryByText(/Paid today/)).toBeNull();
});
