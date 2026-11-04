import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-44 (Cath, 2026-10-29): "allow everything to be editable. I could add to the budget list
// just a name without the amount, then later edit it to add the amount. Right now it does not
// allow me to; I need to remove it from the list first then add it again."
let mockModel: any;
const saved: any[] = [];
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({
    model: mockModel, getModel: () => mockModel, saveModel: async (m: any) => { saved.push(m); mockModel = m; }, isLinked: false, username: 'cath',
    isOnline: true, guest: false, refreshModel: async () => 'up_to_date',
  }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Travel', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

function household() {
  const m: any = defaultModel();
  const d = new Date();
  d.setDate(d.getDate() + 20);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  m.travel = [{ id: 'tr1', name: 'Cebu', startDate: iso, endDate: iso, checklist: [{ id: 'ci1', title: 'Plane tickets', cost: '', checked: false }], todos: [] }];
  return m;
}

test('H-44: an item added with only a name gets its cost later, without removing it', async () => {
  mockModel = household();
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
  await act(async () => { fireEvent.press(screen.getAllByText('Plane tickets')[0]); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-form-item-cost-ci1'), '8450.50'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-form-item-title-ci1'), 'Plane tickets (Cebu Pacific)'); });
  await act(async () => { fireEvent.press(screen.getByText('Save')); });
  const item = saved[saved.length - 1].travel[0].checklist[0];
  expect(item.id).toBe('ci1');
  expect(item.cost).toBe(8450.5);
  expect(item.title).toBe('Plane tickets (Cebu Pacific)');
}, 30000);

test('H-45 (canvas B14): a paid trip item gets the paid line; an unpaid one does not', async () => {
  mockModel = household();
  mockModel.travel[0].checklist = [{ id: 'p1', title: 'Flights', cost: 8000, checked: true, markedOnly: true }, { id: 'u1', title: 'Hotel', cost: 6000, checked: false }];
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
  expect(screen.getByTestId('travel-item-paid-p1')).toBeTruthy();
  expect(screen.queryByTestId('travel-item-paid-u1')).toBeNull();
}, 30000);

// Cath, 2026-11-03: "To-do list should be editable": tapping a to-do on the trip page opens it
// in the trip form, where its words and its date can be changed.
test('a to-do on the trip page opens for editing, words and date', async () => {
  mockModel = household();
  mockModel.travel[0].todos = [{ id: 'td1', text: 'Pack', done: false }];
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-todo-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-todo-edit-td1')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-form-todo-td1'), 'Pack jackets'); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-form-todo-date-td1')); });
  expect(screen.getByTestId('travel-form-todo-datefield-td1')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Save')); });
  const td = saved[saved.length - 1].travel[0].todos[0];
  expect(td).toMatchObject({ id: 'td1', text: 'Pack jackets' });
}, 30000);

// Cath, 2026-11-03 (mockup P1): a trip budget item can have a due date; the trip page shows it
// and saving the trip keeps it.
test('P1: a budget item with a due date shows it, and the trip form keeps it on Save', async () => {
  mockModel = household();
  const due = new Date(Date.now() + 5 * 86400000);
  const dueISO = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  mockModel.travel[0].checklist = [{ id: 'h1', title: 'Hotel balance', cost: 12000, checked: false, dueDate: dueISO }];
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  expect(screen.getByText(/^Due .* · on To-Pay$/)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getAllByText('Hotel balance')[0]); });
  expect(screen.getByTestId('travel-form-item-date-h1')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-form-item-date-h1')); });
  expect(screen.getByTestId('travel-form-item-datefield-h1')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByText('Save')); });
  expect(saved[saved.length - 1].travel[0].checklist[0].dueDate).toBe(dueISO);
}, 30000);
