import type { BillCycle, HouseholdModel, LoanPayment, PaymentMethod } from './types';
import { happenedSinceUpdate } from './balanceProjection';
import { takeOffSavedBalance } from './takeOffBalance';
import { todayISO } from './dateUtils';
import { withFeeEntry } from './payFees';
import { loanCoverage } from './loanSchedule';
import { makeId } from './utils';

// H-48 (Cath, 2026-10-29, canvas C1-C3): Undo is offered only for 15 minutes after a payment
// is logged. After that the payment can still be EDITED: a receipt added, the amount raised
// (never below what was first paid), the date or the account fixed. Never removed, never
// lowered. The money moves with it:
// - A payment made after the balances were last typed in moves the balance by itself (live
//   balances add up every payment since then), so changing it is enough.
// - A payment that is already inside the typed-in balance (dated before it) is corrected in
//   that balance: the old amount goes back to the old account, the new comes off the new one.
// The amount stays as it is (receipt, date and account can still change) when the payment
// is tied to something else that would have to change with it: a debt round paid in part
// with the rest carried into the next round, or money paid into an investment.

export const UNDO_MS = 15 * 60 * 1000;

// Milliseconds of Undo left (0 = Undo is gone). No time stamp (older payments): none.
export function undoLeftMs(loggedAt: number | undefined, now: number = Date.now()): number {
  if (!loggedAt) return 0;
  return Math.max(0, loggedAt + UNDO_MS - now);
}

export type PaymentChanges = { amount: number; date: string; pm?: PaymentMethod; receipt?: string | null };

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const cents = (n: number) => Math.round(n * 100) / 100;

function inSavedBalance(model: HouseholdModel, date: string, at: number | undefined): boolean {
  const asOf = model.balanceAccounts?.asOfDate;
  if (!asOf || !date) return false;
  return date <= asOf && !happenedSinceUpdate(model, date, at, todayISO());
}

// Old amount back to the old account, new amount off the new one, for whichever side sits
// inside the typed-in balance. `sign` is 1 for money going out, -1 for money coming in.
function correctSaved(model: HouseholdModel, before: { amount: number; date: string; pm?: PaymentMethod; at?: number }, after: { amount: number; date: string; pm?: PaymentMethod; at?: number }, sign: number): HouseholdModel {
  let m = model;
  if (before.pm && inSavedBalance(model, before.date, before.at)) m = takeOffSavedBalance(m, before.pm, -sign * before.amount);
  if (after.pm && inSavedBalance(model, after.date, after.at)) m = takeOffSavedBalance(m, after.pm, sign * after.amount);
  return m;
}

export function cycleAmountLocked(c: BillCycle): string | null {
  if (typeof c.dueBefore === 'number' || num(c.carriedIn) > 0) return 'This round was paid in part and the rest moved to the next one, so its amount stays as it is.';
  if (c.investEntryId) return 'This money went into an investment, so its amount stays as it is. Change it on the investment.';
  return null;
}

export function checkChanges(original: number, ch: PaymentChanges, recordedOnly: boolean): string | null {
  if (!(ch.amount > 0)) return 'Enter how much was paid.';
  if (cents(ch.amount) < cents(original)) return `It can't be less than the ${original.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} first paid.`;
  if (ch.date > todayISO()) return "A payment can't be dated in the future.";
  if (!recordedOnly && !ch.pm) return 'Choose the account it was paid from.';
  return null;
}

export function editLoanPayment(model: HouseholdModel, loanId: string, paymentId: string, ch: PaymentChanges): HouseholdModel {
  const loan = (model.loans || []).find((l) => l.id === loanId);
  const p = loan?.actualPayments.find((x) => x.id === paymentId);
  if (!loan || !p) return model;
  const sign = loan.direction === 'lent' ? -1 : 1;
  const next: LoanPayment = {
    ...p,
    actual: cents(Math.max(ch.amount, num(p.actual))),
    date: ch.date,
    ...(p.recordedOnly ? {} : { paymentMethod: ch.pm ?? p.paymentMethod }),
  };
  if (ch.receipt === null) delete next.receiptPhoto;
  else if (ch.receipt) next.receiptPhoto = ch.receipt;
  let m: HouseholdModel = { ...model, loans: model.loans.map((l) => (l.id === loanId ? { ...l, actualPayments: l.actualPayments.map((x) => (x.id === paymentId ? next : x)) } : l)) };
  if (!p.recordedOnly) m = correctSaved(m, { amount: num(p.actual), date: p.date, pm: p.paymentMethod, at: p.createdAt }, { amount: num(next.actual), date: next.date, pm: next.paymentMethod, at: p.createdAt }, sign);
  return m;
}

