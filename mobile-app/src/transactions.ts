// ============================================================
// Household Finance App — Unified transaction list (Checkpoint 6.1 + 6.2)
// ============================================================
// Pulls together every dated, paid amount already recorded elsewhere in the
// app — paid bill cycles, paid debt cycles, logged loan payments, and now
// manually-added transactions — into one combined list, matching the spirit
// of the original web app's buildTransactionsList() (see the spec doc,
// §3.2). Income and savings-goal contributions aren't wired into any screen
// yet (Phase 7), so they're intentionally left out here — this function can
// grow to include them later without needing to change its own shape.
// ============================================================

import type { HouseholdModel } from './types';

export type TransactionSource = 'bill' | 'debt' | 'loan' | 'manual';
export type TransactionDirection = 'in' | 'out' | 'saving';

export type TransactionEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  category: string;
  source: TransactionSource;
  amount: number;
  direction: TransactionDirection;
  // Only set for source === 'manual' — the real id of the underlying
  // ManualTransaction in model.manualTransactions, so it can be found again
  // for editing/deleting. Bill/debt/loan entries are derived from their own
  // source records and aren't directly editable here.
  rawId?: string;
};

export function buildTransactionsList(model: HouseholdModel): TransactionEntry[] {
  const list: TransactionEntry[] = [];

  model.bills.forEach((bill) => {
    bill.cycles.forEach((cycle) => {
      const amt = typeof cycle.amountPaid === 'number' ? cycle.amountPaid : 0;
      const date = cycle.paidDate || cycle.dueDate;
      if (!date || amt <= 0) return;
      list.push({
        id: 'bill-' + cycle.id,
        date,
        label: bill.name || 'Bill',
        category: bill.category || 'Bill',
        source: 'bill',
        amount: amt,
        direction: 'out',
      });
    });
  });

  model.debts.forEach((debt) => {
    debt.cycles.forEach((cycle) => {
      const amt = typeof cycle.amountPaid === 'number' ? cycle.amountPaid : 0;
      const date = cycle.paidDate || cycle.dueDate;
      if (!date || amt <= 0) return;
      list.push({
        id: 'debt-' + cycle.id,
        date,
        label: (debt.creditorOrPerson || 'Debt') + ' payment',
        category: debt.category || 'Debt',
        source: 'debt',
        amount: amt,
        direction: 'out',
      });
    });
  });

  model.loans.forEach((loan) => {
    const lent = loan.direction === 'lent';
    loan.actualPayments.forEach((p) => {
      const amt = typeof p.actual === 'number' ? p.actual : 0;
      if (!p.date || amt <= 0) return;
      list.push({
        id: 'loan-' + p.id,
        date: p.date,
        label: lent
          ? (loan.name || 'Loan') + ' repayment received'
          : (loan.name || 'Loan') + ' payment',
        category: lent ? 'Loan repayment' : 'Loan',
        source: 'loan',
        amount: amt,
        direction: lent ? 'in' : 'out',
      });
    });
  });

  (model.manualTransactions || []).forEach((t) => {
    const amt = typeof t.amount === 'number' ? t.amount : 0;
    if (!t.date || amt <= 0) return;
    list.push({
      id: 'manual-' + t.id,
      date: t.date,
      label: t.label || 'Transaction',
      category: t.category || 'Manual',
      source: 'manual',
      amount: amt,
      direction: t.direction,
      rawId: t.id,
    });
  });

  return list;
}

export function sortTransactions(
  list: TransactionEntry[],
  order: 'newest' | 'oldest'
): TransactionEntry[] {
  const sorted = [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return order === 'newest' ? sorted.reverse() : sorted;
}

export function transactionTotals(list: TransactionEntry[]) {
  const totalIn = list.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = list.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0);
  const totalSaving = list.filter((t) => t.direction === 'saving').reduce((s, t) => s + t.amount, 0);
  return { totalIn, totalOut, totalSaving, net: totalIn - totalOut - totalSaving };
}
