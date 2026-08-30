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
//    person, using their own password-derived key — so two people
//    with two different passwords can each unlock the same shared
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
import { doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import { encryptJSON, decryptJSON } from './encryption';
import { getCurrentFirebaseUser } from './authFirebase';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Every function below that touches Firestore needs to know who's asking —
// this reads the currently signed-in Firebase user's ID and throws a clear
// error if, for some reason, nobody's signed in (shouldn't normally happen,
// since Sign In / Create Profile now require Firebase auth first).
function requireCurrentUid(): string {
  const user = getCurrentFirebaseUser();
  if (!user) {
    throw new Error('You must be signed in to do this.');
  }
  return user.uid;
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

// Encrypts the household key using one person's own password-derived key,
// so it can be safely stored/sent and only that person can unwrap it.
export async function wrapHouseholdKey(
  householdKey: CryptoJS.lib.WordArray,
  personalKey: CryptoJS.lib.WordArray
): Promise<string> {
  return encryptJSON(personalKey, { k: householdKey.toString(CryptoJS.enc.Hex) });
}

// Reverses wrapHouseholdKey — throws if personalKey is wrong (e.g. wrong
// password), same behavior as decryptJSON itself.
export function unwrapHouseholdKey(
  wrapped: string,
  personalKey: CryptoJS.lib.WordArray
): CryptoJS.lib.WordArray {
  const { k } = decryptJSON<{ k: string }>(personalKey, wrapped);
  return CryptoJS.enc.Hex.parse(k);
}

// ---- Firestore: the shared, encrypted household data itself ----

// Used the FIRST time a household is created. Records the creator's Firebase
// uid in a `members` list — this is what the security rules check to decide
// who's allowed to read/write this household's data.
export async function createHouseholdData(householdId: string, encryptedPayload: string): Promise<void> {
  const uid = requireCurrentUid();
  await setDoc(doc(db, 'households', householdId), {
    data: encryptedPayload,
    updatedAt: Date.now(),
    members: [uid],
    owner: uid,
  });
}

// Used every time AFTER creation, to save updated household data (e.g. after
// an edit). Does not touch the `members` list — see addMemberToHousehold
// below for that.
export async function saveHouseholdData(householdId: string, encryptedPayload: string): Promise<void> {
  await setDoc(
    doc(db, 'households', householdId),
    {
      data: encryptedPayload,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

// Adds the CURRENTLY signed-in user to an existing household's members list —
// call this when a second person links into an already-existing household.
// arrayUnion is safe to call even if the uid is already in the list (it
// won't create a duplicate).
export async function addMemberToHousehold(householdId: string): Promise<void> {
  const uid = requireCurrentUid();
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayUnion(uid),
  });
}

// Mirror image of addMemberToHousehold — removes the CURRENTLY signed-in
// user from a household's members list. Call this when a profile unlinks
// itself. The shared household data itself, and any other linked person,
// are left completely untouched — this only removes this one person's
// access to it.
export async function removeMemberFromHousehold(householdId: string): Promise<void> {
  const uid = requireCurrentUid();
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayRemove(uid),
  });
}

// Removes the CURRENTLY signed-in owner and assigns ownership to an existing
// member in the same atomic Firestore update.
export async function leaveHouseholdAndTransferOwnership(
  householdId: string,
  newOwnerUid: string
): Promise<void> {
  const uid = requireCurrentUid();
  await updateDoc(doc(db, 'households', householdId), {
    members: arrayRemove(uid),
    owner: newOwnerUid,
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

// Reads just the owner field off a household document — used client-side
// to decide whether the current user is allowed to invite/remove members.
// Returns null if the household doesn't exist or has no owner field yet
// (defensive default for any pre-A.7.6a household).
export async function getHouseholdOwner(householdId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return typeof data.owner === 'string' ? data.owner : null;
}

export async function getHouseholdMemberCount(householdId: string): Promise<number> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return 0;
  const data = snap.data();
  return Array.isArray(data.members) ? data.members.length : 0;
}

// ---- Firestore: each linked person's own wrapped copy of the household key ----
// Keyed by username so a phone can look up "what household is this username
// linked to, and what's my wrapped key" from any device, using just the
// username + password (no separate device-pairing step needed).

export async function saveWrappedHouseholdKey(
  username: string,
  householdId: string,
  wrappedKey: string
): Promise<void> {
  const uid = requireCurrentUid();
  await setDoc(doc(db, 'householdKeys', username), {
    householdId,
    wrappedKey,
    updatedAt: Date.now(),
    ownerUid: uid,
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
