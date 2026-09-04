Household Finance Mobile App — Progress Log (Phase B: UI/UX Polish → Phase C: Publishing)

This file tracks Phase B and Phase C only. Phase A (Firebase Auth, household linking,
account recovery, multi-device active sessions) is fully complete — see PROGRESS1.md,
which is now closed and kept only as a historical record. PROGRESS.md covers the
original 11 phases before that. Nothing from either file is repeated here.

✅ Done
- **Pre-Phase-B code-health/security audit — COMPLETE (investigation only, zero code changed).** Full report-only pass via Antigravity across bugs, dead code, security rules, config, and feature-gap suggestions. Found 5 real bugs (2 high-priority: silent household data overwrite risk, and a solo password-change that silently breaks the Secret Recovery Key), 4 security findings (2 high-priority: a brute-forceable peer-recovery PIN doc that's never deleted, and a missing ownership check letting any user overwrite anyone's cloud backup), 4 unused-import/variable cleanup items, 5 leftover debug logs, and 3 config inconsistencies (app.json dark-mode setting, missing notifications plugin, a deprecated notification trigger format). `npx tsc --noEmit` clean. Full finding-by-finding detail in ⚠️ Known issues below. Triaged into 3 approval tiers.
- **Tier 1 audit fixes — VERIFIED COMPLETE (all 4 items confirmed against real code, not just commit messages).** See ⚠️ Known issues below for full detail, including a regression that was caught during verification and fixed.
- **Tier 2 audit fixes — VERIFIED COMPLETE (all 7 items confirmed against real code).** 6 of 7 turned out to already be implemented in the code (link-code hijacking protection, household update rule type checks, app.json fixes, modern notification trigger format, and the profile-creation username-stranding fix) but had never been deployed/committed as "done" — deployed via `firebase deploy --only firestore:rules` and confirmed live this session. The 1 real gap found (solo profile cloud backups failing silently) was fixed, reviewed, and pushed as commit `70431f9`. `npx tsc --noEmit` clean. See ⚠️ Known issues below for full detail.
- **Tier 3 audit cleanup — VERIFIED COMPLETE (all 7 items confirmed against real code and fixed).** Independently re-verified all 7 previously-identified Tier 3 items before touching anything — all 7 confirmed still present with real code shown. Reviewed and approved 7 of 8 proposed fixes (1 bonus finding included), applied them, `npx tsc --noEmit` clean (0 errors), real `git diff` reviewed line-by-line, committed and pushed. The 8th item (orphaned household docs from abandoned link codes) was investigated separately and deliberately deferred rather than partially fixed — see 📌 Decisions and ⚠️ Known issues below.
- **B.1 — Essential vs. additional feature split, formal write-up — COMPLETE.** Documentation-only checkpoint; no code touched, nothing to test. Turned the split already decided in Phase A into an explicit, standalone reference table — see the new "📋 Phase B Feature Priority" section below. Phase B officially begins.
- **B.2a — Splash/Intro screen — COMPLETE.** New `IntroScreen.tsx`: an animated padlock 
  logo (muted single-family green — lock body a touch darker than the shackle outline so 
  the two pieces read as one cohesive mark) with a `$` on the lock body, scale+spring 
  "bounce and settle" entrance (overshoots slightly then eases back), followed by a 
  deliberate pause and then an "HOUSEHOLD FINANCE" eyebrow-style label (small, uppercase, 
  letter-spaced, `colors.gold` so it respects light/dark mode) fading in underneath. 
  Wired into `App.tsx` in place of the old plain `ActivityIndicator` spinner on the 
  `loading` screen state. Real profile-index load and a minimum display timer now run in 
  parallel via `Promise.all`, floored at 1.6s — long enough for the full bounce → pause → 
  fade sequence (~1.5s) to finish before the screen transitions away, regardless of how 
  fast the real check completes.
