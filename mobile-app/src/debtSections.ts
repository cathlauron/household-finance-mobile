import type { Debt, HouseholdModel } from './types';
import { currentCycle, isCyclePaid, wasPaidThisMonth } from './billPayments';
import { getNextDueDate } from './recurrence';
import { priorityRank } from './priority';

// H-40 + H-41 (Cath, 2026-10-29, canvas A2): Debts is grouped the way Bills is (Overdue /
// This week / Later this month / Coming up / No due date), with a "Paid this month" list and
// one summary card: still to pay this month, the no-due-date total, and how many are paid.

export function debtAmount(debt: Debt): number {
  // The amount of the cycle that's due next (paid cycles are history).
  const first = currentCycle(debt);
  return first && typeof first.amountDue === 'number' ? first.amountDue : 0;
}

// When the debt is due next; null when there's no date (or this one is paid with no next).
export function debtDue(d: Debt): Date | null {
  const cur = currentCycle(d);
  if (cur?.dueDate && !isCyclePaid(cur)) return new Date(cur.dueDate + 'T00:00:00');
  if (cur && isCyclePaid(cur)) return null;
  return getNextDueDate(d.recurringType, d.dueDate);
}

export type DebtSections = {
  sections: { title: string; items: Debt[] }[];
  paidThisMonth: Debt[];
  stillToPay: number;
  noDateTotal: number;
  paidCount: number;
  dueCount: number;
};

export function debtSections(model: Pick<HouseholdModel, 'debts'>, today: Date, overdueIds: Set<string>): DebtSections {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const days = (d: Date) => Math.round((d.getTime() - start.getTime()) / 86400000);
  const debts = [...(model.debts || [])].sort((a, b) => {
    const da = debtDue(a);
    const db = debtDue(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime() || priorityRank(a.priority) - priorityRank(b.priority);
  });
  const isPaidNow = (d: Debt) => {
    const cur = currentCycle(d);
    return !!cur && isCyclePaid(cur);
  };
  const dated = debts.filter((d) => debtDue(d) !== null);
  const noDate = debts.filter((d) => debtDue(d) === null && !isPaidNow(d));
  const late = (d: Debt) => overdueIds.has(d.id);
  const sections = [
    { title: 'Overdue', items: dated.filter(late) },
    { title: 'This week', items: dated.filter((d) => !late(d) && days(debtDue(d) as Date) <= 7) },
    { title: 'Later this month', items: dated.filter((d) => !late(d) && days(debtDue(d) as Date) > 7 && (debtDue(d) as Date) <= monthEnd) },
    { title: 'Coming up', items: dated.filter((d) => !late(d) && (debtDue(d) as Date) > monthEnd && days(debtDue(d) as Date) > 7) },
    { title: 'No due date', items: noDate },
  ];
  const paidThisMonth = debts.filter((d) => wasPaidThisMonth(d, today));
  const dueThisMonth = dated.filter((d) => late(d) || (debtDue(d) as Date) <= monthEnd);
  const sum = (list: Debt[]) => Math.round(list.reduce((s, d) => s + debtAmount(d), 0) * 100) / 100;
  return {
    sections,
    paidThisMonth,
    stillToPay: sum(dueThisMonth),
    noDateTotal: sum(noDate),
    paidCount: paidThisMonth.length,
    dueCount: paidThisMonth.length + dueThisMonth.length,
  };
}
