import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import { defaultModel } from '../src/defaultModel';

// 2026-10-22 bug hunt: Home must open without crashing, both with a household
// saved by an older app version (missing the newer lists: trips, events, groceries, shared
// expenses, rules, payees, ...) and with a full household like Cath's.
let mockModel: any;
let mockParams: any = {};
const mockProxy = () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) });
jest.mock('firebase/firestore', () => mockProxy());
jest.mock('firebase/auth', () => mockProxy());
jest.mock('firebase/app', () => mockProxy());
jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('../src/authFirebase', () => ({ getCurrentFirebaseUser: () => null }));
jest.mock('../src/sessions', () => ({ ...jest.requireActual('../src/sessions'), subscribeToUserDevices: () => () => {} }));
jest.mock('../src/pushNotifications', () => ({ ...jest.requireActual('../src/pushNotifications'), rescheduleBillNotifications: async () => {} }));
jest.mock('../src/DataContext', () => ({
  useData: () => ({
    model: mockModel, getModel: () => mockModel, saveModel: async () => {}, isLinked: false, username: 'cath',
    storageUsed: 0, pendingChanges: 0, verifyPassword: async () => true, changePassword: async () => ({}), getHouseholdKey: () => null,
    isOnline: true, guest: false, refreshModel: async () => 'up_to_date',
  }),
  withTimeout: (p: any) => p,
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), setOptions: jest.fn(), addListener: () => () => {}, goBack: jest.fn(), push: jest.fn(), getState: () => ({ routes: [] }) }),
  useRoute: () => ({ name: 'X', params: mockParams }),
  useFocusEffect: () => {},
  useIsFocused: () => true,
}));

function oldHousehold() {
  const m: any = defaultModel();
  for (const k of ['transfers', 'walletOrder', 'calculatorInputs', 'groceries', 'groceryCalculator', 'mealIdeas', 'travel', 'events', 'recurring', 'sharedMembers', 'sharedExpenses', 'sharedSettlements', 'yearlyGoals', 'payees', 'categorizationRules', 'avatars', 'avatarPhotos', 'preferredNames']) delete m[k];
  return m;
}

