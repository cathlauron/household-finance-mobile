import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOverdueItems, OverdueItem } from './overdue';
import { usePendingRecovery } from './usePendingRecovery';
import { loadBellRead, markBellRead, pruneBellRead } from './bellReadState';
import { getUpcomingDue } from './screens/DashboardScreen';

export type BellDue = {
  type: 'bill' | 'debt' | 'loan';
  id?: string;
  amount: number;
  date: Date;
};

export type BellItem =
  | { group: 'recovery'; key: string; title: string; subtitle: string }
  | { group: 'overdue'; key: string; title: string; subtitle: string; overdue: OverdueItem }
  | { group: 'due'; key: string; title: string; subtitle: string; due: BellDue };

// Local YYYY-MM-DD (not toISOString, which is UTC).
function localISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function useBellInbox(username: string, model: any) {
  const { request, requestId } = usePendingRecovery(username);
  const [read, setRead] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    loadBellRead(username).then(r => { if (active) setRead(r); });
    return () => { active = false; };
  }, [username]);

  const overdue = useMemo(() => (model ? getOverdueItems(model) : []), [model]);
  const dueSoon = useMemo(() => (model ? getUpcomingDue(model, 14) : []), [model]);

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
    dueSoon.forEach(d => {
      list.push({
        group: 'due',
        key: `due:${d.type}:${d.id || d.label}:${localISO(d.date)}`,
        title: d.label,
        subtitle: `Due ${d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        due: { type: d.type, id: d.id, amount: d.amount, date: d.date },
      });
    });
    return list;
  }, [request, requestId, overdue, dueSoon]);

  // Drop read marks for overdue/due items that no longer exist. Recovery marks are
  // left alone, because the recovery request loads later than the other lists.
  const validKeysJoined = items.filter(i => i.group !== 'recovery').map(i => i.key).join('|');
  useEffect(() => {
    if (!model) return;
    const valid = [
      ...items.filter(i => i.group !== 'recovery').map(i => i.key),
      ...read.filter(k => k.startsWith('recovery:')),
    ];
    pruneBellRead(username, valid).then(next => {
      if (next.length !== read.length) setRead(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validKeysJoined, username, !!model]);

  const isRead = useCallback((key: string) => read.includes(key), [read]);
  const markRead = useCallback(
    (key: string) => { markBellRead(username, key).then(setRead); },
    [username]
  );
  const unreadCount = items.filter(i => !read.includes(i.key)).length;

  return { items, unreadCount, isRead, markRead };
}
