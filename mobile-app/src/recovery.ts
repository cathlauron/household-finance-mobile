// ============================================================
// Household Finance App — Account Recovery Module
// ============================================================
// Supports:
// 1. Feature A (Recovery Key): Offline 16-character code used to
//    unwrap the data/household encryption key if a user resets
//    their Firebase Auth password and it diverges from their
//    encryption passphrase.
// 2. Feature B (Household Peer Recovery): Real-time peer recovery
//    for linked household members, where another logged-in
//    member approves recovery and hands over the household key
//    encrypted with a one-time ephemeral transfer code.
// ============================================================

import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { getCurrentFirebaseUser } from './authFirebase';
import { generateSalt, deriveKey, encryptJSON, decryptJSON } from './encryption';

const RECOVERY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const RECOVERY_LENGTH = 16;
const TRANSFER_CODE_LENGTH = 6;

function requireCurrentUid(): string {
  const user = getCurrentFirebaseUser();
  if (!user) {
    throw new Error('You must be signed in to perform this action.');
  }
  return user.uid;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Generates a 16-character high-entropy alphanumeric recovery code formatted as XXXX-XXXX-XXXX-XXXX
export async function generateRecoveryCode(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(RECOVERY_LENGTH);
  let raw = '';
  for (let i = 0; i < RECOVERY_LENGTH; i++) {
    raw += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

// Strips hyphens, whitespace, and normalizes to uppercase
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[-\s]/g, '').trim().toUpperCase();
}

// Validates whether a formatted or raw string matches recovery code shape
export function isValidRecoveryCodeFormat(code: string): boolean {
  const norm = normalizeRecoveryCode(code);
  return norm.length === RECOVERY_LENGTH && /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/.test(norm);
}

// Generates a 6-digit numeric transfer code for peer recovery (e.g. "492015")
export async function generatePeerTransferCode(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(TRANSFER_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < TRANSFER_CODE_LENGTH; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

// Generic key wrapping (AES-256 JSON encapsulation)
export async function wrapKey(
  keyToWrap: CryptoJS.lib.WordArray,
  wrappingKey: CryptoJS.lib.WordArray
): Promise<string> {
  return encryptJSON(wrappingKey, { k: keyToWrap.toString(CryptoJS.enc.Hex) });
}

// Generic key unwrapping
export function unwrapKey(
  wrappedPayload: string,
  wrappingKey: CryptoJS.lib.WordArray
): CryptoJS.lib.WordArray {
  const payload = decryptJSON<{ k: string }>(wrappingKey, wrappedPayload);
  if (!payload || typeof payload.k !== 'string') {
    throw new Error('Invalid wrapped key payload');
  }
  return CryptoJS.enc.Hex.parse(payload.k);
}

// ---- Feature A: Recovery Key Storage (recoveryKeys/{username}) ----

export type RecoveryKeyDoc = {
  ownerUid: string;
  recoverySalt: string;
  wrappedKey: string;
  isHouseholdKey: boolean;
  updatedAt: number;
};

// Derives an encryption key from the recovery code
export function deriveRecoveryKey(recoveryCode: string, saltHex: string): CryptoJS.lib.WordArray {
  const normalized = normalizeRecoveryCode(recoveryCode);
  return deriveKey(normalized, saltHex);
}

// Saves a wrapped copy of the user's master key under their recovery code
export async function saveRecoveryKey(
  username: string,
  keyToWrap: CryptoJS.lib.WordArray,
  isHouseholdKey: boolean,
  recoveryCode: string
): Promise<void> {
  const uid = requireCurrentUid();
  const recoverySalt = await generateSalt();
  const wrappingKey = deriveRecoveryKey(recoveryCode, recoverySalt);
  const wrappedKey = await wrapKey(keyToWrap, wrappingKey);

  await setDoc(doc(db, 'recoveryKeys', username), {
    ownerUid: uid,
    recoverySalt,
    wrappedKey,
    isHouseholdKey,
    updatedAt: Date.now(),
  });
}

// Checks if a recovery key has been saved for this username
export async function hasRecoveryKeySetUp(username: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'recoveryKeys', username));
    return snap.exists();
  } catch (e) {
    return false;
  }
}

// Deletes a stored recovery key document (e.g. when an unlinked password change invalidates it)
export async function deleteRecoveryKey(username: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'recoveryKeys', username));
  } catch (e) {}
}

// Loads and un-wraps the master key using the typed recovery code
export async function recoverKeyWithCode(
  username: string,
  recoveryCode: string
): Promise<{ key: CryptoJS.lib.WordArray; isHouseholdKey: boolean }> {
  const snap = await getDoc(doc(db, 'recoveryKeys', username));
  if (!snap.exists()) {
    throw new Error('No recovery key found for this account.');
  }
  const data = snap.data() as RecoveryKeyDoc;
  const wrappingKey = deriveRecoveryKey(recoveryCode, data.recoverySalt);
  try {
    const key = unwrapKey(data.wrappedKey, wrappingKey);
    return { key, isHouseholdKey: Boolean(data.isHouseholdKey) };
  } catch (e) {
    throw new Error('Invalid recovery key. Please check the characters and try again.');
  }
}

// ---- Feature B: Household Peer Recovery (householdRecovery/{requestId}) ----

