// Cath's phone test 2026-10-30: a code typed in small letters got extra letters on Android.
// Every code box must use CODE_INPUT (plain-letters keyboard, no suggestions), and small
// letters must count the same as capitals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePeerCode, formatPeerCode } from '../src/recoveryCodeText.ts';

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

test('no code box sets its own keyboard: they all use CODE_INPUT', () => {
  const own = files('src').filter((f) => !f.endsWith('codeInput.ts') && readFileSync(f, 'utf8').includes('autoCapitalize="characters"'));
  assert.deepEqual(own, []);
  for (const f of ['src/screens/ProfileScreen.tsx', 'src/screens/SignInScreen.tsx']) {
    assert.ok(readFileSync(f, 'utf8').includes('{...CODE_INPUT}'), f);
  }
});

test('a code typed in small letters is the same code', () => {
  assert.equal(normalizePeerCode('ahghr-nrxu6'), 'AHGHRNRXU6');
  assert.equal(formatPeerCode(normalizePeerCode('ahghrnrxu6')), 'AHGHR-NRXU6');
});

import { recoveryRequestRoute } from '../src/bellRoute.ts';
test('a sign-in help request in the bell opens the Household page (not Profile)', () => {
  assert.deepEqual(recoveryRequestRoute(), { screen: 'Profile', params: { section: 'household' } });
  assert.ok(readFileSync('src/screens/HomeScreen.tsx', 'utf8').includes('recoveryRequestRoute()'));
});
