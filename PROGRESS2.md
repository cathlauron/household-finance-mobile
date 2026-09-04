Household Finance Mobile App — Progress Log (Phase B: UI/UX Polish → Phase C: Publishing)

This file tracks Phase B and Phase C only. Phase A (Firebase Auth, household linking,
account recovery, multi-device active sessions) is fully complete — see PROGRESS1.md,
which is now closed and kept only as a historical record. PROGRESS.md covers the
original 11 phases before that. Nothing from either file is repeated here.

✅ Done
- **Pre-Phase-B code-health/security audit — COMPLETE (investigation only, zero code changed).** Full report-only pass via Antigravity across bugs, dead code, security rules, config, and feature-gap suggestions. Found 5 real bugs (2 high-priority: silent household data overwrite risk, and a solo password-change that silently breaks the Secret Recovery Key), 4 security findings (2 high-priority: a brute-forceable peer-recovery PIN doc that's never deleted, and a missing ownership check letting any user overwrite anyone's cloud backup), 4 unused-import/variable cleanup items, 5 leftover debug logs, and 3 config inconsistencies (app.json dark-mode setting, missing notifications plugin, a deprecated notification trigger format). `npx tsc --noEmit` clean. Full finding-by-finding detail in ⚠️ Known issues below. Triaged into 3 approval tiers — none yet approved/fixed.

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

⚠️ Known issues / gotchas
- **Pre-Phase-B audit findings (this session) — none fixed yet, triaged into 3 tiers:**

  **TIER 1 — fix now (security/data-loss risk):**
  - **[Bug] No live sync for a shared household's financial data.** `subscribeToHousehold`/`setupHouseholdListener` only watch `members`/`owner`/`memberUsernames` — never the encrypted `data` field itself. If Member A adds a bill, Member B's app doesn't see it live; if Member B then saves anything, their stale in-memory model overwrites Member A's edit in Firestore. Fix: also deliver `data`/`updatedAt` through the listener and merge/reload when the household's data changed elsewhere.
  - **[Bug] Solo password change silently breaks the Secret Recovery Key.** `changePassword()` re-encrypts personal data under a new key but never re-wraps `recoveryKeys/{username}` in Firestore. If the person later forgets their new password and tries the Secret Recovery Key, it unwraps the OLD key and fails — permanent lockout with no clear reason why. Fix: prompt to regenerate the recovery key on password change, or flag it stale in Settings.
  - **[Security] Peer-recovery's ephemeral transfer document is never deleted.** Once household peer recovery succeeds, `householdRecovery/{requestId}` (containing the household key encrypted under a 6-digit numeric PIN — only 1,000,000 possible combinations) stays in Firestore indefinitely, readable/brute-forceable by any household member. Fix: delete the doc immediately after successful decryption in `SignInScreen.tsx`.
  - **[Security] `profileBackups/{username}` has no ownership check on writes.** Any authenticated user can overwrite ANY username's cloud backup salt/data — corrupting a different person's account so their next new-device sign-in fails. Fix: add an `ownerUid` field, enforced on create and update.

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
  - CSV import: no upfront warning if Date/Label/Amount are left unmapped — minor, 
    not fixed, low priority.
  - The two new EF/FI income-info lines in SavingsScreen.tsx have not been visually 
    confirmed on a real device yet (functionally fine, just not eyeballed).
  - Firestore rules changes require a separate `firebase deploy --only firestore:rules` 
    step — editing firestore.rules alone does nothing until deployed.

▶️ Next step
- **Audit is done and triaged (see ⚠️ Known issues above) — nothing fixed yet.** 
  Approve and implement Tier 1 first (the 2 bugs + 2 security findings), then Tier 2, 
  then Tier 3 cleanup, each as its own scoped Antigravity approval round, per this 
  project's established audit workflow (report first, approve in numbered batches, 
  no broad "fix everything" authorization).
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
