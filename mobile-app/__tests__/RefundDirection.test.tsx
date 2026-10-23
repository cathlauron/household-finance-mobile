import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-16 (2026-10-22): editing an expense that was waiting for a refund and switching it to
// Money in kept the "refund expected" on it, so an income showed a refund badge and
// "Mark refund received" could add the money a second time.
const mockSaveModel = jest.fn(async () => {});
let mockModel: any;
// The real data layer talks to Firebase; this check only needs the form, so it gets a
// stand-in with a household and a save that is counted.
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: mockSaveModel, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test('switching an expense with an expected refund to Money in drops the refund', async () => {
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Cash', amount: 5000 }] };
  mockModel.manualTransactions = [
    { id: 't1', date: '2026-10-20', label: 'Shoes', amount: 1500, direction: 'out', owner: 'shared', category: 'Shopping', notes: '', paymentMethod: { type: 'cash', accountId: 'c1' }, refundExpectedAmount: 1500 },
  ];
  const TransactionsScreen = require('../src/screens/TransactionsScreen').default;
  render(
    <ThemeProvider>
      <TransactionsScreen formOnly editTxnId="t1" />
    </ThemeProvider>,
  );
  await act(async () => {});
  fireEvent.press(screen.getByText('Money in'));
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByTestId('txn-save'));
  });
  expect(mockSaveModel).toHaveBeenCalledTimes(1);
  const saved = (mockSaveModel.mock.calls[0] as any)[0].manualTransactions.find((t: any) => t.id === 't1');
  expect(saved.direction).toBe('in');
  expect(saved.refundExpectedAmount).toBeUndefined();
});
