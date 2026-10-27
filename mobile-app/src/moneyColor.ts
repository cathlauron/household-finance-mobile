// 2026-10-22 (Cath: "grey when zero"): money totals drawn in red (still to pay, owed,
// spent, bought, money out) are grey when they're zero. Red only when there's actually
// something. Zero means zero after rounding to centavos.
export function isZeroAmount(amount: number): boolean {
  return !Number.isFinite(amount) || Math.round(amount * 100) === 0;
}
export function redUnlessZero(amount: number, colors: { negative: string; inkDim: string }): string {
  return isZeroAmount(amount) ? colors.inkDim : colors.negative;
}

// 2026-10-23 (Cath: "yes" to grey for green and blue zero amounts too): any coloured money
// amount (money in, saved, planned, owed to you) is grey when it's zero.
export function toneUnlessZero(amount: number, color: string, colors: { inkDim: string }): string {
  return isZeroAmount(amount) ? colors.inkDim : color;
}
