// Version 2.1, storage step 3: keeps the household's online parts in step with saving and
// loading (see householdCloudParts.ts for the parts themselves).
//
// How the household is stored online (households/{id}.layout):
//   none -> one encrypted copy in `data` (2.0 and older phones only know this).
//   1    -> `data` is still the main copy and is saved first; the parts are a second
//           copy saved right after. When the app opens it checks the parts match `data`
//           and quietly repairs them if not. Older phones keep working as before.
//   2    -> the household got too big for one `data` copy (over 1 MiB). The parts are now
//           the main copy; `data` is left as it was. Goes back to 1 once it fits again.
//
// 2.1 switched this on for "test" accounts only. 2.2 (H-02, 2026-10-22): on for everyone;
// layout 2 only once every member's phone reports 2.2 or newer (partsGate.ts).
//
// Every step here is "best effort": a failure is logged and never stops a normal save.

import CryptoJS from 'crypto-js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { splitModel, joinParts, partTexts, extraReceiptPhotos } from './householdParts';
import { saveParts, loadParts, deleteAllParts, migrateToParts, reportMemberVersion, PartTooBigError } from './householdCloudParts';
import type { HouseholdModel } from './types';
import { partsEnabledFor, everyoneReadsParts, EXTRA_RECEIPTS_VERSION, ENVELOPE_READER_VERSION } from './partsGate';
import { KEYCHAIN_READER_VERSION } from './keyChainPlan';

// What this phone reports in memberVersions (2.2: reads parts for every account; 3.0: also
// reads the receipt parts of shared expenses, payments and trip items).
// 3.2: also reads the tamper-checked saves.
// 3.2.1 (K3): also picks up a new household key (keyChainPlan.ts).
export const PARTS_APP_VERSION = KEYCHAIN_READER_VERSION;

// Who has parts switched on: see partsGate.ts.
export { partsEnabledFor };

// Part saves run one after another, never at the same time, so two quick saves can't
// interleave and leave the parts half from one and half from the other.
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

type State = { householdId: string | null; layout: number; texts: Record<string, string>; extraReceipts: boolean };
const state: State = { householdId: null, layout: 0, texts: {}, extraReceipts: false };

// Receipts outside transactions this phone has seen (part id -> photo), this session.
// If an older phone removed one of their parts, joining puts the photo back from here and
// the next save writes the part again (code review 2026-10-27).
const seenReceipts: Record<string, string> = {};
function remember(model: HouseholdModel) {
  try {
    Object.assign(seenReceipts, extraReceiptPhotos(model));
  } catch {}
}
let restored = false;
function join(parts: Record<string, unknown>): HouseholdModel {
  restored = false;
  const model = joinParts(parts, (key) => {
    const photo = parts[key] ? undefined : seenReceipts[key];
    if (photo) restored = true;
    return photo;
  });
  remember(model);
  return model;
}
// After a join that had to put a photo back: write the missing parts again straight away.
async function repairIfRestored(householdId: string, key: CryptoJS.lib.WordArray, model: HouseholdModel) {
  if (!restored) return;
  restored = false;
  try {
    state.texts = await saveParts(householdId, key, split(model), state.texts);
    console.log('[parts] put back receipt photo(s) another phone had removed');
  } catch (e) {
    console.warn('[parts] could not put back a receipt photo (tried again on the next save):', e);
  }
}

// Splits the household the way this household can safely read it (see partsGate.ts).
function split(model: HouseholdModel) {
  remember(model);
  return splitModel(model, { extraReceipts: state.extraReceipts });
}

// Reads the household's member list and versions to decide whether the extra receipts can
// go into their own parts. Any doubt (no doc, an error) keeps them inside the main copy.
function noteMembers(data: any) {
  state.extraReceipts = !!data && everyoneReadsParts(data.members, data.memberVersions, EXTRA_RECEIPTS_VERSION);
}
async function refreshMembers(householdId: string) {
  try {
    const snap = await getDoc(doc(db, 'households', householdId));
    noteMembers(snap.exists() ? snap.data() : null);
  } catch (e) {
    state.extraReceipts = false;
    console.warn('[parts] could not read the member versions:', e);
  }
}

function sameHousehold(householdId: string) {
  if (state.householdId !== householdId) {
    state.householdId = householdId;
    state.layout = 0;
    state.texts = {};
    state.extraReceipts = false;
    for (const k of Object.keys(seenReceipts)) delete seenReceipts[k];
  }
}

export function currentLayout(householdId: string): number {
  return state.householdId === householdId ? state.layout : 0;
}

// K3: after a re-lock every part is written again (with the new key) on the next save.
export function rewriteAllPartsNext() {
  state.texts = {};
}

export function forgetParts() {
  state.householdId = null;
  state.layout = 0;
  state.texts = {};
  state.extraReceipts = false;
  for (const k of Object.keys(seenReceipts)) delete seenReceipts[k];
}

// layout 2 only: reads the household from its parts. Returns null if that isn't possible
// (the caller then falls back to `data`, as before).
export async function loadModelFromParts(
  username: string,
  householdId: string,
  key: CryptoJS.lib.WordArray,
  layout: number
): Promise<HouseholdModel | null> {
  if (!partsEnabledFor(username) || layout < 2) return null;
  sameHousehold(householdId);
  try {
    const parts = await loadParts(householdId, key);
    if (!parts) return null;
    state.layout = layout;
    state.texts = partTexts(parts);
    const model = join(parts);
    inOrder(() => repairIfRestored(householdId, key, model));
    return model;
  } catch (e) {
    console.warn('[parts] could not load from parts:', e);
    return null;
  }
}

