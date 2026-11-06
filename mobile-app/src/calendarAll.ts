import type { HouseholdModel } from './types';
import { loanOccurrenceInMonth, type CalendarEvent } from './balanceProjection';
import { withTripItems } from './tripDue';
import { eventBudget } from './eventDates';
import { nextOccurrenceAfter } from './recurring';

// Cath, 2026-11-06: the Calendar is her main calendar, so it shows everything she added a date
// for, a due date or just a reminder. Events show whether or not they are in Savings and
// whether or not they have an amount.
//
// These are reminders only: only the Calendar uses this file, and eventDelta() counts a reminder
// as 0, so no balance, Left to Spend or To-Pay total changes. What computeMonthEvents already
// shows (bills, debts, loans, income, transactions, savings) is left as it is.

const EVENT_KIND: Record<string, string> = { birthday: 'Birthday', anniversary: 'Anniversary', other: 'Event' };

function dayIn(iso: string | undefined, year: number, month: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m || Number(m[1]) !== year || Number(m[2]) - 1 !== month) return null;
  return Number(m[3]);
}
const money = (v: unknown): number => (typeof v === 'number' && v > 0 ? v : 0);

const dayCount = (fromIso: string, toIso: string): number =>
  Math.round((new Date(toIso + 'T00:00:00').getTime() - new Date(fromIso + 'T00:00:00').getTime()) / 86400000);

// Cath, 2026-11-06 (mockup A): every day of a trip that falls in this month. A trip with one date,
// or with an end before its start, is that one day.
function tripDaysIn(start: string, end: string, year: number, month: number): { day: number; nth: number; total: number; first: boolean; last: boolean }[] {
  const from = start || end;
  if (!from) return [];
  const to = start && end && end >= start ? end : from;
  const total = dayCount(from, to) + 1;
  const days: { day: number; nth: number; total: number; first: boolean; last: boolean }[] = [];
  const inMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= inMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (iso < from || iso > to) continue;
    const nth = dayCount(from, iso) + 1;
    days.push({ day, nth, total, first: nth === 1, last: nth === total });
  }
  return days;
}

function repeatsIn(rule: NonNullable<HouseholdModel['recurring']>[number], year: number, month: number): number[] {
  const days: number[] = [];
  const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  let at = rule.nextDate;
  for (let guard = 0; at && at <= end && guard < 2000; guard++) {
    const d = dayIn(at, year, month);
    if (d) days.push(d);
    const next = nextOccurrenceAfter(rule, at);
    if (!next || next <= at) break;
    at = next;
  }
  return days;
}

