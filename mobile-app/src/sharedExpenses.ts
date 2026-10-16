import type { HouseholdModel, Person, SharedExpense } from './types';

// Shared Expenses (Plan): splitting costs with people and seeing who owes whom.
//
// Every expense says who paid and each person's share. Everyone who isn't the payer owes
// the payer their share. Settle-up payments reduce what one person owes another.
// Balances are NETTED per pair of people, so each pair has one number to settle
// ("Miguel owes you ₱540" instead of two amounts going both ways).

export type PairBalance = { from: string; to: string; amount: number }; // `from` owes `to`

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sharedMembers(model: HouseholdModel): Person[] {
  const ids = model.sharedMembers ?? [];
  return ids.map((id) => model.people.find((p) => p.id === id)).filter((p): p is Person => !!p);
}

export function personLabel(model: HouseholdModel, id: string, myId: string | null): string {
  if (myId && id === myId) return 'You';
  return model.people.find((p) => p.id === id)?.name || 'Someone';
}

// Is this person part of any expense or payment? (Then they can't be removed.)
export function personIsUsed(model: HouseholdModel, id: string): boolean {
  return (
    (model.sharedExpenses ?? []).some((e) => e.paidBy === id || e.shares.some((s) => s.personId === id && s.amount > 0)) ||
    (model.sharedSettlements ?? []).some((s) => s.from === id || s.to === id)
  );
}

// Net balance for every pair of people, biggest first. Pairs that are even are left out.
export function pairBalances(model: HouseholdModel): PairBalance[] {
  const owes = new Map<string, number>(); // "a|b" = how much a owes b
  const add = (a: string, b: string, amt: number) => {
    if (!a || !b || a === b || !amt) return;
    owes.set(`${a}|${b}`, (owes.get(`${a}|${b}`) ?? 0) + amt);
  };
  (model.sharedExpenses ?? []).forEach((e: SharedExpense) => e.shares.forEach((s) => add(s.personId, e.paidBy, s.amount)));
  (model.sharedSettlements ?? []).forEach((s) => add(s.from, s.to, -s.amount));
  const done = new Set<string>();
  const out: PairBalance[] = [];
  owes.forEach((_, key) => {
    const [a, b] = key.split('|');
    const pair = [a, b].sort().join('|');
    if (done.has(pair)) return;
    done.add(pair);
    const net = round2((owes.get(`${a}|${b}`) ?? 0) - (owes.get(`${b}|${a}`) ?? 0));
    if (Math.abs(net) < 0.01) return;
    out.push(net > 0 ? { from: a, to: b, amount: net } : { from: b, to: a, amount: -net });
  });
  return out.sort((x, y) => y.amount - x.amount);
}

// What you are owed overall (positive) or owe overall (negative).
export function myNet(balances: PairBalance[], myId: string | null): number {
  if (!myId) return 0;
  return round2(balances.reduce((sum, b) => sum + (b.to === myId ? b.amount : b.from === myId ? -b.amount : 0), 0));
}

// Splits an amount equally between people, putting any leftover centavo on the first.
export function equalShares(amount: number, personIds: string[]): { personId: string; amount: number }[] {
  if (personIds.length === 0) return [];
  const cents = Math.round(amount * 100);
  const each = Math.floor(cents / personIds.length);
  const extra = cents - each * personIds.length;
  return personIds.map((personId, i) => ({ personId, amount: (each + (i < extra ? 1 : 0)) / 100 }));
}
