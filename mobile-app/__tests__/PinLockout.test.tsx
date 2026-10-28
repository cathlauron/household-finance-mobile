import { savePin, verifyPin, pinLockedUntil, PIN_LOCK_MS } from '../src/pin';
import { registerPinFailure } from '../src/quickUnlock';

// H-18 (2026-10-22): after 5 wrong PINs the lock screen only switched to "password" until
// the app was reopened; a fresh set of 5 tries came back after every restart, so a PIN
// could be guessed by reopening the app again and again. Cath's rule: the PIN is blocked
// for 5 minutes (also after reopening); the account password always still works.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
  setItemAsync: async () => {},
  getItemAsync: async () => null,
  deleteItemAsync: async () => {},
}));
jest.mock('expo-crypto', () => {
  const C = require('crypto-js');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: async (_a: string, s: string) => C.SHA256(s).toString(),
    getRandomBytesAsync: async (n: number) => new Uint8Array(n).fill(7),
  };
});

test('5 wrong PINs: the PIN is blocked for 5 minutes, saved on the phone (survives reopening)', async () => {
  const start = Date.now();
  await savePin('cath', '1234');
  for (let i = 0; i < 5; i++) await registerPinFailure('cath');
  const until = await pinLockedUntil('cath');
  expect(until).toBeGreaterThanOrEqual(start + PIN_LOCK_MS);
  expect(until).toBeLessThan(start + PIN_LOCK_MS + 5000);
  expect(PIN_LOCK_MS).toBe(5 * 60 * 1000);
});

test('after the 5 minutes, the PIN works again', async () => {
  await savePin('dee', '4321');
  for (let i = 0; i < 5; i++) await registerPinFailure('dee');
  const realNow = Date.now;
  Date.now = () => realNow() + PIN_LOCK_MS + 1000;
  try {
    expect(await pinLockedUntil('dee')).toBe(0);
    expect(await verifyPin('dee', '4321')).toBe(true);
  } finally {
    Date.now = realNow;
  }
});

test('fewer than 5 wrong PINs: the right PIN still works', async () => {
  await savePin('ana', '5678');
  for (let i = 0; i < 4; i++) await registerPinFailure('ana');
  expect(await verifyPin('ana', '5678')).toBe(true);
  expect(await pinLockedUntil('ana')).toBe(0);
});

// SEC-5 (Cath's OK, 2026-10-27): the waits grow (5, 15, 60 minutes), then only the password
// opens the app; the password starts the waits over.
test('each new block is longer, and after three only the password works', async () => {
  const { PIN_LOCK_STEPS_MS, PIN_PASSWORD_ONLY, clearPinLock } = require('../src/pin');
  await savePin('eve', '1111');
  const realNow = Date.now;
  let shift = 0;
  Date.now = () => realNow() + shift;
  try {
    for (let round = 0; round < 3; round++) {
      const start = Date.now();
      for (let i = 0; i < 5; i++) await registerPinFailure('eve');
      const until = await pinLockedUntil('eve');
      expect(until - start).toBeGreaterThanOrEqual(PIN_LOCK_STEPS_MS[round]);
      expect(until - start).toBeLessThan(PIN_LOCK_STEPS_MS[round] + 5000);
      shift += PIN_LOCK_STEPS_MS[round] + 1000; // the wait passes (or the clock is moved)
    }
    for (let i = 0; i < 5; i++) await registerPinFailure('eve');
    shift += 365 * 24 * 3600 * 1000; // moving the clock a year doesn't help
    expect(await pinLockedUntil('eve')).toBe(PIN_PASSWORD_ONLY);
    await clearPinLock('eve'); // the password was used
    expect(await pinLockedUntil('eve')).toBe(0);
  } finally {
    Date.now = realNow;
  }
});
