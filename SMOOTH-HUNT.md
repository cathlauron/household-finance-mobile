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

- 2026-10-23 (smoothness 2): S-04 bottom tabs follow your finger; S-05 Search uses the
  house curve; S-06 I borrowed / I lent changes the form like Bill / Debt / Loan; S-07 every
  coloured zero amount is grey (Cath's answers, batch B).
- S-08 Whole screens (welcome, set-up, sign-in, unlock, Home) changed with a blank blink.
  Now one soft dip: old fades out, new fades in, meeting in the middle (one animation;
  with two in a row the screen sat empty for 130-150 ms). Locking stays instant.
- S-09 Set-up steps swapped instantly. Now they slide like opening a page (Cath).
- S-10 Bill / Debt / Loan in the + form, and I borrowed / I lent: the fields swapped at
  once and the pop-up's top edge jumped to the new height. Now the highlight glides, the
  fields fade out and in, and the pop-up glides to its new height (Cath).
- S-11 Finger swipe between main tabs: the next tab came in EMPTY (not built yet), and at
  let-go two or three pages overlapped for a frame. Now the next tab is always built
  (1.5 s at the latest) and positions are set before the screen draws.

## Screen by screen, 2026-10-23 (hidden browser, frame recorder + by eye)

Clean (no flicker, no blank moment, no overlap, fades smooth):
- Welcome slides, set-up steps 1-4 (slide), set-up to Home (dip).
- Home: hide amounts (numbers change in place), calendar rises (one dropped first frame,
  web only), Settings (page slide; guest gate), Accounts and back, the Left to Spend card
  swipe (its wobble was the recorder's out-of-order frames).
- Tabs: tapping each tab (slide), finger swipes Home > Transactions > To-Pay > Plan and back.
- Transactions: sort (word changes in place), Search drops down over the page (allowed).
- To-Pay: Bills / Debts / Loans (finger, tap, bounce), Bill / Debt / Loan and I borrowed /
  I lent in the + form (fade + height glide).
- Plan: Savings, Yearly Goals, Shared Expenses, Groceries, Travel, Events open and go back
  (side by side, checked at full size); Savings Pots / Emergency / FI, Groceries List /
  Calculator / Meal ideas, Events Upcoming / Done (tap and finger, bounce at the end).
- Dark mode: instant, as Cath chose.

Could not be checked here (stays "Needs your phone"):
- Pop-ups opening and closing: this browser never shows a pop-up while it records frames
  or takes pictures, and never opens a second pop-up after closing one (the old version
  does exactly the same, so it isn't new). Forms, the bell and Add were checked opening
  without recording.
- Lock / unlock, PIN, fingerprint, sign-in (guest mode only here).
- A transaction's or a bill's own page (their forms are pop-ups; the page slide is the same
  one every other page uses).
- Small: opening Search, the tab bar's labels fade a moment after the rest of the page.

## Waiting for Cath's decision

- Nothing waiting (S-04 to S-07 answered 2026-10-23, see Fixed).

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
