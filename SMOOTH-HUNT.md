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

- S-12 "Add an account" (and Edit sheets that wait for a page) never opened when the app
  never counted as settled. Now 1 s at the latest (2026-10-23).
- S-13 / S-14 (Cath's recording + red error, 2026-10-26): opening any page showed a still
  copy of the app on Home behind the slide. The whole-screen dip's curve was inside
  interpolate(), which the phone refuses, so the old screen was never removed. Now the
  curve is written as points and the old screen is removed by the clock too.
  CORRECTION (same day): that fixed the red error but was NOT the overlap. The motion
  reviewer agent disagreed, and was right (proven with the real navigation library): "go to
  Main" from a page on top stacked a SECOND copy of the tabs (after a calendar add, search
  result, card page, Review, reminder tap). The old copy, on Home, showed through every
  sliding page. Now every place goes BACK to the one Main (goToMain).
- S-15 (Cath's screenshot, 2026-10-26): switchers drew a shadowed box around every label
  on Android. Back to the approved look (one white pill), same glide.

- S-16 (sweep 2026-10-26) Main-tab finger swipe lagged behind the finger when the app was
  busy (every move went through JavaScript). Now it moves on the animation thread.
- S-17 (sweep, jank reviewer) Every save redrew the whole app, hidden tabs and open pages
  included. Now only what changed redraws (proven: __tests__/NoRedrawOnSave).
- S-18 (sweep) All tabs were pre-built at once just after opening (short freeze). Now one
  at a time, nearest first.
- S-19 (sweep) Saving (encrypting) ran in the middle of the slide after + Add. Now it waits
  until the slide is done (still saves at once when the app is put away or you log out).
- S-20 (sweep) The Transactions list built the whole history at once. Now the newest two
  months first, older days a moment later.
- S-21 (sweep) Calendar opened with the default layout, then redrew with yours. Now yours
  from the start. Home's rain stops while Home isn't showing.
- Code review of the sweep (2026-10-27, independent agent): 1 real bug fixed (going back to
  the tabs wiped a reminder's bill and rebuilt all tabs), 2 swipe guards and 1 list detail
  added. Its other checks found the sweep sound.
- Still open (bigger changes, Claude's suggestion, not urgent): pop-up forms are fully built
  before they start rising (a short pause on big forms); dragging a pop-up down to close
  still goes through JavaScript; the pop-up jumps up after the keyboard opens.

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

## 3.1 (2026-10-27, night)
- Done: pop-up sheets glide up for the keyboard (and back down) instead of jumping
  (BottomSheet keyboard listeners use the shared row glide). Needs your phone; a reviewer
  noted it now finishes a moment after the keyboard is fully up.
- Not done, by choice (asked Cath in the 3.1 report): pop-up drag-down still runs through
  JavaScript, and big forms are built before they rise. Both need BottomSheet rebuilt on
  the animation library (the most-used piece of the app), a bigger and riskier change.
