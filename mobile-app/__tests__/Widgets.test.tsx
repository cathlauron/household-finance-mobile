// Home screen widgets (mockup W2, Cath 2026-10-30): the summary they show, how they're drawn,
// and that Expo Go never loads their phone-side part.
import { defaultModel } from '../src/defaultModel';

jest.mock('../src/DataContext', () => ({ useData: () => ({ model: null }), QuietWhenHidden: ({ children }: any) => children }));

const { makeWidgetSnapshot } = require('../src/widgets/widgetData');
const { widgetFor, WIDGET_NAMES, sparkSvg } = require('../src/widgets/FFWidgets');

function model() {
  const m: any = defaultModel();
  m.manualTransactions = [
    { id: 't1', label: 'Groceries', amount: 250, date: '2026-10-30', direction: 'out' },
    { id: 't2', label: 'Lunch', amount: 130, date: '2026-10-30', direction: 'out' },
    { id: 't3', label: 'Salary', amount: 18000, date: '2026-10-30', direction: 'in' },
  ];
  m.travel = [{ id: 'tr', name: 'Baguio', startDate: '2026-10-29', endDate: '2026-10-31', checklist: [{ id: 'a', title: 'Hotel', cost: 4500, checked: true }, { id: 'b', title: 'Food', cost: 4500, checked: false }] }];
  return m;
}

test("the summary: today's spending, the week line, and a trip that's on", () => {
  const s = makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) });
  expect(s.today).toMatch(/380/);
  expect(s.week).toHaveLength(7);
  expect(s.week[6]).toBe(380);
  expect(s.trip).toMatchObject({ name: 'Baguio', dayText: 'Day 2 of 3', pct: 50 });
  expect(s.trip.left).toMatch(/4,500/);
});

test('with Hide amounts on, no amount is kept for the widgets', () => {
  const s = makeWidgetSnapshot(model(), { hidden: true, now: new Date(2026, 9, 30, 12) });
  // (the week line only keeps the shape; the widgets never print those numbers)
  expect(JSON.stringify({ ...s, week: [] })).not.toMatch(/₱\s?\d/);
  expect(s.lts).toBe('₱ ••••');
  expect(s.today).toBe('₱ ••••');
});

test('every widget draws, with and without a summary (before the app was opened)', () => {
  const s = makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) });
  for (const n of WIDGET_NAMES) {
    expect(widgetFor(n, s)).toBeTruthy();
    expect(widgetFor(n, null)).toBeTruthy();
  }
  expect(sparkSvg([0, 10, 5], '#FFFFFF')).toMatch(/<polyline points="/);
});

test('Expo Go / iPhone: the widgets part is never loaded', () => {
  const { widgetsAvailable } = require('../src/widgets/available');
  expect(widgetsAvailable()).toBe(false);
  const fs = require('fs');
  const entry = fs.readFileSync('index.js', 'utf8');
  expect(entry).not.toMatch(/^import .*react-native-android-widget/m);
  for (const f of ['App.tsx', 'src/widgets/WidgetSync.tsx']) expect(fs.readFileSync(f, 'utf8')).not.toMatch(/^import .*from 'react-native-android-widget'/m);
});

test("a widget's Say it opens the + form with the listening sheet", () => {
  const fs = require('fs');
  const app = fs.readFileSync('App.tsx', 'utf8');
  expect(app).toMatch(/financeflow:\\\/\\\/\(voice\|add\)/);
  expect(app).toMatch(/sayItNonce: now/);
  expect(fs.readFileSync('src/screens/TransactionsScreen.tsx', 'utf8')).toMatch(/openNonce=\{route\.params\?\.sayItNonce\}/);
});

test('sweep: overdue bills come first on the widget, like Home\'s Due soon', () => {
  const od = require('../src/overdue');
  const spy = jest.spyOn(od, 'getOverdueItems').mockReturnValue([{ id: 'b1', kind: 'bill', name: 'Water', dueDate: '2026-10-20', amountOwed: 650 }]);
  const s = makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) });
  expect(s.due[0]).toMatchObject({ name: 'Water', day: 'Overdue' });
  expect(s.dueLeft).toMatch(/650/);
  spy.mockRestore();
});

test('the build has every phone-side part the app asks for (widgets, listening)', () => {
  const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
  expect(pkg.dependencies['react-native-android-widget']).toBeTruthy();
  expect(pkg.dependencies['expo-speech-recognition']).toBeTruthy();
  const app = JSON.parse(require('fs').readFileSync('app.json', 'utf8'));
  const names = app.expo.plugins.map((p: any) => (typeof p === 'string' ? p : p[0]));
  expect(names).toEqual(expect.arrayContaining(['react-native-android-widget', 'expo-speech-recognition']));
});

// Cath, 2026-10-31: "this is supposed to be green as default". The widgets take the Left to
// Spend card's colour: green, burnt orange when running low, red when over; green with Mood
// colours off. (They were crimson from mockup W2.)
test('widgets are green by default and follow the mood like Home', () => {
  const { widgetColours } = require('../src/widgets/FFWidgets');
  const bal = require('../src/balanceProjection');
  const spy = jest.spyOn(bal, 'getLeftToSpendStatus').mockReturnValue({ color: '', label: 'Looking good', mood: 'good' });
  const green = makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) });
  expect(widgetColours(green.mood).CRIMSON.from).toBe('#2C5E48');
  const leaf = (el: any) => el.type(el.props);
  expect(leaf(widgetFor('LeftToSpend', green)).props.style.backgroundGradient.from).toBe('#2C5E48');
  expect(leaf(widgetFor('SayIt', null)).props.style.backgroundGradient.to).toBe('#F1F7F3');

  spy.mockReturnValue({ color: '', label: 'Over budget', mood: 'over' });
  const over = makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) });
  expect(over.mood).toBe('over');
  expect(leaf(widgetFor('SpendSay', over)).props.style.backgroundGradient.from).toBe('#D12A36');
  spy.mockReturnValue({ color: '', label: 'Running low', mood: 'low' });
  expect(makeWidgetSnapshot(model(), { hidden: false, now: new Date(2026, 9, 30, 12) }).mood).toBe('low');
  const off: any = model();
  off.settings = { ...off.settings, moodColorsEnabled: false };
  expect(makeWidgetSnapshot(off, { hidden: false, now: new Date(2026, 9, 30, 12) }).mood).toBe('good');
  spy.mockRestore();
});
