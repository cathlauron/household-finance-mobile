---
name: finance-flow-bug-check
description: Use for ANY change to Finance Flow app code (bug fix, tweak or feature), whenever Cath reports something broken, before every batch handed to her, and when she says "bug hunt". Proof before "fixed", every bug becomes a permanent check, Cath's app-wide rules hold everywhere, a full sweep runs before each batch, and Claude asks instead of guessing.
---

# Finance Flow bug check

Cath does not code. Her phone tests are the last line of defence, not the first. Past
sessions told her things were "fixed" when the code only compiled, and fixes quietly broke
other screens. She nearly gave up on the app because of it. This skill exists so that
never happens again. She agreed to it on 2026-10-22 and should never have to ask for it.

Follow every step, every time, in every Claude account. Use the repo's other skills where
they fit (`systematic-debugging`, `test-driven-development`,
`verification-before-completion`), but this file wins where they differ.

## The five rules

1. **"Fixed" has to be proven.** A fix is only "fixed" when a check proves it (rule 2)
   or Claude has seen it work (rule 3). Otherwise say "changed, not yet confirmed".
2. **Every bug becomes a permanent check.** Each bug gets an automatic check that FAILED
   before the fix and PASSES after it. It stays in the project forever and runs with every
   change, so the bug can't come back silently. Log it in `BUG-LOG.md`.
3. **Claude tests before Cath.** Use every way Claude has to try the change itself (see
   "Trying it yourself"). Cath's phone test is the final, relaxed check.
4. **Hunt before she finds it.** In a "bug hunt", go through the app one area at a time
   and write ranked findings to `BUG-HUNT.md` before she ever sees them.
5. **Ask, never guess.** If the right behaviour is unclear, first check Cath's web app
   (`household-finance-app (3).html`, repo root) and the PROGRESS logs. If it's still
   unclear, ask Cath (AskUserQuestion when available). Never "if X do Y, otherwise Z".

## Status words (use exactly these with Cath)

- **Proven**: a check failed before and passes now, and/or Claude saw it working.
- **Changed, not yet confirmed**: code changed, no proof yet. Say why.
- **Needs your phone**: only a real phone can show it (fingerprint, notifications,
  camera, haptics, a real EAS build, two real phones at once). Keep these few and exact.

Never use "should work", "probably", "looks fixed" or "done" without proof.

## Fixing a bug: the steps

1. **Read the real code.** Never trust a progress log, commit message or memory for what
   the code does. Find the root cause, not just the symptom (`systematic-debugging`).
2. **Check the bug log.** Search `BUG-LOG.md` for bugs in the same screen or file. Many
   bugs here are a fix that broke something nearby: list what else uses the same code.
