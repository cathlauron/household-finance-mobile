import { undoLeftMs } from './paymentEdit';
import type { BalanceAccountEntry, HouseholdModel, Transfer } from './types';

// Cath, 2026-10-27: Undo a money move, but only until a balance is typed in again. A move
// changes the two saved balances straight away; once either balance (or all of them) has
// been typed in since, undoing it would count the money twice. Older moves (saved before
// this) don't know when they were made, so they can't be undone.

type Group = 'cash' | 'debit' | 'credit';
function parse(key: string): { group: Group; id: string } | null {
  const [group, id] = key.split(':');
  return group === 'cash' || group === 'debit' || group === 'credit' ? { group, id } : null;
}
function account(model: HouseholdModel, key: string): BalanceAccountEntry | undefined {
  const k = parse(key);
  return k ? (model.balanceAccounts[k.group] || []).find((a) => a.id === k.id) : undefined;
}

export function canUndoTransfer(model: HouseholdModel, t: Transfer, now: number = Date.now()): { ok: boolean; reason?: string } {
  if (!t.createdAt) return { ok: false, reason: "This move was made before Undo existed, so it can't be undone. Make a move back instead." };
  // H-48 (Cath, 2026-10-29): Undo is only there for 15 minutes after the move.
  if (undoLeftMs(t.createdAt, now) <= 0) return { ok: false, reason: 'Undo is only there for 15 minutes after a move. To fix it, make a move back.' };
  const from = account(model, t.from);
  const to = account(model, t.to);
  if (!from || !to) return { ok: false, reason: "One of its accounts isn't here any more, so it can't be undone." };
  const asOfAt = model.balanceAccounts.asOfAt ?? 0;
  const typedSince = (a: BalanceAccountEntry) => (a.balanceLog || []).some((e) => e.at > (t.createdAt as number));
  if (asOfAt > t.createdAt || typedSince(from) || typedSince(to)) {
    return { ok: false, reason: "A balance has been typed in since this move, so undoing it would count the money twice. Make a move back instead." };
  }
  return { ok: true };
}

// Puts both balances back, removes its fee entry and the move itself.
export function undoTransfer(model: HouseholdModel, t: Transfer): HouseholdModel {
  if (!canUndoTransfer(model, t).ok) return model;
  const bump = (m: HouseholdModel, key: string, delta: number): HouseholdModel => {
    const k = parse(key) as { group: Group; id: string };
    return {
      ...m,
      balanceAccounts: {
        ...m.balanceAccounts,
        [k.group]: m.balanceAccounts[k.group].map((x) => (x.id === k.id ? { ...x, amount: Math.round(((typeof x.amount === 'number' ? x.amount : 0) + delta) * 100) / 100 } : x)),
      },
    };
  };
  const fee = typeof t.fee === 'number' ? t.fee : 0;
  let next = bump(bump(model, t.from, t.amount + (t.feeOffSaved ? fee : 0)), t.to, -t.amount);
  next = {
    ...next,
    transfers: (next.transfers || []).filter((x) => x.id !== t.id),
    manualTransactions: t.feeTxnId ? (next.manualTransactions || []).filter((x) => x.id !== t.feeTxnId) : next.manualTransactions,
  };
  return next;
}
