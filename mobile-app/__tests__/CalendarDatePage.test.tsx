import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-07 (mockup calendar-date-page, from her iPhone recording): tapping a date in Compact
// or Details opens a page of that date and the dates after it. List keeps the month and only
// changes the details. Compact has the short rows and thin trip lines; List has the taller rows
// with named ribbons.
let mockModel: any;
const mockNavigate = jest.fn();
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { mockModel = m; }, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
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
const settings = () => require('../src/calendarSettings');
const tick = (ms = 50) => act(async () => { jest.advanceTimersByTime(ms); });

async function open(view: 'compact' | 'details' | 'list' = 'compact') {
  await settings().setCalendarViewMode(view);
  const Screen = require('../src/screens/CalendarScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await tick();
}
const tap = (label: string) => act(async () => { fireEvent.press(screen.getAllByLabelText(label)[0]); });

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
  mockModel = defaultModel();
  mockModel.travel = [{ id: 'tr', name: 'BKK', startDate: '2026-11-13', endDate: '2026-11-14', checklist: [] }];
  mockModel.events = [
    { id: 'a', name: 'Mama', type: 'birthday', recurrence: 'onetime', onetimeDate: '2026-11-20', budget: '', completed: false },
    { id: 'b', name: 'Papa', type: 'birthday', recurrence: 'onetime', onetimeDate: '2026-12-02', budget: '', completed: false },
  ];
  mockNavigate.mockClear();
});
afterEach(async () => {
  await settings().setCalendarViewMode('compact');
  jest.useRealTimers();
});

test('Compact: a date opens the date page, with the dates after it', async () => {
  await open();
  await tap('November 13, 1 item');
  await tick();
  expect(screen.getByTestId('calendar-date-page')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 13')).toBeTruthy();
  expect(screen.getByText('SATURDAY — NOV 14')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 20')).toBeTruthy();
  expect(screen.getByText('WEDNESDAY — DEC 2')).toBeTruthy();
  expect(screen.getByText('Trip · day 1 of 2')).toBeTruthy();
  expect(screen.queryByText('MONDAY — NOV 16')).toBeNull();
}, 30000);

test('Details: a date opens the same page', async () => {
  await open('details');
  await tap('November 20, 1 item');
  await tick();
  expect(screen.getByTestId('calendar-date-page')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 20')).toBeTruthy();
}, 30000);

test('a date with nothing on it says so, then the next dates follow', async () => {
  await open();
  await tap('November 10');
  await tick();
  expect(screen.getByText('TUESDAY — NOV 10')).toBeTruthy();
  expect(screen.getByText('Nothing on this day.')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 13')).toBeTruthy();
}, 30000);

test('the date page has no view button, and + adds on the tapped date', async () => {
  await open();
  await tap('November 13, 1 item');
  await tick();
  expect(screen.queryByLabelText('Calendar view')).toBeNull();
  await act(async () => { fireEvent.press(screen.getByLabelText('Add on this day')); });
  await tick();
  expect(screen.getByText('Add on Fri, Nov 13')).toBeTruthy();
}, 30000);

test('a row on the date page opens its page', async () => {
  await open();
  await tap('November 13, 1 item');
  await tick();
  await act(async () => { fireEvent.press(screen.getByText('Trip · day 2 of 2')); });
  expect(mockNavigate).toHaveBeenCalledWith('Travel', { tripId: 'tr', backTitle: 'Calendar' });
}, 30000);

test('the back link returns to the month in the same view', async () => {
  await open();
  await tap('November 13, 1 item');
  await tick();
  await act(async () => { fireEvent.press(screen.getByText('November')); });
  await tick(400);
  expect(screen.queryByTestId('calendar-date-page')).toBeNull();
  expect(screen.getByLabelText('Calendar view')).toBeTruthy();
}, 30000);

test('the phone back button goes back to the month first', async () => {
  const spy = jest.spyOn(BackHandler, 'addEventListener');
  await open();
  await tap('November 13, 1 item');
  await tick();
  const press = spy.mock.calls.filter((c) => c[0] === 'hardwareBackPress').pop()![1];
  let handled: boolean | null | undefined;
  await act(async () => { handled = press(); });
  await tick(400);
  expect(handled).toBe(true);
  expect(screen.queryByTestId('calendar-date-page')).toBeNull();
  spy.mockRestore();
}, 30000);

test('List: a date stays on the month and only changes the details', async () => {
  await open('list');
  await tap('November 20, 1 item');
  await tick();
  expect(screen.queryByTestId('calendar-date-page')).toBeNull();
  expect(screen.getByLabelText('Calendar view')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 20')).toBeTruthy(); // same heading as the date page (2026-11-07)
  expect(screen.getByText('Mama')).toBeTruthy();
}, 30000);

test('Compact: trips are thin lines with no name', async () => {
  await open();
  expect(screen.getAllByTestId('calendar-band-trip-tr', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  expect(screen.queryByText('BKK', { includeHiddenElements: true })).toBeNull();
}, 30000);

test('List: trips are ribbons with their name', async () => {
  await open('list');
  expect(screen.getAllByText('BKK', { includeHiddenElements: true }).length).toBeGreaterThan(0);
}, 30000);

// Cath, 2026-11-07 (mockup calendar-list-lines): plain rows with a thin line between them, on the
// date page and on List, with no white card.
const hasLine = (el: any) => Object.assign({}, ...[el.props.style].flat(9).filter(Boolean)).borderTopWidth > 0;
function twoOnOneDate() {
  mockModel.events.push({ id: 'c', name: 'Tita', type: 'birthday', recurrence: 'onetime', onetimeDate: '2026-11-20', budget: '', completed: false });
}

test('date page: a line between the items of a date, none above a date', async () => {
  twoOnOneDate();
  await open();
  await tap('November 20, 2 items');
  await tick();
  const rows = screen.getAllByTestId('calendar-row');
  expect(rows.slice(0, 3).map(hasLine)).toEqual([false, true, false]);
}, 30000);

test('List: the same rows with lines', async () => {
  twoOnOneDate();
  await open('list');
  await tap('November 20, 2 items');
  await tick();
  expect(screen.getAllByTestId('calendar-row').map(hasLine)).toEqual([false, true]);
}, 30000);

// Sweep 2026-11-07: Today on the date page moved the dates but left the list where it was scrolled.
test('Today on the date page starts from today, at the top', async () => {
  const { FlatList } = require('react-native');
  const spy = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
  await open();
  await tap('November 13, 1 item');
  await tick();
  await act(async () => { fireEvent.press(screen.getByText('Today')); });
  await tick();
  expect(screen.getByText('FRIDAY — NOV 6')).toBeTruthy();
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
  spy.mockRestore();
}, 30000);