function fullHousehold() {
  const m: any = defaultModel();
  const today = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
  const cash = { type: 'cash', accountId: 'c1' };
  m.people = [{ id: 'p1', name: 'Cath' }, { id: 'p2', name: 'Miguel' }];
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: day(-10), asOfAt: Date.now() - 864e6, cash: [{ id: 'c1', name: 'Wallet', amount: 2500 }], debit: [{ id: 'd1', name: 'BPI Savings', amount: 48210.5, last4: '1234' }], credit: [{ id: 'k1', name: 'BDO Visa', amount: -3200, limit: 50000, statementDay: '15', dueDay: '5' }] };
  m.income = [{ id: 'i1', personId: 'p1', category: 'Salary', sourceName: 'BPO salary', expectedAmount: 25000, frequency: 'semimonthly', payDates: ['15', '30'], paymentLog: [{ id: 'pl1', date: day(-7), amount: 25000 }], depositTo: { type: 'debit', accountId: 'd1' } }];
  m.bills = [
    { id: 'b1', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: String(Math.min(28, today.getDate() + 2)) }, priority: 'high', owner: 'shared', notes: '', cycles: [{ id: 'bc1', dueDate: day(2), amountDue: 2350.45, amountPaid: '', paidDate: '', notes: '' }] },
    { id: 'b2', name: 'Netflix', category: 'Subscriptions', recurringType: 'monthly', dueDate: { day: '1' }, priority: '', owner: 'p1', notes: '', isSubscription: true, subscriptionStatus: 'active', cycles: [{ id: 'bc2', dueDate: day(-40), amountDue: 549, amountPaid: 549, paidDate: day(-40), notes: '' }, { id: 'bc3', dueDate: day(-5), amountDue: 549, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  m.debts = [{ id: 'dt1', creditorOrPerson: 'Tita Lorna', category: 'Family', recurringType: 'onetime', dueDate: { date: day(-3) }, cycles: [{ id: 'dc1', dueDate: day(-3), amountDue: 5000, amountPaid: '', paidDate: '', notes: '' }], notes: '', owner: 'shared', minPayment: 1000 }];
  m.loans = [{ id: 'l1', name: 'Motorcycle', loanType: 'Vehicle', totalAmount: 120000, expectedPayment: 4500, actualPayments: [{ id: 'lp1', date: day(-30), actual: 4500, expected: 4500 }], owner: 'p2', direction: 'borrowed', recurringType: 'monthly', dueDate: { day: '10', firstDate: day(-60) }, interestRate: 12 }];
  m.savingsGoals = [{ id: 'g1', name: 'Emergency fund', targetAmount: 100000, targetDate: day(300), currentAmount: 0, contributions: [{ id: 'gc1', date: day(-20), amount: 5000 }], keptIn: { type: 'debit', accountId: 'd1' } }];
  m.manualTransactions = [
    { id: 't1', date: day(-1), label: 'Groceries', amount: 1240.75, direction: 'out', owner: 'shared', category: 'Food', notes: '', paymentMethod: cash, createdAt: Date.now() },
    { id: 't2', date: day(-2), label: 'Shoes', amount: 1500, direction: 'out', owner: 'p1', category: 'Shopping', notes: '', paymentMethod: { type: 'credit', accountId: 'k1' }, refundExpectedAmount: 1500, installments: 3 },
    { id: 't3', date: day(-3), label: 'Bonus', amount: 3000, direction: 'in', owner: 'p1', category: 'Bonus', notes: '', paymentMethod: { type: 'debit', accountId: 'd1' }, incomeKind: 'bonus' },
  ];
  m.travel = [{ id: 'tr1', name: 'Baguio', startDate: day(20), endDate: day(23), checklist: [{ id: 'ci1', text: 'Bus tickets', done: true, cost: 1800 }, { id: 'ci2', text: 'Hotel', done: false, cost: 4500 }] }];
  m.events = [{ id: 'e1', name: "Mama's birthday", type: 'birthday', recurrence: 'annual', date: day(40), budget: 3000, completed: false }];
  m.yearlyGoals = [{ id: 'y1', title: 'Pay off motorcycle', description: '', mode: 'progress', targetAmount: 120000, currentAmount: 4500, targetDate: day(60), completed: false }];
  m.sharedMembers = ['p1', 'p2'];
  m.sharedExpenses = [{ id: 's1', date: day(-4), label: 'Dinner', amount: 1000, paidBy: 'p1', shares: [{ personId: 'p1', amount: 500 }, { personId: 'p2', amount: 500 }], splitMode: 'equal' }];
  m.sharedSettlements = [];
  m.groceries = [{ id: 'gr1', item: 'Rice 5kg', plannedAmount: 300, actualAmount: 289.5, purchased: true }, { id: 'gr2', item: 'Eggs', plannedAmount: 120, actualAmount: '', purchased: false }];
  m.recurring = [];
  m.payees = [];
  m.categorizationRules = [];
  return m;
}

// Home and the detail pages (2026-10-22 bug hunt, areas 2 and 5).
// Every row needs all 4 items: with fewer, Jest treats the missing one as a "done" callback
// and the check waits forever.
const DETAIL: [string, string, any, any][] = [
  ['Home', 'HomeScreen', { username: 'cath' }, {}],
];
const _REST: [string, string, any, any?][] = [
  ['Bill page', 'PayDetailScreen', {}, { kind: 'bill', id: 'b1' }],
  ['Paid subscription page', 'PayDetailScreen', {}, { kind: 'bill', id: 'b2' }],
  ['Debt page', 'PayDetailScreen', {}, { kind: 'debt', id: 'dt1' }],
  ['Loan page', 'PayDetailScreen', {}, { kind: 'loan', id: 'l1' }],
  ['Credit card page', 'CardDetailScreen', {}, { group: 'credit', id: 'k1' }],
  ['Debit card page', 'CardDetailScreen', {}, { group: 'debit', id: 'd1' }],
  ['Pot page', 'PotDetailScreen', {}, { id: 'g1' }],
  ['Transaction page', 'TransactionDetailScreen', {}, { id: 'manual-t2' }],
  ['Missing bill page (deleted elsewhere)', 'PayDetailScreen', {}, { kind: 'bill', id: 'gone' }],
  ['Missing pot page (deleted elsewhere)', 'PotDetailScreen', {}, { id: 'gone' }],
];
test.each(DETAIL)('%s opens with a full household', async (_name, file, props, params) => {
  for (const data of [fullHousehold(), oldHousehold()]) {
    mockModel = data;
    mockParams = params ?? {};
    const Screen = require(`../src/screens/${file}`).default;
    const errors: any[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...a: any[]) => { errors.push(a.map(String).join(' ')); });
    try {
      render(
        <ThemeProvider>
          <Screen {...props} />
        </ThemeProvider>,
      );
      await act(async () => {});
    } finally {
      spy.mockRestore();
    }
    expect(errors.filter((e) => /TypeError|Cannot read|is not a function|undefined is not/.test(e))).toEqual([]);
    const words: string[] = [];
    const walk = (n: any) => { if (n == null) return; if (typeof n === 'string') return void words.push(n); if (Array.isArray(n)) return n.forEach(walk); walk(n.children); };
    walk(require('@testing-library/react-native').screen.toJSON());
    const text = words.join(' | ');
    if (process.env.SHOW_TEXT) console.log('TEXT', text.slice(0, 3000));
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
  }
}, 20000);
