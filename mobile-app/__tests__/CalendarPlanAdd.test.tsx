import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';
import { layoutWeek } from '../src/calendarBands';

// Cath, 2026-11-06 (mockup C): anything in Plan can be added from the Calendar, on the picked day,
// and you stay on the Calendar.
let mockModel: any;
const mockSaved: any[] = [];
const mockSetOptions = jest.fn();
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
  useNavigation: () => ({ navigate: jest.fn(), setOptions: mockSetOptions, addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Calendar', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));
jest.mock('../src/components/OfflineBanner', () => ({ __esModule: true, default: () => null, OfflineCloud: () => null }));
jest.mock('../src/components/SkyGlow', () => () => null);

const DAY = '2026-11-02';

async function openForm(file: string, props: any = {}) {
  const Screen = require(`../src/screens/${file}`).default;
  const onAdded = jest.fn();
  const onFormClosed = jest.fn();
  render(<ThemeProvider><Screen formOnly addDate={DAY} addNonce={1} onAdded={onAdded} onFormClosed={onFormClosed} {...props} /></ThemeProvider>);
  await act(async () => {});
  return { onAdded, onFormClosed };
}
async function press(text: string) {
  await act(async () => { fireEvent.press(screen.getAllByText(text).slice(-1)[0]); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}
const name = (placeholder: RegExp, text: string) => fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

beforeEach(() => {
  mockSaved.length = 0;
  mockSetOptions.mockClear();
  mockModel = defaultModel();
});

test('an event starts on the picked day, and only its form is drawn', async () => {
  const { onAdded } = await openForm('EventsScreen');
  expect(screen.getByText('New event')).toBeTruthy();
  expect(screen.queryByText('Upcoming')).toBeNull();
  expect(mockSetOptions).not.toHaveBeenCalled();
  name(/Mama/, 'Party');
  await press('Add');
  const ev = mockSaved[0].events[0];
  expect([ev.name, ev.month, ev.day]).toEqual(['Party', 11, 2]);
  expect(onAdded).toHaveBeenCalledTimes(1);
}, 30000);

test('a trip starts on the picked day and does not open on its own', async () => {
  const { onAdded } = await openForm('TravelScreen');
  name(/Baguio/, 'Cebu');
  await press('Add');
  expect(mockSaved[0].travel[0].startDate).toBe(DAY);
  expect(onAdded).toHaveBeenCalledTimes(1);
  expect(mockSetOptions).not.toHaveBeenCalled();
}, 30000);

test('a pot has the picked day as its target date', async () => {
  const { onAdded } = await openForm('SavingsScreen');
  name(/Emergency/, 'Laptop');
  await press('Add');
  expect(mockSaved[0].savingsGoals.slice(-1)[0].targetDate).toBe(DAY);
  expect(onAdded).toHaveBeenCalledTimes(1);
}, 30000);

test('a yearly goal has the picked day as its target date', async () => {
  const { onAdded } = await openForm('GoalsScreen');
  name(/credit card/, 'Run 10K');
  await press('Add');
  expect(mockSaved[0].yearlyGoals[0].targetDate).toBe(DAY);
  expect(onAdded).toHaveBeenCalledTimes(1);
}, 30000);

test('a grocery item is to buy by the picked day', async () => {
  const { onAdded } = await openForm('GroceriesScreen');
  name(/Rice/, 'Rice');
  await press('Add');
  expect(mockSaved[0].groceries[0].buyBy).toBe(DAY);
  expect(onAdded).toHaveBeenCalledTimes(1);
}, 30000);

test('a shared expense needs two people first, and says so instead of hanging', async () => {
  mockModel.sharedMembers = [];
  const { Alert } = require('react-native');
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { onFormClosed } = await openForm('SharedExpensesScreen');
  expect(spy).toHaveBeenCalledWith('Add people first', expect.any(String));
  expect(onFormClosed).toHaveBeenCalled();
  spy.mockRestore();
}, 30000);

test('a shared expense is dated the picked day', async () => {
  mockModel.sharedMembers = ['a', 'b'];
  mockModel.sharedPeople = [{ id: 'a', name: 'Cath' }, { id: 'b', name: 'Ana' }];
  await openForm('SharedExpensesScreen');
  expect(screen.getByText('New shared expense')).toBeTruthy();
  expect(screen.queryByText('People')).toBeNull();
}, 30000);

test('investment: choose one, and the money is dated the picked day', async () => {
  mockModel.investments = [{ id: 'i1', name: 'MP2', kind: 'mp2', entries: [] }];
  const { onAdded } = await openForm('InvestmentsScreen');
  expect(screen.getByText('Put money into')).toBeTruthy();
  expect(screen.getByTestId('investment-pick-new')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('investment-pick-i1')); });
  expect(screen.getAllByText('Add money').length).toBeGreaterThan(0);
  expect(onAdded).not.toHaveBeenCalled();
}, 30000);

test('investment: with none yet it goes straight to New investment', async () => {
  mockModel.investments = [];
  await openForm('InvestmentsScreen');
  expect(screen.getByText('New investment')).toBeTruthy();
  expect(screen.queryByText('Put money into')).toBeNull();
}, 30000);

test('Buy by is optional and editable on the Groceries page', async () => {
  mockModel.groceries = [{ id: 'g', item: 'Milk', plannedAmount: 90, actualAmount: '', purchased: false, buyBy: '2026-12-01' }];
  const Screen = require('../src/screens/GroceriesScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  expect(screen.getByText(/Buy by Dec 1/)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Milk')); });
  expect(screen.getByTestId('grocery-buyby-row')).toBeTruthy();
}, 30000);

test('one ribbon only on a row too short for two', () => {
  const row = Array.from({ length: 7 }, (_, i) => ({ day: 8 + i }));
  const one = (key: string) => ({ type: 'reminder', label: key, amount: 0, band: { kind: 'event', key, first: true, last: true } }) as any;
  const { bands, hiddenKeys } = layoutWeek(row, { 8: [one('a'), one('b')] }, 1);
  expect(bands.length).toBe(1);
  expect(hiddenKeys.size).toBe(1);
});
