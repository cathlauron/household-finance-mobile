import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-11-06 (mockup scene 5): November ends on a Monday, so December 1 to 5 fill the last
// row, greyed out like a phone calendar; tapping one moves to that month. And the Calendar is
// her main calendar: an event shows with no amount and no Savings pot.
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
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath', isOnline: true, guest: false, refreshModel: async () => 'up_to_date' }),
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
  expect(mockNavigate).toHaveBeenCalledWith('Events', undefined);
}, 30000);
