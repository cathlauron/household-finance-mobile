import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyToAutoSave } from '../src/autoSaveInput.ts';

// H-14 (2026-10-22): an empty "Running low" box must not be saved as 0 mid-typing.
test('an empty box is not saved while typing', () => {
  assert.equal(readyToAutoSave(''), false);
  assert.equal(readyToAutoSave('  '), false);
});
test('a typed number is saved after the pause', () => {
  assert.equal(readyToAutoSave('25'), true);
  assert.equal(readyToAutoSave('0'), true);
});
