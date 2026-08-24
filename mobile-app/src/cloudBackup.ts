// ============================================================
// Household Finance App — Personal cloud backup (Checkpoint 9.2b-i)
// ============================================================
// Every profile now keeps an encrypted backup of its own data in
// Firestore, keyed by username — in addition to the copy already saved
// locally on the phone (see storage.ts's saveEncryptedProfileData).
//
// Why this exists: linking two profiles (Checkpoint 9.2b-ii) needs to be
// able to look at BOTH people's existing data to offer a real "keep mine /
// keep theirs / merge" choice. Since a not-yet-linked profile's data has
// only ever lived on that one phone, there's nothing for the other phone
// to look at yet. This file gives every profile a safe, encrypted copy in
// the cloud so that comparison becomes possible later — and as a nice
// side effect, it also acts as a real backup if a phone is lost.
//
// Nothing here is new encryption — it saves/loads the exact same
// encrypted string already produced by encryptJSON (encryption.ts) and
// already saved locally. Firestore never sees anything unencrypted here,
// same as everywhere else in this app.
// ============================================================

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Saves this profile's already-encrypted data to the cloud, keyed by
// username. Safe to call often — it just overwrites the previous backup.
export async function saveProfileCloudBackup(username: string, encryptedPayload: string): Promise<void> {
  await setDoc(doc(db, 'profileBackups', username), {
    data: encryptedPayload,
    updatedAt: Date.now(),
  });
}

// Returns the raw encrypted string for a profile's cloud backup, or null
// if nothing's been backed up yet (e.g. this profile was created before
// this checkpoint, and hasn't saved since). Callers decrypt it themselves
// with decryptJSON, same as the local copy.
export async function loadProfileCloudBackup(username: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'profileBackups', username));
  if (!snap.exists()) return null;
  const data = snap.data();
  return typeof data.data === 'string' ? data.data : null;
}
