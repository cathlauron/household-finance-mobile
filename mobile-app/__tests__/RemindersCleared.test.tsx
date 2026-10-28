// SEC-2 (Cath's OK, 2026-10-27): reminders carry names and amounts, so signing out, being
// signed out from another phone, or switching account takes them all off this phone.
import fs from 'fs';
import path from 'path';

const mockCancel = jest.fn(async () => {});
const mockDismiss = jest.fn(async () => {});
jest.mock('expo-notifications', () => new Proxy(
  { __esModule: true, setNotificationHandler: () => {}, cancelAllScheduledNotificationsAsync: () => mockCancel(), dismissAllNotificationsAsync: () => mockDismiss(), SchedulableTriggerInputTypes: {}, AndroidImportance: {} } as any,
  { get: (t, k) => (k in t ? t[k] : k === '__esModule' ? false : () => undefined) }
));

test('clearAllReminders takes off waiting and showing reminders', async () => {
  const { clearAllReminders } = require('../src/pushNotifications');
  await clearAllReminders();
  expect(mockCancel).toHaveBeenCalled();
  expect(mockDismiss).toHaveBeenCalled();
});

test('every sign-out path clears them', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'App.tsx'), 'utf8');
  const sessions = app.split('clearSession().catch(() => {});').length - 1;
  const cleared = app.split('clearAllReminders().catch(() => {}); // SEC-2').length - 1;
  expect(sessions).toBeGreaterThan(0);
  expect(cleared).toBe(sessions);
});
