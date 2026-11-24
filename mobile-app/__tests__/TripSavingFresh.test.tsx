import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-69 (Cath's yes, 2026-11-24): the trip's Save in Savings switch saves from the newest data,
// so something saved a moment before (here: a new trip item) is not lost.
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

test('Save for this trip in Savings keeps a change saved a moment before', async () => {
  mockModel = household();
  await openTrip();
  // Something else was saved since the page drew (a new item; from this phone or a partner's).
  mockModel = { ...mockModel, travel: mockModel.travel.map((t: any) => ({ ...t, checklist: [...t.checklist, { id: 'ci2', title: 'Hotel', cost: 4500, checked: false }] })) };
  await act(async () => { fireEvent(screen.getByLabelText('Save for this trip in Savings'), 'valueChange', true); });
  await act(async () => {});
  const last = saved.at(-1);
  expect(last.travel[0].trackInSavings).toBe(true);
  expect(last.travel[0].checklist.map((c: any) => c.title)).toEqual(['Plane tickets', 'Hotel']);
}, 30000);
