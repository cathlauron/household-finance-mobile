import React from 'react';
import { TextInput } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import PayFromSheet from '../src/components/PayFromSheet';
import { defaultModel } from '../src/defaultModel';

// Cath, 2026-10-27 (canvas R4): one payment sheet: the amount can be changed (loans used
// to always log the monthly amount), Fees (optional), and "Just record it" with no account.
jest.mock('../src/components/BottomSheet', () => ({ __esModule: true, default: ({ visible, header, children }: any) => (visible ? <>{header}{children}</> : null) }));

function model() {
  const m: any = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, debit: [{ id: 'd1', name: 'BDO', amount: 9000 }] };
  return m;
}
function open(extra: any = {}) {
  const onConfirm = jest.fn();
  const onRecord = jest.fn();
  render(
    <ThemeProvider>
      <PayFromSheet visible onClose={() => {}} title="Pay Pag-IBIG" amount={5000} direction="out" model={model()} initial={{ type: 'debit', accountId: 'd1' } as any} confirmLabel="Pay" onConfirm={onConfirm} onRecord={onRecord} {...extra} />
    </ThemeProvider>,
  );
  return { onConfirm, onRecord };
}
const inputs = () => screen.UNSAFE_getAllByType(TextInput);

test('the amount typed in is the one paid, with the fee', async () => {
  const { onConfirm } = open();
  await act(async () => { fireEvent.changeText(inputs()[0], '4800'); });
  await act(async () => { fireEvent.changeText(inputs()[1], '25'); });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(onConfirm).toHaveBeenCalledTimes(1);
  const [pm, amount, , , , fee] = onConfirm.mock.calls[0];
  expect(pm).toEqual({ type: 'debit', accountId: 'd1' });
  expect(amount).toBe(4800);
  expect(fee).toBe(25);
});

test('just record it: saved with no account asked for', async () => {
  const { onRecord, onConfirm } = open({ initial: undefined });
  await act(async () => { fireEvent.press(screen.getByTestId('pay-mode-record')); });
  expect(screen.getByTestId('pay-record-note')).toBeTruthy();
  await act(async () => { fireEvent.press(screen.getByTestId('pay-from-confirm')); });
  expect(onConfirm).not.toHaveBeenCalled();
  expect(onRecord).toHaveBeenCalledWith(5000, 0, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
});
