// K5 (Cath's OK, 2026-10-27): a tamper check for saved data ("encrypt-then-MAC").
//   f2:<iv hex>:<ciphertext base64>:<check hex>
// The same AES as before, but with its own key, plus an HMAC-SHA256 check over everything,
// with another key. Both keys come from the existing key, so nothing new is stored.
// Changing even one letter of saved data makes the check fail and nothing is opened.
// 3.2 only READS this kind; writing it is switched on once every phone in use runs 3.2+.
// Only CryptoJS here (no phone modules), so the automatic checks can run it directly.
import CryptoJS from 'crypto-js';

export const V2_PREFIX = 'f2:';

function subKey(key: CryptoJS.lib.WordArray, label: string): CryptoJS.lib.WordArray {
  return CryptoJS.HmacSHA256(label, key);
}

function check(macKey: CryptoJS.lib.WordArray, ivHex: string, ct: string, aad: string): string {
  return CryptoJS.HmacSHA256(`${V2_PREFIX}${ivHex}:${ct}|${aad}`, macKey).toString(CryptoJS.enc.Hex);
}

// Compares two hex strings without stopping at the first difference.
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isV2Payload(payload: string): boolean {
  return typeof payload === 'string' && payload.startsWith(V2_PREFIX);
}

// ivHex: 16 random bytes as hex (the caller supplies them). aad: optional extra text the
// check covers (e.g. which part this is), so a saved piece can't be swapped for another.
export function sealV2(key: CryptoJS.lib.WordArray, text: string, ivHex: string, aad = ''): string {
  const encKey = subKey(key, 'ff-enc-v2');
  const macKey = subKey(key, 'ff-mac-v2');
  const ct = CryptoJS.AES.encrypt(text, encKey, { iv: CryptoJS.enc.Hex.parse(ivHex) }).toString();
  return `${V2_PREFIX}${ivHex}:${ct}:${check(macKey, ivHex, ct, aad)}`;
}

export function openV2(key: CryptoJS.lib.WordArray, payload: string, aad = ''): string {
  const parts = payload.slice(V2_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [ivHex, ct, mac] = parts;
  const macKey = subKey(key, 'ff-mac-v2');
  if (!sameHex(check(macKey, ivHex, ct, aad), mac)) throw new Error('Could not decrypt — wrong key or the data was changed');
  const encKey = subKey(key, 'ff-enc-v2');
  const text = CryptoJS.AES.decrypt(ct, encKey, { iv: CryptoJS.enc.Hex.parse(ivHex) }).toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Could not decrypt — wrong key or corrupted data');
  return text;
}
