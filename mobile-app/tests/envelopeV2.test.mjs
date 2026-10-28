// K5 (Cath's OK, 2026-10-27): the tamper-checked kind of saved data. 3.2 reads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';
import { sealV2, openV2, isV2Payload } from '../src/envelopeV2.ts';

const key = CryptoJS.SHA256('household key for the test');
const other = CryptoJS.SHA256('some other key');
const IV = '00112233445566778899aabbccddeeff';

test('sealed then opened gives back the same text', () => {
  const s = sealV2(key, JSON.stringify({ a: 1, peso: '₱1,000' }), IV);
  assert.ok(isV2Payload(s));
  assert.deepEqual(JSON.parse(openV2(key, s)), { a: 1, peso: '₱1,000' });
});

test('any change, or the wrong key, is refused', () => {
  const s = sealV2(key, 'hello', IV);
  const [, iv, ct, mac] = s.split(':');
  const flip = (t) => (t[5] === 'A' ? t.slice(0, 5) + 'B' + t.slice(6) : t.slice(0, 5) + 'A' + t.slice(6));
  assert.throws(() => openV2(key, `f2:${iv}:${flip(ct)}:${mac}`));
  assert.throws(() => openV2(key, `f2:${flip(iv)}:${ct}:${mac}`));
  assert.throws(() => openV2(key, `f2:${iv}:${ct}:${flip(mac)}`));
  assert.throws(() => openV2(other, s));
  // A part sealed for one place can't be opened as another.
  const part = sealV2(key, 'x', IV, 'txn-2026-10');
  assert.equal(openV2(key, part, 'txn-2026-10'), 'x');
  assert.throws(() => openV2(key, part, 'txn-2026-11'));
});

// (decryptJSON itself is checked in __tests__/EnvelopeRead.test.tsx: it needs the phone's
// random-number module.)
