import { todayISO } from './dateUtils';
import { loanOutstandingBalance } from './balanceProjection';
import type { Loan } from './types';

type Cycle = {
  id: string;
  dueDate?: string;
  amountDue?: number | string;
  amountPaid?: number | string;
};
type CycleRecord = {
  id: string;
  name?: string;
  creditorOrPerson?: string;
  cycles?: Cycle[];
};

export type OverdueItem = {
  kind: 'bill' | 'debt' | 'loan';
  id: string;
  cycleId?: string; // bills and debts only
  name: string;
  dueDate: string;
  amountOwed: number;
  key: string; // used by the bell's read-state file
};

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return isNaN(n) ? 0 : n;
}

// A cycle is overdue when its due date is before today (local date)
// AND amountDue - amountPaid is still above zero.
function scanCycles(records: CycleRecord[] | undefined, kind: 'bill' | 'debt', today: string): OverdueItem[] {
  const out: OverdueItem[] = [];
  (records || []).forEach(r => {
    (r.cycles || []).forEach(c => {
      if (!c.dueDate || c.dueDate >= today) return;
      const owed = num(c.amountDue) - num(c.amountPaid);
      if (owed <= 0) return;
      out.push({
        kind,
        id: r.id,
        cycleId: c.id,
        name: (kind === 'bill' ? r.name : r.creditorOrPerson) || (kind === 'bill' ? 'Bill' : 'Debt'),
        dueDate: c.dueDate,
        amountOwed: owed,
        key: `overdue:${kind}:${r.id}:${c.id}`,
      });
    });
  });
  return out;
}

// Only ONE-TIME loans you owe (borrowed) can be overdue. Recurring loans have no
// cycles, so there is no reliable way to call them late.
function scanLoans(loans: Loan[] | undefined, today: string): OverdueItem[] {
  const out: OverdueItem[] = [];
  (loans || []).forEach(l => {
    if (l.direction !== 'borrowed') return;
    if (l.recurringType !== 'onetime') return;
    const due = l.dueDate && typeof l.dueDate.date === 'string' ? l.dueDate.date : '';
    if (!due || due >= today) return;
    const owed = loanOutstandingBalance(l);
    if (owed <= 0) return;
    out.push({
      kind: 'loan',
      id: l.id,
      name: l.name || 'Loan',
      dueDate: due,
      amountOwed: owed,
      key: `overdue:loan:${l.id}`,
    });
  });
  return out;
}

// Everything overdue right now, oldest first.
export function getOverdueItems(
  model: { bills?: CycleRecord[]; debts?: CycleRecord[]; loans?: Loan[] }
): OverdueItem[] {
  const today = todayISO();
  return [
    ...scanCycles(model.bills, 'bill', today),
    ...scanCycles(model.debts, 'debt', today),
    ...scanLoans(model.loans, today),
  ].sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}
