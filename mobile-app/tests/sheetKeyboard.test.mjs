// 3.1 smoothness: a pop-up sheet glided, not jumped, when the keyboard opened or closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the sheet glides to make room for the keyboard (and back)', () => {
  const src = fs.readFileSync(new URL('../src/components/BottomSheet.tsx', import.meta.url), 'utf8');
  assert.match(src, /keyboardDidShow'[\s\S]{0,600}animateNextLayout\(\);\s*setKeyboardHeight\(Math\.max/);
  assert.match(src, /keyboardDidHide', \(\) => \{\s*animateNextLayout\(\);\s*setKeyboardHeight\(0\)/);
});

test('3.2: dragging a sheet down runs on the animation thread, not through JavaScript', () => {
  const src = fs.readFileSync(new URL('../src/components/BottomSheet.tsx', import.meta.url), 'utf8');
  const pan = src.slice(src.indexOf('Gesture.Pan()'), src.indexOf('[dragY, reduce, setResting, closeFromDrag]'));
  assert.doesNotMatch(pan, /\.runOnJS\(true\)/);
  assert.doesNotMatch(pan, /y\.setValue/);
  assert.match(pan, /dragY\.value = Math\.max\(0, e\.translationY\)/);
});
