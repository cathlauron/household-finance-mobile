import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-13 (mockups money-batch-4 and 5): Borrowed in the transaction form (option B), a
// form that keeps what was typed, and typing in a wallet's own currency.
let mockModel: any;
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
  useRoute: () => ({ name: 'Transactions', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));
jest.mock('../src/components/OfflineBanner', () => ({ __esModule: true, default: () => null, OfflineCloud: () => null }));

const settle = () => act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); });
let nonce = 1;
let view: ReturnType<typeof render> | null = null;
async function openForm() {
  const Screen = require('../src/screens/TransactionsScreen').default;
  const el = <ThemeProvider><Screen formOnly addNonceProp={++nonce} onFormClosed={() => {}} onAdded={() => {}} /></ThemeProvider>;
  if (view) view.rerender(el);
  else view = render(el);
  await settle();
}
const type = (testID: string, text: string) => act(async () => { fireEvent.changeText(screen.getByTestId(testID), text); });
const press = (testID: string) => act(async () => { fireEvent.press(screen.getByTestId(testID)); });
const amount = (text: string) => act(async () => { fireEvent.changeText(screen.UNSAFE_getAllByProps({ keyboardType: 'decimal-pad' })[0], text); });
const tapOutside = () => act(async () => { fireEvent.press(screen.getAllByLabelText('Close bottom sheet').pop()!); });

beforeEach(async () => {
  mockSaved.length = 0;
  view = null;
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, asOfDate: '2026-01-01', cash: [{ id: 'c1', name: 'Cash', amount: 1200 }, { id: 'w1', name: 'Cash (THB)', amount: 3480, currency: 'THB', fxRate: 1.74 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 12340 }], credit: [] };
  await require('../src/drafts').drafts.clear('txn');
});

// Cath, 2026-11-14: Debt comes before Loan, the same order as To-Pay, and Debt is the one picked.
test('Borrowed: Debt is first and already picked, like To-Pay', async () => {
  await openForm();
  await press('txn-dir-borrowed');
  expect(screen.getAllByTestId(/^txn-borrowed-/).map((n) => n.props.testID)).toEqual(['txn-borrowed-debt', 'txn-borrowed-loan']);
  expect(screen.getByText(/Added to To-Pay › Debts/)).toBeTruthy();
}, 30000);

test('Borrowed is a third switch, and Add makes the money in and the loan', async () => {
  await openForm();
  await press('txn-dir-borrowed');
  await press('txn-borrowed-loan');
  expect(screen.queryByText('What is it?')).toBeNull();
  expect(screen.getAllByText(/From whom/).length).toBeGreaterThan(0);
  await amount('5000');
  await type('txn-label-input', 'Ate Joy');
  await press('account-row-d1');
  await press('txn-save');
  await settle();
  const m = mockSaved.at(-1);
  expect(m.loans.at(-1)).toMatchObject({ name: 'Ate Joy', direction: 'borrowed', totalAmount: 5000 });
  expect(m.manualTransactions.at(-1)).toMatchObject({ label: 'Ate Joy', amount: 5000, direction: 'in', category: 'Borrowed', borrowed: { kind: 'loan', id: m.loans.at(-1).id } });
  expect(m.debts).toHaveLength(mockModel.debts.length);
}, 30000);

test('Borrowed as a debt lands in Debts', async () => {
  await openForm();
  await press('txn-dir-borrowed');
  await amount('800');
  await type('txn-label-input', 'Kuya');
  await press('account-row-c1');
  await press('txn-save');
  await settle();
  const m = mockSaved.at(-1);
  expect(m.debts.at(-1)).toMatchObject({ creditorOrPerson: 'Kuya' });
  expect(m.debts.at(-1).cycles[0].amountDue).toBe(800);
  expect(m.manualTransactions.at(-1).borrowed.kind).toBe('debt');
}, 30000);

test('Borrowed needs who it is from and an account', async () => {
  await openForm();
  await press('txn-dir-borrowed');
  await amount('800');
  await press('txn-save');
  await settle();
  expect(mockSaved).toHaveLength(0);
  expect(screen.getByText('Who lent it to you?')).toBeTruthy();
}, 30000);

test('a tap outside keeps what was typed, and the form opens with it', async () => {
  await openForm();
  await amount('450');
  await type('txn-label-input', '7-Eleven');
  await tapOutside();
  await settle();
  await openForm();
  expect(screen.getByTestId('draft-banner')).toBeTruthy();
  expect(screen.getByTestId('txn-label-input').props.value).toBe('7-Eleven');
  await press('account-row-c1');
  await press('txn-save');
  await settle();
  expect(mockSaved.at(-1).manualTransactions.at(-1)).toMatchObject({ label: '7-Eleven', amount: 450 });
  await openForm();
  expect(screen.queryByTestId('draft-banner')).toBeNull(); // Add used it up
  expect(screen.getByTestId('txn-label-input').props.value).toBe('');
}, 30000);

test('Cancel throws it away, and so does Start over', async () => {
  await openForm();
  await type('txn-label-input', 'Gone');
  await act(async () => { fireEvent.press(screen.getAllByText('Cancel').pop()!); });
  await settle();
  await openForm();
  expect(screen.queryByTestId('draft-banner')).toBeNull();
  expect(screen.getByTestId('txn-label-input').props.value).toBe('');
  await type('txn-label-input', 'Kept');
  await tapOutside();
  await settle();
  await openForm();
  await press('draft-start-over');
  await settle();
  expect(screen.queryByTestId('draft-banner')).toBeNull();
  expect(screen.getByTestId('txn-label-input').props.value).toBe('');
}, 30000);

