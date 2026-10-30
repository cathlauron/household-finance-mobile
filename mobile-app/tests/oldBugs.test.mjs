// The 17 older fixed bugs with no automatic check (BUG-LOG "none yet"), Cath 2026-10-30.
// Each check here guards one of them so it can't come back silently. (Others are guarded by
// checks that already existed; see the BUG-LOG rows.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectArrival, takeExpectedArrival } from '../src/arrivalFocus.ts';
import { inviteLink, joinCodeFromUrl, INVITE_PAGE } from '../src/joinLink.ts';
import { computeFiScenario } from '../src/fiScenario.ts';
import { isEmergencyPot, potTarget, monthsCovered, efTargetMonths } from '../src/savingsPots.ts';

test('B-004: after Add, the list knows which item is new (to glow and scroll to it), once', () => {
  expectArrival('bills', ['b1', 'b2']);
  assert.equal(takeExpectedArrival('debts', ['b1', 'b2', 'b3']), null, 'another list: not this one');
  assert.equal(takeExpectedArrival('bills', ['b1', 'b2', 'b3']), 'b3');
  assert.equal(takeExpectedArrival('bills', ['b1', 'b2', 'b3']), null, 'only once');
});

test('B-015: the invite carries a link to the invite page with the code', () => {
  const link = inviteLink('ABC234', 'Cath Lauron', 1000);
  assert.ok(link.startsWith(INVITE_PAGE + '#'));
  assert.match(link, /c=ABC234/);
  assert.match(link, /n=Cath(&|$)/);
  assert.equal(joinCodeFromUrl('financeflow://join/ABC234'), 'ABC234', 'the app link opens with the code (codes never use 0, 1, I or O)');
  assert.equal(joinCodeFromUrl(link), 'ABC234', 'and so does the web link');
});

test('B-030: the FI calculator works out the FI number and how long it takes', () => {
  const r = computeFiScenario({ annualExpenses: 600000, guaranteedAnnualIncome: 0, currentSavings: 0, swrPct: 4, expectedReturnPct: 0, monthlySavings: 50000 });
  assert.equal(r.fiNumber, 15000000);
  assert.equal(r.canProjectTimeline, true);
  assert.equal(r.monthsUntilFi, 300);
  const half = computeFiScenario({ annualExpenses: 600000, guaranteedAnnualIncome: 0, currentSavings: 7500000, swrPct: 4, expectedReturnPct: 0, monthlySavings: 0 });
  assert.equal(Math.round(half.progressPct), 50);
  const pension = computeFiScenario({ annualExpenses: 600000, guaranteedAnnualIncome: 200000, currentSavings: 0, swrPct: 4, expectedReturnPct: 0, monthlySavings: 0 });
  assert.equal(pension.netAnnualExpenses, 400000, 'guaranteed income lowers what savings must cover');
});

test('B-031: the emergency fund: target = months x monthly essentials, months covered', () => {
  const model = { calculatorInputs: { efTargetMonths: 6, efMonthlyExpenses: 20000 }, savingsGoals: [] };
  const pot = { id: 'p', name: 'Emergency fund', contributions: [{ amount: 30000 }, { amount: 10000 }] };
  assert.equal(isEmergencyPot(pot), true);
  assert.equal(potTarget(pot, model), 120000);
  assert.equal(monthsCovered(pot, model), 2);
  assert.equal(efTargetMonths({ calculatorInputs: {} }), 6, 'no choice made: 6 months');
});

import { buildPages, todayIndex } from '../src/calendarPages.ts';
import { codeTimeLeft } from '../src/linkCodeTime.ts';

test('B-025: the calendar starts in January, whole years, 5 each side', () => {
  const now = new Date(2026, 9, 30);
  const pages = buildPages(now);
  assert.deepEqual(pages[0], { year: 2021, month: 0 });
  assert.deepEqual(pages[pages.length - 1], { year: 2031, month: 11 });
  assert.equal(pages.length, 11 * 12);
  assert.deepEqual(pages[todayIndex(now)], { year: 2026, month: 9 });
});

test('B-016: an invite code past its 15 minutes has no time left', () => {
  const ttl = 15 * 60 * 1000;
  const start = 1_000_000;
  assert.ok(codeTimeLeft(start, ttl, start + 60_000) > 0);
  assert.ok(codeTimeLeft(start, ttl, start + ttl + 1) <= 0);
  assert.equal(codeTimeLeft(undefined, ttl, start), -1);
});
