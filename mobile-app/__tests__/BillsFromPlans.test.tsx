import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-03 (mockup P2): trip budget items with a due date show on To-Pay's Bills under
// "From your plans", and those due this month count in "Still to pay this month".
let mockModel: any;
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
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Bills', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

test('P2: trip items due show under From your plans, and count in Still to pay this month', async () => {
  const m: any = defaultModel();
  const t = new Date();
  // Today, so it is always "this month" whatever day the check runs.
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  m.travel = [{ id: 'bkk', name: 'BKK', startDate: '2099-01-01', endDate: '2099-01-05', checklist: [
    { id: 'h', title: 'Hotel balance', cost: 12000, checked: false, dueDate: today },
    { id: 'p', title: 'Plane tickets', cost: 18800, checked: false },
  ] }];
  mockModel = m;
  const Screen = require('../src/screens/BillsScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText('From your plans')).toBeTruthy();
  expect(screen.getByText('Hotel balance')).toBeTruthy();
  expect(screen.queryByText('Plane tickets')).toBeNull(); // no due date: stays on the trip only
  expect(screen.getByText(/From your plans ₱12,000/)).toBeTruthy();
  const { fireEvent } = require('@testing-library/react-native');
  fireEvent.press(screen.getByTestId('bills-plan-h'));
  expect(mockNavigate).toHaveBeenCalledWith('Travel', { tripId: 'bkk' });
}, 30000);
