import AsyncStorage from '@react-native-async-storage/async-storage';

// Version 2.2 (Cath: the invite sent through Messenger had no link): an invite link opens
// a small web page (hosting/join.html) whose "Open Finance Flow" button opens the app with
// financeflow://join/ABC123. The code waits here until the Household page picks it up
// (straight away when signed in, or after signing in). It's dropped after 15 minutes,
// the same as the code itself.

const KEY = 'join-link:pending';
const KEEP_MS = 15 * 60 * 1000;

export const INVITE_PAGE = 'https://household-finance-mobile.web.app/join';

// Reads a code out of whatever the camera or a link gave (our QR, a link, or just the 6 letters).
export function codeFromScan(data: string): string | null {
  const m = (data || '').toUpperCase().match(/([A-HJ-NP-Z2-9]{6})\s*\/?\s*$/);
  return m ? m[1] : null;
}

// The invite link: the web page, with the code, the inviter's first name and when the code
// was made after "#" (a browser never sends that part anywhere; the page reads it itself).
export function inviteLink(code: string, fromName?: string, madeAt?: number | null): string {
  const parts = [`c=${encodeURIComponent(code)}`];
  if (fromName) parts.push(`n=${encodeURIComponent(fromName.trim().split(/\s+/)[0].slice(0, 30))}`);
  if (madeAt) parts.push(`t=${Math.round(madeAt)}`);
  return `${INVITE_PAGE}#${parts.join('&')}`;
}

// The code from a link like financeflow://join/ABC123 (or the web page's own address).
export function joinCodeFromUrl(url: string | null | undefined): string | null {
  if (!url || !/join/i.test(url)) return null;
  const hash = url.match(/[#&]c=([A-Za-z0-9]{6})/);
  if (hash) return hash[1].toUpperCase();
  return codeFromScan(url.split('#')[0].split('?')[0]);
}

let pending: { code: string; at: number } | null = null;
const listeners = new Set<() => void>();

export function setPendingJoinCode(code: string) {
  pending = { code, at: Date.now() };
  AsyncStorage.setItem(KEY, JSON.stringify(pending)).catch(() => {});
  listeners.forEach((fn) => fn());
}

// Takes the waiting code (once). Null when none, or when it's older than 15 minutes.
export async function takePendingJoinCode(): Promise<string | null> {
  let p = pending;
  if (!p) {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      p = raw ? JSON.parse(raw) : null;
    } catch (e) {
      p = null;
    }
  }
  pending = null;
  AsyncStorage.removeItem(KEY).catch(() => {});
  if (!p || typeof p.code !== 'string' || Date.now() - (p.at || 0) > KEEP_MS) return null;
  return p.code;
}

export function onPendingJoinCode(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
