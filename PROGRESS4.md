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

### Session — "Fewer words" pass: OnboardingScreen.tsx

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed OnboardingScreen.tsx has no data-array step structure
(no `const STEPS = [...]`) — all step 1/2/3 text lives inline in
conditional JSX branches gated on a `useState<1 | 2 | 3>` step value.
Antigravity supplied the real, full, unelided file contents plus 11
proposed wordy-text trims (error message, step 1 subtitle, both feature
card descriptions, step 2 subtitle, biometric-active subtitle, biometrics-
unavailable banner, the PIN input label, the skip-PIN ghost button, the
step 3 biometric status badge, and the step 3 tip card), each shown with
real surrounding code and a one-sentence justification. All 11 reviewed
against the real code and confirmed to be text-only (no logic, state, or
layout touched) and to preserve all meaning a first-time user would need.

Applied (hand-pasted by the person after review, as 11 find/replace
snippets): trimmed the save-PIN catch-error message; the step 1 subtitle;
both step 1 feature card descriptions (End-to-End Encrypted, Private Solo
or Shared); the step 2 (Quick Unlock) subtitle; the biometric-active-card
subtitle; the biometrics-unavailable banner text; the PIN input label
(sentence → concise label, matching its "Confirm Quick PIN" sibling); the
"Skip for now" ghost button; the step 3 biometric-enabled status badge
text; and the step 3 tip card. `npx tsc --noEmit` clean (0 errors) —
text-only change, no type impact. Committed and pushed.

This completes OnboardingScreen.tsx on the "fewer words" ranked list.
Next up per that list: SavingsScreen.tsx (7 items).

### Session — Android date picker replaced with in-app themed calendar (design-change request)

Scoped and implemented via Antigravity (investigation + drafted
implementation only, no commits from the tool). Scoping pass found all
15 date-selection points across 9 screens already route through a
single shared component, src/components/DateField.tsx — no screen
files needed to change. Confirmed
`@react-native-community/datetimepicker`'s Android implementation
literally returns `null` from its React component and hands off
entirely to the Android OS's native DatePickerDialog/MaterialDatePicker
— there's no prop or mode to theme it in-app. Also confirmed every
DateField call site already sits inside a BottomSheet or Modal, ruling
out a nested `<Modal>` approach for the replacement (Android has known
issues with nested modals) in favor of an inline expanding card, the
same pattern the iOS branch already uses.

Implemented (hand-pasted by the person after review): rewrote
DateField.tsx's Android branch to render a fully custom, theme-aware
inline calendar card in place of the native picker — month/year header
with chevron navigation (reusing the exact day-count/first-weekday math
already working in CalendarScreen.tsx), a day-of-week row, and a padded
7-column day grid. Added local `viewYear`/`viewMonth` state (reset via
`useEffect` whenever the picker opens or `value` changes) separate from
the selected value. Selecting a day calls the existing `onChange`
callback and closes the card, matching the native picker's prior
behavior. Dates outside `minimumDate`/`maximumDate` render disabled and
dimmed via ISO-string comparison. Today's date gets a gold border;
the selected date gets a solid accent-color fill. Zero new npm
dependencies — pure View/Text/TouchableOpacity, matching the app's
existing components. iOS's native inline picker is completely
untouched. Given the scope of the change (touching nearly every part
of the file), it was applied as a full-file replacement rather than
piecemeal snippets. `npx tsc --noEmit` clean. Still needs a real
on-device re-test on Android — not yet confirmed working on a physical
device.

### Session — Emergency Fund "Saved" checkmark, round 2 fix (bug #5/5b)

Investigated via Antigravity (investigation-only, no commits from the
tool), specifically re-examining the real current code rather than
re-applying the prior null-crash diagnosis, since that fix (reading
through efExpensesDisplay/efSavingsDisplay before .trim()) was confirmed
on-device to not resolve the symptom. Found a different root cause,
one level up from handleSaveEf itself: `calcInputsFromModel()` (the
shared helper both the FI Calculator and Emergency Fund sections read
from, via a `storedCalc` variable) did an all-or-nothing fallback —
`model.calculatorInputs || { ...all seven default fields... }` — instead
of merging field-by-field. Once ANY of the seven calculator fields had
ever been saved (e.g. from testing the FI Calculator during bug #4's
work), `model.calculatorInputs` became a real, non-null object, so the
`|| {defaults}` fallback never triggered again — but that real object
only had whichever fields had actually been written to it. Any
Emergency-Fund-specific field never separately saved came back as
`undefined`, which got turned into the literal string `"undefined"` by
`String(undefined)` downstream, which then failed `parseFloat`, which
then silently aborted `handleSaveEf` before it ever reached
`setEfSaved(true)` — explaining all three still-broken on-device
scenarios (editing only one field, using the suggestion button without
typing, etc.) in one shot.

