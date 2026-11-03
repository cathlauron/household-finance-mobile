import { useCallback, useEffect, useMemo, useState } from 'react';
import { dateText } from './dateUtils';
import { useToday } from './useToday';
import { getOverdueItems, OverdueItem } from './overdue';
import { usePendingRecovery } from './usePendingRecovery';
import { loadBellRead, markBellRead, markAllBellRead, pruneBellRead } from './bellReadState';
import { getUpcomingDue } from './screens/DashboardScreen';
import { tripItemsDue } from './tripDue';

export type BellDue = {
  type: 'bill' | 'debt' | 'loan' | 'trip';
  id?: string;
  tripId?: string; // trip items due (H-63, 2026-11-03): tapping opens the trip
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

  // H-09: worked out again when the date changes, not only when the data does.
  const today = useToday();
  const overdue = useMemo(() => (model ? getOverdueItems(model) : []), [model, today]);
  const dueSoon = useMemo(() => (model ? getUpcomingDue(model, 14) : []), [model, today]);
  // H-63 (Cath, 2026-11-03): trip items with a due date in the next 14 days (or past due).
  const tripsDue = useMemo(() => {
    if (!model) return [];
    const in14 = localISO(new Date(Date.now() + 14 * 86400000));
    return tripItemsDue(model).filter((d) => d.dueDate <= in14);
  }, [model, today]);

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
        subtitle: `Due ${dateText(d.date)}`,
        due: { type: d.type, id: d.id, amount: d.amount, date: d.date },
      });
    });
    tripsDue.forEach(d => {
      const date = new Date(d.dueDate + 'T00:00:00');
      list.push({
        group: 'due',
        key: `due:trip:${d.itemId}:${d.dueDate}`,
        title: d.title,
        subtitle: `${d.tripName} trip · ${d.dueDate < localISO(new Date()) ? 'Was due' : 'Due'} ${dateText(date)}`,
        due: { type: 'trip', id: d.itemId, tripId: d.tripId, amount: d.amount, date },
      });
    });
    return list;
  }, [request, requestId, overdue, dueSoon, tripsDue]);

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
  const markAllRead = useCallback(() => {
    const keys = items.map(i => i.key);
    if (keys.length === 0) return;
    setRead(prev => Array.from(new Set([...prev, ...keys])));
    markAllBellRead(username, keys).then(next => { if (next.length) setRead(next); });
  }, [items, username]);

  return { items, unreadCount, isRead, markRead, markAllRead };
}
