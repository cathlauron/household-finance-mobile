// ============================================================
// Household Finance App — Household linking (Checkpoint 9.2a)
// ============================================================
// This file has no UI of its own — it's the encryption + Firestore
// "plumbing" that a future screen (Checkpoint 9.2b) will call into
// to actually link two profiles together.
//
// How linking works, in plain terms:
// 1. One random secret key ("household key") is generated once.
// 2. That key gets wrapped (encrypted) separately for each linked
//    person, using their own passphrase-derived key — so two people
//    with two different passphrases can each unlock the same shared
//    household key.
// 3. The real household data (bills, debts, everything) is encrypted
//    with that shared household key and saved to Firestore, so both
//    phones can read/decrypt the same data.
// 4. Firestore never sees anything unencrypted, same as local storage.
//
// Firestore layout used here:
//   households/{householdId}      -> { data: <encrypted household data> }
//   householdKeys/{username}      -> { householdId, wrappedKey }
// ============================================================

import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { encryptJSON, decryptJSON } from './encryption';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// A short random ID identifying one shared household in Firestore —
// not secret, just a "which document" pointer (like a folder name).
export async function generateHouseholdId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(12);
  return bytesToHex(bytes);
}

// The actual shared secret used to encrypt/decrypt the household's data.
// Generated once, when a household is first created.
export async function generateHouseholdKey(): Promise<CryptoJS.lib.WordArray> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return CryptoJS.enc.Hex.parse(bytesToHex(bytes));
}

// Encrypts the household key using one person's own passphrase-derived key,
// so it can be safely stored/sent and only that person can unwrap it.
export async function wrapHouseholdKey(
  householdKey: CryptoJS.lib.WordArray,
  personalKey: CryptoJS.lib.WordArray
): Promise<string> {
  return encryptJSON(personalKey, { k: householdKey.toString(CryptoJS.enc.Hex) });
}

// Reverses wrapHouseholdKey — throws if personalKey is wrong (e.g. wrong
// passphrase), same behavior as decryptJSON itself.
export function unwrapHouseholdKey(
  wrapped: string,
  personalKey: CryptoJS.lib.WordArray
): CryptoJS.lib.WordArray {
  const { k } = decryptJSON<{ k: string }>(personalKey, wrapped);
  return CryptoJS.enc.Hex.parse(k);
}

// ---- Firestore: the shared, encrypted household data itself ----

export async function saveHouseholdData(householdId: string, encryptedPayload: string): Promise<void> {
  await setDoc(doc(db, 'households', householdId), {
    data: encryptedPayload,
    updatedAt: Date.now(),
  });
}

// Returns the raw encrypted string, or null if nothing's been saved yet.
// Callers decrypt it themselves with decryptJSON, using the household key.
export async function loadHouseholdData(householdId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return typeof data.data === 'string' ? data.data : null;
}

// ---- Firestore: each linked person's own wrapped copy of the household key ----
// Keyed by username so a phone can look up "what household is this username
// linked to, and what's my wrapped key" from any device, using just the
// username + passphrase (no separate device-pairing step needed).

export async function saveWrappedHouseholdKey(
  username: string,
  householdId: string,
  wrappedKey: string
): Promise<void> {
  await setDoc(doc(db, 'householdKeys', username), {
    householdId,
    wrappedKey,
    updatedAt: Date.now(),
  });
}

export async function loadWrappedHouseholdKey(
  username: string
): Promise<{ householdId: string; wrappedKey: string } | null> {
  const snap = await getDoc(doc(db, 'householdKeys', username));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (typeof data.householdId !== 'string' || typeof data.wrappedKey !== 'string') return null;
  return { householdId: data.householdId, wrappedKey: data.wrappedKey };
}

// Used when unlinking a profile — removes just this username's wrapped key,
// leaving the shared household data and any other linked person untouched.
export async function deleteWrappedHouseholdKey(username: string): Promise<void> {
  await deleteDoc(doc(db, 'householdKeys', username));
}
