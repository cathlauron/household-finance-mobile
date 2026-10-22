import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionAtLeast, everyoneReadsParts } from '../src/partsGate.ts';
import { partsEnabledFor } from '../src/partsGate.ts';

// H-02 (2026-10-22): the bigger storage (parts) is on for everyone, but the household only
// moves its main copy into parts when every phone in it can read them.

test('bigger storage is on for real accounts, not only test ones', () => {
  assert.equal(partsEnabledFor('cath'), true);
  assert.equal(partsEnabledFor('testa'), true);
  assert.equal(partsEnabledFor(''), false);
  assert.equal(partsEnabledFor(null), false);
});

test('version order: 2.2 and newer read parts; 2.1, missing or odd values do not', () => {
  assert.equal(versionAtLeast('2.2', '2.2'), true);
  assert.equal(versionAtLeast('2.10', '2.2'), true);
  assert.equal(versionAtLeast('3', '2.2'), true);
  assert.equal(versionAtLeast('2.1', '2.2'), false);
  assert.equal(versionAtLeast(undefined, '2.2'), false);
  assert.equal(versionAtLeast('2.2-beta', '2.2'), false);
});

test('both phones on 2.2: the household may move into parts', () => {
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '2.2', u2: '2.2' }), true);
});

test('one phone still on 2.1 (or never said): it may NOT', () => {
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '2.2', u2: '2.1' }), false);
  assert.equal(everyoneReadsParts(['u1', 'u2'], { u1: '2.2' }), false);
  assert.equal(everyoneReadsParts(['u1', 'u2'], undefined), false);
});

test('no member list: it may NOT', () => {
  assert.equal(everyoneReadsParts([], {}), false);
  assert.equal(everyoneReadsParts(undefined, {}), false);
});
