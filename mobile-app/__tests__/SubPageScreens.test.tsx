import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Smoothness 2026-10-23 (Cath): every page with sub-pages slides the same way. Each one
// draws through the shared sliding pages, and tapping a choice shows that page.
let mockModel: any;
jest.mock('../src/DataContext', () => ({
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: () => {},
}));

async function draw(file: string) {
  const Screen = require(`../src/screens/${file}`).default;
  render(
    <ThemeProvider>
      <Screen />
    </ThemeProvider>,
  );
  await act(async () => {});
}
const page = (id: string) => screen.getByTestId(id, { includeHiddenElements: true });
const showing = (id: string) => page(id).props.accessibilityElementsHidden === false;

beforeEach(() => {
  mockModel = defaultModel();
  mockModel.travel = [{ id: 't1', name: 'Japan', startDate: '2099-04-02', endDate: '2099-04-09', checklist: [], todos: [{ id: 'td1', text: 'Book hotel', done: false }] }];
});

test.each([
  ['SavingsScreen', 'savings', 'goals', 'ef'],
  ['GroceriesScreen', 'groceries', 'list', 'calc'],
  ['EventsScreen', 'events', 'up', 'done'],
  ['TravelScreen', 'travel', 'budget', 'todo'],
])('%s: sub-pages slide, and tapping the second choice shows it', async (file, key, first, second) => {
  await draw(file);
  // Travel: open the trip first (its page has the Budget / To-do switch).
  if (key === 'travel') {
    fireEvent.press(screen.getByLabelText('Open Japan'));
    await act(async () => {});
  }
  // A phone-sized area, as the phone gives it when the page first shows.
  fireEvent(screen.getByTestId(`${key}-pages-viewport`), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } } });
  await act(async () => {});
  expect(showing(`${key}-pages-page-${first}`)).toBe(true);
  expect(showing(`${key}-pages-page-${second}`)).toBe(false);
  const tab = key === 'travel' ? 'travel-page-todo-tab' : `${key}-tab-${second}`;
  fireEvent.press(screen.getByTestId(tab));
  await act(async () => {});
  expect(showing(`${key}-pages-page-${second}`)).toBe(true);
  expect(showing(`${key}-pages-page-${first}`)).toBe(false);
});
