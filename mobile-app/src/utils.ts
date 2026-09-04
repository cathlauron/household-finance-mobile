// ============================================================
// Household Finance App — Shared utility helpers
// ============================================================

export function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
