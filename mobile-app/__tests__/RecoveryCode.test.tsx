// K4 / SEC-4 (Cath's OK, 2026-10-27): the household-help code is 10 letters and numbers,
// only the asker can read the key once it's sent, and requests run out after 15 minutes.
import fs from 'fs';
import path from 'path';

jest.mock('../src/firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/auth', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('firebase/app', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('../src/authFirebase', () => ({ requireCurrentUid: () => 'u1', getCurrentFirebaseUser: () => null }));
jest.mock('firebase/firestore', () => new Proxy({}, { get: (_t, k) => (k === '__esModule' ? true : () => ({})) }));
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: async (n: number) => Uint8Array.from({ length: n }, (_, i) => (i * 97 + 13) % 256) }));

test('10 characters, no look-alikes, typed any way', async () => {
  const { generatePeerTransferCode, normalizePeerCode, formatPeerCode, PEER_CODE_ALPHABET } = require('../src/recovery');
  const code = await generatePeerTransferCode();
  expect(code).toHaveLength(10);
  for (const ch of code) expect(PEER_CODE_ALPHABET).toContain(ch);
  expect(PEER_CODE_ALPHABET).not.toMatch(/[01IOL]/);
  expect(normalizePeerCode('7kq4m - 2wx9p')).toBe('7KQ4M2WX9P');
  expect(formatPeerCode('7KQ4M2WX9P')).toBe('7KQ4M-2WX9P');
});

test('rules: only the asker reads a sent key; requests expire', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  const block = rules.slice(rules.indexOf('match /householdRecovery/{requestId}'), rules.indexOf('match /sessions/'));
  expect(block).toMatch(/request\.auth\.uid == resource\.data\.requesterUid\s*\|\| \(resource\.data\.status == 'pending'/);
  expect(block).toMatch(/expiresAt <= request\.time\.toMillis\(\) \+ 16 \* 60 \* 1000/);
  expect(block).toMatch(/request\.time\.toMillis\(\) < resource\.data\.expiresAt/);
});
