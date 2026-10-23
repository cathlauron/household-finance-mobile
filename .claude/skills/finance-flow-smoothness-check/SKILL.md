---
name: finance-flow-smoothness-check
description: Use for ANY Finance Flow change that adds or alters a screen, sheet, switcher, list, animation or transition, and when Cath says "smoothness check". Keeps all motion consistent and smooth, asks Cath when a motion choice isn't set yet.
---

# Finance Flow smoothness check

Cath agreed to this on 2026-10-23, right after the bug hunt. She wants the app to feel
smooth and to move the same way everywhere, without having to ask for it each time.
It works alongside `finance-flow-bug-check`: that skill still decides whether something
is "fixed" (proof, status words, the save gate). This skill decides how things MOVE.
Use `animate-expo` and `fixing-motion-performance` for technique; this file wins where
they differ.

## The five rules

1. **One way of moving.** Every animation uses the shared values in
   `mobile-app/src/motion.ts`. No new speeds or curves typed into a screen.
2. **Same kind of thing, same motion.** If two places do the same job (switch sub-page,
   open a sheet, add a row), they move the same way, through the same shared component.
   A new screen copies the pattern, never invents one.
3. **Smooth first.** Motion runs on the phone's animation thread (Reanimated worklets, or
   `useNativeDriver: true`), never by setting React state every frame. Nothing animated
   may make taps or typing feel slow (Cath has reported this before: see Tap.tsx notes).
4. **Reduce Motion is respected.** With the phone's "Remove animations" on, everything
   appears instantly (`reduceMotionNow()` / `useReduceMotion()`). Following a finger
   while it's down is fine; nothing moves on its own.
5. **Ask, never guess.** If a motion choice is not in "Cath's decisions" below, ask her
   (AskUserQuestion when available) before building, and add her answer here. For anything
   new or visual, show a moving sample first (Design canvas) and build only after she picks.

## Every transition: no flicker, no overlap, smooth fades (Cath, 2026-10-23)

Cath: "no button, no page will flicker, no screen will overlap, if there are fades, make
the fade smooth as well". Check EVERY screen change and EVERY button against these:

- **No flicker.** Nothing that's on screen may disappear and come back, flash, blink or
  go faint for a frame. A button never shows its old state for a frame before its new one.
  A page never arrives empty and then fills in all at once (fade the content in).
  A title never pops in late and pushes the page down.
- **No blank moment.** Between two screens there is never a frame of just background.
- **No overlap.** Two pages never show through each other or sit half on top of each other.
  Allowed on purpose (Cath, 2026-10-23): pop-up sheets over a dimmed page, the Calendar
  rising over a dimmed page, Search dropping down. Anything else overlapping is a bug.
- **No snaps.** Something big that changes (a row opening, a help card, a theme change, a
  screen change) moves or fades; it never jumps all at once. Small text changes (a
  number, a label) may change in place.
- **Smooth fades.** Every fade uses the shared speeds and curve in `motion.ts` (no default
  or linear fades), and never passes through an empty screen. Fading from one screen to
  another = the old fades out, then the new fades in (they never overlap).
- **Exception: locking.** When the app locks, the money screen disappears at once so
  nobody glimpses the numbers (Cath, 2026-10-23). Unlocking fades in.

How to check (besides reading the code):
- Record it frame by frame in the hidden browser: wrap any step in `rec:` in
  `tools/browser-walk.mjs` (e.g. `rec:To-Pay`, `rec:label:Notifications`, `rec:id:home-tab`,
  `rec:drag:-200`, `rec:at:195,150`), then run `python3 -I tools/flicker-check.py
  web-shots/rec-*`. It reports FLICKER, BLANK, SNAP, LATE POP and JUMP, and writes a
  `sheet.png` of every frame. Look at the frames before calling anything a bug.
- Known web-only noise: a step that can't find its button makes the browser scroll the
  page (a full-page jump); dropped frames at the start of a slide look like a JUMP; the
  page library's dim runs on a slower path on the web. Page slides only run on the web
  because RootStack sets `animation: 'default'`.
- The exact feel on a phone stays "Needs your phone".

## The shared pieces (all in `mobile-app/src`)

- `motion.ts`: the curve `CURVE` = bezier(0.32, 0.72, 0, 1) (use `Easing.bezier(...CURVE)`),
  `TAB_MS` 240, `PAGE_OPEN_MS` 280, `PAGE_BACK_MS` 240, `SHEET_OPEN_MS` 280,
  `SHEET_CLOSE_MS` 240, `DIM_MS` 220, `SUBPAGE_MS` 240, `COUNT_MS` 500.
