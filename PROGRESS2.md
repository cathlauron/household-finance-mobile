Household Finance Mobile App — Progress Log (Phase B: UI/UX Polish → Phase C: Publishing)

This file tracks Phase B and Phase C only. Phase A (Firebase Auth, household linking,
account recovery, multi-device active sessions) is fully complete — see PROGRESS1.md,
which is now closed and kept only as a historical record. PROGRESS.md covers the
original 11 phases before that. Nothing from either file is repeated here.

✅ Done
- **Pre-Phase-B code-health/security audit — COMPLETE (investigation only, zero code changed).** Full report-only pass via Antigravity across bugs, dead code, security rules, config, and feature-gap suggestions. Found 5 real bugs (2 high-priority: silent household data overwrite risk, and a solo password-change that silently breaks the Secret Recovery Key), 4 security findings (2 high-priority: a brute-forceable peer-recovery PIN doc that's never deleted, and a missing ownership check letting any user overwrite anyone's cloud backup), 4 unused-import/variable cleanup items, 5 leftover debug logs, and 3 config inconsistencies (app.json dark-mode setting, missing notifications plugin, a deprecated notification trigger format). `npx tsc --noEmit` clean. Full finding-by-finding detail in ⚠️ Known issues below. Triaged into 3 approval tiers.
- **Tier 1 audit fixes — VERIFIED COMPLETE (all 4 items confirmed against real code, not just commit messages).** See ⚠️ Known issues below for full detail, including a regression that was caught during verification and fixed.