3. **Write the check first.** Put it in the right place:
   - Money, dates, saving, merging, any plain logic: `mobile-app/tests/*.test.mjs`
     (Node's built-in test runner; see `merge3.test.mjs` for the style).
   - Screens (what shows, what a tap does): `mobile-app/__tests__/*.test.tsx`
     (jest-expo + React Native Testing Library).
   Run it. It must FAIL, and fail for the reason of the bug. If it passes, the check is
   wrong or the cause is elsewhere: go back to step 1.
4. **Fix it.** Smallest change that fixes the cause.
5. **Prove it.** Run the check: it passes. Undo the fix: it fails again. Put the fix back:
   it passes. Mention this red-green proof when you report it.
6. **Ripple check.** Find every place that uses what you changed (`Grep` the function,
   prop or field names). Run everything, inside `mobile-app`:
   - `npx tsc --noEmit` (no errors)
   - `npm test` (the logic checks)
   - `npm run test:screens` (the screen checks)
   - `npm run test:hooks` (hooks in the right place; a mistake here crashes a screen)
   All must be clean. Re-read your whole diff once, as a stranger would.
   **Gate the save on it** (added 2026-10-22, after a failing check was committed once):
   run `npm run check:all && git commit ...` (inside `mobile-app`). It runs all four
   checks and stops with an error at the first failure. (2026-10-23: the old way, piping
   the screen checks through `tee` and grepping for "failed", did NOT stop the chain;
   it was caught before anything failing was saved.) Never commit after only reading a
   summary line.
   (2026-10-29: it happened again: `npm run check:all 2>&1 | grep ... && git commit` saved and
   pushed a commit with a failing screen check, because the pipe's grep succeeded. NEVER pipe
   the gate. Run it as `npm run check:all > /tmp/gate.log 2>&1 && git commit ...`, then read
   the log.)
7. **Try it yourself** (next section) when the change is visible on screen.
8. **Record it.** Add or update the `BUG-LOG.md` row (id, what Cath saw, cause, the
   check's file and name, status). Only add a `TEST-2.2.md` phone check (later
   TEST-3.md) for things marked "Needs your phone", plus one short "look around" item per
   batch.
9. **Report to Cath** in plain English: what was wrong, what changed, the status word,
   and the proof. Keep it short.
   **End every report with "Next on our list"** (Cath, 2026-10-29): the next few items
   waiting, in order (from BUG-HUNT.md / PROGRESS7.md), so she always knows what's coming.

Batches (Cath, 2026-10-29, replaces "small batches of 2-5"): gather everything that's ready
into ONE batch per phone test, so she tests many things in one sitting instead of one at a
time. Mockups for the visual items go out in the same round, so she can pick while she
tests. Before handing her a batch, run the full sweep (next sections).

## Fix directly, or ask first (Cath, 2026-10-29)

**Fix directly** (still with every step above: check first, red-green proof, `check:all`):
- wrong logic where the screen looks the same (wrong sort order, wrong total, wrong due date)
- a missing piece of a rule already in "Cath's app-wide rules" below (e.g. the added-by tag
  missing on one screen when the rule says everywhere)
- small text or alignment (a typo, a label, a few pixels off)
- crashes and frozen screens

**Ask first:**
- anything that changes how a screen looks beyond small alignment, or anything new:
  mockup first (Design canvas), build only after she picks
- saving, syncing, deleting, encryption, Firestore rules, household data (as before)
- a rule that isn't written down yet, or two rules that clash

Either way, she hears about every fix in the batch report, with its status word.

## Cath's app-wide rules (additive: never delete, only add)

A rule here applies to EVERY place it fits, not only the screen where she noticed it. When
you fix one place, search for all the others (see "Same kind of thing" below). "Look waits on
mockup" means the rule is agreed but how it looks is not picked yet: don't build its look
until she picks.

- 2026-10-29: **Newest first means newest to the second.** "Newest" sorts by the full date
  AND time, down to the second; something just added appears at the very top. Same for every
  list with a newest/oldest sort.
- 2026-10-29: **Paid shows the same way everywhere.** Debts show what's already paid the
  way Bills do (and Loans, and anything else that gets paid).
- 2026-10-29: **"Still to pay this month" totals.** Bills' "still to pay this month" total
  also goes on Debts, plus a separate total for debts with no due date, and on every other
  place it applies.
- 2026-10-29: **Idle lock keeps counting in the background.** The idle timer keeps running
  while the app is in the background; coming back after it ran out (she said after a
  minute), the amounts are hidden.
- 2026-10-29: **Who added it, everywhere.** The added-by tag shows on everything people
  add, not just Transactions, Bills and Debts.
- 2026-10-29: **Everything is editable after adding.** Anything added can be changed
  later, every field, without removing and re-adding it (e.g. a trip budget item added with
  a name only gets its amount later).
- 2026-10-29: **Log without an account.** Trip items (and similar places) can be logged as
  a reference only, with no account and no balance change (e.g. plane tickets paid before).
- 2026-10-29: **Paid is struck through** in every place it applies. Look waits on mockup.
- 2026-10-29: **Undo only for 15 minutes.** Undo (bill / debt / loan payments, shared
  expense payments, transfers, and the remove button on payments in Edit loan) is offered
  only for 15 minutes after the payment was logged. After that the payment can still be
  edited: add a receipt photo, raise the amount (never below what was first paid), fix the
  date or the account. Never removed, never lowered. A short note says so.
- 2026-10-29: **Confirm before deleting.** Anything that deletes, removes or clears data
  (or does something like it) asks for a confirmation first, everywhere.
- 2026-10-29: **Household edits are shown on opening.** When the app opens or comes back
  from the background, changes another household member made are shown so they can be
  reviewed right away. Look waits on mockup (in-app card vs banner).
- 2026-10-29: **Idle timer counts in the background.** The same 5-minute "Are you still
  there?" + 1-minute countdown keeps counting while the app is in the background (this
  sharpens the idle-lock rule above).
- 2026-10-29: **Left to Spend counts everything due before payday** (her answers): bills,
  debts with a date, loan payments not yet paid, anything PAST DUE and unpaid, and plans not
  yet paid or bought: the grocery list, trips that start before payday, events before
  payday, savings plans, and any other planned amount. Debts with no due date are left out
  (they have their own total on Debts). "Where it comes from" shows one line per kind.
- 2026-10-29: **Picks:** Debts A2 (one card: still to pay this month, no due date, paid
  count); dropdowns E2 (a list rises from the bottom); household changes F2 (banner) then
  F3 (the full list); Undo / Edit payment C1-C3 and Edit loan payments D1-D2 approved.
  Strikethrough: she wants the WHOLE ROW struck (new mockup before building).
- 2026-10-29: **Paid look = canvas B14**: the row keeps its layout; one line runs from the
  start of the name to the end of the amount, and the whole row is faded. Use it everywhere
  something is shown as paid next to unpaid things (Paid this month, trip items, groceries).
- 2026-10-29: **Tapping Left to Spend = canvas L4**: the card, a two-line "why", small bars
  (You have, Past due, Bills, Debts, Loans, Plans), then every account and every item still
  to go out before payday.
