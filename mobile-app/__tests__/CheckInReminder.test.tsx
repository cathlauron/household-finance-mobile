// Cath, 2026-11-24 (mockup three-updates, part 2, wording C, 8:00 PM): "Quiet day?" with two
// buttons, only on a day nothing was logged, set up with the other reminders.
const mockScheduled: any[] = [];
const mockCategories: any[] = [];
jest.mock('expo-notifications', () => new Proxy(
  {
    __esModule: true,
    setNotificationHandler: () => {},
    cancelAllScheduledNotificationsAsync: async () => { mockScheduled.length = 0; },
    getPermissionsAsync: async () => ({ status: 'granted' }),
    setNotificationChannelAsync: async () => {},
    setNotificationCategoryAsync: async (id: string, actions: any[]) => { mockCategories.push({ id, actions }); },
    scheduleNotificationAsync: async (r: any) => { mockScheduled.push(r); return 'x'; },
    SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
    AndroidImportance: { DEFAULT: 3 },
  } as any,
  { get: (t, k) => (k in t ? t[k] : k === '__esModule' ? false : () => undefined) }
));

const { defaultModel } = require('../src/defaultModel');
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function model(extra: any = {}) {
  const m: any = defaultModel();
  m.settings = { ...m.settings, pushNotificationsEnabled: true, weeklyRecapEnabled: false, paydayNudgeEnabled: false, envelopeAlertsEnabled: false, closeOutReminderEnabled: false, ...extra };
  return m;
}
const checkIns = () => mockScheduled.filter((r) => r.content?.data?.type === 'checkIn');

beforeEach(() => { mockScheduled.length = 0; jest.useFakeTimers({ now: new Date(2026, 10, 24, 9, 0, 0) }); });
afterEach(() => jest.useRealTimers());

test('Set up a week ahead at 8 PM, with the two buttons and her words', async () => {
  const { rescheduleBillNotifications } = require('../src/pushNotifications');
  await rescheduleBillNotifications(model());
  const list = checkIns();
  expect(list).toHaveLength(7);
  expect(list[0].content).toMatchObject({ title: 'Quiet day?', body: 'No spending logged today. Tap to add it.', categoryIdentifier: 'checkIn' });
  expect(new Date(list[0].trigger.date).getHours()).toBe(20);
  expect(iso(new Date(list[0].trigger.date))).toBe('2026-11-24');
  const cat = mockCategories.find((c) => c.id === 'checkIn');
  expect(cat.actions.map((a: any) => a.buttonTitle)).toEqual(['Add a transaction', 'Nothing today']);
});

test('Logged something today: today has none, tomorrow on still do', async () => {
  const { rescheduleBillNotifications } = require('../src/pushNotifications');
  await rescheduleBillNotifications(model());
  const m = model();
  m.manualTransactions = [{ id: 't', date: '2026-11-24', label: 'Lunch', amount: 340, direction: 'out', owner: 'shared', createdAt: Date.now() }];
  await rescheduleBillNotifications(m);
  const list = checkIns();
  expect(list).toHaveLength(6);
  expect(iso(new Date(list[0].trigger.date))).toBe('2026-11-25');
});

test('Turned off, or reminders off on this phone: none', async () => {
  const { rescheduleBillNotifications } = require('../src/pushNotifications');
  await rescheduleBillNotifications(model({ dailyCheckInEnabled: false }));
  expect(checkIns()).toHaveLength(0);
  await rescheduleBillNotifications(model({ pushNotificationsEnabled: false }));
  expect(checkIns()).toHaveLength(0);
});
