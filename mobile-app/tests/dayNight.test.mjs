import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNightAt, nextThemeChange, resolveDark, startingMode, darkHoursText } from '../src/dayNight.ts';

// Day & night (Cath, 2026-10-31, mockups D1 + D3): light by day, dark from sunset to sunrise,
// the same sunrise and sunset Home's sky uses (6:00 / 18:00 without location).
// Phones use their own time zone; this computer may not be in Manila's, so the check is.
process.env.TZ = 'Asia/Manila';
const at = (h, m = 0) => new Date(2026, 9, 31, h, m);

test('dark from sunset to sunrise, light in between (no location: 6:00 to 18:00)', () => {
  assert.equal(isNightAt(at(5, 59)), true);
  assert.equal(isNightAt(at(6, 0)), false);
  assert.equal(isNightAt(at(12)), false);
  assert.equal(isNightAt(at(17, 59)), false);
  assert.equal(isNightAt(at(18, 0)), true);
  assert.equal(isNightAt(at(23, 30)), true);
  assert.equal(isNightAt(at(0, 10)), true);
});

test('with a location, the real sunset and sunrise are used (Manila, Oct 31: about 5:30 PM / 5:50 AM)', () => {
  const lat = 14.6, lon = 121;
  assert.equal(isNightAt(at(17, 45), lat, lon), true, 'after Manila sunset');
  assert.equal(isNightAt(at(17, 15), lat, lon), false, 'before Manila sunset');
  assert.equal(isNightAt(at(6, 0), lat, lon), false, 'after Manila sunrise');
  assert.equal(isNightAt(at(5, 40), lat, lon), true, 'before Manila sunrise');
});

test('the next switch is the coming sunset by day, the coming sunrise by night (even after midnight)', () => {
  assert.deepEqual(nextThemeChange(at(12)), new Date(2026, 9, 31, 18));
  assert.deepEqual(nextThemeChange(at(20)), new Date(2026, 10, 1, 6));
  assert.deepEqual(nextThemeChange(at(3)), new Date(2026, 9, 31, 6));
});

test('each look: Light, Dark and Match my phone never follow the clock; Day & night does', () => {
  assert.equal(resolveDark('light', at(23), false), false);
  assert.equal(resolveDark('dark', at(12), false), true);
  assert.equal(resolveDark('device', at(23), false), false);
  assert.equal(resolveDark('device', at(12), true), true);
  assert.equal(resolveDark('auto', at(23), false), true);
  assert.equal(resolveDark('auto', at(12), true), false);
});

test('new people start on Day & night; a saved choice is kept', () => {
  assert.equal(startingMode(null), 'auto');
  assert.equal(startingMode('light'), 'light');
  assert.equal(startingMode('dark'), 'dark');
  assert.equal(startingMode('device'), 'device');
  assert.equal(startingMode('auto'), 'auto');
  assert.equal(startingMode('rubbish'), 'auto');
});

test('the dark hours are written the app way', () => {
  assert.equal(darkHoursText(at(12)), 'Dark 6:00 PM to 6:00 AM');
});