- 2026-10-29: Trips: "Just record it" (when ticking an item) is enough for logging with no
  account.
- 2026-10-29: **Real dropdowns.** Every choice in a form is a real dropdown list of choices,
  and the category is guessed and preselected where possible (she only changes it if it's
  wrong). Look waits on mockup: one mockup per screen that changes.

## Same kind of thing, same behaviour

Many of Cath's bugs were one sibling getting a fix the others didn't. When you check or fix
any of these, check its siblings too:
- Bills / Debts / Loans (paid look, totals, due dates, pay sheet, undo, history)
- transactions / shared expenses / trip items / grocery items / bill, debt and loan payments
  (who added it, editable fields, receipts, "just record it")
- every list with sorting or filters (same sort rule)
- every form (same row layout, same dropdowns, same right edge)

## When a "fixed" bug comes back

If Cath reports something already in `BUG-LOG.md` as fixed (e.g. loans' next payment due
after B-047), the old check proved the wrong thing. Before fixing:
1. Find why the old check passed: usually her real data has a shape the check didn't use
   (no first date, a partial payment, a back-dated payment, an edited item).
2. Ask her for the exact details of the item you can't see (dates, what's paid, what the
   screen says, what she expected). Never guess her data.
3. Write the new check with data shaped like hers, red-green, and keep the old check.
4. In `BUG-LOG.md`, add a new row that points back to the old one ("came back: B-047").

## The full sweep (before EVERY batch handed to Cath; Cath, 2026-10-29)

Run all four parts on the screens the batch touched, plus their siblings:
1. **Data correctness:** sorting, totals, due dates, paid status, the same amount matching
   on every screen that shows it (Home, To-Pay, details, Reports, Calendar).
2. **Consistency:** every rule in "Cath's app-wide rules" holds on these screens.
3. **Smoothness:** the `finance-flow-smoothness-check` steps (shared motion, no flicker,
   loading animation on anything that loads, Reduce Motion).
4. **Security and safety:** idle lock and hidden amounts still work; encryption, sync and
   Firestore rules untouched unless she said yes; every Firestore write has `withTimeout`;
   nothing can lose data (delete, undo, two phones).
Then `npm run check:all`, and the hidden-browser walk for anything visible. Write anything
found that's outside the batch into `BUG-HUNT.md`. In the batch report, say the sweep ran
and what it found.

## Cath's phone test steps

Every batch ends with numbered steps in TEST-3.md, and in the report:

    cd C:\Projects\household-finance-mobile
    git pull
    cd mobile-app
    npx expo start -c

then what to tap and what she should see. She replies "device test is as described"
before the next batch.

## Trying it yourself

- **Cloud browser (background):** see `BUG-CHECK-BROWSER.md` at the repo root for whether
  the app runs in a browser in Claude's workspace and how. Use it when it works; it never
  needs Cath's computer.
- **Cath's computer (emulator):** ONLY when Cath says she's free and gives permission in
  that conversation. It moves her real mouse and screen. Never while she's working.

## A bug hunt

When Cath says "bug hunt" (or the next hunt area is up in PROGRESS7.md):

1. Take the next unchecked area from `BUG-HUNT.md`. Order agreed with Cath:
   data safety (saving, syncing, deleting, encryption) first, then Home, Transactions,
   To-Pay (Bills / Debts / Loans), Plan pages, Settings, sign-in / linking, then
   notifications and the calendar.
2. Read every file in that area. Compare behaviour with the web app.
3. Look especially for the kinds of bugs this app has had before:
   - a change on one screen breaking another that shares the same component or data
   - two people saving at once, or coming back online, losing a change
   - offline: spinners that never stop, saves that silently fail (`withTimeout`)
   - old values used after a change (stale closures, `useEffect` dependencies)
   - dates: month ends, Feb 29, paydays, due dates moving, time zones
   - money: rounding, negative numbers, empty amounts, very large amounts
   - empty lists, first-time users, guest mode, a household with one member
   - double taps, closing a sheet mid-save, going back mid-load
   - keyboard covering fields, dark mode, mood colours, Reduce Motion on
   - navigation: wrong page opens, back goes to the wrong place, tab stuck
4. Write each finding in `BUG-HUNT.md`: id (H-number), area, what Cath would see, how
   sure you are (certain / likely / possible), how bad (could lose data / breaks a task /
   annoying / cosmetic), the file and line.
5. Fix the "fix directly" kinds (see "Fix directly, or ask first") in small batches. Show
   Cath the ranked list of the rest and ask which to fix first. Never fix anything that
   touches saving, syncing, deleting, encryption or Firestore rules without her yes.

## Never

- Never say "fixed" without proof.
- Never change encryption, sync, deletion or Firestore rules without asking Cath first.
- Never use Cath's computer without asking that same day.
- Never pile up untested changes: one batch, then her phone check, then the next batch.
- Never delete or weaken an existing check to make the tests pass. If a check is wrong,
  explain why to Cath first.
