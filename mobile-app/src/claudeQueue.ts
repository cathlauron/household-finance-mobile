// Claude connector (Cath, 2026-11-28): entries Claude adds wait in a queue in Firebase. The
// phone picks them up, turns each into a normal transaction marked "To review", locks it in
// with everything else, then deletes it from the queue. Claude can add; it can never change
// or remove anything already in the app.
import type { HouseholdModel, ManualTransaction, PaymentMethod } from './types';

export type QueueEntry = {
  id: string; // the queue document's id
  label?: unknown;
  amount?: unknown;
  direction?: unknown;
  category?: unknown;
  date?: unknown;
  account?: unknown;
  note?: unknown;
};

export const REVIEW_WHY = 'Added by Claude';
const MAX_AMOUNT = 100_000_000;
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const transactionIdFor = (queueId: string) => 'claude-' + queueId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);

function findAccount(model: HouseholdModel, name: string): PaymentMethod | undefined {
  const want = name.trim().toLowerCase();
  if (!want) return undefined;
  for (const type of ['cash', 'debit', 'credit'] as const) {
    const hit = model.balanceAccounts[type].find((a) => (a.name || '').trim().toLowerCase() === want);
    if (hit) return { type, accountId: hit.id };
  }
  return undefined;
}

// One queue entry as a transaction, or null when it can't be used (no amount, no label...).
export function entryToTransaction(model: HouseholdModel, entry: QueueEntry, today: Date = new Date(), username = ''): ManualTransaction | null {
  const amount = typeof entry.amount === 'number' ? Math.round(entry.amount * 100) / 100 : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return null;
  const label = text(entry.label, 80);
  if (!label) return null;
  const direction = entry.direction === 'in' ? 'in' : entry.direction === 'out' || entry.direction === undefined ? 'out' : null;
  if (!direction) return null;
  const todayISO = isoOf(today);
  const asked = text(entry.date, 10);
  // A missing, odd or future date becomes today.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) && !isNaN(new Date(asked + 'T00:00:00').getTime()) && asked <= todayISO ? asked : todayISO;
  const wantedCategory = text(entry.category, 40);
  const category = (model.categories || []).find((c) => c.name.toLowerCase() === wantedCategory.toLowerCase())?.name || wantedCategory || undefined;
  const paymentMethod = findAccount(model, text(entry.account, 60));
  const note = text(entry.note, 300);
  return {
    id: transactionIdFor(entry.id),
    date,
    label,
    amount,
    direction,
    owner: 'shared',
    ...(category ? { category } : {}),
    ...(note ? { notes: note } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    needsReview: true,
    reviewWhy: paymentMethod ? REVIEW_WHY : `${REVIEW_WHY}, no account picked`,
    ...(username ? { addedBy: username } : {}),
  };
}

// Adds every usable entry once. Returns the new model (or null when nothing was added) and the
// ids of every entry that is finished with (added now, added before, or unusable), so they can
// be deleted from the queue.
export function applyQueue(model: HouseholdModel, entries: QueueEntry[], today: Date = new Date(), username = ''): { model: HouseholdModel | null; done: string[] } {
  const have = new Set((model.manualTransactions || []).map((t) => t.id));
  const added: ManualTransaction[] = [];
  const done: string[] = [];
  entries.forEach((e) => {
    if (!e || typeof e.id !== 'string' || !e.id) return;
    const id = transactionIdFor(e.id);
    if (have.has(id)) {
      done.push(e.id);
      return;
    }
    const txn = entryToTransaction(model, e, today, username);
    done.push(e.id);
    if (!txn) return;
    have.add(id);
    added.push(txn);
  });
  if (!added.length) return { model: null, done };
  return { model: { ...model, manualTransactions: [...(model.manualTransactions || []), ...added] }, done };
}
