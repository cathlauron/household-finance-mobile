import type { HouseholdModel, PaymentMethod, Transfer } from './types';
import { accountLabel } from './transactionActions';

// Cath, 2026-10-27 (canvas T1): money moved between your own accounts shows in the
// Transactions list, in grey, with its note. It is never spending: it is added only to
// what the list shows, never to In / Out, Left to Spend or any total.

export type TransferRow = {
  id: string;
  date: string;
  title: string; // "Moved: Cash → BDO" or "Paid card: BDO → BPI Credit"
  sub: string; // the note, then "not spending"
  amount: number;
  fee: number;
  note: string;
  fromName: string;
  toName: string;
};

function pmOf(key: string): PaymentMethod | undefined {
  const [type, accountId] = key.split(':');
  if (type !== 'cash' && type !== 'debit' && type !== 'credit') return undefined;
  return { type, accountId } as PaymentMethod;
}

export function transferRow(model: HouseholdModel, t: Transfer): TransferRow {
  const fromName = accountLabel(model, pmOf(t.from)) || 'Account';
  const toName = accountLabel(model, pmOf(t.to)) || 'Account';
  const toCard = t.to.startsWith('credit:');
  const note = (t.note || '').trim();
  return {
    id: t.id,
    date: t.date,
    title: `${toCard ? 'Paid card' : 'Moved'}: ${fromName} → ${toName}`,
    sub: [note, 'not spending'].filter(Boolean).join(' · '),
    amount: typeof t.amount === 'number' ? t.amount : 0,
    fee: typeof t.fee === 'number' ? t.fee : 0,
    note,
    fromName,
    toName,
  };
}

// The transfers the Transactions list shows with its current filters. A category filter
// is about spending, so it shows no transfers; an account filter shows the ones that
// touch that account.
export function transfersForList(
  model: HouseholdModel,
  filters: { month?: string; category?: string | null; accountKey?: string | null }
): TransferRow[] {
  if (filters.category) return [];
  return (model.transfers || [])
    .filter((t) => !filters.month || filters.month === 'all' || t.date.startsWith(filters.month))
    .filter((t) => !filters.accountKey || t.from === filters.accountKey || t.to === filters.accountKey)
    .map((t) => transferRow(model, t));
}
