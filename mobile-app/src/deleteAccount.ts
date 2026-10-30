// Delete account inside the app (mockup DA1, Cath 2026-10-30). Apple and Google both ask
// apps with sign-up to offer this. Her answers:
//   - what a person added to a shared household STAYS for the others;
//   - an owner who leaves others behind CHOOSES who takes over;
//   - the username becomes free for someone else;
//   - a household with only this person in it is deleted with its data.
// Order: prove it's you (password) -> household -> every online record of yours -> the
// sign-in itself -> this phone's copies. Online steps first, while still signed in (the
// rules only let you delete your own records while signed in as you).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  getHouseholdMembers,
  leaveHouseholdAndTransferOwnership,
  removeMemberFromHousehold,
  deleteHousehold,
  deleteWrappedHouseholdKey,
} from './household';
import { removePartsBeforeDissolve } from './householdPartsSync';
import { deleteRecoveryKey } from './recovery';
import { loadProfilesIndex, saveProfilesIndex, saveCachedHouseholdKey, saveHouseholdPendingBase, setBackupPending, clearPendingHostLink } from './storage';

export type DeletePlan =
  | { kind: 'alone' } // not linked, or the only member left: everything goes
  | { kind: 'member'; others: string[] } // leave; what you added stays
  | { kind: 'owner'; others: { uid: string; username: string }[] }; // leave + hand over

// What deleting will do to the household, for the page to explain it.
export async function planDelete(householdId: string | undefined, myUid: string): Promise<DeletePlan> {
  if (!householdId) return { kind: 'alone' };
  const members = await getHouseholdMembers(householdId);
  const others = members.filter((m) => m.uid !== myUid);
  if (others.length === 0) return { kind: 'alone' };
  const me = members.find((m) => m.uid === myUid);
  if (me?.isOwner) return { kind: 'owner', others: others.map((m) => ({ uid: m.uid, username: m.username })) };
  return { kind: 'member', others: others.map((m) => m.username) };
}

export class WrongPasswordError extends Error {}

export async function deleteMyAccount(opts: {
  username: string;
  email: string;
  password: string;
  householdId?: string;
  successorUid?: string; // owner leaving others behind: who takes over
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again, then try once more.');
  // 1. Prove it's you (Firebase also needs a fresh sign-in before deleting).
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(opts.email, opts.password));
  } catch (e: any) {
    const code = String(e?.code || '');
    if (/wrong-password|invalid-credential|invalid-login|user-mismatch/.test(code)) throw new WrongPasswordError("That password isn't right.");
    throw e;
  }
  const uid = user.uid;

  // 2. The household.
  const plan = await planDelete(opts.householdId, uid);
  if (opts.householdId) {
    if (plan.kind === 'alone') {
      await removePartsBeforeDissolve(opts.username, opts.householdId);
      await deleteHousehold(opts.householdId);
    } else if (plan.kind === 'owner') {
      const successor = opts.successorUid ?? (plan.others.length === 1 ? plan.others[0].uid : undefined);
      if (!successor || !plan.others.some((o) => o.uid === successor)) throw new Error('Choose who takes over the household first.');
      await leaveHouseholdAndTransferOwnership(opts.householdId, successor);
    } else {
      await removeMemberFromHousehold(opts.householdId);
    }
  }

  // 3. Every online record of yours (each one only you may delete).
  await deleteWrappedHouseholdKey(opts.username).catch(() => {});
  await deleteRecoveryKey(opts.username).catch(() => {});
  await deleteDoc(doc(db, 'profileBackups', opts.username)).catch(() => {});
  try {
    const devices = await getDocs(collection(db, 'sessions', uid, 'devices'));
    await Promise.all(devices.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
  } catch (e) {}
  // The username goes last of these: it frees the name for someone else.
  await deleteDoc(doc(db, 'usernames', opts.username)).catch(() => {});

  // 4. The sign-in itself.
  await deleteUser(user);

  // 5. This phone's copies.
  await forgetOnThisPhone(opts.username);
}

export async function forgetOnThisPhone(username: string): Promise<void> {
  const profiles = await loadProfilesIndex().catch(() => []);
  await saveProfilesIndex(profiles.filter((p) => p.username !== username)).catch(() => {});
  await AsyncStorage.removeItem(`profile:${username}:app-data`).catch(() => {});
  await saveCachedHouseholdKey(username, null).catch(() => {});
  await saveHouseholdPendingBase(username, null).catch(() => {});
  await setBackupPending(username, false).catch(() => {});
  await clearPendingHostLink(username).catch(() => {});
}
