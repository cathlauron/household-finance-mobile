// src/linking.ts
//
// Checkpoint 9.2a — "Start linking": one phone generates a short link code,
// locks a fresh shared secret with that code, and uploads its own current
// household data (locked with that secret) to Firebase — so a second phone
// can later enter the same code and pull it back down.
//
// Checkpoint 9.2b-ii — "Join with a code": the second phone takes that
// code, uses it to unlock the shared secret, and uses THAT secret to
// unlock the first phone's data. The calling screen shows both people's
// data side by side and lets the person choose keep mine / keep theirs /
// merge.
//
// Checkpoint 9.2c (this addition) — "Finish linking": makes that choice
// permanent. There's no live connection between the two phones — just the
// one-time code above — so finishing has two separate steps, one on each
// phone, both explicit button-taps (nothing happens automatically in the
// background):
//
//   1. JOINER'S PHONE: after picking Mine/Theirs/Merge, finishJoinerLink()
//      creates the real shared household in Firestore, wraps the shared
//      key with the joiner's OWN password-derived key (so they can
//      unlock it with their own password from now on), marks this
//      profile as linked locally, and leaves a note on the same
//      linkCodes/{code} record saying "this code is finished, here's the
//      household id."
//
//   2. HOST'S PHONE: taps "I've shared this code — finish linking."
//      finishHostLink() checks that same record for the joiner's note —
//      if it's not there yet, it just says "not yet, try again after they
//      finish." If it IS there, the host does its own version of step 1:
//      wraps the shared key with ITS OWN password-derived key, and
//      marks itself as linked too.
//
// Once both phones have finished, every future save on either phone reads
// and writes the shared household data instead of that phone's own
// personal data.
//
// Known limitation, to revisit before this handles real household data:
// Firestore is currently in "test mode" (wide open for reads/writes).
// Before that window closes we need real security rules, and ideally an
// expiry on unused link codes.

import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { generateSalt, deriveKey, encryptJSON, decryptJSON } from './encryption';
import type { HouseholdModel } from './types';
import {
  generateHouseholdId,
  wrapHouseholdKey,
  createHouseholdData,
  saveHouseholdData,
  saveWrappedHouseholdKey,
  addMemberToHousehold,
} from './household';
import { updateProfileHouseholdId, savePendingHostLink, clearPendingHostLink, loadProfilesIndex } from './storage';
import { saveProfileCloudBackup } from './cloudBackup';
import { mergeModels } from './mergeModels';
import { getCurrentFirebaseUser } from './authFirebase';

// Chosen to avoid easy mix-ups when the code is read aloud or typed by hand
// (no 0/O, no 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

// Keep in sync with firestore.rules: linkCodes/{code} can only be read for 15 minutes.
export const LINK_CODE_TTL_MS = 15 * 60 * 1000;

function randomCode(bytes: Uint8Array): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

async function generateLinkCode(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(CODE_LENGTH);
  return randomCode(bytes);
}

