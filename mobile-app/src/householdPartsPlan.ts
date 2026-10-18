// Version 2.1, storage step 2: groups part writes into Firestore batches that stay under
// its limits (500 writes and about 10 MiB per batch). Kept separate from Firestore so it
// can be tested on its own (tests/householdPartsPlan.test.mjs).

// The most one encrypted part may be (Firestore allows 1 MiB per document; this leaves
// room for the field names and timestamps). Same limit as the storage meter.
export const PART_LIMIT_CHARS = 1_000_000;
export const BATCH_MAX_WRITES = 400;
export const BATCH_MAX_CHARS = 8_000_000;

export type PlannedWrite = { id: string; size: number };

export function planBatches(items: PlannedWrite[]): PlannedWrite[][] {
  const batches: PlannedWrite[][] = [];
  let cur: PlannedWrite[] = [];
  let curSize = 0;
  for (const item of items) {
    if (cur.length > 0 && (cur.length >= BATCH_MAX_WRITES || curSize + item.size > BATCH_MAX_CHARS)) {
      batches.push(cur);
      cur = [];
      curSize = 0;
    }
    cur.push(item);
    curSize += item.size;
  }
  if (cur.length > 0) batches.push(cur);
  return batches;
}