- Main tabs: `navigation/TabPage.tsx` (slide by direction after you let go).
- Pages: `navigation/RootStack.tsx` (paper slide). Sheets: `components/BottomSheet.tsx`.
- Sub-pages: `components/SlidingPages.tsx` (follows your finger; `inline` for pages inside
  a scrolling page, like Travel's trip). Swipe rules in `subPages.ts`.
- Switchers: `components/SegmentedControl.tsx` (the raised piece glides; follows the
  page when given `progress`).
- Press feel: `components/Tap.tsx` (fade to 85%). New rows: `useArrival.ts` (soft fade +
  glow; waits until its sub-page is showing, via `pageActive.ts`).
- Haptic: `hapticSelection()` on every switcher change.

## Cath's decisions (additive: never delete, only add)

- 2026-10-23: every page with sub-pages SLIDES instead of switching instantly: To-Pay
  (Bills / Debts / Loans), Savings (Pots / Emergency / FI), Groceries (List / Calculator /
  Meal ideas), Events (Upcoming / Done), Travel trip page (Budget / To-do).
- 2026-10-23: the slide style is sample B, "follows your finger" (picked from a canvas of
  A slide-like-tabs, B follows-your-finger, C short soft slide).
- 2026-10-23: on those pages the switcher's highlight glides with the page.
- 2026-10-23: small switchers inside forms and cards (Bill / Debt / Loan in New bill,
  I borrowed / I lent in New loan, Budget / To-do in the trip form, Light / Dark in
  set-up, 30 / 60 / 90 in Cash flow, Pay from) only glide the highlight; the content
  underneath changes without sliding. (Cath also ticked "Loans: Borrowed / Lent" for
  sliding; that switch turned out to be inside the New loan form, not a page. Raised
  with her on 2026-10-23.)
- 2026-10-23: swiping past the first or last sub-page stops with a soft bounce. It does
  NOT jump to another main tab (use the tab bar for that).
- 2026-10-23: money numbers that change while on screen (e.g. Left to Spend) count quickly
  to the new value (`COUNT_MS`); instant with Reduce Motion.
- 2026-10-23: the bottom tabs follow your finger too (like the sub-pages).
- 2026-10-23: Search drops down with the house curve and speeds (was its own).
- 2026-10-23: "I borrowed / I lent" copies the Bill / Debt / Loan switch: a short
  explanation line under it. (Cath then clarified: copy the TRANSITION too, see the form-switch line.)
- 2026-10-23: zero amounts are grey whatever their colour (green and blue too, not only red).
- 2026-10-23: dark mode changes with a quick soft dip (about a third of a second), not a snap.
  REPLACED the same day (Cath, asked again because 2.2 had her "keep it instant like 2.1"):
  dark mode stays INSTANT, the colours change the moment you tap.
- 2026-10-23: the set-up steps (name, help with, start, who uses the phone) slide like
  opening a page: Continue slides the next one in from the right, Back slides it away.
- 2026-10-23: switches inside a form that change the form (Bill / Debt / Loan in the +
  form, I borrowed / I lent): the highlight glides, and the fields below softly fade out
  and the new ones fade in (about a third of a second). The amount box and keyboard stay.
- 2026-10-23: a fade-out right before a fade-in uses CURVE_OUT (the house curve played
  backwards) so the two halves meet in the middle (no near-empty pause).
- 2026-10-23: whole-screen changes (welcome, set-up, sign-in, unlock): the old screen fades
  out, then the new one fades in; no blank blink, never both at once. Locking: instant.

## Steps for any change that moves

1. **List what moves.** Before coding, write down every transition the change touches,
   and find the shared piece for each (list above).
2. **Check the decisions above.** Anything not covered: ask Cath (rule 5).
3. **Build with the shared pieces.** Never a copy per screen.
4. **Check it automatically** (inside `mobile-app`):
   - `npm run test:motion`: fails on the house curve typed by hand, a speed typed in a
     file not on its list, `useNativeDriver: false`, anything moving with no Reduce
     Motion check, and a sub-page screen not using `SlidingPages` (or jumping tabs at
     the end). Add new sub-page screens to its `SLIDING` list.
   - screen checks in `__tests__/` (see `SlidingPages.test.tsx`, `SubPageScreens.test.tsx`;
     swipes are tested with `fireGestureHandler`).
   - then the save gate from the bug-check skill: `npm run check:all && git commit ...`.
   Red-green proof as in the bug-check skill.
5. **See it move yourself.** Use the hidden browser (`BUG-CHECK-BROWSER.md`); its
   `drag:-200` step takes a picture with the finger still down, then after letting go.
   Only use Cath's emulator when she says she's free that day. Mouse drags on the
   emulator are not real swipes: the exact feel stays "Needs your phone".
6. **Report** with the bug-check status words, plus a numbered phone check in
   TEST-2.2.md (later TEST-3.md) for each motion: what to tap, and what she should see.

## A smoothness check (when Cath asks for one)

Go through the app one area at a time (Home, Transactions, To-Pay, Plan pages, Settings,
sheets, sign-in) and write findings to `SMOOTH-HUNT.md` at the repo root: id (S-number),
where, what Cath would notice (jumps, snaps, two different speeds, flashes, stutter,
missing Reduce Motion), how sure, how noticeable, file and line. Show her the ranked
list and ask which to fix first.

## Never

- Never invent a new speed, curve or motion style without Cath's yes.
- Never animate by setting React state every frame.
- Never skip Reduce Motion.
- Never say a motion "feels smooth" from code alone: that needs her phone.
- Never weaken an existing check to make it pass.
