import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreLinkedHousehold } from '../src/signInRestore.ts';

// H-19 (2026-10-22): a dropped connection while signing in on a new phone asked for the
// recovery key, as if the password were wrong.
const ok = { unwrap: () => 'KEY', load: async () => 'TEXT', decrypt: (k, t) => ({ k, t }) };
test('everything works: the household opens', async () => {
  assert.deepEqual(await restoreLinkedHousehold(ok), { status: 'ok', model: { k: 'KEY', t: 'TEXT' }, householdKey: 'KEY' });
});
test('connection dropped while reading: "offline", NOT the recovery key', async () => {
  const r = await restoreLinkedHousehold({ ...ok, load: async () => { throw Object.assign(new Error('Failed to get document because the client is offline.'), { code: 'unavailable' }); } });
  assert.equal(r.status, 'offline');
});
test('wrong password (key does not unwrap): recovery, as before', async () => {
  assert.equal((await restoreLinkedHousehold({ ...ok, unwrap: () => { throw new Error('Could not decrypt'); } })).status, 'recovery');
});
test('household does not open with the key: recovery', async () => {
  assert.equal((await restoreLinkedHousehold({ ...ok, decrypt: () => { throw new Error('bad'); } })).status, 'recovery');
});
test('no household data online: recovery, as before', async () => {
  assert.equal((await restoreLinkedHousehold({ ...ok, load: async () => null })).status, 'recovery');
});

test('K3: a household re-locked since the key was saved opens with the newer key', async () => {
  const out = await restoreLinkedHousehold({
    unwrap: () => 'key0',
    catchUp: async (k) => (k === 'key0' ? 'key1' : k),
    load: async () => 'text',
    decrypt: (k) => {
      if (k !== 'key1') throw new Error('wrong key');
      return { ok: true };
    },
  });
  assert.equal(out.status, 'ok');
  assert.equal(out.householdKey, 'key1');
});

test('K3: if picking up the newer key fails, the saved key is still tried', async () => {
  const out = await restoreLinkedHousehold({
    unwrap: () => 'key0',
    catchUp: async () => { throw new Error('offline'); },
    load: async () => 'text',
    decrypt: () => ({ ok: true }),
  });
  assert.equal(out.householdKey, 'key0');
});
