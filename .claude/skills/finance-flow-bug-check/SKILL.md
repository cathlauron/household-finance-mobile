---
name: finance-flow-bug-check
description: Use for ANY change to Finance Flow app code (bug fix, tweak or feature), whenever Cath reports something broken, and when she says "bug hunt". Proof before "fixed", every bug becomes a permanent check, Claude tests before Cath, and Claude asks instead of guessing.
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
7. **Try it yourself** (next section) when the change is visible on screen.
8. **Record it.** Add or update the `BUG-LOG.md` row (id, what Cath saw, cause, the
   check's file and name, status). Only add a `TEST-2.2.md` phone check (later
   TEST-3.md) for things marked "Needs your phone", plus one short "look around" item per
   batch.
9. **Report to Cath** in plain English: what was wrong, what changed, the status word,
   and the proof. Keep it short.

Work in small batches (2-5 bugs), then stop for Cath's phone check.

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
5. Show Cath the ranked list and ask which to fix first. Never fix anything that touches
   saving, syncing, deleting, encryption or Firestore rules without her yes.

## Never

- Never say "fixed" without proof.
- Never change encryption, sync, deletion or Firestore rules without asking Cath first.
- Never use Cath's computer without asking that same day.
- Never pile up untested changes: small batches, then her phone check.
- Never delete or weaken an existing check to make the tests pass. If a check is wrong,
  explain why to Cath first.
