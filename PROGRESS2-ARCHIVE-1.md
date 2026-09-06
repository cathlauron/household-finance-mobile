# Household Finance Mobile App — Archived Session Logs (Archive 1)

These are detailed, dated session write-ups moved out of PROGRESS2.md to keep it
manageable to paste at the start of every session. Nothing here is "lost" — every
real outcome from these sessions is already folded into PROGRESS2.md's own
✅ Done / 📌 Decisions / ⚠️ Known issues / 📁 Files sections. This file is kept only
as a diary-style reference for exactly how each session got from A to B.

Archived: sessions covering Tier 1/2/3 audit fixes through B.6 (B.6a+B.6b).
Still active in PROGRESS2.md itself: the B.7 and B.8 session entries (most recent 2).

---

### Session entry — B.7 Settings-placement investigation prompt drafted; session wrapped without running it
**What happened:** Before building the "Left to Spend" caution-threshold Settings
control, drafted an investigation-only prompt for Antigravity to confirm: the real
current `SettingsScreen.tsx` section list and an existing tunable-number section's
real JSX (to match its visual pattern rather than inventing a new one); the real
EF/FI calculator input JSX/state in `SavingsScreen.tsx` (the closest existing
"user-tunable financial assumption" example); the real current settings-persistence
mechanism (AsyncStorage vs. the household model itself) so the new field can be
made to sync across a linked household correctly; and whether a slider dependency
is already installed. The person asked to wrap up the session before running this
prompt, so no response has been reviewed yet and no code was written or changed.

**Result:** No files touched this session. The investigation prompt itself is the
only output — ready to paste into Antigravity at the start of the next session.

**Design decision made this session:** None — purely a hand-off point.

### Session entry — 7 bugs from the on-device testing pass investigated and fixed (6 code-complete, 1 documented as a platform limitation)
**What happened:** Worked through the priority list from the prior session's full
testing pass, one issue at a time, in a single Antigravity investigation-then-fix
pass covering all 7. Got real code and root-cause explanations for all 7 before any
fix was proposed. Two proposed fixes (Issue 3, password-instead flow; Issue 6, Loans
row ordering) referenced functions/components (`deriveKey`, `decryptJSON`,
`loadWrappedHouseholdKey`, `unwrapHouseholdKey`, `loadEncryptedProfileData`,
`PasswordField`, `getNextDueDate`) without their real signatures having been shown —
per standing policy, withheld approval and sent a second, narrower investigation-only
prompt to verify all 6 before finalizing those two fixes. That verification pass
confirmed Issue 6 checked out exactly as proposed, and caught one real mismatch in
Issue 3 (the proposal used a nonexistent `autoFocus` prop on `PasswordField`) — dropped
rather than added to the component, since it wasn't essential.

Also raised and resolved a design question along the way: whether biometric unlock
should let the person manually choose/prioritize which biometric type to use, given
the device being tested on has both Face ID and fingerprint. Explained the real
constraint — Android's OS, not the app, decides which sensor prompt actually appears
— and got confirmation to skip a manual toggle in favor of just fixing the underlying
mislabeling bug.

Applied all fixes by hand-pasting (not Antigravity-applied), following the standing
small-fix policy. This surfaced several real paste/hand-off errors, each resolved by
requesting real current file content rather than guessing from the compiler error
text alone: a stray leftover character had deleted a chunk of JSX during one paste; a
line was pasted outside its `async` wrapper, causing an "await only allowed in async
functions" error; one button referenced a save handler under the wrong name
(`handleSave` vs. the real `handleSaveEf`); and one style referenced a `colors.danger`
token that doesn't exist in the theme (swapped for a literal hex value matching the
app's existing error-red, `#E11D48`).

