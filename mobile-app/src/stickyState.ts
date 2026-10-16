import { useCallback, useState } from 'react';

// Remembers a screen's choice (which tab or section is showing) for as long as the app
// is open, even if that screen is rebuilt. Saving something, a sync, or the app redrawing
// can rebuild a screen; without this it jumped back to its first tab (for example,
// To-Pay going back to Bills after you added a debt or a loan).
const store = new Map<string, unknown>();

export function useStickyState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));
  const set = useCallback(
    (next: T) => {
      store.set(key, next);
      setValue(next);
    },
    [key]
  );
  return [value, set];
}
