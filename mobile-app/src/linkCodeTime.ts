// How long an unfinished invite code still has (B-016: a code stayed on Household long
// after its 15 minutes). A code without a start time counts as finished (-1).
export function codeTimeLeft(at: unknown, ttlMs: number, now: number = Date.now()): number {
  return typeof at === 'number' ? at + ttlMs - now : -1;
}
