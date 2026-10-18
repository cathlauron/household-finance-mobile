// Version 2.1 (data risk 3): combining two phones' changes instead of the last save
// wiping out the other one.
//
// A three-way merge: `base` is the household as both phones last agreed on it (what this
// phone last loaded or saved), `mine` is this phone's version now, `theirs` is what is
// online now (another phone may have saved in between).
//
//   - Something only one side changed: that change is kept.
//   - Lists of items with an `id` (bills, transactions, debts, payments...) are matched by
//     id: new items from both sides are kept; an item deleted on one side and untouched on
//     the other stays deleted; an item edited on one side and deleted on the other is KEPT
//     (nothing is lost by accident).
//   - The same item changed on both sides: merged field by field, so two different fields
//     both survive. Only when the very same field was changed differently on both phones
//     does this phone's value win (the person saving now).
//
// Pure functions, no Firestore, tested in tests/merge3.test.mjs.

type Json = unknown;

function same(a: Json, b: Json): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

function isPlainObject(v: Json): v is Record<string, Json> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isIdList(...lists: Json[]): boolean {
  let sawItem = false;
  for (const l of lists) {
    if (l === undefined || l === null) continue;
    if (!Array.isArray(l)) return false;
    for (const item of l) {
      if (!isPlainObject(item) || typeof item.id !== 'string') return false;
      sawItem = true;
    }
  }
  return sawItem;
}

function byId(list: Json): Map<string, Json> {
  const m = new Map<string, Json>();
  if (Array.isArray(list)) for (const item of list) m.set((item as { id: string }).id, item);
  return m;
}

function mergeIdLists(base: Json, mine: Json, theirs: Json): Json[] {
  const b = byId(base);
  const m = byId(mine);
  const t = byId(theirs);
  // Order: theirs first (what's online), then anything new from mine in its own order.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const src of [theirs, mine]) {
    if (!Array.isArray(src)) continue;
    for (const item of src) {
      const id = (item as { id: string }).id;
      if (!seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }
  }
  const out: Json[] = [];
  for (const id of order) {
    const hasB = b.has(id);
    const hasM = m.has(id);
    const hasT = t.has(id);
    if (hasM && hasT) {
      out.push(mergeValue(b.get(id), m.get(id), t.get(id)));
    } else if (hasM && !hasT) {
      // Not online: either new on this phone (keep) or deleted by the other phone.
      if (!hasB) out.push(m.get(id));
      else if (!same(m.get(id), b.get(id))) out.push(m.get(id)); // edited here, deleted there: keep
    } else if (!hasM && hasT) {
      // Not on this phone: either new from the other phone (keep) or deleted here.
      if (!hasB) out.push(t.get(id));
      else if (!same(t.get(id), b.get(id))) out.push(t.get(id)); // edited there, deleted here: keep
    }
  }
  return out;
}

export function mergeValue(base: Json, mine: Json, theirs: Json): Json {
  if (same(mine, theirs)) return mine;
  if (same(mine, base)) return theirs;
  if (same(theirs, base)) return mine;
  // Both changed it, differently.
  if (isIdList(base, mine, theirs)) return mergeIdLists(base, mine, theirs);
  if (isPlainObject(mine) && isPlainObject(theirs)) {
    const b = isPlainObject(base) ? base : {};
    const out: Record<string, Json> = {};
    const keys = new Set([...Object.keys(theirs), ...Object.keys(mine)]);
    for (const k of keys) {
      const inM = k in mine;
      const inT = k in theirs;
      const inB = k in b;
      if (inM && inT) out[k] = mergeValue(b[k], mine[k], theirs[k]);
      else if (inM) {
        // Removed online: keep mine only if it's new or changed here.
        if (!inB || !same(mine[k], b[k])) out[k] = mine[k];
      } else if (inT) {
        if (!inB || !same(theirs[k], b[k])) out[k] = theirs[k];
      }
    }
    return out;
  }
  // The very same plain value changed on both phones: the person saving now wins.
  return mine;
}

// Merges whole households. When `base` isn't known (e.g. a very old pending change), an
// empty base is used: nothing is treated as deleted, so nothing is lost; at worst an item
// deleted on one phone comes back and can be deleted again.
export function mergeHouseholds<T>(base: T | null | undefined, mine: T, theirs: T): T {
  return mergeValue(base ?? {}, mine, theirs) as T;
}