Applied fix (hand-pasted by the person after review): rewrote
`calcInputsFromModel()` to always start from the full seven-field
defaults object and spread `model.calculatorInputs` on top of it
(`{ ...defaults, ...(model!.calculatorInputs || {}) }`), instead of
choosing one or the other. Any field that was genuinely never saved now
correctly falls back to `''` (a real empty string) rather than
`undefined`. Since this is the single shared source both the FI
Calculator and Emergency Fund sections read from, this fix also
reinforces bug #4's fix (same underlying class of gap), though the
originally-reported break was specifically traced to the EF checkmark.
`npx tsc --noEmit` clean (confirmed after paste — 0 errors). Committed
and pushed. Per the person's standing direction, on-device re-test is
being done together with bug #4 in one combined pass rather than
separately.

### Session — FI Calculator fresh investigation + fix, round 2 (bug #4)

Investigated via Antigravity (investigation-only, no commits from the
tool), specifically re-examining the real current code rather than
re-applying the original diagnosis, per the still-broken symptoms found
in the prior on-device re-test pass. Confirmed two separate root causes:

- Preset/suggestion-button taps not saving immediately: a classic React
  stale-closure bug. Each button called `setFiSwrInput(preset)` /
  `setFiSavingsInput(...)` / `setFiMonthlySavingsInput(...)` and then
  called `handleSaveFi()` on the very next line, inside the same
  synchronous event handler. React state updates are asynchronous —
  `handleSaveFi()` ran before the just-scheduled state update had
  actually landed, so it read `fiSwrInput`/`fiSavingsInput`/
  `fiMonthlySavingsInput` (via their `?? fiXDisplay` fallback) as their
  OLD value from the current render's closure, and saved that stale
  value instead of the one just tapped. This is the exact same class of
  bug already fixed once for Emergency Fund's suggestion button (see bug
  #5b), which was given an override parameter for the same reason —
  `handleSaveFi` had not been given the same treatment.
- "Years Until FI" still showing placeholder with Current Savings blank:
  traced to Annual Expenses, not Current Savings. The prior fix's blank-
  Current-Savings-to-0 change was confirmed correct and working
  (`fiSavingsNum` does become `0`, which passes `fiCanProjectTimeline`'s
  `!isNaN(...)` check) — but `fiCanProjectTimeline` also requires
  `fiNumber !== null`, which requires `fiExpensesNum > 0`. Annual
  Expenses was the one field, of five on this section, that never got
  an `onBlur={handleSaveFi}` added in the original fix — so it silently
  reverted to blank on leaving/returning to the screen, `fiNumber` stayed
  `null`, and the calculation stayed blocked regardless of what was
  filled into the other three fields. Separately confirmed the
  placeholder text itself was misleading — it read "Enter an expected
  return rate and monthly savings above to see this," never mentioning
  Annual Expenses at all, which is why testing with only Current Savings
  left blank didn't surface the real missing field.

Applied fix (hand-pasted by the person after review, in two rounds — see
below): gave `handleSaveFi` an optional `overrides` parameter
(`{ expenses?, savings?, swr?, returnRate?, monthlySavings? }`), each
falling back through the existing `input ?? display` chain when not
passed, mirroring the same pattern already used for Emergency Fund's
`handleSaveEf`. Updated the SWR preset buttons and both "tap to use
this" suggestion buttons to pass the freshly-computed value straight
into `handleSaveFi({ ... })` instead of relying on state that hasn't
landed yet. Added the missing `onBlur={handleSaveFi}` to the Annual
Expenses TextInput, matching the other four FI fields. Corrected the
placeholder text to also mention Annual Expenses.

