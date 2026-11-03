import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordStrength } from '../src/passwordStrength.ts';

// Cath, 2026-11-03 (mockup PW1): a strength bar and a word under a new password, like other apps.
// It only guides: the rule for saving stays as it is (at least 6 characters).
test('nothing typed: nothing shown', () => {
  assert.equal(passwordStrength(''), null);
});

test('levels: too short, weak, okay, good, strong', () => {
  assert.deepEqual(passwordStrength('abc12'), { level: 0, word: 'Too short', tip: 'At least 6 characters' });
  assert.equal(passwordStrength('mangos').word, 'Weak'); // 6 letters: allowed, but weak
  assert.equal(passwordStrength('mangotree').word, 'Okay'); // 8+
  assert.equal(passwordStrength('MangoTree26').word, 'Good'); // 8+ with capitals, small letters and numbers
  assert.equal(passwordStrength('Mango-Tree-2026').word, 'Strong'); // also a number and a symbol
  assert.equal(passwordStrength('blue mango river sunset').word, 'Strong'); // long words are strong
});

test('common passwords are weak however long', () => {
  assert.equal(passwordStrength('Password123!').word, 'Weak');
  assert.equal(passwordStrength('qwerty123456').word, 'Weak');
});
