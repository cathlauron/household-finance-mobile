import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLeftToSpend, getLeftToSpendStatus, formatPeso } from '../src/balanceProjection.ts';
import { defaultModel } from '../src/defaultModel.ts';

// H-11 (2026-10-22): sums of centavo amounts are never exact on a computer (0.30 - 0.10 -
// 0.20 is a hair below zero). Left to Spend could then be "-₱0.00" and turn the app rose
// ("Over budget") with nothing actually overspent. Missing amounts showed "₱NaN".
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFrom = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const colors = { error: 'red', orange: 'orange', ok: 'green' };

function spentExactlyAll() {
  const m = defaultModel();
  m.balanceAccounts = { ...m.balanceAccounts, asOfDate: iso(daysFrom(-3)), asOfAt: daysFrom(-3).getTime(), cash: [], credit: [], debit: [{ id: 'a1', name: 'GCash', amount: 0.3 }] };
  const pm = { type: 'debit', accountId: 'a1' };
  m.manualTransactions = [
    { id: 't1', date: iso(daysFrom(-1)), label: 'Candy', amount: 0.1, direction: 'out', paymentMethod: pm, createdAt: Date.now() },
    { id: 't2', date: iso(daysFrom(-1)), label: 'Gum', amount: 0.2, direction: 'out', paymentMethod: pm, createdAt: Date.now() },
  ];
  return m;
}

test('spending exactly what was there leaves exactly ₱0.00, not a hair below', () => {
  const r = computeLeftToSpend(spentExactlyAll());
  assert.equal(r.amount, 0);
});

test('...and that is not "Over budget"', () => {
  const m = spentExactlyAll();
  assert.notEqual(getLeftToSpendStatus(computeLeftToSpend(m).amount, m, colors).mood, 'over');
});

test('a hair below zero never shows as "-₱0.00"', () => {
  assert.equal(formatPeso(-0.001), '₱0.00');
  assert.equal(formatPeso(-2.7755575615628914e-17), '₱0.00');
  assert.equal(formatPeso(-650), '-₱650.00');
});

test('a missing or broken amount never shows "NaN" or "∞"', () => {
  for (const v of [NaN, Infinity, undefined, null]) {
    const s = formatPeso(v);
    assert.ok(!/NaN|∞/.test(s), s);
  }
});