**Result:** `npx tsc --noEmit` confirmed clean (0 errors) after all fixes. 6 of the 7
issues are code-complete pending on-device verification (biometric label, turn-off-PIN,
copy-recovery-key-in-Settings, save-button spinner on Bills only so far, Bills/Loans row
ordering, and the password-instead re-entry flow). The 7th (Calendar's Android date
picker) was investigated and documented as an accepted platform limitation rather than
fixed. Save-button spinner still needs rolling out to the other 6 essential screens —
noted in PROGRESS2.md's ⚠️ Known issues.

**Design decision made this session:** No manual biometric-priority toggle — Android's
OS controls which sensor prompt appears regardless of app-level preference, so fixing
the underlying detection bug is the complete, correct fix; a toggle would only add
complexity without adding real control.

### Session entry — B.6 (B.6a + B.6b) built: reusable `<DateField>` component rolled out across all 9 remaining date-entry fields
**What happened:** Investigated via a dedicated Antigravity report-only pass covering
both B.6a and B.6b together in one prompt — confirmed the underlying storage type for
every date value across the app is a plain `'YYYY-MM-DD'` string (never a `Date`
object), confirmed `@react-native-community/datetimepicker` wasn't yet in
`package.json`, and got real code shown for `TransactionsScreen.tsx` and
`BillsScreen.tsx`'s existing date `TextInput`s plus every other screen's date-entry
fields across the app. The investigation explicitly separated real calendar dates
from recurrence-pattern inputs (day-of-month, month+day, day-of-week pills on
Bills/Debts/Loans/Events/Income), correctly excluding the latter from the component's
scope. Installed the picker dependency, built `DateField.tsx` (native Android dialog /
inline iOS calendar card to sidestep the iOS nested-`Modal` conflict, since every form
already sits inside `<BottomSheet />`'s own `Modal`; timezone-safe date parsing to avoid
a UTC-midnight day-shift bug; friendly formatted display).

Pasted the proposed diff into `TransactionsScreen.tsx`, `BillsScreen.tsx`,
`DebtsScreen.tsx`, and `LoansScreen.tsx` — `npx tsc --noEmit` came back clean for all
four, confirming those snippets matched the real code exactly. The remaining 5 files
(`IncomeScreen.tsx`, `SavingsScreen.tsx`, `GoalsScreen.tsx`, `EventsScreen.tsx`,
`TravelScreen.tsx`) could not be found via Ctrl+F using the original proposal's text —
the investigation had clearly gone into less depth on the later files in the list.
Rather than guess at corrected snippets, sent a second, narrower investigation-only
prompt asking specifically for the real, literal, unparaphrased current code (with
~10 lines of context) for each of the 9 remaining date fields across those 5 files.
Built corrected find/replace snippets directly from that real text.

**Result:** All 9 files pasted by hand, per standing small-fix policy. Final
`npx tsc --noEmit` run came back with 0 errors, confirming all 9 conversions are
correctly wired up. Every real calendar-date input in the app (as opposed to a
recurrence pattern) now uses the same `<DateField />` component.

**Design decision made this session:** No new decision, but a direct reinforcement of
the same lesson from the earlier `LoansScreen.tsx` B.4b-2 hand-paste session — a
proposal covering several files at once shouldn't be assumed to match every file's real
code equally well, especially the ones investigated later/more briefly in the same
pass. Confirming exact-match failures early (via a clean `npx tsc --noEmit` on the
files that did work) and going back for real code on the files that didn't, rather than
guessing corrections, avoided repeating the multi-round fix cycle from that earlier
session.

