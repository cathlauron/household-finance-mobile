import CryptoJS from 'crypto-js';

// Version 2.2 (Cath chose "best of both" for opening speed, Oct 20): the slow
// "stretch the password into the key" step (PBKDF2, HMAC-SHA256) can be done by the
// phone itself, which is about a hundred times faster than JavaScript. The installed
// app has that native part (modules/ff-crypto); Expo Go doesn't, so it keeps using
// the JavaScript version (crypto-js), exactly as before.
//
// Safety: the phone's version is only used after it gives exactly the same key as the
// JavaScript version for a test password (checked once per app start). If it doesn't,
// or anything about it fails, the JavaScript version is used. Same password + salt +
// count always gives the same key either way, so nothing already saved changes.
//
// This file has no Expo imports so the tests can run it with a stand-in native part.

export type NativeKeyMaker = {
  pbkdf2Sha256(passwordBase64: string, saltBase64: string, iterations: number, keyLength: number): string;
};

const KEY_BYTES = 32; // 256-bit key, same as keySize 8 words in crypto-js

function jsDerive(password: string, salt: CryptoJS.lib.WordArray, iterations: number): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(password, salt, { keySize: KEY_BYTES / 4, iterations, hasher: CryptoJS.algo.SHA256 });
}

function nativeDerive(native: NativeKeyMaker, password: string, salt: CryptoJS.lib.WordArray, iterations: number): CryptoJS.lib.WordArray | null {
  // The same bytes crypto-js uses for a text password (UTF-8).
  const passwordBytes = CryptoJS.enc.Utf8.parse(password);
  if (passwordBytes.sigBytes === 0) return null; // the phone's HMAC refuses an empty key
  const out = native.pbkdf2Sha256(
    CryptoJS.enc.Base64.stringify(passwordBytes),
    CryptoJS.enc.Base64.stringify(salt),
    iterations,
    KEY_BYTES
  );
  if (typeof out !== 'string' || !out) return null;
  const key = CryptoJS.enc.Base64.parse(out);
  return key.sigBytes === KEY_BYTES ? key : null;
}

// One-time check: does the phone's version give exactly the JavaScript key?
function nativeMatches(native: NativeKeyMaker): boolean {
  try {
    const password = 'Finance Flow check ñ ✓ 中';
    const salt = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');
    const want = jsDerive(password, salt, 3).toString(CryptoJS.enc.Hex);
    const got = nativeDerive(native, password, salt, 3);
    return !!got && got.toString(CryptoJS.enc.Hex) === want;
  } catch (e) {
    return false;
  }
}

export type KeyDeriver = {
  derive(password: string, salt: CryptoJS.lib.WordArray, iterations: number): CryptoJS.lib.WordArray;
  usingNative(): boolean;
};

export function makeKeyDeriver(loadNative: () => NativeKeyMaker | null): KeyDeriver {
  let checked = false;
  let native: NativeKeyMaker | null = null;
  function getNative(): NativeKeyMaker | null {
    if (checked) return native;
    checked = true;
    try {
      const candidate = loadNative();
      native = candidate && typeof candidate.pbkdf2Sha256 === 'function' && nativeMatches(candidate) ? candidate : null;
    } catch (e) {
      native = null;
    }
    return native;
  }
  return {
    derive(password, salt, iterations) {
      const n = getNative();
      if (n) {
        try {
          const key = nativeDerive(n, password, salt, iterations);
          if (key) return key;
        } catch (e) {
          // fall through to JavaScript
        }
      }
      return jsDerive(password, salt, iterations);
    },
    usingNative() {
      return !!getNative();
    },
  };
}
