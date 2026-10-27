import React from 'react';
import { act, fireEvent, screen, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Smoothness sweep 2026-10-26 (jank reviewer): the Transactions list built the whole history
// in one go. Now the newest two months draw at once and older days follow in batches.
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


test('a long history: newest days show at once, every day shows a moment later', async () => {
  jest.useFakeTimers();
  mockModel = defaultModel();
  const base = new Date('2026-10-20T12:00:00');
  // 150 days, one entry each.
  mockModel.manualTransactions = Array.from({ length: 150 }, (_, i) => {
    const d = new Date(base.getTime() - i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { id: `t${i}`, date: iso, label: `Entry ${i}`, amount: 100, direction: 'out', owner: 'shared', category: 'Food', notes: '' };
  });
  const TransactionsScreen = require('../src/screens/TransactionsScreen').default;
  render(
    <ThemeProvider>
      <TransactionsScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByText('Entry 0')).toBeTruthy();
  expect(screen.getByText('Entry 59')).toBeTruthy();
  // Older days are not built yet in the first moment...
  expect(screen.queryByText('Entry 149')).toBeNull();
  // ...and all arrive shortly after.
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      jest.advanceTimersByTime(150);
    });
  }
  expect(screen.getByText('Entry 149')).toBeTruthy();
  jest.useRealTimers();
});
