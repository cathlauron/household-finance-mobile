import { useEffect, useState } from 'react';
import { getCurrentFirebaseUser } from './authFirebase';
import { loadProfilesIndex } from './storage';
import { subscribeToHousehold } from './household';
import { getPeerRecoveryRequest, PeerRecoveryRequestDoc } from './recovery';

// Watches the household for a pending peer-recovery request from ANOTHER member.
// Used by the bell. ProfileScreen keeps its own separate listener.
export function usePendingRecovery(username: string | null | undefined): {
  request: PeerRecoveryRequestDoc | null;
  requestId: string | null;
} {
  const [request, setRequest] = useState<PeerRecoveryRequestDoc | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!username) {
      setRequest(null);
      setRequestId(null);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const profiles = await loadProfilesIndex();
        const profile = profiles.find(p => p.username === username);
        const householdId = profile?.householdId;
        if (!householdId || !active) {
          setRequest(null);
          setRequestId(null);
          return;
        }
        const currentUid = getCurrentFirebaseUser()?.uid;

        unsubscribe = subscribeToHousehold(
          householdId,
          snapshotData => {
            if (!active) return;
            const pendingId = snapshotData ? snapshotData.pendingRecoveryRequestId : null;
            if (!pendingId) {
              setRequest(null);
              setRequestId(null);
              return;
            }
            getPeerRecoveryRequest(pendingId)
              .then(req => {
                if (!active) return;
                if (req && req.status === 'pending' && req.requesterUid !== currentUid) {
                  setRequest(req);
                  setRequestId(pendingId);
                } else {
                  setRequest(null);
                  setRequestId(null);
                }
              })
              .catch(() => {});
          },
          () => {
            if (!active) return;
            setRequest(null);
            setRequestId(null);
          }
        );
      } catch {
        if (active) {
          setRequest(null);
          setRequestId(null);
        }
      }
    })();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
  }, [username]);

  return { request, requestId };
}
