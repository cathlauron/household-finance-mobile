// ============================================================
// Local bill-due notifications (Checkpoint 11.2 follow-up)
// ============================================================
// Note: since this app runs through Expo Go, it can't receive true
// server-sent "push" notifications — those need a store-installed
// build. What this does instead is schedule LOCAL notifications: the
// phone itself remembers to fire an alert at the right date/time, no
// server involved. This is actually the same thing the original web
// app's own browser notifications did, so it's not a step down.
//
// Approach: every time the data is saved (or first loaded), every
// scheduled notification is cleared and rebuilt from scratch based on
// the current bills + the "Alert me X days before" setting. This keeps
// things simple and always correct, at the cost of doing a bit of
// redundant work on every save — fine at this scale (a household's
// worth of bills, not thousands).
// ============================================================

import * as Notifications from 'expo-notifications';
import { getPaydayNudgeTime } from './paydayTime';
import { currentCycle } from './billPayments';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HouseholdModel, Bill } from './types';
import { getNextDueDate } from './recurrence';
import { buildTransactionsList, transactionTotals } from './transactions';
import { formatPeso, incomeOccurrencesInMonth, isPaydayReceived } from './balanceProjection';
import { computeEnvelopes, monthKey } from './envelopes';

// Makes a notification actually pop up (with sound) while the app is open,
// not just when it's in the background — matches how the web app's alerts behaved.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

// Android requires a "channel" to be set up before notifications can be sent on it.
// Harmless no-op on iOS. Safe to call more than once.
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bill-alerts', {
      name: 'Bill alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// Asks the phone for permission to show notifications. Returns whether it was
// granted. Safe to call even if already granted (just returns true immediately).
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Finds the next date/time this weekday+hour combo occurs, at or after "now".
// weekday: 0 = Sunday ... 6 = Saturday (matches Date.prototype.getDay()).
function nextWeeklyOccurrence(weekday: number, hour: number, now: Date): Date {
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);
  let daysAhead = (weekday - now.getDay() + 7) % 7;
  if (daysAhead === 0 && result.getTime() <= now.getTime()) daysAhead = 7;
  result.setDate(result.getDate() + daysAhead);
  return result;
}

function billOutstanding(bill: Bill): number {
  const c = currentCycle(bill);
  if (!c) return 0;
  const due = typeof c.amountDue === 'number' ? c.amountDue : 0;
  const paid = typeof c.amountPaid === 'number' ? c.amountPaid : 0;
  return due - paid;
}

// Clears every notification this app has scheduled, then reschedules one per
// unpaid bill that has a computable due date, timed to fire at 9:00 AM on
// whichever day is "X days before due" (X = the Notifications setting).
// Does nothing if the setting is off, or if permission hasn't been granted.
// Saves can come close together, so set-ups run one at a time: if one is running, the
// newest model waits and runs straight after (older waiting ones are skipped). Without
// this, two set-ups could interleave and wipe or double each other's reminders.
let running: Promise<void> | null = null;
let queued: HouseholdModel | null = null;

