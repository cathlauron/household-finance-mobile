// D.4: shared design tokens for border radius and spacing (padding/margin/gap).
//
// These are NOT a new opinionated scale — they were reverse-engineered from an audit of
// what's already in real, consistent use across the app's existing StyleSheet.create(...)
// blocks (see PROGRESS6.md's D.4 entry for the investigation this came from). The goal is
// to give future code one place to reference these values by name instead of typing a bare
// number — not to change how anything currently looks.
//
// Existing screens are NOT migrated to use these as part of this checkpoint — that's a
// separate, later pass. This file only makes the tokens available going forward.
//
// Usage: `padding: spacing[16]`, `borderRadius: radii[10]`, `borderRadius: radii.pill`.

export const radii = {
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  pill: 999,
} as const;

export const spacing = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  40: 40,
} as const;