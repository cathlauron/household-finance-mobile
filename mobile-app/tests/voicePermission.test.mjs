import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

// B-087 (Cath's video 2026-10-31): Say it did nothing in the installed build. The photo
// picker's and camera's "no microphone" settings told the build to REMOVE the microphone
// permission (Android) and the microphone text (iPhone), so voice could never start.
// This reads the settings the real build is made from, after every add-on has had its say.
const cfg = JSON.parse(execSync('npx expo config --type introspect --json', { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));

test('the Android build keeps the microphone permission (voice entry)', () => {
  const perms = cfg._internal.modResults.android.manifest.manifest['uses-permission'] || [];
  const mic = perms.filter((p) => p.$['android:name'] === 'android.permission.RECORD_AUDIO');
  assert.ok(mic.length > 0, 'RECORD_AUDIO is missing');
  assert.ok(mic.every((p) => p.$['tools:node'] !== 'remove'), 'RECORD_AUDIO is removed from the build');
});

test('the iPhone build explains the microphone (voice entry)', () => {
  const t = cfg._internal.modResults.ios.infoPlist.NSMicrophoneUsageDescription;
  assert.equal(typeof t, 'string');
  assert.match(t, /Say it/);
});