// The real shared household key — generated fresh, once, the first time two
// profiles link. Never stored in plain form; only ever moved around locked
// with the link code (this checkpoint) or wrapped with each linked
// person's own password (Checkpoint 9.2c).
async function generateHouseholdSecretHex(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type StartLinkResult = {
  code: string;
  secretHex: string;
};

// Generates a fresh shared secret + short code, uploads THIS phone's current
// data (locked with that secret) to Firebase under the code, and returns
// both so the calling screen can display the code and hang onto the secret
// for finishing linking later.
export async function startHouseholdLink(
  username: string,
  model: HouseholdModel
): Promise<StartLinkResult> {
  const code = await generateLinkCode();
  const secretHex = await generateHouseholdSecretHex();

  const codeSalt = await generateSalt();
  const codeKey = deriveKey(code, codeSalt);
  const encryptedSecret = await encryptJSON(codeKey, secretHex);

  const secretKey = CryptoJS.enc.Hex.parse(secretHex);
  const encryptedHostData = await encryptJSON(secretKey, model);

  // Host creates the shared household document first, recording the host as owner
  // and ensuring compliance with Firestore security rules (owner == request.auth.uid).
  const householdId = await generateHouseholdId();
  await createHouseholdData(householdId, encryptedHostData);

  await setDoc(doc(db, 'linkCodes', code), {
    codeSalt,
    encryptedSecret,
    encryptedHostData,
    hostUsername: username,
    existingHouseholdId: householdId,
    createdAt: serverTimestamp(),
  });

  // Remember this so "finish linking" can be completed later even if the app closes,
  // the phone restarts, or a different account gets signed into in between.
  await savePendingHostLink(username, code, secretHex);

  return { code, secretHex };
}

export type StartInviteResult = {
  code: string;
  secretHex: string;
};

// Owner-only invite into an EXISTING household — distinct from
// startHouseholdLink, which always creates a brand-new household. This
// reuses the household's own existing shared key (secretHex) rather than
// generating a new one, since the joiner needs to end up wrapping the
// SAME household key everyone else already has, not a different one.
export async function startHouseholdInvite(
  householdId: string,
  householdKey: CryptoJS.lib.WordArray,
  householdModel: HouseholdModel,
  hostUsername: string
): Promise<StartInviteResult> {
  const code = await generateLinkCode();
  const secretHex = householdKey.toString(CryptoJS.enc.Hex);
  const codeSalt = await generateSalt();
  const codeKey = deriveKey(code, codeSalt);
  const encryptedSecret = await encryptJSON(codeKey, secretHex);
  const encryptedHostData = await encryptJSON(householdKey, householdModel);

  await setDoc(doc(db, 'linkCodes', code), {
    codeSalt,
    encryptedSecret,
    encryptedHostData,
    hostUsername,
    existingHouseholdId: householdId,
    isInvite: true,
    createdAt: serverTimestamp(),
  });

  return { code, secretHex };
}

// ---- Checkpoint 9.2b-ii: "Join with a code" ----

export type JoinLinkResult = {
  hostUsername: string;
  hostModel: HouseholdModel;
  secretHex: string;
  existingHouseholdId?: string;
  isInvite?: boolean;
};

// Looks up a code the other phone generated (via startHouseholdLink), uses
// it to unwrap the shared secret, then uses that secret to unlock the other
// phone's uploaded data. Throws a plain Error if the code doesn't exist or
// doesn't decrypt (e.g. mistyped) — the calling screen should catch this
// and show a friendly "check the code and try again" message rather than
// showing the raw error.
export async function joinHouseholdLink(codeInput: string, myUsername: string): Promise<JoinLinkResult> {
  const code = codeInput.trim().toUpperCase();
  if (!code) throw new Error('Enter a code.');

  // A code only stays readable for a short window after it's created (see
  // firestore.rules) — past that, Firestore denies the read outright, which
  // surfaces here as a thrown error rather than a "document not found."
  let snap;
  try {
    snap = await getDoc(doc(db, 'linkCodes', code));
  } catch (e) {
    throw new Error("That code doesn't look right, or it's expired.");
  }
  if (!snap.exists()) {
    throw new Error("That code doesn't look right, or it's expired.");
  }

  const data = snap.data() as {
    codeSalt: string;
    encryptedSecret: string;
    encryptedHostData: string;
    hostUsername: string;
    existingHouseholdId?: string;
    isInvite?: boolean;
  };

  const codeKey = deriveKey(code, data.codeSalt);
  const secretHex = decryptJSON<string>(codeKey, data.encryptedSecret);

  const secretKey = CryptoJS.enc.Hex.parse(secretHex);
  const hostModel = decryptJSON<HouseholdModel>(secretKey, data.encryptedHostData);

  // Checkpoint 9.2d — record who just unlocked the host's data, right away rather than
  // only at finish time, so the host's phone can show "X wants to link" and require an
  // explicit confirm before anything is finalized.
  await setDoc(doc(db, 'linkCodes', code), { joinerUsername: myUsername }, { merge: true });

  return {
    hostUsername: data.hostUsername,
    hostModel,
    secretHex,
    existingHouseholdId: data.existingHouseholdId,
    isInvite: Boolean(data.isInvite),
  };
}

// ---- Checkpoint 9.2d: "Confirm joiner identity" ----
// Lets the HOST's phone peek at who has entered the code so far, without finishing
// or changing anything. Purely a read — the host still has to tap a separate
// "confirm" button (handled entirely in the screen) before finishHostLink() runs.
export type LinkCodeJoinerStatus =
  | { status: 'noJoinerYet' }
  | { status: 'joinerWaiting'; joinerUsername: string }
  | { status: 'notFound' };

export async function checkLinkCodeJoiner(code: string): Promise<LinkCodeJoinerStatus> {
  let snap;
  try {
    snap = await getDoc(doc(db, 'linkCodes', code));
  } catch (e) {
    return { status: 'notFound' };
  }
  if (!snap.exists()) return { status: 'notFound' };
  const data = snap.data() as { joinerUsername?: string };
  if (data.joinerUsername) {
    return { status: 'joinerWaiting', joinerUsername: data.joinerUsername };
  }
  return { status: 'noJoinerYet' };
}

// ---- Checkpoint 9.2c: "Finish linking" ----

export type JoinChoice = 'mine' | 'theirs' | 'merge';

export type FinishJoinerResult = {
  householdId: string;
  sharedModel: HouseholdModel;
};

// Runs on the JOINER's phone once they pick mine/theirs/merge. Creates the
// real shared household, saves the chosen data to it, wraps the household
// key with the joiner's own password-derived key, marks this profile as
// linked locally, and leaves a note on the link code record so the host
// phone can find out and finish its own side.
export async function finishJoinerLink(
  code: string,
  choice: JoinChoice,
  myUsername: string,
  myModel: HouseholdModel,
  hostModel: HouseholdModel,
  secretHex: string,
  myPersonalKey: CryptoJS.lib.WordArray,
  existingHouseholdId?: string
): Promise<FinishJoinerResult> {
  const chosenModel: HouseholdModel =
    choice === 'mine' ? myModel : choice === 'theirs' ? hostModel : mergeModels(myModel, hostModel);
  const householdKey = CryptoJS.enc.Hex.parse(secretHex);

  let householdId: string;
  if (existingHouseholdId) {
    householdId = existingHouseholdId;
    const encryptedHouseholdData = await encryptJSON(householdKey, chosenModel);
    // The joiner must be a member before they can write the household data.
    try {
      await addMemberToHousehold(householdId);
    } catch (e) {
      const code = (e as any)?.code;
      const msg = (e as Error)?.message || '';
      if (code === 'permission-denied' || /permission|denied/i.test(msg)) {
        throw new Error('This household is full (5 of 5) or the invite is no longer valid.');
      }
      throw e;
    }
    await saveHouseholdData(householdId, encryptedHouseholdData);
  } else {
    householdId = await generateHouseholdId();
    const encryptedHouseholdData = await encryptJSON(householdKey, chosenModel);
    await createHouseholdData(householdId, encryptedHouseholdData);
  }

  const wrappedForMe = await wrapHouseholdKey(householdKey, myPersonalKey);
  await saveWrappedHouseholdKey(myUsername, householdId, wrappedForMe);
  await updateProfileHouseholdId(myUsername, householdId);

  // Sync cloud backup so new-device sign-in immediately detects the householdId
  try {
    const profiles = await loadProfilesIndex();
    const mySalt = profiles.find((p) => p.username === myUsername)?.salt;
    if (mySalt) {
      saveProfileCloudBackup(myUsername, { salt: mySalt, householdId }).catch(() => {});
    }
  } catch (e) {}

  await setDoc(
    doc(db, 'linkCodes', code),
    { finished: true, householdId },
    { merge: true }
  );

  return { householdId, sharedModel: chosenModel };
}

export type HostFinishResult =
  | { status: 'notYet' }
  | { status: 'done'; householdId: string };

// Runs on the HOST's phone (the one that generated the code) after the
// person taps "finish linking." Checks whether the joiner has finished
// their side yet; if so, wraps the household key with the host's own
// password-derived key and marks the host's profile as linked too.
export async function finishHostLink(
  code: string,
  myUsername: string,
  secretHex: string,
  myPersonalKey: CryptoJS.lib.WordArray,
  expectedUid: string
): Promise<HostFinishResult> {
  const currentUser = getCurrentFirebaseUser();
  if (!currentUser || currentUser.uid !== expectedUid) {
    throw new Error('The signed-in account changed while linking was in progress.');
  }
  let snap;
  try {
    snap = await getDoc(doc(db, 'linkCodes', code));
  } catch (e) {
    throw new Error("That code can't be found anymore.");
  }
  if (!snap.exists()) {
    throw new Error("That code can't be found anymore.");
  }
  const data = snap.data() as { finished?: boolean; householdId?: string };
  if (!data.finished || !data.householdId) {
    return { status: 'notYet' };
  }
  const householdKey = CryptoJS.enc.Hex.parse(secretHex);

  // The host is joining an EXISTING household (the joiner created it) —
  // this is the step that records the host as an authorized member too,
  // so the new security rules will let this phone read/write it.
  try {
    const currentUser = getCurrentFirebaseUser();
    if (!currentUser || currentUser.uid !== expectedUid) {
      throw new Error('The signed-in account changed while linking was in progress.');
    }
    await addMemberToHousehold(data.householdId);
  } catch (e) {
    throw new Error('STEP addMemberToHousehold failed: ' + (e as Error).message);
  }

  const wrappedForMe = await wrapHouseholdKey(householdKey, myPersonalKey);
  try {
    const currentUser = getCurrentFirebaseUser();
    if (!currentUser || currentUser.uid !== expectedUid) {
      throw new Error('The signed-in account changed while linking was in progress.');
    }
    await saveWrappedHouseholdKey(myUsername, data.householdId, wrappedForMe);
  } catch (e) {
    throw new Error('STEP saveWrappedHouseholdKey failed: ' + (e as Error).message);
  }
  await updateProfileHouseholdId(myUsername, data.householdId);
  await clearPendingHostLink(myUsername);

  // Sync cloud backup so new-device sign-in immediately detects the householdId
  try {
    const profiles = await loadProfilesIndex();
    const mySalt = profiles.find((p) => p.username === myUsername)?.salt;
    if (mySalt) {
      saveProfileCloudBackup(myUsername, { salt: mySalt, householdId: data.householdId }).catch(() => {});
    }
  } catch (e) {}

  // The code has now finished its one job (linking these two phones) —
  // delete it outright so it can't be read or reused again, rather than
  // leaving it sitting in Firestore as a still-working decryption key.
  try {
    await deleteDoc(doc(db, 'linkCodes', code));
  } catch (e) {
    // Not fatal — this phone is already fully linked either way, and the
    // code becomes unreadable on its own once its 15-minute window passes.
  }

  return { status: 'done', householdId: data.householdId };
}

// ---- Checkpoint A.6: real-time linking — host listens instead of polling ----
// Watches the linkCodes/{code} document live. The moment the joiner picks
// mine/theirs/merge (finishJoinerLink writes finished:true + householdId onto
// this same doc), the callback fires automatically — no "check for joiner" /
// "confirm" button-taps needed on the host's side anymore. Returns an
// unsubscribe function; the calling screen must call it once linking is done
// (or if the screen unmounts) so the listener doesn't run forever.
export function subscribeToLinkCode(
  code: string,
  onFinished: (householdId: string) => void,
  onExpired?: () => void
): () => void {
  const unsubscribe = onSnapshot(
    doc(db, 'linkCodes', code),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { finished?: boolean; householdId?: string };
      if (data.finished && data.householdId) {
        onFinished(data.householdId);
      }
    },
    (error) => {
      const message = String((error as Error)?.message || '');
      const isExpectedExpiry = /permission|denied|missing or insufficient permissions/i.test(message);
      if (isExpectedExpiry) {
        onExpired?.();
        return;
      }
      console.error('subscribeToLinkCode listener error:', error);
    }
  );
  return unsubscribe;
}