// H-14 (2026-10-22): Settings saves a typed number a moment after you stop typing. An
// empty box used to count as "0", so clearing the box to type a new number and pausing
// saved 0 (and showed "0" in the box while you were still typing). The pause-save now
// waits while the box is empty; leaving the box still saves as before.
export function readyToAutoSave(input: string): boolean {
  return input.trim() !== '';
}
