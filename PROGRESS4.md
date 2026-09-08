Household Finance Mobile App — Progress Log (Phase B on-device bug-fixing → Phase C: Publishing)

This file picks up exactly where PROGRESS3.md left off. PROGRESS3.md is now
closed/historical — it covers Phase B Part 2 in full (the Iconization &
Minimalism Pass, B2.1–B2.3, the bottom nav redesign, the "fewer words" pass
on SettingsScreen.tsx/ProfileScreen.tsx) plus the first full on-device
testing pass across everything from B.7 onward. See PROGRESS3.md for that
detail. PROGRESS2.md (Phase B build, B.1–B.14) and PROGRESS1.md (Phase A)
and PROGRESS.md (original Phases 0–11) are closed/historical before that.

📅 Session entries

(New sessions from here on get logged here, newest near the top, same
format as PROGRESS3.md's own session entries.)

### Session — Emergency Fund fields missing auto-save (bug #5b)

Investigated via Antigravity (investigation-only, no commits from the
tool), confirming the suspicion flagged while fixing bug #5. Confirmed:
neither Emergency Fund TextInput (`efExpensesInput`/`efSavingsInput`) had
an `onBlur` handler at all — only `onChangeText`, which just updates local
state. `handleSaveEf` was only ever called from the main "Save" button's
`onPress`, with no `onBlur`, `useEffect`, or debounce path anywhere in the
file (confirmed `useEffect` isn't even imported in SavingsScreen.tsx).
Same root cause as bugs #3 and #4. Also confirmed the "use suggested
expenses" button only called `setEfExpensesInput(...)` and never saved.

Applied fix (hand-pasted by the person after review): gave `handleSaveEf`
an optional `expensesOverride` parameter (falls back to the existing
`efExpensesInput ?? efExpensesDisplay` chain when not passed) so the
suggestion button can save the freshly-tapped value immediately without
waiting on a state update that hasn't landed yet; added
`onBlur={() => handleSaveEf()}` to both Emergency Fund TextInputs; updated
the suggestion button's `onPress` to save with the override value right
after setting state; and changed the main Save button's `onPress` from
`handleSaveEf` directly to `() => handleSaveEf()`, since passing the
function directly made TypeScript infer the tap's GestureResponderEvent as
the (now-optional) string parameter — this surfaced as a `tsc` error
(`GestureResponderEvent` not assignable to `string`) and was fixed the
same session. `npx tsc --noEmit` clean. Committed and pushed. Still needs
a real on-device re-test — deferred, along with bugs #1–5, until the rest
of this bug-fixing pass is done and everything can be tested together in
one on-device pass.

### Session — Emergency Fund "Saved" checkmark never appears (bug #5)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed a different root cause than bugs #3/#4's "no auto-save
path" pattern — this one is an outright crash, not a persistence gap.
`handleSaveEf` (SavingsScreen.tsx) calls `.trim()` directly on
`efExpensesInput`/`efSavingsInput`, both of which are initialized to
`null` and stay `null` unless the user has actively typed into that
specific field during the current screen visit. Calling `.trim()` on
`null` throws an uncaught `TypeError`, which aborts the function before
`saveModel()` or `setEfSaved(true)` ever run — so tapping "Save" silently
does nothing whenever either field hasn't been freshly typed into (e.g.
using only the suggested-expenses button, or only editing one of the two
fields). Confirmed the working FI Calculator equivalent
(`handleSaveFi`) avoids this exact crash via a nullish-coalescing
fallback to its own "display" variable (`fiExpensesInput ?? 
fiExpensesDisplay`), and confirmed via `Select-String` that the matching
`efExpensesDisplay`/`efSavingsDisplay` fallback variables already exist
in this file (used to render the TextInputs' current values), just
weren't being used inside `handleSaveEf`.

Applied fix (hand-pasted by the person after review, as a find/replace
snippet): rewrote the first two lines of `handleSaveEf` to read from
`(efExpensesInput ?? efExpensesDisplay).trim()` /
`(efSavingsInput ?? efSavingsDisplay).trim()` first, then parse those
safe strings — mirroring `handleSaveFi`'s exact pattern. `npx tsc
--noEmit` clean. Committed and pushed. Still needs a real on-device
re-test — deliberately deferred (see bug #4's entry) until the rest of
this bug-fixing pass is done, to test everything together in one pass.

Flagged but NOT fixed this session (separate, lower-priority issue found
along the way): the two Emergency Fund TextInputs have no
`onBlur={handleSaveEf}` the way bug #4 added to all four FI fields — so
this section likely has the same "only saves if you scroll down and tap
Save" persistence gap bugs #3/#4 both had, independent of the crash just
fixed. Not folded into this fix since it wasn't the reported symptom;
tracked as a follow-up below.

### Session — FI Calculator non-functional on-device (bug #4)

Investigated via Antigravity (investigation-only, no commits from the
tool), across three reported symptoms on SavingsScreen.tsx's FI
Calculator section. Confirmed all three collapse into one root cause plus
one secondary bug:
- Root cause: none of the four FI fields (SWR, expected return, monthly
  savings, current savings) had any auto-save path — only a manual "Save"
  button at the bottom of the screen (`handleSaveFi`), which most people
  would never scroll down to tap. Every value was held only in local
  React state (`fiSwrInput`, `fiReturnRateInput`, `fiMonthlySavingsInput`,
  `fiSavingsInput`) and discarded on unmount.
- Symptom #1 ("Years Until FI" shows placeholder text) and symptom #2
  (show/hide projected-date toggle missing entirely) are both downstream
  of that: `fiCanProjectTimeline` requires all four fields to hold a real
  value, which they never did after leaving and returning to the screen,
  so it always fell into the "Enter more info" placeholder branch — and
  the toggle is nested inside that same branch, so it never rendered
  either. No separate toggle-specific bug existed.
- Secondary bug found during investigation: blank "Current savings" was
  being parsed as `NaN` (`parseFloat(fiSavingsDisplay)`) and treated as
  invalid, blocking the whole calculation — even though a blank field is
  a normal, valid answer meaning "starting from ₱0."
- Confirmed via `git show`/`git log` that this file's `handleSaveFi`
  function already existed, correctly writes all five FI fields to
  `model.calculatorInputs`, and is fully correct — it just wasn't being
  called anywhere except the manual Save button.

Applied fix (hand-pasted by the person after review, as find/replace
snippets rather than context-block inserts): added `onBlur={handleSaveFi}`
to all four TextInputs (current savings, SWR custom input, expected
return, monthly savings), and added an inline `handleSaveFi()` call to
the SWR preset buttons (3.5%/4.0%/4.5%) and both "tap to use this"
suggestion buttons (net-worth suggestion, monthly-savings suggestion),
since taps have no blur event to rely on. Also changed
`fiSavingsNum = parseFloat(fiSavingsDisplay)` to treat an empty field as
`0` instead of `NaN`, so the calculation runs as soon as return rate and
monthly savings are filled in even with current savings left blank.
`npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deliberately deferred by the person until the rest of
this bug-fixing pass is done, then all fixes get tested together in one
on-device pass rather than one at a time.

### Session — Left to Spend caution threshold not persisting (bug #3)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause: the caution-threshold TextInput on
SettingsScreen.tsx only persisted its value on the TextInput's `onBlur`
event (`saveCautionThreshold()`), with no other save path — `onChangeText`
only ever updated local React state. In React Native, `onBlur` doesn't
reliably fire when a screen is torn down via the Back button, the
swipe-back gesture, switching tabs, or fully closing the app, so a typed
value could be silently discarded instead of saved whenever the user left
the screen any way other than tapping elsewhere on the same screen first.
Confirmed by comparing against a setting that DOES persist correctly
(`swipeToDeleteEnabled`, a toggle that saves instantly on tap with no
blur dependency) and against `autoLockMinutes`, which also saves
immediately on tap.

Applied fix (hand-pasted by the person after review): added `useRef` to
SettingsScreen.tsx's React import, and added a `useEffect` that auto-saves
the caution threshold ~600ms after the user stops typing, alongside
(not replacing) the existing onBlur save — so the value is written almost
immediately regardless of how the user later leaves the screen. A mounted-
ref guard skips the very first render so opening Settings doesn't trigger
a pointless save before anything's been touched. `npx tsc --noEmit` clean.
Committed and pushed. Still needs a real on-device re-test.

### Session — Offline delete hang on Accounts/Bills/Debts (bug #2)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed the exact same root cause across all three screens:
- Accounts/Bills/Debts each have an identical `performDelete()` that sets
  `saving = true`, awaits the shared `saveModel()` in DataContext.tsx, and
  sets `saving = false` in a `finally` block.
- `saveModel()` awaits Firestore's `setDoc()` (via `saveHouseholdData` for
  linked households, or `saveProfileCloudBackup` for unlinked profiles) to
  sync the change to the cloud. `setDoc()` never rejects or times out on
  its own while offline — it just stays pending indefinitely.
- Because that `await` never resolves, `saveModel()` never finishes, the
  screen's `finally` block never runs, and the loading spinner stays stuck
  until the device reconnects.
- Also confirmed (via `git show` on the earlier commit) why a prior fix —
  "add try/catch to Accounts/Bills/Debts delete" — never actually worked:
  it added a `catch` block that could never be reached, both because the
  hang means nothing ever throws, and separately because `saveModel()`
  already catches its own internal write errors and doesn't re-throw them
  to its caller.

Applied fix (hand-pasted by the person after review): added a
`withTimeout()` helper in DataContext.tsx and wrapped both cloud-write
calls inside `saveModel()` (the linked-household path and the unlinked
personal-backup path) in it, each with an 8-second timeout. `saveModel()`
now always resolves either way, so the calling screen's `finally` block
correctly fires and the spinner clears — on a timeout, the existing "Sync
Failed"/"Backup Failed" alert shows instead (data is already safe locally,
since the local save always happens first). `npx tsc --noEmit` clean.
Committed and pushed. Still needs a real on-device re-test.

