import type { HouseholdModel } from './types';

// Version 2.2 (Cath: "Delete" at the bottom of each page, not only inside Edit): one place
// that says what deleting each kind of record removes, so the page, the edit form and
// swipe-to-delete all do exactly the same thing.

export function withoutBill(model: HouseholdModel, id: string): HouseholdModel {
  return { ...model, bills: model.bills.filter((b) => b.id !== id) };
}

export function withoutDebt(model: HouseholdModel, id: string): HouseholdModel {
  return { ...model, debts: model.debts.filter((d) => d.id !== id) };
}

export function withoutLoan(model: HouseholdModel, id: string): HouseholdModel {
  return { ...model, loans: (model.loans || []).filter((l) => l.id !== id) };
}

export function withoutAccount(model: HouseholdModel, group: 'cash' | 'debit' | 'credit', id: string): HouseholdModel {
  return {
    ...model,
    balanceAccounts: { ...model.balanceAccounts, [group]: (model.balanceAccounts[group] ?? []).filter((a) => a.id !== id) },
  };
}

// A savings pot. A trip or event that was saving into it stops saving (otherwise its
// "Save in Savings" switch stayed on and quietly made a new pot on its next change).
export function withoutSavingsPot(model: HouseholdModel, id: string): HouseholdModel {
  return {
    ...model,
    savingsGoals: (model.savingsGoals || []).filter((g) => g.id !== id),
    events: (model.events || []).map((ev) => (ev.savingsGoalId === id ? { ...ev, savingsGoalId: undefined, trackInSavings: false } : ev)),
    travel: (model.travel || []).map((trip) => (trip.savingsGoalId === id ? { ...trip, savingsGoalId: undefined, trackInSavings: false } : trip)),
  };
}

// A trip, with its own savings pot and the spending its ticked items logged.
export function withoutTrip(model: HouseholdModel, id: string): HouseholdModel {
  const trip = (model.travel ?? []).find((t) => t.id === id);
  const linkedTxnIds = new Set((trip?.checklist ?? []).map((i) => i.expenseTransactionId).filter((x): x is string => !!x));
  return {
    ...model,
    travel: (model.travel ?? []).filter((t) => t.id !== id),
    savingsGoals: trip?.savingsGoalId ? (model.savingsGoals ?? []).filter((g) => g.id !== trip.savingsGoalId) : model.savingsGoals,
    manualTransactions: linkedTxnIds.size ? (model.manualTransactions ?? []).filter((t) => !linkedTxnIds.has(t.id)) : model.manualTransactions,
  };
}
