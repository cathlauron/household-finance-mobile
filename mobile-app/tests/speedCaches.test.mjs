import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLeftToSpend, formatPeso } from '../src/balanceProjection.ts';
import { daySignature } from '../src/dayRows.ts';
import { defaultModel } from '../src/defaultModel.ts';

// Cath, 2026-11-06 (speed): a save redrew every Transactions row and worked Left to Spend out
// again and again. Nothing here may ever show an old value.

test('formatPeso gives the same answer the second time, and keeps amounts apart', () => {
  assert.equal(formatPeso(1234.5), '₱1,234.50');
  assert.equal(formatPeso(1234.5), '₱1,234.50');
  assert.equal(formatPeso(1234.5, '$'), '$1,234.50');
  assert.equal(formatPeso(-1234.5), '-₱1,234.50');
  assert.equal(formatPeso(1234.504), '₱1,234.50');
  assert.equal(formatPeso(NaN), '₱—');
  for (let i = 0; i < 12000; i++) assert.equal(formatPeso(i), `₱${i.toLocaleString('en-PH')}.00`);
});

test('Left to Spend: once per version of the data, and new data is always worked out fresh', () => {
  const m = defaultModel();
  const now = new Date(2026, 10, 6, 9);
  const first = computeLeftToSpend(m, now);
  assert.equal(computeLeftToSpend(m, new Date(2026, 10, 6, 17)), first, 'same data, same day: reused');
  assert.notEqual(computeLeftToSpend(m, new Date(2026, 10, 7, 9)), first, 'a new day: fresh');
  const next = { ...m, balanceAccounts: { ...m.balanceAccounts, cash: [{ id: 'c', name: 'Cash', amount: 500 }] } };
  assert.equal(computeLeftToSpend(next, now).amount, first.amount + 500, 'new data: fresh');
});

const manual = (over = {}) => ({ id: 't1', addedBy: 'cath', paymentMethod: { type: 'cash', accountId: 'a' }, ...over });
const day = (over = {}) => ({ date: '2026-11-06', items: [{ id: 't1', rawId: 't1', label: 'Lunch', amount: 250, date: '2026-11-06', direction: 'out', category: 'Food', source: 'manual', ...over }] });

test('a day of rows counts as changed whenever anything it shows changes', () => {
  const ctx = (m = manual(), arrived = null, account = 'Cash') => ({ manual: () => m, account: () => account, arrived, heading: 'Today' });
  const base = daySignature(day(), ctx());
  assert.equal(daySignature(day(), ctx()), base, 'nothing changed');
  for (const changed of [{ amount: 300 }, { label: 'Dinner' }, { category: 'Bills' }, { direction: 'in' }]) {
    assert.notEqual(daySignature(day(changed), ctx()), base, JSON.stringify(changed));
  }
  assert.notEqual(daySignature(day(), ctx(manual({ refundExpectedAmount: 100 }))), base, 'refund pending');
  assert.notEqual(daySignature(day(), ctx(manual({ refundExpectedAmount: 100, refundTransactionId: 'r' }))), daySignature(day(), ctx(manual({ refundExpectedAmount: 100 }))), 'refund received');
  assert.notEqual(daySignature(day(), ctx(manual({ addedBy: 'queenie' }))), base, 'who added it');
  assert.notEqual(daySignature(day(), ctx(manual(), null, 'Maribank')), base, 'account renamed');
  assert.notEqual(daySignature(day(), ctx(manual(), 't1')), base, 'the new row glows');
  assert.notEqual(daySignature(day(), { ...ctx(), heading: 'Yesterday' }), base, 'the day heading');
  assert.notEqual(daySignature({ date: '2026-11-06', items: [...day().items, { id: 't2', label: 'x', amount: 1 }] }, ctx()), base, 'a new row');
});

test('a receipt photo is never copied into the signature', () => {
  const sig = daySignature(day({ receiptPhoto: 'x'.repeat(50000) }), { manual: () => undefined, account: () => '', arrived: null, heading: '' });
  assert.ok(sig.length < 2000);
});
