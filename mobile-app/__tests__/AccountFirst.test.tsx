import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-23: with no account yet, + for a transaction should take you to adding an
// account first (not a note), then back to the transaction with that account picked.
// Same with a salary: picking Salary with none set up goes to adding one, then back.
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: any = {};
let mockModel: any;
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, setOptions: jest.fn(), addListener: () => () => {}, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

async function openNewTransaction() {
  const TransactionsScreen = require('../src/screens/TransactionsScreen').default;
  render(
    <ThemeProvider>
      <TransactionsScreen formOnly addNonceProp={1} />
    </ThemeProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockParams = {};
  mockModel = defaultModel();
  require('../src/accountHandoff').cancelAccountHandoff();
});

test('no account yet: + goes to adding an account, not the transaction form', async () => {
  await openNewTransaction();
  expect(mockNavigate).toHaveBeenCalledWith('Accounts', expect.objectContaining({ addNonce: expect.any(Number) }));
  expect(screen.queryByTestId('txn-save')).toBeNull();
});

test('after the account is added: back to New transaction with it picked', async () => {
  await openNewTransaction();
  mockModel = { ...mockModel, balanceAccounts: { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Wallet', amount: 2000 }] } };
  const next = require('../src/accountHandoff').takeAccountHandoff();
  expect(next).toBeTruthy();
  await act(async () => next({ type: 'cash', accountId: 'c1' }));
  expect(screen.getByTestId('txn-save')).toBeTruthy();
  expect(screen.getByTestId('account-row-c1').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
});

test('with an account: + opens the transaction form straight away', async () => {
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Wallet', amount: 2000 }] };
  await openNewTransaction();
  expect(mockNavigate).not.toHaveBeenCalledWith('Accounts', expect.anything());
  expect(screen.getByTestId('txn-save')).toBeTruthy();
});

test('Money in › Salary with no salary set up: goes to adding a salary', async () => {
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Wallet', amount: 2000 }] };
  await openNewTransaction();
  fireEvent.press(screen.getByText('Money in'));
  await act(async () => {});
  fireEvent.press(screen.getByTestId('txn-kind-salary'));
  await act(async () => {});
  expect(mockNavigate).toHaveBeenCalledWith('Income', expect.objectContaining({ openAddNonce: expect.any(Number) }));
});

describe('Accounts, when sent here from New transaction', () => {
  async function openAccounts(params: any) {
    mockParams = params;
    const AccountsScreen = require('../src/screens/AccountsScreen').default;
    render(
      <ThemeProvider>
        <AccountsScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
  }

  test('opens "Add an account" (which kind?) straight away', async () => {
    jest.useFakeTimers();
    await openAccounts({ addNonce: 7 });
    act(() => jest.advanceTimersByTime(600));
    expect(screen.getByTestId('accounts-add-cash')).toBeTruthy();
    jest.useRealTimers();
  });

  test('after saving the new account, it goes back and hands the account over', async () => {
    jest.useFakeTimers();
    const handoff = require('../src/accountHandoff');
    const back = jest.fn();
    handoff.startAccountHandoff(back);
    await openAccounts({ addNonce: 8 });
    act(() => jest.advanceTimersByTime(600));
    fireEvent.press(screen.getByTestId('accounts-add-cash'));
    act(() => jest.advanceTimersByTime(400));
    fireEvent.changeText(screen.getByPlaceholderText('e.g. GCash, BPI Savings'), 'Wallet');
    await act(async () => {
      fireEvent.press(screen.getByText('Save'));
    });
    act(() => jest.advanceTimersByTime(1500));
    expect(mockGoBack).toHaveBeenCalled();
    expect(back).toHaveBeenCalledWith(expect.objectContaining({ type: 'cash', accountId: expect.any(String) }));
    jest.useRealTimers();
  });
});
