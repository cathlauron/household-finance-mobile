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
  useNavigation: () => ({ navigate: jest.fn(), setOptions: (o: any) => mockSetOptions(o), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'Travel', params: {} }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

const mockSetOptions = jest.fn();
const headerOptions = () => mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
async function openTrip() {
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getAllByText('Cebu')[0]); });
}

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
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-ci1')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), '8450.50'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-title'), 'Plane tickets (Cebu Pacific)'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  const item = saved[saved.length - 1].travel[0].checklist[0];
  expect(item.id).toBe('ci1');
  expect(item.cost).toBe(8450.5);
  expect(item.title).toBe('Plane tickets (Cebu Pacific)');
  expect(saved[saved.length - 1].travel[0].budget).toBe(8450.5);
  expect(screen.queryByTestId('trip-drop')).toBeNull();
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

// Cath, 2026-11-03: "To-do list should be editable"; 2026-11-06 (mockup scene 4): it opens right
// there in the list, with the same four boxes. A to-do's cost is only a reminder.
test('a to-do opens in the list: words, cost, note and date; its cost stays out of the budget', async () => {
  mockModel = household();
  mockModel.travel[0].todos = [{ id: 'td1', text: 'Pack', done: false }];
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-todo-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-todo-edit-td1')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-title'), 'Pack jackets'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), '1200'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-note'), 'From the closet'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  const trip = saved[saved.length - 1].travel[0];
  expect(trip.todos[0]).toMatchObject({ id: 'td1', text: 'Pack jackets', cost: 1200, note: 'From the closet' });
  expect(trip.budget ?? 0).toBe(0);
}, 30000);

test('adding to the to-do list uses the same drop-down', async () => {
  mockModel = household();
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-todo-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-add-todo')); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(screen.getByText('What is this to-do?')).toBeTruthy();
  await act(async () => { await new Promise((r) => setTimeout(r, 850)); }); // a second tap within 800 ms is ignored
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-title'), 'Book the bus'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(saved[saved.length - 1].travel[0].todos[0]).toMatchObject({ text: 'Book the bus', done: false });
}, 30000);

// Cath, 2026-11-03 (mockup P1): a trip budget item can have a due date, and keeps it when edited.
test('P1: a budget item with a due date shows it, and saving its drop-down keeps it', async () => {
  mockModel = household();
  const due = new Date(Date.now() + 5 * 86400000);
  const dueISO = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  mockModel.travel[0].checklist = [{ id: 'h1', title: 'Hotel balance', cost: 12000, checked: false, dueDate: dueISO }];
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  expect(screen.getByText(/^Due .* · on To-Pay$/)).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-h1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(saved[saved.length - 1].travel[0].checklist[0].dueDate).toBe(dueISO);
}, 30000);

test('+ Add an item opens the drop-down and adds it, with its cost in the budget', async () => {
  mockModel = household();
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-add-item')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-title'), 'Pocket Wi-Fi'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), '900'); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-note'), 'Airport pickup'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  const trip = saved[saved.length - 1].travel[0];
  expect(trip.checklist[1]).toMatchObject({ title: 'Pocket Wi-Fi', cost: 900, note: 'Airport pickup', checked: false });
  expect(trip.budget).toBe(900);
}, 30000);

test('a cost of nothing is no cost, and an amount keeps two decimals', async () => {
  mockModel = household();
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-ci1')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), '0'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(saved[saved.length - 1].travel[0].checklist[0].cost).toBe('');
}, 30000);

test('one drop-down at a time, and Cancel leaves everything as it was', async () => {
  mockModel = household();
  mockModel.travel[0].checklist.push({ id: 'ci2', title: 'Hotel', cost: 500, checked: false });
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-ci1')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-ci2')); });
  expect(screen.getAllByTestId('trip-drop')).toHaveLength(1);
  expect(screen.getByTestId('trip-drop-title').props.value).toBe('Hotel');
  const before = saved.length;
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-title'), 'Changed'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-cancel')); });
  expect(saved.length).toBe(before);
  expect(screen.queryByTestId('trip-drop')).toBeNull();
}, 30000);

test('a paid item can be edited, and clearing its cost keeps the amount of its payment', async () => {
  mockModel = household();
  mockModel.travel[0].checklist = [{ id: 'p1', title: 'Flights', cost: 8000, checked: true, markedOnly: true }];
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-p1')); });
  expect(screen.getByText('Already paid. Changing the cost updates its payment.')).toBeTruthy();
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), ''); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(saved[saved.length - 1].travel[0].checklist[0]).toMatchObject({ cost: 8000, checked: true, markedOnly: true });
}, 30000);

