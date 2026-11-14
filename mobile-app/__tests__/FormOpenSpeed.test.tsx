import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-14 (H-76): "when a form is being opened, that is when most lag happens".
// The form on its own (+ on Home, + on the Calendar, Edit) is the whole Transactions screen
// with its list left out. It still grouped every day of the history and then redrew itself,
// form included, every 120 ms until all of those unseen days were "shown".
let mockModel: any;
let mockDraws = 0;
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
  useRoute: () => ({ name: 'Transactions', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));
jest.mock('../src/components/OfflineBanner', () => ({ __esModule: true, default: () => null, OfflineCloud: () => null }));
// Drawn once every time the screen draws itself: a counter for that.
jest.mock('../src/screens/CsvImportModal', () => ({ __esModule: true, default: () => { mockDraws++; return null; } }));

function yearOfSpending() {
  mockModel = defaultModel();
  mockModel.balanceAccounts = { ...mockModel.balanceAccounts, asOfDate: '2026-01-01', cash: [{ id: 'c1', name: 'Cash', amount: 1200 }], debit: [], credit: [] };
  // A year of spending: one thing a day.
  mockModel.manualTransactions = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(2026, 0, 1 + i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { id: 't' + i, date, label: 'Thing ' + i, amount: 100, direction: 'out', owner: 'shared', paymentMethod: { type: 'cash', accountId: 'c1' }, createdAt: i + 1 };
  });
}

test('The form on its own does not keep redrawing for a list it never shows', async () => {
  yearOfSpending();
  jest.useFakeTimers();
  try {
    const Screen = require('../src/screens/TransactionsScreen').default;
    render(<ThemeProvider><Screen formOnly addNonceProp={1} onFormClosed={() => {}} onAdded={() => {}} /></ThemeProvider>);
    await act(async () => { jest.advanceTimersByTime(400); });
    const settled = mockDraws;
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(mockDraws - settled).toBe(0);
  } finally {
    jest.useRealTimers();
  }
}, 30000);

// In the first seconds after the app opens, the Transactions tab kept drawing its older days
// in the background (30 days every 120 ms) while Home was showing: a form opened then lagged.
test('The Transactions tab only draws its older days while it is the tab showing', async () => {
  yearOfSpending();
  const { PageActiveContext } = require('../src/pageActive');
  const Screen = require('../src/screens/TransactionsScreen').default;
  jest.useFakeTimers();
  try {
    const page = (showing: boolean) => <ThemeProvider><PageActiveContext.Provider value={showing}><Screen /></PageActiveContext.Provider></ThemeProvider>;
    const view = render(page(false));
    await act(async () => { jest.advanceTimersByTime(400); });
    const settled = mockDraws;
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(mockDraws - settled).toBe(0);
    // Showing: the older days arrive.
    view.rerender(page(true));
    await act(async () => { jest.advanceTimersByTime(3000); });
    expect(mockDraws - settled).toBeGreaterThan(0);
  } finally {
    jest.useRealTimers();
  }
}, 60000);
