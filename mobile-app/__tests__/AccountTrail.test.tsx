import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-14 (mockup balance-before, Place A): the account's page says what the account
// had before and after each thing that moved it, money moves included.
let mockModel: any;
let mockParams: any = {};
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
  useRoute: () => ({ name: 'CardDetail', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

const settle = () => act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });
const now = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (back: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
const pm = { type: 'debit', accountId: 'd1' };

async function open(group: string, id: string) {
  mockParams = { group, id };
  const Screen = require('../src/screens/CardDetailScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await settle();
}

beforeEach(() => {
  mockModel = defaultModel();
  // 5,500 typed in a month ago; since then a bill, a payday and a move of 1,000 to Cash.
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, asOfDate: day(30), asOfAt: 1, cash: [{ id: 'c1', name: 'Cash', amount: 2200 }, { id: 'w1', name: 'Cash (THB)', amount: 3480, currency: 'THB', fxRate: 1.74 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 4500 }], credit: [] };
  mockModel.manualTransactions = [
    { id: 'm', date: day(4), label: 'Meralco', category: 'Utilities', amount: 2160, direction: 'out', owner: 'shared', paymentMethod: pm, createdAt: 100 },
    { id: 's', date: day(2), label: 'Salary', category: 'Income', amount: 10000, direction: 'in', owner: 'shared', paymentMethod: pm, createdAt: 200 },
    { id: 'f', date: day(0), label: 'Pad thai', category: 'Food', amount: 313.2, foreignAmount: 180, foreignCurrency: 'THB', direction: 'out', owner: 'shared', paymentMethod: { type: 'cash', accountId: 'w1' }, createdAt: 400 },
  ];
  mockModel.transfers = [{ id: 'x', date: day(1), from: 'debit:d1', to: 'cash:c1', amount: 1000, createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).getTime() }];
});

test('Account page: every row says the balance before and after, and money moves are listed', async () => {
  await open('debit', 'd1');
  expect(screen.getByTestId('trail-x').props.children.join('')).toBe('₱13,340.00 → ₱12,340.00');
  expect(screen.getByText('Moved to Cash')).toBeTruthy();
  expect(screen.getByTestId('trail-manual-s').props.children.join('')).toBe('₱3,340.00 → ₱13,340.00');
  expect(screen.getByTestId('trail-manual-m').props.children.join('')).toBe('₱5,500.00 → ₱3,340.00');
});

test('Account page: cash in another currency shows its before and after in that currency', async () => {
  await open('cash', 'w1');
  expect(screen.getByTestId('trail-manual-f').props.children.join('')).toBe('฿2,000 → ฿1,820');
  expect(screen.getByText('฿180')).toBeTruthy(); // spent this week, in baht too
});

// Sweep 2026-11-14: "See all" for an account left out its paydays and savings, and cash paid
// with no cash account picked showed under EVERY cash account (the balance counts it on the first).
test('See all for an account: paydays and savings are in, and loose cash belongs to the first cash account only', () => {
  const { idsForAccount } = require('../src/screens/CardDetailScreen');
  mockModel.income = [{ id: 'i', sourceName: 'Pay', frequency: 'monthly', paymentLog: [{ id: 'pl', date: day(3), amount: 4000, paymentMethod: pm, createdAt: 30 }] }];
  mockModel.savingsGoals = [{ id: 'g', name: 'Trip', contributions: [{ id: 'sc', date: day(3), amount: 500, paymentMethod: pm, createdAt: 40 }] }];
  mockModel.manualTransactions.push({ id: 'loose', date: day(1), label: 'Taho', amount: 20, direction: 'out', owner: 'shared', paymentMethod: { type: 'cash' }, createdAt: 500 });
  const bank = idsForAccount(mockModel, 'debit', 'd1');
  expect(bank.has('income-pl')).toBe(true);
  expect(bank.has('saving-sc')).toBe(true);
  expect(idsForAccount(mockModel, 'cash', 'c1').has('loose')).toBe(true);
  expect(idsForAccount(mockModel, 'cash', 'w1').has('loose')).toBe(false);
});

// Cath, 2026-11-14 (H-81): a bank or cash account is not called a card.
test('Account page: a bank account is called an account, a credit card a card', async () => {
  await open('debit', 'd1');
  expect(screen.getByText('spent from this account')).toBeTruthy();
  expect(screen.getByText('Edit account')).toBeTruthy();
  expect(screen.queryByText(/this card/)).toBeNull();
});

// Mockup accounts-foreign: a foreign wallet's typed-in balances are listed in its currency.
test('Account page: a foreign wallet lists its balance updates in its own currency', async () => {
  mockModel.balanceAccounts.cash[1] = { ...mockModel.balanceAccounts.cash[1], balanceLog: [{ at: Date.now() - 5000, from: 3654, to: 3480 }] };
  await open('cash', 'w1');
  expect(screen.getByText('฿2,100 → ฿2,000')).toBeTruthy();
});

// Keep this one last: the closed eye stays closed for the rest of the file.
// Cath, 2026-11-14 (H-80): Home's eye covers this page too.
test('Account page: with the eye closed, no amount shows', async () => {
  const { hideAmountsNow } = require('../src/hideAmounts');
  await act(async () => { hideAmountsNow(); });
  await open('debit', 'd1');
  expect(screen.queryByText(/\d,\d{3}/)).toBeNull();
  expect(screen.getByTestId('trail-manual-s').props.children.join('')).toBe('₱ ***** → ₱ *****');
  expect(screen.getAllByText('₱ *****').length).toBeGreaterThan(1);
});
