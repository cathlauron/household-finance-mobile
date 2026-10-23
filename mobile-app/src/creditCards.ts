// Version 3: credit cards done properly (approved K1c, K4, K5).
//
// A card's saved balance stays "what you can still use" (approved K3, so the Accounts total
// doesn't change). With a credit limit, what you owe is the limit minus what you can use.
// Installments are tracked on the purchase; spending counts the whole amount the day you buy.

import type { BalanceAccountEntry, HouseholdModel } from './types';

export function cardOwed(card: BalanceAccountEntry, available: number): number | null {
  if (typeof card.creditLimit !== 'number' || card.creditLimit <= 0) return null;
  return Math.max(0, Math.round((card.creditLimit - available) * 100) / 100);
}

// The next statement due date on or after today, for a due day of the month (31 = last day
// in shorter months).
export function nextStatementDue(dueDay: number | undefined, today: Date = new Date()): Date | null {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const inMonth = (y: number, m: number) => new Date(y, m, Math.min(dueDay, new Date(y, m + 1, 0).getDate()));
  const thisMonth = inMonth(t.getFullYear(), t.getMonth());
  return thisMonth >= t ? thisMonth : inMonth(t.getFullYear(), t.getMonth() + 1);
}

export type CardInstallment = { id: string; label: string; perMonth: number; count: number; left: number };

// Purchases on this card split into payments that still have parts left. One part is paid
// for each month that has passed since the purchase.
export function installmentsOnCard(model: HouseholdModel, accountId: string, today: Date = new Date()): CardInstallment[] {
  return (model.manualTransactions || [])
    .filter((t) => t.direction === 'out' && t.paymentMethod?.type === 'credit' && t.paymentMethod.accountId === accountId && (t.installments ?? 0) > 1)
    .map((t) => {
      const count = t.installments as number;
      const d = new Date(t.date + 'T00:00:00');
      const months = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
      const left = Math.max(0, count - Math.max(0, months));
      return { id: t.id, label: t.label || 'Purchase', perMonth: Math.round((t.amount / count) * 100) / 100, count, left };
    })
    .filter((x) => x.left > 0)
    .sort((a, b) => b.left - a.left);
}

// One-time question (K4): is today's number what you can still use, or what you owe?
// Returns the new saved balance so the card's live balance becomes "what you can use".
export function savedBalanceAfterAnswer(savedAmount: number, liveBalance: number, answer: 'canUse' | 'owe', limit: number): number {
  if (answer === 'canUse') return savedAmount;
  const canUse = limit - liveBalance; // the number was what you owe
  return Math.round((savedAmount + (canUse - liveBalance)) * 100) / 100;
}
