// K3 (key chain, Cath's OK option A) + K5 steps 4/5, 2026-10-30. A pretend Firestore in
// memory: the owner re-locks after someone left; the other members pick the new key up
// from the chain; a save with an old key writes nothing; parts written before the re-lock
// still open; the household is saved tamper-checked only once every phone reads it.
const mockDocs = new Map<string, any>();
const mockLog: string[] = [];
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: async (n: number) => new Uint8Array(require('crypto').randomBytes(n)) }));
jest.mock('../src/firebase', () => ({ db: {} }));
jest.mock('../src/authFirebase', () => ({ requireCurrentUid: () => 'ann', getCurrentFirebaseUser: () => ({ uid: 'ann' }) }));
jest.mock('firebase/firestore', () => {
  const path = (...p: any[]) => p.filter((x) => typeof x === 'string').join('/');
  const snapOf = (p: string) => ({ id: p.split('/').pop(), exists: () => mockDocs.has(p), data: () => mockDocs.get(p), ref: { path: p } });
  const set = (p: string, v: any, merge?: boolean) => {
    const out = { ...(merge ? mockDocs.get(p) || {} : {}), ...v };
    for (const k of Object.keys(out)) if (out[k] === 'SERVER_TIME') out[k] = 'now';
    mockDocs.set(p, out);
    mockLog.push('write ' + p);
  };
  return {
    doc: (base: any, ...p: string[]) => ({ path: base && base.path ? path(base.path, ...p) : path(...p) }),
    collection: (_db: any, ...p: string[]) => ({ path: path(...p) }),
    serverTimestamp: () => 'SERVER_TIME',
    getDoc: async (r: any) => snapOf(r.path),
    getDocs: async (c: any) => {
      const docs = [...mockDocs.keys()].filter((k) => k.startsWith(c.path + '/') && !k.slice(c.path.length + 1).includes('/')).map(snapOf);
      return { docs, empty: docs.length === 0, forEach: (f: any) => docs.forEach(f) };
    },
    updateDoc: async (r: any, v: any) => set(r.path, v, true),
    setDoc: async (r: any, v: any, o?: any) => set(r.path, v, o?.merge),
    runTransaction: async (_db: any, fn: any) => {
      const writes: (() => void)[] = [];
      const out = await fn({
        get: async (r: any) => snapOf(r.path),
        set: (r: any, v: any, o?: any) => writes.push(() => set(r.path, v, o?.merge)),
        update: (r: any, v: any) => writes.push(() => set(r.path, v, true)),
      });
      writes.forEach((w) => w());
      return out;
    },
    writeBatch: () => {
      const writes: (() => void)[] = [];
      return { set: (r: any, v: any) => writes.push(() => set(r.path, v)), delete: () => {}, commit: async () => writes.forEach((w) => w()) };
    },
    deleteField: () => undefined,
  };
});

import CryptoJS from 'crypto-js';
const { encryptJSON, decryptJSON } = require('../src/encryption');
const kc = require('../src/keyChain');
const { saveHouseholdDataChecked } = require('../src/household');
const { loadParts, saveParts } = require('../src/householdCloudParts');
const { isV2Payload } = require('../src/envelopeV2');

const H = 'households/h1';
const key0 = CryptoJS.enc.Hex.parse('11'.repeat(32));
const model = { bills: [{ id: 'b1', name: 'Rent' }] };

beforeEach(async () => {
  mockDocs.clear();
  mockLog.length = 0;
  kc.forgetKeys();
  mockDocs.set(H, {
    data: await encryptJSON(key0, model), updatedAt: 1, owner: 'ann', members: ['ann', 'ben'],
    keyMembers: ['ann', 'ben', 'cy'], memberVersions: { ann: '3.2.1', ben: '3.2.1' },
  });
});

test('the owner re-locks after someone left: new link, new key number, data opens only with the new key', async () => {
  kc.rememberKey('h1', key0, 0);
  const r = await kc.relockHousehold('h1', key0, 'ann');
  expect(r.version).toBe(1);
  const h = mockDocs.get(H);
  expect([h.keyVersion, h.dataKv, h.dataAt, h.keyMembers]).toEqual([1, 1, 'now', ['ann', 'ben']]);
  expect(mockDocs.has(H + '/keyChain/1')).toBe(true);
  expect(decryptJSON(r.key, h.data)).toEqual(model);
  expect(() => decryptJSON(key0, h.data)).toThrow();
});

