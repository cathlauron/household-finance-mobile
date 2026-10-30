// K3: deciding when a household needs a new key, and picking up new keys.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsRelock, keyMembersToWrite, canRelockNow, walkChain, KEYCHAIN_READER_VERSION } from '../src/keyChainPlan.ts';

test('someone who held the key left or was removed: a new key is needed', () => {
  assert.equal(needsRelock(['a', 'b', 'c'], ['a', 'b']), true);
  assert.equal(needsRelock(['a', 'b'], ['a', 'b', 'c']), false); // someone joined: no
  assert.equal(needsRelock(undefined, ['a', 'b']), false); // no list yet: nothing known
});

test('joiners are added to the key holders; a household from before K3 starts its list', () => {
  assert.deepEqual(keyMembersToWrite(undefined, ['a', 'b']), ['a', 'b']);
  assert.deepEqual(keyMembersToWrite(['a', 'b'], ['a', 'b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(keyMembersToWrite(['a', 'b', 'x'], ['a', 'b']), null); // x stays until a re-lock
  assert.equal(keyMembersToWrite(['a', 'b'], ['a', 'b']), null);
});

test('only the owner re-locks, with 2+ members left, when every phone can pick it up', () => {
  const v = { a: KEYCHAIN_READER_VERSION, b: KEYCHAIN_READER_VERSION };
  assert.equal(canRelockNow({ myUid: 'a', owner: 'a', members: ['a', 'b'], memberVersions: v }), true);
  assert.equal(canRelockNow({ myUid: 'b', owner: 'a', members: ['a', 'b'], memberVersions: v }), false);
  assert.equal(canRelockNow({ myUid: 'a', owner: 'a', members: ['a'], memberVersions: v }), false);
  assert.equal(canRelockNow({ myUid: 'a', owner: 'a', members: ['a', 'b'], memberVersions: { a: '3.2.1', b: '3.2' } }), false);
});

// Pretend keys: key n opens link n+1 ("wrapped:<n>-><n+1>").
const unwrap = (w, k) => {
  const [from, to] = w.split('->').map(Number);
  if (from !== k) throw new Error('wrong key');
  return to;
};
const links = [1, 2, 3].map((n) => ({ n, wrapped: `${n - 1}->${n}` }));

test('the original key walks to the newest; each older key is kept', () => {
  assert.deepEqual(walkChain(links, 0, unwrap), { key: 3, version: 3, older: [0, 1, 2] });
  assert.deepEqual(walkChain(links, 2, unwrap), { key: 3, version: 3, older: [2] });
});

test('the newest key opens nothing and stays; no chain at all: version 0', () => {
  assert.deepEqual(walkChain(links, 3, unwrap), { key: 3, version: 3, older: [] });
  assert.deepEqual(walkChain([], 0, unwrap), { key: 0, version: 0, older: [] });
});

test('a gap or a damaged link stops at the last certain key', () => {
  const gap = [links[0], links[2]];
  assert.deepEqual(walkChain(gap, 0, unwrap), { key: 1, version: 1, older: [0] });
  const bad = [links[0], { n: 2, wrapped: '9->2' }, links[2]];
  assert.deepEqual(walkChain(bad, 0, unwrap), { key: 1, version: 1, older: [0] });
});
