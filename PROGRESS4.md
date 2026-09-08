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

### Session — Biometric unlock failed outright on Face ID (bug #9)

Investigated via Antigravity (investigation-only, no commits from the
tool), across two rounds — the second round pulled full real code from
PinUnlockScreen.tsx and SettingsScreen.tsx to confirm exact variable
names and existing error-display patterns before writing any fix.
Confirmed two separate, tangled issues:
- `attemptBiometricAuth` (biometrics.ts) only ever returned a plain
  `true`/`false`, discarding the real `result.error` from
  `LocalAuthentication.authenticateAsync`. Every failure — locked out,
  not enrolled, missing permission, genuine error — looked identical to
  the user: nothing happened, no message shown. This is a real bug
  regardless of device/biometric type.
- The specific "Face ID fails, fingerprint works" symptom traced to
  iOS's own rule: with `disableDeviceFallback: true` set (as this app
  does), iOS refuses to even show the Face ID prompt unless the app's
  bundle has `NSFaceIDUsageDescription` wired up — confirmed present and
  correct in this project's `app.json`. However, that config only takes
  effect in a real installed build; testing through Expo Go uses Expo
  Go's own pre-built permissions, not this project's `app.json`, so
  Face ID can fail there for reasons unrelated to anything in this
  codebase. Concluded this specific device-level symptom needs to be
  re-verified once a real installed build exists (Phase C, EAS Build) —
  not something fixable from inside Expo Go.

