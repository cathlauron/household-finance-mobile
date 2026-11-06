// Claude's background tester only (2026-10-27): with EXPO_PUBLIC_WALK_FIXTURE=1 in a WEB
// build (`npm run browser:build:fixture`), guest mode starts with this made-up household
// and can save, so the hidden browser can open bill, loan, trip and shared-expense pages
// and their forms. Phone builds never set it: there `walkFixtureOn` is always false.
import { Platform } from 'react-native';
import { defaultModel } from './defaultModel';
import type { HouseholdModel } from './types';

export const walkFixtureOn = Platform.OS === 'web' && process.env.EXPO_PUBLIC_WALK_FIXTURE === '1';

const PIC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#fff"/><rect x="30" y="40" width="200" height="14" fill="#bbb"/><rect x="30" y="80" width="240" height="10" fill="#ddd"/><rect x="30" y="110" width="220" height="10" fill="#ddd"/><rect x="30" y="300" width="120" height="16" fill="#888"/></svg>');

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthDay(back: number, day: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - back);
  d.setDate(day);
  return iso(d);
}

export function walkFixtureModel(): HouseholdModel {
  const m: any = defaultModel();
  const today = iso(new Date());
  m.people = [{ id: 'me', name: 'Cath' }, { id: 'q', name: 'Queenie' }, { id: 'b', name: 'Bebi' }];
  m.balanceAccounts = {
    asOfDate: monthDay(2, 1),
    cash: [{ id: 'cash1', name: 'Cash', amount: 3000 }],
    debit: [{ id: 'd1', name: 'Maribank', amount: 625142.41 }, { id: 'd2', name: 'RCBC', amount: 0.1 }],
    credit: [{ id: 'c1', name: 'Atome', amount: 379.25, limit: 5000 }],
  };
  m.bills = [
    { id: 'b1', name: 'Bahay Bebi', category: 'Other', recurringType: 'monthly', dueDate: { day: '29' }, priority: '', owner: 'shared', notes: 'Pay before 5pm',
      cycles: [{ id: 'bc1', dueDate: monthDay(1, 29), amountDue: 2300, amountPaid: 2300, paidDate: monthDay(1, 29), paidAt: Date.now(), paymentMethod: { type: 'debit', accountId: 'd1' }, notes: '', receiptPhoto: PIC },
        { id: 'bc2', dueDate: monthDay(0, 29), amountDue: 2300, amountPaid: '', paidDate: '', notes: '' }] },
    { id: 'b2', name: 'Meralco', category: 'Utilities', recurringType: 'monthly', dueDate: { day: '5' }, priority: '', owner: 'shared', notes: '',
      cycles: [{ id: 'bc3', dueDate: monthDay(0, 5), amountDue: 3150, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  m.debts = [
    { id: 'dt1', creditorOrPerson: 'Tita Lorna', category: 'Family', recurringType: 'monthly', dueDate: { day: '20' }, notes: '', owner: 'shared', minPayment: 1000,
      cycles: [{ id: 'dc1', dueDate: monthDay(0, 20), amountDue: 4000, amountPaid: '', paidDate: '', notes: '' }] },
  ];
  const months = Array.from({ length: 21 }, (_, i) => monthDay(21 - i, 16));
  m.loans = [
    { id: 'l1', name: 'Miduri', loanType: 'Motorcycle', totalAmount: 200001, expectedPayment: 7000, owner: 'shared', direction: 'borrowed', recurringType: 'monthly', dueDate: { day: '16' },
      actualPayments: months.map((d, i) => ({ id: `lp${i}`, date: d, actual: 7000, paymentMethod: { type: 'cash', accountId: 'cash1' } })) },
    { id: 'l2', name: 'Olive', loanType: 'Car', totalAmount: 1200000, expectedPayment: 24550, owner: 'shared', direction: 'borrowed', recurringType: 'monthly', dueDate: { day: '16' },
      actualPayments: months.slice(-13).map((d, i) => ({ id: `lo${i}`, date: d, actual: 24550, paymentMethod: { type: 'cash', accountId: 'cash1' } })).concat([{ id: 'lob', date: monthDay(1, 16), actual: 24550, recordedOnly: true, createdAt: Date.now(), receiptPhoto: PIC } as any]) },
  ];
  m.sharedExpenses = [
    { id: 'shx1', date: today, label: 'Harlan Coffee', amount: 1035, paidBy: 'q', shares: [{ personId: 'me', amount: 345 }, { personId: 'q', amount: 345 }, { personId: 'b', amount: 345 }], splitMode: 'equal', createdAt: Date.now(), receiptPhoto: PIC },
    { id: 'shx2', date: today, label: 'Pizza night', amount: 1860, paidBy: 'me', shares: [{ personId: 'me', amount: 620 }, { personId: 'q', amount: 620 }, { personId: 'b', amount: 620 }], splitMode: 'equal', createdAt: Date.now() },
  ];
  m.travel = [
    { id: 'trip1', name: 'BKK', startDate: monthDay(-1, 13), endDate: monthDay(-1, 20), todos: [],
      checklist: [{ id: 'ti1', title: 'Flights', cost: 18400, checked: true, completedDate: today, markedOnly: true, receiptPhoto: PIC }, { id: 'ti2', title: 'Hotel', cost: 21000, checked: false }] },
  ];
  m.savingsGoals = [{ id: 'sg1', name: 'Emergency fund', targetAmount: 100000, targetDate: '', currentAmount: 25000, contributions: [] }];
  // Speed tests (Cath, 2026-11-06): about a year of everyday spending, so timings look more like
  // a real household's.
  const shops = ['SM Hypermarket', 'Grab', 'Jollibee', 'Mercury Drug', 'Shopee', 'Meralco', 'Coffee', 'Puregold'];
  const kinds = ['Groceries', 'Transport', 'Food', 'Health', 'Shopping', 'Utilities', 'Food', 'Groceries'];
  const txns: any[] = [];
  for (let back = 13; back >= 1; back--) {
    for (let day = 1; day <= 28; day++) {
      const k = (back * day) % shops.length;
      txns.push({ id: `wt${back}-${day}`, date: monthDay(back, day), label: shops[k], amount: 80 + ((back * 37 + day * 53) % 900), direction: 'out', category: kinds[k], owner: 'shared', paymentMethod: { type: 'debit', accountId: 'd1' }, source: 'manual', createdAt: Date.now() - back * 86400000 });
    }
  }
  m.manualTransactions = [...(m.manualTransactions || []), ...txns, { id: 'wl', date: monthDay(0, 14), label: 'Walk lunch', amount: 250, direction: 'out', category: 'Food', owner: 'shared', paymentMethod: { type: 'debit', accountId: 'd1' }, createdAt: Date.now() }];
  // One of each kind of Calendar row, on the 14th of this month.
  const d14 = new Date(monthDay(0, 14) + 'T00:00:00');
  m.events = [{ id: 'we', name: 'Walk birthday', type: 'birthday', recurrence: 'annual', month: d14.getMonth() + 1, day: 14, budget: '', completed: false }];
  m.yearlyGoals = [{ id: 'wg', title: 'Walk 10K', description: '', mode: 'checklist', targetAmount: '', currentAmount: '', targetDate: monthDay(0, 14), completed: false }];
  m.recurring = [{ id: 'wr', label: 'Walk gym', amount: 800, direction: 'out', owner: 'shared', frequency: 'yearly', startDate: monthDay(0, 14), nextDate: monthDay(0, 14) }];
  m.travel[0].todos = [{ id: 'wt', text: 'Walk pack', done: false, date: monthDay(0, 14) }];
  m.travel.push({ id: 'trip2', name: 'Cebu', startDate: monthDay(0, 12), endDate: monthDay(0, 17), todos: [], checklist: [] });
  return m as HouseholdModel;
}
