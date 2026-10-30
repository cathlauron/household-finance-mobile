import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-51 (Cath, 2026-10-29, canvas F2 then F3): opening the app, a banner says what another
// household member changed; tapping it shows the list; Done marks them seen.
let mockModel: any;
let mockLinked = true;
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
  setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/BottomSheet', () => ({ __esModule: true, default: ({ visible, header, children }: any) => (visible ? <>{header}{children}</> : null) }));
jest.mock('../src/DataContext', () => ({ useData: () => ({ model: mockModel, isLinked: mockLinked, username: 'cath' }) }));
jest.mock('../src/navigation/navigationRef', () => ({ navigationRef: { isReady: () => true, navigate: jest.fn() } }));
import HouseholdChanges from '../src/components/HouseholdChanges';

function household() {
  const m: any = defaultModel();
  m.manualTransactions = [{ id: 't1', date: '2026-10-29', label: 'Groceries', amount: 1240.75, direction: 'out', addedBy: 'ana', createdAt: Date.now() }];
  return m;
}

test('a banner with what Ana changed; tap it for the list; Done marks it seen', async () => {
  store['householdSeenAt:cath'] = String(Date.now() - 60000);
  mockModel = household();
  render(<ThemeProvider><HouseholdChanges /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText('Ana changed 1 thing')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('household-changes-banner')); });
  expect(screen.getByTestId('household-changes-list')).toBeTruthy();
  expect(screen.getByText('Groceries')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Done')); });
  expect(Number(store['householdSeenAt:cath'])).toBeGreaterThanOrEqual(mockModel.manualTransactions[0].createdAt);
});

test('not in a shared household: nothing shows', async () => {
  mockLinked = false;
  mockModel = household();
  render(<ThemeProvider><HouseholdChanges /></ThemeProvider>);
  await act(async () => {});
  expect(screen.queryByTestId('household-changes-banner')).toBeNull();
  mockLinked = true;
});

test('the very first time it starts from now (no flood of old history)', async () => {
  delete store['householdSeenAt:cath'];
  mockModel = household();
  mockModel.manualTransactions[0].createdAt = Date.now() - 3600000;
  render(<ThemeProvider><HouseholdChanges /></ThemeProvider>);
  await act(async () => {});
  expect(screen.queryByText('Ana changed 1 thing')).toBeNull();
});