export function rescheduleBillNotifications(model: HouseholdModel): Promise<void> {
  if (running) {
    queued = model;
    return running;
  }
  running = (async () => {
    let next: HouseholdModel | null = model;
    while (next) {
      queued = null;
      try {
        await rescheduleNow(next);
      } catch (e) {
        console.warn('Could not set up reminders:', e);
      }
      next = queued;
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

// SEC-2 (Cath's OK, 2026-10-27): signing out, being signed out from another phone, or
// switching account takes every waiting reminder (they carry names and amounts) off this
// phone, and clears the ones already showing. The next account sets up its own on opening.
export async function clearAllReminders(): Promise<void> {
  queued = null;
  if (running) await running.catch(() => {});
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  } catch (e) {
    console.warn('Could not clear reminders:', e);
  }
}

// A cancel-by reminder for today, set after 9:00, fires once, a minute after it was first
// set up. That moment is remembered so later saves don't keep pushing it back (it used to
// move a minute later on every save and never arrive) or send it again once it has fired.
const CANCEL_BY_FIRE_KEY = 'notif:cancel-by-fire-times';
async function loadFireTimes(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(CANCEL_BY_FIRE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Testing only (Settings › Notifications in Expo Go): a reminder in 10 seconds, and how
// many reminders are waiting, to check notifications work on this phone at all.
export async function sendTestNotification(): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Test reminder', body: 'Notifications work on this phone.' },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'bill-alerts' },
  });
  return true;
}
const ENVELOPE_ALERTS_KEY = 'notif:envelope-alerts';

async function sendEnvelopeAlerts(model: HouseholdModel, now: Date): Promise<void> {
  const summary = computeEnvelopes(model, now);
  if (!summary.rows.length) return;
  const key = monthKey(now.getFullYear(), now.getMonth());
  let sent: { month: string; levels: Record<string, number> } = { month: key, levels: {} };
  try {
    const raw = await AsyncStorage.getItem(ENVELOPE_ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.month === key && parsed.levels) sent = parsed;
  } catch {}
  let changed = false;
  for (const row of summary.rows) {
    if (row.available <= 0) continue;
    const level = row.pct >= 100 ? 100 : row.pct >= 80 ? 80 : 0;
    const id = row.envelope.id;
    if (level === 0 || (sent.levels[id] ?? 0) >= level) continue;
    sent.levels[id] = level;
    changed = true;
    const name = row.envelope.category || 'An envelope';
    await Notifications.scheduleNotificationAsync({
      content:
        level >= 100
          ? {
              title: `${name} is over for this month`,
              body: `Spent ${formatPeso(row.spent)} of ${formatPeso(row.available)}.`,
              data: { type: 'envelopeAlert' },
            }
          : {
              title: `${name} is at ${Math.floor(row.pct)}%`,
              body: `${formatPeso(Math.max(0, row.left))} left of ${formatPeso(row.available)} this month.`,
              data: { type: 'envelopeAlert' },
            },
      trigger: { channelId: 'bill-alerts' },
    });
  }
  if (changed) AsyncStorage.setItem(ENVELOPE_ALERTS_KEY, JSON.stringify(sent)).catch(() => {});
}

// Testing only: a payday nudge for the first income source, in 10 seconds (tap it to
// check it opens the right Income page).
export async function sendTestPaydayNudge(model: HouseholdModel): Promise<'sent' | 'no-income' | 'no-permission'> {
  const source = (model.income || [])[0];
  if (!source) return 'no-income';
  if (!(await requestNotificationPermission())) return 'no-permission';
  await ensureNotificationChannel();
  const person = (model.people || []).find((p) => p.id === source.personId);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Payday: ${source.sourceName || 'income'}`,
      body: `Did ${person?.name ? `${person.name}'s` : 'your'} pay come in? Tap to log it. (test)`,
      data: { type: 'paydayNudge', personId: source.personId || '', sourceId: source.id },
    },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'bill-alerts' },
  });
  return 'sent';
}

// Testing only: the month-end summary in 10 seconds (tap it to check it opens the close-out).
export async function sendTestMonthEnd(): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false;
  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Last month is done (test)', body: 'See how the month went: what came in, what went out, and where it went.', data: { type: 'closeOut' } },
    trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10, channelId: 'bill-alerts' },
  });
  return true;
}

export async function countScheduledNotifications(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

async function rescheduleNow(model: HouseholdModel): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const billRemindersOn = model.settings.pushNotificationsEnabled;
  const weeklyRecapOn = model.settings.weeklyRecapEnabled;
  // Redesign: "Remind me to cancel by…" on Subscriptions is something you asked for
  // directly, so it is scheduled even when the general bill reminders are off.
  const cancelByBills = model.bills.filter(
    (b) => b.isSubscription && b.subscriptionStatus !== 'cancelled' && !!b.cancelBy
  );
  if (!billRemindersOn && !weeklyRecapOn && cancelByBills.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  await ensureNotificationChannel();

  const days = model.settings.notifyDaysBefore ?? 3;
  const now = new Date();

  if (billRemindersOn) for (const bill of model.bills) {
    // Subscriptions are handled below. A cancelled one has stopped, so no "due soon"
    // alert either (this used to fire for cancelled subscriptions by mistake).
    if (bill.isSubscription) continue;
    if (billOutstanding(bill) <= 0) continue; // already paid — nothing to alert about
    const nextDue = getNextDueDate(bill.recurringType, bill.dueDate, now);
    if (!nextDue) continue;

    const alertDate = new Date(nextDue);
    alertDate.setDate(alertDate.getDate() - days);
    alertDate.setHours(9, 0, 0, 0);

    if (alertDate.getTime() <= now.getTime()) continue; // that alert window already passed

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${bill.name || 'A bill'} is due soon`,
        body: `Due ${nextDue.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: alertDate,
        channelId: 'bill-alerts',
      },
    });
  }

  // ============================================================
  // Subscription cancel-reminders (Checkpoint B.14)
  // ============================================================
  // Same "X days before" timing as the bill-due alerts above, but only for
  // bills explicitly flagged isSubscription, and only while still active
  // (not already marked cancelled). Attaches a data payload so tapping the
  // notification can deep-link straight to this bill.
  if (billRemindersOn) for (const bill of model.bills) {
    if (!bill.isSubscription || bill.subscriptionStatus === 'cancelled') continue;
    if (bill.cancelBy) continue; // you already chose a cancel-by date; that reminder covers it
    if (billOutstanding(bill) <= 0) continue;
    const nextRenewal = getNextDueDate(bill.recurringType, bill.dueDate, now);
    if (!nextRenewal) continue;

    const reminderDate = new Date(nextRenewal);
    reminderDate.setDate(reminderDate.getDate() - days);
    reminderDate.setHours(9, 0, 0, 0);

    if (reminderDate.getTime() <= now.getTime()) continue;

    const amount = billOutstanding(bill);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Still want ${bill.name || 'this subscription'}?`,
        body: `Renews ${nextRenewal.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} for ${formatPeso(amount)}`,
        data: { type: 'subscriptionReminder', billId: bill.id },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: 'bill-alerts',
      },
    });
  }

  // ============================================================
  // Cancel-by reminders (redesign)
  // ============================================================
  // On the "cancel by" day you set on Subscriptions, at 9:00 AM. If you set it for
  // today and 9:00 has already gone, it comes a minute later instead. Tapping it opens
  // the subscription, like the reminder above.
  const fireTimes = await loadFireTimes();
  const keptFireTimes: Record<string, number> = {};
  for (const bill of cancelByBills) {
    const [y, m, d] = (bill.cancelBy as string).split('-').map(Number);
    if (!y || !m || !d) continue;
    let when = new Date(y, m - 1, d, 9, 0, 0, 0);
    const endOfDay = new Date(y, m - 1, d, 23, 59, 0, 0);
    if (when.getTime() <= now.getTime()) {
      if (endOfDay.getTime() <= now.getTime()) continue; // that day has passed
      const key = `${bill.id}:${bill.cancelBy}`;
      const remembered = fireTimes[key];
      if (remembered) {
        keptFireTimes[key] = remembered;
        if (remembered <= now.getTime()) continue; // already sent today
        when = new Date(remembered);
      } else {
        when = new Date(now.getTime() + 60 * 1000);
        keptFireTimes[key] = when.getTime();
      }
    }
    const renewal = getNextDueDate(bill.recurringType, bill.dueDate, now);
    const amount = billOutstanding(bill);
    const renewText = renewal
      ? ` before it renews ${renewal.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}${amount > 0 ? ` for ${formatPeso(amount)}` : ''}`
      : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Cancel ${bill.name || 'your subscription'} today`,
        body: `You asked to be reminded to cancel${renewText}.`,
        data: { type: 'subscriptionReminder', billId: bill.id },
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: 'bill-alerts',
      },
    });
  }
  // Keep only today's remembered times (old days drop off).
  AsyncStorage.setItem(CANCEL_BY_FIRE_KEY, JSON.stringify(keptFireTimes)).catch(() => {});

  // ============================================================
  // Envelope alerts (sent straight away, once per level per month)
  // ============================================================
  // Runs on every save and every update from the household, so spending added on
  // another phone counts too. What was already sent this month is remembered.
  if (billRemindersOn && model.settings.envelopeAlertsEnabled !== false) {
    await sendEnvelopeAlerts(model, now);
  }

  // ============================================================
  // Month-end summary: the 1st of next month at 9:00 AM
  // ============================================================
  if (billRemindersOn && model.settings.closeOutReminderEnabled !== false) {
    const first = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0, 0);
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const ended = MONTHS[now.getMonth()];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${ended} is done`,
        body: 'See how the month went: what came in, what went out, and where it went.',
        data: { type: 'closeOut' },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: first, channelId: 'bill-alerts' },
    });
  }

  // ============================================================
  // Payday nudge
  // ============================================================
  // Income only counts once a payday is logged, so on each expected payday (6:00 PM) ask
  // whether it came in (at the time picked for this phone). Skipped when that payday is already logged (early pay counts).
  // Tapping it opens that person's Income page, where tapping the payday logs it.
  if (billRemindersOn && model.settings.paydayNudgeEnabled !== false) {
    // Version 2.1: the time is picked per phone in Settings (6:00 PM unless changed).
    const nudgeAt = await getPaydayNudgeTime();
    const pad = (n: number) => String(n).padStart(2, '0');
    const accountName = (pm?: { type: string; accountId?: string }) => {
      if (!pm) return '';
      if (pm.type === 'cash' && !pm.accountId) return 'Cash';
      const list = (model.balanceAccounts as any)[pm.type] as { id: string; name?: string }[] | undefined;
      return list?.find((a) => a.id === pm.accountId)?.name || '';
    };
    for (const source of model.income || []) {
      const person = (model.people || []).find((p) => p.id === source.personId);
      const amount = typeof source.expectedAmount === 'number' ? source.expectedAmount : 0;
      let scheduled = 0;
      for (let k = 0; k < 2 && scheduled < 2; k++) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() + k, 1);
        const y = monthStart.getFullYear();
        const mi = monthStart.getMonth();
        for (const day of incomeOccurrencesInMonth(source, y, mi)) {
          if (scheduled >= 2) break;
          const iso = `${y}-${pad(mi + 1)}-${pad(day)}`;
          const when = new Date(y, mi, day, nudgeAt.hour, nudgeAt.minute, 0, 0);
          if (when.getTime() <= now.getTime()) continue;
          if (isPaydayReceived(source, iso)) continue;
          const into = accountName(source.depositTo);
          const who = person?.name ? `${person.name}'s ` : '';
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Payday: ${source.sourceName || 'income'}`,
              body: `Did ${who || 'your '}pay come in?${amount > 0 ? ` Expected ${formatPeso(amount)}${into ? ` into ${into}` : ''}.` : ''} Tap to log it.`,
              data: { type: 'paydayNudge', personId: source.personId || '', sourceId: source.id },
            },
            trigger: { type: SchedulableTriggerInputTypes.DATE, date: when, channelId: 'bill-alerts' },
          });
          scheduled++;
        }
      }
    }
  }

  // ============================================================
  // Weekly spending recap (Checkpoint B.11)
  // ============================================================
  // Reuses the exact same "last 7 days through today" window the Weekly
  // Digest report uses, so the number here always matches that report.
  // Content is baked in at schedule time (same limitation as bill alerts
  // above) — it'll be as fresh as whenever the app was last saved to
  // before this recap fires.
  if (weeklyRecapOn) {
    const sixDaysAgo = new Date(now);
    sixDaysAgo.setDate(now.getDate() - 6);
    const rangeStartKey = toDateKey(sixDaysAgo);
    const rangeEndKey = toDateKey(now);

    const allTransactions = buildTransactionsList(model);
    const weekTransactions = allTransactions.filter(
      (t) => t.date >= rangeStartKey && t.date <= rangeEndKey
    );
    const weekTotals = transactionTotals(weekTransactions);

    const recapDate = nextWeeklyOccurrence(
      model.settings.weeklyRecapDay ?? 0,
      model.settings.weeklyRecapHour ?? 18,
      now
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your weekly spending recap',
        body: `You spent ${formatPeso(weekTotals.totalOut)} this week — tap to see the breakdown.`,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: recapDate,
        channelId: 'bill-alerts',
      },
    });
  }
}