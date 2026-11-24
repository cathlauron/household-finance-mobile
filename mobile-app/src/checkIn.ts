import { buildTransactionsList } from './transactions';
import type { HouseholdModel } from './types';

// Cath, 2026-11-24 (mockup three-updates, part 2, wording C): a daily check-in at 8:00 PM
// (her pick; changeable per phone), only on a day nobody in the household logged anything.
// Two buttons: Add a transaction, and Nothing today.
export const CHECK_IN_TITLE = 'Quiet day?';
export const CHECK_IN_BODY = 'No spending logged today. Tap to add it.';
export const CHECK_IN_CATEGORY = 'checkIn';
export const CHECK_IN_DAYS = 7;

export type ClockTime = { hour: number; minute: number };

const pad = (n: number) => String(n).padStart(2, '0');
const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Was anything logged that day: added that day, whatever its date (a back-dated one counts), or
// dated that day when it has no time it was added. Something added earlier for a later day
// (planned ahead) does not count as logging on that day.
export function loggedOn(model: HouseholdModel, dayISO: string): boolean {
  const addedThatDay = (ms?: number) => typeof ms === 'number' && ms > 0 && localISO(new Date(ms)) === dayISO;
  for (const t of buildTransactionsList(model)) {
    if (addedThatDay(t.at)) return true;
    // Dated that day with no time it was added (a payment marked paid, an older entry).
    if (t.date === dayISO && !t.at) return true;
  }
  for (const x of model.transfers || []) {
    if (addedThatDay(x.createdAt) || (x.date === dayISO && !x.createdAt)) return true;
  }
  return false;
}

// When the next check-ins come: the picked time on each of the next days, from today. Today is
// left out once something is logged, once its time has passed, or when "Nothing today" was tapped.
export function checkInTimes(model: HouseholdModel, now: Date, at: ClockTime, quietDay: string | null = null, days = CHECK_IN_DAYS): Date[] {
  const out: Date[] = [];
  const todayISO = localISO(now);
  for (let i = 0; i < days; i++) {
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, at.hour, at.minute, 0, 0);
    if (when.getTime() <= now.getTime()) continue;
    if (i === 0 && (quietDay === todayISO || loggedOn(model, todayISO))) continue;
    out.push(when);
  }
  return out.slice(0, days);
}