### Session — Offline sign-out → sign-in lockout (bug #1)

Investigated via Antigravity (investigation-only prompt, no commits from
the tool). Found and confirmed against real code:
- SignInScreen.tsx's `handleSignIn` calls `signInWithFirebase` (Firebase
  Auth, works fine over restored network), then reads Firestore
  (`loadWrappedHouseholdKey`) to fetch the household key. Auth and
  Firestore recover from an offline period independently in this SDK
  setup — Firestore can stay stuck in backoff after Auth already succeeds.
- `household.ts`'s `loadWrappedHouseholdKey` was silently catching any
  `permission-denied` Firestore error and returning `null`, with no way
  for the caller to tell "this genuinely doesn't exist" apart from "the
  read itself failed."
- SignInScreen.tsx then treated that `null` as proof the username/password
  was wrong, even though Firebase Auth had already verified it correctly.
- Separately, the screen's static subtitle ("Enter your email, username,
  and password.") was nearly identical to the actual missing-fields
  validation error text, making unrelated errors look like two conflicting
  messages at once.
- App.tsx's offline sign-out could also hang indefinitely on a Firestore
  write (`deleteDeviceSession`) with no timeout, when offline.

Applied fix (hand-pasted by the person after review, not applied by the
tool): stopped swallowing the Firestore error in household.ts; added an
accurate "couldn't reach your household data" message; call
`enableNetwork(db)` right after a successful Firebase Auth sign-in to force
Firestore to reconnect; reworded the subtitle/validation-error text so they
can't look like duplicate errors; added a 1-second timeout race around the
offline sign-out's Firestore write. `npx tsc --noEmit` clean. Committed and
pushed. Still needs a real on-device re-test to fully close out.

