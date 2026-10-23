import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// H-21 (2026-10-22, Cath agreed): a "Delete this...?" pop-up saved the data from when the
// pop-up opened, so a change arriving while it was open (e.g. the partner adding a
// transaction) was quietly undone when Delete was tapped.
let mockModel: any;
let mockLatest: any = null;
const mockSaveModel = jest.fn(async () => {});
jest.mock('../src/DataContext', () => ({
  // Pages beside the one showing stay quiet in the app; here they just draw.
  QuietWhenHidden: ({ children }: any) => children,
  useData: () => ({ model: mockModel, getModel: () => mockLatest ?? mockModel, saveModel: mockSaveModel, isLinked: false, username: 'cath' }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

test('deleting a bill keeps a change that arrived while "Delete this bill?" was open', async () => {
  mockModel = defaultModel();
  mockModel.bills = [{ id: 'b1', name: 'Meralco', category: '', recurringType: 'monthly', dueDate: { day: '15' }, priority: '', owner: 'shared', notes: '', cycles: [] }];
  let pressDelete: (() => void) | undefined;
  const spy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons: any) => {
    pressDelete = buttons?.find((b: any) => b.text === 'Delete')?.onPress;
  });
  const BillsScreen = require('../src/screens/BillsScreen').default;
  render(
    <ThemeProvider>
      <BillsScreen formOnly openBillId="b1" />
    </ThemeProvider>,
  );
  await act(async () => {});
  fireEvent.press(screen.getByText('Delete bill'));
  // While the pop-up is open, the partner adds a transaction.
  mockLatest = { ...mockModel, manualTransactions: [{ id: 'tp', date: '2026-10-22', label: 'Lunch', amount: 200, direction: 'out', owner: 'shared', category: '', notes: '' }] };
  await act(async () => {
    pressDelete?.();
  });
  spy.mockRestore();
  expect(mockSaveModel).toHaveBeenCalledTimes(1);
  const saved: any = (mockSaveModel.mock.calls[0] as any)[0];
  expect(saved.bills).toHaveLength(0);
  expect(saved.manualTransactions.map((t: any) => t.id)).toContain('tp');
});
