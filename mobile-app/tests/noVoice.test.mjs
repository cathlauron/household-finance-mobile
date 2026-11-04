import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cath, 2026-11-04: "remove the voice entry from our app completely". No Say it anywhere: forms,
// widgets (the Say it widget is gone; the others keep + Add), the welcome (its midday moment is
// a quick typed add), and no voice code left behind.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|js)$/.test(n) ? [p] : [];
  });
}
const sources = [...files(path.join(root, 'src')), path.join(root, 'App.tsx'), path.join(root, 'index.js')];

test('no Say it button or voice code in any screen', () => {
  for (const f of sources) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/<SayItButton|from '\.\.?\/(components\/)?SayIt'|voiceListen|voiceParse|expo-speech-recognition/.test(s), path.relative(root, f));
  }
  for (const gone of ['src/components/SayIt.tsx', 'src/voiceListen.ts', 'src/voiceParse.ts']) assert.ok(!existsSync(path.join(root, gone)), gone);
});

test('no "Say it" words left on screen', () => {
  for (const f of sources) assert.ok(!/['"`>]\s*Say it\b|🎙 Say it|Say the ingredients/.test(readFileSync(f, 'utf8')), path.relative(root, f));
});

test('widgets: the Say it widget is gone, and no widget opens voice', () => {
  const app = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8'));
  const plugin = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'react-native-android-widget');
  assert.deepEqual(plugin[1].widgets.map((w) => w.name), ['LeftToSpend', 'SpendSay', 'DueSoon', 'Month', 'Trip']);
  const ff = readFileSync(path.join(root, 'src/widgets/FFWidgets.tsx'), 'utf8');
  assert.ok(!/financeflow:\/\/voice|VOICE_URI|'SayIt'/.test(ff));
  assert.ok(!/financeflow:\/\/voice/.test(readFileSync(path.join(root, 'App.tsx'), 'utf8')));
});