test('an empty form closed by a tap outside leaves nothing behind', async () => {
  await openForm();
  await tapOutside();
  await settle();
  await openForm();
  expect(screen.queryByTestId('draft-banner')).toBeNull();
}, 30000);

test('paying from a baht wallet: typed in baht, saved in pesos with the baht kept', async () => {
  await openForm();
  await type('txn-label-input', 'Street food');
  await press('account-row-w1');
  expect(screen.getByTestId('txn-foreign-note')).toBeTruthy();
  await amount('150');
  await press('txn-save');
  await settle();
  expect(mockSaved.at(-1).manualTransactions.at(-1)).toMatchObject({ label: 'Street food', amount: 261, foreignAmount: 150, foreignCurrency: 'THB', paymentMethod: { type: 'cash', accountId: 'w1' } });
}, 30000);

test('a baht wallet cannot be overspent in baht either', async () => {
  await openForm();
  await type('txn-label-input', 'Too much');
  await press('account-row-w1');
  await amount('2500'); // 4,350 pesos, more than the 3,480 in it
  await press('txn-save');
  await settle();
  expect(mockSaved).toHaveLength(0);
}, 30000);

// Cath, 2026-11-14 (H-77): a transaction dated before the balances were last typed in asks,
// like paying a bill does: "It isn't included, take it off my balance".
describe('a transaction dated before the last balance update', () => {
  beforeEach(() => {
    mockModel.balanceAccounts = { ...mockModel.balanceAccounts, asOfDate: '2099-01-01', asOfAt: 1 };
  });
  const fill = async () => {
    await openForm();
    await amount('340');
    await type('txn-label-input', 'Old lunch');
    await press('account-row-d1');
  };
  test('not ticked: the balance stays as it is', async () => {
    await fill();
    expect(screen.getByText(/already in them/)).toBeTruthy();
    await press('txn-save');
    await settle();
    const m = mockSaved.at(-1);
    expect(m.balanceAccounts.debit[0].amount).toBe(12340);
    expect(m.manualTransactions.at(-1).offSaved).toBeUndefined();
  }, 30000);
  test('ticked: it comes off the balance', async () => {
    await fill();
    await press('txn-takeoff');
    await press('txn-save');
    await settle();
    const m = mockSaved.at(-1);
    expect(m.balanceAccounts.debit[0].amount).toBe(12000);
    expect(m.manualTransactions.at(-1)).toMatchObject({ label: 'Old lunch', offSaved: true });
  }, 30000);
  test('Borrowed, ticked: the money is added to the balance', async () => {
    await openForm();
    await press('txn-dir-borrowed');
    await amount('800');
    await type('txn-label-input', 'Kuya');
    await press('account-row-d1');
    expect(screen.getByText(/add it to my balance/)).toBeTruthy();
    await press('txn-takeoff');
    await press('txn-save');
    await settle();
    expect(mockSaved.at(-1).balanceAccounts.debit[0].amount).toBe(13140);
  }, 30000);
});

test('A transaction dated after the last balance update does not ask', async () => {
  await openForm();
  expect(screen.queryByTestId('txn-takeoff')).toBeNull();
}, 30000);

// Bug hunt 2026-11-14: a kept form can come back with an account that has been removed since.
// Money in was then saved into an account that is not there.
test('An account that is not there any more is never accepted', () => {
  const { accountProblem } = require('../src/components/AccountPicker');
  const gone = { type: 'debit', accountId: 'removed' };
  expect(accountProblem(mockModel, 'in', 500, gone)).toMatch(/Choose which account/);
  expect(accountProblem(mockModel, 'out', 500, gone)).toMatch(/Choose which account/);
  expect(accountProblem(mockModel, 'in', 500, { type: 'debit', accountId: 'd1' })).toBeNull();
});

// Cath, 2026-11-24 (H-87): editing a Borrowed transaction to Money out makes it money lent; once
// something was paid on it, the switch is locked.
async function editTxn(id: string) {
  const Screen = require('../src/screens/TransactionsScreen').default;
  render(<ThemeProvider><Screen formOnly editTxnId={id} onFormClosed={() => {}} /></ThemeProvider>);
  await settle();
}
test('Editing a Borrowed loan to Money out moves it to Loans › Lent', async () => {
  const { addBorrowed } = require('../src/borrowed');
  const b = addBorrowed(mockModel, { kind: 'loan', amount: 5000, from: 'Ate Joy', account: { type: 'debit', accountId: 'd1' }, date: '2026-11-20', now: 1 });
  mockModel = b.model;
  await editTxn(b.txnId);
  await press('txn-dir-out');
  await press('txn-save');
  await settle();
  const m = mockSaved.at(-1);
  expect(m.loans.find((l: any) => l.id === b.refId).direction).toBe('lent');
  expect(m.manualTransactions.find((t: any) => t.id === b.txnId)).toMatchObject({ direction: 'out', category: 'Lent' });
}, 30000);

test('Editing a Borrowed transaction already paid on: Money in / Money out is locked', async () => {
  const { addBorrowed } = require('../src/borrowed');
  const b = addBorrowed(mockModel, { kind: 'loan', amount: 5000, from: 'Ate Joy', account: { type: 'debit', accountId: 'd1' }, date: '2026-11-20', now: 1 });
  b.model.loans = b.model.loans.map((l: any) => ({ ...l, actualPayments: [{ id: 'p', date: '2026-11-21', actual: 500 }] }));
  mockModel = b.model;
  await editTxn(b.txnId);
  expect(screen.queryByTestId('txn-dir-out')).toBeNull();
  expect(screen.getByText(/already paid on/i)).toBeTruthy();
}, 30000);
