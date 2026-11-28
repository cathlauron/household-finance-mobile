// Claude connector (Cath, 2026-11-28). Off unless switched on in Settings › Claude, per phone
// and per account. When on:
//   claudeLinks/{uid}            the unlocked summary (claudeSummary.ts), rewritten after changes
//   claudeLinks/{uid}/queue/{id} entries Claude added (written only by the connector), which
//                                this phone adds as "To review" transactions, then deletes
// Turning it off deletes the summary straight away. Nothing else in Firebase changes.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { withTimeout } from './DataContext';
import type { ClaudeSummary } from './claudeSummary';
import type { QueueEntry } from './claudeQueue';

const storeKey = (username: string) => `claudeLink:on:${username}`;
const listeners = new Set<() => void>();

export async function claudeLinkOn(username: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storeKey(username))) === '1';
  } catch {
    return false;
  }
}

export function onClaudeLinkChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function currentUid(): string | null {
  return auth.currentUser?.uid ?? null;
}

export async function setClaudeLinkOn(username: string, on: boolean): Promise<void> {
  if (on) await AsyncStorage.setItem(storeKey(username), '1');
  else {
    // The summary is deleted first: if that fails (no internet), it stays on so she can retry.
    const uid = currentUid();
    if (uid) await withTimeout(deleteDoc(doc(db, 'claudeLinks', uid)), 8000, 'Timed out turning off Claude.');
    await AsyncStorage.removeItem(storeKey(username));
  }
  listeners.forEach((fn) => fn());
}

export async function writeClaudeSummary(uid: string, summary: ClaudeSummary): Promise<void> {
  await withTimeout(
    setDoc(doc(db, 'claudeLinks', uid), { summary, updatedAt: Date.now(), v: summary.v }),
    8000,
    'Timed out sharing the summary with Claude.'
  );
}

export async function readClaudeQueue(uid: string): Promise<QueueEntry[]> {
  const snap = await withTimeout(getDocs(query(collection(db, 'claudeLinks', uid, 'queue'), limit(50))), 8000, 'Timed out reading Claude entries.');
  return snap.docs.map((d) => ({ ...(d.data() as Omit<QueueEntry, 'id'>), id: d.id }));
}

export async function deleteClaudeQueueEntries(uid: string, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => withTimeout(deleteDoc(doc(db, 'claudeLinks', uid, 'queue', id)), 8000, 'Timed out clearing a Claude entry.')));
}
