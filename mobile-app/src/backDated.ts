import { takeOffSavedBalance } from './takeOffBalance';
import type { HouseholdModel, ManualTransaction } from './types';

// Cath, 2026-11-14 (H-77): a transaction dated BEFORE the balances were last typed in is treated
// as already inside them, so it never moves the account. The form now asks, the same way paying
// a bill does (PayFromSheet, canvas S4): "It isn't included, take it off my balance". Ticked,
// the amount comes straight off (or, for money in, is added to) the saved balance, and the
// transaction remembers it (offSaved) so deleting it puts the balance back.

export function isBackDated(model: HouseholdModel, date: string): boolean {
  const asOf = model.balanceAccounts?.asOfDate;
  return !!asOf && !!date && date < asOf;
}

const signed = (t: ManualTransaction) => (typeof t.amount === 'number' ? t.amount : 0) * (t.direction === 'in' ? -1 : 1);

function withTxn(model: HouseholdModel, id: string, change: (t: ManualTransaction) => ManualTransaction): HouseholdModel {
  return { ...model, manualTransactions: (model.manualTransactions || []).map((t) => (t.id === id ? change(t) : t)) };
}

export function takeOffForTxn(model: HouseholdModel, id: string): HouseholdModel {
  const t = (model.manualTransactions || []).find((x) => x.id === id);
  if (!t || !t.paymentMethod || t.offSaved) return model;
  return withTxn(takeOffSavedBalance(model, t.paymentMethod, signed(t)), id, (x) => ({ ...x, offSaved: true }));
}

// The opposite: before the transaction is deleted or changed.
export function putBackForTxn(model: HouseholdModel, id: string): HouseholdModel {
  const t = (model.manualTransactions || []).find((x) => x.id === id);
  if (!t || !t.paymentMethod || !t.offSaved) return model;
  return withTxn(takeOffSavedBalance(model, t.paymentMethod, -signed(t)), id, (x) => {
    const { offSaved: _gone, ...rest } = x;
    return rest;
  });
}

// After an edit of a transaction that was taken off the saved balance: the old amount goes
// back to the old account, and the new one comes off the new account (if it is still dated
// before the last update; otherwise the live balance counts it by itself).
export function reapplyForEdit(before: HouseholdModel, after: HouseholdModel, id: string): HouseholdModel {
  const old = (before.manualTransactions || []).find((t) => t.id === id);
  if (!old?.offSaved) return after;
  const restored = putBackForTxn(before, id).balanceAccounts;
  const clean = withTxn({ ...after, balanceAccounts: restored }, id, (t) => {
    const { offSaved: _gone, ...rest } = t;
    return rest;
  });
  const now = (clean.manualTransactions || []).find((t) => t.id === id);
  return now && isBackDated(clean, now.date) ? takeOffForTxn(clean, id) : clean;
}
