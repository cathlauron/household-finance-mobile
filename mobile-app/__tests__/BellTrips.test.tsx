import { renderHook, act } from '@testing-library/react-native';
import { defaultModel } from '../src/defaultModel';

// H-63 (Cath, 2026-11-03): the bell's "Due in the next 14 days" includes trip items with a due date.
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/DataContext', () => ({ QuietWhenHidden: ({ children }: any) => children, useData: () => ({ model: null }), withTimeout: (p: any) => p }));
jest.mock('../src/usePendingRecovery', () => ({ usePendingRecovery: () => ({ request: null, requestId: null }) }));
jest.mock('../src/bellReadState', () => ({ loadBellRead: async () => [], markBellRead: async () => {}, markAllBellRead: async () => {}, pruneBellRead: async () => [] }));

test('a trip item due in a few days is in the bell, and opens its trip', async () => {
  const m: any = defaultModel();
  const d = new Date(Date.now() + 3 * 86400000);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  m.travel = [{ id: 'bkk', name: 'BKK', startDate: '2099-01-01', endDate: '2099-01-05', checklist: [{ id: 'h', title: 'Hotel balance', cost: 12000, checked: false, dueDate: iso }] }];
  const { useBellInbox } = require('../src/useBellInbox');
  const { result } = renderHook(() => useBellInbox('cath', m));
  await act(async () => {});
  const item = result.current.items.find((i: any) => i.title === 'Hotel balance');
  expect(item).toMatchObject({ group: 'due', due: { type: 'trip', tripId: 'bkk', amount: 12000 } });
  expect(item.subtitle).toMatch(/^BKK trip · Due /);
});