- **B.2b — Onboarding (3-step, skippable) — COMPLETE.** New `OnboardingScreen.tsx`: a 
  3-step sequence (Welcome → Quick Unlock → Ready) shown once, right after a brand-new 
  profile finishes creation — never shown on sign-in. Skip is available on every step; 
  tapping it (or finishing Step 3) writes `profile:${username}:onboarding-completed` to 
  AsyncStorage via a new `onboarding.ts` helper module. Wired into `App.tsx`'s top-level 
  screen state machine: `CreateProfileScreen`'s success callback now routes to a new 
  `'onboarding'` screen state instead of straight to `'home'`; `SignInScreen`'s flow is 
  untouched and still routes existing sign-ins directly to `'home'`.
- **B.2b-security — Quick Unlock security setup, including real biometric unlock — COMPLETE.** 
  Split into two checkpoints on purpose (see 📌 Decisions below):
  - **Checkpoint A (PIN path + eye icon):** New reusable `PinField.tsx` component 
    (mirrors the existing `PasswordField.tsx` show/hide pattern — same Ionicons eye 
    glyphs, same `colors.inkFaint` styling — adapted for numeric 4–6 digit PIN entry, 
    with a `centered` prop for `PinUnlockScreen`'s centered/letter-spaced style vs. 
    `SetPinScreen`'s left-aligned style). Swapped into both `SetPinScreen.tsx` and 
    `PinUnlockScreen.tsx`, replacing their old plain `<TextInput secureTextEntry>` 
    fields. Onboarding's Step 2 originally shipped with a "Coming Soon: Face ID & 
    Fingerprint" banner (no fake toggle, no dormant flag) plus real PIN setup using 
    `PinField`, reusing `SetPinScreen`'s existing validation.
  - **Checkpoint B (real biometric unlock):** Installed `expo-local-authentication`. New 
    `biometrics.ts` module (same per-profile AsyncStorage pattern as `pin.ts`/`onboarding.ts`) 
    with `getBiometricState()` (`'UNAVAILABLE' | 'ENABLED' | 'DISABLED'`), 
    `setBiometricsDisabled()`, `getBiometricLabel()` (dynamically "Face ID" / "Touch ID" / 
    "Fingerprint" / "Biometric Unlock"), and `attemptBiometricAuth()`. Biometric unlock is 
    **auto-offered by default (opt-out only)** — the storage key is 
    `profile:${username}:biometrics-disabled`, so *absence* of the key means enabled; 
    turning it off is the only way to disable it, and that only happens via an explicit 
    Settings toggle or declining the OS permission prompt. `App.tsx`'s lock condition 
    (`lockIfPinIsSetUp`, renamed `lockIfConfigured`) now locks if a PIN is set up **or** 
    biometric state is `'ENABLED'`, checked concurrently via `Promise.all`. 
    `PinUnlockScreen.tsx` auto-attempts biometric auth on mount when enabled, with a 
    debounce guard (an in-flight ref plus a 3-second module-level throttle) so rapid 
    app-backgrounding/foregrounding can't spam repeated native Face ID prompts; a manual 
    "🔄 Try [Face ID/Touch ID/Fingerprint] again" button and the existing PIN input / 
    "Use password instead" fallback are always visible regardless of biometric state. 
    Settings > Security gained a new "Quick Unlock" section: a toggle for biometric 
    unlock (reusing the app's existing `toggleTrack`/`toggleThumb` styles), disabled 
    with an informational note on devices without biometric hardware/enrollment, and a 
    "Set a Quick PIN" / "Change PIN" entry point that opens `SetPinScreen` in a `Modal` — 
    the first place PIN management has been reachable from Settings rather than only 
    from Home. Onboarding's Step 2 banner and Step 3 confirmation badges were updated to 
    reflect that biometrics are real now (dynamic "[Face ID] Enabled" card when hardware 
    supports it, informational note when it doesn't) instead of "Coming Soon."
  - **Bug fix found along the way:** `PinUnlockScreen`'s "Unlock" button had no visible 
    text label at all since Checkpoint A shipped — the `<TouchableOpacity>` had styling 
    for `primaryBtnText` defined but no `<Text>` element inside it. Fixed as part of 
    Checkpoint B's diff; confirmed via direct inspection of the file on disk (not assumed) 
    before approving.
  - Both checkpoints: `npx tsc --noEmit` clean, diffs reviewed line-by-line against the 
    real repo (not just descriptions) before approval, committed locally. Checkpoint A 
    was pushed; Checkpoint B's commit (`d5ba690`, "Add real biometric unlock (Face ID/
    fingerprint), auto-offered by default with PIN/password fallback (Checkpoint B)") is 
    committed locally and ready to push at the start of the next session (see 📌 
    Decisions below on who runs `git push`).

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
- **New this session:** Orphaned `households/{householdId}` documents left behind by 
  abandoned/expired link codes are a known, accepted limitation — deferred rather than 
  fixed. Investigated the real cause (household doc is created up front by 
  `startHouseholdLink()`/`startHouseholdInvite()`, but `cancelLinkCode()` only ever 
  deletes the `linkCodes/{code}` doc, never the household doc) and confirmed a real 
  `deleteHousehold()` function already exists in `household.ts` but nothing calls it 
  from `cancelLinkCode()`. Fixing that alone would only cover explicit cancel/start-over/
  unlink flows (8 call sites found) — it would NOT cover the more common abandonment 
  case (app closed, phone locked, or the 15-minute Firestore-rules expiry lapsing 
  without anyone joining), since neither the Firestore rules expiry nor the client-side 
  `handleLinkCodeExpired()` timer ever deletes the household doc. A complete fix needs 
  server-side scheduled cleanup (a Firebase Cloud Function or Firestore TTL policy) — 
  real infrastructure, not a client-side patch. Decision: defer until/unless Cloud 
  Functions infrastructure gets added for some other reason. No security or data-loss 
risk — these docs contain only encrypted ciphertext and are fully isolated by 
  Firestore security rules, so it's pure database clutter.
- **New this session:** IntroScreen's currency glyph is a fixed `$`, not the user's 
  configured app currency — it's brand/icon dressing only (chosen for the dollar's 
  recognizability as a global reserve currency), and is intentionally decoupled from 
  the real currency setting used everywhere else in the app.
- **New this session:** The splash screen's minimum display duration (`minDelay` in 
  App.tsx) is deliberately tied to IntroScreen's actual animation length. If 
  IntroScreen's animation timing is ever changed, App.tsx's `minDelay` value must be 
  re-checked and adjusted to match, or the text fade can get cut off.
