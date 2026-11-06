import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-06 (mockup scene 5): November ends on a Monday, so December 1 to 5 fill the last
// row, greyed out like a phone calendar; tapping one moves to that month. And the Calendar is
// her main calendar: an event shows with no amount and no Savings pot.
let mockModel: any;
const mockNavigate = jest.fn();
const mockSaved: any[] = [];
let mockKeepOld = false;
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockSaved.push(m); if (!mockKeepOld) mockModel = m; }, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Calendar', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

const NOW = new Date(2026, 10, 6, 12);

function open() {
  const Screen = require('../src/screens/CalendarScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
  mockModel = defaultModel();
  mockNavigate.mockClear();
  mockSaved.length = 0;
});
afterEach(() => jest.useRealTimers());

test('the next month\'s first days are on November\'s last row, and tapping one moves to December', async () => {
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getByText('November')).toBeTruthy();
  expect(screen.getAllByLabelText('December 3, go to December').length).toBeGreaterThan(0);
  await act(async () => { fireEvent.press(screen.getAllByLabelText('December 3, go to December')[0]); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getByText('December')).toBeTruthy();
  expect(screen.queryByText('Nothing on this day.')).toBeNull();
}, 30000);

test('an event with no amount and no pot is on its day, and tapping it opens Events', async () => {
  mockModel.events = [{ id: 'e', name: 'Mama birthday', type: 'birthday', recurrence: 'annual', month: 11, day: 14, budget: '', completed: false }];
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getAllByLabelText('November 14, 1 item')[0]); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getByText('Mama birthday')).toBeTruthy();
  expect(screen.getByText('Birthday')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Mama birthday')); });
  expect(mockNavigate).toHaveBeenCalledWith('Events', { backTitle: 'Calendar' });
}, 30000);

// Cath, 2026-11-06 (mockup C, "a little bit of both"): adding from the Calendar's + stays on the
// Calendar. Compact and Details: the month, with the day's dots giving a small pop. List, or a
// day's list that is open: the new row glows.
async function addBill(name: string) {
  await act(async () => { fireEvent.press(screen.getByLabelText('Add on this day')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-bill')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('bill-name-input'), name); });
  await act(async () => { fireEvent.changeText(screen.UNSAFE_getAllByProps({ keyboardType: 'decimal-pad' })[0], '500'); });
  await act(async () => { fireEvent.press(screen.getAllByText('Add').pop()!); });
  await act(async () => { jest.advanceTimersByTime(50); });
}

test('Compact: after Add you stay on the month, and the day gives a small pop', async () => {
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await addBill('Water');
  expect(mockSaved.length).toBeGreaterThan(0);
  expect(mockNavigate.mock.calls.filter((c) => c[0] === 'Main')).toHaveLength(0);
  expect(screen.getByText('November')).toBeTruthy();
  expect(screen.getAllByTestId('calendar-day-pop').length).toBeGreaterThan(0);
  expect(screen.queryByTestId('calendar-row-glow')).toBeNull();
}, 30000);

test('List: after Add the new row glows in the list, and you stay', async () => {
  const settings = require('../src/calendarSettings');
  await settings.setCalendarViewMode('list');
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await addBill('Water');
  expect(mockNavigate.mock.calls.filter((c) => c[0] === 'Main')).toHaveLength(0);
  expect(screen.getByTestId('calendar-row-glow')).toBeTruthy();
  await settings.setCalendarViewMode('compact');
}, 30000);

test('tapping a transaction on a day opens its page', async () => {
  mockModel.manualTransactions = [{ id: 't', date: '2026-11-14', label: 'Lunch', amount: 250, direction: 'out', category: 'Food', owner: 'shared' }];
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getAllByLabelText('November 14, 1 item')[0]); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByText('Lunch')); });
  expect(mockNavigate).toHaveBeenCalledWith('TransactionDetail', { id: 'manual-t', backTitle: 'Calendar' });
}, 30000);

// Sweep 2026-11-06: changing the date in the form put the item on another day, but the picked day
// still gave its pop, with nothing new on it.
test('no pop when nothing new landed on the day', async () => {
  mockKeepOld = true;
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await addBill('Water');
  mockKeepOld = false;
  expect(mockSaved.length).toBeGreaterThan(0);
  expect(screen.queryAllByTestId('calendar-day-pop')).toHaveLength(0);
}, 30000);

// Cath, 2026-11-06 (mockups): everything in Plan from the +, as a second step, and ribbons.
test('From your Plan is a second step with all of Plan, and Back returns', async () => {
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByLabelText('Add on this day')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getByTestId('calendar-add-txn')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-plan')); });
  await act(async () => { jest.advanceTimersByTime(1600); });
  for (const id of ['event', 'trip', 'pot', 'goal', 'shared', 'invest', 'grocery']) expect(screen.getByTestId(`calendar-add-${id}`)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-back')); });
  await act(async () => { jest.advanceTimersByTime(1600); });
  expect(screen.getByTestId('calendar-add-txn')).toBeTruthy();
}, 30000);

test('adding an event from the Calendar stays there, and the day gets its ribbon', async () => {
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByLabelText('Add on this day')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-plan')); });
  await act(async () => { jest.advanceTimersByTime(1600); });
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-event')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.changeText(screen.getByPlaceholderText(/Mama/), 'Party'); });
  await act(async () => { fireEvent.press(screen.getAllByText('Add').pop()!); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(mockSaved.slice(-1)[0].events.slice(-1)[0].name).toBe('Party');
  expect(mockNavigate.mock.calls.filter((c) => c[0] === 'Main')).toHaveLength(0);
  expect(screen.getByText('November')).toBeTruthy();
  expect(screen.getAllByText('Party', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  expect(screen.getAllByTestId('calendar-day-pop', { includeHiddenElements: true }).length).toBeGreaterThan(0);
}, 30000);

test('a trip is one ribbon with its name, and a day of it opens the trip', async () => {
  mockModel.travel = [{ id: 'tr', name: 'Cebu', startDate: '2026-11-10', endDate: '2026-11-12', checklist: [] }];
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getAllByTestId('calendar-band-trip-tr', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  await act(async () => { fireEvent.press(screen.getAllByLabelText('November 11, 1 item')[0]); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getByText('Trip · day 2 of 3')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Trip · day 2 of 3')); });
  expect(mockNavigate).toHaveBeenCalledWith('Travel', { tripId: 'tr', backTitle: 'Calendar' });
}, 30000);

// Sweep, 2026-11-06: two quick taps on a + row opened the form twice, one on top of the other.
test('two quick taps on a + row open one form', async () => {
  open();
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByLabelText('Add on this day')); });
  await act(async () => { jest.advanceTimersByTime(50); });
  await act(async () => { fireEvent.press(screen.getByTestId('calendar-add-plan')); });
  await act(async () => { jest.advanceTimersByTime(1600); });
  const row = screen.getByTestId('calendar-add-event');
  await act(async () => { fireEvent.press(row); fireEvent.press(row); });
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(screen.getAllByText('New event')).toHaveLength(1);
}, 30000);
