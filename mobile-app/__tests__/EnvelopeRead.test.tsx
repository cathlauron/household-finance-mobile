// K5 (Cath's OK, 2026-10-27): the app opens both the old kind of saved data and the new
// tamper-checked kind, so a 3.2 phone can read what 3.3+ will write.
import CryptoJS from 'crypto-js';
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: async (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 7) }));

test('old saves and new tamper-checked saves both open', async () => {
  const { decryptJSON, encryptJSON } = require('../src/encryption');
  const { sealV2 } = require('../src/envelopeV2');
  const key = CryptoJS.SHA256('k');
  const old = await encryptJSON(key, { v: 1 });
  expect(decryptJSON(key, old)).toEqual({ v: 1 });
  const v2 = sealV2(key, JSON.stringify({ v: 2 }), '00112233445566778899aabbccddeeff');
  expect(decryptJSON(key, v2)).toEqual({ v: 2 });
  expect(() => decryptJSON(key, v2.slice(0, -2) + '00')).toThrow();
});
