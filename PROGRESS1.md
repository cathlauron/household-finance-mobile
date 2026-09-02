Household Finance Mobile App â€” Progress Log (Auth â†’ UI/UX â†’ Publish)

This file tracks progress on 4-REMAINING-WORK-ROADMAP.md only (Phase A: Firebase Auth, Phase B: UI/UX Polish, Phase C: Publishing).

For everything already built before this â€” all 11 phases of the original app (security/sign-in, navigation, Calendar, Accounts, Bills/Debts/Loans, Transactions, Income/Savings, Groceries/Travel/Events/Goals, Household Linking, Dashboard/Reports, Settings) â€” see PROGRESS.md, which is now closed and kept only as a historical record. Nothing in PROGRESS.md is repeated here.

âœ… Done

Checkpoint A.7.9 (automated testing setup) â€” IN PROGRESS, blocked on Android emulator
- Decided to build automated testing using the fully-free path: Firebase Emulator Suite + Maestro (no Claude Code adopted). Decided to test against the local Firebase emulator (not real Firebase) to avoid any risk to production data, and to use an Android emulator (AVD via Android Studio) rather than a real phone for this testing setup specifically.
- Added `testID` props to the three input fields + sign-in button so Maestro can reliably find them:
  - `PasswordField.tsx` â€” UPDATED: added `testID?: string` to Props, accepted in function signature, forwarded to the inner `TextInput`. Confirmed via full-file paste.
  - `SignInScreen.tsx` â€” UPDATED: `testID="email-input"`, `testID="username-input"`, `testID="password-input"` (via PasswordField), `testID="sign-in-button"` added. Confirmed via full-file paste.
  - `CreateProfileScreen.tsx` â€” CONFIRMED ALREADY HAD all needed testIDs (email-input, username-input, password-input, confirm-password-input, create-profile-button) â€” no changes needed.