✅ Carried forward from PROGRESS3.md — still true, not yet re-verified this file
- All of Phase B's checkpoints (B.1 through B.14) are CODE-COMPLETE. Full
  build detail lives in PROGRESS2.md.
- Everything through B.6 (plus B.5's UI/UX batches) has been verified on a
  real device once already — see PROGRESS2.md's own on-device testing
  session for that checklist and the bugs it found/fixed.
- Phase B Part 2 (Iconization & Minimalism Pass — B2.1 through B2.3 batch 4,
  the bottom nav redesign, the SettingsScreen.tsx/ProfileScreen.tsx "fewer
  words" trims) is fully CODE-COMPLETE and `npx tsc --noEmit` clean. See
  PROGRESS3.md for the full build detail on every batch.
- A first full on-device testing pass was run across everything from B.7
  onward (Left to Spend, Category Watchlist, Yours/Mine/Ours, refund
  tracker, weekly recap, FI calculator, tags/report filtering, subscription
  cancel-reminder, all of Phase B Part 2's iconization/swipe-to-delete/
  bottom-nav work). Real results — including several previously-believed-
  fixed bugs that turned out NOT to actually work on-device — are listed
  below under ⚠️ Known issues. Reminder/notification-specific testing was
  explicitly deferred to Phase C (see below) rather than chased through
  Expo Go.
- The "fewer words" trimming pass is PARTIALLY done: SettingsScreen.tsx and
  ProfileScreen.tsx are complete. A full ranked-by-wordiness inventory of
  every remaining screen already exists (captured in PROGRESS3.md's session
  history) — next up per that list: OnboardingScreen.tsx (8 items),
  SavingsScreen.tsx (7), SignInScreen.tsx (7), MoreScreen.tsx (6), and 18
  more screens after that in descending order.

📌 Decisions carried forward — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs before
  committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project.
- Insist on real command output/diffs from Antigravity/Copilot, not
  narrative summaries — investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs `git push` themselves).
- Close/Save All open VS Code tabs before any commit, including
  PROGRESS-file-only commits — a routine checkpoint commit has silently
  reverted real code twice in this project's history when a tab was left
  open with stale content.
- After any round of fixes, independently re-verify against real, current
  code before considering it done — don't trust progress-log claims or
  commit messages alone. (This one bit us directly in the first on-device
  pass — several fixes logged as done in PROGRESS3.md did not actually work
  on a real device.)
- Never hand the person a conditional/branching instruction ("if the file
  says X do Y, otherwise do Z") — get the real answer via investigation
  first, then give one unconditional fix.
- For any fix small enough to hand-paste, the person applies it directly
  and runs git themselves; Antigravity/Copilot applying+committing directly
  is reserved for large, well-reviewed, scattered multi-file changes.
- Orphaned `households/{householdId}` Firestore documents from abandoned
  link codes are a known, accepted limitation — deferred, needs server-side
  cleanup, not a client patch.
- Reminder/notification-related bugs and testing are explicitly deferred to
  Phase C — real push-notification delivery and deep-linking are far more
  reliable to verify on an actual installed build (EAS/TestFlight) than
  through Expo Go. Do not schedule investigation time on these until C.1
  is done.

⚠️ Known issues / gotchas — carried forward, still open

🐞 Real bugs confirmed on-device, needing investigation + fix (priority order suggested in PROGRESS3.md)
1. ✅ FIXED (pending on-device re-test) — Offline sign-out → sign-in
   lockout. Root cause: Firestore's own connection (separate from Firebase
   Auth) can get stuck in a dead/backoff state after a period offline, even
   once the network and Auth both recover — so the very next Firestore read
   (loadWrappedHouseholdKey) failed with permission-denied, which the code
   was silently swallowing to `null` and then wrongly reporting as
   "Incorrect username or password." At the same time, the screen's static
   subtitle text was nearly identical to the "missing fields" validation
   error, so the two looked like conflicting messages stacked together.
   Fixed by: (a) no longer treating a Firestore permission/connection error
   as a wrong password — it now propagates and shows an accurate
   connection-related message instead; (b) calling `enableNetwork(db)`
   right after a successful Firebase Auth sign-in, to force Firestore to
   reconnect using the freshly-restored network instead of staying stuck;
   (c) reworded the subtitle and the "missing fields" error so they can
   never look like two conflicting errors again; (d) the offline
   sign-out's `deleteDeviceSession` write now times out after 1 second
   instead of hanging indefinitely when offline, which was a related cause
   of the app getting stuck mid-sign-out. `npx tsc --noEmit` clean. STILL
   NEEDS: a real on-device re-test (airplane mode off/on, then sign in)
   before this can be marked fully verified — flip to a plain ✅ once
   confirmed.
2. ✅ FIXED (pending on-device re-test) — Offline delete hangs instead of
   showing an error (Accounts/Bills/Debts). Root cause: all three screens'
   delete handlers route through the shared `saveModel()` in
   DataContext.tsx, which awaits Firestore's `setDoc()` to sync the change
   to the cloud — but `setDoc()` never rejects or times out on its own when
   offline, it just stays pending forever. So `saveModel()` never finished,
   the calling screen's `finally { setSaving(false) }` never ran, and the
   loading spinner stayed stuck until connectivity returned. This also
   explains why the earlier "add try/catch to Accounts/Bills/Debts delete"
   fix (referenced below) never worked: the `await` it wrapped never threw
   in the first place (it just hung), and separately `saveModel()` already
   catches its own internal write errors and never re-throws them to the
   caller, so that screen-level `catch` block was unreachable dead code
   even in a world where the hang wasn't the issue. Fixed by adding a
   `withTimeout()` helper in DataContext.tsx and racing both cloud-write
   paths (linked household `saveHouseholdData`, and unlinked personal
   `saveProfileCloudBackup`) against an 8-second timeout, so `saveModel()`
   now always resolves either way — on timeout it shows the existing
   "Sync Failed"/"Backup Failed" alert (data was already saved locally
   first, so nothing is lost), and the calling screen's `setSaving(false)`
   / `closeModal()` correctly fires. The screen-level dead `catch` blocks
   were left as-is (harmless, just unreachable). `npx tsc --noEmit` clean.
   STILL NEEDS: a real on-device re-test (airplane mode on, delete an
   account/bill/debt, confirm the spinner clears and the Sync Failed alert
   shows within ~8 seconds instead of hanging) before marking fully
   verified.
3. ✅ FIXED (pending on-device re-test) — Left to Spend caution threshold
   doesn't persist. Root cause: the threshold's TextInput only saved on
   `onBlur`, which React Native doesn't reliably fire when the screen is
   torn down (Back button, swipe-back gesture, tab switch, or app close) —
   so a typed value could be silently lost instead of saved. Fixed by
   adding a ~600ms auto-save-after-typing-stops effect alongside the
   existing onBlur save, so the value is written almost immediately no
   matter how the screen is later left. `npx tsc --noEmit` clean. STILL
   NEEDS: a real on-device re-test (type a new threshold value, close the
   app fully — swipe it away, not just background it — reopen, and confirm
   Settings still shows the new value and Home's Left to Spend widget uses
   it) before marking fully verified.
4. ✅ FIXED (pending on-device re-test) — FI Calculator (Savings tab)
   largely non-functional on-device. Root cause: none of the four FI
   fields (SWR, expected return, monthly savings, current savings) had
   any auto-save path — only a manual "Save" button at the bottom of the
   screen, easy to miss. The "Years Until FI" placeholder text and the
   missing show/hide projected-date toggle were both downstream effects
   of that (the calculation and the toggle both require all four fields
   to hold a real value, which they never did after leaving and returning
   to the screen) — not two separate bugs. A secondary bug was also found
   and fixed: a blank "Current savings" field was being treated as
   invalid (`NaN`) instead of a normal ₱0 starting point, which alone
   would block the calculation even with everything else filled in.
   Fixed by adding `onBlur={handleSaveFi}` to all four fields (reusing
   the existing, already-correct `handleSaveFi` save function rather than
   writing a new one), adding the same save call to the SWR preset
   buttons and both "tap to use this" suggestion buttons (since taps have
   no blur event), and changing the current-savings parsing so an empty
   field means ₱0 instead of invalid. `npx tsc --noEmit` clean. STILL
   NEEDS: a real on-device re-test (type into any of the four fields,
   leave the screen without tapping Save, come back and confirm it
   stuck; leave Current Savings blank and confirm Years Until FI now
   calculates; confirm the show/hide date toggle appears) — the person
   is deliberately deferring this until the rest of the current bug-
   fixing pass is done, to test everything together in one on-device
   pass.
5. ✅ FIXED (pending on-device re-test) — Emergency Fund "Saved"
   checkmark never appears after saving. Root cause: `handleSaveEf`
   called `.trim()` directly on `efExpensesInput`/`efSavingsInput`, which
   are `null` unless the user typed into that specific field this visit
   — throwing an uncaught crash that silently aborted the function before
   `saveModel()` or `setEfSaved(true)` ever ran. Fixed by reading through
   the existing `efExpensesDisplay`/`efSavingsDisplay` fallback strings
   first (`efExpensesInput ?? efExpensesDisplay`), the same safe pattern
   `handleSaveFi` already used. `npx tsc --noEmit` clean. STILL NEEDS: a
   real on-device re-test (edit only one of the two EF fields, or use the
   suggested-expenses button without typing anything, then tap Save and
   confirm the checkmark appears instead of nothing happening) — deferred
   along with bugs #1–4 until the rest of this pass is done.
5b. ✅ FIXED (pending on-device re-test) — Emergency Fund TextInputs had
    no `onBlur` auto-save, same root cause as bugs #3/#4. Fixed by adding
    `onBlur={() => handleSaveEf()}` to both fields, giving `handleSaveEf`
    an optional override parameter so the "use suggested expenses" button
    can save the tapped value immediately instead of a stale one, and
    fixing the main Save button's onPress signature mismatch this caused.
    `npx tsc --noEmit` clean. STILL NEEDS: a real on-device re-test (edit
    either field and leave the screen without tapping Save, then tap "use
    suggested expenses" and confirm it's saved without tapping Save) —
    deferred along with bugs #1–5 until the rest of this pass is done.
6. None of the 3 promised background-save warnings (failed password-change
   cloud backup, failed account-recovery re-save, failed household-unlink
   personal backup) ever show on-device.
7. Events/Goals/Groceries/Settings saveModel try/catch sweep doesn't
   surface errors in practice on-device — likely same root cause as #2.
8. Travel checklist-item delete still leaves its linked expense behind in
   Transactions.
9. Biometric unlock failed outright on a Face ID device with fingerprint
   off (not just a wrong label — a functional failure).
10. Turning PIN off shows no loading indicator, reads as frozen.
11. Category Watchlist "over budget" wording fires at exactly 100% instead
    of only once genuinely over 100%.
12. "Which of these is you?" picker doesn't update Transactions live —
    needs a full app restart to take effect.
13. AccountsScreen Cards/List toggle — "Stacked card view" floating label
    (IconLabelHint) didn't appear on tap.

🎨 Design-change requests surfaced during testing (need scoping, not quick fixes)
- Replace Android's native date picker with the app's own themed calendar
  popup.
- Replace the PIN "Turn Off" text button with a toggle switch.
- Redesign the SUB/CANCELLED badge as a real hollow-box badge (matching
  Accounts' Cash/Debit/Credit badges) instead of blending in as plain text.
- Add an explicit confirm/save step to "Which of these is you?" instead of
  a single instant tap.
- Bottom nav: drop Calendar as a bottom tab entirely, replace with a small
  tappable date element at the top-center of Home that navigates to
  Calendar.
- Enable swipe-to-delete on Transactions' derived (non-manual) rows, paired
  with either a source-deletion warning or a redirect to the source screen
  to confirm — exact approach still undecided.
- Redesign Reports screen: replace the 9 icon sub-tabs with a checkbox-
  driven list (icon + title + checkbox) that shows/hides that report from
  the normal tab row — supersedes the B2.3 batch-1 iconization for this
  screen specifically.
- Reverse the icon-only decision for ToPayScreen/PlanningScreen's segmented
  pills — show icon + title together instead of icon-only.

🔔 Deferred to Phase C — do not chase now
- Subscription reminder tap → deep-link to To-Pay → Bills → specific bill
  (needs a real fired reminder).
- "Bill reminders" / "Weekly recap" independent toggles in Settings →
  Notifications (tester couldn't even locate this option — needs its own
  investigation once real-notification testing is possible).
- Subscription bills not double-notifying.
- Weekly Spending Recap: toggle/day-pills/hour input, turning it off, and
  the actual notification firing with a matching amount.
- Subscription Cancel-Reminder: reminder wording, warm-app tap-to-deep-
  link, cold-start tap-to-deep-link.

⏸️ Could not be tested yet (not pass/fail — needs the right conditions)
- Legacy-profile crash guards on Home/Dashboard (no legacy profile
  available to test with).
- Two-device sync checks throughout (Left to Spend, Category Watchlist,
  Yours/Mine/Ours labeling, FI Calculator) — single-device household right
  now.

✅ Confirmed working as designed in the first on-device pass
- "Copy Recovery Key" in Settings → Security.
- Bills/Loans/Debts summary-line ordering consistency.
- Lock screen "Use password instead" flow.
- Solo/unlinked profile correctly has no "which of these is you?" picker
  (documented gap, not a bug).

📁 Files in the repo
See PROGRESS3.md's own "Files in the repo" section for the full inventory
through the end of Phase B Part 2 (B2.1–B2.3 batch 4, bottom nav redesign,
SettingsScreen.tsx/ProfileScreen.tsx fewer-words pass). New/modified files
from here on will be tracked fresh in this file.

▶️ Next step
- On-device: re-test both fixed bugs before marking them fully verified —
  (1) offline sign-out → sign-in lockout (airplane mode off, sign out,
  airplane mode on, restart or background/foreground the app, airplane
  mode off, sign in), and (2) offline delete hang on Accounts/Bills/Debts
  (airplane mode on, delete an item, confirm the spinner clears and a
  "Sync Failed" alert appears within ~8 seconds instead of hanging).
- Work through the remaining real bugs found in the first on-device testing
  pass, one at a time, via the standard Antigravity/Copilot-investigates-
  first workflow — see the numbered list under ⚠️ Known issues above.
  Bugs #1–5 are now code-complete pending on-device re-test (deliberately
  batched — the person is testing all fixes together in one on-device pass
  once the remaining bugs below are also fixed, rather than one at a time).
  Suggested order for what's left: (6) background-save warnings, (7)
  Events/Goals/Groceries/Settings silent save failures, (8) Travel
  checklist-delete expense cleanup, (9) the remaining smaller bugs
  (biometric capture, PIN-off loading indicator, Category Watchlist
  wording, "which of these is you?" live update, AccountsScreen's missing
  label).
- Leave all reminder/notification testing and bugs alone until Phase C
  (C.1, EAS Build) is done — see the "🔔 Deferred to Phase C" list above.
- Once ready, separately scope and prioritize the design-change requests
  listed above (Android date picker, PIN toggle, SUB badge redesign,
  confirm-step for "which of these is you?", bottom-nav Calendar removal,
  Transactions swipe-to-delete on derived rows, Reports checkbox redesign,
  ToPay/Planning icon+title reversal) — these are new work, not bug fixes.
- Continue the "fewer words" pass: OnboardingScreen.tsx next (8 items),
  then SavingsScreen.tsx (7), SignInScreen.tsx (7), MoreScreen.tsx (6), and
  onward down the ranked list already captured in PROGRESS3.md's session
  history.
- Once the bug-fixing pass is far enough along (or the person decides to
  move on regardless), proceed to Phase C (Publishing) — see
  `4-REMAINING-WORK-ROADMAP.md`: C.1 (EAS Build → real installable
  .apk/TestFlight link) and, optionally, C.2 (App Store / Play Store
  publishing).
- B.12b (pension/Social Security offset, multi-account selector, possible
  scenario-comparison modal) remains an open, unscheduled item.

📚 Older progress: PROGRESS3.md (Phase B Part 2 + first on-device testing
pass, now closed), PROGRESS2.md (Phase B build, B.1–B.14, closed),
PROGRESS1.md (Phase A, closed), PROGRESS.md (original Phases 0–11, closed).
