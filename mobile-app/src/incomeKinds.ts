import type { HouseholdModel, ManualTransaction } from './types';

// Money in: what kind of money it is, picked in the + sheet ("What is it?").
// - Salary logs a payday on one of your Income sources (the same as logging it on the
//   Income page), so it replaces that expected payday instead of counting twice.
// - The others are one-off or irregular money (a bonus, a side job, an allowance, a
//   gift). They are saved as a normal money-in transaction tagged with the kind, and the
//   Income page lists them under "Extra income".

export type IncomeKind = 'salary' | 'bonus' | 'side' | 'allowance' | 'gift' | 'other';
export type ExtraIncomeKind = Exclude<IncomeKind, 'salary'>;

export const INCOME_KINDS: { id: IncomeKind; label: string }[] = [
  { id: 'salary', label: 'Salary' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'side', label: 'Side hustle' },
  { id: 'allowance', label: 'Allowance' },
  { id: 'gift', label: 'Gift' },
  { id: 'other', label: 'Other' },
];

export function incomeKindLabel(kind: IncomeKind): string {
  return INCOME_KINDS.find((k) => k.id === kind)?.label ?? 'Other';
}

// Every money-in transaction tagged as extra income, newest first.
export function extraIncome(model: HouseholdModel): ManualTransaction[] {
  return (model.manualTransactions || [])
    .filter((t) => t.direction === 'in' && !!t.incomeKind)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt ?? 0) - (a.createdAt ?? 0)));
}