Applied fix (hand-pasted by the person after review, in three parts):
changed `attemptBiometricAuth`'s return type from `boolean` to a real
`{ success: boolean; error?: string }` result, and added a new
`biometricErrorMessage()` helper that translates a raw error code into a
plain-English message — returning an empty string for a plain user/system
cancel, since backing out on purpose isn't a real error worth showing.
Updated both call sites (`PinUnlockScreen.tsx`'s `runBiometricAuth`,
`SettingsScreen.tsx`'s `handleToggleBiometrics`) to read the new result
shape and show the translated message using each screen's own existing
error-display pattern (`setError`/`setBiometricError`), rather than
silently doing nothing. Caught and fixed a missing import
(`biometricErrorMessage` needed adding to SettingsScreen.tsx's existing
`from '../biometrics'` import line — PinUnlockScreen.tsx's import already
had it) via the resulting `tsc` error. `npx tsc --noEmit` clean.
Committed and pushed. STILL NEEDS: (a) a real on-device re-test of the
now-visible error messages generally (e.g. trigger a lockout or a plain
cancel and confirm the right message — or no message — shows), deferred
along with bugs #1–8 until the rest of this pass is done; and (b) the
original Face-ID-specific failure needs separate re-verification on a
real installed build in Phase C, since Expo Go's own permissions
(not this project's `app.json`) are the suspected cause and can't be
fixed from inside Expo Go.

### Session — Travel checklist-item delete leaves expense behind (bug #8)

Investigated via Antigravity (investigation-only, no commits from the
tool), across two rounds. First round confirmed
`reconcileTravelChecklistTransactions` already exists in
TravelScreen.tsx and correctly cleans up a removed checklist item's
`expenseTransactionId` from `model.manualTransactions` — but only when
it's actually called, and only using whatever `priorChecklist` it's
given. Second round traced the real save-trip flow end to end and found
the actual gap: `handleRemoveChecklistItem` only ever updated local
component state (`setChecklist`) — it never touched `model.travel` and
never called `reconcileTravelChecklistTransactions` itself. That
reconciliation only ran later, when "Save trip" was tapped. So: (a) if
the person tapped the "X" to remove a checked-off, cost-bearing item and
then backed out of the modal instead of tapping Save, nothing was ever
persisted and the linked transaction stayed behind untouched; and (b)
even a subsequent Save could reconcile against a checklist state whose
`expenseTransactionId` bookkeeping had drifted from a prior cancelled
attempt. This made checklist-item delete behave differently from every
other delete button in the app, which persist immediately. Whole-trip
delete was confirmed unaffected — that path already cleans up every
checklist item's linked expense correctly.

Applied fix (hand-pasted by the person after review): made
`handleRemoveChecklistItem` async — it still updates local state
immediately for responsiveness, but for an already-saved trip
(`editingId` set) it now also writes straight to `model.travel` (removing
the item from that trip's saved checklist) and, in the same
`saveModel()` call, filters out the item's `expenseTransactionId` from
`model.manualTransactions` if it had one. A brand-new, not-yet-saved trip
has no `editingId` yet, so it's untouched and behaves exactly as before
(a plain local-state edit until "Save trip" is tapped). `npx tsc --noEmit`
clean (confirmed after paste — no errors). Committed and pushed. Still
needs a real on-device re-test — deferred, along with bugs #1–7, until
the rest of this bug-fixing pass is done and everything can be verified
together in one on-device pass.

### Session — Events/Goals/Groceries/Settings save errors (bug #7)

Investigated via Antigravity (investigation-only, no commits from the
tool) across all 30 `saveModel()` call sites in EventsScreen.tsx (3),
GoalsScreen.tsx (3), GroceriesScreen.tsx (7), and SettingsScreen.tsx (17).
Confirmed every single one directly awaits `saveModel()` inside its own
`try/catch`, intending to show a screen-specific message
(`setErrorMsg(...)`/`Alert.alert(...)`) on failure.

Confirmed this is already effectively fixed as a side effect of bug #2's
`withTimeout()` wrapping inside `saveModel()` itself: `saveModel()` already
had its own internal `Alert.alert('Sync Failed', ...)` /
`Alert.alert('Backup Failed', ...)` around its network calls, but before
bug #2's fix those calls just hung forever offline instead of ever
rejecting — so that internal alert never fired either. Now that
`saveModel()`'s network calls are timeout-wrapped, its own alert
correctly fires within 8 seconds on any of these 30 call sites when
offline. The screen-level `try/catch` blocks are confirmed genuinely
unreachable for network failures (`saveModel()` catches and swallows
those internally, never rethrowing) — but this is harmless dead code, not
a functional bug: the app still closes the modal / clears the form
afterward, which is correct, since the change did save locally first
either way. No code changes made — bug #7 as originally reported (no
error ever surfaces) is resolved by bug #2's fix, just via a generic
"Sync Failed"/"Backup Failed" message rather than each screen's own more
specific wording.

Separately flagged (not fixed, low priority, no reported symptom): in the
linked-household branch of `saveModel()`, the personal local-snapshot
backup call (`saveEncryptedProfileData(...).catch(() => {})`) fails
completely silently with no alert at all, unlike every other write path
in the function. Tracked below as a new, lower-priority known issue.

### Session — Background-save warnings never appear (bug #6)

Investigated via Antigravity (investigation-only, no commits from the
tool), across three flows: password change, account recovery via
recovery key, and household unlink. Confirmed the exact same root disease
as bug #2 (Firestore's `setDoc()`-backed writes never reject or time out
on their own while offline — they just hang forever), spread across five
un-timed-out call sites in two files:
- `changePassword()` in DataContext.tsx — both the linked-profile branch
  (`saveProfileCloudBackup`) and the unlinked-profile branch
  (`saveProfileCloudBackup` + `deleteRecoveryKey`).
- `unlinkHousehold()` in DataContext.tsx — `saveProfileCloudBackup`.
- `unlinkAndTransferOwnership()` in DataContext.tsx — `saveProfileCloudBackup`.
- `handleRecoverWithKey()` in SignInScreen.tsx — `saveProfileCloudBackup`
  (both branches) and `saveRecoveryKey`.

Two extra gaps were found and folded into the same fix while in there:
`changePassword()`'s linked-profile branch had no `Alert.alert()` at all
(just a silent `console.error`), and `unlinkAndTransferOwnership()`'s
backup call had an empty `.catch(() => {})` with no warning either — both
missing the "show a warning" half of the pattern entirely, rather than
having an unreachable one like bug #2's three original spots.

Applied fix (hand-pasted by the person after review): moved the existing
`withTimeout()` helper out of `DataProvider` and made it an exported,
module-level function in DataContext.tsx, so SignInScreen.tsx's direct
Firestore calls can reuse the exact same timeout guard. Wrapped all five
call sites above in `withTimeout()` (8-second timeout each), added the
missing `Alert.alert()` to `changePassword()`'s linked-profile branch, and
replaced `unlinkAndTransferOwnership()`'s empty catch with a real warning
alert matching its sibling `unlinkHousehold()`. In SignInScreen.tsx, the
two `saveProfileCloudBackup` calls inside `handleRecoverWithKey()` are
awaited with no `.catch()` of their own (unlike the DataContext.tsx call
sites) — deliberately, since they're on account recovery's critical path
rather than a fire-and-forget background save: a timeout now propagates
up to the function's existing outer try/catch, which already sets
`recoveryError` and shows it inline, so recovery now fails cleanly within
8 seconds instead of leaving `recoveryBusy` spinning forever offline.
`npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deferred along with bugs #1–5 until the rest of this
bug-fixing pass is done, to test everything together in one on-device
pass.

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
6. ✅ FIXED (pending on-device re-test) — None of the 3 promised
   background-save warnings ever showed on-device. Root cause: same
   disease as bug #2 — five separate `saveProfileCloudBackup`/
   `saveRecoveryKey`/`deleteRecoveryKey` calls across `changePassword()`,
   `unlinkHousehold()`, `unlinkAndTransferOwnership()` (all in
   DataContext.tsx), and `handleRecoverWithKey()` (SignInScreen.tsx) had
   no timeout, so on a dead connection they just hung instead of
   rejecting into their `.catch()` warning. Two of the five also had no
   warning at all wired up (`changePassword()`'s linked-profile branch
   had no `Alert.alert()`; `unlinkAndTransferOwnership()`'s catch was
   empty) — both fixed to match their working siblings. Fixed by
   exporting `withTimeout()` as a module-level function from
   DataContext.tsx (previously private to `DataProvider`) and wrapping
   all five call sites in it (8-second timeout each), plus adding/fixing
   the two missing warning alerts. `npx tsc --noEmit` clean. STILL NEEDS:
   a real on-device re-test (airplane mode on, then trigger each of the
   three flows — change password, recover via recovery key, unlink from
   household — and confirm each shows its warning alert within ~8 seconds
   instead of hanging) before marking fully verified.
7. ✅ RESOLVED (as a side effect of bug #2, pending on-device re-test) —
   Events/Goals/Groceries/Settings' 30 `saveModel()` call sites all have
   their own screen-level try/catch intending a specific error message,
   but `saveModel()` catches and swallows all network errors internally
   and never rethrows, so those 30 catch blocks are confirmed unreachable
   dead code. This is no longer a functional bug, though: `saveModel()`
   already has its own internal "Sync Failed"/"Backup Failed" alert
   around its network calls, and bug #2's `withTimeout()` fix means that
   alert now correctly fires (instead of hanging forever) on every one of
   these 30 call sites too, since they all route through the same shared
   `saveModel()`. No code changes made. STILL NEEDS: a real on-device
   re-test (airplane mode on, try saving/deleting on any of the four
   screens, confirm the generic "Sync Failed"/"Backup Failed" alert
   appears within ~8 seconds) to fully close this out — can be folded
   into the same on-device pass as bugs #1–6.
8. ✅ FIXED (pending on-device re-test) — Travel checklist-item delete
   left its linked expense behind in Transactions. Root cause:
   `handleRemoveChecklistItem` only ever updated local component state —
   it never touched `model.travel` and never called the existing (and
   already-correct) `reconcileTravelChecklistTransactions`, which only
   ran later on "Save trip." So removing an item and then backing out of
   the modal without saving left everything, including its linked
   transaction, untouched; unlike every other delete button in the app,
   which persist right away. Whole-trip delete was confirmed unaffected.
   Fixed by making `handleRemoveChecklistItem` async: for an already-
   saved trip it now writes the removal straight to `model.travel` and
   strips the item's `expenseTransactionId` from `model.manualTransactions`
   in the same `saveModel()` call; a brand-new unsaved trip is untouched
   and still behaves as a local-state edit until "Save trip" is tapped.
   `npx tsc --noEmit` clean. STILL NEEDS: a real on-device re-test (check
   off a cost-bearing checklist item on an existing trip, confirm its
   transaction appears in Transactions, remove the checklist item, and
   confirm the transaction disappears immediately without needing to tap
   "Save trip") before marking fully verified.
8b. NEW, low priority, not yet fixed — in `saveModel()`'s linked-household
    branch (DataContext.tsx), the personal local-snapshot backup call
    (`saveEncryptedProfileData(...).catch(() => {})`) fails completely
    silently with no alert at all, unlike every other write path in that
    same function. Found incidentally while investigating bug #7. No
    reported on-device symptom yet — deferred until higher-priority items
    are done.
9. ✅ FIXED (pending on-device re-test; Face-ID-specific symptom also
   pending a real installed build) — Biometric unlock failed outright on
   a Face ID device with fingerprint off. Root cause was two tangled
   issues: `attemptBiometricAuth` discarded the real error from
   `LocalAuthentication.authenticateAsync`, collapsing every kind of
   failure (locked out, not enrolled, missing permission, genuine error)
   into a silent `false` with no message shown — a real bug independent
   of device type. Separately, the specific "Face ID fails, fingerprint
   works" symptom is believed caused by testing through Expo Go: iOS
   requires `NSFaceIDUsageDescription` to be wired into the app's actual
   bundle before it will even show the Face ID prompt when
   `disableDeviceFallback: true` is set (as this app does) — this
   project's `app.json` already has that configured correctly, but Expo
   Go uses its own separate pre-built permissions, not this project's
   config, so Face ID can fail there for reasons outside this codebase.
   Fixed the general error-swallowing bug by changing
   `attemptBiometricAuth`'s return type to include the real error code,
   adding a `biometricErrorMessage()` translator (blank for a plain
   user/system cancel, since that's not a real error), and wiring both
   call sites (PinUnlockScreen.tsx, SettingsScreen.tsx) to show the
   translated message using each screen's existing error-display
   pattern instead of doing nothing. `npx tsc --noEmit` clean. STILL
   NEEDS: (a) an on-device re-test of the now-visible error messages in
   general, deferred along with bugs #1–8 until the rest of this pass is
   done; (b) the original Face-ID-specific failure needs separate
   re-verification on a real installed build once Phase C (EAS Build) is
   reached, since it can't be confirmed fixed from inside Expo Go.
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
  Bugs #1–6 are now code-complete pending on-device re-test (deliberately
  batched — the person is testing all fixes together in one on-device pass
  once the remaining bugs below are also fixed, rather than one at a time).
  Bug #7 turned out to already be resolved as a side effect of bug #2 —
  no code change was needed, just confirmed via investigation. Bug #8
  (Travel checklist-delete expense cleanup) is now also code-complete
  pending on-device re-test, same batch. Bug #9 (biometric unlock
  swallowing errors) is now also code-complete pending on-device
  re-test — note its Face-ID-specific symptom additionally needs
  re-verification on a real installed build in Phase C, since it may be
  an Expo Go artifact rather than an app bug. Suggested order for what's
  left: (10) the remaining smaller bugs (PIN-off loading indicator,
  Category Watchlist wording, "which of these is you?" live update,
  AccountsScreen's missing label), (8b) the newly-found silent
  personal-snapshot-backup failure in `saveModel()`'s linked-household
  branch, low priority.
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
