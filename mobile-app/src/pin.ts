import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSalt } from './encryption';

// Same idea as a password: never store the real PIN, only a scrambled "fingerprint" of it
// (a hash) plus the random salt used to make that fingerprint. A saved hash can be checked
// against a freshly typed PIN, but can't be reversed back into the original digits.
type StoredPin = { hash: string; salt: string };

function pinKey(username: string): string {
  return `profile:${username}:pin-hash`;
}

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

async function hashPin(pin: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin + saltHex);
}

export async function savePin(username: string, pin: string): Promise<void> {
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  const stored: StoredPin = { hash, salt };
  await AsyncStorage.setItem(pinKey(username), JSON.stringify(stored));
}

export async function hasPinSetUp(username: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(pinKey(username));
  return !!raw;
}

export async function verifyPin(username: string, pin: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(pinKey(username));
  if (!raw) return false;
  try {
    const stored: StoredPin = JSON.parse(raw);
    const hash = await hashPin(pin, stored.salt);
    return hash === stored.hash;
  } catch (e) {
    return false;
  }
}

export async function removePin(username: string): Promise<void> {
  await AsyncStorage.removeItem(pinKey(username));
}

// ---- H-18 (2026-10-22, Cath's rule): 5 wrong PINs block the PIN for 5 minutes ----
// Saved on the phone, so closing and reopening the app doesn't give fresh tries. The
// account password (and fingerprint) still open the app meanwhile; using the password
// lifts the block.
export const PIN_LOCK_MS = 5 * 60 * 1000;

function pinLockKey(username: string): string {
  return `profile:${username}:pin-locked-until`;
}

// SEC-5 (Cath's OK, 2026-10-27): each new block is longer (5 minutes, then 15, then an
// hour), and after the third the PIN stays off until the account password is used. So
// moving the phone's clock only skips a wait, never gives endless tries.
export const PIN_LOCK_STEPS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];
export const PIN_PASSWORD_ONLY = Number.MAX_SAFE_INTEGER;
function pinRoundsKey(username: string): string {
  return `profile:${username}:pin-lock-rounds`;
}

// When the PIN works again (a time in ms; PIN_PASSWORD_ONLY = only after the password), or
// 0 when it isn't blocked.
export async function pinLockedUntil(username: string): Promise<number> {
  try {
    const until = parseInt((await AsyncStorage.getItem(pinLockKey(username))) ?? '0', 10) || 0;
    if (until >= PIN_PASSWORD_ONLY) return PIN_PASSWORD_ONLY;
    return until > Date.now() ? until : 0;
  } catch (e) {
    return 0;
  }
}

export async function lockPin(username: string): Promise<void> {
  const rounds = (parseInt((await AsyncStorage.getItem(pinRoundsKey(username)).catch(() => null)) ?? '0', 10) || 0) + 1;
  await AsyncStorage.setItem(pinRoundsKey(username), String(rounds)).catch(() => {});
  const until = rounds > PIN_LOCK_STEPS_MS.length ? PIN_PASSWORD_ONLY : Date.now() + PIN_LOCK_STEPS_MS[rounds - 1];
  await AsyncStorage.setItem(pinLockKey(username), String(until)).catch(() => {});
}

// The password was used: the PIN works again, and the waits start from 5 minutes again.
export async function clearPinLock(username: string): Promise<void> {
  await AsyncStorage.removeItem(pinLockKey(username)).catch(() => {});
  await AsyncStorage.removeItem(pinRoundsKey(username)).catch(() => {});
}
