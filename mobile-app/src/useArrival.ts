// Version 2.2 (approved P4): when a new entry appears in a list (a transaction, a bill, a
// pot, a trip item...), the rows below move down smoothly instead of jumping (a quarter
// of a second), and the new row glows pale green for a moment so your eye lands on it.
// Only for entries added while you're looking: opening a screen or switching months
// doesn't animate. Nothing moves when the phone is set to remove animations.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import { reduceMotionNow } from './reduceMotion';
import { takeExpectedArrival } from './arrivalFocus';
import { usePageActive } from './pageActive';

const ARRIVE = {
  duration: 280,
  create: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeOut },
  delete: { type: LayoutAnimation.Types.easeOut, property: LayoutAnimation.Properties.opacity },
};

const GLOW_MS = 1700;

// ids: the ids shown in the list right now. Returns the id that just arrived (for its
// glow), or null.
// kind: which list this is ('bills', 'debts', 'loans', 'txn'), so an add made from
// somewhere else is found too (see arrivalFocus.ts).
export function useArrival(ids: string[], kind?: string): string | null {
  const prev = useRef<Set<string> | null>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const key = useMemo(() => ids.join('|'), [ids]);
  // Smoothness 2026-10-23: on a sub-page you can't see, the list remembers what it last
  // showed and lights up what's new once its page slides into view.
  const showing = usePageActive();

  // Worked out during render (from the list as it was last shown) so the move animates
  // in this same update. The previous list is only updated after the screen shows it.
  const arrived = useMemo(() => {
    if (!showing) return null;
    const before = prev.current;
    // Just opened (or opened again) after an add made elsewhere: the new one still slides in.
    if (!before) {
      const expected = kind ? takeExpectedArrival(kind, ids) : null;
      if (expected && !reduceMotionNow()) LayoutAnimation.configureNext(ARRIVE);
      return expected;
    }
    if (kind) takeExpectedArrival(kind, ids);
    const fresh = ids.filter((id) => !before.has(id));
    // One or two new rows = something was just added. Many at once = a month switch or
    // a sync, which shouldn't animate.
    if (fresh.length === 0 || fresh.length > 2) return null;
    if (!reduceMotionNow()) LayoutAnimation.configureNext(ARRIVE);
    return fresh[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, showing]);

  // Code review fix: the glow always goes away, even when the list changes again (another
  // add, a delete) before it has faded. Before, it could stay stuck on a row.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!showing) return;
    prev.current = new Set(ids);
    if (!arrived) return;
    setGlow(arrived);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setGlow((g) => (g === arrived ? null : g));
    }, GLOW_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, showing]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return glow;
}
