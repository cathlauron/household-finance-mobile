import React from 'react';
import { BackHandler } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-24: a day tapped on a calendar widget opens that day's page in the Calendar.
let mockModel: any;
let mockParams: any = {};
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
  useRoute: () => ({ name: 'Calendar', params: mockParams }),
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

test('A widget day opens that date page', async () => {
  mockParams = { openDate: '2026-11-20', openNonce: 1 };
  await open();
  await tick();
  expect(screen.getByTestId('calendar-date-page')).toBeTruthy();
  expect(screen.getByText('FRIDAY — NOV 20')).toBeTruthy();
  mockParams = {};
}, 30000);

test('Opened from the widget without a day: the month, no date page', async () => {
  mockParams = {};
  await open();
  expect(screen.queryByTestId('calendar-date-page')).toBeNull();
}, 30000);