- `app.json` â€” UPDATED: added missing `android.package` field, set to `com.cathlauron.householdfinance` (was previously absent â€” needed as Maestro's "appId" to launch the app on the emulator).
- **Firebase CLI confirmed already installed** (v15.28.2) â€” no install needed.
- **`firebase.json` confirmed already exists and correctly configured**: Auth emulator on port 9099, Firestore on port 8080, UI enabled.
- **Maestro CLI confirmed already installed** (v2.9.0) â€” no install needed.
- `firebase.ts` â€” UPDATED: added a `USE_FIREBASE_EMULATOR` boolean flag (currently `true`), `EMULATOR_HOST` constant set to `"10.0.2.2"` (the special fixed address an Android emulator/AVD uses to reach its host PC â€” "localhost" would NOT work here, since inside the emulator that means the emulator's own OS, not the PC). Added `connectFirestoreEmulator`/`connectAuthEmulator` calls gated behind the flag, with a console.log confirming emulator mode when active. NOTE: `EMULATOR_HOST` will need to change to the PC's real WiFi IP (via `ipconfig`) if ever testing against a real physical phone instead of the AVD.
- Confirmed an existing Android Virtual Device (AVD) already exists in Android Studio's Device Manager, named **`Pixel_10_Pro`** (Pixel 10 Pro, Android 17.0 "CinnamonBun", API 37.1, x86_64). Confirmed via `emulator -list-avds` (only works after adding the emulator/platform-tools folders to PATH â€” see below).
- Fixed a blocking "Windows Hypervisor Platform is not enabled" warning in Device Manager by clicking its "Enable" button and restarting the computer â€” confirmed resolved (warning banner gone on next open).
- Added `%LOCALAPPDATA%\Android\Sdk\emulator` and `...\platform-tools` to the Windows user PATH via `[Environment]::SetEnvironmentVariable(...)`. NOTE: this requires a FULL RESTART of VS Code (not just a new terminal tab) to take effect, since VS Code inherits PATH once at its own launch.
- `npx tsc --noEmit` run after all code changes above â€” clean, no errors.
- **BLOCKED: the Android emulator itself won't launch.** Running `emulator -avd Pixel_10_Pro` opens a window but immediately fails with a "System Error" dialog: code execution cannot proceed because a required DLL is missing. This has recurred with SEVERAL different DLLs across repeated attempts (`Qt6GuiAndroidEmu.dll`, `libandroid-emu-tracing.dll`, `Qt6CoreAndroidEmu.dll`, `Qt6WidgetsAndroidEmu.dll`) â€” multiple different files missing, not just one. Tried: updating the Android Emulator component via Android Studio's SDK Manager (SDK Tools tab) â€” did not fix it. Tried: fully deleting the `%LOCALAPPDATA%\Android\Sdk\emulator` folder and reinstalling the Android Emulator component fresh via SDK Manager â€” still the same category of error afterward. Multiple different DLLs failing across a clean reinstall of just the emulator component points to a deeper problem with the Android Studio installation itself, not a one-off missing file. **Decision: next step is a full uninstall and clean reinstall of Android Studio itself** (not just the emulator component within it), since a targeted fix at the component level did not resolve it.
- **Not yet done:** get the emulator actually booting; then start the Firebase emulator (`firebase emulators:start`) and Expo side by side with it; write the actual `create-profile.yaml` / `sign-in.yaml` Maestro flow files; run a first live test.

Phase A â€” Firebase Auth
Bug fixes (found live during A.5/A.6 real-device testing, fixed via Claude+Copilot workflow)
- **Duplicate bill ID / React key warning â€” FIXED.** Root cause: `mergeModels.ts` combined lists (bills, debts, loans, savings goals, manual transactions, groceries, travel, events, yearly goals, payees, categorization rules, and nested account arrays) during linking/merge without checking for ID collisions, so a merge or restore could produce two records sharing the same `id`. Fixed with a shared `sanitizeModelIds()` pass in `mergeModels.ts` (de-dupes/regenerates duplicate IDs across every combined list, not just bills), plus the same sanitization added on both model load AND model save in `DataContext.tsx` as a one-time self-healing pass for any already-corrupted saved data.
- **Stale `subscribeToLinkCode` listener / "Missing or insufficient permissions" error â€” FIXED.** Root cause: the Firestore `onSnapshot` listener watching `linkCodes/{code}` in `linking.ts` wasn't reliably torn down once linking completed or the code became invalid, so it kept trying to read a document it no longer had permission to read, logging a noisy (but non-fatal) permissions error. Fixed by making the listener treat a permission-denied/expired-code snapshot as an expected terminal state rather than an error, and by clearing `linkCode`/`linkSecretHex` immediately in `SettingsScreen.tsx` once the host finishes linking, so the listener's effect cleanup runs promptly instead of lingering on stale state.
- **Verified live, this session:** full unlink â†’ relink cycle on both Phone A and Phone B, back to back. No duplicate-key warning, no permissions error. Confirmed clean.
- Incidentally re-confirmed and committed alongside this: the earlier SDK 57â†’54 downgrade (`expo` package, done to fix "Project is incompatible with this version of Expo Go" against Phone A's SDK-54-only Expo Go client) was still sitting uncommitted from an earlier session â€” bundled into this same commit since it was untouched otherwise.
- A.1 â€” Decision confirmed. Sign-in method: email + password via Firebase Authentication. The existing passphrase-based sign-in and data encryption stays exactly as it is â€” the passphrase still derives the encryption key, unchanged. Firebase Auth is added ALONGSIDE it, not replacing it: a real, logged-in Firebase account will now be required before the app can read/write Firestore at all, closing the "knowing the link code is enough" gap accepted at the end of Phase 9 (see PROGRESS.md). Existing profiles and the existing linked household must NOT be lost â€” that's the explicit job of Checkpoint A.5 later in this phase.
- A.5 â€” DONE. `SignInScreen.tsx` now handles profiles that existed before Firebase Auth was added (Checkpoint A.2). If Firebase sign-in fails with a "credential not recognized" style error, the app checks whether a local profile exists for that username AND the passphrase just entered actually decrypts it. If both are true, it quietly creates the missing Firebase account (using the email + passphrase just typed) and finishes signing in â€” nothing further is needed from the person, and no separate "migration" screen exists. If the passphrase is wrong, this check fails too and the normal "incorrect" error shows, so this never helps someone who doesn't already know the correct passphrase. No changes were needed to `ProfileIndexEntry`/`storage.ts` â€” email is still never stored locally (by design, same as before), so this works entirely off what's typed at sign-in time.
  NOTE: This entry covers the ONE-TIME MIGRATION path only (an existing local profile gaining a Firebase account it didn't have before). It does NOT yet cover signing in on a BRAND-NEW device with no local data at all â€” that is the new, separate scope for the reopened Checkpoint A.5 below.
- **Checkpoint A.5 (reopened, new-device scope) â€” CONFIRMED DONE, code inspected directly.** `SignInScreen.tsx` already contains the full new-device restore flow: after Firebase Auth succeeds, if no local profile exists for the username, it calls `loadProfileCloudBackup(username)` (`cloudBackup.ts`) to pull the encrypted backup from `profileBackups/{username}` in Firestore, derives the key from the password + the backup's salt, and VERIFIES the password is correct before trusting anything â€” for linked households it unwraps the household key and test-decrypts the shared household data; for personal profiles it test-decrypts the personal backup directly. On success it saves a local copy of the data to the device (so it also works offline afterward), writes a new local profile-index entry, and signs the person in. This is the complete "log in on a brand-new device" flow A.5 called for, not a partial version. BONUS beyond original A.5 scope: linked profiles also self-heal a stale local salt â€” if the password was changed on a different device and this device's local salt fell out of date, sign-in falls back to the cloud backup's salt, and if that one works, it re-syncs the local copy so future sign-ins on this device succeed on the first try.
- A.2 â€” Firebase Auth plumbing added to the project (see full session entry below). Email/Password enabled in Firebase console; `src/firebase.ts` updated to also initialize and export `auth`; new `src/authFirebase.ts` created with reusable sign-up/sign-in/sign-out/current-user/subscribe functions.
- A.3 â€” CONFIRMED DONE. `SignInScreen.tsx` and `CreateProfileScreen.tsx` are fully wired to real Firebase Auth (`signInWithFirebase` / `createFirebaseAccount`). Real Firebase failures (wrong email/password, account already exists, etc.) are checked and gated BEFORE any local passphrase/profile logic runs â€” so a real Firebase Auth session is genuinely required to get into the app now, not just cosmetically wired up.
- A.4 â€” CONFIRMED DONE. `firestore.rules` requires `request.auth != null` PLUS a matching uid on every real collection (`linkCodes`, `households`, `householdKeys`), with a deny-all fallback rule for anything else not explicitly covered. This session's earlier fix (see "Fix: host-side finish linking" session entry) added the narrower `members`-only update rule to `households` on top of this. The original "knowing the document ID is enough" gap from before Phase A is fully closed â€” confirmed, not just believed.
- Household linking (built pre-Phase A, see PROGRESS.md) now confirmed working END-TO-END under real per-user Firebase Auth + uid-based Firestore security rules â€” see the "Fix: host-side finish linking" session entry below. Both the host and joiner side of linking (start code â†’ join with code â†’ mine/theirs/merge â†’ finish linking on both phones) were tested together and both phones correctly end up "âœ“ Linked" sharing the same data.
  NOTE: This confirms the OLD manual-button linking flow worked once, under test conditions. It is being REPLACED by Checkpoint A.6 (real-time listeners) below, because the manual-button design is understood to be structurally prone to the deadlock described in the still-open bug entry further down.

Security hardening on household linking (link-code lifecycle)
- **#1 â€” Kill the code once used â€” CONFIRMED DONE.** `firestore.rules` now has `allow delete: if request.auth != null && resource.data.finished == true;` on the `linkCodes` collection, replacing the old `allow delete: if false`. A successfully-used link code is deleted outright once both phones finish linking, rather than sitting in Firestore forever as a still-working decryption key. `linking.ts` imports `deleteDoc` from Firestore to perform this.
- **#2 â€” Expiry on unused codes â€” CONFIRMED DONE.** `firestore.rules` restricts reading a `linkCodes` document to `request.time < resource.data.createdAt + duration.value(15, 'm')` â€” a code that was generated but never used (host started linking, then never finished) becomes unreadable, and therefore unusable, 15 minutes after creation.
- **#3 â€” Unlink feature â€” CONFIRMED DONE.** `household.ts` has `removeMemberFromHousehold(householdId)`, the mirror image of the existing `addMemberToHousehold`, removing the currently-signed-in user's own uid from a household's `members` list. `firestore.rules` has a matching `allow update` rule permitting this via `resource.data.members.removeAll([request.auth.uid])` â€” a member can only ever remove themselves, never anyone else. `SettingsScreen.tsx` has a full UI path wired to it: an "Unlink this device" button, a confirm/cancel dialog (`unlinkConfirmOpen`), a busy state, and `handleUnlinkHousehold()` calling through to the real removal, with error handling via `unlinkMsg`.

- **Security hardening on household linking (link-code lifecycle)**
- **A.7.0 (PIN quick-unlock regression) â€” CONFIRMED RESOLVED. It was never actually broken.** Reproduced with the person on-device and found the existing auto-lock/idle-timer system (`App.tsx` + `src/autoLock.ts`) already working correctly end-to-end. What looked like a regression was the person's own test accounts not having a PIN set up on that device â€” not a code issue anywhere in the linking-era changes. Closing A.7.0 as "verified working," not "fixed."
- **New: Adjustable auto-lock timer added to Settings.** `getAutoLockMinutes()`/`setAutoLockMinutes()` already existed in `src/autoLock.ts` but nothing called them and there was no UI for it. Added `AUTO_LOCK_OPTIONS` (1/5/15/30 minutes) plus a small pub-sub (`subscribeToAutoLockMinutes`) to `autoLock.ts` so a change takes effect immediately rather than only after an app restart; `App.tsx` now subscribes to that change and calls `resetIdleTimer()` live; a new "Auto-lock" section was added to `SettingsScreen.tsx` under Security, styled identically to the existing Light/Dark/System picker (reuses `modeRow`/`modeButton`, no new styles). Tested on-device: confirmed the app locks after the selected idle time and that changing the option takes effect without restarting the app.

- **A.7.1 (change password broken after linking) â€” CONFIRMED FIXED, re-tested and verified.** Host changed password on a linked profile, signed out fully, signed back in with the new password successfully. Joiner phone confirmed still able to sign in normally with its own unchanged password. The both-branch `changePassword` patch applied to `DataContext.tsx` in an earlier session (see prior session entry) is now confirmed to have actually fixed the linked-profile path, not just the unlinked one â€” the earlier failed test likely caught a bad intermediate state or an already-superseded build.

- **A.7.2 (eye icon on password fields) â€” CONFIRMED DONE.** New shared `src/components/PasswordField.tsx` component (Ionicons eye/eye-off toggle, wraps whatever `style` is passed in) applied to all 6 real password fields across 3 files: `SignInScreen.tsx` (1), `CreateProfileScreen.tsx` (2), `SettingsScreen.tsx` (3, the change-password fields). PIN screens (`PinUnlockScreen.tsx`, `SetPinScreen.tsx`) intentionally left untouched â€” different, numeric-only UX per the A.7.2 scope decision. `@expo/vector-icons` was NOT already installed in this project (unusual for Expo, but confirmed via `package.json`) â€” added via `npx expo install @expo/vector-icons` rather than plain npm install, so the version matches SDK 54. `npx tsc --noEmit` clean; confirmed working on-device.

- **Checkpoint A.6 (real-time linking via Firestore listeners) â€” CONFIRMED DONE, live-tested on two real phones.** `subscribeToLinkCode()` in `linking.ts` and the auto-triggered `finishHostLink()` in `SettingsScreen.tsx` were tested end-to-end on separate physical devices (Phone A host, Phone B joiner): linking completed automatically via the listener with no manual finish-button step needed on either side. The "Code expired? Start over with a new code" button was also re-verified working on real devices after all the A.6/A.7.4/A.7.5 changes to that screen. This closes out the last open item from the original A.6 scope.

- **Checkpoint A.7.6a (household owner field, 5-member cap, owner-removal rules) â€” CONFIRMED DONE, deployed and live.** `firestore.rules` updated: household creation now requires and sets an `owner` field (defaults to the creating user's uid); a 5-member cap enforced server-side on creation, the join rule, and both new owner-removal rules; a new rule lets the owner remove another member (subset-only â€” cannot add arbitrary uids, closing a gap Copilot's first draft missed); a second new rule lets the owner leave while atomically transferring ownership to an existing member (rejects handing ownership to anyone who wasn't already a member); the existing plain self-removal rule now correctly excludes the owner (using a safe default-null check so old households without an owner field are unaffected). `household.ts` updated: `createHouseholdData()` now sets `owner: uid`; new `leaveHouseholdAndTransferOwnership(householdId, newOwnerUid)` function added, matching the new rule's expected write shape exactly. Built via the Claude+Copilot investigate-then-approve workflow, with two corrections made to Copilot's first draft before approval (the subset-only fix, and splitting owner-removes-another from owner-leaves-and-transfers into two distinct rules). `npx tsc --noEmit` clean. Rules deployed live via `npx firebase-tools deploy --only firestore:rules` â€” confirmed successful ("Deploy complete!"). No UI built yet for any of this (no way to pick a new owner, no remove-member button) â€” that's A.7.6d.

- **Checkpoint A.7.6b (isInvite flag fixes wrong join-choice dialog) â€” IMPLEMENTED, COMMITTED, NOT YET LIVE-TESTED.** This is the real fix for Bug C. Root cause was `existingHouseholdId` getting set on every link code (including fresh 2-person links, not just true invites) once A.7.6a started pre-creating the household doc on the host's device â€” so the UI couldn't tell a first-time link apart from a join-an-existing-household invite. Fixed by adding an explicit `isInvite: true` flag, set only by the true invite path (`startHouseholdInvite`), threaded through `joinHouseholdLink()`'s return value as `isInvite: Boolean(data.isInvite)`. `SettingsScreen.tsx`'s join-choice dialog now checks `joinResult.isInvite` instead of `joinResult.existingHouseholdId` to decide whether to show 3 choices (Keep mine/Keep theirs/Merge â€” original 2-person link) or 2 choices (Keep household data/Merge mine in â€” joining an existing 2+ member household). `existingHouseholdId` itself was deliberately left untouched everywhere else (e.g. `finishJoinerLink`), since it still correctly identifies which household document to write to. Built via the Claude+Antigravity investigate-then-approve workflow. `npx tsc --noEmit` clean. Committed and pushed (`8f1e5f7`). **Not yet live-tested on real devices** â€” testing deferred until the rest of Phase A/A.7 wraps up, per an explicit decision to batch-test rather than test each A.7.6 sub-step individually (see ðŸ“Œ Decisions).

- **Checkpoint A.7.6c (member count badge + cap enforcement) â€” IMPLEMENTED, COMMITTED, NOT YET LIVE-TESTED.** Adds a "X of 5 linked" badge next to "âœ“ Linked" in Settings (visible to all household members, not owner-only), reusing the existing `getHouseholdMemberCount()` helper and `householdMemberCount` state that were already wired up. `handleStartHouseholdInvite()` now does a fresh live-fetch of the member count right before generating an invite code (closing a race-condition gap where the on-screen count could be stale) and blocks with "This household is full (5 of 5) â€” remove someone before inviting another person." if already at 5. The static "household is full" message shown to the owner was updated to match wording. Investigation also surfaced that Firestore's own security rules block a non-member from reading household data at all, which ruled out checking the cap client-side at JOIN time (as originally hoped) â€” instead, `finishJoinerLink()` now catches a `permission-denied` write rejection (checked via `error.code === 'permission-denied'`, with a message-text regex fallback for safety) and translates it into "This household is full (5 of 5) or the invite is no longer valid." for the race-condition case where two people join the same invite code at once. Bonus fix bundled in: `finishJoinerLink`'s generic catch block now surfaces the real error message instead of always showing "check your connection." Built via the Claude+Antigravity investigate-then-approve workflow. `npx tsc --noEmit` clean. Committed and pushed (`0fdc963`). **Not yet live-tested on real devices** â€” same batch-testing decision as A.7.6b above.

- **Checkpoint A.7.6d (owner-only member management: remove member, ownership transfer, auto-dissolve) â€” IMPLEMENTED, COMMITTED, NOT YET LIVE-TESTED.** Full expanded scope from the planning session: (1) owner can remove any other member directly from a new household roster in Settings, with a confirm dialog; (2) when the owner chooses to leave a household with other members remaining, they now get a successor picker before leaving (skips the picker and routes straight to dissolve if only 1 other member would remain); (3) automatic dissolve-to-personal-data whenever household membership would drop to 1 person â€” handled via a shared `performDissolve()` function in `DataContext.tsx` that every trigger routes through (self-unlink-when-alone, a live Firestore listener firing the instant another member's departure leaves you alone, and an offline catch-up check in `loadModel()` for the case where this happens while the app was closed). Firestore rules updated so every `memberUsernames` map change is restricted to the specific key(s) actually allowed to change in that write (not just a type check on the whole map), and the household delete rule now permits a sole remaining member to delete their own household document. Built via the Claude+Antigravity investigate-then-approve workflow across two rounds: the first implementation was reviewed against three required corrections (consistent function signature, per-key rules restrictions, and a live â€” not reload-only â€” dissolve listener) and found to satisfy two of three; the third (both dissolve triggers sharing one function) had a gap where `unlinkHousehold()`'s sole-member branch duplicated `performDissolve()`'s logic instead of calling it â€” a follow-up fix consolidated this into one shared code path. `npx tsc --noEmit` clean after both rounds. **Not yet live-tested on real devices** â€” same batch-testing decision as A.7.6b/c above; specifically still needs the two-phone "one person leaves while the other has the app open in the foreground" scenario, to confirm the live listener path (not just the offline catch-up path) actually fires.

- **Loan custom recurrence â€” DONE.** `customOccurrencesInMonth()` consolidated into shared `recurrence.ts` (was duplicated in `balanceProjection.ts`); `getNextDueDate()` gained a `custom` branch. `LoansScreen.tsx` now actually passes each loan's `customStartDate`/`customFreq`/`customOccurrenceCount` into `getNextDueDate()` at both real call sites (list sorting, next-due display) â€” these fields live at the top level of a Loan record, not nested under `dueDate`, which is why an earlier attempt at this silently didn't work.
- **EF/FI calculators now show income â€” DONE, informational only.** `SavingsScreen.tsx` gained `computeMonthlyIncomeBaseline()`, normalizing every income source's frequency to a monthly figure the same way expenses already were. Displayed as a read-only line in both EF and FI sections ("Your income sources add up to â‚±X/mo") â€” deliberately never auto-written into `efSavingsInput`/`fiSavingsInput` (an earlier draft did this and overwrote the person's real savings balance; caught in review before being applied â€” see ðŸ“Œ Decisions).
- **CSV import: column mapping + duplicate detection â€” DONE.** `csvImport.ts`/`CsvImportModal.tsx` no longer require exact fixed column names â€” headers are read from the file, `guessCsvColumnMapping()` auto-guesses each target field, and mapping is overridable by hand before preview. `flagDuplicateRows()` checks each row against `model.manualTransactions` (exact date+amount, case-insensitive exact-or-substring label match); flagged rows default to excluded, with an opt-in checkbox to import anyway.

ðŸ“Œ Decisions made
- **Development environment migrated from GitHub Codespaces to local VS Code on Windows (PowerShell terminal).** Reason: hit the Codespaces free 60-hour/month limit. All workflow instructions (Project Instructions doc, this file) updated to v7/reflect this â€” commands now use PowerShell syntax throughout (`type` instead of `cat`, PowerShell here-strings instead of bash heredoc). This is a tooling change only; the repo, the code, and every other decision/workflow rule are unchanged.
- **Permanent rule adopted: never give bash heredoc syntax for saving files in this project â€” always use a PowerShell here-string instead.** This is now written directly into the Project Instructions custom instructions (v7) so every one of the 20 Gmail-account conversations follows it. See the "Migrated from Codespaces to VS Code" session entry below for the full incident this rule was created to prevent from recurring.
- **Claude + GitHub Copilot collaborative bug-fixing workflow â€” ADOPTED, going forward.** For bug fixes (not full feature builds), the process is: Claude investigates/scopes the issue and writes a "no edits yet, just explain your plan" prompt for Copilot â†’ person pastes Copilot's plan back to Claude for review â†’ Claude either approves or corrects the plan â†’ person sends a final "go ahead" prompt to Copilot â†’ Copilot implements â†’ person pastes Copilot's change summary + `git status`/`git diff --stat` back to Claude for a sanity check before committing. Reasoning: Claude has the full project context (what's already built, what's planned, prior decisions) but no direct file access; Copilot has direct file access but no project memory. This combination worked well for the duplicate-bill-ID + stale-listener fix this session and is the default approach going forward, chosen partly to minimize Copilot credit usage (investigation/planning happens with Claude first, Copilot is only used for the actual edit).
- Checkpoint A.1 (Firebase Auth approach) is DECIDED: email + password via Firebase Authentication, layered on top of (not replacing) the existing passphrase/encryption system.
- Progress tracking for this remaining work (Phase A/B/C) is kept in this separate file, PROGRESS1.md, rather than appended to the original PROGRESS.md â€” done deliberately so the original file stays intact as a clean record of the first 11 phases.
- PROGRESS1.md lives at the REPO ROOT (`household-finance-mobile\PROGRESS1.md`), NOT inside `mobile-app/` where PROGRESS.md and most code live. Confirmed this session after some confusion â€” `cd` to the repo root, or use the full path, whenever reading/writing this file from the terminal. All app code changes (src/, firestore.rules, etc.) still happen from inside `mobile-app/` as before.
- When running `grep`/`type` on app source files from inside `mobile-app/`, do NOT prefix paths with `mobile-app/` again (e.g. use `src/household.ts`, not `mobile-app/src/household.ts`) â€” the terminal prompt shows which directory you're already in; check it before assuming the path.
- Cloud-restore sign-in (linked and unlinked) now always overwrites any existing local profile-index entry for the signed-in username, rather than appending. This is a permanent behavior change, not a one-off patch.
- A session-level cache of the derived encryption key/profile metadata (to speed up fresh cold sign-ins beyond the A.7.3 duplicate-decrypt fix) was explicitly considered and NOT adopted. The person's actual day-to-day slowness is background/foreground re-entry, already solved by the existing PIN quick-unlock feature â€” the remaining cold-sign-in PBKDF2 cost is accepted as intentional. Revisit only if a specific, recurring cold-sign-in pain point comes up again.
- **A.7.6b and A.7.6c will be live-tested together with the rest of Checkpoint A.7 in one batch pass, rather than individually right after each is implemented.** Explicit tradeoff accepted: if something breaks during that batch test, it will take more work to isolate which of the stacked changes caused it. Chosen deliberately to save session time now that A.7.6d (bigger scope) is still ahead.

--- PLANNING SESSION DECISIONS ---

- **Cloud storage stays on Firebase/Firestore.** No alternate service needed â€” it's free at this app's scale (Spark plan: 50K reads / 20K writes per day) and Auth + encrypted per-profile cloud backups already exist. The one real gap is sign-in on a device with zero local data, which is why Checkpoint A.5 is being REOPENED with new scope (see below) â€” the existing A.5 entry above only covers the one-time local-profile-to-Firebase migration case, not a genuinely new device.
- **Checkpoint A.5 is reopened with new, larger scope:** sign in on a brand-new phone that has NEVER opened this app before. Flow: Firebase Auth succeeds â†’ app checks for local encrypted data â†’ none found â†’ pull the encrypted backup from `profileBackups/{username}` in Firestore â†’ decrypt using the passphrase just entered at sign-in â†’ populate the app locally from that. This is the piece that actually delivers "log in on a different device," not just "recover a profile that already existed locally."
- **The household-linking deadlock bug is a structural problem, not a one-off bug.** Diagnosis (confirmed correct): the host's "finish linking" button assumes the joiner has already finished, and the joiner has no way to signal the host in real time â€” both sides are effectively waiting on each other with no live communication. Debugging the existing manual-button flow further is NOT the plan; it's being replaced.
- **Checkpoint A.6 (new): rebuild the linking "finish" step using Firestore real-time listeners (`onSnapshot`)** instead of manual finish buttons on both sides. Both phones subscribe live to the same `linkCodes/{code}` document. Whichever side writes second (typically the joiner, picking keep-mine/keep-theirs/merge) triggers the OTHER side's listener automatically and completes the flow â€” no more manual "did they go yet?" step on either phone. The code is deleted (via the existing kill-on-use rule) once both sides show as complete.
- **Staying on the Spark (free) plan â€” explicitly decided, Cloud Functions rejected for now.** A Cloud-Function-based version of linking (server-side atomic transaction) was considered and explained in detail â€” it would close a narrow edge case (a half-finished link if a phone loses connection or the app is killed mid-sequence between the household-create and both-keys-wrapped steps) and would tighten write permissions slightly. It requires the Blaze (pay-as-you-go) plan, which is still free at this app's real usage but requires a credit card on file with Google. Decision: NOT doing this now. The real-time-listener fix (A.6) fully resolves the actual deadlock bug being hit; the remaining edge case is rare, recoverable (just re-link), and not a security leak. Revisit a Cloud-Function-based version later only if a real need for it shows up (e.g. Blaze is needed for something else anyway).
- **Multi-device "active sessions" (see-and-revoke-other-signed-in-devices) is PARKED**, explicitly, until Checkpoints A.5 and A.6 are both confirmed stable on real devices. Design already scoped for when it's picked back up: a new Firestore collection `sessions/{uid}/devices/{deviceId}` (device name/platform, last-active timestamp, `revoked` flag); app registers its own device on sign-in; app checks/listens to its own device entry and force-signs-out locally if `revoked` becomes true; Settings gets an "Active devices" list with a per-device "Sign out" button. Reuses the same `onSnapshot` real-time pattern being built for A.6, so it should be cheap to add once linking's listener pattern already exists in the codebase.
- **Direct client-to-Firestore access (no Cloud Function layer) is the deliberate architecture for all ROUTINE data** â€” bills, transactions, profile backups, etc. This is NOT a security shortcut: Firestore Security Rules ARE the row-level security layer here (same concept as Postgres RLS â€” per-document read/write conditions), and the app's client-side encryption (passphrase-derived key, done before anything ever reaches Firestore) means even a full rules failure would only ever expose unreadable ciphertext. A Cloud Function layer is reserved for the one place multiple users' data touches at once mid-operation (household linking) â€” and even that is deferred per the Spark-plan decision above.
- **Known accepted gap, documented rather than silently left implicit:** once A.5 (new-device sign-in) ships without multi-device session visibility, anyone with a profile's email+password AND passphrase can sign in from any device with no way for the account owner to see or revoke that session. This is not a NEW exposure (both credentials are already required today), just now explicitly logged as a known tradeoff of parking the sessions feature.
- **Essential vs. additional feature split, confirmed for Phase B prioritization:**
  - Essential (core loop, gets full UI/UX polish priority): Sign-in/Security, Accounts, Calendar, Bills/Debts/Loans (To-Pay), Transactions, Income, Savings + Emergency Fund/FI calculators, Dashboard, Settings (Categories, Security, Backup).
  - Additional (real value, but the app is a complete product without them being polished first): Groceries, Travel, Events, Year-End Goals, deep Reports pages (Subscription Audit, Tax Summary, Merchant Spending, Weekly Digest, etc.), Shared Expense ledger/settle-up, CSV import, Payment-method breakdown.
- **Phase B scope expanded** to include: three missing standard screens (Splash/Intro, Onboarding, standalone Profile screen split out of Settings); Accounts tab redesigned as Apple-Wallet-style colored/stacked account cards with an "Add account" bottom sheet; cards + bottom sheets adopted as the default add/edit interaction pattern app-wide (replacing full-screen navigation pushes for single-record add/edit flows); and a UI/UX-psychology pass (Hick's Law, Fitts's Law, Gestalt/proximity, cognitive load/progressive disclosure, color psychology) applied across all of the above rather than treated as a separate rebuild. Full checkpoint breakdown now recorded below, as its own numbered table (Checkpoint A.7 for the auth/linking loose ends, then the expanded Phase B table).
- Subscription screen (from the "8 standard mobile screens" reference list) explicitly SKIPPED â€” not applicable, this is not a paid/monetized app. Revisit only if monetization is ever considered, which is not currently planned.

--- CHECKPOINT A.7 PLANNING (this session) ---

- **Checkpoint A.7 inserted before Phase B**, closing out remaining auth/linking/security loose ends before UI/UX polish begins. Full breakdown in the checkpoint table below.
- A.7.8 ("PIN option not working," as originally phrased) is resolved into A.7.0 â€” confirmed to be the mobile app's existing Phase 1 PIN quick-unlock feature, which regressed at some point during the linking work (A.2â€“A.6-era changes), not a separate/new feature request.
- A.7.6 (raise the link limit from 2 to up to 5 accounts) is understood to be a bigger lift than the rest of A.7 â€” it changes the shape of linking from pairwise ("link with one other profile") to "join a household," and will likely touch Firestore rules, the merge/keep-mine/keep-theirs UI, and the core linking flow itself. Sequenced last within A.7 for that reason.
- A.7.2 (eye icon on password fields) is scoped as one reusable component applied everywhere a password/passphrase is typed: sign-in, create-profile, change-password, and the link-with-passphrase field â€” not four separate implementations.
- A.7.3 (faster sign-in) explicitly calls for profiling the real sign-in path before optimizing anything â€” the actual current value is 100,000 PBKDF2 iterations, not 200,000 as previously noted here; that cost is intentional security work and was not weakened. This item was completed by profiling first and then removing duplicate decrypt/model reload work while leaving the PBKDF2 step untouched.
- **Boomer/Gen Z/Millennial onboarding research (new, folded into Phase B):** flagged specifically for the security-setup step within onboarding (B.2b-security) â€” biometric-first with PIN as a clearly labeled fallback, never a password-creation screen at this step, numeric-only keypad, and a visible step counter throughout onboarding. Sequenced to happen after A.7.0 fixes the underlying PIN regression, not before, so onboarding isn't built around a currently-broken feature.
- **Date picker work (new, folded into Phase B as B.6a/B.6b):** a single reusable `<DateField>` component using `@react-native-community/datetimepicker`, rolled out first to Transactions and Bills (B.6a), then to every remaining screen with a date field â€” Debts, Loans, Income, Savings Goals, Events, Travel, and the Calendar tab's "balance as of" date (B.6b).
- **Competitor-inspired features (new, folded into Phase B, sourced from Simplifi/Monarch/Rocket Money-style research):** "Left to Spend" hero stat (B.7), category watchlists (B.8), Yours/Mine/Ours labels + transaction comments (B.9), refund tracker (B.10), weekly spending recap push notification (B.11), expanded FI/retirement calculator with Social Security estimate + multiple accounts + scenario comparison (B.12), report filtering by tag (B.13), and a lightweight subscription cancel-reminder â€” flag + reminder + link-out only, explicitly NOT automated cancellation (B.14).
- **Three items explicitly parked, not scheduled into the numbered sequence, pending a dedicated decision session:**
  - Receipt OCR (auto-fill a transaction amount from a photo) â€” needs an on-device-vs-cloud-API privacy tradeoff decided first.
  - An AI assistant for plain-English questions about your money â€” needs its own conversation about what data would leave the device and ongoing API cost.
  - Guest/read-only access for linked households â€” needs confirming there's an actual real-world use case before taking on the permission-model change it would require.

--- LIVE-TESTING SESSION (A.7.6a/b), NEW DECISIONS ---

- **Bugs found during live A.7.6a/A.7.6b testing are NOT being treated as a separate bug-bash.** They were re-scoped as clarifying what A.7.6b and A.7.6d actually need to contain, and folded directly back into the existing checkpoint sequence rather than jumping ahead to unrelated Phase A/B work. Reasoning: the "keep/merge dialog" bug IS A.7.6b's actual subject matter, and the "last member can't unlink" bug plus a new dissolve-on-empty/ownership-transfer design both belong inside A.7.6d's existing "owner-only member management" scope â€” fixing either with a smaller band-aid now would mean redoing the same code once A.7.6d is built anyway.
- **New feature decision, folds into A.7.6d:** when the LAST remaining member of a household unlinks/leaves, the household should fully dissolve â€” that member's data reverts to being their own normal unlinked personal data, not an orphaned empty household document sitting in Firestore forever. If two people are linked and one leaves, leaving the other alone, the same dissolve behavior applies to the one left behind. If they relink with someone new later, a brand-new household is created, same as any first-time link.
- **New feature decision, folds into A.7.6d:** if the OWNER chooses to leave a household that still has other members in it, they get an explicit UI step to pick which remaining member becomes the new owner (the underlying firestore.rules support for this transfer already exists from A.7.6a â€” `leaveHouseholdAndTransferOwnership()` â€” but no UI has been built for it yet).
- **Bug D's originally-proposed minimal fix (Option A: allow owner self-removal down to `members: []`, leaving an orphaned empty household document) is SUPERSEDED by the dissolve-on-empty decision above.** Do not implement the orphaned-empty-household version â€” go straight to actual dissolve/cleanup as part of A.7.6d.

- **EF/FI income figure is informational only, never auto-filled into a savings-balance input.** A first draft wired the new income baseline to overwrite `efSavingsInput`/`fiSavingsInput` via a tappable suggestion row; caught in review and reworked into a plain non-interactive display line instead. If a future session wants a genuine "tap to use this" income shortcut, it needs its own dedicated field, not reuse of the savings-balance inputs.
- **CSV duplicate detection is intentionally loose, not fuzzy/scored** â€” exact date + amount, near-exact label match â€” and defaults to excluding anything flagged, requiring an explicit opt-in checkbox per row to import it anyway.

--- AUTOMATED TESTING TOOLING â€” RESEARCHED, NOT YET ADOPTED ---

- **Goal raised:** catch bugs (sign-in, data entry, linking, password change, etc.) via automated testing instead of the person manually re-testing every flow by hand each session.
- **Options researched and their real cost:**
  - **Firebase Emulator Suite** â€” 100% free, no paid tier exists. Runs a local, throwaway copy of Firebase Auth + Firestore on the same machine, so test runs never touch real production data or cost anything.
  - **Maestro** â€” free and open-source for local use (CLI + Maestro Studio), unlimited, no account needed. Tests are written in plain YAML ("tap this, expect that"), which fits this project's zero-coding-background constraint well. Maestro Cloud (parallel runs across many hosted real devices, $125â€“250/month) is a separate paid tier NOT needed for a solo project â€” local-only Maestro is the realistic fit here.
  - **Claude Code** â€” the one piece that costs money. A separate product from claude.ai (this chat), with no free tier; cheapest entry is Claude Pro at $20/month ($17/month billed annually). This is the part that would let an AI actually run the emulator + Maestro tests, see failures, and fix code with much less manual copy-paste than the current workflow.
- **Not yet decided:** whether to adopt Claude Code, or start with the fully free path (Firebase Emulator Suite + Maestro test flows written by Claude here in chat, run manually by the person in their own PowerShell terminal, results pasted back for review â€” same workflow already used for everything else in this project). No commitment made either way yet.
- **If/when this is picked up as real work, it should become its own small checkpoint** (tentatively "Checkpoint A.7.9" or a standalone "Testing Setup" checkpoint, sequenced wherever it's decided to fit) rather than being folded into an existing one â€” it's infrastructure, not a specific bug fix or feature.

âš ï¸ Known issues / gotchas
- **RESOLVED â€” root cause of stray junk files in the repo, found while migrating to VS Code.** Two literal files existed in the repo at some point named `= {` and `t darkTheme: ThemeColors = {`. These blocked `git clone` from ever completing on a fresh machine (`error: invalid path 't darkTheme: ThemeColors = {'` â€” Windows forbids colons in filenames). Root cause: a bash heredoc-style file-save command (`cat > file << 'EOF' ... EOF`) had been pasted into a PowerShell terminal at some point rather than a bash terminal; PowerShell doesn't understand heredoc syntax and instead tried to interpret each line of pasted file content as its own command, which created these garbage-named files as a side effect. Fixed by deleting both files directly on GitHub (a one-time repair action, not a normal workflow step) before re-cloning. Permanent fix: PowerShell here-strings are now used for all file-save commands going forward â€” see ðŸ“Œ Decisions made and the Project Instructions (v7).
- **OPEN BUG, ROOT CAUSE NOW UNDERSTOOD â€” see decisions above. Household linking fails intermittently after a code is generated and shared, because the existing "finish linking" flow is a manual two-sided button design with no live communication between phones (a structural deadlock risk, not a random bug).** Old debugging notes are kept below for reference, but the fix is no longer "find the bug in the manual-button flow" â€” it is Checkpoint A.6, replacing that flow with real-time Firestore listeners.
  - Confirmed the visible error messages are generic catch-block fallbacks in `SettingsScreen.tsx`, not the real underlying error â€” a `console.error('finishJoinerLink failed:', e)` line was added to the joiner's catch block (around the `finishJoinerLink(...)` call, currently ~line 575-590) specifically so the real error prints to the Metro terminal. This was never captured, and capturing it is now MOOT â€” A.6 replaces this code path rather than debugging it further.
  - Checked `finishJoinerLink()` in `linking.ts` and `firestore.rules` line-by-line â€” no structural mismatch found on paper; the write shapes matched what the rules require. This supports (rather than contradicts) the new diagnosis: the bug isn't a rules/write-shape mismatch, it's the missing real-time signal between the two phones.
  - **Likely contributing factor, still true:** repeated testing during debugging sessions caused link codes to sit unused past the 15-minute expiry window (see security hardening #2) while other issues were being chased â€” some observed failures may simply have been expired codes layered on top of the real structural issue.
  - **Now-fixed UX gap found during that debugging (still valid, keep):** Phone A (host) had no way to generate a new code once one already existed/expired. A "Code expired? Start over with a new code" button (`handleStartOverLinking()` in `SettingsScreen.tsx`) was added and should be re-verified still present/working once A.6 (and, later, A.7.4/A.7.5 below) touches this same screen area.
  - **Process note, still relevant for A.6 work:** after any "find/replace" instruction, verify with `sed -n` or `grep` that the OLD text is actually gone, not just that the new text is present â€” a prior session's incorrectly-applied replacement duplicated a code block and broke the Metro bundle with a syntax error. Checking only for the new text's presence is not sufficient to confirm a clean replacement.
- **Accepted minor limitation (A.5, original one-time-migration scope):** if someone mistypes their email during the one-time auto-migration described above, `createFirebaseAccount` will succeed anyway (since that mistyped email isn't registered to anyone), silently creating a second, different Firebase account rather than erroring. This doesn't expose or lose any data â€” the local passphrase-encrypted data on the device is untouched either way â€” but it can leave an orphaned, unused Firebase account behind. Not fixed, since it's a personal app with a small number of profiles; worth remembering if a Firebase user list ever looks like it has more accounts than expected.
- (Carried forward) `getReactNativePersistence` needs a `// @ts-ignore` above its import line in `firebase.ts` due to a types-resolution quirk in Firebase ^12.18.0 with this project's TS config. Re-check if this ever needs touching again (e.g. a Firebase version upgrade).
- (Carried forward) Firestore security rules must be deployed separately from app code â€” editing `firestore.rules` in the repo does nothing on its own until `npx firebase-tools deploy --only firestore:rules` is actually run. **This matters for Checkpoint A.6 too, and for A.7.6's household-linking rules changes** â€” confirm any `firestore.rules` changes are actually deployed, not just saved locally, before testing.
- (Carried forward, now resolved per A.4 confirmation above) Firestore rules previously relied partly on document-ID secrecy â€” this is now closed for `linkCodes`, `households`, and `householdKeys`, with a deny-all fallback for everything else.
- **New, from the planning session:** parking multi-device sessions (see decision above) means A.5's new-device sign-in ships with no way to see/revoke other active sessions. Documented as an accepted, non-new tradeoff â€” not a bug, but worth remembering when A.5 is being tested/reviewed.
- **A.7.0 (PIN quick-unlock) â€” RESOLVED, moved to âœ… Done.** Turned out to be a false alarm (test accounts without a PIN set up), not a real regression â€” see the âœ… Done entry above for the confirmed root cause.
- **A.7.1 â€” RESOLVED, moved to âœ… Done.** Re-tested on a linked profile: password change â†’ sign out â†’ sign in with new password all succeeded, joiner phone unaffected. No longer an open issue â€” the earlier lockout was not reproducible on retest.
- **New gotcha for future sessions:** don't assume `@expo/vector-icons` (or any "ships with Expo by default" package) is actually present â€” check with `grep` on `package.json` first. This project didn't have it despite being a standard Expo template.
- **Bug A â€” "Invite someone" button appeared on the wrong (joiner) account.** CONFIRMED to be stale test data, not a real bug â€” that specific household was linked in an earlier test session BEFORE the A.7.6a host-owner fix was written, so its Firestore document already had `owner` baked in as the joiner's uid from the old buggy code path. Re-tested with a brand-new, never-before-linked host+joiner pair after the fix, and the host correctly saw "Invite someone." No code changes needed. Closed.
- **Bug B â€” Cancelling or regenerating a household invite link code doesn't actually invalidate the old code in Firestore.** Root cause (confirmed via Antigravity investigation): "Cancel invite" / "Generate new code" (`handleStartOverLinking()` in `SettingsScreen.tsx`) only clears local screen state and writes a NEW `linkCodes/{code}` document â€” it never deletes or invalidates the OLD one. The join path (`joinHouseholdLink()` in `linking.ts`) only checks whether a `linkCodes/{code}` document exists, with no `cancelled`/`active` flag check. Combined with the existing 15-minute TTL rule, an old "cancelled" code stays fully joinable for up to 15 minutes after being "cancelled." Fix plan approved but NOT YET IMPLEMENTED as of this entry: add a `cancelLinkCode()` helper that deletes the old code doc on cancel/regenerate, have `joinHouseholdLink()` reject a `cancelled`/`finished` code explicitly, and confirm `firestore.rules` actually permits the owner to delete their own pending code (currently `allow delete` only permits deleting a `finished: true` code, which may need a rules adjustment for this case too â€” needs re-checking before implementation).
- **Bug C â€” RESOLVED (implemented, not yet live-verified).** Fix implemented as Checkpoint A.7.6b â€” see âœ… Done. Live two-phone confirmation still needed (deferred to the batch-test pass), so treat as "should be fixed" rather than "confirmed fixed" until that test runs.
- **Bug D â€” RESOLVED as part of Checkpoint A.7.6d (see âœ… Done).** The last-member-can't-unlink case is now handled by `performDissolve()` â€” the sole remaining member's data auto-converts to a personal profile and the household document is deleted, rather than hitting a permission error. Implemented and committed; not yet confirmed via live two-phone testing (see the A.7.6d entry above for exactly what that test needs to cover).
- **(Resolved 2026-08-29)** Local profile-index entries in AsyncStorage are never deleted, only their householdId gets cleared on unlink. A stale/incomplete local entry for a username silently blocks cloud-restore from ever running again for that username on that device, even across sign-out/sign-in â€” because sign-in checks the local profiles-index for a matching username BEFORE ever considering cloud-restore. Fixed: cloud-restore now replaces (not appends) any existing local entry for that username, making it self-healing going forward. Worth remembering during future testing that repeatedly signs the same test username in/out across devices â€” a genuinely fresh cloud-restore is only guaranteed on a device where no local entry for that username currently exists.

- **CSV import: no upfront warning if Date/Label/Amount are left unmapped.** Each unmapped-field row just fails individually and lands in the skipped-rows list with per-row error text â€” not broken, just a less friendly failure mode. Not fixed; flagged as minor future polish.
- **Not yet visually confirmed on-device:** the two new EF/FI income-info lines in `SavingsScreen.tsx` reuse `styles.suggestionRow`/`styles.suggestionText`, originally styled for a tappable row, now used as plain non-interactive `View`s. Should look fine but hasn't been eyeballed on a real device yet.

â–¶ï¸ Next step

0. **IN PROGRESS, VERY CLOSE: Checkpoint A.7.9 (automated testing setup â€” Firebase Emulator + Maestro) â€” using the Android Studio AVD after all (pivot to real phone was reversed once `adb devices` confirmed the AVD is fully usable for automation despite its window not rendering on screen).** All infra confirmed working: Android emulator (`Pixel_10_Pro`) boots and is controllable via `adb`/Maestro; `firebase emulators:start` running; Expo running and app installed via Expo Go; `mobile-app/flows/create-profile.yaml` and `mobile-app/flows/sign-in.yaml` written (appId `host.exp.exponent`, opens `exp://192.168.1.62:8081` â€” NOTE this IP may change if the PC reconnects to WiFi, re-check against the live Expo terminal output if flows suddenly fail to open the app). Test account: test@example.com / testuser / test123456. Every individual step (open link, tap each field, input each field, hide keyboard, tap submit button) has now succeeded in at least one run â€” just need one clean end-to-end pass. Last run failed on the very first step, likely because the app was left mid-flow from a previous partial test run, not a new bug. NEXT ACTION: reset app state (`adb shell pm clear host.exp.exponent` or check if testuser already exists and use sign-in.yaml instead), then re-run. Resume here first before anything else. IMPORTANT REMINDER: `USE_FIREBASE_EMULATOR` is currently `true` in `firebase.ts` â€” must be set back to `false` before any real-account (non-testing) use.
1. ~~Checkpoint A.5 (reopened, new scope)~~ â€” CONFIRMED DONE (see âœ… Done section above, code inspected directly in `SignInScreen.tsx`). No further work needed here.
2. ~~Checkpoint A.6~~ â€” FULLY DONE, code inspected AND live-tested on two real phones (Phone A host / Phone B joiner). `linking.ts` has `subscribeToLinkCode()`, a real `onSnapshot` listener watching `linkCodes/{code}` live (treats permission-denied as an expected expiry, not an error). `SettingsScreen.tsx` wires this listener so it AUTOMATICALLY calls `finishHostLink()` the moment the joiner finishes â€” confirmed live: linking completed without either phone touching the old manual finish button, the listener handled it automatically end-to-end. The "Code expired? Start over with a new code" button was also re-confirmed working correctly on real devices. Checkpoint A.6 is fully closed â€” no remaining scope.
3. **Checkpoint A.4-followup / general:** none currently open â€” A.4 itself is confirmed done; just keep the "rules must be deployed separately" gotcha in mind while working on A.6's and A.7.6's rules changes.
4. **Checkpoint A.7 â€” Auth/Linking/Security fixes & features** (inserted before Phase B, closes out the linking/auth work before UI/UX polish begins):

   | Order | Item | Type | Notes |
   |---|---|---|---|
   | ~~A.7.0~~ | ~~PIN quick-unlock regression~~ | âœ… Done | Confirmed a false alarm, not a real bug â€” see âœ… Done section. Bonus: added an adjustable auto-lock timer to Settings while investigating. |
   | ~~A.7.1~~ | ~~Change password broken after linking~~ | âœ… Done | Re-tested and confirmed fixed on both unlinked and linked profiles, both phones. |
  | ~~A.7.2~~ | ~~Eye icon on all password fields~~ | âœ… Done | One reusable `PasswordField` component, applied to sign-in, create-profile, and change-password (6 fields total). |
   | ~~A.7.3~~ | ~~Faster sign-in~~ | âœ… Done | Profiled first, then eliminated duplicate decrypt/model-reload + duplicate profile-index read + deferred notification scheduling. PBKDF2 itself left untouched. Confirmed correct on-device (normal, cloud-restore, and linked sign-in) â€” perceived speed unchanged, which was expected since the eliminated work was a smaller share of total time than PBKDF2 itself. |
   | ~~A.7.4~~ | ~~Expired link code shouldn't just sit there~~ | âœ… Done | Local 15-minute expiry timer added to the host link-code screen, matching the Firestore linkCodes TTL; also wired the existing Firestore listener to detect a permission-denied read (the code's own expired-read signal) as a backup path. Bundled fix: a stale 'Linked!'/error message could remain on screen next to a freshly generated code â€” hostFinishMsg is now cleared whenever a new code is generated or the code expires. Verified on-device: expiry auto-clears the code, normal linking still completes successfully, and starting over cancels the old timer correctly. |
  | ~~A.7.5~~ | ~~60-second cooldown before generating a new code~~ | âœ… Done | Cooldown attached to the "Code expired? Start over with a new code" link (not the initial "Start linking" button, which becomes unreachable once a code exists) â€” disabled + greyed while active, with a live "Generate a new code in Xs" countdown ticking every second via a dedicated setInterval, separate from the existing 15-min expiry timer and never cleared by expiry itself. Bundled UX fix: added a "Generating your secure codeâ€¦" message next to the spinner on the initial code-generation button, after investigating a "feels slow" report and confirming it was a reassurance/feedback gap (no real performance issue â€” PBKDF2/encryption/Firestore write legitimately take a few seconds, connection was solid, delay was never measured). Verified on-device: full 5-step test (initial generation shows feedback text, cooldown shows on Start Over and counts down, reaches 0 and re-enables, Start Over correctly restarts cooldown, leaving/returning to screen mid-cooldown doesn't crash) â€” all passed. |
   | ~~A.7.6a~~ | ~~Data model â€” Firestore rules capped at 5 members, add household owner field/role~~ | âœ… Done | Deployed and live. Rules + household.ts updated, reviewed line-by-line, tsc clean, `firebase-tools deploy --only firestore:rules` confirmed successful. No UI yet â€” that's A.7.6d. |
   | ~~A.7.6b~~ | ~~Extend join flow + keep-mine/keep-theirs/merge choice to households with 2+ existing members~~ | âœ… Implemented, not yet live-tested | Committed (`8f1e5f7`). |
   | ~~A.7.6c~~ | ~~UI: show "X of 5 linked" + block/explain once cap is hit~~ | âœ… Implemented, not yet live-tested | Committed (`0fdc963`). |
   | ~~A.7.6d~~ | ~~Owner-only UI: remove members, ownership transfer, auto-dissolve~~ | âœ… Implemented, not yet live-tested | Committed. Full member roster, owner-only remove button, successor picker on owner-leaves, and shared auto-dissolve logic all built together as one screen in `SettingsScreen.tsx`. See âœ… Done for full detail. |
   | ~~A.7.7~~ | ~~Show profiles of everyone you're linked to~~ | âœ… Implemented, not yet live-tested | Delivered as part of A.7.6d's household roster (name, "You" label, "Owner" label) â€” no separate build needed. |

   (A.7.8 "PIN option not working" is resolved into A.7.0 above â€” confirmed as the mobile app's Phase 1 PIN feature, broken during linking work, not a separate item.)

5. **Live two-phone test of A.7.6d before it can be marked confirmed-done.** Specifically: link two phones, then have one leave (or have the owner remove it) while the OTHER phone has the app open in the foreground â€” confirm that phone dissolves back to a personal profile live, without needing to background/reopen the app. This is the scenario the live Firestore listener exists for; the offline catch-up path (app closed, then reopened) is a separate, easier-to-hit code path and passing that alone wouldn't confirm the listener itself works. Also worth covering in the same pass: owner removes a member, owner transfers ownership and leaves a 2+ person household, and owner leaves a 2-person household (should route straight to dissolve, no pointless 1-person picker). Once this passes, batch-test A.7.6b/A.7.6c together with it per the earlier batch-testing decision.
6. **Once A.7.6d's live test is confirmed, run a full Claude+Copilot code-health rundown before moving on** â€” Copilot investigates only (no edits), reporting bugs, stale/unused files, and unnecessary/dead lines across the codebase; findings get pasted back to Claude for review, and only what's actually worth fixing gets acted on (not everything a linter-style pass flags needs to be touched).
6. Once A.5, A.6, A.7, and the code-health rundown above are all done: **pick multi-device "active sessions" back up** (design already scoped in the decisions section above), OR move straight into Phase B depending on what feels like the better next use of a session at that point â€” revisit with the person then.
6. **Phase B â€” UI/UX Polish**, expanded scope agreed across planning sessions (full detail in Decisions above). Checkpoint order when this phase starts:

   | Order | Item | Source |
   |---|---|---|
   | B.1 | Essential vs. additional feature split â€” formal write-up | Already decided in planning session; just needs its own checkpoint entry |
   | B.2a | Splash/Intro screen | Standard-screens gap-check |
   | B.2b | Onboarding (short, skippable, shown once after account creation) | Standard-screens gap-check |
   | B.2b-security | Security setup step within onboarding â€” biometric-first, PIN as labeled fallback, never a password-creation screen, numeric-only keypad, visible step counter | Boomer/Gen Z/Millennial onboarding research; do after A.7.0 fixes PIN, not before |
   | B.2c | Standalone Profile screen, split out of Settings | Standard-screens gap-check |
   | B.3a | Accounts tab redesign: colored account cards | Apple Wallet-inspired |
   | B.3b | Accounts tab redesign: stacked/fanned card view | Apple Wallet-inspired |
   | B.3c | Accounts tab redesign: "Add account" as a bottom sheet | Apple Wallet-inspired |
   | B.4a | Convert essential-screen add/edit flows to bottom sheets, one screen at a time | Cards + bottom sheets as default interaction pattern |
   | B.4b | Carry the collapsed-row/tap-to-expand pattern to every list screen that doesn't already have it | Cards + bottom sheets as default interaction pattern |
   | B.5 | UI/UX psychology pass â€” Hick's Law, Fitts's Law, Gestalt/proximity, Miller's Law/chunking, cognitive load/progressive disclosure, color psychology, trust markers/explicit labeling, Picture Superiority Effect, persistent progress indicators, Jakob's Law | Cross-generational research (Gen Z/Millennial/Boomer), applied throughout B.2â€“B.4 rather than as a separate rebuild |
   | B.6a | Date picker, part 1 â€” reusable `<DateField>` component (`@react-native-community/datetimepicker`), rolled out to Transactions and Bills first | Requested this session |
   | B.6b | Date picker, part 2 â€” roll `<DateField>` out to every remaining screen (Debts, Loans, Income, Savings Goals, Events, Travel, Calendar's "balance as of" date) | Requested this session |
   | B.7 | "Left to Spend" hero stat on Home tab | Simplifi-inspired |
   | B.8 | Category watchlists under Insights | Simplifi-inspired |
   | B.9 | Yours/Mine/Ours labels + transaction comments | Monarch-inspired |
   | B.10 | Refund tracker | Simplifi-inspired |
   | B.11 | Weekly spending recap push notification | Monarch-inspired |
   | B.12 | Expanded FI/retirement calculator (Social Security estimate, multiple accounts, scenario comparison) | Simplifi-inspired |
   | B.13 | Report filtering by tag | Simplifi-inspired |
   | B.14 | Subscription cancel-reminder (flag + reminder + link-out, no automated cancellation) | Lightweight Rocket Money substitute |

   **Parked for a later, dedicated decision â€” not scheduled into the numbered sequence above:**
   - Receipt OCR (auto-fill amount from a photo) â€” on-device vs. cloud-API privacy tradeoff needs deciding first
   - AI assistant for plain-English questions about your money â€” privacy (what data leaves the device) + ongoing API cost needs its own conversation
   - Guest/read-only access for linked households â€” needs confirming there's an actual use case before taking on the permission-model change

7. ~~**Custom recurrence for Loans**~~ â€” âœ… DONE this session (see âœ… Done section). `recurrence.ts`/`balanceProjection.ts`/`LoansScreen.tsx` all updated.
8. **Payment Methods report** (carried from PROGRESS.md, deferred) â€” requires a paymentMethod field added to the data model (BillCycle, Debt cycles, LoanPayment, ManualTransaction) AND a real Cash/Debit/Credit picker UI on the relevant payment-logging screens, not just a new report file.
9. Smaller carried-forward loose ends: ~~EF/FI calculators still don't auto-pull figures from Bills/Income~~ â€” âœ… DONE this session, informational display only (see âœ… Done). Still open: neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target); debt-side "feesPortion" doesn't exist in the data model, so Tax Summary's Interest & Fees figure only covers loan late fees, not debt fees.
10. ~~**Optional/deferred, unchanged:** Checkpoint 6.3, CSV import for Transactions.~~ â€” âœ… DONE this session: column mapping + duplicate detection built (see âœ… Done).
11. **Phase C â€” Publishing**, unchanged from 4-REMAINING-WORK-ROADMAP.md: C.1 EAS Build â†’ installable `.apk`/TestFlight link. C.2 (optional, real costs, entirely the person's call) â†’ Play Store/App Store listing.

Files in the repo (relevant to this phase)
- mobile-app/src/components/PasswordField.tsx â€” UPDATED (A.7.9, this session): added `testID?: string` prop, forwarded to inner `TextInput`, for Maestro tap-targeting.
- mobile-app/src/screens/SignInScreen.tsx â€” UPDATED (A.7.9, this session): added `testID`s to email/username/password inputs and the sign-in button.
- mobile-app/app.json â€” UPDATED (A.7.9, this session): added `android.package: "com.cathlauron.householdfinance"` (was missing).
- See PROGRESS.md for the full file inventory as of closing 3-ROADMAP.md. This file will only note NEW files or MEANINGFULLY CHANGED files as Phase A/B/C proceeds.
- No code files were touched in the planning sessions â€” those were planning-only. The next session (starting on the reopened Checkpoint A.5) will be the first to touch `SignInScreen.tsx` / `DataContext.tsx` / `cloudBackup.ts` again since the planning passes.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED in a prior session: added `handleStartOverLinking()` and its button; added `console.error('finishJoinerLink failed:', e)` for debugging (now moot per the A.6 decision â€” this whole area will be rebuilt in A.6); unlink UI (`handleUnlinkHousehold`, confirm dialog) confirmed present from a prior session.
- mobile-app/src/household.ts â€” CONFIRMED in a prior session to contain `addMemberToHousehold` and `removeMemberFromHousehold` (unlink).
- mobile-app/firestore.rules â€” CONFIRMED in a prior session to contain the kill-on-use delete rule, the 15-minute expiry read rule, and the members-removeAll unlink rule.
- mobile-app/src/mergeModels.ts â€” UPDATED this session: added `sanitizeModelIds()`, applied to every merged list (not just bills), called before the merged model is returned.
- mobile-app/src/DataContext.tsx â€” UPDATED this session: ID sanitization added on both model load and model save (linked and unlinked branches), acting as a one-time repair pass for existing data.
- mobile-app/src/linking.ts â€” UPDATED this session: `subscribeToLinkCode` listener now treats permission-denied/expired-code as a graceful terminal state instead of a logged error.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session: clears `linkCode`/`linkSecretHex` immediately once host-side linking finishes, so the listener's cleanup runs promptly.
- mobile-app/package.json / package-lock.json â€” `expo` downgraded from `^57.0.18` to `^54.0.0` (committed this session; the actual fix had been applied to your local files in an earlier session but never committed until now).
- mobile-app/src/autoLock.ts â€” UPDATED this session: added `AUTO_LOCK_OPTIONS` and a subscribe/notify pattern (`subscribeToAutoLockMinutes`) so a settings change applies live.
- mobile-app/App.tsx â€” UPDATED this session: subscribes to auto-lock changes and resets the idle timer immediately when the setting changes.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session: new "Auto-lock" section added under Security (1/5/15/30 min picker, styled to match the existing appearance-mode picker).
- mobile-app/src/components/PasswordField.tsx â€” NEW this session: shared password/passphrase input with eye-icon show/hide toggle.
- mobile-app/src/screens/SignInScreen.tsx, CreateProfileScreen.tsx, SettingsScreen.tsx â€” UPDATED this session: swapped 6 raw `TextInput` password fields over to `PasswordField`.
- mobile-app/package.json / package-lock.json â€” UPDATED this session: added `@expo/vector-icons` dependency.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session (A.7.5): added cooldownActive/cooldownSeconds state, linkCooldownTimerRef/clearLinkCooldownTimer()/beginLinkCooldown() (independent 60-second interval-based countdown timer, separate from the A.7.4 expiry timer); cooldown UI (disabled state + live countdown text) attached to the "Start over" link in the active-code view, not the initial "Start linking" button; added a "Generating your secure codeâ€¦" reassurance message next to the spinner on the initial button.
- mobile-app/src/linking.ts â€” UPDATED this session (A.7.6b): added `isInvite: true` to `startHouseholdInvite()`'s write, added `isInvite?: boolean` to `JoinLinkResult`, `joinHouseholdLink()` now returns `isInvite: Boolean(data.isInvite)`.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session (A.7.6b): `joinResult` state type gained `isInvite?: boolean`; join-choice dialog's 3 conditionals switched from `joinResult.existingHouseholdId` to `joinResult.isInvite`.
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session (A.7.6c): added "X of 5 linked" badge next to "âœ“ Linked"; `handleStartHouseholdInvite()` now does a fresh `getHouseholdMemberCount()` fetch before checking the cap; updated full-household message wording.
- mobile-app/src/linking.ts â€” UPDATED this session (A.7.6c): `finishJoinerLink()` now catches a `permission-denied` write rejection (checked via `error.code`, with a message-regex fallback) and throws a friendlier "household full or invite no longer valid" error; its outer catch in `SettingsScreen.tsx` now surfaces the real error message instead of a generic "check your connection."
- mobile-app/firestore.rules â€” UPDATED this session (A.7.6d): every `memberUsernames`-touching rule now restricts which key can change (not just a type check); household `allow delete` changed from `false` to permitting a sole remaining member to delete their own household document.
- mobile-app/src/household.ts â€” UPDATED this session (A.7.6d): `createHouseholdData`/`addMemberToHousehold`/`removeMemberFromHousehold`/`leaveHouseholdAndTransferOwnership` all updated to also read/write `memberUsernames`; added `removeMemberByOwner()`, `deleteHousehold()`, `getHouseholdMembers()`, `subscribeToHousehold()`.
- mobile-app/src/linking.ts â€” UPDATED this session (A.7.6d): the three places that call `createHouseholdData`/`addMemberToHousehold` now also pass the person's username, so `memberUsernames` gets populated correctly.
- mobile-app/src/DataContext.tsx â€” UPDATED this session (A.7.6d): added shared `performDissolve()` function; added `setupHouseholdListener()`/`cleanupHouseholdListener()` for the live Firestore listener; `loadModel()` now attaches the listener on load and self-heals via `performDissolve()` if it hits a permission error or finds membership already at 1; `unlinkHousehold()`'s sole-member branch now calls `performDissolve()` instead of its own inline logic; added `unlinkAndTransferOwnership()`, `linkNoticeMsg`/`clearLinkNoticeMsg` for showing a message when dissolve happens to someone passively (not by their own action).
- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session (A.7.6d): new household member roster UI (name/You/Owner labels, owner-only Remove button with confirm dialog); new successor-picker screen shown when the owner chooses to leave a 2+ person household; displays `linkNoticeMsg` when present.

- mobile-app/src/screens/SettingsScreen.tsx â€” UPDATED this session (A.7.6d): new household member roster UI (name/You/Owner labels, owner-only Remove button with confirm dialog); new successor-picker screen shown when the owner chooses to leave a 2+ person household; displays `linkNoticeMsg` when present.

(PASTE HERE)
- mobile-app/src/screens/LoansScreen.tsx â€” UPDATED: loan recurrence call sites now pass custom-recurrence fields into `getNextDueDate()`.
- mobile-app/src/recurrence.ts â€” UPDATED: now owns `customOccurrencesInMonth()`; `getNextDueDate()` gained the `custom` branch.
- mobile-app/src/balanceProjection.ts â€” UPDATED: imports the shared helper instead of defining its own copy.
- mobile-app/src/screens/SavingsScreen.tsx â€” UPDATED: EF/FI income baseline added as a read-only display line.
- mobile-app/src/csvImport.ts â€” UPDATED: added `CsvColumnMapping`, `guessCsvColumnMapping`, `applyCsvMapping`, `looksLikeDuplicateTransaction`, `flagDuplicateRows`.
- mobile-app/src/screens/CsvImportModal.tsx â€” UPDATED: new column-mapping step UI and duplicate-flagging UI in the import preview.
- mobile-app/src/DataContext.tsx â€” UPDATED: cosmetic `memberCount` â†’ `memberCountAfterUpdate` rename (TS2451 fix), no logic change.

## ðŸ“… Session entry â€” 2026-09-01 (cont'd 3): Emulator confirmed fully usable despite window bug; Maestro flows written and iterated; very close to a passing create-profile test

**What happened:** Confirmed via `adb devices` that the emulator (`emulator-5554 device`) is fully functional for automation even though its window won't render/respond on screen for direct human interaction â€” this meant the earlier "abandon the emulator" pivot was unnecessary; reversed that decision and continued using the AVD. Screenshots pulled via `adb shell screencap` + `adb pull` were used throughout as a substitute for a working window, to visually confirm app state at each step.

Got the app running successfully on the emulator via `npx expo start` + pressing `a`. Confirmed (via screenshot) the Create Profile screen renders correctly with all expected fields. Confirmed `firebase emulators:start` was running and the app logged `ðŸ§ª Connected to LOCAL Firebase emulator`.

**Wrote Maestro flow files** (`mobile-app/flows/create-profile.yaml`, `mobile-app/flows/sign-in.yaml`), test account: email `test@example.com`, username `testuser`, password `test123456`. Iterated through several issues:
1. First attempt used `appId: com.cathlauron.householdfinance` with `launchApp` â€” failed because that package isn't actually installed (the app runs inside Expo Go, not as a standalone build). Fixed by switching to `appId: host.exp.exponent` (Expo Go's real package name) and `openLink: "exp://192.168.1.62:8081"` instead of `launchApp`.
2. Second attempt got further (all field taps/inputs succeeded) but crashed with a Maestro internal bug (`Illegal character (U+0)` in `viewHierarchy` parsing) â€” known flaky Maestro/UI-Automator issue, not a real bug in the app. Resolved by simply retrying.
3. Third attempt got all the way through every field fill (email, username, password, confirm password all âœ…) but failed tapping `create-profile-button` â€” diagnosed as the on-screen keyboard still covering the button. Fixed by adding a `hideKeyboard` step before the final tap.
4. Fourth attempt (most recent) failed on the very FIRST step (`email-input` not found) â€” most likely because the previous partial run had already left the app on a different screen (e.g. mid-signup or an error state), not a new/different bug. Not yet re-confirmed.

**Current flow file contents (both use this pattern), `create-profile.yaml`:**
```yaml
appId: host.exp.exponent
---
- openLink: "exp://192.168.1.62:8081"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "username-input"
- inputText: "testuser"
- tapOn:
    id: "password-input"
- inputText: "test123456"
- tapOn:
    id: "confirm-password-input"
- inputText: "test123456"
- hideKeyboard
- tapOn:
    id: "create-profile-button"
- assertVisible:
    text: "Welcome"
    optional: true
```
`sign-in.yaml` is the same pattern but taps `sign-in-button` instead of the create-profile fields/button (no confirm-password step).

**Not yet done:** confirm a clean create-profile run start-to-finish (need to first reset app/emulator to a known blank state, since the last run left the app in an unknown mid-flow state â€” likely just needs `adb shell pm clear host.exp.exponent` or force-closing Expo Go, or possibly the "testuser" profile now genuinely exists in the Firebase emulator's fake data and the flow should be re-run as a SIGN-IN test instead of create-profile). Then run `sign-in.yaml` to confirm sign-in also works end to end.

ðŸ§¹ Code health
- No app source code changed this session â€” all changes were test infrastructure (`firebase.ts`'s emulator toggle from earlier in the day, plus the new `mobile-app/flows/*.yaml` files).
- `mobile-app/flows/create-profile.yaml` and `mobile-app/flows/sign-in.yaml` NOT YET COMMITTED as of this entry.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section, item 0, for current status)
- Reset the emulator/app to a clean state (`adb shell pm clear host.exp.exponent` is the likely fix, or check whether "testuser" already exists and pivot to testing sign-in.yaml instead of create-profile.yaml again).
- Re-run `create-profile.yaml` (or `sign-in.yaml` if testuser already exists) to get a full, clean pass end-to-end.
- Once one full flow passes cleanly, commit the flows folder and this progress.
- Remember: `USE_FIREBASE_EMULATOR` must be set back to `false` in `firebase.ts` before any real-account (non-testing) use â€” still `true` as of this entry.

## ðŸ“… Session entry â€” 2026-09-01 (cont'd 3): Emulator confirmed fully usable despite window bug; Maestro flows written and iterated; very close to a passing create-profile test

**What happened:** Confirmed via `adb devices` that the emulator (`emulator-5554 device`) is fully functional for automation even though its window won't render/respond on screen for direct human interaction â€” this meant the earlier "abandon the emulator" pivot was unnecessary; reversed that decision and continued using the AVD. Screenshots pulled via `adb shell screencap` + `adb pull` were used throughout as a substitute for a working window, to visually confirm app state at each step.

Got the app running successfully on the emulator via `npx expo start` + pressing `a`. Confirmed (via screenshot) the Create Profile screen renders correctly with all expected fields. Confirmed `firebase emulators:start` was running and the app logged `ðŸ§ª Connected to LOCAL Firebase emulator`.

**Wrote Maestro flow files** (`mobile-app/flows/create-profile.yaml`, `mobile-app/flows/sign-in.yaml`), test account: email `test@example.com`, username `testuser`, password `test123456`. Iterated through several issues:
1. First attempt used `appId: com.cathlauron.householdfinance` with `launchApp` â€” failed because that package isn't actually installed (the app runs inside Expo Go, not as a standalone build). Fixed by switching to `appId: host.exp.exponent` (Expo Go's real package name) and `openLink: "exp://192.168.1.62:8081"` instead of `launchApp`.
2. Second attempt got further (all field taps/inputs succeeded) but crashed with a Maestro internal bug (`Illegal character (U+0)` in `viewHierarchy` parsing) â€” known flaky Maestro/UI-Automator issue, not a real bug in the app. Resolved by simply retrying.
3. Third attempt got all the way through every field fill (email, username, password, confirm password all âœ…) but failed tapping `create-profile-button` â€” diagnosed as the on-screen keyboard still covering the button. Fixed by adding a `hideKeyboard` step before the final tap.
4. Fourth attempt (most recent) failed on the very FIRST step (`email-input` not found) â€” most likely because the previous partial run had already left the app on a different screen (e.g. mid-signup or an error state), not a new/different bug. Not yet re-confirmed.

**Current flow file contents (both use this pattern), `create-profile.yaml`:**
```yaml
appId: host.exp.exponent
---
- openLink: "exp://192.168.1.62:8081"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "username-input"
- inputText: "testuser"
- tapOn:
    id: "password-input"
- inputText: "test123456"
- tapOn:
    id: "confirm-password-input"
- inputText: "test123456"
- hideKeyboard
- tapOn:
    id: "create-profile-button"
- assertVisible:
    text: "Welcome"
    optional: true
```
`sign-in.yaml` is the same pattern but taps `sign-in-button` instead of the create-profile fields/button (no confirm-password step).

**Not yet done:** confirm a clean create-profile run start-to-finish (need to first reset app/emulator to a known blank state, since the last run left the app in an unknown mid-flow state â€” likely just needs `adb shell pm clear host.exp.exponent` or force-closing Expo Go, or possibly the "testuser" profile now genuinely exists in the Firebase emulator's fake data and the flow should be re-run as a SIGN-IN test instead of create-profile). Then run `sign-in.yaml` to confirm sign-in also works end to end.

ðŸ§¹ Code health
- No app source code changed this session â€” all changes were test infrastructure (`firebase.ts`'s emulator toggle from earlier in the day, plus the new `mobile-app/flows/*.yaml` files).
- `mobile-app/flows/create-profile.yaml` and `mobile-app/flows/sign-in.yaml` NOT YET COMMITTED as of this entry.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section, item 0, for current status)
- Reset the emulator/app to a clean state (`adb shell pm clear host.exp.exponent` is the likely fix, or check whether "testuser" already exists and pivot to testing sign-in.yaml instead of create-profile.yaml again).
- Re-run `create-profile.yaml` (or `sign-in.yaml` if testuser already exists) to get a full, clean pass end-to-end.
- Once one full flow passes cleanly, commit the flows folder and this progress.
- Remember: `USE_FIREBASE_EMULATOR` must be set back to `false` in `firebase.ts` before any real-account (non-testing) use â€” still `true` as of this entry.

## ðŸ“… Session entry â€” 2026-09-01 (cont'd 4): Fixed Maestro's hideKeyboard bug (was exiting the app); full create-profile flow now runs clean end-to-end

**What happened:** Continued Checkpoint A.7.9. Diagnosed why `maestro test flows\create-profile.yaml` was failing on the final `create-profile-button` tap: the flow's `hideKeyboard` step was found to be the cause via a debug screenshot, which showed the emulator sitting on **Expo Go's own home screen** instead of the app -- confirming the app had been exited entirely, not just had its keyboard closed. Root cause: on Android, Maestro's `hideKeyboard` step is implemented as a back-button press; since the Create Profile screen is the first screen in the app with nothing to navigate back to, that back-press exited the app instead of dismissing the keyboard.

**Fix applied:** replaced the `hideKeyboard` step in `flows\create-profile.yaml` with `tapOn: { point: "50%,10%" }` (tapping a blank area near the screen's top, away from any input field) -- this dismisses the keyboard the normal way without triggering back-navigation.

**Also carried over from earlier in this session (see prior entries):** `USE_FIREBASE_EMULATOR` flipped from `false` to `true` in `src/firebase.ts` (was mistakenly left off), and temporary debug logging (`console.error`) added to the Firebase-account-creation catch block in `CreateProfileScreen.tsx`, via the Claude+Copilot investigate-then-approve workflow -- both changes confirmed via `npx tsc --noEmit` (clean) before being applied.

**Result:** re-ran `maestro test flows\create-profile.yaml` -- every single step now passes, including the previously-failing button tap: Open link, tap+input all 4 fields (email/username/password/confirm), tap the blank area, tap "create-profile-button" -- all âœ…. Only the final, optional `assertVisible: "Welcome"` check warned (not failed) -- expected, since the exact post-signup success text/screen hasn't been confirmed yet, and this assertion was deliberately marked `optional: true` from the start.

**Not yet confirmed as of this entry:** whether the account itself was actually created successfully against the local Firebase emulator, or whether it still fails with a real (now-visible, thanks to the debug logging) Firebase error. Terminal 3's console output was not yet reviewed before this session ended -- this is the very next thing to check.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean (confirmed by Copilot before the emulator-flag + debug-logging changes were applied).
- `flows\create-profile.yaml`: UPDATED this session (hideKeyboard -> tapOn point). **Not yet committed.**
- `src/firebase.ts`: UPDATED earlier this session (USE_FIREBASE_EMULATOR flag). **Not yet committed.**
- `src/screens/CreateProfileScreen.tsx`: UPDATED earlier this session (temporary debug logging). **Not yet committed.**

â–¶ï¸ Next step (this entry only -- see the top-of-file Next step section, item 0, for current status)
- Check Terminal 3's (Expo) console output from the most recent test run for any `createFirebaseAccount failed` / `Firebase auth code` / `Firebase auth message` lines -- this tells us whether account creation actually succeeded or is still failing for a different reason.
- If it succeeded: mark the create-profile flow as fully working, remove the temporary debug logging from `CreateProfileScreen.tsx` (or leave it for now if more testing is planned), commit everything from this session together (`flows/create-profile.yaml`, `src/firebase.ts`, `CreateProfileScreen.tsx`).
- If it still fails: paste the real Firebase error here and we will diagnose from there -- do NOT guess at a fix without seeing the actual error text.
- Remember: `USE_FIREBASE_EMULATOR` is currently `true` in `firebase.ts` -- must be set back to `false` before any real-account (non-testing) use, once this testing phase wraps up.
- Once create-profile is fully confirmed working end-to-end, move to writing/running `sign-in.yaml` as the next flow to validate, then proceed through the Emulator Testing Checklist built in an earlier session.
'@ | Add-Content -Path "PROGRESS1.md" -Encoding UTF8

## ðŸ“… Session entry â€” 2026-09-01 (cont'd 2): Android Studio fully reinstalled, emulator now boots successfully, but its window won't render/respond â€” PIVOT DECISION: abandon Android emulator, test Maestro against real phone instead

**What happened:** Did a full clean uninstall + reinstall of Android Studio (uninstalled via Windows Settings, manually deleted `%LOCALAPPDATA%\Android`, `%APPDATA%\Google\AndroidStudio*`, and `%USERPROFILE%\.android`, then reinstalled fresh from developer.android.com â€” Quail 4 / 2026.1.x). This DID fix the original "missing DLL" crash-on-launch errors. Along the way found and fixed a `platform-tools` vs `platform-tools-2` folder naming conflict from the fresh SDK install (deleted the stale old folder, renamed the new one). Recreated the `Pixel_10_Pro` AVD (same spec as before: Android 17.0 "CinnamonBun", API 37.1, x86_64).

**New, different problem surfaced:** the emulator process now boots successfully end-to-end (confirmed twice, via full log output showing "Boot completed" â€” 218866ms on first/cold boot, 62867ms on a second boot using `-gpu swiftshader_indirect`), and is confirmed alive and using real CPU via `Get-Process`. However, **its window will not appear/respond on screen** â€” visible only as an unresponsive taskbar thumbnail, not clickable, doesn't appear via Alt+Tab or Win+Tab, and Win+Shift+Arrow (force-move-to-monitor) had no effect either. Tried both default GPU acceleration and explicit `-gpu swiftshader_indirect` (software rendering) â€” same symptom both times, ruling out a GPU-driver-specific cause. This looks like a display/window-compositor-level quirk specific to this machine's graphics setup (Intel UHD Graphics, no dedicated GPU), not a fundamental hardware incompatibility (the successful full Android boot proves the hardware/hypervisor itself works).

**Decision made: stop debugging the Android Studio emulator route.** Given real Android-phone testing via Expo Go + tunnel mode is already a known-working, trusted part of this project's normal workflow, pivot Checkpoint A.7.9 to run Maestro against the real physical phone instead of an AVD. This sidesteps the window-rendering problem entirely and reuses existing infrastructure rather than continuing to debug unfamiliar territory.

**Implication for `firebase.ts`:** the `EMULATOR_HOST = "10.0.2.2"` value only works for an AVD â€” it will need to change to the PC's real WiFi IP address (via `ipconfig`) for a real phone to reach the local Firebase emulator, OR the plan may shift to testing against real Firebase directly instead of the local emulator. Not yet decided â€” first thing to resolve next session.

**Not yet committed this session** â€” Android Studio/emulator work involved no code changes (infrastructure only), so there is nothing new to commit beyond the pivot decision being logged here.

ðŸ§¹ Code health
- No code changed this session past the earlier `firebase.ts` commit â€” this entire session was infrastructure/tooling troubleshooting.
- `npx tsc --noEmit`: not re-run this session (no code touched).

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section, item 0, for current status)
- Decide: keep testing against the local Firebase emulator (requires finding the PC's real WiFi IP and updating `EMULATOR_HOST` in `firebase.ts`) OR switch to testing against real Firebase directly (simpler, but real account data risk during test runs â€” needs a dedicated test account if chosen).
- Once decided: confirm the real phone can reach whichever Firebase target is chosen.
- Write and run the `create-profile.yaml` / `sign-in.yaml` Maestro flows against the real phone (same `maestro test` commands as originally planned, just pointed at a real connected device instead of an AVD).
- The Android Studio emulator itself is NOT being deleted/uninstalled again â€” it's just not part of the testing plan going forward. No cleanup action needed.

## ðŸ“… Session entry â€” 2026-09-01 (cont'd): A.7.9 setup completed except Android emulator won't launch â€” blocked on suspected corrupted Android Studio install

**What happened:** Continued Checkpoint A.7.9. Confirmed Firebase CLI (v15.28.2) and Maestro CLI (v2.9.0) were both already installed â€” no install steps needed for either. Confirmed `firebase.json` already existed with correct emulator port config (Auth 9099, Firestore 8080, UI enabled).

Added a `USE_FIREBASE_EMULATOR` toggle to `firebase.ts` (currently `true`), using `EMULATOR_HOST = "10.0.2.2"` â€” the fixed special IP an Android emulator uses to reach its host PC (confirmed this matters because the person is testing via an Android Studio AVD, not a real phone; "localhost" would NOT have worked here).

Found an existing AVD already set up in Android Studio's Device Manager (`Pixel_10_Pro`, Android 17.0, API 37.1). Found and fixed a "Windows Hypervisor Platform is not enabled" blocker via Device Manager's own "Enable" button + a restart. Added the emulator/platform-tools SDK folders to the Windows PATH so `emulator`/`adb` work from any terminal â€” required a full VS Code restart (not just a new terminal tab) to take effect, which caused some initial confusion before being resolved.

**Blocked here:** launching the emulator (`emulator -avd Pixel_10_Pro`) opens a window but immediately crashes with a Windows "System Error" dialog citing a missing DLL. This happened repeatedly across FOUR different DLLs on different attempts (Qt6GuiAndroidEmu.dll, libandroid-emu-tracing.dll, Qt6CoreAndroidEmu.dll, Qt6WidgetsAndroidEmu.dll) â€” not the same file each time. Tried updating the Android Emulator component via SDK Manager (no fix). Tried fully deleting `%LOCALAPPDATA%\Android\Sdk\emulator` and letting SDK Manager reinstall it fresh (no fix â€” same category of error persisted). Multiple different files failing across a clean component reinstall strongly suggests the Android Studio installation itself is corrupted, not just the emulator piece.

**Decision:** next step is a full uninstall and clean reinstall of Android Studio itself, guided step-by-step next session (the person specifically asked to log progress here first, given the size of that undertaking, in case of a session/message-limit interruption).

**Not yet done:** get the emulator booting; start `firebase emulators:start` and Expo alongside it; write `create-profile.yaml`/`sign-in.yaml` Maestro flows; run first live test.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean after all code changes this session (firebase.ts, PasswordField.tsx, SignInScreen.tsx, app.json).
- Not yet committed as of this entry â€” see terminal commands below to save.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section, item 0, for current status)
- Full uninstall + clean reinstall of Android Studio (step-by-step guidance needed â€” this is the very next thing to do).
- After reinstall: recreate/confirm the `Pixel_10_Pro` AVD still exists (or recreate it), confirm Hypervisor Platform is still enabled, retry `emulator -avd Pixel_10_Pro`.
- Once the emulator boots cleanly: start `firebase emulators:start`, start Expo, confirm the app installs and runs on the emulator with `USE_FIREBASE_EMULATOR = true`.
- Then: write and run the actual Maestro flow files.

## ðŸ“… Session entry â€” 2026-09-01: Checkpoint A.7.9 started â€” testIDs added for Maestro, app.json package name set (IN PROGRESS, session not yet finished)

**What happened:** Picked up the previously-researched automated testing plan (Firebase Emulator Suite + Maestro, no Claude Code) and started building it. Decided to test sign-in against the local Firebase emulator rather than real Firebase, to avoid any risk to production data.

Added `testID` props to `PasswordField.tsx` (new `testID?: string` prop, forwarded to the inner `TextInput`) and to `SignInScreen.tsx` (email-input, username-input, password-input, sign-in-button) so Maestro can reliably find these elements â€” both done as full-file pastes rather than find/replace snippets, to avoid the fragility of matching exact existing text. Confirmed `CreateProfileScreen.tsx` already had all needed testIDs from earlier work â€” no changes needed there.

Discovered `app.json` had no `android.package` set at all. Explained to the person what this field is for (a permanent internal app identifier, separate from the display name, needed by Maestro/Firebase/Android) and got confirmation to use `com.cathlauron.householdfinance`. Added it.

`npx tsc --noEmit` run after all changes â€” clean.

**Not yet done, mid-session:** these changes are NOT YET COMMITTED. Still need to: confirm `firebase.ts`'s `USE_FIREBASE_EMULATOR` flag setup, check for/create `firebase.json`, install the Maestro CLI, write the actual `create-profile.yaml` and `sign-in.yaml` flow files, and run a first real test against the local emulator.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean after all changes this session so far.
- **Not yet committed or pushed** â€” changes exist only in the local working tree as of this entry.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section, item 0, for current status)
- Get `firebase.ts` and `firebase.json` contents, confirm/build the emulator toggle.
- Install Maestro CLI.
- Write and run the two flow files.
- Once a full round-trip test passes, commit everything from this session together (testID additions + app.json + any emulator/Maestro config files).

## ðŸ“… Session entry â€” Explored automated testing options (Firebase Emulator Suite, Maestro, Claude Code) â€” research only, nothing adopted or built

**What happened:** Planning-only discussion, no code touched. The person asked whether app testing (sign-in, data entry, linking, password changes, etc.) could be automated instead of manually re-tested by hand each session. Researched three tools and their real costs â€” Firebase Emulator Suite (free, no paid tier), Maestro (free for local/solo use; a $125â€“250/month Cloud tier exists but isn't needed here), and Claude Code (a separate paid product from this chat, no free tier, cheapest at $20/month Pro plan, which is the piece that would let an AI run tests and fix bugs mostly hands-off).

**Outcome:** Nothing adopted yet. Full findings recorded in ðŸ“Œ Decisions made under "AUTOMATED TESTING TOOLING â€” RESEARCHED, NOT YET ADOPTED." No files changed, `npx tsc --noEmit` not run.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section for the actual current priority, which is unchanged)
- Decide whether to start with the fully free path (Firebase Emulator Suite + Maestro flows written by Claude, run manually) or commit to Claude Code from the start.
- If/when decided, scope it as its own small checkpoint rather than folding it into existing Checkpoint A.7 or Phase B work.

## ðŸ“… Session â€” [FILL IN TODAY'S DATE]

### âœ… Done this session
- **Loan custom recurrence fixed.** customOccurrencesInMonth() (previously only living inside balanceProjection.ts) was moved into the shared recurrence.ts file and imported back into balanceProjection.ts, so there is now exactly one copy of this logic instead of two that could drift apart. getNextDueDate() in recurrence.ts gained a custom recurrence branch that scans forward up to 60 months using that shared helper. Both real call sites in LoansScreen.tsx (list sorting, and the per-loan "next due" display) were updated to actually pass each loan's own customStartDate / customFreq / customOccurrenceCount fields into getNextDueDate() â€” these live at the top level of a Loan record, not nested under dueDate, which is why the first draft of this fix silently didn't work until the wiring gap was found and fixed.
- **EF/FI calculators now surface income, safely.** SavingsScreen.tsx already auto-suggested a monthly expense baseline from model.bills. Added an equivalent computeMonthlyIncomeBaseline() that normalizes every income source's frequency (monthly/weekly/biweekly/semimonthly) to a monthly figure the same way expenses are normalized. **Important correction made mid-session:** the first draft wired this income figure to overwrite the "current savings set aside" input via a tappable suggestion row â€” this was caught in review before being applied, since it would have silently replaced someone's real savings balance with an income number. The corrected version shows income as a separate, non-interactive, read-only line ("Your income sources add up to â‚±X/mo") in both the EF and FI sections, and never writes into efSavingsInput/fiSavingsInput. The existing expense-baseline suggestion behavior (tap to fill) was left completely untouched.
- **CSV import: column mapping + duplicate detection added.** csvImport.ts and CsvImportModal.tsx previously required a CSV with exact column names (date/label/amount/optional direction) in a fixed order. Now: headers are read from the file, guessCsvColumnMapping() auto-guesses each target field from common header-name synonyms, and the person can override any column's mapping by hand via a picker modal before previewing rows. Separately, flagDuplicateRows() checks each parsed row against existing model.manualTransactions â€” a row is flagged as a likely duplicate if its date and amount match exactly and its label matches (case-insensitive exact-or-substring match). Flagged rows show a "Possible duplicate" badge and default to **excluded** from import, with a checkbox to include them anyway if it's a false positive.
- **Incidental fix:** DataContext.tsx had a variable named memberCount that shadowed/confused an unrelated scope during household unlinking â€” renamed to memberCountAfterUpdate for clarity. Pure rename, no logic change.
- Verified with npx tsc --noEmit â€” clean, no errors, both before and after every change.
- Committed and pushed: commit 2601c91, 7 files changed (537 insertions, 131 deletions): LoansScreen.tsx, recurrence.ts, balanceProjection.ts, SavingsScreen.tsx, csvImport.ts, CsvImportModal.tsx, DataContext.tsx.

### ðŸ“Œ Decisions made this session
- The Emergency Fund / FI calculators' income figure is **informational only** â€” it is never auto-written into any input field, specifically because auto-filling it into the savings-balance field was caught as incorrect during review. If a future session wants a genuine "tap to use this" income shortcut, it needs its own dedicated input field, not reuse of efSavingsInput/fiSavingsInput.
- CSV duplicate detection is intentionally loose (exact date + amount, near-exact label match) rather than fuzzy/scored, per the original ask ("doesn't need to be fancy") â€” and defaults to excluding anything flagged, requiring an explicit opt-in checkbox to import a flagged row anyway.
- This session used the Claude-reviews-Copilot's-work workflow described in these project instructions: Copilot implemented all three fixes, Claude reviewed the actual git diff output (not just Copilot's narrative summary) before approving each one, one issue (the income-overwrite bug) was caught and sent back for rework before being approved, and Copilot was only authorized to commit/push after every piece was explicitly approved.

### âš ï¸ Known issues / gotchas (new this session)
- CSV import: if a person leaves Date/Label/Amount unmapped in the column-mapping step, there's no upfront warning â€” every row will just fail individually and land in the "skipped rows" list with per-row error text. Not broken, just a less friendly failure mode than it could be. Not fixed this session; flagged as a minor future polish item if it comes up.
- Worth a quick on-device visual check (not yet done): the two new income-info lines in SavingsScreen.tsx reuse the existing styles.suggestionRow/styles.suggestionText styles, which were originally designed for a tappable TouchableOpacity row. They're now plain non-interactive Views using the same styling â€” should look fine, but hasn't been visually confirmed on a real device yet.

### ðŸ“ Files in the repo (updated)
- mobile-app/src/screens/LoansScreen.tsx â€” loan recurrence call sites now pass custom-recurrence fields
- mobile-app/src/recurrence.ts â€” now owns customOccurrencesInMonth(); getNextDueDate() gained the custom branch
- mobile-app/src/balanceProjection.ts â€” now imports the shared helper instead of defining its own copy
- mobile-app/src/screens/SavingsScreen.tsx â€” EF/FI income baseline added as a read-only display line
- mobile-app/src/csvImport.ts â€” column-mapping types/helpers (CsvColumnMapping, guessCsvColumnMapping, applyCsvMapping) and duplicate-detection helpers (looksLikeDuplicateTransaction, flagDuplicateRows) added
- mobile-app/src/screens/CsvImportModal.tsx â€” new column-mapping step UI and duplicate-flagging UI in the import preview
- mobile-app/src/DataContext.tsx â€” cosmetic variable rename, no logic change

### â–¶ï¸ Next step
Check 4-REMAINING-WORK-ROADMAP.md for the next unfinished checkpoint in Phase A/B/C. No specific next step was chosen this session â€” this session was entirely dedicated to closing the three gaps above, which were raised outside the normal phase sequence.

## ðŸ“… Session entry â€” Live two-phone testing of A.7.6a/b surfaces 4 bugs (Aâ€“D); investigated via Antigravity, fixes scoped and partly approved, none yet implemented

**What happened:** Live-tested A.7.6a/b on real devices for the first time with a proper 2-then-3-person scenario. Found four issues, investigated one at a time using the same Claude+Antigravity investigate-then-approve workflow used previously with Copilot (Antigravity now used instead, running inside VS Code with direct repo file access). Findings and approved fix plans for all four are recorded in âš ï¸ Known issues (Bugs Aâ€“D) and ðŸ“Œ Decisions made above â€” this entry is a narrative pointer only.

**Outcome, in short:** Bug A was stale test data (no fix needed, confirmed resolved by testing a fresh host/joiner pair). Bug B (cancelled invite codes stay joinable) has an approved fix plan, not yet implemented. Bug C (wrong keep/merge dialog on first join) has an approved fix plan and was recognized as literally BEING Checkpoint A.7.6b rather than a separate issue â€” the checkpoint table has been updated accordingly. Bug D (last member can't unlink) led to a bigger, explicitly-scoped design decision (household dissolve-on-empty + owner ownership-transfer UI) that reshapes and expands Checkpoint A.7.6d rather than being fixed as a narrow rules patch.

**Nothing was implemented or committed this session** â€” this was investigation + scoping only, paused deliberately to save progress before implementation begins, in case of a session/message-limit interruption.

**Files touched:** none. `npx tsc --noEmit` not run (no code changes).

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section for full current status)
- Implement Bug C's fix (isInvite flag) â€” this is the real A.7.6b work.
- Run a fresh Antigravity investigate-only scoping pass for A.7.6d's expanded scope (dissolve-on-empty + ownership-transfer UI + remove-member button) BEFORE implementing anything for it â€” this is real new feature design, not a bug fix, and deserves its own review pass before code is written.
- Bug B (cancelled code still joinable) can be implemented independently at any point â€” it doesn't block or depend on A.7.6b/d.

## ðŸ“… Session entry â€” A.7.6b and A.7.6c implemented via Antigravity investigate-then-approve workflow (this session)

**What happened:** Continued Checkpoint A.7.6, this time using GitHub Antigravity (running inside VS Code, direct repo file access) instead of Copilot for the investigate-then-approve workflow, following the same pattern established previously.

**A.7.6b:** Sent an investigation-only prompt for Bug C (wrong join-choice dialog on first-time links). Antigravity confirmed the suspected root cause exactly â€” `existingHouseholdId` was getting set on every link code once A.7.6a started pre-creating the household document on the host's device, not just on true 3rd+-person invites, breaking the UI's ability to tell the two cases apart. Reviewed and approved its plan (add an explicit `isInvite` flag, set only on the true invite path) with no changes needed. Implemented, `tsc` clean, committed and pushed (`8f1e5f7`).

**A.7.6c:** Sent an investigation-only prompt to scope the "X of 5 linked" badge + cap-blocking feature. Antigravity found that a partial version of the cap check already existed in `handleStartHouseholdInvite` (an early `householdMemberCount >= 5` check) but was using stale state rather than a fresh fetch â€” flagged this before approving so it wouldn't leave duplicate/competing logic behind. Approved the plan plus one addition (checking the cap at join time too), but Antigravity's own investigation caught that this addition wasn't actually possible as originally asked â€” Firestore's security rules block a non-member from reading household data at all, so the cap can't be checked before someone is already a member. It adapted by instead catching the `permission-denied` write rejection in `finishJoinerLink()` and translating it into a friendly message â€” a better fit for the actual security model than the original ask. Asked for one refinement (use `error.code` instead of a message-text regex where possible) before final approval; Antigravity added that with a fallback. `tsc` clean, committed and pushed (`0fdc963`).

**Decision made this session:** rather than live-testing A.7.6b and A.7.6c individually right now, testing is deferred to a single batch pass once the rest of Phase A/Checkpoint A.7 (specifically A.7.6d) is also done. Explicit tradeoff acknowledged: harder to isolate which change caused a problem if one shows up during that later batch test.

**Not yet done:** A.7.6d's investigation-only scoping prompt was written and ready to send, but the session ended before sending it / getting Antigravity's report back. That's the very next step.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean after both A.7.6b and A.7.6c changes.
- Both changes committed and pushed; confirmed via `git status`/`git diff --stat` review before each commit.
- **Not yet live-tested on real devices** â€” see decision above.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section for full current status)
- Send the A.7.6d investigation-only scoping prompt to Antigravity (already drafted, ready to paste â€” covers: owner-only remove-member button, ownership-transfer picker when the owner leaves a non-empty household, and automatic dissolve-to-personal-data when the last member leaves).
- Review the scoping report, then plan implementation as its own separate step (this is real new feature work, not a quick fix).
- Once A.7.6d is implemented, run the deferred batch live-test covering A.7.6b, A.7.6c, and A.7.6d together on real devices.

## ðŸ“… Session entry â€” Fixed TS2451 duplicate memberCount declaration in unlinkHousehold (A.7.6d cleanup)

**What happened:** After implementing A.7.6d, npx tsc --noEmit surfaced a TS2451 error â€” memberCount was declared twice with const in the same try block inside unlinkHousehold() in DataContext.tsx. Root cause: a leftover second getHouseholdMemberCount() call from an earlier draft of the dissolve-check refactor, never cleaned up once the early-exit performDissolve() branch was added above it.

Investigated and fixed via Antigravity (investigate-then-approve workflow): removed the redundant second declaration, since the member count from the first check was already valid and unchanged at that point in the function. Reviewed and approved as-is, no corrections needed.

**Verification:** npx tsc --noEmit clean, 0 errors.

**Files touched:** mobile-app/src/DataContext.tsx (removed one duplicate const memberCount = await getHouseholdMemberCount(householdId); line inside unlinkHousehold())

## ðŸ“… Session entry â€” 2026-08-29: Migrated from GitHub Codespaces to local VS Code; found and fixed root cause of stray junk files blocking git clone

**What happened:** Hit the Codespaces 60-hour/month free limit and lost access to the working environment. Moved development to VS Code running locally on Windows, cloning the same GitHub repo.

Every clone attempt onto the new machine failed partway through with `error: invalid path 't darkTheme: ThemeColors = {'` / `fatal: unable to checkout working tree`. Diagnosed as two literal files sitting in the repo with genuinely invalid Windows filenames â€” `= {` and `t darkTheme: ThemeColors = {` â€” both containing a colon, which Windows forbids in any filename. This wasn't a git or network problem; the files themselves could never be written to disk on Windows no matter how the clone was retried.

**Root cause identified:** Both junk files were created by a bash heredoc-style command (`cat > file << 'EOF' ... EOF`, the format used throughout the original Codespaces-era project instructions) being pasted into a PowerShell terminal at some point instead of a bash terminal. PowerShell has no concept of heredoc syntax â€” it instead tried to run each line of the pasted file content (which began with something like `export const darkTheme: ThemeColors = {`) as its own command, and in the process created these garbage-named files as a side effect of that misparsing.

**Fix applied:** Confirmed both files were stray artifacts (not real project files â€” verified via GitHub's own file viewer, not `less`, after an earlier attempt to inspect one via `less` in the terminal only opened the `less` help screen rather than the file, adding brief confusion). Deleted both files directly on GitHub â€” a one-time, explicitly-flagged repair action taken because the repo itself was in a broken state that blocked cloning by any normal means, not a normal workflow step. Re-cloned successfully afterward once both were gone.

**Permanent fix going forward:** Project Instructions updated to v7 â€” the "Codespaces" environment throughout is now "VS Code + PowerShell." Every file-save command Claude gives must now use a PowerShell here-string (`@' ... '@ | Set-Content -Path "filename" -Encoding UTF8`) instead of bash heredoc syntax, and `type` replaces `cat` for reading files in commands. This rule is now written directly into the custom instructions as a standing rule, not just a one-time fix, so it applies across all 20 Gmail-account conversations going forward.

**Verification:** Fresh clone completed successfully on the new machine after the junk files were removed; `git status` showed a clean, up-to-date tree; `type PROGRESS1.md` printed this file's real content correctly.

**Not yet done as of this entry:** `npm install` inside `mobile-app/` and a first `npx expo start --tunnel` on the new machine, to confirm the app actually runs locally end-to-end from this fresh environment â€” planned as the very next step.

ðŸ§¹ Code health
- No app code changed this session â€” this was entirely an environment/tooling fix, not a feature or bug-fix session.
- Repo itself is now clean and clonable; confirmed via a fresh `git clone` + `git status` + `type PROGRESS1.md` on the new machine.

â–¶ï¸ Next step (this entry only â€” see the top-of-file â–¶ï¸ Next step section for the actual current priority, which is unchanged: Checkpoint A.7.6b)
- Run `npm install` inside `mobile-app/` and `npx expo start --tunnel` to confirm the app runs correctly from the new local VS Code environment before resuming feature work.
- Once confirmed working, resume at Checkpoint A.7.6b per the â–¶ï¸ Next step section above â€” nothing about the actual project roadmap changed this session, only the tooling used to work on it.

## ðŸ“… Session entry â€” A.7.2: eye icon on password fields

**What was done:** Built one shared PasswordField.tsx component (Ionicons show/hide toggle) and wired it into all 6 real password fields across SignInScreen.tsx, CreateProfileScreen.tsx, and SettingsScreen.tsx. PIN screens intentionally excluded. Along the way discovered @expo/vector-icons wasn't actually installed despite being a standard Expo default â€” installed via npx expo install @expo/vector-icons to match SDK 54.

## Session â€” 2026-08-29: A.7.3 (faster sign-in) completed â€” profiled, fixed duplicate decrypt, session-cache idea explicitly deferred

**What was done:** Used the Claude+Copilot investigate-then-approve workflow. Copilot traced the full sign-in flow (SignInScreen.tsx â†’ authFirebase.ts â†’ DataContext.tsx â†’ App.tsx) and found the real bottleneck-adjacent issue: the app validates the password by decrypting profile/household data during sign-in, then DataContext.loadModel() immediately re-fetches and re-decrypts the exact same data â€” genuine duplicate work, separate from the intentional PBKDF2 cost.

**Approved and implemented (PBKDF2 iteration count/algorithm explicitly left untouched):**
- SignInScreen.tsx: each sign-in branch (legacy migration, cloud-restore, linked-profile, unlinked-profile) now keeps its already-validated derived key, decrypted model, profile entry, and household key, passing this through onSignedIn(...) as a "bootstrap" payload instead of forcing a second fetch+decrypt.
- DataContext.tsx: loadModel() now accepts this bootstrap payload and reuses it when present, instead of re-reading the profiles index and re-decrypting from scratch.
- App.tsx: onSignedIn callback now passes deferNotifications: true, so rescheduleBillNotifications() runs after the UI has already transitioned to the home screen rather than blocking sign-in.

**Explicitly NOT implemented:** a session-level cache of the derived key/profile metadata across app restarts. Discussed in a dedicated follow-up conversation about the security tradeoff (a cached key surviving a full sign-out would weaken the "nothing useful on disk without the real passphrase" property). Decision: not pursued â€” the person confirmed their actual day-to-day friction is background/foreground re-entry, which the existing PIN quick-unlock feature already handles; the slow path they were testing was specifically cold/fresh sign-in, and once the PBKDF2 tradeoff was explained, the person confirmed they're satisfied leaving that as intentional cost.

**Verification:** `npx tsc --noEmit` clean. Tested on-device across all three sign-in paths (normal, cloud-restore, and linked-profile) â€” confirmed no data missing or incorrect in any case. Perceived sign-in speed described as "felt about the same" â€” expected, since the eliminated duplicate work was a smaller share of total time than the PBKDF2 step itself, which was intentionally left unchanged.

**Files touched:** SignInScreen.tsx, DataContext.tsx, App.tsx

## Session â€” 2026-08-29: Fixed stale local profile entry blocking cloud-restore on linked accounts

**What happened:** A user testing sign-in on a new device for an already-linked account ("cas", linked to "cath") found the account showed as unlinked after cloud-restore sign-in, and data logged on that device wasn't syncing to the other linked device. Signing out and back in did not fix it.

**Root cause (confirmed via targeted debug logging):** The linked cloud-restore branch in SignInScreen.tsx was actually correct â€” it properly pulls householdId and the household key from Firestore and builds a correctly-linked local profile entry. The real bug was elsewhere: `saveProfilesIndex([...profiles, newEntry])` appended the new entry rather than replacing any existing one for that username. During this debugging session, an earlier sign-in attempt on the new device had created a local entry with no householdId. Every subsequent sign-in attempt then found that already-existing local entry first and took the "local profile exists" branch â€” skipping cloud-restore entirely â€” so it never self-corrected, even across sign-out/sign-in.

**Fix applied:** Cloud-restore save logic in SignInScreen.tsx (both linked and unlinked branches) now filters out any existing local entry for the same username before saving the fresh one:

  const updatedProfiles = [...profiles.filter((p) => p.username !== username), newEntry];
  await saveProfilesIndex(updatedProfiles);

This makes cloud-restore self-healing â€” even if a device has a stale/broken local profile entry for a username, a successful cloud-restore now always overwrites it with correct data instead of silently being blocked forever.

**Verification:** Debug logging confirmed cloudBackup.householdId and the full linked payload were correctly assembled on a fresh attempt once the stale entry was cleared. After the permanent fix, tested on two different devices signing in as two different linked accounts (cas and cath) â€” confirmed linked status displayed correctly and test data synced across all devices. All temporary debug logging and the temporary dev-only "clear stale entry" button were removed after the fix was confirmed. npx tsc --noEmit passes clean.

**Files touched:** SignInScreen.tsx (linked and unlinked cloud-restore save logic; temporary debug code added then fully removed)

## ðŸ“… Session entry â€” A.7.1 re-tested and confirmed fixed

**What was done:** Re-tested change-password on a linked profile per the person's report that it now worked. Confirmed: host changed password, signed out fully, signed back in successfully with the new password; joiner phone still signs in normally with its own unchanged password. No code changes made this session â€” the earlier both-branch `DataContext.tsx` patch is now confirmed to have resolved this.

â–¶ï¸ Next step
- A.7.5 is done. Next open item in Checkpoint A.7 is **A.7.6 (allow up to 5 linked accounts)** â€” the biggest remaining lift in this checkpoint, since it changes linking from pairwise into "join a household," touching Firestore rules, the merge/keep-mine/keep-theirs UI, and the core linking flow itself.

## ðŸ“… Session entry â€” 2026-08-29: A.7.5 (60-second regeneration cooldown) completed, plus two on-device UX bugs found and fixed

**What was done:** Used the Claude+Copilot investigate-then-approve workflow, in three rounds.

**Round 1 â€” initial implementation.** Copilot added a second, independent timer (separate from the A.7.4 expiry timer): `cooldownActive`/`cooldownSeconds` state, a `linkCooldownTimerRef` + `clearLinkCooldownTimer()` helper, and `beginLinkCooldown()` which starts a 60-second `setInterval`-based countdown (ticking once per second, not a single 60-second timeout) the moment a new code is generated. Two corrections were made before approving the plan: (1) the countdown needed to tick every second via `setInterval`, not fire once at the end; (2) the cooldown must NOT be cleared when a link code expires â€” it needs to keep counting down regardless, otherwise someone could bypass it just by waiting for expiry. Both were incorporated before implementation. A first pass also duplicated the countdown text (once inside the button label, once in a separate hint line) â€” fixed to show only in the hint line, with the button showing simple static text while disabled.

**Round 2 â€” on-device bug found: cooldown UI attached to the wrong branch.** On-device testing (screenshot review) found the disabled button + countdown were added to the "Start linking (get a code)" button, which only exists in the screen state BEFORE any code has been generated â€” a state that becomes unreachable the instant a code exists, since the screen switches to a different view ("Give this code to the other phone" / code display / "Waiting for the other phone to finishâ€¦" / "Code expired? Start over with a new code"). The only real path to generating a second code is the "Start over" link in that second view, which had no cooldown protection or visible countdown at all. Fixed by moving the disabled state, greyed styling, and countdown text to the "Start over" link instead, leaving the underlying timer logic (`beginLinkCooldown`, `clearLinkCooldownTimer`, the interval, unmount cleanup) completely untouched.

**Round 3 â€” "feels slow" report investigated, not chased as a performance bug.** Person reported code generation feeling slow (up to ~a minute, by impression). Investigated before changing anything: confirmed `handleStartLinking` already sets `linkBusy` and shows a spinner immediately (no missing feedback at the code level); traced `startHouseholdLink` in `linking.ts` and found no artificial delay, retry loop, or debounce anywhere in the path â€” the real cost is PBKDF2 (100,000 iterations, intentional security cost, not weakened), encrypting the full household model, and a Firestore write, all done sequentially. Asked the person directly whether the delay was actually measured (it wasn't â€” a rough impression) and whether their connection was solid during testing (it was) â€” concluded this was very likely "a blank spinner reads as longer than it is," not a real regression, and deliberately did NOT touch PBKDF2 iteration count or try to restructure the encryption/Firestore sequence for a cosmetic gain. Fixed by adding a short "Generating your secure codeâ€¦" text next to the existing spinner on the initial button, using the same `hintText` style already used elsewhere on this screen.

**Verification:** `npx tsc --noEmit` clean after each round. Full 5-step on-device test performed after the final commit: (1) tapping "Start linking" shows the spinner + "Generating your secure codeâ€¦" text, (2) once a code appears, "Start over" is greyed out and shows a live "Generate a new code in Xs" countdown ticking down once per second, (3) at 0 seconds "Start over" re-enables and the countdown text disappears, (4) tapping "Start over" generates a new code and correctly restarts the 60-second cooldown on the same link, (5) leaving the Settings screen mid-cooldown and returning does not crash. All 5 passed.

**Files touched:** SettingsScreen.tsx (all three rounds)

### **Commits:** (cooldown implementation â€” see git log for exact hash), followed by `fix: move cooldown UI to Start Over button; add reassuring text during code generation (A.7.5)`

## ðŸ“… Session entry â€” 2026-08-29: A.7.4 (expired link code auto-clears) completed, plus bundled fix for stale status message

**What was done:** Used the Claude+Copilot investigate-then-approve workflow. Copilot traced the host-side link code flow (SettingsScreen.tsx, linking.ts, firestore.rules) and confirmed: the code expires via a 15-minute Firestore rule TTL, but the UI had no local timer and no handling for the expired case â€” only a listener for when a joiner successfully finishes linking. An expired code was previously left sitting on screen indefinitely.

**Implemented:**

- linking.ts: added exported `LINK_CODE_TTL_MS` constant (15 min, commented to stay in sync with firestore.rules), and extended `subscribeToLinkCode()` with an optional `onExpired` callback fired on a permission-denied read (the expired-code signal).
- SettingsScreen.tsx: added a local expiry timer started when a code is generated, cleared on reset/success/unmount, firing a new `handleLinkCodeExpired()` handler that clears the code and shows "This code expired â€” generate a new one."

**Bundled fix (found during on-device testing, not part of the original A.7.4 description):** `hostFinishMsg` (the "Linked! Loading your shared dataâ€¦" / error status text) was never cleared when a new code was generated â€” only on manual "Start over." This let a stale success/error message linger next to a freshly generated code's status. Fixed by clearing `hostFinishMsg` in both `handleStartLinking()` and the new `handleLinkCodeExpired()`.

**Verification:** `npx tsc --noEmit` clean after each change. On-device testing (with a temporarily shortened TTL for practicality, reverted before final commit) confirmed all three scenarios: (1) an expired code auto-clears with the correct message, (2) normal linking between two devices still completes successfully with no leftover message, (3) tapping "Start over" before expiry correctly cancels the old timer so it doesn't wipe out the new code later.

**Files touched:** linking.ts, SettingsScreen.tsx

### **Commits:** 3af2d9c (expiry timer), cf10deb (stale hostFinishMsg fix)

## ðŸ“… Session entry â€” Expo Go SDK mismatch fix + duplicate-bill-ID / stale-listener bug fixes via Claude+Copilot workflow (this session)

**What happened:** Session started with a "Project is incompatible with this version of Expo Go" fatal error on Phone A after Expo Go had been uninstalled/reinstalled. Diagnosed as an SDK mismatch: the project was on Expo SDK 57, but Phone A's Expo Go (freshly reinstalled from Play Store) only supported up to SDK 54 â€” not an old-phone issue (phone was on Android 16), just Expo Go's Play Store rollout not having caught up to SDK 57 yet. Fixed by running `npx expo install expo@^54.0.0`, confirmed via `npx expo install --check` that all other packages already matched. App opened successfully after this.

Person then successfully signed into Phone A (triggering the new-device cloud-restore path), then went to Phone B, unlinked it, and relinked Phone A + Phone B together. This surfaced two live errors: a duplicate-key React warning on the Bills screen, and a "Missing or insufficient permissions" Firestore error from `subscribeToLinkCode`.

Rather than pasting full file contents back and forth, trialed a new workflow: Claude wrote an investigation-only prompt for GitHub Copilot (explicitly told not to edit anything yet); Copilot investigated and returned a full root-cause analysis + fix plan; Claude reviewed the plan, approved both fixes, and added one correction (make the duplicate-ID fix apply to every merged list, not just bills â€” mergeModels.ts merges debts, loans, savings goals, and more); person sent Copilot a final go-ahead prompt with that addition; Copilot implemented the fix across 4 files and confirmed `npx tsc --noEmit` passed. Claude then reviewed `git status`/`git diff --stat` before allowing a live test, catching that `package.json`/`package-lock.json` also showed as changed â€” traced this to the earlier, still-uncommitted SDK 54 downgrade from earlier in the same session, not anything Copilot did; confirmed harmless.

Live-tested: full unlink â†’ relink cycle on both phones, back to back. No duplicate-key warning, no permissions error.

**Outcome:** Expo Go SDK mismatch resolved. Both live bugs found during A.5/A.6-era testing confirmed fixed via real two-phone test. Claude+Copilot collaborative workflow adopted as the standing process for future bug fixes (see ðŸ“Œ Decisions made).

**Not yet committed:** all of this session's changes (SDK downgrade + both bug fixes) are still sitting uncommitted as of this write-up â€” see commit commands below.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean (confirmed by Copilot before handing back).
- Live-tested on two real devices: confirmed working, no errors.
- Not yet committed/pushed as of this entry â€” see below.

## ðŸ“… Session entry â€” Planning session: cloud storage, real-time linking fix, multi-device sign-in, feature scope, UI/UX direction

**What was done:** No code changed this session â€” this was a planning-only session covering five topics raised by the person, working from both PROGRESS.md and PROGRESS1.md as the source of what's already built vs. outstanding.

1. **Cloud storage / faster sign-in / login-on-a-new-device.** Confirmed Firebase/Firestore is already the right tool and doesn't need replacing. Identified that the actual missing piece is Checkpoint A.5's scope needing to expand â€” the existing A.5 entry only covers migrating an existing LOCAL profile to Firebase Auth, not signing in on a device with zero local data. Reopened A.5 with the correct, larger scope: Auth succeeds â†’ no local data â†’ pull `profileBackups/{username}` from Firestore â†’ decrypt with the entered passphrase.

2. **Household linking deadlock.** The person correctly self-diagnosed the bug as a structural two-sided-waiting problem, not a random intermittent bug. Confirmed this diagnosis and proposed replacing the manual "finish linking" button flow with Firestore real-time listeners (`onSnapshot`) on both phones, watching the same `linkCodes/{code}` document â€” whichever side finishes second automatically completes the other side. Scoped as new Checkpoint A.6, explicitly replacing (not debugging) the old flow.

3. **Cloud Functions vs. staying on Spark.** Explained the real tradeoff: a Cloud-Function-based atomic version of linking closes a narrow edge case (half-finished link on a mid-sequence disconnect) and tightens write permissions, but requires the Blaze plan (still free at this app's scale, but requires a card on file). The person chose to stay on Spark. Real-time listeners (A.6) were confirmed sufficient to fix the actual deadlock bug being hit; the Cloud-Function approach is deferred, not rejected outright, for later reconsideration if a real need arises.

4. **Multi-device sign-in ("see and sign out other devices," like a social app).** Design scoped (a `sessions/{uid}/devices/{deviceId}` collection with a `revoked` flag, checked/listened to on each device, with a Settings UI to list/revoke) but explicitly PARKED by the person's own choice until A.5 and A.6 are both confirmed stable on real devices.

5. **"Frontend shouldn't touch the database directly" / row-level security.** Clarified that Firestore Security Rules already ARE the row-level security layer (same concept as Postgres RLS), and that client-side encryption before anything reaches Firestore means even a rules failure would only expose ciphertext. Recommended keeping direct client-to-Firestore access for all routine data, reserving a server-side layer only for household linking specifically (the one place two users' data touches mid-operation) â€” and even that was deferred per the Spark-plan decision in point 3.

6. **Essential vs. additional feature split.** Went through every existing tab/screen and split them into "essential" (core see/plan/track-your-money loop: Sign-in/Security, Accounts, Calendar, To-Pay, Transactions, Income, Savings/EF/FI, Dashboard, core Settings) vs. "additional" (Groceries/Travel/Events/Goals, deep Reports, Shared Expense ledger, CSV import, Payment-method breakdown). Confirmed by the person as the priority order for Phase B polish.

7. **Apple Wallet-inspired Accounts redesign.** Scoped as colored/card-shaped individual accounts, a stacked/fanned card view, and an "Add account" bottom sheet â€” not the physical-card-scanning part of Wallet, which isn't relevant here.

8. **Standard mobile app screens gap-check.** Confirmed Login, Home, and Settings already exist; identified genuine gaps (Splash/Intro, Onboarding, a standalone Profile screen split out of Settings); confirmed Subscription screen is not applicable (not a monetized app) and explicitly skipped.

9. **UI/UX psychology.** Mapped each principle the person listed (Hick's Law, Fitts's Law, Gestalt, cognitive load/progressive disclosure, color psychology) to a concrete, specific application in this app rather than leaving it abstract, and folded "cards + bottom sheets as the default interaction pattern" in as the vehicle for most of these (particularly Fitts's Law and progressive disclosure). Screenshot inspiration (Nexora fintech app, Monzo, various UI kit references) reviewed as visual reference for the card/bottom-sheet/stat-summary direction, filtered through these psychology principles rather than copied directly.

10. **Publishing.** Confirmed Phase C (EAS Build, optional store publishing) is unchanged from the existing roadmap â€” no new decisions needed there.

**Full detail on all of the above is recorded in the ðŸ“Œ Decisions made and â–¶ï¸ Next step sections above** â€” this session entry is a narrative summary, not the source of truth; the Tier 1 sections are.

## ðŸ“… Session entry â€” Password-sync bug fix applied + linked-account regression found (this session)

**What was done:** Applied the previously-drafted `changePassword` patch (Firebase `reauthenticateWithCredential` + `updatePassword`, alongside the existing local rewrap) to BOTH code paths in `src/DataContext.tsx` â€” the linked-household branch and the unlinked-profile branch â€” closing the gap where only one path had been patched in a prior session. Confirmed via `git --no-pager diff` that both insertions landed correctly. `npx tsc --noEmit` ran clean. Committed and pushed successfully.

Real-device testing then found: the unlinked-profile fix works correctly end-to-end (change password â†’ sign out â†’ sign in with new password succeeds). The linked-profile fix does NOT â€” host changes password, gets a false success message, then is locked out on next sign-in; the joiner is unaffected. This is now logged as a confirmed, reproduced bug (A.7.1), not a hypothesis â€” see âš ï¸ Known issues and the A.7.1 row in â–¶ï¸ Next step above for full detail.

No further code changes were made this session past this point â€” the person asked to log these findings first before continuing, so the next session should pick up directly on re-diagnosing the linked-branch Firebase call.

ðŸ§¹ Code health
- `npx tsc --noEmit`: clean, no errors (checked before this session's real-device testing).
- Committed + pushed this session's `DataContext.tsx` changes (both-branch password-sync fix) â€” confirmed via `git status` showing a clean, up-to-date tree afterward.

## ðŸ“… Session entry â€” Checkpoint A.7 scoping + Phase B expansion (this session)

**What was done:** No code changed this session â€” another planning-only session, this time closing out the remaining auth/linking/security loose ends into a formal Checkpoint A.7 (sequenced before Phase B), and folding several newly-requested items (onboarding security-step research, a reusable date-picker component, and a batch of Simplifi/Monarch/Rocket Money-inspired features) into the Phase B checkpoint table. Three items (receipt OCR, an in-app AI assistant, guest/read-only household access) were explicitly parked rather than scheduled, each pending its own dedicated decision session. Full detail recorded directly in the ðŸ“Œ Decisions made, âš ï¸ Known issues, and â–¶ï¸ Next step sections above â€” this entry is a narrative pointer, not the source of truth.

ðŸ§¹ Code health
- No files changed this session (or the prior planning session). `npx tsc --noEmit` not run (nothing to check).

ðŸ“Œ Decisions made
- See the "PLANNING SESSION DECISIONS" and "CHECKPOINT A.7 PLANNING" blocks within the main ðŸ“Œ Decisions made section above â€” all decisions from these sessions are recorded there, not duplicated here.

- **A.7.6 scoping decision revised this session: when a 3rd/4th/5th person joins an existing household (2+ members already), they get two choices instead of the original flow's three â€” "Keep household data" (discard their own local data, adopt the household's) or "Merge mine in" (combine their local data into the household). The original "Keep mine" option (wipe the household's existing shared data with just the new joiner's data) is intentionally NOT offered for existing households â€” it's judged too destructive to other members' data to be one tap away for a brand-new joiner. The original 2-person flow (a fresh household with no prior members) keeps all three choices (Keep mine / Keep theirs / Merge), since there's no other member's data at risk yet. (2) An owner/admin role is being added to households â€” the person who started the household can remove other members; everyone else keeps today's "can only remove themselves" ability as a fallback. This is a new capability, not previously in the data model.
- **A.7.6 broken into four sub-steps, to be done in order:** A.7.6a (data model â€” Firestore rules capped at 5 members, add owner field to household doc, rules updated so owner can remove anyone, non-owners still self-remove only) â†’ A.7.6b (extend the join flow + keep-mine/keep-theirs/merge choice to work when a household already has 2+ members, not just the original pairwise case) â†’ A.7.6c (UI showing "X of 5 linked" and blocking/explaining once the cap is hit) â†’ A.7.6d (owner-only UI to view/remove members â€” overlaps with A.7.7, likely built together as one roster screen with remove buttons that only render for the owner). A.7.6a is the starting point since everything else depends on the data model/rules being correct first.

â–¶ï¸ Next step
- Checkpoint A.5 (new-device sign-in via cloud backup decrypt) and Checkpoint A.6 (real-time listeners for household linking) are BOTH CONFIRMED DONE - verified by direct code inspection of `SignInScreen.tsx` and `linking.ts`/`SettingsScreen.tsx`. A.6 still needs a real two-phone live test to fully close it out. Start the next working session on Checkpoint A.7 (auth/linking/security loose ends) â€” see â–¶ï¸ Next step at the top of this file for full detail.


## ðŸ“… Session entry â€” A.7.0 investigated and resolved (false alarm) + new auto-lock timer setting added

**What was done:** Started Checkpoint A.7.0 (PIN quick-unlock regression). Before touching code, confirmed with the person exactly how it was failing â€” turned out their test accounts simply didn't have a PIN set up, so there was nothing actually broken. Since the person also wanted an adjustable auto-lock idle timer, and `autoLock.ts` already had unused `getAutoLockMinutes`/`setAutoLockMinutes` functions with no UI wired to them, built that instead: a small pub-sub added to `autoLock.ts` so a change takes effect live, `App.tsx` subscribing to it, and a new "Auto-lock" section in Settings (styled to match the existing Light/Dark/System picker). Verified on-device: PIN lock works correctly once a PIN is actually set, and the new auto-lock options correctly change how long the app waits before locking.

ðŸ§¹ Code health
- Not run this session (small, low-risk UI + pub-sub addition; verified via on-device test instead).
- Committed + pushed this session's changes to `autoLock.ts`, `App.tsx`, and `SettingsScreen.tsx`.

â–¶ï¸ Next step
- **âš ï¸ SUPERSEDED â€” leftover from an earlier session, kept for history only.** A.7.1 was completed and re-confirmed fixed in later sessions (see âœ… Done section). A.7.6 is the actual next open item â€” see the â–¶ï¸ Next step section at the top of this file for the current, accurate status.
- A.7.0 is done. Next open item in Checkpoint A.7 is **A.7.1 (change password broken after linking)** â€” still confirmed broken on the linked-profile path only (see âš ï¸ Known issues for full detail); needs `DataContext.tsx`'s linked-profile `changePassword` branch re-read top to bottom before changing anything.

## 📅 Session entry — 2026-09-01 (cont'd 5): Root cause of auth/network-request-failed found and fixed; create-profile flow confirmed working end-to-end against the local Firebase emulator

**What happened:** Picked up right where the last session left off, mid-way through Checkpoint A.7.9. The account-creation flow was failing with `auth/network-request-failed` — a pure connection failure, not a wrong-password/email-taken error.

Diagnosed step by step: confirmed a second terminal WAS running `firebase emulators:start`, but its startup output showed `Starting emulators: firestore` only — no Auth emulator at all. Found the cause: this repo has two separate `firebase.json` files, one at the repo root (with a full `"emulators"` block listing Auth on 9099 and Firestore on 8080) and one inside `mobile-app/` (only a Firestore rules path, no emulator config at all). The Firebase CLI only reads whichever `firebase.json` is in the current working directory — it does not merge the two. The emulator had been started from inside `mobile-app/` both times, which is why Auth never came up.

**Fix:** stopped the emulator, restarted it from the repo root instead. Startup output confirmed both Authentication (127.0.0.1:9099) and Firestore (127.0.0.1:8080) came up correctly this time.

Re-ran `maestro test flows\create-profile.yaml` — hit one more path mistake first (`flows` folder lives inside `mobile-app/`, but the terminal was sitting at repo root after the earlier `cd ..`) — fixed by `cd mobile-app` before running Maestro. Once run from the correct folder, Maestro made it through the full flow, including the previously-failing final button tap. One run needed a manual tap on the Create Profile button because Maestro's automation got stuck with the on-screen keyboard still covering a field — worked fine once done manually.

**Confirmed via screenshot:** the app landed on the real home screen reading "You're signed in, testuser!" — proving the Firebase account was genuinely created against the local emulator and the app's own post-signup flow completed correctly. The only "failure" Maestro reported was its `assertVisible: "Welcome"` check warning (not failing) because the app's real text says "You're signed in," not "Welcome" — a mismatched assertion, not an app bug.

**Not yet done:** writing/running `sign-in.yaml` to confirm the sign-in path also works against the emulator; removing any temporary debug logging left in `CreateProfileScreen.tsx` from earlier sessions; setting `USE_FIREBASE_EMULATOR` back to `false` once testing wraps up.

🧹 Code health
- No app code changed this session — this was entirely infrastructure/working-directory troubleshooting.
- `npx tsc --noEmit` not re-run (no code touched).

▶️ Next step (this entry only — see the top-of-file ▶️ Next step section, item 0, for current status)
- Write and run `sign-in.yaml` (same test account) from inside `mobile-app/`, with the Firebase emulator running from the repo root, to confirm sign-in also works end-to-end.
- Consider updating `create-profile.yaml`'s final assertion from `"Welcome"` to `"You're signed in"` so it actually reflects your app's real success screen instead of always warning.
- Once both flows are clean, remove temporary debug logging from `CreateProfileScreen.tsx`, set `USE_FIREBASE_EMULATOR` back to `false` in `firebase.ts`, and commit everything from this and the prior A.7.9 sessions together.
