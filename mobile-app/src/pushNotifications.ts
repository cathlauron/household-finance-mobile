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
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import type { HouseholdModel, Bill } from './types';
import { getNextDueDate } from './recurrence';

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

function billOutstanding(bill: Bill): number {
  const c = bill.cycles && bill.cycles[0];
  if (!c) return 0;
  const due = typeof c.amountDue === 'number' ? c.amountDue : 0;
  const paid = typeof c.amountPaid === 'number' ? c.amountPaid : 0;
  return due - paid;
}

// Clears every notification this app has scheduled, then reschedules one per
// unpaid bill that has a computable due date, timed to fire at 9:00 AM on
// whichever day is "X days before due" (X = the Notifications setting).
// Does nothing if the setting is off, or if permission hasn't been granted.
export async function rescheduleBillNotifications(model: HouseholdModel): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!model.settings.pushNotificationsEnabled) return;

  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  await ensureNotificationChannel();

  const days = model.settings.notifyDaysBefore ?? 3;
  const now = new Date();

  for (const bill of model.bills) {
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
      },
    });
  }
}