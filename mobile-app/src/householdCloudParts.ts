// Version 2.1, storage step 2 (Option B): the household saved online in parts.
//
// Firestore allows at most 1 MiB per document, and the whole household used to live in ONE
// encrypted string (households/{id}.data). This file saves it as several smaller encrypted
// documents instead (see householdParts.ts for how the household is split):
//
//   households/{id}/parts/{partId} -> { data: <encrypted part>, updatedAt, updatedBy }
//
// Every part is encrypted on the phone with the same household key as before, so Firestore
// still never sees anything readable.
//
// NOT USED BY THE APP YET. Step 3 switches saving/loading over, with a safe migration:
// copy into parts, read back, check every part matches, and only then mark the household
// as stored in parts (households/{id}.layout = 1). The old single `data` copy keeps being
// written while it fits, until every member's phone reports 2.1 or newer (memberVersions).
// These calls also need the new Firestore rules (firestore.rules, "parts") published first.

import CryptoJS from 'crypto-js';
import { collection, deleteField, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { encryptJSON, decryptJSON } from './encryption';
import { requireCurrentUid } from './authFirebase';
import { keysToTry, sealOptions, versionOfKey } from './keyChain';
import { CORE_PART, HouseholdParts, PARTS_LAYOUT_VERSION, partTexts, changedParts, joinParts, splitModel } from './householdParts';
import { planBatches, PART_LIMIT_CHARS } from './householdPartsPlan';
import type { HouseholdModel } from './types';

export { PART_LIMIT_CHARS };

function partsCol(householdId: string) {
  return collection(db, 'households', householdId, 'parts');
}

// One part is bigger than Firestore allows (e.g. a single month with a huge number of
// entries). The save stops before writing anything, so nothing online is half-changed.
export class PartTooBigError extends Error {
  partId: string;
  constructor(partId: string) {
    super(`The part "${partId}" is too big to save online.`);
    this.partId = partId;
  }
}

// Saves the parts that changed since `previousTexts` (what was saved last time, from
// partTexts) and deletes parts that no longer exist. Returns the texts to remember for
// next time. Everything except the core part is written first, the core part last, so by
// the time another phone sees the new core, the parts it points at are already there.
export async function saveParts(
  householdId: string,
  key: CryptoJS.lib.WordArray,
  parts: HouseholdParts,
  previousTexts: Record<string, string> = {}
): Promise<Record<string, string>> {
  const uid = requireCurrentUid();
  const texts = partTexts(parts);
  const { write, remove } = changedParts(previousTexts, texts);

  // Encrypt everything first and check sizes before touching Firestore.
  const encrypted: { id: string; data: string }[] = [];
  for (const id of write) {
    const data = await encryptJSON(key, parts[id], sealOptions(householdId));
    if (data.length > PART_LIMIT_CHARS) throw new PartTooBigError(id);
    encrypted.push({ id, data });
  }

  const now = Date.now();
  const kv = Math.max(0, versionOfKey(householdId, key));
  const others = encrypted.filter((e) => e.id !== CORE_PART);
  const core = encrypted.filter((e) => e.id === CORE_PART);
  for (const group of [others, core]) {
    for (const batchItems of planBatches(group.map((e) => ({ id: e.id, size: e.data.length })))) {
      const batch = writeBatch(db);
      for (const item of batchItems) {
        const e = group.find((g) => g.id === item.id)!;
        // K3: after a re-lock each part names its key number (the rules check it).
        batch.set(doc(partsCol(householdId), e.id), kv > 0 ? { data: e.data, updatedAt: now, updatedBy: uid, kv } : { data: e.data, updatedAt: now, updatedBy: uid });
      }
      await batch.commit();
    }
  }
  // Removals last (a month that was emptied, a receipt that was removed).
  for (const batchItems of planBatches(remove.map((id) => ({ id, size: 0 })))) {
    const batch = writeBatch(db);
    for (const item of batchItems) batch.delete(doc(partsCol(householdId), item.id));
    await batch.commit();
  }
  return texts;
}

// Reads every part and decrypts it. Returns null when the household has no parts yet.
// K3: right after a re-lock some parts may still be locked with the previous key until
// they're rewritten; the older keys this phone knows are tried too.
function openPart(householdId: string, key: CryptoJS.lib.WordArray, data: string): any {
  let first: unknown;
  for (const k of keysToTry(householdId, key)) {
    try {
      return decryptJSON(k, data);
    } catch (e) {
      if (first === undefined) first = e;
    }
  }
  throw first;
}

export async function loadParts(householdId: string, key: CryptoJS.lib.WordArray): Promise<HouseholdParts | null> {
  const snap = await getDocs(partsCol(householdId));
  if (snap.empty) return null;
  const parts: HouseholdParts = {};
  snap.forEach((d) => {
    const data = d.data().data;
    if (typeof data === 'string') parts[d.id] = openPart(householdId, key, data);
  });
  return parts;
}

// Deletes every part (used when a household is dissolved, BEFORE the household document
// itself is deleted, because only members may delete parts).
export async function deleteAllParts(householdId: string): Promise<void> {
  const snap = await getDocs(partsCol(householdId));
  const ids = snap.docs.map((d) => d.id);
  for (const batchItems of planBatches(ids.map((id) => ({ id, size: 0 })))) {
    const batch = writeBatch(db);
    for (const item of batchItems) batch.delete(doc(partsCol(householdId), item.id));
    await batch.commit();
  }
}

// Each phone notes which app version it runs, so the old single copy can stop being
// written once everyone is on 2.1 or newer. A phone can only change its own entry.
export async function reportMemberVersion(householdId: string, appVersion: string): Promise<void> {
  const uid = requireCurrentUid();
  await updateDoc(doc(db, 'households', householdId), { [`memberVersions.${uid}`]: appVersion });
}

// Copies the household into parts, reads them back and checks every part matches what was
// written. Only then is the household marked as stored in parts. If anything doesn't
// match, the parts are removed again and the household stays exactly as it was (the old
// single copy is never touched here).
export async function migrateToParts(
  householdId: string,
  key: CryptoJS.lib.WordArray,
  model: HouseholdModel
): Promise<{ ok: true; texts: Record<string, string> } | { ok: false; reason: string }> {
  const parts = splitModel(model);
  let texts: Record<string, string>;
  try {
    texts = await saveParts(householdId, key, parts, {});
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Could not save the parts.' };
  }
  try {
    const back = await loadParts(householdId, key);
    const backTexts = back ? partTexts(back) : {};
    const ids = new Set([...Object.keys(texts), ...Object.keys(backTexts)]);
    for (const id of ids) {
      if (texts[id] !== backTexts[id]) throw new Error(`Part "${id}" did not read back the same.`);
    }
    // And the whole household rebuilt from what was read back must equal the original.
    if (JSON.stringify(joinParts(back!)) !== JSON.stringify(joinParts(parts))) {
      throw new Error('The household rebuilt from its parts did not match.');
    }
  } catch (e: any) {
    await deleteAllParts(householdId).catch(() => {});
    return { ok: false, reason: e?.message || 'The parts did not check out.' };
  }
  await updateDoc(doc(db, 'households', householdId), { layout: PARTS_LAYOUT_VERSION });
  return { ok: true, texts };
}

// Undo for testing: marks the household as a single copy again (the parts stay until
// deleteAllParts). Only meant for the throwaway test household in step 4.
export async function clearLayoutMark(householdId: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { layout: deleteField() });
}