// After the household was opened (from `data`): note this phone's version, copy into parts
// the first time, otherwise check the parts match and repair them. Runs in the background.
export async function afterLoad(
  username: string,
  householdId: string,
  key: CryptoJS.lib.WordArray,
  model: HouseholdModel,
  layout: number
): Promise<void> {
  if (!partsEnabledFor(username)) return;
  return inOrder(() => afterLoadNow(householdId, key, model, layout));
}

async function afterLoadNow(householdId: string, key: CryptoJS.lib.WordArray, model: HouseholdModel, layout: number): Promise<void> {
  sameHousehold(householdId);
  state.layout = layout;
  try {
    await reportMemberVersion(householdId, PARTS_APP_VERSION);
  } catch (e) {
    console.warn('[parts] version note failed:', e);
  }
  await refreshMembers(householdId);
  try {
    if (!layout) {
      const result = await migrateToParts(householdId, key, model);
      if (result.ok) {
        state.layout = 1;
        state.texts = result.texts;
        console.log('[parts] household copied into parts and checked');
      } else {
        console.warn('[parts] copy into parts did not check out, household unchanged:', 'reason' in result ? result.reason : '');
      }
      return;
    }
    if (layout >= 2) return; // opened from the parts already
    const parts = await loadParts(householdId, key);
    const want = partTexts(split(model));
    const have = parts ? partTexts(parts) : {};
    // Repair: write whatever differs (and remove extras) as if `have` was saved last.
    state.texts = await saveParts(householdId, key, split(model), have);
    const fixed = Object.keys(want).filter((id) => want[id] !== have[id]).length + Object.keys(have).filter((id) => !(id in want)).length;
    console.log(fixed ? `[parts] repaired ${fixed} part(s)` : '[parts] parts match');
  } catch (e) {
    console.warn('[parts] check after opening failed:', e);
  }
}

// After `data` was saved: save the parts that changed. If the household had been too big
// before (layout 2) and fits again, it goes back to layout 1.
export async function afterSave(username: string, householdId: string, key: CryptoJS.lib.WordArray, model: HouseholdModel): Promise<void> {
  if (!partsEnabledFor(username) || currentLayout(householdId) < 1) return;
  return inOrder(async () => {
  try {
    state.texts = await saveParts(householdId, key, split(model), state.texts);
    if (state.layout >= 2) {
      await updateDoc(doc(db, 'households', householdId), { layout: 1 });
      state.layout = 1;
    }
  } catch (e) {
    console.warn('[parts] saving parts after a save failed (fixed next time the app opens):', e);
  }
  });
}

// The household is too big for the single `data` copy. With parts on, save the parts and
// mark the household as layout 2, so other phones read it from the parts. Returns true
// when the change is safely online.
export async function saveWhenTooBig(username: string, householdId: string, key: CryptoJS.lib.WordArray, model: HouseholdModel): Promise<boolean> {
  if (!partsEnabledFor(username) || currentLayout(householdId) < 1) return false;
  return inOrder(async () => {
  try {
    // H-02 (2026-10-22): only when every phone in the household reads parts (see
    // partsGate.ts). Otherwise nothing changes online and the caller says storage is full.
    const snap = await getDoc(doc(db, 'households', householdId));
    noteMembers(snap.exists() ? snap.data() : null);
    if (!snap.exists() || !everyoneReadsParts(snap.data().members, snap.data().memberVersions)) {
      console.warn('[parts] not every phone in the household reads parts yet; staying on one copy');
      return false;
    }
    // Code review 2026-10-27: compare with the parts as they are online right now (another
    // phone may have changed or removed some since this phone last saved), so every part the
    // household needs is really there before the parts become the main copy.
    const online = await loadParts(householdId, key);
    state.texts = await saveParts(householdId, key, split(model), online ? partTexts(online) : state.texts);
    // updatedAt changes too, so other phones' live listener notices the new version.
    await updateDoc(doc(db, 'households', householdId), { layout: 2, updatedAt: Date.now() });
    state.layout = 2;
    return true;
  } catch (e) {
    if (e instanceof PartTooBigError) console.warn('[parts] one part is too big:', e.partId);
    else console.warn('[parts] saving the parts failed:', e);
    return false;
  }
  });
}

// A household is being dissolved: remove its parts first (only members may).
export async function removePartsBeforeDissolve(username: string | null | undefined, householdId: string): Promise<void> {
  if (!partsEnabledFor(username)) return;
  try {
    await deleteAllParts(householdId);
  } catch (e) {
    console.warn('[parts] could not remove parts before dissolving:', e);
  }
  if (state.householdId === householdId) forgetParts();
}

// Live update from another phone while the household is in layout 2: read the parts.
// Returns null when nothing needs to change.
export async function modelFromPartsForUpdate(
  username: string | null | undefined,
  householdId: string,
  key: CryptoJS.lib.WordArray,
  layout: number
): Promise<HouseholdModel | null> {
  if (!partsEnabledFor(username) || layout < 2) return null;
  return inOrder(async () => {
    sameHousehold(householdId);
    // A phone that just joined or opened on an older version shows up here: check again
    // whether the receipt parts are still safe for everyone.
    await refreshMembers(householdId);
    try {
      const parts = await loadParts(householdId, key);
      if (!parts) return null;
      state.layout = layout;
      state.texts = partTexts(parts);
      const model = join(parts);
      await repairIfRestored(householdId, key, model);
      return model;
    } catch (e) {
      console.warn('[parts] could not read a live update from the parts:', e);
      return null;
    }
  });
}

// True when `a` (just read from the parts) is the same household as `b`. Joining the parts
// lists transactions month by month, so `b` is put through the same split-and-join first.
export function sameAsParts(a: HouseholdModel, b: HouseholdModel | null | undefined): boolean {
  if (!b) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(joinParts(split(b)));
  } catch {
    return false;
  }
}
