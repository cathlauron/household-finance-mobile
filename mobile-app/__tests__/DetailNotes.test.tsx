import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (2.2 build): "if notes are added, make sure that it is also visible".
// A bill's or debt's note now shows on its page, and a payment's note in its history line.
let mockModel: any;
let mockParams: any = {};
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
jest.mock('../src/pushNotifications', () => ({ ...jest.requireActual('../src/pushNotifications'), rescheduleBillNotifications: async () => {} }));
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({
    model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath',
    storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null,
    isOnline: true, guest: false, refreshModel: async () => 'up_to_date',
  }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'X', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));


function withNotes() {
  const m: any = defaultModel();
  m.bills = [{ id: 'b1', name: 'Meralco', recurringType: 'monthly', dueDate: { day: '10' }, category: 'Utilities', notes: 'Account no. on the back of the bill',
    cycles: [{ id: 'c1', dueDate: '2026-10-10', amountDue: 2500, amountPaid: 2500, paidDate: '2026-10-09', notes: 'paid at 7-Eleven' }] }];
  m.debts = [{ id: 'dt1', creditorOrPerson: 'Tita Lorna', recurringType: 'onetime', dueDate: { date: '2026-11-30' }, notes: 'For the laptop', cycles: [] }];
  return m;
}
test.each([
  ['bill', 'b1', 'Account no. on the back of the bill'],
  ['debt', 'dt1', 'For the laptop'],
])('a %s page shows its note', async (kind, id, note) => {
  mockModel = withNotes();
  mockParams = { kind, id };
  const Screen = require('../src/screens/PayDetailScreen').default;
  const r = render(
    <ThemeProvider>
      <Screen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(r.getByText(note)).toBeTruthy();
  if (kind === 'bill') expect(r.getByText(/paid at 7-Eleven/)).toBeTruthy();
});
