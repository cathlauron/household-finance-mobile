import type { HouseholdModel, ManualTransaction, PaymentMethod } from './types';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

// Redesign: small helpers shared by the Transaction detail page (and later, Search and
// To review). Each returns an updated copy of the household data; the caller saves it.

// "BPI Savings", "Cash", "Credit card" — the account a transaction was paid from.
export function accountLabel(model: HouseholdModel, pm: PaymentMethod | undefined): string | null {
  if (!pm) return null;
  if (pm.type === 'cash') {
    const cash = model.balanceAccounts.cash.find((a) => a.id === pm.accountId);
    return cash?.name || 'Cash';
  }
  const list = pm.type === 'debit' ? model.balanceAccounts.debit : model.balanceAccounts.credit;
  const acct = list.find((a) => a.id === pm.accountId);
  return acct?.name || (pm.type === 'debit' ? 'Debit' : 'Credit card');
}

// Deletes a manual transaction (and the refund it created, if any).
export function deleteManualTxn(model: HouseholdModel, id: string): HouseholdModel {
  const deleted = (model.manualTransactions || []).find((t) => t.id === id);
  return {
    ...model,
    manualTransactions: (model.manualTransactions || [])
      .filter((t) => t.id !== id)
      .filter((t) => !(deleted?.refundTransactionId && t.id === deleted.refundTransactionId)),
  };
}

// Marks a pending refund as received: adds the linked "money in" transaction.
export function markRefundReceived(model: HouseholdModel, id: string): HouseholdModel | null {
  const raw = (model.manualTransactions || []).find((m) => m.id === id);
  if (!raw || typeof raw.refundExpectedAmount !== 'number' || raw.refundTransactionId) return null;
  const refund: ManualTransaction = {
    id: makeId('txn'),
    date: todayISO(),
    label: 'Refund: ' + (raw.label || 'Transaction'),
    amount: raw.refundExpectedAmount,
    direction: 'in',
    owner: raw.owner || 'shared',
    category: raw.category || 'Refund',
  };
  return {
    ...model,
    manualTransactions: [
      ...(model.manualTransactions || []).map((t) => (t.id === id ? { ...t, refundTransactionId: refund.id } : t)),
      refund,
    ],
  };
}

// Undoes "refund received": removes the linked income and sets it back to pending.
export function undoRefund(model: HouseholdModel, id: string): HouseholdModel | null {
  const raw = (model.manualTransactions || []).find((m) => m.id === id);
  if (!raw || !raw.refundTransactionId) return null;
  const linked = raw.refundTransactionId;
  return {
    ...model,
    manualTransactions: (model.manualTransactions || [])
      .filter((t) => t.id !== linked)
      .map((t) => (t.id === id ? { ...t, refundTransactionId: undefined } : t)),
  };
}
