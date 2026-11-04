import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// History: B-087 (2026-10-31) made sure the build KEPT the microphone, for voice entry.
// 2026-11-04 Cath removed voice entry completely ("remove the voice entry from our app
// completely"), and chose to take the speech add-on and the microphone out of the app too.
// So this check now makes sure the build does NOT ask for the microphone and has no speech
// add-on. It reads the settings the real build is made from, after every add-on has had its say.
const cfg = JSON.parse(execSync('npx expo config --type introspect --json', { cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));

test('the Android build does not ask for the microphone', () => {
  const perms = cfg._internal.modResults.android.manifest.manifest['uses-permission'] || [];
  const mic = perms.filter((p) => p.$['android:name'] === 'android.permission.RECORD_AUDIO');
  assert.ok(mic.every((p) => p.$['tools:node'] === 'remove'), 'RECORD_AUDIO is still asked for');
});

test('the iPhone build has no microphone or speech explanation', () => {
  const plist = cfg._internal.modResults.ios.infoPlist;
  assert.equal(typeof plist.NSMicrophoneUsageDescription, 'undefined');
  assert.equal(typeof plist.NSSpeechRecognitionUsageDescription, 'undefined');
});

test('no speech add-on in the app', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.dependencies['expo-speech-recognition'], undefined);
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const names = app.expo.plugins.map((p) => (typeof p === 'string' ? p : p[0]));
  assert.ok(!names.includes('expo-speech-recognition'));
});
