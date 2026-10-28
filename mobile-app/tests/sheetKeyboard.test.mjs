// 3.1 smoothness: a pop-up sheet glided, not jumped, when the keyboard opened or closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the sheet glides to make room for the keyboard (and back)', () => {
  const src = fs.readFileSync(new URL('../src/components/BottomSheet.tsx', import.meta.url), 'utf8');
  assert.match(src, /keyboardDidShow'[\s\S]{0,600}animateNextLayout\(\);\s*setKeyboardHeight\(Math\.max/);
  assert.match(src, /keyboardDidHide', \(\) => \{\s*animateNextLayout\(\);\s*setKeyboardHeight\(0\)/);
});
