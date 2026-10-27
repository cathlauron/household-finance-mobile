import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swapPlan } from '../src/screenSwap.ts';

// Smoothness 2026-10-23 (Cath): whole-screen changes fade out then in (no blank blink);
// locking is instant so nobody glimpses the numbers.
test('welcome, set-up, sign-in, unlocking and onboarding fade', () => {
  for (const [a, b] of [['welcome', 'setup'], ['setup', 'guest'], ['signIn', 'home'], ['locked', 'home'], ['onboarding', 'home'], ['intro', 'welcome'], ['loading', 'home']]) {
    assert.equal(swapPlan(a, b, false), 'fade', `${a} -> ${b}`);
  }
});
test('locking is instant, from anywhere', () => {
  assert.equal(swapPlan('home', 'locked', false), 'instant');
  assert.equal(swapPlan('onboarding', 'locked', false), 'instant');
});
test('leaving the money screens (sign out, switch account, guest sign-up) is instant', () => {
  assert.equal(swapPlan('home', 'signIn', false), 'instant');
  assert.equal(swapPlan('home', 'switcher', false), 'instant');
  assert.equal(swapPlan('guest', 'guestSignUp', false), 'instant');
});
test('with the phone set to remove animations everything is instant', () => {
  assert.equal(swapPlan('welcome', 'setup', true), 'instant');
});
