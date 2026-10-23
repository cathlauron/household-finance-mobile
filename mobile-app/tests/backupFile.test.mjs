import { test } from 'node:test';
import assert from 'node:assert/strict';
import CryptoJS from 'crypto-js';
import { makeBackupText, readBackupText, isBackupFileName, backupFileName } from '../src/backupFile.ts';

// H-05 (2026-10-22): Save a backup used to write every money detail as plain text.
// Few rounds here so the checks run fast; the app uses 100,000.
const derive = (password, saltHex, rounds) =>
  CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 8, iterations: Math.min(rounds, 10), hasher: CryptoJS.algo.SHA256 });
const salt = '00112233445566778899aabbccddeeff';
const iv = 'ffeeddccbbaa99887766554433221100';
const model = { bills: [{ id: 'b1', name: 'Meralco', amount: 2350 }], accounts: [{ name: 'BPI Savings', balance: 48210 }] };
const make = () => makeBackupText(model, derive('right password', salt, 100000), salt, iv, new Date('2026-10-22T00:00:00Z'));

test('the backup file has nothing readable in it', () => {
  const text = make();
  for (const word of ['Meralco', '2350', 'BPI', '48210', 'bills', 'accounts']) assert.ok(!text.includes(word), `found "${word}"`);
});

test('the right password opens it and gives back everything', () => {
  assert.deepEqual(readBackupText(make(), derive, 'right password'), model);
});

test('a wrong password does not open it', () => {
  assert.throws(() => readBackupText(make(), derive, 'wrong password'));
});

test('something that is not a backup is refused', () => {
  assert.throws(() => readBackupText(JSON.stringify(model), derive, 'right password'), /Not a Finance Flow backup/);
});

test('backup file names are recognised (so old ones can be removed)', () => {
  assert.ok(isBackupFileName(backupFileName(new Date(1761091200000))));
  assert.ok(!isBackupFileName('receipt.jpg'));
  assert.ok(!isBackupFileName('finance-flow-backup-../x.json'));
});