First `npx tsc --noEmit` pass surfaced 6 real type errors: React
Native's `TextInput`'s `onBlur` prop expects a `(e: BlurEvent) => void`
and `TouchableOpacity`'s `onPress` expects a
`(event: GestureResponderEvent) => void` — passing the now-differently-
shaped `handleSaveFi` (which expects an optional overrides object, not
an event) directly as those props no longer type-checked, on the 5
`onBlur={handleSaveFi}` references and 1 `onPress={handleSaveFi}`
reference (the main "Save" button) that hadn't been touched by this
fix. Fixed by wrapping each in a no-argument arrow —
`onBlur={() => handleSaveFi()}` / `onPress={() => handleSaveFi()}` —
via a plain find/replace across all 6 occurrences, since the fix text is
identical everywhere it appears. Second `npx tsc --noEmit` pass came
back clean, 0 errors.

Per the person's direction, on-device re-test of this fix is being
DEFERRED — rather than testing bug #4 alone right now, it'll be tested
together with bug #5/5b and everything else once the whole bug-fixing
pass is done, batched into one on-device pass before/alongside moving to
Phase C. Status below reflects "fix applied, compiles clean, on-device
re-test still pending" rather than fully verified.

### Session — On-device re-test pass across bugs #1–13

Ran the on-device re-test checklist across all 13 previously-fixed bugs.

CONFIRMED FIXED, no further action needed (11 of 13): Bug #1 (offline
sign-out → sign-in lockout), #2 (offline delete hangs on
Accounts/Bills/Debts), #3 (Left to Spend caution threshold persisting
through a full app close/reopen), #6 (background-save warnings on
password change / recovery-key recovery / household unlink), #7
(Events/Goals/Groceries/Settings generic save-error alerts), #8 (Travel
checklist-item delete removing its linked transaction immediately), #9
(biometric unlock showing a real error message on a genuine failure), #10
(PIN turn-off spinner/disabled state), #11 (Category Watchlist showing
"At budget" in orange at exactly 100%, "Over budget" in red one peso
over), #12 ("which of these is you?" updating Transactions and the Person
Spending report live, no restart needed), and #13 (AccountsScreen
Cards/List toggle floating label appearing on tap). All behaved exactly
as expected. Flipped to fully ✅ verified below.

STILL BROKEN — needs a fresh investigation round (2 of 13):
- Bug #4 (FI Calculator): the onBlur auto-save on the four individual
  text fields IS confirmed working (a typed value now survives leaving
  and returning to the screen). But two parts of the original fix did
  NOT work on-device: (a) leaving "Current savings" blank while filling
  in the other three fields still does not make "Years Until FI"
  calculate — it still shows placeholder text; (b) tapping an SWR preset
  button or a "tap to use this" suggestion button still does not save
  immediately. The original diagnosis (blank-current-savings parsed as
  NaN; taps need their own handleSaveFi() call) does not fully explain
  what's still happening — needs a fresh Antigravity investigation
  against the real current code rather than assuming the prior fix was
  complete.