test("nothing to re-lock when everyone who held the key is still in, or it isn't this phone's job", async () => {
  kc.rememberKey('h1', key0, 0);
  mockDocs.set(H, { ...mockDocs.get(H), keyMembers: ['ann', 'ben'] });
  expect(await kc.relockHousehold('h1', key0, 'ann')).toBeNull();
  mockDocs.set(H, { ...mockDocs.get(H), keyMembers: ['ann', 'ben', 'cy'] });
  expect(await kc.relockHousehold('h1', key0, 'ben')).toBeNull(); // not the owner
  expect(mockDocs.get(H).keyVersion).toBeUndefined();
});

test('another member picks up the new key from the chain (and twice over)', async () => {
  kc.rememberKey('h1', key0, 0);
  const r1 = await kc.relockHousehold('h1', key0, 'ann');
  mockDocs.set(H, { ...mockDocs.get(H), keyMembers: ['ann', 'ben', 'dee'], members: ['ann', 'ben'] });
  const r2 = await kc.relockHousehold('h1', r1.key, 'ann');
  kc.forgetKeys(); // Ben's phone knows only the key it was given at the start
  const up = await kc.catchUpKey('h1', key0);
  expect(up.version).toBe(2);
  expect(up.changed).toBe(true);
  expect(up.key.toString()).toBe(r2.key.toString());
  expect(decryptJSON(up.key, mockDocs.get(H).data)).toEqual(model);
});

test('holding the newest key already: nothing changes', async () => {
  kc.rememberKey('h1', key0, 0);
  const r = await kc.relockHousehold('h1', key0, 'ann');
  kc.forgetKeys();
  const up = await kc.catchUpKey('h1', r.key);
  expect([up.changed, up.version]).toEqual([false, 1]);
});

test('step 5: a save locked with the old key writes nothing after a re-lock', async () => {
  kc.rememberKey('h1', key0, 0);
  const r = await kc.relockHousehold('h1', key0, 'ann');
  const before = mockDocs.get(H).data;
  await expect(saveHouseholdDataChecked('h1', async () => 'old-key-text', 0)).rejects.toBeInstanceOf(kc.KeyChangedError);
  expect(mockDocs.get(H).data).toBe(before);
  // With the new key number it goes through, carrying the number and the "now" stamp.
  await saveHouseholdDataChecked('h1', async () => 'new-key-text', kc.versionOfKey('h1', r.key));
  expect(mockDocs.get(H)).toMatchObject({ data: 'new-key-text', dataKv: 1, dataAt: 'now' });
});

test('before any re-lock a save is exactly as in 3.2.0 (no key number, no stamp)', async () => {
  await saveHouseholdDataChecked('h1', async () => 'text', -1);
  const h = mockDocs.get(H);
  expect(h.data).toBe('text');
  expect('dataKv' in h || 'dataAt' in h).toBe(false);
});

test('parts: written with the key number after a re-lock; older parts still open', async () => {
  kc.rememberKey('h1', key0, 0);
  await saveParts('h1', key0, { core: { a: 1 } }, {});
  expect(mockDocs.get(H + '/parts/core').kv).toBeUndefined();
  const r = await kc.relockHousehold('h1', key0, 'ann');
  expect(await loadParts('h1', r.key)).toEqual({ core: { a: 1 } }); // old part, old key tried
  await saveParts('h1', r.key, { core: { a: 2 } }, {});
  expect(mockDocs.get(H + '/parts/core').kv).toBe(1);
});

test('K5 step 4: tamper-checked saves only once every member reads them', async () => {
  kc.noteHouseholdReaders('h1', ['ann', 'ben'], { ann: '3.2.1', ben: '3.1.0' });
  expect(kc.sealOptions('h1')).toEqual({ v2: false });
  kc.noteHouseholdReaders('h1', ['ann', 'ben'], { ann: '3.2.1', ben: '3.2' });
  expect(kc.sealOptions('h1')).toEqual({ v2: true });
  const text = await encryptJSON(key0, model, kc.sealOptions('h1'));
  expect(isV2Payload(text)).toBe(true);
  expect(decryptJSON(key0, text)).toEqual(model);
  expect(kc.sealOptions(undefined)).toEqual({ v2: false });
});