- **New this session:** Onboarding's security setup step was deliberately split into two 
  checkpoints rather than built as one. Checkpoint A shipped a "Coming Soon" banner for 
  biometrics (not a fake toggle that silently records a preference flag) because a 
  biometrics-enabled flag with no matching unlock wiring — and no PIN behind it — would 
  leave the app in a state where it locks but nothing can ever unlock it. PIN setup was 
  the only functional path in Checkpoint A; Checkpoint B added the real biometric wiring.
- **New this session:** Biometric unlock is auto-offered by default (opt-out only), not 
  opt-in — a deliberate product choice. This is a real behavior change for existing 
  profiles too, not just new ones: anyone on a device with biometric hardware will start 
  seeing lock/unlock prompts they never explicitly set up, once this ships. Confirmed 
  intentional.
- **New this session:** Biometric state is stored as `profile:${username}:biometrics-disabled` 
  (absence of the key = enabled), not a `biometrics-enabled` flag — this matches the 
  opt-out default cleanly (nothing needs to be written for the common case).
- **New this session:** Declining the biometric permission prompt (or turning it off in 
  Settings) is a one-way door by design — the app will not re-prompt automatically. 
  Turning it back on requires a deliberate trip to Settings, which re-verifies the 
  hardware via `attemptBiometricAuth()` before actually re-enabling it.
