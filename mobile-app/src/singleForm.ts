import { useEffect, useRef } from 'react';

// Version 2.2 fix (Cath: "after Add I'm still on an empty debt form"): only ONE add/edit
// form of a kind may be open at a time, app-wide. If a second copy of the list ever
// tries to open its form while one is already showing, it is ignored, so Save can never
// land on an empty duplicate form and overwrite the real one.
const owners = new Map<string, symbol>();

export function useSingleForm(kind: string) {
  const me = useRef(Symbol(kind)).current;
  useEffect(
    () => () => {
      if (owners.get(kind) === me) owners.delete(kind);
    },
    [kind, me]
  );
  return {
    // true = this list may open its form now
    claim(): boolean {
      const cur = owners.get(kind);
      if (cur && cur !== me) return false;
      owners.set(kind, me);
      return true;
    },
    release() {
      if (owners.get(kind) === me) owners.delete(kind);
    },
  };
}
