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
  lateFee: number = 0,
  // Cath, 2026-10-27 (canvas R4): "Just record it": no account, no time stamp (so no
  // balance, spending or forecast counts it), only the history. `feePaid`: a fee paid
  // with the payment (shown in History; from an account it's its own Fees entry).
  opts: { recordedOnly?: boolean; feePaid?: number; feeTxnId?: string } = {}
): T {
  const cur = currentCycle(record);
  if (!cur || isCyclePaid(cur)) return record;
  const due = num(cur.amountDue);
  const paidAmt = typeof amount === 'number' ? Math.max(0, Math.round(amount * 100) / 100) : due;
  const fee = Math.max(0, Math.round(lateFee * 100) / 100);
  const partial = paidAmt < due;
  const feePaid = Math.max(0, Math.round((opts.feePaid || 0) * 100) / 100);
  const { paymentMethod: _drop, paidAt: _dropAt, ...curWithoutAccount } = cur;
  // Code review 2026-10-27: flags from an earlier (undone) recording never carry over.
  const { recordedOnly: _r, feePaid: _f, feeTxnId: _t, loggedAt: _l, ...curClean } = cur;
  const paid: BillCycle = opts.recordedOnly
    ? {
        ...curWithoutAccount,
        amountPaid: paidAmt,
        paidDate: date,
        recordedOnly: true,
        loggedAt: Date.now(),
        ...(partial ? { amountDue: paidAmt, dueBefore: due } : {}),
        ...(fee > 0 ? { lateFee: fee } : {}),
        ...(feePaid > 0 ? { feePaid } : {}),
      }
    : {
        ...curClean,
        amountPaid: paidAmt,
        paidDate: date,
        paidAt: Date.now(),
        paymentMethod: pm ?? cur.paymentMethod,
        ...(partial ? { amountDue: paidAmt, dueBefore: due } : {}),
        ...(fee > 0 ? { lateFee: fee } : {}),
        ...(feePaid > 0 ? { feePaid, ...(opts.feeTxnId ? { feeTxnId: opts.feeTxnId } : {}) } : {}),
      };
  const cycles = (record.cycles || []).map((c) => (c.id === cur.id ? paid : c));
  const base = {
    id: makeId('cycle'),
    amountPaid: '' as const,
    paidDate: '',
    notes: '',
    // A recorded-only payment has no account; the next one keeps the usual account.
    paymentMethod: opts.recordedOnly ? cur.paymentMethod : paid.paymentMethod,
    ...(cur.feesPortion !== undefined ? { feesPortion: cur.feesPortion } : {}),
  };
  const nextDue = nextOpenDueAfter({ ...record, cycles } as T, cur.dueDate || date);
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
  const { dueBefore, lateFee, recordedOnly, feePaid, feeTxnId, loggedAt, ...rest } = cycles[idx];
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

// ---- Version 3 (Cath, canvas M4): paid, then the due date moved ----
// A payment stays tied to the due date the bill had when it was paid. When the due date
// is moved afterwards (often from "no due date" to a real one), the app asks which bill
// the latest payment was for, so it isn't ignored.

function dayBefore(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

// The next due date after `afterISO` that has no paid cycle on it yet.
export function nextOpenDueAfter(record: CycleRecord, afterISO: string): string | null {
  const paid = new Set((record.cycles || []).filter(isCyclePaid).map((c) => c.dueDate));
  let next = nextDueAfter(record, afterISO);
  for (let guard = 0; next && paid.has(next) && guard < 400; guard++) next = nextDueAfter(record, next);
  return next;
}

export type PaymentPlacement = {
  cycleId: string; // the paid cycle being placed
  paidDate: string;
  amountPaid: number;
  newDue: string; // the due date just picked (suggested)
  other: string | null; // the bill of the month it was paid in; null = nothing to ask
};

// After an edit (record already has the new schedule and cycles), returns the payment
// to place, or null when no payment is affected. `other` null means place it on the new
// due date without asking (paid in that same month, or a one-time bill).
export function paymentToPlace(record: CycleRecord, newDueISO: string): PaymentPlacement | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDueISO)) return null;
  const paid = (record.cycles || []).filter((c) => isCyclePaid(c) && !!c.paidDate);
  if (!paid.length) return null;
  if (paid.some((c) => c.dueDate === newDueISO)) return null; // that bill is already paid
  const latest = paid.reduce((a, b) => ((b.paidDate || '') > (a.paidDate || '') ? b : a));
  const base = { cycleId: latest.id, paidDate: latest.paidDate, amountPaid: num(latest.amountPaid), newDue: newDueISO };
  // A one-time bill is a single bill: once paid, a new date just moves the paid bill.
  if (record.recurringType === 'onetime') return { ...base, other: null };
  if (newDueISO > (latest.paidDate || '')) return null; // the new date is after the payment: nothing to place
  const paidMonthStart = latest.paidDate.slice(0, 7) + '-01';
  const other = nextDueAfter(record, dayBefore(paidMonthStart));
  if (!other || other === newDueISO || other.slice(0, 7) === newDueISO.slice(0, 7)) return { ...base, other: null };
  return { ...base, other };
}

// Puts the payment on `forISO` (the new due date or `other`) and sets the bill that's
// due next: after the new due date when the payment covers it, or the new due date itself
// (overdue) when the payment belongs to the later month.
export function placePayment<T extends CycleRecord>(record: T, p: PaymentPlacement, forISO: string): T {
  let cycles = (record.cycles || []).map((c) => (c.id === p.cycleId ? { ...c, dueDate: forISO } : c));
  const withPaid = { ...record, cycles } as T;
  let idx = -1;
  for (let i = cycles.length - 1; i >= 0; i--) if (!isCyclePaid(cycles[i])) { idx = i; break; }
  const nextDue = forISO === p.newDue ? nextOpenDueAfter(withPaid, forISO) : p.newDue;
  if (idx >= 0) {
    if (nextDue) cycles[idx] = { ...cycles[idx], dueDate: nextDue };
    else if (num(cycles[idx].amountPaid) === 0) cycles = cycles.filter((_, i) => i !== idx); // one-time: nothing left to pay
  } else if (nextDue) {
    const src = cycles.find((c) => c.id === p.cycleId);
    cycles = [...cycles, { id: makeId('cycle'), dueDate: nextDue, amountDue: num(src?.amountDue) || p.amountPaid, amountPaid: '', paidDate: '', notes: '', paymentMethod: src?.paymentMethod }];
  }
  return { ...record, cycles };
}
