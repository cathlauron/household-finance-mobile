import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../src/appVersion.ts';

test('the version the app shows matches app.json', () => {
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  assert.equal(APP_VERSION, app.expo.version);
});

test('the iPhone and Android app IDs are set and the same', () => {
  const { expo } = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  assert.equal(expo.ios.bundleIdentifier, 'com.cathlauron.householdfinance');
  assert.equal(expo.android.package, 'com.cathlauron.householdfinance');
});

test('there is a store build that makes an app bundle (.aab) for Google Play', () => {
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
});

test('iPad: supported, kept upright and full screen like the iPhone (no upload error for a portrait-only iPad app)', () => {
  const { expo } = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  assert.equal(expo.ios.supportsTablet, true);
  assert.equal(expo.orientation, 'portrait');
  assert.equal(expo.ios.requireFullScreen, true);
});

test('EAS Update (Cath, 2026-10-30): updates come from this project, only to builds of the same app version, per build kind', () => {
  const { expo } = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  assert.equal(expo.updates.url, `https://u.expo.dev/${expo.extra.eas.projectId}`);
  assert.deepEqual(expo.runtimeVersion, { policy: 'appVersion' });
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  assert.equal(eas.build.preview.channel, 'preview');
  assert.equal(eas.build.production.channel, 'production');
  assert.notEqual(eas.build['preview-v2'].channel, 'preview', 'the side-by-side test app must not get the main app updates');
});