### Session entry — B.5 (Calendar) built; testing policy changed to batched/deferred
**What happened:** Investigated `CalendarScreen.tsx` via a dedicated Antigravity
report-only pass first, confirming the real day-cell container structure, full
modal styles, and that `useMemo` was not yet imported — deliberately avoiding a
repeat of earlier sessions' guess-then-fix cycles. Confirmed a ready-to-use
`computeMonthEvents()` resolver already existed in `balanceProjection.ts`,
returning a day-keyed map of bills/debts/loans/income/manual transactions/savings
due that month, with real example shapes for each source array pulled from
`types.ts` and each screen's own add/edit handlers. Proposed and reviewed the diff
as 7 discrete snippets (imports, a color-map constant, a `useMemo` hook, the
day-cell dot row, the modal's real event list, and two style additions) before the
person hand-pasted it. `npx tsc --noEmit` confirmed clean by the person.

Separately, the person requested that on-device testing be held for the rest of
Phase B — features to keep being built back-to-back, with one consolidated
checklist provided whenever testing actually happens, rather than testing each
checkpoint as it ships. Flagged once, plainly, that this project's own history
(the silently-reverted recovery-key badge, the doubled cloud-backup calls, the
Firestore ownerUid regression) shows bugs that compile cleanly can still only
surface on a real device, so batching increases both how much has to be tested at
once and how hard it can be to isolate a cause if something breaks — then
proceeded per the person's explicit, informed choice.

**Result:** Calendar dot indicators + real event list are code-complete,
`tsc`-clean, and added to the accumulating on-device checklist. This closes out
every finding from the original B.5 audit (Batch 1, Batch 2, and now Calendar).
Going forward, checkpoints will continue to be built and marked code-complete on
the strength of `npx tsc --noEmit` + diff review alone, with on-device testing
deliberately deferred until the person asks for the master checklist.

**Design decision made this session:** Testing is now batched rather than
per-checkpoint, by explicit instruction — a real change from the standing
"verify against real code/device before considering a checkpoint closed" practice
used throughout Phase B so far. This is a deliberate, acknowledged trade-off of
thoroughness for speed, not an oversight.

### Session entry — B.4b verified on-device across all six screens; a real Firestore rule bug found and fixed along the way
**What happened:** Before manual on-device testing, ran a dedicated Antigravity
investigation-only pass across all six converted screens (Bills, Debts, Loans,
Transactions, Income, Savings Goals) plus `CollapsibleRow.tsx` itself, checking
real code for correct `expanded*Id` state, `onToggle`/`onEdit` wiring, correct
style definitions, correct `LayoutAnimation` ordering, and any leftover
hand-paste artifacts. Everything checked out functionally; a handful of
harmless leftovers were flagged (unused `Platform` imports in four files, an
unused `loanProgressPct()` helper and two unused progress-bar styles in
`LoansScreen.tsx`, and one line with two `useState` declarations merged
together) and cleaned up via hand-pasted fixes, `npx tsc --noEmit` clean,
committed as `3a48191`.

Manual on-device testing then went through all six screens' expand/collapse,
single-row-open, and Edit-button behavior — all confirmed working. During
testing, every single account save triggered a "Backup Failed" alert
(confirmed via screenshot: `Alert.alert` firing on the Accounts tab). Since
it happened on every save rather than once, sent a dedicated investigation
prompt to Antigravity rather than assuming a flaky connection.

Investigation found the real cause: the Tier 1 security fix from an earlier
session (`03df99b`) had added a strict `resource.data.ownerUid ==
request.auth.uid` check to `profileBackups`'s `allow update` rule. Any
backup document that existed before that fix has no `ownerUid` field stored
on it, so the direct-equality check always failed, and every save on every
pre-existing profile has been silently rejected by Firestore since that rule
went live — a later, unrelated fix (`70431f9`, wiring up the user-facing
alert to close a different Tier 2 finding) simply made this pre-existing
failure visible for the first time. Confirmed via real `git show`/`git diff`
output across both commits, not assumption.

**Result:** Fixed the rule to use `resource.data.get('ownerUid',
request.auth.uid)` — the same fallback-to-self pattern already used by the
sibling `allow get` rule and by `householdKeys`'s own rules — so a legacy
document with no `ownerUid` is treated as already belonging to whoever's
currently signed in. Also added a `console.error` in `DataContext.tsx`'s
catch block so the real underlying error is logged going forward, not just
the generic alert. `npx tsc --noEmit` clean, `firebase deploy --only
firestore:rules` run and confirmed via real "Deploy complete!" output,
verified on-device — the "Backup Failed" alert no longer appears on save.
This closes out B.4b entirely.

**Design decision made this session:** No new decision — this is a direct,
successful application of two already-standing rules: (1) investigate a
recurring-not-random symptom with real code/git evidence rather than
guessing, and (2) a security-rule tightening needs to account for documents
that predate the tightening, using the same fallback-to-self pattern already
established elsewhere in the rules file, rather than a bare direct-equality
check.

### Session entry — B.4b-3 built: Transactions, Income, and Savings Goals converted to `<CollapsibleRow />`, completing B.4b
**What happened:** Investigated all three remaining screens via a dedicated
Antigravity report-only pass first — confirmed none had been converted yet
(unlike the prior B.4b-2 session, where Debts turned out to already be done),
and pulled the real current list-rendering code, state variables, helper
functions, real type definitions, and full `makeStyles(colors)` output for
all three files before writing anything. Also pulled the real, complete
`CollapsibleRow.tsx` source and a real working `DebtsScreen.tsx` usage example
in the same investigation pass — a deliberate change from the B.4b-2 session,
which needed three rounds of guess-then-fix specifically because the
component's real prop contract and a sibling screen's real style names
weren't confirmed before writing code the first time.

Converted all three screens using the confirmed real `CollapsibleRow` props
(`collapsedContent`/`expandedContent`/`isExpanded`/`onToggle`/`onEdit`/
`testID`): Transactions (with non-manual/derived rows getting no `onEdit` and
a "edit on its own tab" note in the drawer instead, and the separate CSV
Import modal confirmed untouched), Income (expanded drawer surfaces category,
person, and a logged-payments count/total), and Savings Goals (expanded
drawer surfaces remaining amount, contributions-logged count, and the most
recent contribution). All three hand-pasted by the person, not
Antigravity-applied, per standing small-fix policy.

**Result:** `npx tsc --noEmit` clean (0 errors) confirmed after all three
pastes. This completes B.4b code-wise across all six essential list screens
(Bills, Debts, Loans, Transactions, Income, Savings Goals). On-device
verification is still outstanding for five of the six.

**Design decision made this session:** No new decision — this session is a
direct application of the lesson from B.4b-2 (verify a component's real prop
contract and a real working example before writing conversion code, rather
than guessing from a general description), and it worked as intended — zero
rounds of fix-the-guess were needed this time, unlike the three rounds needed
for Loans.

### Session entry — B.2c discovered already substantially built; duplicated Household section removed from SettingsScreen.tsx
**What happened:** Started investigating B.2c ("standalone Profile screen, split out of
Settings") from scratch, expecting to design and build it. First investigation prompt
to Antigravity (scoped to look, not build) revealed `ProfileScreen.tsx` already existed
at 1,359 lines, `RootStack.tsx` already existed wiring it up as a native-stack push, and
`SettingsScreen.tsx` already had a working "Profile Card" navigating to it — none of
this had been logged in this file. A second, deeper investigation confirmed via
`git log --follow` that all of it was built in commit `d0375c6`, the same commit made
earlier the same day to fix a batch of unrelated TypeScript syntax errors from the
biometrics work — meaning B.2c had quietly shipped as a side effect of a "cleanup"
commit that was never framed as "also, here's a new checkpoint."

Ran a full content comparison between `ProfileScreen.tsx` and `SettingsScreen.tsx`:
confirmed `ProfileScreen.tsx` fully implements Household/linking/roster/peer-recovery,
and that the exact same functionality was still duplicated and running live in
`SettingsScreen.tsx`. Only Password Change, Secret Recovery Key, Active Devices, Quick
Unlock, and Auto-lock remained genuinely Settings-only and not duplicated.

Sent a dedicated cleanup-scoped investigation prompt asking Antigravity to map every
exact removal boundary in `SettingsScreen.tsx` — JSX blocks with real line numbers and
surrounding context, every state variable/ref/useEffect/handler used only by the
Household section, and every import that would become unused — plus cross-check every
remaining symbol against the rest of the file. The proposed diff was reviewed in full.
One gap was caught before approving: the dependency audit table never explicitly
checked `linkNoticeMsg`/`clearLinkNoticeMsg` (both destructured from `useData()`) for
usage outside the block being removed. Sent a targeted follow-up requiring that
specific check before any code was touched.

**Result:** Antigravity confirmed via `Select-String` search that both symbols have
zero usage anywhere else in the file (both are separately handled in `ProfileScreen.tsx`
already), then applied the full diff, ran `npx tsc --noEmit` (clean, 0 errors), ran
`git diff --stat` (1 file changed, 1 insertion, 1,025 deletions), committed locally as
`302e52d`, and stopped short of pushing per standing policy — confirmed via real
`git log -1` and `git status` output. Given the size and scatter of the change (dozens
of non-adjacent removal sites across a 2,700+ line file), this was treated as a
legitimate use of the existing "large, well-reviewed changes" carve-out for letting
Antigravity apply+commit directly, rather than the usual hand-paste-small-snippets
default. Pushed to `main` at the start of the next session alongside the earlier
`d0375c6` commit (which had also been sitting local-only).

**Design decisions made this session:** (1) Progress logs can silently fall behind —
check git log for a target file/screen at the start of a checkpoint in case the work
already exists from a differently-scoped earlier session. (2) When a dependency audit
covers "most" shared state but not explicitly all of it, call out and verify the gap
before approving, rather than assuming clean-by-extension. (3) Confirmed that removals
this large and scattered (1,000+ lines, dozens of distinct sites) are a legitimate,
intended use of the large-change carve-out for direct Antigravity apply+commit,
distinct from the default hand-paste workflow used for smaller fixes.

### Session entry — Post-B.2b-security syntax cleanup, then a full independent verification audit; one real bug found & fixed
**What happened:** Picked up with `npx tsc --noEmit` failing after the prior session's
biometrics work (Checkpoint B), showing 9 errors across `App.tsx`, `HomeScreen.tsx`, and
`OnboardingScreen.tsx`. Rather than guess at fixes, sent the real error output to
Antigravity for investigation each round; it consistently found the same root cause —
old code left in place when new code was pasted on top of it (duplicate imports, an
unclosed `<MainTabs` tag, two functions merged with unclosed braces, duplicate function
bodies/JSX blocks). Fixed via three rounds of Antigravity-proposed diffs, each turned
into hand-paste find/replace snippets rather than letting Antigravity apply and commit
directly — a deliberate change from the prior session's workflow, specifically to avoid
repeating the `git fatal: .git/index` corruption seen before. Each round ended with a
fresh `npx tsc --noEmit` run; the third round came back clean (0 errors), and the result
was pushed as `d0375c6`.

With the codebase compiling cleanly, ran a dedicated independent verification audit — a
single Antigravity investigation prompt covering every item marked "done" across B.2a,
B.2b, B.2b-security, and the Tier 1/2/3 audit fixes, explicitly instructed to check real
current code rather than trust this progress log or commit messages, and to report
"CONFIRMED WORKING" (with real code shown) or "NOT AS DESCRIBED" for each item, with no
fixes proposed yet.

**Result:** 10 of 11 items confirmed genuinely working with real code evidence (IntroScreen
timing, onboarding routing, PinField usage, biometrics wiring including the previously-
fixed missing Unlock button text, the recovery-key status badge, the remote-revoke dismiss
button, and clean unused imports). One item came back "NOT AS DESCRIBED": the Tier 2 fix
for silent solo-profile cloud-backup failures was only half-applied — the new
`try`/`await`/`catch`/`Alert.alert('Backup Failed', ...)` code was real and functional, but
the old, broken `.catch(() => {})` call it was meant to replace had never been deleted, so
`DataContext.tsx` was firing the backup save twice on every solo save. Fixed by deleting
the stray old line; confirmed via a clean `npx tsc --noEmit` (this particular bug was a
logic duplication, not a syntax error, so the compiler alone couldn't have caught it).

**Design decisions made this session:** (1) For fixes small enough to hand-paste, the
person applies changes directly via find/replace snippets and runs git themselves, rather
than Antigravity committing on its own — adopted specifically to prevent a repeat of the
earlier git index corruption. (2) After any round of fixes, run a dedicated, from-scratch
verification audit against real code before considering a checkpoint closed — this is now
standard practice, and this session is direct proof of its value: a real, functional-
looking bug (doubled backup calls) survived a clean TypeScript compile and would not have
been caught without it.

### Session entry — B.2b + B.2b-security built across two split checkpoints (onboarding, PIN eye icon, real biometric unlock)
**What happened:** Investigated the existing `CreateProfileScreen` → `App.tsx` flow,
confirmed no biometric code existed anywhere yet, and confirmed PIN entry/hashing
already existed via `pin.ts`/`SetPinScreen`/`PinUnlockScreen`. Proposed a 3-step
onboarding flow with a biometric-first security step; flagged during review that a
"Face ID enabled" flag with no real unlock wiring behind it would be a bug (the app
could lock with nothing able to unlock it), so the work was split into two checkpoints.
Also added a request mid-session to give PIN fields the same show/hide eye icon already
used on password fields.

Checkpoint A built `PinField.tsx`, wired it into `SetPinScreen`/`PinUnlockScreen`, and
built the 3-step `OnboardingScreen` with a "Coming Soon" biometrics banner (chosen over
a dormant preference flag, per the recommendation) and functional PIN setup. Reviewed
real diffs, approved, applied, `npx tsc --noEmit` clean, committed and pushed as
`bcd6db8`.

Checkpoint B decided biometric unlock should be auto-offered by default (opt-out only,
person's explicit instruction) rather than opt-in — flagged as a real behavior change
for existing profiles, not just new ones, and confirmed intentional. Investigated
`app.json`/`SettingsScreen.tsx` for existing patterns (toggle styles, `Modal` import)
before proposing the diff. Built `biometrics.ts`, expanded `App.tsx`'s lock condition,
added auto-attempt + debounced retry + fallback to `PinUnlockScreen`, added a Settings
toggle, and updated onboarding's Step 2/3 to reflect real (not "coming soon")
biometrics. Before approving, ran a dedicated verification pass on three specific
claims in the diff (whether `Modal` was already imported, whether the "Unlock" button
already had text, whether 8 reused Settings styles actually existed) rather than taking
the diff's framing at face value — this caught a real pre-existing bug (the Unlock
button had no visible label since Checkpoint A) that got fixed as a side effect.

**Result:** Checkpoint B applied, `npx tsc --noEmit` clean, real diff reviewed and
matched what was approved, committed locally as `d5ba690`. Per a new standing
instruction, Antigravity stopped after the local commit rather than pushing — `git push`
is now always run by the person, from their own terminal, going forward.

**Design decisions made this session:** (1) Split a feature into two checkpoints when
the "obvious" single build would ship a UI element that looks functional but isn't yet
wired up — a flag with no real behavior behind it is worse than not offering the toggle
at all. (2) Biometric unlock is opt-out, not opt-in, by explicit choice — this is a
one-way default for existing profiles too. (3) Verify specific factual claims embedded
in a proposed diff (an import existing, a style existing, a button already having text)
by asking for the real current file content, not just trusting the diff's framing — this
caught a real bug this session. (4) `git push` is now always a manual, person-run step,
never something Antigravity does as part of an approval.

### Session entry — B.2a Splash/Intro screen built, animated, and tuned
**What happened:** Built `IntroScreen.tsx` from scratch and wired it into App.tsx's
loading state in place of the old `ActivityIndicator` spinner. Went through several
rounds of visual/timing feedback in the same session: initial version used a two-tone
green padlock with a flat fade — revised to a slower, more deliberate scale+spring
"bounce and settle" entrance for the logo, followed by a paused, separately-timed text
fade for "HOUSEHOLD FINANCE" underneath, since the first pass moved too fast to actually
read the text before the screen changed. Also swapped the lock's currency glyph from ₱
to $ per a deliberate branding choice (dollar as a globally recognizable reserve
currency, independent of the app's real configurable currency setting).

**Result:** Final IntroScreen sequence is: logo fades/bounces in (~350ms fade + a
softened spring overshoot), a deliberate 250ms pause, then the text fades in over 450ms
— roughly 1.4–1.5s total. App.tsx's `minDelay` was extended from an initial 900ms to
1600ms to comfortably cover the full sequence via `Promise.all` against the real
`loadProfilesIndex()` call, so the screen never transitions away mid-animation
regardless of how fast the real check finishes. Confirmed working and approved.

**Design decision made this session:** Splash-screen minimum display time and the
splash animation's own timing are treated as a matched pair going forward — changing
one without checking the other risks either an awkward long pause (timer too long) or
a cut-off animation (timer too short).

### Session entry — Tier 3 verified against real code; 7 of 8 items fixed; 1 deliberately deferred
**What happened:** Ran a dedicated Antigravity investigation prompt covering all 7
previously-identified Tier 3 items plus a general "flag anything new" sweep of the same
touched files. All 7 confirmed still present, with real code shown for each. Reviewed
and approved 7 fixes (the original 7, plus 1 bonus finding — a duplicate "Secret Recovery
Key" label spotted in SettingsScreen.tsx while already in that file). Explicitly withheld
approval on the 8th item (orphaned household docs) pending further investigation, since
the proposed diff referenced a `deleteHousehold()` function that hadn't been confirmed to
exist and didn't wire up any of its call sites.

**Result:** Sent a two-part follow-up prompt — Part A applied and verified the 7 approved
fixes (`npx tsc --noEmit` clean, real `git diff` reviewed and matched exactly what was
proposed, no scope creep); Part B investigated the orphaned-household-doc question without
applying anything, confirming `deleteHousehold()` does exist in household.ts but is never
called, finding all 8 call sites of `cancelLinkCode()` across 3 files, and confirming that
neither the Firestore-rules 15-minute expiry nor the client-side timer ever cleans up the
household doc. Based on that honest picture, decided to defer rather than half-fix it —
see PROGRESS2.md's 📌 Decisions. Committed the 7 Tier 3 fixes; hit the same `git fatal:
.git/index: index file smaller than expected` error as a prior session, resolved the same
way (`Remove-Item .git\index` + `git reset`, confirmed via `git status` that all 7 modified
files were intact before recommitting). Pushed successfully; `git status` confirmed clean.

**Design decision made this session:** Don't approve a proposed fix that references a
function or capability not yet confirmed to exist in the real codebase — verify it's real
first, even if the diff "looks" reasonable. Also: it's fine (and often correct) to
investigate an item fully, understand it well, and still choose to defer it — a documented,
reasoned deferral is a valid outcome of the audit process, not a failure to complete it.

### Session entry — Tier 2 verified against real code; rules deployed; one real gap fixed
**What happened:** Ran a dedicated Antigravity investigation prompt covering all 11
Tier 1 + Tier 2 items, checking each against real, current code rather than trusting
prior notes. All 4 Tier 1 items re-confirmed intact. Of the 7 Tier 2 items, 6 turned
out to already be implemented in the code (hostUid on linkCodes, household update rule
type checks, app.json userInterfaceStyle/notifications plugin, modern notification
trigger format, profile-creation username-stranding handling) but two security-rule
fixes had never actually been deployed to Firebase, and the code itself had silently
drifted ahead of what was live. The 1 genuine gap: solo (non-household) profile cloud
backups failed silently with no user-facing alert, unlike the household path which
already alerts on sync failure.

**Result:** Had Antigravity (a) run `firebase deploy --only firestore:rules` directly,
confirmed via real "Deploy complete!" output and a live Firebase console link — the
linkCodes hostUid protection and household update type checks are now actually live,
not just written; and (b) propose a fix for the solo-backup silent-failure gap only,
without applying it. Reviewed the proposed diff (3 lines changed, correctly scoped,
mirrors the already-correct household-path pattern) and approved. Sent a follow-up
prompt authorizing apply + verify + commit + push. `npx tsc --noEmit` came back clean
(0 errors), the real git diff was reviewed and matched what was proposed exactly,
committed as `70431f9` ("Surface user-facing alert when solo profile cloud backup
fails in saveModel"), pushed to `main`, `git status` confirmed clean and up to date.

**Design decision made this session:** No new decision — this session reinforced the
one made last session (independently re-verify "fix implemented" claims against real
code, never trust notes alone) and additionally surfaced that a fix being present *in
code* doesn't mean it's *live* — Firestore rules specifically need their own deploy
step, checked separately from code review.

### Session entry — Tier 1 audit fixes independently verified; one regression found & fixed
**What happened:** Rather than trusting the prior session's "Tier 1 fixed & deployed" note
at face value, ran a dedicated Antigravity investigation prompt to re-check all 4 Tier 1
fixes against real, current code (not commit messages or summaries). 3 of 4 checked out
cleanly with real code evidence. The 4th (Settings > Security recovery-key status badge)
had been silently reverted by an unrelated, later "session checkpoint" commit (`91df290`)
— caused by `SettingsScreen.tsx` having unsaved/stale changes open in a VS Code tab at
commit time.

**Result:** Diagnosed precisely via `git diff 03df99b 91df290 -- SettingsScreen.tsx`.
Re-applied the exact reverted diff via a second Antigravity prompt, reviewed the new diff
line-by-line (39 insertions, 1 deletion — clean, no scope creep), confirmed `npx tsc --noEmit`
clean, then approved a commit+push. Hit a `git fatal: .git/index: index file smaller than
expected` error mid-session — resolved by rebuilding the local git index
(`Remove-Item .git\index` + `git reset`), which only affects local staging bookkeeping and
did not touch commit history or file contents. Commit `8821ff3` pushed successfully;
`git status` confirms clean, up-to-date tree.

**Design decision made this session:** Independent re-verification of any "fix implemented"
claim — via real code inspection, not summaries — is now standard practice for this project
going forward, not a one-off. This session is the concrete example of why: a routine,
unrelated commit silently undid real work, and it would not have been caught without
checking.

### Session entry — Tier 1 audit fixes implemented & deployed
**What happened:** Reviewed the 4 Tier 1 findings from the pre-Phase-B audit (household
live-sync gap, solo-password-change breaking the recovery key, undeleted peer-recovery
PIN doc, missing ownership check on `profileBackups`). Antigravity proposed diffs for
all 4 files touched (`household.ts`, `DataContext.tsx`, `recovery.ts`,
`SettingsScreen.tsx`, `SignInScreen.tsx`, `cloudBackup.ts`) plus the `firestore.rules`
change, without committing anything. Reviewed each diff — all correct, no concerns.
Approved. Sent a follow-up prompt authorizing apply + deploy + commit.

**Result:** `npx tsc --noEmit` clean (0 errors). `firebase deploy --only firestore:rules`
succeeded — new rules confirmed live via the Firebase console link in the deploy output.
7 files committed as `03df99b` ("Tier 1 security fixes: household live-sync, stale
recovery key handling, profileBackups ownership rules, peer recovery cleanup"), pushed
to `main`. `git status` confirms clean, up-to-date tree.

**Design decision made this session:** For the stale-recovery-key fix, chose to delete
the invalid `recoveryKeys/{username}` doc and surface a "Needs regenerating" badge in
Settings > Security, rather than trying to silently re-wrap it — re-wrapping is
cryptographically impossible without the original 16-character recovery code, which
isn't (and shouldn't be) collected during a normal password change.
