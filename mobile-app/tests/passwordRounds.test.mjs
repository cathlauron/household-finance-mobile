// K5 step 2: the round count travels inside the salt; ordinary salts are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';
import { saltParts, saltWithRounds, BASE_ROUNDS } from '../src/passwordRounds.ts';
import { makeKeyDeriver } from '../src/pbkdf2Core.ts';

const hex = '000102030405060708090a0b0c0d0e0f';

test('an ordinary salt (every account so far) means 100,000 rounds, salt unchanged', () => {
  assert.deepEqual(saltParts(hex), { saltHex: hex, rounds: 100000 });
});

test('a salt with its own count gives that count and the plain salt', () => {
  assert.deepEqual(saltParts('r600000$' + hex), { saltHex: hex, rounds: 600000 });
  assert.equal(saltWithRounds(hex, 600000), 'r600000$' + hex);
  assert.deepEqual(saltParts(saltWithRounds(hex, 310000)), { saltHex: hex, rounds: 310000 });
});

test('the count can never be lowered below 100,000 or pushed past 2,000,000', () => {
  assert.equal(saltParts('r5$' + hex).rounds, BASE_ROUNDS);
  assert.equal(saltParts('r99999999$' + hex).rounds, 2000000);
  assert.equal(saltWithRounds(hex, 100000), hex);
  assert.equal(saltWithRounds(hex, 10), hex);
});

test('an ordinary salt makes exactly the same key as before step 2', () => {
  const d = makeKeyDeriver(() => null);
  const { saltHex, rounds } = saltParts(hex);
  const now = d.derive('pässword ✓', CryptoJS.enc.Hex.parse(saltHex), rounds).toString();
  const before = CryptoJS.PBKDF2('pässword ✓', CryptoJS.enc.Hex.parse(hex), { keySize: 8, iterations: 100000, hasher: CryptoJS.algo.SHA256 }).toString();
  assert.equal(now, before);
});
