import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useData } from './DataContext';
import { buildClaudeSummary } from './claudeSummary';
import { applyQueue } from './claudeQueue';
import { claudeLinkOn, currentUid, deleteClaudeQueueEntries, onClaudeLinkChange, readClaudeQueue, writeClaudeSummary } from './claudeLink';
import { trace } from './trace';

// Claude connector (Cath, 2026-11-28): while it's switched on, shares the summary a moment after
// the household changes, and adds what Claude queued when the app opens or comes back.
const SETTLE_MS = 4000; // not a motion: waits for a burst of saves to finish
export default function ClaudeLinkSync() {
  const { model, saveModel, waitForSaves, username, guest, isOnline } = useData();
  const [on, setOn] = useState(false);
  const [wake, setWake] = useState(0);
  const lastSent = useRef('');
  const pulling = useRef(false);
  const latest = useRef(model);
  latest.current = model;

  useEffect(() => {
    let alive = true;
    const check = () => {
      if (!username || guest) return setOn(false);
      claudeLinkOn(username).then((v) => alive && setOn(v));
    };
    check();
    const off = onClaudeLinkChange(() => {
      lastSent.current = '';
      check();
    });
    return () => {
      alive = false;
      off();
    };
  }, [username, guest]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setWake((n) => n + 1));
    return () => sub.remove();
  }, []);

  // Summary
  useEffect(() => {
    if (!on || !model || !isOnline) return;
    const t = setTimeout(() => {
      const uid = currentUid();
      if (!uid) return;
      const summary = buildClaudeSummary(model);
      const text = JSON.stringify(summary);
      if (text === lastSent.current) return;
      writeClaudeSummary(uid, summary)
        .then(() => {
          lastSent.current = text;
          trace('claude', 'summary shared');
        })
        .catch(() => {});
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [on, model, isOnline, wake]);

  // Queue: on switching on, on opening and on coming back.
  const haveModel = !!model;
  useEffect(() => {
    if (!on || !haveModel || !isOnline || pulling.current) return;
    const uid = currentUid();
    if (!uid) return;
    pulling.current = true;
    (async () => {
      try {
        const entries = await readClaudeQueue(uid);
        const current = latest.current;
        if (!entries.length || !current) return;
        const { model: next, done } = applyQueue(current, entries, new Date(), username || '');
        if (next) {
          await saveModel(next);
          // Deleted only once the save is finished, so nothing is lost if the app closes now.
          // An entry is never added twice (its transaction id comes from the queue id).
          await waitForSaves();
        }
        if (done.length) await deleteClaudeQueueEntries(uid, done);
        trace('claude', `queue: ${done.length} picked up`);
      } catch {
        // Tried again next time the app opens.
      } finally {
        pulling.current = false;
      }
    })();
  }, [on, haveModel, isOnline, wake, saveModel, waitForSaves, username]);

  return null;
}
