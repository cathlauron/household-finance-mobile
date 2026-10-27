import type { HouseholdModel, ManualTransaction, PaymentMethod } from './types';
import { makeId } from './utils';

// Cath, 2026-10-27 (canvas R4): a fee paid with a payment (bill, debt, loan, trip item)
// comes out of the same account as its own "Fees" entry, so it shows in Transactions and
// counts as spending, like a transfer's fee. Nothing is added for a zero fee.
export function withFeeEntry(
  model: HouseholdModel,
  fee: { amount: number; label: string; date: string; paymentMethod: PaymentMethod; notes?: string; id?: string }
): HouseholdModel {
  const amount = Math.round(fee.amount * 100) / 100;
  if (!(amount > 0)) return model;
  const entry: ManualTransaction = {
    id: fee.id || makeId('txn'),
    date: fee.date,
    label: `Fee: ${fee.label}`,
    amount,
    direction: 'out',
    owner: 'shared',
    category: 'Fees',
    notes: fee.notes || '',
    paymentMethod: fee.paymentMethod,
    createdAt: Date.now(),
  };
  return { ...model, manualTransactions: [...(model.manualTransactions || []), entry] };
}