- **New this session:** Going forward, Antigravity applies, verifies, and commits changes 
  locally, but never runs `git push` — that's always run manually from the person's own 
  VS Code terminal. Every approval prompt should now explicitly instruct "commit locally, 
  do NOT push" and ask for `git log -1` + `git status` to confirm the commit exists.

📋 Phase B Feature Priority (B.1 — finalized reference)
This is the standing checklist for "is this essential or can it wait" throughout the
rest of Phase B. The underlying decision was made back in Phase A (see PROGRESS1.md);
this is just the formal, standalone version so future sessions don't need to dig for it.

**Essential — polish/build these first:**
Sign-in & Security, Accounts, Calendar, Bills/Debts/Loans, Transactions, Income,
Savings (including the EF/FI calculators), Dashboard, Settings.

**Additional — later, or as time allows:**
Groceries, Travel, Events, Year-End Goals, the deeper Reports pages, the Shared
Expense ledger, CSV import, Payment-method breakdown.

When in doubt about whether a Phase B item belongs in the "essential" bucket, it
should touch one of the 9 essential screens/flows above — if it doesn't, it's additional.

⚠️ Known issues / gotchas
- **Pre-Phase-B audit findings — TIER 1 AND TIER 2 FULLY VERIFIED & COMPLETE. Tier 3 still open.**

  **TIER 1 — ✅ FIXED, DEPLOYED, AND INDEPENDENTLY VERIFIED against real code:**
  - **[Bug] No live sync for a shared household's financial data.** Fixed in `household.ts`/`DataContext.tsx` — `subscribeToHousehold` now delivers `data`/`updatedAt`, and `DataContext.tsx` tracks its own last-written payload (`lastEncryptedDataRef`) to tell its own writes apart from a household-mate's remote change. **Verified against live code** — real listener/ref code confirmed present and correct.
  - **[Bug] Solo password change silently breaks the Secret Recovery Key.** `changePassword()` deletes the stale `recoveryKeys/{username}` doc via `deleteRecoveryKey()` (recovery.ts) — confirmed working. **The Settings > Security "Needs regenerating"/"Active" badge UI was accidentally reverted by a later unrelated commit** (`91df290`, a routine "session checkpoint" commit that picked up a stale unsaved VS Code tab) — this was caught during independent verification, not assumed. **Re-fixed and re-verified in commit `8821ff3`**: badge UI restored, `hasRecoveryKeySetUp` import and `hasRecoveryKey` state re-wired, optimistic state updates added (flips to "Needs regenerating" immediately on password change, flips to "Active" immediately on generating a new key). `npx tsc --noEmit` clean. Pushed and confirmed on `main`.
  - **[Security] Peer-recovery's ephemeral transfer document is never deleted.** Fixed — `SignInScreen.tsx` calls `deletePeerRecoveryRequest()` immediately after successful decryption, removing `householdRecovery/{requestId}` from Firestore. **Verified against live code.**
  - **[Security] `profileBackups/{username}` has no ownership check on writes.** Fixed — `cloudBackup.ts` stamps `ownerUid` on every save; `firestore.rules` requires `ownerUid == request.auth.uid` on create/update/delete. **Verified against live code AND confirmed actually deployed** (not just committed) via `firebase deploy --only firestore:rules` output and Firebase console rules history.

  **How Tier 1 was originally fixed (commit `03df99b`):** Live sync: `subscribeToHousehold` in `household.ts` now also delivers `data`/`updatedAt`. `DataContext.tsx` tracks the last encrypted payload it wrote itself so it can tell its own writes apart from a household-mate's remote change, and only reloads/redecrypts on genuine remote updates. Stale recovery key: `changePassword()` deletes the old `recoveryKeys/{username}` doc (via `deleteRecoveryKey()`) on a solo password change, since it can't be re-wrapped without the original recovery code; Settings > Security shows a status badge (via `hasRecoveryKeySetUp()`). Peer-recovery PIN doc: `SignInScreen.tsx` calls `deletePeerRecoveryRequest()` immediately after a successful transfer. `profileBackups` ownership: `cloudBackup.ts` stamps `ownerUid` on every save; `firestore.rules` enforces it. Deployed via `firebase deploy --only firestore:rules` — confirmed live.

  **Regression + fix (this session):** The Settings badge from `03df99b` was silently lost in the very next commit (`91df290`, an unrelated routine checkpoint) because `SettingsScreen.tsx` had unsaved changes open in a VS Code tab at commit time — exactly the failure mode PROGRESS1.md already warned about. Caught by independently re-verifying each Tier 1 claim against real code (via a dedicated Antigravity investigation prompt) rather than trusting the original "implemented & deployed" note at face value. Re-applied in commit `8821ff3`, reviewed, `npx tsc --noEmit` clean, pushed. A `git fatal: .git/index: index file smaller than expected` error appeared mid-session (likely from an interrupted git operation) — resolved by deleting and rebuilding the local index (`Remove-Item .git\index` + `git reset`); this only affects git's local staging bookkeeping, not commit history or file contents, and did not require any further action once resolved.

  **TIER 2 — ✅ VERIFIED COMPLETE (all 7 items confirmed against real code, not just commit messages):**
  - **[Bug] `saveModel`'s Firestore write is wrapped in try/catch for the household path** — confirmed, with a real `Alert.alert('Sync Failed', ...)` shown to the user if the write fails. **The solo (non-household) profile's cloud backup path was found to still be silently swallowing failures** (`.catch(() => {})` with no user alert) — this was the one genuine gap. Fixed this session: wrapped in `try`/`await`/`catch` with a new `'Backup Failed'` alert, scoped to just that one code path. Diff reviewed, `npx tsc --noEmit` clean (0 errors), committed as `70431f9`, pushed to `main`, `git status` confirmed clean.
  - **[Bug] A failed `saveRecoveryKey()` during profile creation can strand a username as permanently "taken."** Verified already fixed — `CreateProfileScreen.tsx` wraps the recovery-key save in its own try/catch separate from the generic form error, and on failure shows an "Retry" / "Continue to App" alert rather than trapping the user on the form. The Firebase account and username are never lost.
  - **[Security] Any authenticated user can delete or overwrite another user's in-flight `linkCodes/{code}`** — verified already fixed in code: `linking.ts` now records `hostUid` on creation for both the host-link and invite-link flows, and `firestore.rules` requires `hostUid == request.auth.uid` on `delete`, and prevents `hostUid` itself from being changed on `update`. **Was written but not yet deployed** — deployed this session via `firebase deploy --only firestore:rules` (confirmed via real "Deploy complete!" output and live Firebase console link).
  - **[Security] Household `update` rule lacks a type check** that `create` already has — verified already fixed in code (`data is string`, `updatedAt is number` now present on both `create` and `update`). Same deployment gap as above — deployed and confirmed live this session.
  - **[Config] `app.json`'s `userInterfaceStyle`** — verified already set to `"automatic"` (not `"light"`).
  - **[Config] `expo-notifications` config plugin in `app.json`** — verified already present in the `plugins` array, with icon/color configured.
  - **[Config] Deprecated date-trigger format used in `pushNotifications.ts`** — verified already using the modern `{ type: SchedulableTriggerInputTypes.DATE, date: ... }` shape for all scheduled bill notifications (the only remaining `as any` usage is in a manual 10-second test-notification helper, not real scheduling — low priority, folded into Tier 3 below).

  **TIER 3 — ✅ FIXED, VERIFIED, AND PUSHED (7 of 8 items) — 1 deliberately deferred:**
  - **[Fixed] `onClearRemoteRevokeNotice` in SignInScreen.tsx** — was imported and 
    accepted as a prop but never called. Now wired to a real dismiss ("✕") button on 
    the remote-revoke banner.
  - **[Fixed] Unused import `getHouseholdOwner`** in SettingsScreen.tsx — removed.
  - **[Fixed] Unused import `formatPeso`** in GoalsScreen.tsx — removed.
  - **[Fixed] Duplicate `debtFeesInYear()` calculation** in TaxSummaryReport.tsx — was 
    computed twice in a row, with the second (`debtFees`) never used anywhere; removed, 
    kept `interestFees` which already used the correct calculation.
  - **[Fixed] Leftover debug logs** — removed 3 `console.error` lines in 
    CreateProfileScreen.tsx's Firebase-account-creation catch block (redundant with the 
    already-shown `friendlyFirebaseError()` message); changed a bracketed 
    `[FAILED TO CANCEL OLD LINK CODE]` `console.error` in linking.ts to a plain 
    `console.warn`.
  - **[Fixed] Dead code with deprecated notification trigger** — removed the entire 
    `sendTestNotification()` helper from pushNotifications.ts (confirmed unused 
    anywhere in the app), which also removed its deprecated `{ seconds: 10 } as any` 
    trigger shape. Real scheduled bill notifications already used the modern format 
    (confirmed in Tier 2).
  - **[Fixed, bonus finding] Duplicate "Secret Recovery Key" label** in 
    SettingsScreen.tsx — the label was rendered twice in a row (once standalone, once 
    inside the row with the status badge); removed the redundant standalone copy.
  - **[Deferred, not fixed] Orphaned `households/{householdId}` doc on cancelled/expired 
    link codes** — see 📌 Decisions above for full reasoning. Accepted as a known 
    limitation, not scheduled for a fix.

  All 7 fixes reviewed via real `git diff` before commit, `npx tsc --noEmit` clean 
  (0 errors), committed and pushed to `main`. Confirmed via `git status` (clean, 
  up-to-date tree) after push.

  **Feature ideas surfaced by the audit (not bugs — for Phase B consideration, not yet scheduled):** a "Sign out all other devices" button in Active Devices; wiring up the already-present-but-unused `onClearRemoteRevokeNotice` to dismiss the revoke banner; pull-to-refresh on Dashboard/Bills/Transactions as a manual sync option (this would help make Tier 1's live-sync gap less painful even after it's fixed).
