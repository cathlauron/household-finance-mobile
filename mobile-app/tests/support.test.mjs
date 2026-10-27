// Cath, 2026-10-27: Contact support writes to the support address, with the version.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPORT_EMAIL, supportMailto } from '../src/support.ts';

test('Contact support: the right address, the version in the subject, nothing else', () => {
  assert.equal(SUPPORT_EMAIL, 'support.financeflow00@gmail.com');
  const url = supportMailto('2.2.0', 'android');
  assert.equal(url, 'mailto:support.financeflow00@gmail.com?subject=Finance%20Flow%202.2.0%20(Android)');
  assert.doesNotMatch(url, /body=/);
});
