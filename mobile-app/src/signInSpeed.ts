// K5 (Cath, 2026-10-27: "I would like to physically check first how the sign-in speed
// would be"): times the password step at today's strength and at the two stronger ones,
// on this phone, with a made-up password (nothing of yours is used or saved).
import CryptoJS from 'crypto-js';
import { keyDeriver } from './fastCrypto';

export const SPEED_ROUNDS = [100000, 310000, 600000];

export type SpeedResult = { rounds: number; ms: number }[];

export function measureSignInSpeed(): { results: SpeedResult; fast: boolean } {
  const salt = CryptoJS.lib.WordArray.random(16);
  // A first short run so the timing isn't thrown off by warming up.
  keyDeriver.derive('warm-up', salt, 1000);
  const results = SPEED_ROUNDS.map((rounds) => {
    const t0 = Date.now();
    keyDeriver.derive('a made-up password 123', salt, rounds);
    return { rounds, ms: Date.now() - t0 };
  });
  return { results, fast: keyDeriver.usingNative() };
}

export function speedText(r: { results: SpeedResult; fast: boolean }): string {
  const s = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
  const [today, mid, strong] = r.results;
  return (
    `Today (100,000): ${s(today.ms)}\n310,000: ${s(mid.ms)}\n600,000: ${s(strong.ms)}\n\n` +
    'This is the extra wait only when you type your password (signing in, the lock screen with ' +
    'your password, changing it). Opening the app, fingerprint and PIN don\'t change.' +
    (r.fast ? '' : '\n\nThis is the slow test version of the app (Expo Go). Check again in the installed app for the real numbers.')
  );
}