- **IntroScreen animation timing not verified on slow/low-end devices.** The 1.6s 
  minimum display floor was tuned against the animation's timing on a normal device — 
  on a much slower device the animation itself could conceivably still be running past 
  1.6s, cutting the text fade short. Not yet reported as an issue; low priority, revisit 
  if it comes up.
- **Checkpoint B's commit is local-only, not yet on GitHub as of end of session.** 
  Commit `d5ba690` exists locally on `main`, one commit ahead of `origin/main`, verified 
  via `git status`. Next session should start by running `git push` (or confirming it 
  was already pushed) before anything else, since the usual start-of-session sync check 
  will show "ahead of origin by 1 commit" until that happens.
- **Biometric unlock has not yet been tested on a real device.** All verification this 
  session was `npx tsc --noEmit` (type-checks clean) plus line-by-line diff review — 
  nobody has yet triggered the actual Face ID/Fingerprint prompt on a physical phone to 
  confirm the OS-level permission dialog, the debounce behavior under rapid backgrounding, 
  or the Settings toggle round-trip. Worth doing before considering B.2b-security fully 
  closed out in practice, not just in code.

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
- **Tier 1, Tier 2, and Tier 3 are all fully verified and complete** (the sole exception 
  — the orphaned household-doc cleanup — is a deliberate, documented deferral, not an 
  open task; see 📌 Decisions above). The full pre-Phase-B audit is now closed out.