📌 Decisions made
- **Carried forward from PROGRESS1.md — still active going forward:**
  - Essential vs. additional feature split (Phase B priority order): Essential = 
    Sign-in/Security, Accounts, Calendar, Bills/Debts/Loans, Transactions, Income, 
    Savings + EF/FI calculators, Dashboard, Settings. Additional = Groceries, Travel, 
    Events, Year-End Goals, deep Reports pages, Shared Expense ledger, CSV import, 
    Payment-method breakdown.
  - Cards + bottom sheets are the default add/edit interaction pattern app-wide, 
    replacing full-screen navigation pushes for single-record add/edit flows.
  - UI/UX psychology pass (Hick's Law, Fitts's Law, Gestalt/proximity, Miller's Law, 
    progressive disclosure, color psychology, trust markers, Picture Superiority Effect, 
    persistent progress indicators, Jakob's Law) applied throughout Phase B rather than 
    as a separate rebuild.
  - Four items explicitly parked, pending a dedicated decision session: Receipt OCR, 
    an in-app AI assistant, Guest/read-only household access, and an Android home-screen 
    widget/app-shortcut for quick-logging (requires migrating off Expo Go to a custom 
    EAS development build — deliberately deferred to Phase C's C.1 EAS Build step, 
    since that migration is already required there).
  - Standing workflow rules still in effect: always retrieve/view exact current file 
    contents before writing code; confirm design decisions before writing code, review 
    before committing; PowerShell here-strings only, never bash heredoc; insist on real 
    command output/diffs from Antigravity, not summaries; close/Save All open VS Code 
    tabs before any session involving file edits (see PROGRESS1.md for the incident 
    this prevents); report-only-first workflow for any full-codebase audit.
- **New this session:** After any Antigravity-reported "fix implemented" claim, 
  independently re-verify against real code before trusting it as done — a prior 
  session's Tier 1 completion claim turned out to have one item silently reverted by 
  an unrelated routine commit. Verification is now standard practice, not a one-off.

⚠️ Known issues / gotchas
- **Pre-Phase-B audit findings — TIER 1 FULLY VERIFIED & COMPLETE. Tiers 2 and 3 still open.**

  **TIER 1 — ✅ FIXED, DEPLOYED, AND INDEPENDENTLY VERIFIED against real code:**
  - **[Bug] No live sync for a shared household's financial data.** Fixed in `household.ts`/`DataContext.tsx` — `subscribeToHousehold` now delivers `data`/`updatedAt`, and `DataContext.tsx` tracks its own last-written payload (`lastEncryptedDataRef`) to tell its own writes apart from a household-mate's remote change. **Verified against live code** — real listener/ref code confirmed present and correct.
  - **[Bug] Solo password change silently breaks the Secret Recovery Key.** `changePassword()` deletes the stale `recoveryKeys/{username}` doc via `deleteRecoveryKey()` (recovery.ts) — confirmed working. **The Settings > Security "Needs regenerating"/"Active" badge UI was accidentally reverted by a later unrelated commit** (`91df290`, a routine "session checkpoint" commit that picked up a stale unsaved VS Code tab) — this was caught during independent verification, not assumed. **Re-fixed and re-verified in commit `8821ff3`**: badge UI restored, `hasRecoveryKeySetUp` import and `hasRecoveryKey` state re-wired, optimistic state updates added (flips to "Needs regenerating" immediately on password change, flips to "Active" immediately on generating a new key). `npx tsc --noEmit` clean. Pushed and confirmed on `main`.
  - **[Security] Peer-recovery's ephemeral transfer document is never deleted.** Fixed — `SignInScreen.tsx` calls `deletePeerRecoveryRequest()` immediately after successful decryption, removing `householdRecovery/{requestId}` from Firestore. **Verified against live code.**
  - **[Security] `profileBackups/{username}` has no ownership check on writes.** Fixed — `cloudBackup.ts` stamps `ownerUid` on every save; `firestore.rules` requires `ownerUid == request.auth.uid` on create/update/delete. **Verified against live code AND confirmed actually deployed** (not just committed) via `firebase deploy --only firestore:rules` output and Firebase console rules history.

  **How Tier 1 was originally fixed (commit `03df99b`):** Live sync: `subscribeToHousehold` in `household.ts` now also delivers `data`/`updatedAt`. `DataContext.tsx` tracks the last encrypted payload it wrote itself so it can tell its own writes apart from a household-mate's remote change, and only reloads/redecrypts on genuine remote updates. Stale recovery key: `changePassword()` deletes the old `recoveryKeys/{username}` doc (via `deleteRecoveryKey()`) on a solo password change, since it can't be re-wrapped without the original recovery code; Settings > Security shows a status badge (via `hasRecoveryKeySetUp()`). Peer-recovery PIN doc: `SignInScreen.tsx` calls `deletePeerRecoveryRequest()` immediately after a successful transfer. `profileBackups` ownership: `cloudBackup.ts` stamps `ownerUid` on every save; `firestore.rules` enforces it. Deployed via `firebase deploy --only firestore:rules` — confirmed live.

  **Regression + fix (this session):** The Settings badge from `03df99b` was silently lost in the very next commit (`91df290`, an unrelated routine checkpoint) because `SettingsScreen.tsx` had unsaved changes open in a VS Code tab at commit time — exactly the failure mode PROGRESS1.md already warned about. Caught by independently re-verifying each Tier 1 claim against real code (via a dedicated Antigravity investigation prompt) rather than trusting the original "implemented & deployed" note at face value. Re-applied in commit `8821ff3`, reviewed, `npx tsc --noEmit` clean, pushed. A `git fatal: .git/index: index file smaller than expected` error appeared mid-session (likely from an interrupted git operation) — resolved by deleting and rebuilding the local index (`Remove-Item .git\index` + `git reset`); this only affects git's local staging bookkeeping, not commit history or file contents, and did not require any further action once resolved.

  **TIER 2 — fix now, lower urgency (approve after Tier 1):**
  - **[Bug] `saveModel`'s Firestore write isn't wrapped in try/catch.** If offline/network drops mid-save, the UI already shows the edit (local React state updated first) but it was never actually written to disk or Firestore — silently lost on app restart/lock.
  - **[Bug] A failed `saveRecoveryKey()` during profile creation can strand a username as permanently "taken."** Firebase account + local profile already exist by that point; if recovery-key save fails, the person can't retry with the same username.
  - **[Security] Any authenticated user can delete or overwrite another user's in-flight `linkCodes/{code}`** if they guess/iterate the 6-character code. Fix: record `hostUid` and require a match.
  - **[Security] Household `update` rule lacks a type check** that `create` already has (`data is string`, `updatedAt is number`) — a buggy client could write a corrupted payload.
  - **[Config] `app.json`'s `userInterfaceStyle` is set to `"light"`**, which can suppress the app's own dark-mode/device-theme listener in a real (non-Expo-Go) build. Should be `"automatic"`.
  - **[Config] Missing `expo-notifications` config plugin in `app.json`** — needed for Android 13+ notification permissions in a standalone build.
  - **[Config] Deprecated date-trigger format used in `pushNotifications.ts`** (`trigger: alertDate as any`) — should use the newer `{ type: SchedulableTriggerInputTypes.DATE, date: ... }` shape.

  **TIER 3 — cleanup only (no functional risk):**
  - **[Bug, low] Cancelled/expired link codes leave an orphaned `households/{householdId}` doc behind** (1-member household nobody ever joined) — Firestore clutter, not a data-loss or security issue.
  - 4 unused imports/variables: `onClearRemoteRevokeNotice` (SignInScreen — wired but never called), `getHouseholdOwner` (SettingsScreen import), `formatPeso` (GoalsScreen import), a duplicate `debtFees` calc (TaxSummaryReport).
  - 5 leftover debug `console.error` logs: 3 in `CreateProfileScreen.tsx`, 1 in `linking.ts` (bracketed `[FAILED TO CANCEL...]` format), plus the ones already known from PROGRESS1.md's earlier audit round.

  **Feature ideas surfaced by the audit (not bugs — for Phase B consideration, not yet scheduled):** a "Sign out all other devices" button in Active Devices; wiring up the already-present-but-unused `onClearRemoteRevokeNotice` to dismiss the revoke banner; pull-to-refresh on Dashboard/Bills/Transactions as a manual sync option (this would help make Tier 1's live-sync gap less painful even after it's fixed).

- **Carried forward from PROGRESS1.md — still relevant:**
  - Watch for duplicate-import bugs reappearing in App.tsx after multi-part edits to 
    its import block — always close/reload the file in the VS Code tab before restarting 
    Metro after editing it.
  - **Now demonstrated in practice, not just theoretical**: a routine "session checkpoint" 
    commit can silently revert real work if a file is open with unsaved/stale changes in 
    a VS Code tab — this is exactly what happened to the recovery-key badge fix. 
    Close/Save All tabs before the start-of-session commit block, not just before 
    edit sessions.
  - CSV import: no upfront warning if Date/Label/Amount are left unmapped — minor,
    not fixed, low priority.
  - The two new EF/FI income-info lines in SavingsScreen.tsx have not been visually 
    confirmed on a real device yet (functionally fine, just not eyeballed).
  - Firestore rules changes require a separate `firebase deploy --only firestore:rules` 
    step — editing firestore.rules alone does nothing until deployed.

▶️ Next step
- **Tier 1 is fully verified and complete (see ⚠️ Known issues above).** Next up: approve and 
  implement Tier 2 (3 bugs + 2 security findings + 3 config fixes), then Tier 3 
  cleanup, each as its own scoped Antigravity approval round, per this project's 
  established audit workflow (report first, approve in numbered batches, no broad 
  "fix everything" authorization, and now — independently re-verify claimed fixes 
  against real code before marking them done).
- Once all 3 tiers are resolved and re-verified (`npx tsc --noEmit` clean, rules 
  redeployed if changed): begin Phase B at B.1 (essential vs. additional feature
  split — formal write-up) per the checkpoint table in PROGRESS1.md's ▶️ Next step 
  section (item 6), copied below for convenience:

  | Order | Item | Source |
  |---|---|---|
  | B.1 | Essential vs. additional feature split — formal write-up | Already decided |
  | B.2a | Splash/Intro screen | Standard-screens gap-check |
  | B.2b | Onboarding (short, skippable, shown once after account creation) | Standard-screens gap-check |
  | B.2b-security | Security setup step within onboarding — biometric-first, PIN as labeled fallback | Onboarding research |
  | B.2c | Standalone Profile screen, split out of Settings | Standard-screens gap-check |
  | B.3a | Accounts tab redesign: colored account cards | Apple Wallet-inspired |
  | B.3b | Accounts tab redesign: stacked/fanned card view | Apple Wallet-inspired |
  | B.3c | Accounts tab redesign: "Add account" as a bottom sheet | Apple Wallet-inspired |
  | B.4a | Convert essential-screen add/edit flows to bottom sheets, one screen at a time | Cards + bottom sheets pattern |
  | B.4b | Carry collapsed-row/tap-to-expand pattern to every list screen | Cards + bottom sheets pattern |
  | B.5 | UI/UX psychology pass | Cross-generational research |
  | B.6a | Date picker, part 1 — reusable `<DateField>`, Transactions + Bills | Requested |
  | B.6b | Date picker, part 2 — roll out to every remaining screen | Requested |
  | B.7 | "Left to Spend" hero stat on Home tab | Simplifi-inspired |
  | B.8 | Category watchlists under Insights | Simplifi-inspired |
  | B.9 | Yours/Mine/Ours labels + transaction comments | Monarch-inspired |
  | B.10 | Refund tracker | Simplifi-inspired |
  | B.11 | Weekly spending recap push notification | Monarch-inspired |
  | B.12 | Expanded FI/retirement calculator | Simplifi-inspired |
  | B.13 | Report filtering by tag | Simplifi-inspired |
  | B.14 | Subscription cancel-reminder | Lightweight Rocket Money substitute |

  Full detail and reasoning for each item lives in PROGRESS1.md's Decisions section —
  this table is a working copy for convenience, not a replacement.

Files in the repo (relevant to Phase B/C)
- (Nothing yet — will be filled in as Phase B work begins.)
- For the full file inventory through the end of Phase A, see PROGRESS1.md.

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