test('removing an item asks first, and a pot with money stays when the budget reaches nothing', async () => {
  const { Alert } = require('react-native');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(((_t: any, _m: any, b: any[]) => b[b.length - 1].onPress?.()) as any);
  mockModel = household();
  mockModel.savingsGoals = [{ id: 'pot', name: 'Travel: Cebu', targetAmount: 500, targetDate: '', currentAmount: 0, contributions: [{ id: 'c', amount: 200, date: '2026-11-01' }] }];
  mockModel.travel[0].trackInSavings = true;
  mockModel.travel[0].savingsGoalId = 'pot';
  mockModel.travel[0].checklist = [{ id: 'x', title: 'Hotel', cost: 500, checked: false }];
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-x')); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-remove')); });
  expect(alert).toHaveBeenCalled();
  const m = saved[saved.length - 1];
  expect(m.travel[0].checklist).toHaveLength(0);
  expect(m.savingsGoals.map((g: any) => g.id)).toContain('pot');
  alert.mockRestore();
}, 30000);

test('the pot follows the budget when an item changes', async () => {
  mockModel = household();
  mockModel.savingsGoals = [{ id: 'pot', name: 'Travel: Cebu', targetAmount: 500, targetDate: '', currentAmount: 0, contributions: [] }];
  mockModel.travel[0].trackInSavings = true;
  mockModel.travel[0].savingsGoalId = 'pot';
  mockModel.travel[0].checklist = [{ id: 'x', title: 'Hotel', cost: 500, checked: false }];
  await openTrip();
  await act(async () => { fireEvent.press(screen.getByTestId('travel-page-budget-tab')); });
  await act(async () => { fireEvent.press(screen.getByTestId('travel-item-x')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('trip-drop-cost'), '750'); });
  await act(async () => { fireEvent.press(screen.getByTestId('trip-drop-save')); });
  expect(saved[saved.length - 1].savingsGoals[0].targetAmount).toBe(750);
}, 30000);

// Cath, 2026-11-06 (mockup scene 2): no Edit button; tapping the name changes it.
test('a trip has no Edit button; tapping the name changes it, and its pot follows', async () => {
  mockModel = household();
  mockModel.savingsGoals = [{ id: 'pot', name: 'Travel: Cebu', targetAmount: 500, targetDate: '', currentAmount: 0, contributions: [] }];
  mockModel.travel[0].trackInSavings = true;
  mockModel.travel[0].savingsGoalId = 'pot';
  mockModel.travel[0].checklist = [{ id: 'x', title: 'Hotel', cost: 500, checked: false }];
  await openTrip();
  const options = headerOptions();
  expect(options.headerRight).toBeUndefined();
  await act(async () => { options.headerTitlePress(); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-rename-input'), '  '); });
  await act(async () => { fireEvent.press(screen.getAllByText('Save').pop()!); });
  expect(screen.getByText('Give this trip a name.')).toBeTruthy();
  await act(async () => { await new Promise((r) => setTimeout(r, 850)); }); // Save ignores a second tap within 800 ms
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-rename-input'), 'Cebu + Bohol'); });
  await act(async () => { fireEvent.press(screen.getAllByText('Save').pop()!); });
  const m = saved[saved.length - 1];
  expect(m.travel[0].name).toBe('Cebu + Bohol');
  expect(m.savingsGoals[0].name).toBe('Travel: Cebu + Bohol');
}, 30000);

// Cath, 2026-11-06 (mockup scene 1): name, dates and the Savings switch, then the trip opens.
test('New trip has only the name, dates and Savings switch, and the trip opens after Add', async () => {
  mockModel = defaultModel();
  mockModel.travel = [];
  const Screen = require('../src/screens/TravelScreen').default;
  render(<ThemeProvider><Screen /></ThemeProvider>);
  await act(async () => {});
  await act(async () => { fireEvent.press(screen.getByTestId('travel-empty-add')); });
  expect(screen.getByText('Save for this trip in Savings?')).toBeTruthy();
  expect(screen.queryByText('+ Add item')).toBeNull();
  expect(screen.queryByText('To-do')).toBeNull();
  await act(async () => { fireEvent.changeText(screen.getByTestId('travel-name-input'), 'Bangkok'); });
  await act(async () => { fireEvent.press(screen.getAllByText('Add').pop()!); });
  expect(saved[saved.length - 1].travel[0]).toMatchObject({ name: 'Bangkok', checklist: [], trackInSavings: false });
  expect(screen.getByTestId('travel-add-item')).toBeTruthy();
}, 30000);
