import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateSalt } from './encryption';

// Same idea as a passphrase: never store the real PIN, only a scrambled "fingerprint" of it
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
