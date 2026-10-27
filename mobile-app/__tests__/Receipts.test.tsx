import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import PayFromSheet from '../src/components/PayFromSheet';
import ReceiptField from '../src/components/ReceiptField';
import { defaultModel } from '../src/defaultModel';
import { markPaid, undoLastPayment, currentCycle } from '../src/billPayments';

// Cath, 2026-10-27 (canvas R1-R4): receipts on shared expenses, bill/debt/loan payments and
// trip items. The photo library and the shrinking are stand-ins here.
jest.mock('../src/components/BottomSheet', () => ({ __esModule: true, default: ({ visible, header, children }: any) => (visible ? <>{header}{children}</> : null) }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file://r.jpg', width: 1200 }] })),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('../src/avatars', () => ({ makeReceiptDataUri: jest.fn(async () => 'data:image/jpeg;base64,RECEIPT') }));

const PHOTO = 'data:image/jpeg;base64,RECEIPT';

function model() {
  const m: any = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, debit: [{ id: 'd1', name: 'BDO', amount: 9000 }] };
  return m;
}

test('the receipt row: add a photo, see it, remove it', async () => {
  const onChange = jest.fn();
  const { rerender } = render(<ThemeProvider><ReceiptField photo={null} onChange={onChange} /></ThemeProvider>);
  expect(screen.getByText('Add photo')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('receipt-add')); });
  expect(onChange).toHaveBeenCalledWith(PHOTO);
  rerender(<ThemeProvider><ReceiptField photo={PHOTO} onChange={onChange} /></ThemeProvider>);
  expect(screen.getByText('Change photo')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('receipt-thumb')); });
  expect(screen.getByTestId('receipt-viewer')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('receipt-remove')); });
  expect(onChange).toHaveBeenLastCalledWith(null);
});

test('the payment sheet passes the receipt on, from an account and when just recording', async () => {
  const onConfirm = jest.fn();
  const onRecord = jest.fn();
  render(
    <ThemeProvider>
      <PayFromSheet visible withReceipt onClose={() => {}} title="Pay Pag-IBIG" amount={5000} direction="out" model={model()} initial={{ type: 'debit', accountId: 'd1' } as any} confirmLabel="Pay" onConfirm={onConfirm} onRecord={onRecord} />
    </ThemeProvider>,
  );
  await act(async () => { fireEvent.press(screen.getByTestId('pay-receipt-add')); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(onConfirm.mock.calls[0][6]).toBe(PHOTO);
});

test('just record it keeps the receipt too', async () => {
  const onRecord = jest.fn();
  render(
    <ThemeProvider>
      <PayFromSheet visible withReceipt onClose={() => {}} title="Pay" amount={500} direction="out" model={model()} confirmLabel="Pay" onConfirm={() => {}} onRecord={onRecord} />
    </ThemeProvider>,
  );
  await act(async () => { fireEvent.press(screen.getByTestId('pay-mode-record')); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-receipt-add')); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(onRecord.mock.calls[0][3]).toBe(PHOTO);
});

test('no receipt row unless asked for', () => {
  render(
    <ThemeProvider>
      <PayFromSheet visible onClose={() => {}} title="Pay" amount={500} direction="out" model={model()} confirmLabel="Pay" onConfirm={() => {}} />
    </ThemeProvider>,
  );
  expect(screen.queryByTestId('pay-receipt-add')).toBeNull();
});

test('a bill payment keeps its receipt; undo removes it; the next bill starts without one', () => {
  const bill: any = { id: 'b1', name: 'Meralco', recurringType: 'monthly', cycles: [{ id: 'c1', dueDate: '2026-10-05', amountDue: 900, amountPaid: '', paidDate: '', notes: '' }] };
  const paid: any = markPaid(bill, { type: 'debit', accountId: 'd1' } as any, '2026-10-05', 900, 0, { receiptPhoto: PHOTO });
  expect(paid.cycles[0].receiptPhoto).toBe(PHOTO);
  const next = currentCycle(paid) as any;
  if (next && next.id !== 'c1') expect(next.receiptPhoto).toBeUndefined();
  const undone: any = undoLastPayment(paid);
  expect(undone.cycles[0].receiptPhoto).toBeUndefined();
});
