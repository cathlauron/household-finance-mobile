import type { HouseholdModel } from './types';

// H-51 (Cath, 2026-10-29, canvas F2 + F3): when the app opens or comes back, what another
// household member added or changed since this phone last showed their changes, newest
// first. Uses the who / when stamps every entry carries (whoStamp.ts, H-43). A change by you
// is never listed; neither is anything without a time (older entries).

export type HouseholdChange = {
  who: string;
  what: string; // its name: "Groceries", "Meralco"
  action: 'Added' | 'Changed' | 'Marked paid';
  kind: string; // "Transaction", "Bill", "Trip item"...
  at: number;
  amount?: number;
  ref?: { page: 'PayDetail'; kind: 'bill' | 'debt' | 'loan'; id: string } | { page: 'TransactionDetail'; id: string } | { page: 'TransferDetail'; id: string } | { page: string };
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function householdChangesSince(model: HouseholdModel, me: string | null | undefined, since: number): HouseholdChange[] {
  const out: HouseholdChange[] = [];
  const other = (who?: string) => !!who && who !== me;
  // One entry: "Added" if it was added after `since`, else "Changed" if changed after.
  const look = (e: any, what: string, kind: string, ref?: HouseholdChange['ref'], amount?: number) => {
    if (!e) return;
    if (other(e.addedBy) && num(e.createdAt) !== undefined && e.createdAt > since) {
      out.push({ who: e.addedBy, what, action: 'Added', kind, at: e.createdAt, amount, ref });
    } else if (other(e.changedBy) && num(e.changedAt) !== undefined && e.changedAt > since) {
      out.push({ who: e.changedBy, what, action: 'Changed', kind, at: e.changedAt, amount, ref });
    }
  };
  for (const t of model.manualTransactions || []) look(t, t.label || 'Transaction', 'Transaction', { page: 'TransactionDetail', id: t.id }, num(t.amount));
  for (const [kind, list] of [['bill', model.bills || []], ['debt', model.debts || []]] as const) {
    for (const r of list as any[]) {
      const name = r.name || r.creditorOrPerson || (kind === 'bill' ? 'Bill' : 'Debt');
      const ref = { page: 'PayDetail' as const, kind, id: r.id };
      look(r, name, kind === 'bill' ? 'Bill' : 'Debt', ref);
      for (const c of r.cycles || []) {
        if (other(c.paidBy) && num(c.paidAt ?? c.loggedAt) !== undefined && (c.paidAt ?? c.loggedAt) > since) {
          out.push({ who: c.paidBy, what: name, action: 'Marked paid', kind: kind === 'bill' ? 'Bill' : 'Debt', at: c.paidAt ?? c.loggedAt, amount: num(c.amountPaid), ref });
        }
      }
    }
  }
  for (const l of model.loans || []) {
    const ref = { page: 'PayDetail' as const, kind: 'loan' as const, id: l.id };
    look(l, l.name || 'Loan', 'Loan', ref);
    for (const p of l.actualPayments || []) {
      if (other(p.addedBy) && num(p.createdAt) !== undefined && (p.createdAt as number) > since) out.push({ who: p.addedBy as string, what: l.name || 'Loan', action: 'Marked paid', kind: 'Loan payment', at: p.createdAt as number, amount: num(p.actual), ref });
      else look({ ...p, addedBy: undefined }, l.name || 'Loan', 'Loan payment', ref, num(p.actual));
    }
  }
  for (const s of model.income || []) {
    look(s, s.sourceName || s.category || 'Income', 'Income', { page: 'Income' });
    for (const e of s.paymentLog || []) look(e, s.sourceName || s.category || 'Income', 'Payday', { page: 'Income' }, num(e.amount));
  }
  for (const g of model.savingsGoals || []) {
    look(g, g.name || 'Savings', 'Savings pot', { page: 'Savings' });
    for (const c of g.contributions || []) look(c, g.name || 'Savings', 'Savings move', { page: 'Savings' }, num(c.amount));
  }
  for (const t of model.travel || []) {
    look(t, t.name || 'Trip', 'Trip', { page: 'Travel' });
    for (const i of t.checklist || []) look(i, i.title || 'Item', `Trip item · ${t.name || 'Trip'}`, { page: 'Travel' }, num(i.cost));
    for (const d of t.todos || []) look(d, d.text || 'To-do', `Trip to-do · ${t.name || 'Trip'}`, { page: 'Travel' });
  }
  for (const g of model.groceries || []) look(g, g.item || 'Item', 'Grocery item', { page: 'Groceries' }, num(g.plannedAmount));
  for (const m of model.mealIdeas || []) look(m, m.name || 'Meal', 'Meal idea', { page: 'Groceries' });
  for (const e of model.events || []) look(e, e.name || 'Event', 'Event', { page: 'Events' }, num(e.budget));
  for (const e of model.sharedExpenses || []) look(e, e.label || 'Shared expense', 'Shared expense', { page: 'SharedExpenses' }, num(e.amount));
  for (const e of model.sharedSettlements || []) look(e, 'Settle up', 'Shared payment', { page: 'SharedExpenses' }, num(e.amount));
  for (const t of model.transfers || []) look(t, 'Money moved', 'Move', { page: 'TransferDetail', id: t.id }, num(t.amount));
  for (const inv of model.investments || []) {
    look(inv, inv.name || 'Investment', 'Investment', { page: 'Investments' });
    for (const e of inv.entries || []) look(e, inv.name || 'Investment', 'Investment move', { page: 'Investments' }, num(e.amount));
  }
  for (const g of model.yearlyGoals || []) look(g, g.title || 'Goal', 'Goal', { page: 'YearlyGoals' });
  for (const k of ['cash', 'debit', 'credit'] as const) for (const a of model.balanceAccounts?.[k] || []) look(a, a.name || 'Account', 'Account', { page: 'Accounts' });
  return out.sort((a, b) => b.at - a.at);
}

// "Ana changed 3 things" / "Ana and Ben changed 4 things".
export function changesHeadline(list: HouseholdChange[], nameOf: (u: string) => string): string {
  const names = [...new Set(list.map((c) => nameOf(c.who)))];
  const who = names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${who} changed ${list.length} ${list.length === 1 ? 'thing' : 'things'}`;
}
