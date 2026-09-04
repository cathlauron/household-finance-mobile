import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

// How many times the password is "stretched" before it becomes the real encryption key.
// Higher = slower to guess by brute force, at the cost of a small delay when signing in.
const PBKDF2_ITERATIONS = 100000;

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
export function deriveKey(password: string, saltHex: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), {
    keySize: 256 / 32,
    iterations: PBKDF2_ITERATIONS,
  });
}

// Scrambles any data (as JSON) using the derived key. A fresh random IV is used every time,
// so the same data never scrambles to the exact same text twice.
export async function encryptJSON(key: CryptoJS.lib.WordArray, data: unknown): Promise<string> {
  const ivHex = await randomIVHex();
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const json = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(json, key, { iv });
  return ivHex + ':' + encrypted.toString();
}

// Reverses encryptJSON. Throws if the key is wrong (e.g. incorrect password) — callers
// should catch this and show "incorrect password" rather than let the app crash.
export function decryptJSON<T>(key: CryptoJS.lib.WordArray, payload: string): T {
  const [ivHex, ciphertext] = payload.split(':');
  if (!ivHex || !ciphertext) throw new Error('Malformed encrypted payload');
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const decrypted = CryptoJS.AES.decrypt(ciphertext, key, { iv });
  const json = decrypted.toString(CryptoJS.enc.Utf8);
  if (!json) throw new Error('Could not decrypt — wrong key or corrupted data');
  return JSON.parse(json);
}