- **B.1 is complete** — see the new "📋 Phase B Feature Priority" section above.
- **B.2a is complete.**
- **B.2b is complete** (onboarding flow).
- **B.2b-security is complete** (PIN eye icon + real biometric unlock, Checkpoints A & B). 
  **Before anything else next session: run `git push` to publish commit `d5ba690`**, then 
  the usual sync-check block, then move on to B.2c.
- Next up: **B.2c — Standalone Profile screen, split out of Settings**, per the checkpoint 
  table below:

  | Order | Item | Source |
  |---|---|---|
  | ✅ B.1 | Essential vs. additional feature split — formal write-up | Already decided |
  | ✅ B.2a | Splash/Intro screen | Standard-screens gap-check |
  | ✅ B.2b | Onboarding (short, skippable, shown once after account creation) | Standard-screens gap-check |
  | ✅ B.2b-security | Security setup step within onboarding — PIN eye icon + real biometric unlock (Face ID/Touch ID/Fingerprint), auto-offered opt-out | Onboarding research |
  | ▶️ B.2c | Standalone Profile screen, split out of Settings | Standard-screens gap-check |
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
- `mobile-app/src/screens/IntroScreen.tsx` — new. Animated splash/intro screen (padlock 
  logo bounce-in + "HOUSEHOLD FINANCE" text fade) shown while the app checks for 
  existing profiles on launch.
