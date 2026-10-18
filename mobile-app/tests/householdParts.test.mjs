// Automatic checks for src/householdParts.ts (version 2.1, data split into parts).
// Run from mobile-app:  node --experimental-strip-types --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitModel, joinParts, partTexts, changedParts, monthPartId, safePartKey, CORE_PART } from '../src/householdParts.ts';

// Transactions come back grouped by month; the app always sorts them for display, so
// the checks compare them sorted by id.
function normalize(model) {
  const copy = JSON.parse(JSON.stringify(model));
  if (copy.manualTransactions) copy.manualTransactions.sort((a, b) => (a.id < b.id ? -1 : 1));
  return copy;
}

function sampleModel() {
  return {
    settings: { currency: 'PHP', notifyDaysBefore: 3 },
    people: [{ id: 'p1', name: 'Cath' }],
    income: [], bills: [{ id: 'b1', name: 'Meralco', cycles: [] }], debts: [], loans: [], savingsGoals: [],
    balanceAccounts: { asOfDate: '2026-10-01', cash: [], debit: [{ id: 'd1', name: 'Maribank', amount: 2030.11 }], credit: [] },
    manualTransactions: [
      { id: 'txn-a', date: '2026-10-03', label: 'Coffee', amount: 150, direction: 'out', owner: 'shared' },
      { id: 'txn-b', date: '2026-09-28', label: 'Groceries', amount: 2400, direction: 'out', owner: 'shared', receiptPhoto: 'data:image/jpeg;base64,AAAA' },
      { id: 'rec-r1/2026-10-05', date: '2026-10-05', label: 'Netflix', amount: 549, direction: 'out', owner: 'shared' },
      { id: 'txn-c', date: '', label: 'Odd one', amount: 1, direction: 'out', owner: 'shared' },
    ],
    categories: [], categoryBudgets: [],
    avatarPhotos: { cath: [{ id: 'ph1', dataUri: 'data:image/jpeg;base64,BBBB', addedAt: 1 }] },
    preferredNames: { cath: { name: 'Cath', updatedAt: 1 } },
  };
}

test('split then join gives back the same household', () => {
  const model = sampleModel();
  assert.deepEqual(normalize(joinParts(splitModel(model))), normalize(model));
});

test('parts are what we expect', () => {
  const parts = splitModel(sampleModel());
  assert.deepEqual(Object.keys(parts).sort(), [
    'avatars-cath', 'core', 'rcpt-txn-b', 'txn-2026-09', 'txn-2026-10', 'txn-undated',
  ]);
  // The photo is not inside the month part, only a pointer to it.
  assert.equal(parts['txn-2026-09'][0].receiptPhoto, 'part:rcpt-txn-b');
  assert.ok(!JSON.stringify(parts[CORE_PART]).includes('manualTransactions'));
});

test('an empty or minimal household survives', () => {
  const tiny = { settings: {}, people: [], income: [], bills: [], debts: [], loans: [], savingsGoals: [], balanceAccounts: { asOfDate: '', cash: [], debit: [], credit: [] }, manualTransactions: [], categories: [], categoryBudgets: [] };
  assert.deepEqual(normalize(joinParts(splitModel(tiny))), normalize(tiny));
});

test('a missing receipt part does not break the transaction', () => {
  const parts = splitModel(sampleModel());
  delete parts['rcpt-txn-b'];
  const joined = joinParts(parts);
  const t = joined.manualTransactions.find((x) => x.id === 'txn-b');
  assert.equal(t.receiptPhoto, undefined);
  assert.equal(t.amount, 2400);
});

test('only changed parts are saved', () => {
  const before = partTexts(splitModel(sampleModel()));
  const m = sampleModel();
  m.manualTransactions.push({ id: 'txn-d', date: '2026-10-09', label: 'Bread', amount: 80, direction: 'out', owner: 'shared' });
  const after = partTexts(splitModel(m));
  assert.deepEqual(changedParts(before, after), { write: ['txn-2026-10'], remove: [] });
});

test('removing the last transaction of a month removes that part, core goes last', () => {
  const before = partTexts(splitModel(sampleModel()));
  const m = sampleModel();
  m.manualTransactions = m.manualTransactions.filter((t) => t.id !== 'txn-b');
  m.settings.notifyDaysBefore = 5;
  const after = partTexts(splitModel(m));
  const changes = changedParts(before, after);
  assert.deepEqual(changes.remove.sort(), ['rcpt-txn-b', 'txn-2026-09']);
  assert.equal(changes.write[changes.write.length - 1], 'core');
});

test('part ids are safe', () => {
  assert.equal(safePartKey('rec-r1/2026-10-05'), 'rec-r1_2026-10-05');
  assert.equal(safePartKey('__x'), 'x__x');
  assert.equal(monthPartId('2026-02-29'), 'txn-2026-02');
  assert.equal(monthPartId(undefined), 'txn-undated');
});

test('a big household fits in small parts', () => {
  const m = sampleModel();
  m.manualTransactions = [];
  // About 3 years at 10 entries a day.
  for (let i = 0; i < 11000; i++) {
    const d = new Date(2024, 0, 1 + Math.floor(i / 10));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    m.manualTransactions.push({ id: `txn-${i}`, date: iso, label: `Shop number ${i % 40}`, amount: 100 + (i % 900), direction: 'out', owner: 'shared', category: 'Food', createdAt: 1760000000000 + i });
  }
  const texts = partTexts(splitModel(m));
  const biggest = Math.max(...Object.values(texts).map((t) => t.length));
  const whole = JSON.stringify(m).length;
  assert.ok(whole > 1_000_000, 'the old single item would have been over the limit');
  // Encryption adds about a third; every part must stay far below 1 MB.
  assert.ok(biggest * 1.4 < 200_000, `biggest part ${biggest} chars`);
  assert.deepEqual(normalize(joinParts(splitModel(m))), normalize(m));
});
