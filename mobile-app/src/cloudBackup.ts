// ============================================================
// Household Finance App — Personal cloud backup (Checkpoint 9.2b-i)
// ============================================================
// Every profile now keeps an encrypted backup of its own data in
// Firestore, keyed by username — in addition to the copy already saved
// locally on the phone (see storage.ts's saveEncryptedProfileData).
//
// Checkpoint A.5: this backup now also carries the two pieces of
// information a brand-new device needs to set itself up from scratch —
// the profile's salt (needed to turn a password back into the right
// encryption key) and, if this profile is linked to a shared household,
// which household that is. `data` (the encrypted personal model) is only
// meaningful for an UNLINKED profile — a linked profile's real data lives
// in the shared household document instead, keyed by householdId, which
// is what a new device looks up once it knows the householdId from here.
//
// Nothing here is new encryption — it saves/loads the exact same
// encrypted string already produced by encryptJSON (encryption.ts) and
// already saved locally. Firestore never sees anything unencrypted here,
// same as everywhere else in this app.
// ============================================================

import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentFirebaseUser } from './authFirebase';

export type ProfileCloudBackup = {
  salt: string;
  householdId?: string;
  data?: string;
  updatedAt: number;
  ownerUid?: string;
};

// Saves/refreshes this profile's cloud backup. `householdId` is written every time —
// passing it as undefined actively CLEARS any previously-saved household id (rather than
// leaving a stale one behind), so this always reflects this profile's true current
// linked/unlinked state as of whenever it was last called. `data` is only written when
// provided, since it's meaningless (and not kept up to date) while a profile is linked.
// Records ownerUid so Firestore rules can enforce that only the owner can update it.
export async function saveProfileCloudBackup(
  username: string,
  payload: { salt: string; householdId?: string; data?: string; ownerUid?: string }
): Promise<void> {
  const uid = payload.ownerUid || getCurrentFirebaseUser()?.uid;
  const docData: Record<string, unknown> = {
    salt: payload.salt,
    householdId: payload.householdId ? payload.householdId : deleteField(),
    updatedAt: Date.now(),
  };
  if (uid) {
    docData.ownerUid = uid;
  }
  if (payload.data) docData.data = payload.data;
  await setDoc(doc(db, 'profileBackups', username), docData, { merge: true });
}

// Returns this profile's cloud backup (salt + householdId + personal data, whichever of
// those are actually saved), or null if nothing's been backed up yet — e.g. this profile
// was created before Checkpoint 9.2b-i and has never saved since, OR it saved before
// Checkpoint A.5 added the `salt` field and hasn't saved again since (in which case this
// still returns null until it saves once more from a device that already has local data).
// Callers decrypt `data` themselves with decryptJSON, same as the local copy.
export async function loadProfileCloudBackup(username: string): Promise<ProfileCloudBackup | null> {
  const snap = await getDoc(doc(db, 'profileBackups', username));
  if (!snap.exists()) return null;
  const d = snap.data();
  if (typeof d.salt !== 'string') return null;
  return {
    salt: d.salt,
    householdId: typeof d.householdId === 'string' ? d.householdId : undefined,
    data: typeof d.data === 'string' ? d.data : undefined,
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : 0,
    ownerUid: typeof d.ownerUid === 'string' ? d.ownerUid : undefined,
  };
}