- Bug #5/5b (Emergency Fund): the onBlur auto-save IS confirmed working
  (editing either field and leaving the screen without tapping Save now
  sticks). But the original crash fix (reading through
  efExpensesDisplay/efSavingsDisplay before .trim()) did NOT resolve the
  reported symptom — editing only one of the two fields (or using "use
  suggested expenses" without typing anything) and tapping Save still
  does not show the "Saved" checkmark. Needs a fresh Antigravity
  investigation pass to find what's actually still failing inside
  handleSaveEf; the null-crash fix alone wasn't sufficient.

Neither fix is being reverted — the onBlur/auto-save portions of both are
confirmed genuinely working and stay in place. Only the specific
still-broken behaviors above need new investigation prompts.

### Session — "Which of these is you?" picker doesn't update Transactions live (bug #12)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause: the selected person's id (`myPersonId`) is
stored in AsyncStorage under a per-profile key (myPerson.ts), completely
outside DataContext/HouseholdModel. Every consuming screen
(TransactionsScreen.tsx, reports/PersonSpendingReport.tsx) read it via a
one-time `useEffect(() => { getMyPersonId(username).then(setX) }, [username])`
that only ever runs once on mount — and since React Navigation's bottom
tabs keep screens mounted in memory rather than remounting them on tab
switch, changing the selection on ProfileScreen (which only updated its
own local state plus AsyncStorage) never reached those already-mounted
screens until the whole app process was killed and restarted. Confirmed
via codebase-wide search that exactly two screens read this value
(TransactionsScreen.tsx and PersonSpendingReport.tsx) — Home, Dashboard,
Settings, Accounts, Bills, Debts, Savings, and every other report are
unaffected, since none of them read `myPersonId` at all.

Applied fix (hand-pasted by the person after review): reused the exact
pub-sub pattern this codebase already has for the same class of problem
(`subscribeToAutoLockMinutes` in autoLock.ts) — added a
`subscribeToMyPersonId` listener registry to myPerson.ts, notified on both
`setMyPersonId` and `clearMyPersonId`, and subscribed to it inside the
existing useEffect in both TransactionsScreen.tsx and
PersonSpendingReport.tsx (alongside, not replacing, the initial on-mount
read), so both screens now re-render immediately when the selection
changes on ProfileScreen, without needing a restart. ProfileScreen.tsx
itself was left untouched, since it already updates its own local state
synchronously right after writing and has no stale-read problem of its
own. `npx tsc --noEmit` clean. Committed and pushed. Still needs a real
on-device re-test — deferred, along with bugs #1–11, until the rest of
this bug-fixing pass is done and everything can be verified together in
one on-device pass.

### Session — Category Watchlist "over budget" fires at exactly 100% (bug #11)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed root cause in a single function,
`getCategoryBudgetStatus` (transactions.ts): it computed
`pct = (spent / budget) * 100` and checked `if (pct >= 100)` for the
"Over budget" (red) state, so spending exactly equal to the budget was
misclassified as over budget instead of at it. Confirmed via a codebase-
wide search that this comparison exists in exactly one place — the only
other `>= 100` matches found were in GoalsScreen.tsx's unrelated goal-
completion logic — and that DashboardScreen.tsx's "Watched Categories"
card is the sole UI consumer of this function, simply rendering whatever
label/color it returns with no threshold logic of its own to also fix.

Applied fix (hand-pasted by the person after review): changed the "Over
budget" check to `pct > 100` (strictly exceeding), and added a new
distinct tier for `pct >= 100` (now strictly meaning "exactly at 100%,
since >100% is already caught above") labeled "At budget" in the existing
orange/caution color, so hitting the limit exactly reads as a caution
state rather than either an outright error or a misleadingly-calm
"Getting close." `npx tsc --noEmit` clean. Committed and pushed. Still
needs a real on-device re-test — deferred, along with bugs #1–10, until
the rest of this bug-fixing pass is done and everything can be verified
together in one on-device pass.

### Session — Quick PIN turn-off shows no loading indicator (bug #10)

Investigated via Antigravity (investigation-only, no commits from the
tool). Confirmed there was no dedicated function or busy-state boolean for
turning PIN off at all — it was an inline anonymous async callback inside
the "Turn Off" alert's destructive button, calling `removePin(username)`
(an async AsyncStorage.removeItem call in pin.ts) with no
Alert.alert(...)... [{ text: 'Turn Off', onPress: async () => { ... } }]
loading state around it, unlike every other async action on this screen
(clearBusy, exportBusy, passChangeBusy, etc.), which all follow the same
`[xBusy, setXBusy] = useState(false)` pattern with an ActivityIndicator
swapped in for the button's label while busy. Confirmed the action really
is asynchronous (a real await on AsyncStorage I/O), so the gap between tap
and the button/UI updating was genuine, not just a slow re-render.

Applied fix (hand-pasted by the person after review): added a `pinBusy`
state variable alongside the existing `pinIsSet`, wrapped the
`removePin(username)` call in `setPinBusy(true)` / `try...finally` (also
adding a real `Alert.alert('Failed to remove PIN', ...)` on failure, which
didn't exist before), disabled both the "Turn Off" and "Change PIN"
buttons while busy, and swapped the "Turn Off" button's label for an
ActivityIndicator during the action — matching the exact pattern already
used by clearBusy/exportBusy elsewhere in this same file. `npx tsc
--noEmit` clean. Committed and pushed. Still needs a real on-device
re-test — deferred, along with bugs #1–9, until the rest of this
bug-fixing pass is done and everything can be verified together in one
on-device pass.

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
- The "fewer words" trimming pass is PARTIALLY done: SettingsScreen.tsx,
  ProfileScreen.tsx, and OnboardingScreen.tsx are complete. A full
  ranked-by-wordiness inventory of every remaining screen already exists
  (captured in PROGRESS3.md's session history) — next up per that list:
  SavingsScreen.tsx (7 items), SignInScreen.tsx (7), MoreScreen.tsx (6),
  and 17 more screens after that in descending order.

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

🐞 Real bugs confirmed on-device (11 of 13 now verified fixed; #4 and #5/5b need a fresh investigation round)
1. ✅ VERIFIED ON-DEVICE — Offline sign-out → sign-in lockout. Root cause:
   Firestore's own connection (separate from Firebase Auth) can get stuck
   in a dead/backoff state after a period offline, even once the network
   and Auth both recover — so the very next Firestore read
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
   of the app getting stuck mid-sign-out. `npx tsc --noEmit` clean.
   CONFIRMED on-device: airplane mode off/on, then signing in with the
   real username/password succeeded normally. No further action needed.
2. ✅ VERIFIED ON-DEVICE — Offline delete hangs instead of showing an
   error (Accounts/Bills/Debts). Root cause: all three screens' delete
   handlers route through the shared `saveModel()` in DataContext.tsx,
   which awaits Firestore's `setDoc()` to sync the change to the cloud —
   but `setDoc()` never rejects or times out on its own when offline, it
   just stays pending forever. So `saveModel()` never finished, the
   calling screen's `finally { setSaving(false) }` never ran, and the
   loading spinner stayed stuck until connectivity returned. This also
   explains why the earlier "add try/catch to Accounts/Bills/Debts delete"
   fix never worked: the `await` it wrapped never threw in the first place
   (it just hung), and separately `saveModel()` already catches its own
   internal write errors and never re-throws them to the caller, so that
   screen-level `catch` block was unreachable dead code even in a world
   where the hang wasn't the issue. Fixed by adding a `withTimeout()`
   helper in DataContext.tsx and racing both cloud-write paths (linked
   household `saveHouseholdData`, and unlinked personal
   `saveProfileCloudBackup`) against an 8-second timeout, so `saveModel()`
   now always resolves either way — on timeout it shows the existing
   "Sync Failed"/"Backup Failed" alert (data was already saved locally
   first, so nothing is lost), and the calling screen's `setSaving(false)`
   / `closeModal()` correctly fires. `npx tsc --noEmit` clean. CONFIRMED
   on-device: with airplane mode on, deleting an account, a bill, and a
   debt each showed a "Sync Failed" alert within ~8 seconds instead of
   hanging. No further action needed.
3. ✅ VERIFIED ON-DEVICE — Left to Spend caution threshold doesn't
   persist. Root cause: the threshold's TextInput only saved on `onBlur`,
   which React Native doesn't reliably fire when the screen is torn down
   (Back button, swipe-back gesture, tab switch, or app close) — so a
   typed value could be silently lost instead of saved. Fixed by adding a
   ~600ms auto-save-after-typing-stops effect alongside the existing
   onBlur save, so the value is written almost immediately no matter how
   the screen is later left. `npx tsc --noEmit` clean. CONFIRMED
   on-device: typed a new threshold value, fully closed the app (swiped
   away, not just backgrounded), reopened it, and both Settings and Home's
   Left to Spend widget showed the new value. No further action needed.
4. ⏸️ FIX APPLIED, TSC CLEAN, ON-DEVICE RE-TEST DEFERRED — FI Calculator
   (Savings tab). Fresh investigation (round 2, see session log above)
   found the preset/suggestion-button taps were a stale-closure bug —
   `handleSaveFi()` was called immediately after `setState(...)` in the
   same synchronous handler, so it read the OLD state value rather than
   the one just tapped. Fixed by giving `handleSaveFi` an optional
   overrides parameter so each button can pass its new value directly,
   mirroring the pattern already used for Emergency Fund's
   `handleSaveEf`. Separately found "Years Until FI" staying blocked with
   Current Savings blank was actually caused by Annual Expenses — the one
   FI field that never got an `onBlur` auto-save in the original fix, so
   it reverted to blank on leaving the screen, which blocks the
   calculation regardless of the other three fields; fixed by adding the
   missing `onBlur`, and corrected the placeholder text (which never
   mentioned Annual Expenses) to say so. `npx tsc --noEmit` clean (after
   a follow-up fix for 6 type errors caused by wrapping `handleSaveFi` in
   an overrides-object signature — `onBlur`/`onPress` needed a
   no-argument arrow wrapper instead of a direct function reference).
   Per the person's direction, on-device re-test is DEFERRED — will be
   tested together with bug #5/5b and batched with the rest of this pass
   before/alongside moving to Phase C, rather than tested alone now.
5. / 5b. ⏸️ FIX APPLIED (round 2), TSC CLEAN, ON-DEVICE RE-TEST
   DEFERRED — Emergency Fund "Saved" checkmark. The onBlur auto-save
   added to both fields (expenses, savings) IS confirmed working —
   editing either field and leaving the screen without tapping Save now
   sticks. Round 1's null-crash fix to `handleSaveEf` itself was
   confirmed NOT sufficient. Round 2 investigation found the real root
   cause one level up: `calcInputsFromModel()` used an all-or-nothing
   fallback (`model.calculatorInputs || {defaults}`) instead of merging
   field-by-field, so once any calculator field had ever been saved
   (e.g. from FI Calculator testing), EF-specific fields that were never
   separately saved came back as `undefined` — which became the literal
   string `"undefined"`, which failed `parseFloat`, which silently
   aborted `handleSaveEf` before `setEfSaved(true)`. Fixed by rewriting
   `calcInputsFromModel()` to always start from the full defaults object
   and spread the saved data on top, rather than choosing one or the
   other. `npx tsc --noEmit` clean. Per the person's direction, on-device
   re-test is DEFERRED — will be tested together with bug #4 in one
   combined pass, not tested alone.
6. ✅ VERIFIED ON-DEVICE — None of the 3 promised background-save
   warnings ever showed on-device. Root cause: same disease as bug #2 —
   five separate `saveProfileCloudBackup`/`saveRecoveryKey`/
   `deleteRecoveryKey` calls across `changePassword()`,
   `unlinkHousehold()`, `unlinkAndTransferOwnership()` (all in
   DataContext.tsx), and `handleRecoverWithKey()` (SignInScreen.tsx) had
   no timeout, so on a dead connection they just hung instead of
   rejecting into their `.catch()` warning. Two of the five also had no
   warning at all wired up (`changePassword()`'s linked-profile branch
   had no `Alert.alert()`; `unlinkAndTransferOwnership()`'s catch was
   empty) — both fixed to match their working siblings. Fixed by
   exporting `withTimeout()` as a module-level function from
   DataContext.tsx and wrapping all five call sites in it (8-second
   timeout each), plus adding/fixing the two missing warning alerts.
   `npx tsc --noEmit` clean. CONFIRMED on-device: with airplane mode on,
   each of the three flows (change password, recover via recovery key,
   unlink from household) showed its own warning alert within ~8 seconds
   instead of hanging. No further action needed.
7. ✅ VERIFIED ON-DEVICE (resolved as a side effect of bug #2) —
   Events/Goals/Groceries/Settings' 30 `saveModel()` call sites all have
   their own screen-level try/catch intending a specific error message,
   but `saveModel()` catches and swallows all network errors internally
   and never rethrows, so those 30 catch blocks are confirmed unreachable
   dead code. No code change was needed here — `saveModel()`'s own
   internal "Sync Failed"/"Backup Failed" alert, combined with bug #2's
   `withTimeout()` fix, already covers this. CONFIRMED on-device: with
   airplane mode on, saving/deleting on each of the four screens (Events,
   Goals, Groceries, Settings) showed the generic "Sync Failed"/"Backup
   Failed" alert within ~8 seconds instead of nothing happening. No
   further action needed.
8. ✅ VERIFIED ON-DEVICE — Travel checklist-item delete left its linked
   expense behind in Transactions. Root cause: `handleRemoveChecklistItem`
   only ever updated local component state — it never touched
   `model.travel` and never called the existing (and already-correct)
   `reconcileTravelChecklistTransactions`, which only ran later on "Save
   trip." So removing an item and then backing out of the modal without
   saving left everything, including its linked transaction, untouched;
   unlike every other delete button in the app, which persist right away.
   Fixed by making `handleRemoveChecklistItem` async: for an
   already-saved trip it now writes the removal straight to
   `model.travel` and strips the item's `expenseTransactionId` from
   `model.manualTransactions` in the same `saveModel()` call. `npx tsc
   --noEmit` clean. CONFIRMED on-device: checked off a cost-bearing
   checklist item on an existing trip, confirmed its transaction appeared
   in Transactions, removed the checklist item, and the transaction
   disappeared immediately without needing to tap "Save trip." No further
   action needed.
8b. ✅ Fixed, on-device re-test not really applicable — in
    `saveModel()`'s linked-household branch (DataContext.tsx), the
    personal local-snapshot backup call
    (`saveEncryptedProfileData(...).catch(() => {})`) failed completely
    silently with no alert at all. Fixed by giving it a real `.catch()`
    that logs and shows a warning, wrapped in the existing `withTimeout()`
    helper, deliberately left NOT awaited/blocking (AsyncStorage doesn't
    hang offline the way Firestore does, so no need to add up to 8 extra
    seconds to every save). `npx tsc --noEmit` clean. Hard to force a
    genuine AsyncStorage failure on demand to trigger this on a real
    device, so this stays a code-level confirmation rather than a forced
    on-device repro — no report of it firing incorrectly either.
9. ✅ VERIFIED ON-DEVICE (general fix); Face-ID-specific symptom still
   pending a real installed build — Biometric unlock failed outright on a
   Face ID device with fingerprint off. Root cause was two tangled
   issues: `attemptBiometricAuth` discarded the real error from
   `LocalAuthentication.authenticateAsync`, collapsing every kind of
   failure (locked out, not enrolled, missing permission, genuine error)
   into a silent `false` with no message shown. Separately, the specific
   "Face ID fails, fingerprint works" symptom is believed caused by
   testing through Expo Go, since it uses its own separate pre-built
   permissions rather than this project's `app.json`. Fixed the
   general error-swallowing bug by changing `attemptBiometricAuth`'s
   return type to include the real error code, adding a
   `biometricErrorMessage()` translator, and wiring both call sites
   (PinUnlockScreen.tsx, SettingsScreen.tsx) to show the translated
   message instead of doing nothing. `npx tsc --noEmit` clean. CONFIRMED
   on-device: triggering a biometric failure on purpose showed a real
   error message instead of nothing happening. STILL NEEDS: the original
   Face-ID-specific "fails to even prompt" symptom needs separate
   re-verification on a real installed build once Phase C (EAS Build) is
   reached, since it may be an Expo Go artifact rather than an app bug —
   not re-tested this pass.
10. ✅ VERIFIED ON-DEVICE — Turning PIN off showed no loading indicator,
    read as frozen. Root cause: the "Turn Off" action was an inline
    anonymous async callback with no busy-state tracking at all, unlike
    every other async action on this screen. Fixed by adding a `pinBusy`
    state variable, wrapping the existing `removePin(username)` call in
    `setPinBusy(true)`/`try...finally` (also adding a real error alert on
    failure, which didn't exist before), disabling both the "Turn Off"
    and "Change PIN" buttons while busy, and swapping the "Turn Off"
    label for an ActivityIndicator during the action. `npx tsc --noEmit`
    clean. CONFIRMED on-device: tapping "Turn Off" showed a spinner and
    disabled the button instead of appearing to do nothing until it
    completed. No further action needed.
11. ✅ VERIFIED ON-DEVICE — Category Watchlist "over budget" wording
    fired at exactly 100% instead of only once genuinely over 100%. Root
    cause: `getCategoryBudgetStatus` (transactions.ts) checked
    `pct >= 100` for the "Over budget" state, so hitting the budget
    exactly was misclassified as over it. Fixed by changing the check to
    `pct > 100` (strictly exceeding) and adding a distinct "At budget"
    tier for exactly `pct >= 100` in the existing orange caution color.
    `npx tsc --noEmit` clean. CONFIRMED on-device: spending that exactly
    equaled a ₱1,000 category budget showed "At budget" in orange, and
    one peso over (₱1,001) correctly flipped to "Over budget" in red. No
    further action needed.
12. ✅ VERIFIED ON-DEVICE — "Which of these is you?" picker didn't update
    Transactions live, needed a full app restart to take effect. Root
    cause: the selected person id is stored in AsyncStorage outside
    DataContext/HouseholdModel, and both consuming screens
    (TransactionsScreen.tsx, reports/PersonSpendingReport.tsx) only ever
    read it once on mount — since React Navigation's bottom tabs keep
    screens mounted rather than remounting on tab switch, a change made
    on ProfileScreen never reached either already-mounted screen. Fixed
    by reusing the same pub-sub listener pattern this codebase already
    uses for the identical problem in autoLock.ts — added
    `subscribeToMyPersonId` to myPerson.ts, notified on set/clear, and
    subscribed to it in both affected screens' existing useEffect blocks.
    `npx tsc --noEmit` clean. CONFIRMED on-device: changed "Which of
    these is you?" on Profile, switched back to Transactions without
    restarting the app, and "Mine" labeling updated immediately; same
    confirmed on the Person Spending report. No further action needed.
13. ✅ VERIFIED ON-DEVICE — AccountsScreen Cards/List toggle "Stacked
    card view" floating label didn't appear on tap. Root cause: a
    combination of `LayoutAnimation.configureNext` disrupting
    `IconLabelHint`'s own measurement call, the tooltip defaulting to
    `position="above"` with no room above it at the top of the screen,
    and `IconLabelHint`'s off-screen placeholder position (`top: -1000`)
    being far enough outside the viewport that Android could skip firing
    `onLayout` for it entirely. Fixed by removing the
    `LayoutAnimation.configureNext` call from `handleToggleViewMode`,
    setting `position="below"` on both toggle labels, and changing the
    off-screen placeholder position to the icon's own known y-coordinate
    instead of a hardcoded `-1000`. `npx tsc --noEmit` clean. CONFIRMED
    on-device: tapping the Cards/List toggle showed the floating label
    for each icon. No further action needed.

🎨 Design-change requests surfaced during testing (need scoping, not quick fixes)
- ⏸️ IMPLEMENTED, TSC CLEAN, ON-DEVICE RE-TEST PENDING — Replace
  Android's native date picker with the app's own themed calendar
  popup. See session log above for full detail — DateField.tsx now
  renders a fully custom in-app calendar on Android (zero new
  dependencies, all 15 call sites unaffected, iOS untouched). Needs a
  real Android device test before this can be marked done.
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
- Bugs #4 (FI Calculator) and #5/5b (Emergency Fund) both now have
  round-2 fixes applied and `npx tsc --noEmit` clean — neither has been
  re-tested on a real device yet. Next step: do ONE combined on-device
  re-test pass covering both together, per the person's standing
  direction — this closes out the entire original 13-bug list once
  confirmed.
- The new Android in-app date-picker calendar (DateField.tsx) is
  implemented and `npx tsc --noEmit` clean, but not yet tested on a
  real Android device — worth folding into the same on-device pass as
  bugs #4/#5-5b, checking a few different screens (e.g. Bills' due
  date, Savings' target date) since it's a shared component used
  everywhere a date is picked.
- Bug #9's Face-ID-specific "fails to even prompt" symptom still needs
  re-verification on a real installed build in Phase C (EAS Build) —
  believed to be an Expo Go limitation, not re-testable until then.
- Leave all reminder/notification testing and bugs alone until Phase C
  (C.1, EAS Build) is done — see the "🔔 Deferred to Phase C" list above.
- Once ready, separately scope and prioritize the design-change requests
  listed above (Android date picker, PIN toggle, SUB badge redesign,
  confirm-step for "which of these is you?", bottom-nav Calendar removal,
  Transactions swipe-to-delete on derived rows, Reports checkbox redesign,
  ToPay/Planning icon+title reversal) — these are new work, not bug fixes.
- Continue the "fewer words" pass: SavingsScreen.tsx next (7 items), then
  SignInScreen.tsx (7), MoreScreen.tsx (6), and onward down the ranked
  list already captured in PROGRESS3.md's session history.
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
