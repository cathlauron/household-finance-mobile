import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';
import { lightTheme } from '../src/theme';

// H-15 (2026-10-22, Cath: "grey when zero"): red money totals showed red at ₱0.00.
let mockModel: any;
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

const colorOf = (node: any) => {
  const flat = [].concat(node.props.style).flat(Infinity).filter(Boolean).reduce((a: any, b: any) => ({ ...a, ...b }), {});
  return flat.color;
};

async function draw(path: string) {
  const Screen = require(path).default;
  render(
    <ThemeProvider>
      <Screen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('Debts: "Total debt logged ₱0.00" is grey', async () => {
  mockModel = defaultModel();
  await draw('../src/screens/DebtsScreen');
  expect(screen.getByText('Total debt logged')).toBeTruthy();
  expect(colorOf(screen.getByText('₱0.00'))).toBe(lightTheme.inkDim);
}, 30000);

test('Groceries: "Bought ₱0.00" is grey', async () => {
  mockModel = defaultModel();
  await draw('../src/screens/GroceriesScreen');
  expect(screen.getByText('Bought')).toBeTruthy();
  const zeros = screen.getAllByText('₱0.00');
  expect(zeros.filter((n) => colorOf(n) === lightTheme.negative)).toHaveLength(0);
}, 30000);

// 2026-10-23 (Cath: yes, grey for green and blue zero amounts too).
const coloured = (n: any) => [lightTheme.positive, lightTheme.saving, lightTheme.planned, lightTheme.negative].includes(colorOf(n));
test.each([
  ['Loans ("Owed to you (lent)")', '../src/screens/LoansScreen'],
  ['Savings ("Set aside in total")', '../src/screens/SavingsScreen'],
  ['Groceries (planned)', '../src/screens/GroceriesScreen'],
  ['Events ("To spend")', '../src/screens/EventsScreen'],
])('%s: no ₱0.00 is drawn in a colour', async (_name, path) => {
  mockModel = defaultModel();
  await draw(path);
  const zeros = screen.queryAllByText(/^[+−-]?₱0\.00$/, { includeHiddenElements: true });
  expect(zeros.length).toBeGreaterThan(0);
  expect(zeros.filter(coloured)).toHaveLength(0);
}, 30000);
