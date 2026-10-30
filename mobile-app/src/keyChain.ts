// K3 (Cath's OK, option A "key chain"; SECURITY-3.2-PLAN.md) and K5 step 4/5.
// When someone who held the household key is no longer a member (removed, or left by
// themselves), the owner's phone makes a new key and re-locks the household with it. The
// new key is stored locked with the previous one (households/{id}/keyChain/{n}), which only
// members can read, so everyone still in the household picks it up and the person who left
// can't. From then on every save names the key it used (dataKv) and the rules refuse saves
// with an older key, so nothing new is ever written with the key the person who left knew.
//
// Also here: which households can be saved in the tamper-checked kind (K5 step 4).

import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import { collection, doc, getDocs, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { encryptJSON, decryptJSON, bytesToHex } from './encryption';
import { walkChain, needsRelock, KEYCHAIN_READER_VERSION } from './keyChainPlan';
import { everyoneReadsParts, ENVELOPE_READER_VERSION } from './partsGate';

export { KEYCHAIN_READER_VERSION };

// A save found the household re-locked with a newer key than the one it used.
export class KeyChangedError extends Error {
  constructor() {
    super('The household has a new key. Picking it up and trying again.');
  }
}

type Ring = { version: number; byVersion: Map<number, CryptoJS.lib.WordArray> };
const rings = new Map<string, Ring>();

function ringFor(householdId: string): Ring {
  let r = rings.get(householdId);
  if (!r) {
    r = { version: 0, byVersion: new Map() };
    rings.set(householdId, r);
  }
  return r;
}

export function rememberKey(householdId: string, key: CryptoJS.lib.WordArray, version: number) {
  const r = ringFor(householdId);
  r.byVersion.set(version, key);
  if (version >= r.version) r.version = version;
}

// Which key version this exact key is, if this phone knows it (-1 = not known).
export function versionOfKey(householdId: string, key: CryptoJS.lib.WordArray): number {
  const r = rings.get(householdId);
  if (!r) return -1;
  for (const [v, k] of r.byVersion) if (k === key || k.toString() === key.toString()) return v;
  return -1;
}

// The keys to try when reading something that may predate a re-lock: newest first.
export function keysToTry(householdId: string, key: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray[] {
  const r = rings.get(householdId);
  if (!r) return [key];
  const older = [...r.byVersion.entries()].sort((a, b) => b[0] - a[0]).map(([, k]) => k);
  return [key, ...older.filter((k) => k !== key)];
}

export function forgetKeys(householdId?: string) {
  if (householdId) rings.delete(householdId);
  else rings.clear();
}

function wrapLink(newKey: CryptoJS.lib.WordArray, withKey: CryptoJS.lib.WordArray): Promise<string> {
  return encryptJSON(withKey, { k: newKey.toString(CryptoJS.enc.Hex) }, { v2: true });
}
export function unwrapLink(wrapped: string, withKey: CryptoJS.lib.WordArray): CryptoJS.lib.WordArray {
  const { k } = decryptJSON<{ k: string }>(withKey, wrapped);
  if (typeof k !== 'string' || !/^[0-9a-f]{64}$/.test(k)) throw new Error('Not a key');
  return CryptoJS.enc.Hex.parse(k);
}

const chainCol = (householdId: string) => collection(db, 'households', householdId, 'keyChain');

// Brings a key up to the household's newest one by walking the chain. Never throws: when
// the chain can't be read (offline), the key comes back as it was and is tried later.
export async function catchUpKey(
  householdId: string,
  key: CryptoJS.lib.WordArray
): Promise<{ key: CryptoJS.lib.WordArray; version: number; changed: boolean }> {
  try {
    const snap = await getDocs(chainCol(householdId));
    const links: { n: number; wrapped: string }[] = [];
    snap.forEach((d) => {
      const n = Number(d.id);
      const w = d.data().wrapped;
      if (Number.isInteger(n) && typeof w === 'string') links.push({ n, wrapped: w });
    });
    const res = walkChain(links, key, unwrapLink);
    const first = res.version - res.older.length;
    res.older.forEach((k, i) => rememberKey(householdId, k, first + i));
    rememberKey(householdId, res.key, res.version);
    return { key: res.key, version: res.version, changed: res.key !== key };
  } catch (e) {
    const known = versionOfKey(householdId, key);
    return { key, version: known < 0 ? 0 : known, changed: false };
  }
}

// K5 step 4: the household is saved in the tamper-checked kind once every member's phone
// reads it (memberVersions, as reported by each phone).
const v2Ok = new Map<string, boolean>();
export function noteHouseholdReaders(householdId: string, members: unknown, memberVersions: unknown) {
  v2Ok.set(householdId, everyoneReadsParts(members, memberVersions, ENVELOPE_READER_VERSION));
}
export function sealOptions(householdId: string | null | undefined): { v2: boolean } {
  return { v2: !!householdId && v2Ok.get(householdId) === true };
}

// Owner only: adds people who joined since the key was made to the list of key holders.
export async function writeKeyMembers(householdId: string, keyMembers: string[]): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { keyMembers });
}

// Owner only: makes the next key and re-locks the household with it, in one step (the new
// chain link, the re-locked data and the new key number go together or not at all).
// Returns the new key, or null when nothing was done (someone else already did it, or the
// household no longer needs it). The parts are rewritten with the new key afterwards by
// the caller (householdPartsSync.rewriteAllPartsNext + afterSave).
export async function relockHousehold(
  householdId: string,
  key: CryptoJS.lib.WordArray,
  myUid: string
): Promise<{ key: CryptoJS.lib.WordArray; version: number; data: string; model: unknown } | null> {
  const from = versionOfKey(householdId, key);
  if (from < 0) return null; // not sure this key is current: catch up first
  const newKey = CryptoJS.enc.Hex.parse(bytesToHex(await Crypto.getRandomBytesAsync(32)));
  const link = await wrapLink(newKey, key);
  const hRef = doc(db, 'households', householdId);
  const out = await runTransaction(db, async (tx) => {
    const snap = await tx.get(hRef);
    if (!snap.exists()) return null;
    const d = snap.data();
    const kv = typeof d.keyVersion === 'number' ? d.keyVersion : 0;
    const members: string[] = Array.isArray(d.members) ? d.members : [];
    if (kv !== from || d.owner !== myUid || !needsRelock(d.keyMembers, members)) return null;
    if (typeof d.data !== 'string') return null;
    // The household must open with the current key; if not, nothing is touched.
    const model = decryptJSON<unknown>(key, d.data);
    const data = await encryptJSON(newKey, model, { v2: everyoneReadsParts(members, d.memberVersions, ENVELOPE_READER_VERSION) });
    const next = kv + 1;
    tx.set(doc(chainCol(householdId), String(next)), { wrapped: link, by: myUid, at: Date.now() });
    tx.update(hRef, { data, updatedAt: Date.now(), keyVersion: next, dataKv: next, dataAt: serverTimestamp(), keyMembers: members });
    return { version: next, data, model };
  });
  if (!out) return null;
  rememberKey(householdId, newKey, out.version);
  return { key: newKey, ...out };
}
