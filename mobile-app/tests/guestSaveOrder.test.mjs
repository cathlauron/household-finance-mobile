import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Cath, 2026-11-06 (Home + mockup): a guest's form stayed stuck after Add, because a guest's save
// redrew every screen before the form could close. A signed-in save redraws one frame later (since
// 2.2), so the form starts closing first. A guest's save now does the same.
test('a guest save redraws one frame later, like a signed-in save', () => {
  const text = fs.readFileSync(new URL('../src/DataContext.tsx', import.meta.url), 'utf8');
  const start = text.indexOf('async function saveModel(');
  const guest = text.slice(text.indexOf('if (guestRef.current) {', start), text.indexOf('if (!usernameRef.current) return;', start));
  assert.doesNotMatch(guest, /^\s*setModel\(sanitizedModel\);/m, 'no redraw before the form closes');
  assert.match(guest, /requestAnimationFrame\(\(\) => setModel\(latestModelRef\.current\)\)/);
  assert.match(guest, /latestModelRef\.current = sanitizedModel;/, 'the newest data is ready at once');
});
