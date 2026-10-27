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
  // Cath 2026-10-27 (canvas I1): money put into / taken out of an investment, opened on
  // the Investments page instead of a transfer's page.
  investmentId?: string;
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

// Money put into or taken out of an investment from / to one of your accounts: listed the
// same way (grey, "not spending"). A value typed in, or money with no account, isn't listed.
export function investmentMovesForList(
  model: HouseholdModel,
  filters: { month?: string; category?: string | null; accountKey?: string | null }
): TransferRow[] {
  if (filters.category) return [];
  const out: TransferRow[] = [];
  for (const inv of model.investments || []) {
    for (const e of inv.entries || []) {
      if ((e.type !== 'add' && e.type !== 'withdraw') || !e.paymentMethod) continue;
      if (filters.month && filters.month !== 'all' && !e.date.startsWith(filters.month)) continue;
      const key = `${e.paymentMethod.type}:${e.paymentMethod.accountId}`;
      if (filters.accountKey && filters.accountKey !== key) continue;
      const acct = accountLabel(model, e.paymentMethod) || 'Account';
      const name = inv.name || 'Investment';
      const note = (e.note || '').trim();
      out.push({
        id: e.id,
        date: e.date,
        title: e.type === 'add' ? `Invested: ${acct} → ${name}` : `Took out: ${name} → ${acct}`,
        sub: [note, 'not spending'].filter(Boolean).join(' · '),
        amount: typeof e.amount === 'number' ? e.amount : 0,
        fee: 0,
        note,
        fromName: e.type === 'add' ? acct : name,
        toName: e.type === 'add' ? name : acct,
        investmentId: inv.id,
      });
    }
  }
  return out;
}
