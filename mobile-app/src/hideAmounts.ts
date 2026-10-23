import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatPeso } from './balanceProjection';

// Version 3 (approved H1b / H2b): the eye beside "Left to spend" hides the amounts on
// Home, like banking apps do. The ₱ stays and the numbers become *****. Tap the eye
// again to show them. Remembered on this phone (not synced: it's about who might be
// looking at this screen, not about the household).

const KEY = 'hideAmountsV1';
export const HIDDEN_AMOUNT = '₱ *****';

let hidden = false;
let loaded = false;
const listeners = new Set<(v: boolean) => void>();

function setHidden(v: boolean) {
  hidden = v;
  listeners.forEach((l) => l(v));
  AsyncStorage.setItem(KEY, v ? '1' : '0').catch(() => {});
}

// Version 2.2 (canvas S2): nobody answered "Are you still there?", so the amounts hide.
export function hideAmountsNow() {
  setHidden(true);
}

export function useHideAmounts(): { hidden: boolean; toggle: () => void; money: (n: number, opts?: { noCents?: boolean }) => string } {
  const [value, setValue] = useState(hidden);
  useEffect(() => {
    listeners.add(setValue);
    if (!loaded) {
      loaded = true;
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          if (raw === '1' && !hidden) {
            hidden = true;
            listeners.forEach((l) => l(true));
          }
        })
        .catch(() => {});
    } else if (value !== hidden) {
      setValue(hidden);
    }
    return () => {
      listeners.delete(setValue);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return {
    hidden: value,
    toggle: () => setHidden(!hidden),
    money: (n, opts) => (value ? HIDDEN_AMOUNT : opts?.noCents ? formatPeso(n).replace('.00', '') : formatPeso(n)),
  };
}
