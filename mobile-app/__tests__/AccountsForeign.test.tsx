import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-14 (mockup accounts-foreign, parts 1 to 3): on the Accounts page a wallet in
// another currency shows and is edited in that currency, and one can be started from here.
let mockModel: any;
let mockParams: any = {};
const mockSaved: any[] = [];
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockSaved.push(m); mockModel = m; }, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Accounts', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));
jest.mock('../src/afterSlide', () => ({ afterSlide: (fn: () => void) => fn() }));

const settle = () => act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });
const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const press = (testID: string) => act(async () => { fireEvent.press(screen.getByTestId(testID)); });
const type = (testID: string, text: string) => act(async () => { fireEvent.changeText(screen.getByTestId(testID), text); });
const wallet = (m: any) => m.balanceAccounts.cash.find((a: any) => a.currency === 'THB');

async function openAccounts(params: any = {}) {
  mockParams = params;
  const Screen = require('../src/screens/AccountsScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await settle();
}
async function editWallet() {
  await openAccounts();
  await act(async () => { fireEvent(screen.getByLabelText(/^Cash \(THB\), /), 'longPress'); });
  await settle();
}

beforeEach(() => {
  mockSaved.length = 0;
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, asOfDate: '2026-01-01', asOfAt: 1, cash: [{ id: 'c1', name: 'Cash', amount: 1200 }, { id: 'w1', name: 'Cash (THB)', amount: 3480, currency: 'THB', fxRate: 1.74 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 12340 }], credit: [] };
  (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({ result: 'success', rates: { PHP: 0.38 } }) });
});

test('Accounts list: a foreign wallet is in its own currency, with the peso value and rate under it', async () => {
  await openAccounts();
  expect(screen.getByText('฿2,000')).toBeTruthy();
  expect(screen.getByText('about ₱3,480.00 · ฿1 = ₱1.74')).toBeTruthy();
  expect(screen.getByText('₱1,200.00')).toBeTruthy();
});

test('Editing a foreign wallet: the balance is typed in its currency and saved in pesos at its rate', async () => {
  await editWallet();
  expect(screen.getByTestId('account-balance').props.value).toBe('2,000');
  expect(screen.getByText(/Thai baht \(THB\)/)).toBeTruthy();
  await type('account-balance', '1500');
  expect(screen.getByTestId('account-peso-note').props.children.join('')).toMatch(/About ₱2,610.00/);
  await press('account-save');
  await settle();
  const w = wallet(mockSaved.at(-1));
  expect(w).toMatchObject({ amount: 2610, currency: 'THB', fxRate: 1.74 });
  expect(w.balanceLog[0]).toMatchObject({ from: 3480, to: 2610 });
});

test('Editing a foreign wallet: fixing the rate changes its peso value; changing nothing changes nothing', async () => {
  await editWallet();
  await type('account-rate', '1.8');
  await press('account-save');
  await settle();
  expect(wallet(mockSaved.at(-1))).toMatchObject({ amount: 3600, fxRate: 1.8 });
});

test('Editing a foreign wallet and only renaming it leaves its balance alone', async () => {
  await editWallet();
  await press('account-save');
  await settle();
  const w = wallet(mockSaved.at(-1));
  expect(w.amount).toBe(3480);
  expect(w.balanceLog).toBeUndefined();
});

test('A new cash account can be in another currency, with today\'s rate filled in', async () => {
  await openAccounts({ addNonce: 1 });
  await press('accounts-add-cash');
  await wait(320);
  await press('account-currency-row');
  await press('account-currency-JPY');
  await settle();
  expect(screen.getByTestId('account-rate').props.value).toBe('0.38');
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(/GCash/), 'Cash (JPY)'); });
  await type('account-balance', '12000');
  await press('account-save');
  await settle();
  expect(mockSaved.at(-1).balanceAccounts.cash.at(-1)).toMatchObject({ name: 'Cash (JPY)', currency: 'JPY', fxRate: 0.38, amount: 4560 });
});

test('A foreign wallet needs a rate', async () => {
  (globalThis as any).fetch = async () => { throw new Error('offline'); };
  await openAccounts({ addNonce: 1 });
  await press('accounts-add-cash');
  await wait(320);
  await press('account-currency-row');
  await press('account-currency-JPY');
  await settle();
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(/GCash/), 'Cash (JPY)'); });
  await type('account-balance', '12000');
  await press('account-save');
  await settle();
  expect(mockSaved).toHaveLength(0);
  expect(screen.getByText(/Type the exchange rate/)).toBeTruthy();
});

// Sweep 2026-11-14 (found by the click-through test): "Edit account" on an account's page
// opened with the balance as last typed in, not what the account has now. Saving, even only a
// new name, then set the balance back to that old number.
test('Edit account from its page starts from what the account has now, and a rename keeps it', async () => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  mockModel.manualTransactions = [{ id: 't', date: today, label: 'Lunch', amount: 340, direction: 'out', owner: 'shared', paymentMethod: { type: 'debit', accountId: 'd1' }, createdAt: Date.now() }];
  mockParams = {};
  const Screen = require('../src/screens/AccountsScreen').default;
  render(<ThemeProvider><Screen formOnly editGroup="debit" editAccountId="d1" /></ThemeProvider>);
  await settle();
  expect(screen.getByTestId('account-balance').props.value).toBe('12,000');
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(/GCash/), 'BPI'); });
  await press('account-save');
  await settle();
  const m = mockSaved.at(-1);
  expect(m.balanceAccounts.debit[0]).toMatchObject({ name: 'BPI', amount: 12340 });
  expect(m.balanceAccounts.asOfDate).toBe('2026-01-01');
});

// Bug hunt 2026-11-14: a second wallet in the same currency would never get the cash
// withdrawn in that currency (it goes to the first), and the two would hold different rates.
test('Only one wallet per currency', async () => {
  await openAccounts({ addNonce: 1 });
  await press('accounts-add-cash');
  await wait(320);
  await press('account-currency-row');
  await press('account-currency-THB');
  await settle();
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(/GCash/), 'More baht'); });
  await type('account-balance', '500');
  await type('account-rate', '1.7');
  await press('account-save');
  await settle();
  expect(mockSaved).toHaveLength(0);
  expect(screen.getByText(/already have a wallet in THB/)).toBeTruthy();
});

// Cath, 2026-11-24 (H-86): Home's eye covers the Accounts list too: no amount, no rate.
test('Accounts list: with the eye closed, no amount shows', async () => {
  const { hideAmountsNow } = require('../src/hideAmounts');
  await act(async () => { hideAmountsNow(); });
  await openAccounts();
  expect(screen.queryByText(/\d,\d{3}|\d\.\d{2}/)).toBeNull();
  expect(screen.getAllByText('₱ *****').length).toBeGreaterThan(3);
  expect(screen.getByLabelText(/^Cash \(THB\), /).props.accessibilityLabel).toBe('Cash (THB), amount hidden');
});
