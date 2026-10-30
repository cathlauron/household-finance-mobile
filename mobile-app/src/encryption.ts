import * as Crypto from 'expo-crypto';
import { isV2Payload, openV2, sealV2 } from './envelopeV2';
import CryptoJS from 'crypto-js';
import { keyDeriver } from './fastCrypto';
import { saltParts } from './passwordRounds';

// How many times the password is "stretched" before it becomes the real encryption key.
// Higher = slower to guess by brute force, at the cost of a small delay when signing in.
// K5 step 2: an ordinary salt still means 100,000; a salt can carry its own count
// (see passwordRounds.ts). Nothing writes a different count yet.

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// A random string, unique per profile, mixed into the password before deriving a key —
// so two people with the same password still get two different encryption keys.
// Uses the phone's real secure random generator, not a fake/guessable one.
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return bytesToHex(bytes);
}

async function randomIVHex(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return bytesToHex(bytes);
}

// Turns a typed password + that profile's salt into the real encryption key.
// PBKDF2 with HMAC-SHA256, 100,000 rounds, 256-bit key (unchanged). Version 2.2: in the
// installed app the phone does this step itself (much faster); the key is exactly the
// same either way (see pbkdf2Core.ts).
export function deriveKey(password: string, salt: string): CryptoJS.lib.WordArray {
  const { saltHex, rounds } = saltParts(salt);
  return keyDeriver.derive(password, CryptoJS.enc.Hex.parse(saltHex), rounds);
}

// Scrambles any data (as JSON) using the derived key. A fresh random IV is used every time,
// so the same data never scrambles to the exact same text twice.
// K5 step 4: { v2: true } writes the tamper-checked kind (envelopeV2.ts). Callers only ask
// for it where every reader runs 3.2 or newer (the household: every member's phone).
export async function encryptJSON(key: CryptoJS.lib.WordArray, data: unknown, opts?: { v2?: boolean }): Promise<string> {
  const ivHex = await randomIVHex();
  if (opts?.v2) return sealV2(key, JSON.stringify(data), ivHex);
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const json = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(json, key, { iv });
  return ivHex + ':' + encrypted.toString();
}

// Reverses encryptJSON. Throws if the key is wrong (e.g. incorrect password) — callers
// should catch this and show "incorrect password" rather than let the app crash.
export function decryptJSON<T>(key: CryptoJS.lib.WordArray, payload: string): T {
  // K5 (3.2): the newer, tamper-checked kind is read too (see envelopeV2.ts). 3.2 only
  // READS it; writing it waits until every phone in use reads it.
  if (isV2Payload(payload)) return JSON.parse(openV2(key, payload));
  const [ivHex, ciphertext] = payload.split(':');
  if (!ivHex || !ciphertext) throw new Error('Malformed encrypted payload');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv });
  const json = decrypted.toString(CryptoJS.enc.Utf8);
  if (!json) throw new Error('Could not decrypt — wrong key or corrupted data');
  return JSON.parse(json);
}
