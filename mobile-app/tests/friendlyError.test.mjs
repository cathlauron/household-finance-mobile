import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError, OFFLINE_LINE } from '../src/friendlyError.ts';

// H-12 (2026-10-22): no raw technical error text on screen.
const fb = 'Please try again.';
test("the app's own friendly messages are shown as they are", () => {
  assert.equal(friendlyError(new Error('That photo is too large. Try a different one.'), fb), 'That photo is too large. Try a different one.');
});
test('Firebase permission errors get the friendly fallback', () => {
  const e = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied', name: 'FirebaseError' });
  assert.equal(friendlyError(e, fb), fb);
});
test('offline errors say so in plain words', () => {
  assert.equal(friendlyError(new Error('Failed to get document because the client is offline.'), fb), OFFLINE_LINE);
  assert.equal(friendlyError(Object.assign(new Error('x'), { code: 'unavailable' }), fb), OFFLINE_LINE);
});
test('programming errors never reach the screen', () => {
  assert.equal(friendlyError(new TypeError("Cannot read properties of undefined (reading 'id')"), fb), fb);
});
test('nothing useful: the fallback', () => {
  assert.equal(friendlyError(undefined, fb), fb);
  assert.equal(friendlyError('just a string', fb), fb);
  assert.equal(friendlyError(new Error(''), fb), fb);
});
test('a friendly message that mentions a code is still shown', () => {
  assert.equal(friendlyError(new Error('That invite code has expired. Ask for a new one.'), fb), 'That invite code has expired. Ask for a new one.');
});