export function editCyclePayment(model: HouseholdModel, kind: 'bill' | 'debt', recId: string, cycleId: string, ch: PaymentChanges): HouseholdModel {
  const list = kind === 'bill' ? model.bills : model.debts;
  const rec = list.find((r) => r.id === recId);
  const c = rec?.cycles.find((x) => x.id === cycleId);
  if (!rec || !c) return model;
  const locked = !!cycleAmountLocked(c);
  const amount = locked ? num(c.amountPaid) : cents(Math.max(ch.amount, num(c.amountPaid)));
  const next: BillCycle = {
    ...c,
    amountPaid: amount,
    paidDate: ch.date,
    ...(c.recordedOnly ? {} : { paymentMethod: ch.pm ?? c.paymentMethod }),
  };
  if (ch.receipt === null) delete next.receiptPhoto;
  else if (ch.receipt) next.receiptPhoto = ch.receipt;
  const upd = (r: any) => (r.id === recId ? { ...r, cycles: r.cycles.map((x: BillCycle) => (x.id === cycleId ? next : x)) } : r);
  let m: HouseholdModel = kind === 'bill' ? { ...model, bills: model.bills.map(upd) } : { ...model, debts: model.debts.map(upd) };
  if (!c.recordedOnly) m = correctSaved(m, { amount: num(c.amountPaid), date: c.paidDate, pm: c.paymentMethod, at: c.paidAt }, { amount, date: next.paidDate, pm: next.paymentMethod, at: c.paidAt }, 1);
  return m;
}

// Logging a loan payment (the loan's page and, H-50 D2, inside Edit loan: the same steps).
// It covers the oldest scheduled payment still open; a fee is its own Fees entry; "take it
// off my balance" takes it off the typed-in balance; "Just record it" uses no account.
export function withLoanPayment(
  model: HouseholdModel,
  loanId: string,
  p: { pm?: PaymentMethod; amount: number; date: string; takeOff?: boolean; fee?: number; receipt?: string; recordedOnly?: boolean }
): { model: HouseholdModel; payment: LoanPayment | null } {
  const loan = (model.loans || []).find((l) => l.id === loanId);
  if (!loan || !(p.amount > 0)) return { model, payment: null };
  const lent = loan.direction === 'lent';
  const fee = num(p.fee);
  const openFor = loanCoverage(loan, todayISO()).nextOpen;
  const feeTxnId = !p.recordedOnly && fee > 0 && !lent ? makeId('txn') : undefined;
  const payment: LoanPayment = p.recordedOnly
    ? { id: makeId('lpay'), date: p.date, actual: p.amount, recordedOnly: true, createdAt: Date.now(), ...(openFor ? { forDate: openFor } : {}), ...(fee > 0 ? { fee } : {}), ...(p.receipt ? { receiptPhoto: p.receipt } : {}) }
    : { id: makeId('lpay'), date: p.date, actual: p.amount, paymentMethod: p.pm, createdAt: Date.now(), ...(openFor ? { forDate: openFor } : {}), ...(fee > 0 && !lent ? { fee, feeTxnId } : {}), ...(p.receipt ? { receiptPhoto: p.receipt } : {}) };
  let m: HouseholdModel = { ...model, loans: model.loans.map((l) => (l.id === loanId ? { ...l, actualPayments: [...(l.actualPayments || []), payment] } : l)) };
  if (!p.recordedOnly && !lent && p.pm) {
    m = withFeeEntry(m, { amount: fee, label: loan.name || 'Loan', date: p.date, paymentMethod: p.pm, id: feeTxnId });
    if (p.takeOff) m = takeOffSavedBalance(m, p.pm, p.amount + fee);
  }
  return { model: m, payment };
}

// Undo (within 15 minutes): the payment and its fee entry go.
export function withoutLoanPayment(model: HouseholdModel, loanId: string, paymentId: string): HouseholdModel {
  const loan = (model.loans || []).find((l) => l.id === loanId);
  const p = loan?.actualPayments.find((x) => x.id === paymentId);
  if (!loan || !p) return model;
  const base = p.feeTxnId ? { ...model, manualTransactions: (model.manualTransactions || []).filter((t) => t.id !== p.feeTxnId) } : model;
  return { ...base, loans: base.loans.map((l) => (l.id === loanId ? { ...l, actualPayments: l.actualPayments.filter((x) => x.id !== paymentId) } : l)) };
}
