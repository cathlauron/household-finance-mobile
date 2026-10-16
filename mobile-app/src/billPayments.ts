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

// The least that should be paid on the current cycle: a debt's minimum payment plus
// anything carried over from last time (never more than the amount due). Without a
// minimum it is the whole amount due.
export function minimumDue(record: CycleRecord, cur: BillCycle | undefined): number {
  if (!cur) return 0;
  const due = num(cur.amountDue);
  const min = num((record as Debt).minPayment);
  if (min <= 0) return due;
  return Math.min(due, min + num(cur.carriedIn));
}

// Marks the current cycle paid today, and queues the next one if it repeats.
// `amount` (debts only) can be less than the amount due:
//  - Repeating debt: the unpaid part of the MINIMUM, plus any late fee, is added to the
//    next amount due. Paying more than the minimum doesn't change the next amount.
//  - One-time debt: whatever is still owed (plus any late fee) stays as a new amount
//    due on the same date, so the debt shrinks by what was paid.
// Without `amount` it is paid in full (bills, and debts paid in full).
export function markPaid<T extends CycleRecord>(
  record: T,
  pm?: PaymentMethod,
  date: string = todayISO(),
  amount?: number,
  lateFee: number = 0
): T {
  const cur = currentCycle(record);
  if (!cur || isCyclePaid(cur)) return record;
  const due = num(cur.amountDue);
  const paidAmt = typeof amount === 'number' ? Math.max(0, Math.round(amount * 100) / 100) : due;
  const fee = Math.max(0, Math.round(lateFee * 100) / 100);
  const partial = paidAmt < due;
  const paid: BillCycle = {
    ...cur,
    amountPaid: paidAmt,
    paidDate: date,
    paidAt: Date.now(),
    paymentMethod: pm ?? cur.paymentMethod,
    ...(partial ? { amountDue: paidAmt, dueBefore: due } : {}),
    ...(fee > 0 ? { lateFee: fee } : {}),
  };
  const cycles = (record.cycles || []).map((c) => (c.id === cur.id ? paid : c));
  const base = {
    id: makeId('cycle'),
    amountPaid: '' as const,
    paidDate: '',
    notes: '',
    paymentMethod: paid.paymentMethod,
    ...(cur.feesPortion !== undefined ? { feesPortion: cur.feesPortion } : {}),
  };
  const nextDue = nextDueAfter(record, cur.dueDate || date);
  if (nextDue) {
    const normal = Math.max(0, due - num(cur.carriedIn));
    const carry = Math.max(0, minimumDue(record, cur) - paidAmt) + fee;
    cycles.push({ ...base, dueDate: nextDue, amountDue: Math.round((normal + carry) * 100) / 100, ...(carry > 0 ? { carriedIn: carry } : {}) });
  } else if (partial || fee > 0) {
    const left = Math.max(0, due - paidAmt) + fee;
    cycles.push({ ...base, dueDate: cur.dueDate || date, amountDue: Math.round(left * 100) / 100, ...(fee > 0 ? { carriedIn: fee } : {}) });
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
  const { dueBefore, lateFee, ...rest } = cycles[idx];
  cycles[idx] = { ...rest, amountPaid: '', paidDate: '', paidAt: undefined, ...(typeof dueBefore === 'number' ? { amountDue: dueBefore } : {}) };
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
