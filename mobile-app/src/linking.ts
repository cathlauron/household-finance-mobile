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
//      key with the joiner's OWN passphrase-derived key (so they can
//      unlock it with their own passphrase from now on), marks this
//      profile as linked locally, and leaves a note on the same
//      linkCodes/{code} record saying "this code is finished, here's the
//      household id."
//
//   2. HOST'S PHONE: taps "I've shared this code — finish linking."
//      finishHostLink() checks that same record for the joiner's note —
//      if it's not there yet, it just says "not yet, try again after they
//      finish." If it IS there, the host does its own version of step 1:
//      wraps the shared key with ITS OWN passphrase-derived key, and
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
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { generateSalt, deriveKey, encryptJSON, decryptJSON } from './encryption';
import type { HouseholdModel } from './types';
import {
  generateHouseholdId,
  wrapHouseholdKey,
  saveHouseholdData,
  saveWrappedHouseholdKey,
} from './household';
import { updateProfileHouseholdId } from './storage';
import { mergeModels } from './mergeModels';

// Chosen to avoid easy mix-ups when the code is read aloud or typed by hand
// (no 0/O, no 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

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
// person's own passphrase (Checkpoint 9.2c).
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

  await setDoc(doc(db, 'linkCodes', code), {
    codeSalt,
    encryptedSecret,
    encryptedHostData,
    hostUsername: username,
    createdAt: serverTimestamp(),
  });

  return { code, secretHex };
}

// ---- Checkpoint 9.2b-ii: "Join with a code" ----

export type JoinLinkResult = {
  hostUsername: string;
  hostModel: HouseholdModel;
  secretHex: string;
};

// Looks up a code the other phone generated (via startHouseholdLink), uses
// it to unwrap the shared secret, then uses that secret to unlock the other
// phone's uploaded data. Throws a plain Error if the code doesn't exist or
// doesn't decrypt (e.g. mistyped) — the calling screen should catch this
// and show a friendly "check the code and try again" message rather than
// showing the raw error.
export async function joinHouseholdLink(codeInput: string): Promise<JoinLinkResult> {
  const code = codeInput.trim().toUpperCase();
  if (!code) throw new Error('Enter a code.');

  const snap = await getDoc(doc(db, 'linkCodes', code));
  if (!snap.exists()) {
    throw new Error("That code doesn't look right, or it's expired.");
  }

  const data = snap.data() as {
    codeSalt: string;
    encryptedSecret: string;
    encryptedHostData: string;
    hostUsername: string;
  };

  const codeKey = deriveKey(code, data.codeSalt);
  const secretHex = decryptJSON<string>(codeKey, data.encryptedSecret);

  const secretKey = CryptoJS.enc.Hex.parse(secretHex);
  const hostModel = decryptJSON<HouseholdModel>(secretKey, data.encryptedHostData);

  return { hostUsername: data.hostUsername, hostModel, secretHex };
}

// ---- Checkpoint 9.2c: "Finish linking" ----

export type JoinChoice = 'mine' | 'theirs' | 'merge';

export type FinishJoinerResult = {
  householdId: string;
  sharedModel: HouseholdModel;
};

// Runs on the JOINER's phone once they pick mine/theirs/merge. Creates the
// real shared household, saves the chosen data to it, wraps the household
// key with the joiner's own passphrase-derived key, marks this profile as
// linked locally, and leaves a note on the link code record so the host
// phone can find out and finish its own side.
export async function finishJoinerLink(
  code: string,
  choice: JoinChoice,
  myUsername: string,
  myModel: HouseholdModel,
  hostModel: HouseholdModel,
  secretHex: string,
  myPersonalKey: CryptoJS.lib.WordArray
): Promise<FinishJoinerResult> {
  const chosenModel: HouseholdModel =
    choice === 'mine' ? myModel : choice === 'theirs' ? hostModel : mergeModels(myModel, hostModel);

  const householdId = await generateHouseholdId();
  const householdKey = CryptoJS.enc.Hex.parse(secretHex);

  const encryptedHouseholdData = await encryptJSON(householdKey, chosenModel);
  await saveHouseholdData(householdId, encryptedHouseholdData);

  const wrappedForMe = await wrapHouseholdKey(householdKey, myPersonalKey);
  await saveWrappedHouseholdKey(myUsername, householdId, wrappedForMe);
  await updateProfileHouseholdId(myUsername, householdId);

  // Leave a note on the same code record so the host phone can find out
  // this finished, and which household id to use — the host still has to
  // tap its own "finish linking" button, this alone doesn't link them.
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
// passphrase-derived key and marks the host's profile as linked too.
export async function finishHostLink(
  code: string,
  myUsername: string,
  secretHex: string,
  myPersonalKey: CryptoJS.lib.WordArray
): Promise<HostFinishResult> {
  const snap = await getDoc(doc(db, 'linkCodes', code));
  if (!snap.exists()) {
    throw new Error("That code can't be found anymore.");
  }
  const data = snap.data() as { finished?: boolean; householdId?: string };
  if (!data.finished || !data.householdId) {
    return { status: 'notYet' };
  }

  const householdKey = CryptoJS.enc.Hex.parse(secretHex);
  const wrappedForMe = await wrapHouseholdKey(householdKey, myPersonalKey);
  await saveWrappedHouseholdKey(myUsername, data.householdId, wrappedForMe);
  await updateProfileHouseholdId(myUsername, data.householdId);

  return { status: 'done', householdId: data.householdId };
}
