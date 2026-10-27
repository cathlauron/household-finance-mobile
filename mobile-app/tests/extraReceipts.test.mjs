// Automatic checks for receipts outside transactions (Cath, 2026-10-27: receipts on shared
// expenses, bill/debt payments, loan payments and trip items, kept safe in the parts sync).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitModel, joinParts, partTexts, changedParts, CORE_PART } from '../src/householdParts.ts';
import { everyoneReadsParts, EXTRA_RECEIPTS_VERSION, PARTS_READER_VERSION } from '../src/partsGate.ts';

const PIC = (n) => `data:image/jpeg;base64,${n}`;

function model() {
  return {
    settings: { currency: 'PHP' },
    people: [{ id: 'p1', name: 'Cath' }],
    income: [],
    bills: [{ id: 'b1', name: 'Meralco', cycles: [{ id: 'cycle-1', dueDate: '2026-10-05', amountDue: 900, amountPaid: 900, paidDate: '2026-10-05', receiptPhoto: PIC('BILL') }] }],
    debts: [{ id: 'd1', name: 'Card', cycles: [{ id: 'cycle-2', dueDate: '2026-10-07', amountDue: 500, amountPaid: '', paidDate: '', receiptPhoto: PIC('DEBT') }] }],
    loans: [{ id: 'l1', name: 'Pag-IBIG', actualPayments: [{ id: 'lpay-1', date: '2026-10-16', amount: 5000, receiptPhoto: PIC('LOAN') }] }],
    savingsGoals: [],
    sharedExpenses: [{ id: 'shx-1', date: '2026-10-01', label: 'Dinner', amount: 1200, paidBy: 'p1', shares: [], splitMode: 'equal', receiptPhoto: PIC('SHARED') }],
    travel: [{ id: 'trip-1', name: 'Baguio', checklist: [{ id: 'travelitem-1', title: 'Bus', cost: 800, checked: true, receiptPhoto: PIC('TRIP') }, { id: 'travelitem-2', title: 'Hotel', cost: '', checked: false }] }],
    manualTransactions: [{ id: 'txn-a', date: '2026-10-03', label: 'Coffee', amount: 150, direction: 'out', owner: 'shared', receiptPhoto: PIC('TXN') }],
    balanceAccounts: { asOfDate: '2026-10-01', cash: [], debit: [], credit: [] },
    categories: [], categoryBudgets: [],
  };
}
const sorted = (m) => JSON.parse(JSON.stringify(m));

test('with every phone on 3.0: each receipt goes into its own part and comes back', () => {
  const m = model();
  const before = JSON.stringify(m);
  const parts = splitModel(m, { extraReceipts: true });
  assert.equal(JSON.stringify(m), before, 'the household itself is never changed');
  const core = JSON.stringify(parts[CORE_PART]);
  for (const n of ['BILL', 'DEBT', 'LOAN', 'SHARED', 'TRIP']) assert.ok(!core.includes(n), `${n} receipt is not inside the main part`);
  for (const id of ['rcpt-x-bc-cycle-1', 'rcpt-x-dc-cycle-2', 'rcpt-x-lp-lpay-1', 'rcpt-x-se-shx-1', 'rcpt-x-ti-travelitem-1']) assert.ok(parts[id], id);
  assert.ok(parts['rcpt-txn-a'], 'transaction receipts still work as before');
  assert.deepEqual(sorted(joinParts(parts)), sorted(m));
});

test('without 3.0 everywhere (the default): receipts stay inside the main part', () => {
  const m = model();
  const parts = splitModel(m);
  assert.deepEqual(Object.keys(parts).filter((id) => id.startsWith('rcpt-x-')), []);
  const core = JSON.stringify(parts[CORE_PART]);
  for (const n of ['BILL', 'DEBT', 'LOAN', 'SHARED', 'TRIP']) assert.ok(core.includes(n), `${n} receipt kept inline`);
  assert.deepEqual(sorted(joinParts(parts)), sorted(m));
});

test('switching between the two never loses a receipt', () => {
  const m = model();
  const inline = partTexts(splitModel(m));
  const outside = partTexts(splitModel(m, { extraReceipts: true }));
  // Going out: the new parts are written; coming back: they are removed only because the
  // main part now holds the photos again.
  assert.ok(changedParts(inline, outside).write.includes('rcpt-x-se-shx-1'));
  assert.ok(changedParts(outside, inline).remove.includes('rcpt-x-se-shx-1'));
  assert.ok(inline[CORE_PART].includes('SHARED'));
});

test('a photo part that has not arrived yet drops only the pointer', () => {
  const parts = splitModel(model(), { extraReceipts: true });
  delete parts['rcpt-x-se-shx-1'];
  const back = joinParts(parts);
  assert.equal(back.sharedExpenses[0].receiptPhoto, undefined);
  assert.equal(back.sharedExpenses[0].label, 'Dinner');
  assert.equal(back.bills[0].cycles[0].receiptPhoto, PIC('BILL'));
});

test('the receipt parts need every phone on 3.0; the bigger storage still needs only 2.2', () => {
  assert.equal(EXTRA_RECEIPTS_VERSION, '3.0');
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '3.0', u2: '2.2' }, EXTRA_RECEIPTS_VERSION), false);
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '3.0', u2: '3.0' }, EXTRA_RECEIPTS_VERSION), true);
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '3.0', u2: '2.2' }, PARTS_READER_VERSION), true);
});
