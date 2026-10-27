// Version 2.2: the phone's fast key step must give exactly the same key as the
// JavaScript one, and anything wrong with it must fall back to JavaScript.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import CryptoJS from 'crypto-js';
import { makeKeyDeriver } from '../src/pbkdf2Core.ts';

// A stand-in for the installed app's native part: real PBKDF2-HMAC-SHA256 on bytes.
const goodNative = {
  calls: 0,
  pbkdf2Sha256(pwB64, saltB64, iterations, keyLength) {
    this.calls++;
    return pbkdf2Sync(Buffer.from(pwB64, 'base64'), Buffer.from(saltB64, 'base64'), iterations, keyLength, 'sha256').toString('base64');
  },
};

function jsKey(password, saltHex, iterations) {
  // Exactly what encryption.ts did before version 2.2.
  return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 256 / 32, iterations }).toString(CryptoJS.enc.Hex);
}

const cases = [
  ['correct horse battery', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', 100000],
  ['Pässwörd ñ 中文 🔐', '00112233445566778899aabbccddeeff', 2000],
  ['x'.repeat(100), 'ffeeddccbbaa99887766554433221100', 2000],
  ['1234', 'deadbeefdeadbeefdeadbeefdeadbeef', 100000],
  ['TU63H6', '0123456789abcdef0123456789abcdef', 5000],
];

test('the native key is identical to the JavaScript key', () => {
  const d = makeKeyDeriver(() => goodNative);
  assert.equal(d.usingNative(), true);
  for (const [pw, salt, it] of cases) {
    const got = d.derive(pw, CryptoJS.enc.Hex.parse(salt), it);
    assert.equal(got.sigBytes, 32);
    assert.equal(got.toString(CryptoJS.enc.Hex), jsKey(pw, salt, it), pw);
  }
});

test('a key from the native step decrypts data locked with the JavaScript key', () => {
  const d = makeKeyDeriver(() => goodNative);
  const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const oldKey = CryptoJS.PBKDF2('my password', CryptoJS.enc.Hex.parse(salt), { keySize: 8, iterations: 1000 });
  const iv = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');
  const locked = CryptoJS.AES.encrypt(JSON.stringify({ hello: 'world' }), oldKey, { iv }).toString();
  const newKey = d.derive('my password', CryptoJS.enc.Hex.parse(salt), 1000);
  const opened = CryptoJS.AES.decrypt(locked, newKey, { iv }).toString(CryptoJS.enc.Utf8);
  assert.deepEqual(JSON.parse(opened), { hello: 'world' });
});

test('a native step that gives a different key is never used', () => {
  const wrong = { pbkdf2Sha256: (a, b, c, n) => Buffer.alloc(n, 7).toString('base64') };
  const d = makeKeyDeriver(() => wrong);
  assert.equal(d.usingNative(), false);
  const [pw, salt, it] = cases[1];
  assert.equal(d.derive(pw, CryptoJS.enc.Hex.parse(salt), it).toString(CryptoJS.enc.Hex), jsKey(pw, salt, it));
});

test('a native step that throws, or is missing, falls back to JavaScript', () => {
  for (const loader of [() => null, () => { throw new Error('no module'); }, () => ({ pbkdf2Sha256() { throw new Error('boom'); } })]) {
    const d = makeKeyDeriver(loader);
    assert.equal(d.usingNative(), false);
    const [pw, salt, it] = cases[2];
    assert.equal(d.derive(pw, CryptoJS.enc.Hex.parse(salt), it).toString(CryptoJS.enc.Hex), jsKey(pw, salt, it));
  }
});

test('an empty password uses JavaScript (the phone refuses empty keys)', () => {
  const d = makeKeyDeriver(() => goodNative);
  assert.equal(d.derive('', CryptoJS.enc.Hex.parse('00'.repeat(16)), 10).toString(CryptoJS.enc.Hex), jsKey('', '00'.repeat(16), 10));
});
