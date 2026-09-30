import { todayISO } from './dateUtils';

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
  kind: 'bill' | 'debt';
  id: string;
  cycleId: string;
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
// AND amountDue - amountPaid is still above zero. Oldest first.
export function getOverdueBillsAndDebts(
  model: { bills?: CycleRecord[]; debts?: CycleRecord[] }
): OverdueItem[] {
  const today = todayISO();
  const out: OverdueItem[] = [];

  const scan = (records: CycleRecord[] | undefined, kind: 'bill' | 'debt') => {
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
  };

  scan(model.bills, 'bill');
  scan(model.debts, 'debt');
  return out.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
}
