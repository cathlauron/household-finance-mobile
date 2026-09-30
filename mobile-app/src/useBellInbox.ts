import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOverdueItems, OverdueItem } from './overdue';
import { usePendingRecovery } from './usePendingRecovery';
import { loadBellRead, markBellRead, pruneBellRead } from './bellReadState';

export type BellItem =
  | { group: 'recovery'; key: string; title: string; subtitle: string }
  | { group: 'overdue'; key: string; title: string; subtitle: string; overdue: OverdueItem };

export function useBellInbox(username: string, model: any) {
  const { request, requestId } = usePendingRecovery(username);
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadBellRead(username).then(r => { if (active) setRead(r); });
    return () => { active = false; };
  }, [username]);

  const overdue = useMemo(() => (model ? getOverdueItems(model) : []), [model]);

  const items: BellItem[] = useMemo(() => {
    const list: BellItem[] = [];
    if (request && requestId) {
      list.push({
        group: 'recovery',
        key: `recovery:${requestId}`,
        title: `${request.requesterUsername} needs help signing in`,
        subtitle: 'Tap to review the request in Profile',
      });
    }
    overdue.forEach(o => {
      list.push({
        group: 'overdue',
        key: o.key,
        title: o.name,
        subtitle: `Was due ${o.dueDate}`,
        overdue: o,
      });
    });
    return list;
  }, [request, requestId, overdue]);

  // Drop read marks for overdue items that are no longer overdue. Recovery marks are
  // left alone here, because the recovery request loads later than the overdue list.
  const overdueKeysJoined = overdue.map(o => o.key).join('|');
  useEffect(() => {
    if (!model) return;
    const valid = [...overdue.map(o => o.key), ...read.filter(k => k.startsWith('recovery:'))];
    pruneBellRead(username, valid).then(next => {
      if (next.length !== read.length) setRead(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdueKeysJoined, username, !!model]);

  const isRead = useCallback((key: string) => read.includes(key), [read]);
  const markRead = useCallback(
    (key: string) => { markBellRead(username, key).then(setRead); },
    [username]
  );
  const unreadCount = items.filter(i => !read.includes(i.key)).length;

  return { items, unreadCount, isRead, markRead };
}
