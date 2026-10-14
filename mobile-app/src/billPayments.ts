import type { Bill, Debt, BillCycle, PaymentMethod } from './types';
import { getNextDueDate } from './recurrence';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

// Redesign: paying bills and debts ("Mark as paid" on the Bill page).
//
// A bill or debt keeps a list of cycles. Paid cycles stay as history; the last unpaid
// one is the CURRENT cycle (what's due next). Marking it paid records the amount and
// date, then — for anything that repeats — adds the next cycle on the next due date.
// Paying creates the matching "money out" automatically: Transactions already lists
// every paid cycle (see transactions.ts).

type CycleRecord = Bill | Debt;

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

export function isCyclePaid(c: BillCycle): boolean {
  return num(c.amountDue) > 0 && num(c.amountPaid) >= num(c.amountDue);
}

// The cycle that's due next (the last unpaid one), or the newest cycle if all are paid.
export function currentCycle(record: CycleRecord): BillCycle | undefined {
  const cycles = record.cycles || [];
  for (let i = cycles.length - 1; i >= 0; i--) if (!isCyclePaid(cycles[i])) return cycles[i];
  return cycles[cycles.length - 1];
}

export function paidCycles(record: CycleRecord): BillCycle[] {
  return (record.cycles || []).filter((c) => num(c.amountPaid) > 0).sort((a, b) => ((a.paidDate || a.dueDate) < (b.paidDate || b.dueDate) ? 1 : -1));
}

// The due date of the newest paid cycle — Left to Spend skips occurrences up to it.
export function lastPaidDueDate(record: CycleRecord): string | null {
  let latest: string | null = null;
  (record.cycles || []).forEach((c) => {
    if (isCyclePaid(c) && c.dueDate && (!latest || c.dueDate > latest)) latest = c.dueDate;
  });
  return latest;
}

export function wasPaidThisMonth(record: CycleRecord, today: Date = new Date()): boolean {
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  return (record.cycles || []).some((c) => num(c.amountPaid) > 0 && (c.paidDate || '').startsWith(ym));
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The due date that follows `afterISO` on this record's schedule (null for one-time).
export function nextDueAfter(record: CycleRecord, afterISO: string): string | null {
  if (record.recurringType === 'onetime') return null;
  const after = new Date(afterISO + 'T00:00:00');
  if (isNaN(after.getTime())) return null;
  after.setDate(after.getDate() + 1);
  const next = getNextDueDate(record.recurringType, record.dueDate, after, record.customStartDate, record.customFreq, record.customOccurrenceCount);
  return next ? toISO(next) : null;
}

// Marks the current cycle paid (in full) today, and queues the next one if it repeats.
export function markPaid<T extends CycleRecord>(record: T, pm?: PaymentMethod, date: string = todayISO()): T {
  const cur = currentCycle(record);
  if (!cur || isCyclePaid(cur)) return record;
  const paid: BillCycle = { ...cur, amountPaid: num(cur.amountDue), paidDate: date, paidAt: Date.now(), paymentMethod: pm ?? cur.paymentMethod };
  const cycles = (record.cycles || []).map((c) => (c.id === cur.id ? paid : c));
  const nextDue = nextDueAfter(record, cur.dueDate || date);
  if (nextDue) {
    cycles.push({
      id: makeId('cycle'),
      dueDate: nextDue,
      amountDue: cur.amountDue,
      amountPaid: '',
      paidDate: '',
      notes: '',
      paymentMethod: paid.paymentMethod,
      ...(cur.feesPortion !== undefined ? { feesPortion: cur.feesPortion } : {}),
    });
  }
  return { ...record, cycles };
}

// Undoes the newest payment: unpays it and removes the untouched next cycle it queued.
export function undoLastPayment<T extends CycleRecord>(record: T): T {
  const cycles = [...(record.cycles || [])];
  let idx = -1;
  cycles.forEach((c, i) => {
    if (num(c.amountPaid) > 0 && (idx < 0 || (c.paidDate || '') >= (cycles[idx].paidDate || ''))) idx = i;
  });
  if (idx < 0) return record;
  const last = cycles[cycles.length - 1];
  if (idx !== cycles.length - 1 && num(last.amountPaid) === 0 && !last.notes) cycles.pop();
  cycles[idx] = { ...cycles[idx], amountPaid: '', paidDate: '', paidAt: undefined };
  return { ...record, cycles };
}

// For the edit form: change the CURRENT cycle only, keeping paid history.
// The due date only moves when the schedule itself changed.
export function withEditedCurrentCycle(
  existing: BillCycle[] | undefined,
  patch: Partial<BillCycle>,
  newScheduleDueISO: string,
  scheduleChanged: boolean
): BillCycle[] {
  const cycles = [...(existing || [])];
  let idx = -1;
  for (let i = cycles.length - 1; i >= 0; i--) if (!isCyclePaid(cycles[i])) { idx = i; break; }
  if (idx < 0) {
    cycles.push({ id: makeId('cycle'), dueDate: newScheduleDueISO, amountDue: '', amountPaid: '', paidDate: '', notes: '', ...patch });
    return cycles;
  }
  const cur = cycles[idx];
  cycles[idx] = { ...cur, ...patch, dueDate: scheduleChanged || !cur.dueDate ? newScheduleDueISO : cur.dueDate };
  return cycles;
}
