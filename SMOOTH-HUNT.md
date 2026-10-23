# Smoothness findings

How things move in Finance Flow, checked by Claude (see
`.claude/skills/finance-flow-smoothness-check/SKILL.md`). Ids S-NN. Started 2026-10-23.

## Fixed

- S-01 Search drop-down, offline banner and swipe-row hint ignored Reduce Motion. Fixed
  2026-10-23 (BUG-LOG S-01).
- Sub-pages switched instantly (To-Pay, Savings, Groceries, Events, Travel). Now they
  follow your finger (Cath's pick B), 2026-10-23.
- Swiping past Loans jumped to Plan, past Bills to Transactions, while Savings stopped:
  now every page stops with a soft bounce (Cath's choice), 2026-10-23.
- Switcher highlights jumped: now they glide everywhere, 2026-10-23.
- Money totals jumped to new values: now they count quickly (Left to Spend, Bills, Debts,
  Loans, Savings), 2026-10-23.

## Waiting for Cath's decision

- S-04 The bottom tabs slide after you let go; sub-pages now follow your finger. Should the
  bottom tabs follow your finger too? (certain; noticeable)
- S-05 Search drops down with its own curve (0.22, 1, 0.36, 1) and speeds (300 / 200 ms),
  unlike everything else (0.32, 0.72, 0, 1). Keep it or match? (certain; subtle)
- S-06 "Loans: Borrowed / Lent" was picked to slide, but that switch is inside the New loan
  form (only labels and colours change), not a page. It glides its highlight like other
  form switchers. OK? (certain)
- S-07 Zero amounts drawn in GREEN stay green at ₱0.00 (e.g. Loans "Owed to you (lent)",
  Savings totals), because the zero-grey decision covered red totals. Grey for these too?
  (certain; cosmetic)

## Noticed, not about motion (for the bug hunt list)

- As a guest, adding your first item shows the "Keep your first entry safe" sheet while the
  list behind it still looks empty; the item appears after "Not now". (seen on the emulator
  2026-10-22; likely; cosmetic)
- Hidden browser only: tapping "No trips yet" on an empty Travel page doesn't open the form
  (same before these changes; works on Cath's phone).

## Needs your phone

- The feel of the finger-following swipe, the glide and the count (speed, smoothness).
- Android: the switcher labels sit above the gliding highlight (Android draws raised
  things on top; handled, but only a phone shows it).
- Bill / Debt / Loan switch inside New bill: whether the highlight glides when the form
  hands over to the other kind.
