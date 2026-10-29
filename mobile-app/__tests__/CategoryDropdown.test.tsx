import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-46 (Cath, 2026-10-29, canvas E2): the category is a real dropdown (a list from the bottom)
// and is guessed and preselected ("Suggested"); she only changes it if it's wrong.
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

test('typing a name you used before preselects its category, marked Suggested; picking another clears it', async () => {
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, cash: [{ id: 'c1', name: 'Cash', amount: 5000 }] };
  mockModel.manualTransactions = [{ id: 'a', date: '2026-10-20', label: 'Jollibee', amount: 250, direction: 'out', category: 'Food', createdAt: 2 }, { id: 'b', date: '2026-10-21', label: 'Meralco', amount: 2000, direction: 'out', category: 'Utilities', createdAt: 3 }];
  const TransactionsScreen = require('../src/screens/TransactionsScreen').default;
  render(<ThemeProvider><TransactionsScreen formOnly addNonceProp={1} /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.changeText(screen.getByTestId('txn-label-input'), 'Jollibee'); });
  expect(screen.getByTestId('txn-category-row-tag').props.children).toBe('Suggested');
  expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
  // The row opens a list from the bottom; picking another closes it and drops "Suggested".
  await act(async () => { fireEvent.press(screen.getByTestId('txn-category-row')); });
  expect(screen.getByTestId('txn-category-row-list')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('choice-Utilities')); });
  expect(screen.queryByTestId('txn-category-row-list')).toBeNull();
  expect(screen.queryByTestId('txn-category-row-tag')).toBeNull();
});
