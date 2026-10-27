import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-10 (2026-10-22): on the New transaction form, a quick second tap on Add (while the
// form closed) could add the same transaction twice.
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

test('tapping Add twice quickly saves the new transaction once', async () => {
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Cash', amount: 5000 }] };
  const TransactionsScreen = require('../src/screens/TransactionsScreen').default;
  render(
    <ThemeProvider>
      <TransactionsScreen formOnly addNonceProp={1} />
    </ThemeProvider>,
  );
  await act(async () => {});
  const amountBox = screen.UNSAFE_getAllByType(require('react-native').TextInput)[0];
  fireEvent.changeText(amountBox, '250');
  fireEvent.changeText(screen.getByTestId('txn-label-input'), 'Lunch');
  // Paid from: Cash.
  fireEvent.press(screen.getAllByText('Cash')[0]);
  await act(async () => {});
  const cash = screen.queryAllByText('Cash');
  if (cash.length > 1) fireEvent.press(cash[cash.length - 1]);
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByTestId('txn-save'));
  });
  await act(async () => {
    fireEvent.press(screen.getByTestId('txn-save'));
  });
  expect(mockSaveModel).toHaveBeenCalledTimes(1);
});