export type PeerRecoveryRequestDoc = {
  householdId: string;
  requesterUid: string;
  requesterUsername: string;
  transferSalt: string;
  status: 'pending' | 'approved' | 'cancelled';
  encryptedHouseholdKey?: string;
  approverUid?: string;
  createdAt: number;
  expiresAt: number;
  approvedAt?: number;
};

// Helper to generate a unique random ID for recovery requests
async function generateRequestId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(12);
  return bytesToHex(bytes);
}

// Initiates a peer recovery request:
// 1. Creates householdRecovery/{requestId} with transferSalt and status: 'pending'.
// 2. Writes pendingRecoveryRequestId onto households/{householdId} so other members discover it.
export async function createPeerRecoveryRequest(
  householdId: string,
  requesterUsername: string,
  transferCode: string
): Promise<{ requestId: string; transferKey: CryptoJS.lib.WordArray }> {
  const uid = requireCurrentUid();
  const requestId = await generateRequestId();
  const transferSalt = await generateSalt();
  const transferKey = deriveKey(transferCode, transferSalt);

  const requestDoc: PeerRecoveryRequestDoc = {
    householdId,
    requesterUid: uid,
    requesterUsername,
    transferSalt,
    status: 'pending',
    createdAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15-minute expiration
  };

  // Write the recovery request doc
  await setDoc(doc(db, 'householdRecovery', requestId), requestDoc);

  // Update the household doc with the active pending request ID so linked members see it
  try {
    await updateDoc(doc(db, 'households', householdId), {
      pendingRecoveryRequestId: requestId,
    });
  } catch (e) {
    // Cleanup if household doc update fails
    await deleteDoc(doc(db, 'householdRecovery', requestId)).catch(() => {});
    throw e;
  }

  return { requestId, transferKey };
}

// Cancels an active peer recovery request and clears the household's pendingRecoveryRequestId
export async function cancelPeerRecoveryRequest(
  householdId: string,
  requestId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'households', householdId), {
      pendingRecoveryRequestId: null,
    });
  } catch (e) {}

  try {
    await deleteDoc(doc(db, 'householdRecovery', requestId));
  } catch (e) {}
}

// Deletes a peer recovery request document (e.g. after successful transfer or cancellation)
export async function deletePeerRecoveryRequest(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'householdRecovery', requestId));
  } catch (e) {}
}

// Requester listens live for the approver to attach the encrypted household key
export function subscribeToPeerRecoveryRequest(
  requestId: string,
  onApproved: (encryptedHouseholdKey: string) => void,
  onCancelledOrExpired: () => void
): () => void {
  return onSnapshot(
    doc(db, 'householdRecovery', requestId),
    (snap) => {
      if (!snap.exists()) {
        onCancelledOrExpired();
        return;
      }
      const data = snap.data() as PeerRecoveryRequestDoc;
      if (data.status === 'cancelled') {
        onCancelledOrExpired();
        return;
      }
      if (data.status === 'approved' && data.encryptedHouseholdKey) {
        onApproved(data.encryptedHouseholdKey);
      }
    },
    () => {
      onCancelledOrExpired();
    }
  );
}

// Fetches a single peer recovery request doc by ID
export async function getPeerRecoveryRequest(
  requestId: string
): Promise<PeerRecoveryRequestDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'householdRecovery', requestId));
    if (!snap.exists()) return null;
    return snap.data() as PeerRecoveryRequestDoc;
  } catch (e) {
    return null;
  }
}

// Approver (a logged-in household member) verifies the 6-digit transfer code and approves:
// 1. Derives transferKey = deriveKey(transferCode, transferSalt)
// 2. Encrypts householdKey with transferKey
// 3. Updates householdRecovery/{requestId} to 'approved'
// 4. Clears pendingRecoveryRequestId on the household doc
export async function approvePeerRecoveryRequest(
  householdId: string,
  requestId: string,
  transferCode: string,
  householdKey: CryptoJS.lib.WordArray
): Promise<void> {
  const uid = requireCurrentUid();
  const snap = await getDoc(doc(db, 'householdRecovery', requestId));
  if (!snap.exists()) {
    throw new Error('This recovery request is no longer active.');
  }
  const data = snap.data() as PeerRecoveryRequestDoc;
  if (data.status !== 'pending') {
    throw new Error('This request has already been processed or cancelled.');
  }

  const transferKey = deriveKey(transferCode.trim(), data.transferSalt);
  const encryptedHouseholdKey = await encryptJSON(
    transferKey,
    householdKey.toString(CryptoJS.enc.Hex)
  );

  await updateDoc(doc(db, 'householdRecovery', requestId), {
    status: 'approved',
    encryptedHouseholdKey,
    approverUid: uid,
    approvedAt: Date.now(),
  });

  // Clear the active pending request on the household doc
  try {
    await updateDoc(doc(db, 'households', householdId), {
      pendingRecoveryRequestId: null,
    });
  } catch (e) {}
}

// Requester un-encrypts the received household key payload using their in-memory transferKey
export function decryptTransferredHouseholdKey(
  encryptedHouseholdKey: string,
  transferKey: CryptoJS.lib.WordArray
): CryptoJS.lib.WordArray {
  const hex = decryptJSON<string>(transferKey, encryptedHouseholdKey);
  if (!hex || typeof hex !== 'string') {
    throw new Error('Failed to decrypt the transferred household key.');
  }
  return CryptoJS.enc.Hex.parse(hex);
}
