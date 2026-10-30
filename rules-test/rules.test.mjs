// Finance Flow rules check (K3 + K4), 2026-10-30. Runs on a pretend Firebase on this
// computer (project "demo-finance-flow"); the real project and its data are never touched.
// A pretend household of 3: owner Ann, Ben and Cy. Cy is removed, then the household is
// re-locked. Every "can't" below must be refused; every "can" must be allowed.
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, getDocs, collection, serverTimestamp, runTransaction, deleteDoc, arrayRemove, deleteField } from 'firebase/firestore';

let env;
const H = 'households/h1';
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-finance-flow',
    firestore: { rules: readFileSync('../mobile-app/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 },
  });
});
after(async () => env?.cleanup());

const as = (uid) => env.authenticatedContext(uid).firestore();

async function seed(extra = {}) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, H), {
      data: 'old-data', updatedAt: 1, members: ['ann', 'ben', 'cy'], owner: 'ann',
      memberUsernames: { ann: 'ann', ben: 'ben', cy: 'cy' },
      memberVersions: { ann: '3.2.1', ben: '3.2.1', cy: '3.2.1' }, ...extra,
    });
    await setDoc(doc(db, H + '/parts/core'), { data: 'p', updatedAt: 1, updatedBy: 'ann' });
  });
}
beforeEach(() => seed());

async function relock(db, next, keyMembers) {
  return runTransaction(db, async (tx) => {
    tx.set(doc(db, `${H}/keyChain/${next}`), { wrapped: 'w', by: 'ann', at: 1 });
    tx.update(doc(db, H), { data: 'new-data', updatedAt: 2, keyVersion: next, dataKv: next, dataAt: serverTimestamp(), keyMembers });
  });
}
async function removeCy() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), H), { members: ['ann', 'ben'], memberUsernames: { ann: 'ann', ben: 'ben' }, keyMembers: ['ann', 'ben', 'cy'] });
  });
}

// ---- Before any re-lock: everything works as in 3.2.0 ----
test('before a re-lock: a member saves as before (no key number needed)', async () => {
  await assertSucceeds(setDoc(doc(as('ben'), H), { data: 'x', updatedAt: 3 }, { merge: true }));
});
test('before a re-lock: the owner can note who holds the key', async () => {
  await assertSucceeds(updateDoc(doc(as('ann'), H), { keyMembers: ['ann', 'ben', 'cy'] }));
});
test("a member who isn't the owner can't note key holders", async () => {
  await assertFails(updateDoc(doc(as('ben'), H), { keyMembers: ['ann', 'ben', 'cy'] }));
});
test("key holders can't include someone who isn't a member", async () => {
  await assertFails(updateDoc(doc(as('ann'), H), { keyMembers: ['ann', 'ben', 'cy', 'zed'] }));
});

// ---- Removing someone, then the re-lock ----
test('the owner can remove a member (as before)', async () => {
  await assertSucceeds(updateDoc(doc(as('ann'), H), { members: ['ann', 'ben'], [`memberUsernames.cy`]: deleteField() }));
});
test('a member can leave by themselves (as before)', async () => {
  await assertSucceeds(updateDoc(doc(as('cy'), H), { members: arrayRemove('cy'), [`memberUsernames.cy`]: deleteField() }));
});
test('the owner re-locks: new link, data, key number +1 and key holders in one step', async () => {
  await removeCy();
  await assertSucceeds(relock(as('ann'), 1, ['ann', 'ben']));
});
test("a member who isn't the owner can't re-lock", async () => {
  await removeCy();
  await assertFails(relock(as('ben'), 1, ['ann', 'ben']));
});
test("the key number can't jump (+2)", async () => {
  await removeCy();
  await assertFails(relock(as('ann'), 2, ['ann', 'ben']));
});
test("a re-lock without its chain link is refused", async () => {
  await removeCy();
  const db = as('ann');
  await assertFails(updateDoc(doc(db, H), { data: 'n', updatedAt: 2, keyVersion: 1, dataKv: 1, dataAt: serverTimestamp(), keyMembers: ['ann', 'ben'] }));
});
test("a chain link can't be added outside a re-lock", async () => {
  await assertFails(setDoc(doc(as('ann'), `${H}/keyChain/1`), { wrapped: 'w', by: 'ann', at: 1 }));
});

// ---- After the re-lock ----
async function relocked() {
  await removeCy();
  await relock(as('ann'), 1, ['ann', 'ben']);
}
test('after: a member reads the chain (to pick up the new key)', async () => {
  await relocked();
  await assertSucceeds(getDocs(collection(as('ben'), `${H}/keyChain`)));
});
test("after: the removed person can't read the chain, the household or its parts", async () => {
  await relocked();
  await assertFails(getDocs(collection(as('cy'), `${H}/keyChain`)));
  await assertFails(getDoc(doc(as('cy'), H)));
  await assertFails(getDocs(collection(as('cy'), `${H}/parts`)));
});
test("after: a chain link can't be changed or deleted", async () => {
  await relocked();
  await assertFails(updateDoc(doc(as('ann'), `${H}/keyChain/1`), { wrapped: 'x' }));
  await assertFails(deleteDoc(doc(as('ann'), `${H}/keyChain/1`)));
});
test('after: a save with the new key number and "now" stamp works', async () => {
  await relocked();
  await assertSucceeds(setDoc(doc(as('ben'), H), { data: 'y', updatedAt: 4, dataKv: 1, dataAt: serverTimestamp() }, { merge: true }));
});
test("after: a save from an older app (no key number / stamp) is refused", async () => {
  await relocked();
  await assertFails(setDoc(doc(as('ben'), H), { data: 'old-key-data', updatedAt: 4 }, { merge: true }));
});
test("after: a save naming the old key number is refused", async () => {
  await relocked();
  await assertFails(setDoc(doc(as('ben'), H), { data: 'z', updatedAt: 4, dataKv: 0, dataAt: serverTimestamp() }, { merge: true }));
});
test('after: a phone can still note its version', async () => {
  await relocked();
  await assertSucceeds(updateDoc(doc(as('ben'), H), { 'memberVersions.ben': '3.2.1' }));
});
test('after: parts need the new key number', async () => {
  await relocked();
  await assertSucceeds(setDoc(doc(as('ben'), `${H}/parts/core`), { data: 'p2', updatedAt: 5, updatedBy: 'ben', kv: 1 }));
  await assertFails(setDoc(doc(as('ben'), `${H}/parts/core`), { data: 'p3', updatedAt: 5, updatedBy: 'ben' }));
  await assertFails(setDoc(doc(as('ben'), `${H}/parts/core`), { data: 'p4', updatedAt: 5, updatedBy: 'ben', kv: 0 }));
});
test('after: a second removal re-locks to key 2', async () => {
  await relocked();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await updateDoc(doc(ctx.firestore(), H), { members: ['ann'], memberUsernames: { ann: 'ann' } });
  });
  await assertSucceeds(relock(as('ann'), 2, ['ann']));
});

// ---- K4 (household recovery), published together with K3 ----
test('K4: a recovery request lasts at most 15 minutes', async () => {
  const now = Date.now();
  const base = { householdId: 'h1', requesterUid: 'ben', requesterUsername: 'ben', transferSalt: 's', status: 'pending', createdAt: now };
  await assertSucceeds(setDoc(doc(as('ben'), 'householdRecovery/r1'), { ...base, expiresAt: now + 15 * 60 * 1000 }));
  await assertFails(setDoc(doc(as('ben'), 'householdRecovery/r2'), { ...base, expiresAt: now + 60 * 60 * 1000 }));
});