- `mobile-app/App.tsx` — modified. Imports `IntroScreen`; the `screen === 'loading'` 
  branch now returns `<IntroScreen />` instead of a plain spinner; the profile-index 
  load and a 1.6s minimum-display timer now run together via `Promise.all`.
  - `mobile-app/src/components/PinField.tsx` — new. Reusable 4–6 digit numeric PIN input 
  with the same eye-icon show/hide toggle used on password fields; `centered` prop for 
  `PinUnlockScreen`'s styling vs. `SetPinScreen`'s.
- `mobile-app/src/onboarding.ts` — new. `hasCompletedOnboarding(username)` / 
  `markOnboardingCompleted(username)`, same per-profile AsyncStorage pattern as `pin.ts`.
- `mobile-app/src/screens/OnboardingScreen.tsx` — new. 3-step onboarding flow (Welcome → 
  Quick Unlock → Ready), skippable at every step.
- `mobile-app/src/biometrics.ts` — new. `getBiometricState()`, `setBiometricsDisabled()`, 
  `getBiometricLabel()`, `attemptBiometricAuth()` — biometric unlock logic, opt-out by 
  default via `profile:${username}:biometrics-disabled`.
- `mobile-app/App.tsx` — further modified (see B.2b/B.2b-security above). `'onboarding'` 
  added to the `Screen` union; `CreateProfileScreen`'s success callback now routes to 
  `'onboarding'` instead of `'home'`; lock condition (`lockIfConfigured`) now also checks 
  biometric state.
- `mobile-app/App.tsx` — further modified (see B.2b/B.2b-security above). `'onboarding'` 
  added to the `Screen` union; `CreateProfileScreen`'s success callback now routes to 
  `'onboarding'` instead of `'home'`; lock condition (`lockIfConfigured`) now also checks 
  biometric state.
- `mobile-app/src/screens/SetPinScreen.tsx` — modified. Swapped raw `<TextInput>` fields 
  for `<PinField>`.
- `mobile-app/src/screens/PinUnlockScreen.tsx` — modified. Swapped raw `<TextInput>` for 
  `<PinField centered>`; added auto/manual biometric prompt with debounce guard; fixed 
  the missing "Unlock" button text label.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified. New "Quick Unlock" section 
  under Security: biometric toggle, "Set a Quick PIN"/"Change PIN" entry point opening 
  `SetPinScreen` in a `Modal`.
- `mobile-app/app.json` — modified. Added `NSFaceIDUsageDescription` (iOS), 
  `USE_BIOMETRIC` permission (Android), and the `expo-local-authentication` config plugin.
- `mobile-app/package.json` — modified. Added `expo-local-authentication`.
- For the full file inventory through the end of Phase A, see PROGRESS1.md.

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
household doc. Based on that honest picture, decided to defer rather than half-fix it — see 
📌 Decisions above. Committed the 7 Tier 3 fixes; hit the same `git fatal: .git/index: index 
file smaller than expected` error as a prior session, resolved the same way 
(`Remove-Item .git\index` + `git reset`, confirmed via `git status` that all 7 modified 
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