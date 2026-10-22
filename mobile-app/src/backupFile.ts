import CryptoJS from 'crypto-js';

// Settings > Backup & Data > Save a backup (H-05, 2026-10-22, Cath chose "lock it with my
// password"). The backup file used to be every money detail in plain text, left in the
// phone's cache. Now it is locked the same way the app locks its own data: AES with a key
// made from the account password (PBKDF2-SHA256, 100,000 rounds) and a fresh random salt.
// Opening it needs that password. The file only holds the locked text and what's needed to
// unlock it (salt, rounds), never anything readable.
//
// No Expo imports here (the tests run this file directly): the caller makes the key and
// the random salt / IV.

export const BACKUP_KIND = 'finance-flow-backup';
export const BACKUP_FORMAT = 1;
export const BACKUP_ROUNDS = 100000;

export type BackupFile = {
  kind: typeof BACKUP_KIND;
  format: number;
  createdAt: string;
  salt: string; // hex
  rounds: number;
  data: string; // "<iv hex>:<AES ciphertext>", the same shape as the app's own locked data
};

export function makeBackupText(model: unknown, key: CryptoJS.lib.WordArray, saltHex: string, ivHex: string, now = new Date()): string {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(model), key, { iv: CryptoJS.enc.Hex.parse(ivHex) });
  const file: BackupFile = {
    kind: BACKUP_KIND,
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    salt: saltHex,
    rounds: BACKUP_ROUNDS,
    data: `${ivHex}:${encrypted.toString()}`,
  };
  return JSON.stringify(file);
}

// For a future Restore (and the checks). Throws when it isn't a backup file or the
// password is wrong.
export function readBackupText<T>(text: string, deriveKey: (password: string, saltHex: string, rounds: number) => CryptoJS.lib.WordArray, password: string): T {
  const file = JSON.parse(text) as Partial<BackupFile>;
  if (file.kind !== BACKUP_KIND || typeof file.data !== 'string' || typeof file.salt !== 'string') {
    throw new Error('Not a Finance Flow backup');
  }
  const [ivHex, ciphertext] = file.data.split(':');
  const key = deriveKey(password, file.salt, file.rounds ?? BACKUP_ROUNDS);
  const json = CryptoJS.AES.decrypt(ciphertext, key, { iv: CryptoJS.enc.Hex.parse(ivHex) }).toString(CryptoJS.enc.Utf8);
  if (!json) throw new Error('Wrong password');
  return JSON.parse(json) as T;
}

// Backup files are named like this in the phone's cache folder, so old ones can be found
// and removed.
export function backupFileName(now = new Date()): string {
  return `finance-flow-backup-${now.getTime()}.json`;
}
export function isBackupFileName(name: string): boolean {
  return /^finance-flow-backup-\d+\.json$/.test(name);
}