export function withEverythingDated(events: Record<number, CalendarEvent[]>, model: HouseholdModel, year: number, month: number): Record<number, CalendarEvent[]> {
  const out: Record<number, CalendarEvent[]> = { ...withTripItems(events, model, year, month) };
  const add = (day: number | null, label: string, sub: string, amount: number, open?: CalendarEvent['open'], band?: CalendarEvent['band']) => {
    if (!day) return;
    out[day] = [...(out[day] || []), { type: 'reminder', label, sub, amount, ...(open ? { open } : {}), ...(band ? { band } : {}) }];
  };

  for (const ev of model.events || []) {
    const kind = EVENT_KIND[ev.type] || 'Event';
    const open = { page: 'Events' };
    const band = { kind: 'event' as const, key: `event-${ev.id}`, first: true, last: true };
    if (ev.recurrence === 'onetime') {
      add(dayIn(ev.onetimeDate, year, month), ev.name || 'Event', kind, money(eventBudget(ev)), open, band);
    } else if (typeof ev.month === 'number' && typeof ev.day === 'number' && ev.month - 1 === month) {
      // A Feb 29 birthday shows on the last day of February in other years.
      add(Math.min(ev.day, new Date(year, month + 1, 0).getDate()), ev.name || 'Event', kind, money(eventBudget(ev)), open, band);
    }
  }

  for (const trip of model.travel || []) {
    const name = trip.name || 'Trip';
    const open = { page: 'Travel', params: { tripId: trip.id } };
    for (const d of tripDaysIn(trip.startDate, trip.endDate, year, month)) {
      add(d.day, name, d.total > 1 ? `Trip · day ${d.nth} of ${d.total}` : 'Trip', 0, open, { kind: 'trip', key: `trip-${trip.id}`, first: d.first, last: d.last });
    }
    for (const item of trip.checklist || []) {
      // An unpaid item with a cost is already there from withTripItems.
      if (item.checked) add(dayIn(item.dueDate, year, month), item.title || 'Trip item', `${name} trip · paid`, 0, open);
      else if (!money(item.cost)) add(dayIn(item.dueDate, year, month), item.title || 'Trip item', `${name} trip · due`, 0, open);
    }
    for (const td of trip.todos || []) {
      add(dayIn(td.date, year, month), td.text || 'To-do', `${name} trip · ${td.done ? 'done' : 'to-do'}`, money(td.cost), open);
    }
  }

  // A pot made for a trip or event would only repeat that trip or event.
  const planPots = new Set([...(model.travel || []), ...(model.events || [])].map((p) => p.savingsGoalId).filter(Boolean));
  for (const goal of model.savingsGoals || []) {
    if (planPots.has(goal.id)) continue;
    add(dayIn(goal.targetDate, year, month), goal.name || 'Savings goal', 'Savings goal', money(goal.targetAmount), { page: 'PotDetail', params: { id: goal.id } });
  }
  for (const goal of model.yearlyGoals || []) {
    add(dayIn(goal.targetDate, year, month), goal.title || 'Goal', goal.completed ? 'Yearly goal · done' : 'Yearly goal', money(goal.targetAmount), { page: 'YearlyGoals' });
  }

  for (const g of model.groceries || []) {
    add(dayIn(g.buyBy, year, month), g.item || 'Grocery item', g.purchased ? 'Grocery item · bought' : 'Grocery item', money(g.plannedAmount), { page: 'Groceries' });
  }

  for (const bill of model.bills || []) {
    if (bill.subscriptionStatus === 'cancelled') continue;
    add(dayIn(bill.cancelBy, year, month), bill.name || 'Subscription', 'Cancel by', 0, { page: 'Subscriptions' });
  }
  for (const loan of model.loans || []) {
    // A loan you pay with an amount is already on the day.
    if (loan.direction !== 'lent' && money(loan.expectedPayment)) continue;
    // Money you lent stops showing once it is all paid back.
    const paidBack = (loan.actualPayments || []).reduce((sum, p) => sum + money(p.actual), 0);
    if (loan.direction === 'lent' && money(loan.totalAmount) && paidBack >= money(loan.totalAmount)) continue;
    for (const day of loanOccurrenceInMonth(loan, year, month)) {
      add(day, loan.name || 'Loan', loan.direction === 'lent' ? 'Loan · owed to you' : 'Loan payment', money(loan.expectedPayment), { page: 'PayDetail', params: { kind: 'loan', id: loan.id, backTitle: 'Calendar' } });
    }
  }

  for (const t of model.transfers || []) {
    add(dayIn(t.date, year, month), 'Money moved', t.note?.trim() || 'Move', money(t.amount), { page: 'TransferDetail', params: { id: t.id } });
  }
  // One made from a transaction, or paid from an account, is already on the day as that transaction.
  for (const s of model.sharedExpenses || []) {
    if (!s.transactionId) add(dayIn(s.date, year, month), s.label || 'Shared expense', 'Shared expense', money(s.amount), { page: 'SharedExpenses' });
  }
  for (const s of model.sharedSettlements || []) {
    if (!s.transactionId) add(dayIn(s.date, year, month), 'Settled up', 'Shared expense', money(s.amount), { page: 'SharedExpenses' });
  }
  const ENTRY: Record<string, string> = { add: 'Added to investment', withdraw: 'Taken from investment', value: 'Investment value updated' };
  for (const inv of model.investments || []) {
    for (const e of inv.entries || []) {
      add(dayIn(e.date, year, month), inv.name || 'Investment', ENTRY[e.type] || 'Investment', money(e.amount), { page: 'Investments', params: { openId: inv.id } });
    }
  }
  for (const rule of model.recurring || []) {
    for (const day of repeatsIn(rule, year, month)) add(day, rule.label || 'Repeat', 'Repeats', money(rule.amount), { page: 'Recurring' });
  }

  return out;
}

// Cath, 2026-11-06 (mockup C): which row on a day is the one just added: the first label that
// wasn't there before (-1 if none). Same-named rows count one by one.
export function newEventIndex(before: string[], after: string[]): number {
  const left = [...before];
  for (let i = 0; i < after.length; i++) {
    const k = left.indexOf(after[i]);
    if (k < 0) return i;
    left.splice(k, 1);
  }
  return -1;
}
