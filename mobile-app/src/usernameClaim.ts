import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentFirebaseUser } from './authFirebase';

// Username claims (security, 2026-10-16).
// usernames/{username} = { uid, createdAt } records which account owns a username. It is
// created once and can never be changed or taken over. Backups, household keys and
// recovery keys are filed under the username, and Firestore only lets an account CREATE
// those records under a username it has claimed, so nobody can grab someone else's
// username first and block their backup. It also makes usernames unique across every
// phone, not just the accounts on one phone.

export type ClaimResult = 'mine' | 'claimed' | 'taken' | 'skipped';

// Claims `username` for the signed-in account if nobody has it yet.
// 'mine' = already ours, 'claimed' = just claimed, 'taken' = belongs to another account,
// 'skipped' = not signed in to Firebase right now (try again later).
export async function claimUsername(username: string): Promise<ClaimResult> {
  const uid = getCurrentFirebaseUser()?.uid;
  if (!uid || !username) return 'skipped';
  const ref = doc(db, 'usernames', username);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data()?.uid === uid ? 'mine' : 'taken';
  await setDoc(ref, { uid, createdAt: serverTimestamp() });
  return 'claimed';
}

// For accounts made before claims existed: claim quietly whenever the app loads.
// Never throws; a failure just means it tries again next time.
export function ensureUsernameClaim(username: string): void {
  claimUsername(username)
    .then((r) => {
      if (r === 'taken') console.warn(`Username "${username}" is claimed by another account.`);
    })
    .catch(() => {});
}

// Version 3 (Cath, 2026-10-19): sign-in checks the typed username belongs to the email
// that just signed in, so a mistyped username says so instead of asking for a recovery
// key. 'other' = another account owns it; 'none' = nobody has claimed it (older
// accounts); 'unknown' = couldn't check (offline): sign-in carries on as before.
export async function usernameOwner(username: string): Promise<'mine' | 'other' | 'none' | 'unknown'> {
  const uid = getCurrentFirebaseUser()?.uid;
  if (!uid || !username) return 'unknown';
  try {
    const snap = await getDoc(doc(db, 'usernames', username));
    if (!snap.exists()) return 'none';
    return snap.data()?.uid === uid ? 'mine' : 'other';
  } catch {
    return 'unknown';
  }
}
