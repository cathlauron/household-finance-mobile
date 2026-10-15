// ============================================================
// Redesign: repeating transactions ("Make it repeat" / Recurring page)
// ============================================================
// A repeat is made from a transaction you already logged (its first occurrence). Each
// time Home opens, every occurrence that has come due since is added as a normal
// transaction, dated on its own day, so you never type it twice. With "Ask before
// adding" on (Recurring page), they're still added but marked To review.
// Added transactions get the id `rec-<repeat id>-<date>`, so the same day can never be
// added twice, even from two phones in one household.

import type { HouseholdModel, ManualTransaction, RecurringFrequency, RecurringRule } from './types';
import { makeId } from './utils';
import { todayISO } from './dateUtils';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FREQUENCY_OPTIONS: { key: RecurringFrequency; label: string }[] = [
  { key: 'weekly', label: 'Every week' },
  { key: 'every2weeks', label: 'Every 2 weeks' },
  { key: 'monthly', label: 'Every month' },
  { key: 'yearly', label: 'Every year' },
];

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${s}`;
}

// The nth occurrence after the start date (n = 1 is the one after the first). Monthly and
// yearly keep the start's day of the month, using the last day in shorter months.
function occurrence(startISO: string, frequency: RecurringFrequency, n: number): string {
  const start = parse(startISO);
  if (frequency === 'weekly' || frequency === 'every2weeks') {
    const d = new Date(start);
    d.setDate(d.getDate() + n * (frequency === 'weekly' ? 7 : 14));
    return toISO(d);
  }
  const months = frequency === 'monthly' ? n : n * 12;
  const y = start.getFullYear() + Math.floor((start.getMonth() + months) / 12);
  const m = (start.getMonth() + months) % 12;
  const last = new Date(y, m + 1, 0).getDate();
  return toISO(new Date(y, m, Math.min(start.getDate(), last)));
}

// The first occurrence strictly after `afterISO`.
export function nextOccurrenceAfter(rule: Pick<RecurringRule, 'startDate' | 'frequency'>, afterISO: string): string {
  for (let n = 1; n < 2000; n++) {
    const d = occurrence(rule.startDate, rule.frequency, n);
    if (d > afterISO) return d;
  }
  return '9999-12-31';
}

// "Every Monday", "Every month on the 20th", "Every year on Oct 13".
export function describeFrequency(rule: Pick<RecurringRule, 'startDate' | 'frequency'>): string {
  const start = parse(rule.startDate);
  switch (rule.frequency) {
    case 'weekly':
      return `Every ${WEEKDAYS[start.getDay()]}`;
    case 'every2weeks':
      return `Every other ${WEEKDAYS[start.getDay()]}`;
    case 'monthly':
      return `Every month on the ${ordinal(start.getDate())}`;
    default:
      return `Every year on ${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
  }
}

export function frequencyLabel(frequency: RecurringFrequency): string {
  return FREQUENCY_OPTIONS.find((o) => o.key === frequency)?.label ?? 'Repeats';
}

// The repeat a transaction belongs to: the one made from it, or the one that added it.
export function ruleForTransaction(model: HouseholdModel, txn: ManualTransaction): RecurringRule | undefined {
  const rules = model.recurring || [];
  return rules.find((r) => (txn.recurringId ? r.id === txn.recurringId : r.sourceTxnId === txn.id));
}

// Turns a transaction into a repeat (or changes how often it repeats). Occurrences that
// are already due are added the next time Home opens.
export function setRepeat(model: HouseholdModel, txn: ManualTransaction, frequency: RecurringFrequency): HouseholdModel {
  const existing = ruleForTransaction(model, txn);
  if (existing) {
    const updated: RecurringRule = {
      ...existing,
      frequency,
      nextDate: nextOccurrenceAfter({ startDate: existing.startDate, frequency }, lastAddedDate(model, existing)),
    };
    return { ...model, recurring: (model.recurring || []).map((r) => (r.id === existing.id ? updated : r)) };
  }
  const rule: RecurringRule = {
    id: makeId('repeat'),
    label: txn.label,
    amount: txn.amount,
    direction: txn.direction,
    owner: txn.owner,
    ...(txn.category ? { category: txn.category } : {}),
    ...(txn.notes ? { notes: txn.notes } : {}),
    ...(txn.paymentMethod ? { paymentMethod: txn.paymentMethod } : {}),
    frequency,
    startDate: txn.date,
    nextDate: nextOccurrenceAfter({ startDate: txn.date, frequency }, txn.date),
    sourceTxnId: txn.id,
    createdAt: Date.now(),
  };
  return { ...model, recurring: [...(model.recurring || []), rule] };
}

// Stops a repeat. Transactions it already added stay.
export function stopRepeat(model: HouseholdModel, ruleId: string): HouseholdModel {
  return { ...model, recurring: (model.recurring || []).filter((r) => r.id !== ruleId) };
}

// The latest day this repeat has covered: its first occurrence or the last one added.
function lastAddedDate(model: HouseholdModel, rule: RecurringRule): string {
  let last = rule.startDate;
  (model.manualTransactions || []).forEach((t) => {
    if (t.recurringId === rule.id && t.date > last) last = t.date;
  });
  return last;
}

// Adds every occurrence that has come due (up to today). Returns null if nothing to add.
export function applyRecurring(model: HouseholdModel, today: string = todayISO()): HouseholdModel | null {
  const rules = model.recurring || [];
  if (rules.length === 0) return null;
  const existingIds = new Set((model.manualTransactions || []).map((t) => t.id));
  const askFirst = !!model.settings.recurringAskFirst;
  const added: ManualTransaction[] = [];
  let changed = false;
  const nextRules = rules.map((rule) => {
    let next = rule.nextDate;
    let guard = 0;
    while (next <= today && guard < 400) {
      guard++;
      const id = `rec-${rule.id}-${next}`;
      if (!existingIds.has(id)) {
        existingIds.add(id);
        added.push({
          id,
          date: next,
          label: rule.label,
          amount: rule.amount,
          direction: rule.direction,
          owner: rule.owner,
          ...(rule.category ? { category: rule.category } : {}),
          ...(rule.notes ? { notes: rule.notes } : {}),
          ...(rule.paymentMethod ? { paymentMethod: rule.paymentMethod } : {}),
          recurringId: rule.id,
          ...(askFirst ? { needsReview: true, reviewWhy: 'Added by a repeat' } : {}),
        });
      }
      next = nextOccurrenceAfter(rule, next);
    }
    if (next !== rule.nextDate) {
      changed = true;
      return { ...rule, nextDate: next };
    }
    return rule;
  });
  if (!changed && added.length === 0) return null;
  return { ...model, recurring: nextRules, manualTransactions: [...(model.manualTransactions || []), ...added] };
}
