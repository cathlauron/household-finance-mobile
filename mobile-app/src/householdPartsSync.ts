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
// FOR TESTING ONLY in this build: this only switches on for accounts whose username starts
// with "test" (step 4: a throwaway household with two test accounts). Real households are
// untouched until it's been tested on the phone.
//
// Every step here is "best effort": a failure is logged and never stops a normal save.

import CryptoJS from 'crypto-js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { splitModel, joinParts, partTexts } from './householdParts';
import { saveParts, loadParts, deleteAllParts, migrateToParts, reportMemberVersion, PartTooBigError } from './householdCloudParts';
import type { HouseholdModel } from './types';

export const PARTS_APP_VERSION = '2.1';

export function partsEnabledFor(username: string | null | undefined): boolean {
  return !!username && username.toLowerCase().startsWith('test');
}

// Part saves run one after another, never at the same time, so two quick saves can't
// interleave and leave the parts half from one and half from the other.
let queue: Promise<unknown> = Promise.resolve();
function inOrder<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

type State = { householdId: string | null; layout: number; texts: Record<string, string> };
const state: State = { householdId: null, layout: 0, texts: {} };

function sameHousehold(householdId: string) {
  if (state.householdId !== householdId) {
    state.householdId = householdId;
    state.layout = 0;
    state.texts = {};
  }
}

export function currentLayout(householdId: string): number {
  return state.householdId === householdId ? state.layout : 0;
}

export function forgetParts() {
  state.householdId = null;
  state.layout = 0;
  state.texts = {};
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
    return joinParts(parts);
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
  reportMemberVersion(householdId, PARTS_APP_VERSION).catch((e) => console.warn('[parts] version note failed:', e));
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
    const want = partTexts(splitModel(model));
    const have = parts ? partTexts(parts) : {};
    // Repair: write whatever differs (and remove extras) as if `have` was saved last.
    state.texts = await saveParts(householdId, key, splitModel(model), have);
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
    state.texts = await saveParts(householdId, key, splitModel(model), state.texts);
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
    state.texts = await saveParts(householdId, key, splitModel(model), state.texts);
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
    try {
      const parts = await loadParts(householdId, key);
      if (!parts) return null;
      state.layout = layout;
      state.texts = partTexts(parts);
      return joinParts(parts);
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
    return JSON.stringify(a) === JSON.stringify(joinParts(splitModel(b)));
  } catch {
    return false;
  }
}
