// src/linking.ts
//
// Checkpoint 9.2a — "Start linking": one phone generates a short link code,
// locks a fresh shared secret with that code, and uploads its own current
// household data (locked with that secret) to Firebase — so a second phone
// can later enter the same code and pull it back down.
//
// Checkpoint 9.2b-ii (this addition) — "Join with a code": the second phone
// takes that code, uses it to unlock the shared secret, and uses THAT secret
// to unlock the first phone's data. Nothing is made permanent yet — the
// calling screen shows both people's data side by side and lets the person
// choose keep mine / keep theirs / merge, but actually creating the shared
// household record is a later checkpoint.
//
// Nothing here ever travels in a readable form:
//  - The link code (e.g. "7F3K9Q") only ever locks/unlocks the shared
//    secret below. It's meant to be told to the other person directly
//    (text, call, in person) — it isn't stored anywhere on its own.
//  - The shared secret is the REAL encryption key the two phones will use
//    for their shared household data going forward.
//  - Household data itself is always locked before it ever leaves the phone.
//
// Known limitation, to revisit before this handles real household data:
// Firestore is currently in "test mode" (wide open for reads/writes for
// 30 days from setup in Checkpoint 9.1a). Before that window closes we
// need real security rules, and ideally an expiry on unused link codes.

import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { generateSalt, deriveKey, encryptJSON, decryptJSON } from './encryption';
import type { HouseholdModel } from './types';

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
// with the link code (this checkpoint) or, in a later checkpoint, wrapped
// with each linked person's own passphrase.
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
// for the next checkpoint.
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
