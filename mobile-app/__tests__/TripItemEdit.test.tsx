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
