import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeHouseholds } from '../src/merge3.ts';

const base = {
  settings: { currency: 'PHP', theme: 'light' },
  bills: [
    { id: 'b1', name: 'Meralco', amount: 3000 },
    { id: 'b2', name: 'Internet', amount: 1699 },
  ],
  manualTransactions: [{ id: 't1', label: 'Coffee', amount: 100 }],
  walletOrder: ['debit:a', 'debit:b'],
};
const clone = (x) => JSON.parse(JSON.stringify(x));

test('both phones add a transaction: both kept', () => {
  const mine = clone(base); mine.manualTransactions.push({ id: 't2', label: 'Lunch', amount: 200 });
  const theirs = clone(base); theirs.manualTransactions.push({ id: 't3', label: 'Taxi', amount: 150 });
  const m = mergeHouseholds(base, mine, theirs);
  assert.deepEqual(m.manualTransactions.map((t) => t.id).sort(), ['t1', 't2', 't3']);
});

test('deleted on one phone, untouched on the other: stays deleted', () => {
  const mine = clone(base); mine.bills = mine.bills.filter((b) => b.id !== 'b2');
  const theirs = clone(base); theirs.manualTransactions.push({ id: 't3', label: 'Taxi', amount: 150 });
  const m = mergeHouseholds(base, mine, theirs);
  assert.deepEqual(m.bills.map((b) => b.id), ['b1']);
  assert.equal(m.manualTransactions.length, 2);
});

test('deleted there, deleted here too: gone', () => {
  const mine = clone(base); mine.bills = [mine.bills[0]];
  const theirs = clone(base); theirs.bills = [theirs.bills[0]];
  assert.deepEqual(mergeHouseholds(base, mine, theirs).bills.map((b) => b.id), ['b1']);
});

test('edited here, deleted there: the edit is kept', () => {
  const mine = clone(base); mine.bills[1].amount = 1799;
  const theirs = clone(base); theirs.bills = [theirs.bills[0]];
  const m = mergeHouseholds(base, mine, theirs);
  assert.equal(m.bills.find((b) => b.id === 'b2').amount, 1799);
});

test('same bill, different fields changed: both changes kept', () => {
  const mine = clone(base); mine.bills[0].amount = 3200;
  const theirs = clone(base); theirs.bills[0].name = 'Meralco (house)';
  const b1 = mergeHouseholds(base, mine, theirs).bills.find((b) => b.id === 'b1');
  assert.equal(b1.amount, 3200);
  assert.equal(b1.name, 'Meralco (house)');
});

test('same field changed on both: the phone saving now wins', () => {
  const mine = clone(base); mine.bills[0].amount = 3200;
  const theirs = clone(base); theirs.bills[0].amount = 3100;
  assert.equal(mergeHouseholds(base, mine, theirs).bills[0].amount, 3200);
});

test('only the other phone changed something: their change comes through', () => {
  const mine = clone(base);
  const theirs = clone(base); theirs.settings.theme = 'dark';
  assert.equal(mergeHouseholds(base, mine, theirs).settings.theme, 'dark');
});

test('settings: different settings changed on each phone both kept', () => {
  const mine = clone(base); mine.settings.currency = 'USD';
  const theirs = clone(base); theirs.settings.theme = 'dark';
  assert.deepEqual(mergeHouseholds(base, mine, theirs).settings, { currency: 'USD', theme: 'dark' });
});

test('nested lists with ids (payments on a bill) merge too', () => {
  const b = { bills: [{ id: 'b1', cycles: [{ id: 'c1', paid: false }] }] };
  const mine = clone(b); mine.bills[0].cycles.push({ id: 'c2', paid: true });
  const theirs = clone(b); theirs.bills[0].cycles[0].paid = true;
  const m = mergeHouseholds(b, mine, theirs);
  assert.deepEqual(m.bills[0].cycles, [{ id: 'c1', paid: true }, { id: 'c2', paid: true }]);
});

test('no base known: nothing is lost', () => {
  const mine = clone(base); mine.manualTransactions.push({ id: 't2', label: 'Lunch', amount: 200 });
  const theirs = clone(base); theirs.bills = [theirs.bills[0]];
  const m = mergeHouseholds(null, mine, theirs);
  assert.equal(m.manualTransactions.length, 2);
  assert.deepEqual(m.bills.map((b) => b.id).sort(), ['b1', 'b2']);
});

test('lists without ids (card order): the phone saving now wins', () => {
  const mine = clone(base); mine.walletOrder = ['debit:b', 'debit:a'];
  const theirs = clone(base); theirs.walletOrder = ['debit:a', 'debit:b', 'debit:c'];
  assert.deepEqual(mergeHouseholds(base, mine, theirs).walletOrder, ['debit:b', 'debit:a']);
});

// Version 2.2 (review fix): two quick saves in a row while the other phone also saved.
// Save A went out and came back merged with the other phone's change C; meanwhile this
// phone already made B on top of A. Folding the result into B keeps all three.
test('a newer change made while saving keeps the other phone\'s change', () => {
  const A = clone(base); A.manualTransactions.push({ id: 'tA', label: 'Tick 1', amount: 10 });
  const B = clone(A); B.manualTransactions.push({ id: 'tB', label: 'Tick 2', amount: 20 });
  const C = clone(base); C.bills[0].amount = 3200; // the other phone's change
  const savedOnline = mergeHouseholds(base, A, C); // what save A wrote online (A + C)
  const folded = mergeHouseholds(A, B, savedOnline); // sent A, newest B, online A + C
  assert.deepEqual(folded.manualTransactions.map((t) => t.id).sort(), ['t1', 'tA', 'tB']);
  assert.equal(folded.bills[0].amount, 3200);
  // and the next save writes it as is (nothing new online since A + C)
  assert.deepEqual(mergeHouseholds(savedOnline, folded, savedOnline), folded);
});

test('a newer save from the other phone already on screen is kept when this save comes back', () => {
  const A = clone(base); A.manualTransactions.push({ id: 'tA', label: 'Tick 1', amount: 10 });
  const C = clone(base); C.bills[0].amount = 3200;
  const savedOnline = mergeHouseholds(base, A, C); // this save's result: A + C
  const D = clone(savedOnline); D.manualTransactions.push({ id: 'tD', label: 'Their taxi', amount: 90 });
  const onScreen = mergeHouseholds(base, A, D); // the listener already showed A + C + D
  const folded = mergeHouseholds(A, onScreen, savedOnline);
  assert.deepEqual(folded.manualTransactions.map((t) => t.id).sort(), ['t1', 'tA', 'tD']);
  assert.equal(folded.bills[0].amount, 3200);
});
