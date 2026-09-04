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
    was pushed; Checkpoint B was pushed at the start of a later session.
- **Post-B.2b-security cleanup: TypeScript syntax errors fixed, then a full independent
  audit verification pass — COMPLETE.** After Checkpoint B, `npx tsc --noEmit` surfaced 9,
  then 18, then a final round of syntax errors — all the same root cause: leftover old
  code left in place when new code was pasted on top of it during the biometrics work
  (duplicate imports, a stray unclosed `<MainTabs` tag inside `App.tsx`'s render, two
  functions merged into one with unclosed braces, duplicate function bodies/props/JSX
  blocks across `App.tsx`, `HomeScreen.tsx`, `OnboardingScreen.tsx`, `MainTabs.tsx`,
  `PinUnlockScreen.tsx`, and `SettingsScreen.tsx`). All fixed across three rounds via
  Antigravity investigation + manually-applied snippets (the person editing files
  directly rather than Antigravity committing, specifically to avoid the git index
  corruption seen in earlier sessions). `npx tsc --noEmit` confirmed clean, pushed as
  `d0375c6`. Followed immediately by a dedicated verification audit (see 📌 Decisions
  below) re-checking every "done" item in this file against real code rather than
  trusting the notes — everything confirmed genuinely working except one real bug: the
  Tier 2 solo-profile-cloud-backup fix had the same leftover-old-code problem (the old
  broken `.catch(() => {})` call was never deleted when the new `try`/`catch`/`Alert`
  version was added right below it, so the backup was silently firing twice per save).
  Fixed by deleting the stray duplicate line in `DataContext.tsx`. `npx tsc --noEmit`
  clean.
- **B.2c — Standalone Profile screen, split out of Settings — COMPLETE.** Discovered
  this checkpoint had actually already been substantially built in commit `d0375c6`
  (the same commit that fixed the post-B.2b-security syntax errors) but was never
  logged as such — `ProfileScreen.tsx` (1,358 lines, fully functional, no placeholders)
  already existed with the complete Household/linking/peer-recovery/roster feature set,
  `RootStack.tsx` already routed to it as a native-stack push over `MainTabs` (hides
  the bottom tab bar, native back button), and `SettingsScreen.tsx` already had a
  working "Profile Card" (avatar initials, `@username`, vault status pill, chevron)
  navigating to it via `navigation.navigate('Profile')`. What remained was cleanup:
  the entire Household section (roster, invite/link code generation, join-with-code +
  conflict resolution, peer-recovery approval, leave/transfer ownership) was still
  duplicated live in `SettingsScreen.tsx`, running in parallel with the same
  functionality in `ProfileScreen.tsx`. Investigated via a dedicated Antigravity
  audit that mapped every exact removal boundary (JSX blocks, state variables, refs,
  `useEffect`s/listeners, handler functions, and imports used only by the Household
  section), cross-checked every remaining symbol (`isLinked`, `loadProfilesIndex`,
  `getHouseholdKey`, `generateRecoveryCode`, etc.) against the rest of the file to
  confirm nothing else depends on it, and separately confirmed `linkNoticeMsg`/
  `clearLinkNoticeMsg` (the one item not covered in the first dependency pass) have
  zero usage anywhere in `SettingsScreen.tsx` outside the removed block — both are
  already destructured and rendered independently in `ProfileScreen.tsx`. Given the
  size (over 1,000 lines touched across scattered, non-adjacent locations), this was
  approved as one of the "larger, well-reviewed multi-file changes where hand-pasting
  isn't practical" per standing policy, and applied directly by Antigravity rather than
  hand-pasted. Result: net **1,025 lines removed** from `SettingsScreen.tsx` (1 file
  changed, 1 insertion, 1,025 deletions), `npx tsc --noEmit` clean (0 errors),
  `git diff --stat` and `git log -1` reviewed against real output before accepting,
  committed locally as `302e52d` ("refactor(settings): remove duplicate household
  section and logic"), and pushed to `main` this session alongside `d0375c6`.
  `SettingsScreen.tsx` now contains only: Profile Card (preview + nav entry point),
  Appearance, Notifications, Categories, Merchants & Payees, Categorization Rules,
  Security (Change Password + Secret Recovery Key), Quick Unlock (PIN/biometrics),
  Auto-lock, Active Devices, and Data (export/clear). All Household/linking/roster/
  peer-recovery functionality now lives solely in `ProfileScreen.tsx`.
- **B.2c accidental revert caught & fixed — COMPLETE.** A routine commit made purely to
  update `PROGRESS2.md` (`c8cc133`) had accidentally reintroduced the old, un-cleaned-up
  version of `SettingsScreen.tsx` alongside it — silently undoing the entire 1,025-line
  B.2c Household-section removal without anyone noticing at the time. Surfaced when
  `npx tsc --noEmit` started failing with duplicate `React`/`useState`/`useEffect`
  identifier errors (two `import ... from 'react'` lines at the top of the file — the
  old pre-cleanup line sitting above the post-cleanup line). Investigated via Antigravity
  rather than patching the import line directly, since a surface-level import fix would
  have left the reverted 1,025 duplicate lines in place. Confirmed via `git show --stat`
  and `git diff` between commits `302e52d` and `c8cc133` that the revert was accidental,
  not intentional. Fixed by restoring the known-good file from commit `302e52d`
  (`git checkout 302e52d -- src/screens/SettingsScreen.tsx`), confirmed `npx tsc --noEmit`
  clean (0 errors), `git diff --stat` showed exactly the expected 1,025 deletions with
  no unexpected changes, committed as `c5fd7d0` ("fix: restore B.2c SettingsScreen.tsx
  cleanup that was accidentally reverted by a later PROGRESS2.md commit"), pushed to `main`.
- **B.3a — Accounts tab redesign: colored account cards — COMPLETE, VERIFIED ON DEVICE.** Added optional `color?: string` field to `BalanceAccountEntry` in
  `types.ts`. Built new reusable `src/components/AccountCard.tsx`: an Apple Wallet-style
  card (rounded corners, colored background, group badge + icon, account name, formatted
  balance, drop shadow) with an automatic luminance check (`isLightBackground`) so text
  renders white on dark/saturated card colors and dark ink on light colors like gold.
  Exports `DEFAULT_GROUP_COLORS` (cash = emerald green `#059669`, debit = cobalt blue
  `#2563EB`, credit = slate/graphite `#264653`) and `COLOR_PALETTE` (the same 15-color
  palette already used for category colors in `SettingsScreen.tsx`, for visual
  consistency app-wide). `AccountsScreen.tsx` now renders each account as an
  `<AccountCard />` instead of a plain gray row; the Add/Edit modal gained a horizontal
  color-swatch picker so users can override the auto-assigned default color per account,
  saved to the new `color` field. New accounts with no explicit color chosen fall back to
  their group's default color automatically. Verified: `PaymentMethodPicker.tsx`,
  `PaymentMethodsReport.tsx`, `balanceProjection.ts`, `HomeScreen.tsx`, and
  `mergeModels.ts` all confirmed unaffected (they only read `id`/`name`/`amount`, or
  spread the object in a way that preserves the new field automatically). `npx tsc --noEmit`
  clean (0 errors), diff reviewed line-by-line before approval, hand-pasted (not
  Antigravity-applied) per standing small-fix policy, committed as `51f4dba`
  ("feat(accounts): B.3a colored account cards with customizable colors"), pushed to
  `main`. Manually verified on-device: colored cards render correctly, the color swatch
  picker works and updates the card color on save, and the auto-default colors
  (green/blue/slate for Cash/Debit/Credit) display as expected.
- **B.3b — Accounts tab redesign: stacked/fanned card view — COMPLETE, VERIFIED ON DEVICE.**
  Added a fanned/stacked view on top of B.3a's colored `<AccountCard />`, using React
  Native's built-in `LayoutAnimation` API only — no new dependencies. Kept the existing
  Cash/Debit/Credit sections intact (headers, totals, "+ Add account" unchanged); within
  each section, 2+ accounts fan into a stacked pile in Stacked view, while 0-1 accounts
  render normally. Two-step tap interaction: tapping a peeking/collapsed card brings it
  to the front and expands it (other cards in that section's stack slide down, dim to
  78% opacity); tapping the already-expanded card opens the existing Edit Account modal
  (no new modal built); tapping a different card in the same stack switches focus.
  Expanded cards get a white border highlight, deeper shadow, and a "Tap to edit" hint
  badge next to the group icon. A "Collapse" chip appears in a section's header whenever
  that section has an expanded card, so the stack can always be collapsed back — added
  specifically so the UI can never get stuck expanded with no way out. Added a
  Cards/List segmented toggle in the top TOTAL BALANCE banner so the flat list view
  (from before B.3b) remains available; **Stacked is the default** (explicit decision —
  showcases the checkpoint's purpose and avoids scrolling past Credit accounts on
  typical 4-8 account households). Modified `src/components/AccountCard.tsx` (added
  `isStacked`/`isExpanded` props, expanded-state styling, edit hint badge) and
  `src/screens/AccountsScreen.tsx` (view mode state, expanded-account state, stacking
  margin/zIndex/opacity math, toggle UI, Collapse chip). `npx tsc --noEmit` clean (0
  errors), diff reviewed line-by-line before approval, hand-pasted per standing small-fix
  policy. Manually verified on-device: opens in Stacked view by default; tapping a
  peeking card brings it to front; tapping the front card again opens edit; Collapse
  chip works; Cards/List toggle switches views correctly; single-account sections
  display normally without stacking.
- **B.3c — Accounts tab redesign: "Add account" as a bottom sheet — COMPLETE, VERIFIED
  ON DEVICE.** Converted the Add/Edit account flow from a centered popup modal into a
  slide-up bottom sheet. Built as a genuinely reusable new component,
  `src/components/BottomSheet.tsx` (props: `visible`, `onClose`, `title`, `children`),
  specifically so upcoming checkpoint B.4a (rolling the same pattern out to Bills,
  Debts, Transactions, and other essential screens) can reuse it without rebuilding
  sheet boilerplate each time — confirmed via investigation that no bottom sheet
  component existed anywhere in the app before this checkpoint, and every other screen
  still uses the old centered-modal pattern pending B.4a. Uses React Native's built-in
  `Modal` with `animationType="slide"` only — no new dependencies (`@gorhom/bottom-sheet`,
  `react-native-reanimated`, `react-native-gesture-handler` were all confirmed absent
  from `package.json` and deliberately not added). Sheet has rounded top corners only,
  a centered drag-handle pill, a dimmed tap-to-close backdrop, safe-area bottom padding
  (via `SafeAreaView`) so buttons clear the home indicator on notched/edge-to-edge
  devices, and an internal scrollable area capped at ~85% of screen height with
  `KeyboardAvoidingView` so the keyboard doesn't cover inputs or buttons. The Add/Edit
  form itself was not touched at all — `nameInput`, `amountInput`, `colorInput`,
  `handleSave`, `handleDelete`, `closeModal`, the color swatch picker, and validation
  are all identical to before; this checkpoint changed only the container/presentation.
  Removed the now-unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`
  styles from `AccountsScreen.tsx` after confirming nothing else in the file referenced
  them. `npx tsc --noEmit` clean (0 errors), diff reviewed line-by-line before approval,
  hand-pasted per standing small-fix policy. Manually verified on-device: sheet slides
  up from the bottom with drag handle and rounded corners visible; tapping the backdrop
  closes it; keyboard doesn't cover the Name/Balance fields; color swatch picker still
  works; Save, Delete, and Cancel all behave the same as before.
- **B.3 — Accounts tab redesign (B.3a + B.3b + B.3c) — FULLY COMPLETE.** All three
  Apple Wallet-inspired sub-checkpoints (colored cards, stacked/fanned view, bottom
  sheet add/edit) are done and verified on-device.

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
  - After any Antigravity-reported "fix implemented" claim, independently re-verify
    against real code before trusting it as done.
  - Orphaned `households/{householdId}` documents left behind by abandoned/expired
    link codes are a known, accepted limitation — deferred rather than fixed (needs
    server-side scheduled cleanup, not a client-side patch). See PROGRESS1.md/this
    file's prior sessions for full reasoning.
  - Going forward, for any fix small enough to hand-paste, the person applies it
    directly via paste/replace snippets and runs `git add`/`commit`/`push` themselves
    — Antigravity does not touch the working tree or run git commands for these.
    Antigravity applying and committing directly is still fine for larger,
    well-reviewed multi-file changes where hand-pasting isn't practical — this is a
    preference for smaller fixes, not an absolute rule. `git push` itself is always
    run manually by the person, never by Antigravity, regardless of which path was used.
  - After any round of fixes (whether hand-pasted or Antigravity-applied), run a
    dedicated independent verification pass — re-checking every claimed-done item
    against real, current code, not against this progress log or prior commit
    messages — before considering a checkpoint truly closed.
- **New this session:** Progress logs can silently fall behind real committed work —
  B.2c had already been substantially built in an earlier commit (`d0375c6`, made
  while fixing an unrelated batch of TypeScript syntax errors) but was never recorded
  as such in this file. Going forward, when starting a new checkpoint, it's worth a
  quick sanity check (e.g. checking git log for the target file/screen name) in case
  the work already exists from an earlier, differently-scoped session.
- **New this session:** When a large refactor's dependency audit checks most-but-not-
  all shared state/imports for outside usage, explicitly call out and verify any
  gaps before approving — don't assume "the rest looked clean" implies total coverage.
  Caught one such gap this session (`linkNoticeMsg`/`clearLinkNoticeMsg` weren't in
  the original audit table) and had it explicitly re-verified before approving the
  diff, rather than assuming it was fine by extension.
- **New this session:** For removals this large and scattered (single-digit distinct
  JSX/state/handler locations in the double digits, 1,000+ lines total), hand-pasting
  is not practical — this is a legitimate use of the existing carve-out allowing
  Antigravity to apply and commit (but never push) directly for large, well-reviewed
  changes, rather than the default hand-paste-small-snippets workflow.
- **New this session (B.3b):** When an investigation's written explanation describes a
  behavior (e.g. "tapping the background collapses the stack") that the actual proposed
  diff doesn't implement, catch and flag the mismatch explicitly before approving —
  don't assume the prose and the code agree just because they were presented together.
  In this case the gap was minor and didn't block approval (a different mechanism, the
  section header's Collapse chip, already satisfied the real requirement), but it's a
  reminder to verify claims against the actual diff line-by-line, the same discipline
  already applied to Antigravity's "fix implemented" claims.
- **New this session (B.3b):** When a design choice is explicitly left to Antigravity's
  judgment (e.g. "pick a sensible default, but tell me clearly which you chose"), treat
  that as still requiring the person's explicit confirmation before implementation —
  don't let "Antigravity's judgment call" quietly skip the standard confirm-before-code
  step.

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
- **Pre-Phase-B audit findings — TIER 1, TIER 2, AND TIER 3 FULLY VERIFIED & COMPLETE**
  (the one exception — orphaned household docs — is a deliberate, documented deferral).
  Full finding-by-finding detail preserved in this file's session-entry history below.
- **B.2c cleanup: verify the actual on-device Settings/Profile UI once, before calling
  it fully closed.** Everything was verified via `npx tsc --noEmit` (clean) and
  line-by-line diff review, but nobody has yet manually tapped through Settings →
  Profile Card → back on a real device/simulator since the ~1,025-line removal, to
  visually confirm there's no leftover blank gap where the Household section used to
  sit in Settings, and that the Profile Card/chevron/nav still behaves correctly.
  Low risk given the clean compile and reviewed diff, but not yet eyeballed.
- **IntroScreen animation timing not verified on slow/low-end devices.** The 1.6s
  minimum display floor was tuned against the animation's timing on a normal device —
  on a much slower device the animation itself could conceivably still be running past
  1.6s, cutting the text fade short. Not yet reported as an issue; low priority, revisit
  if it comes up.
- **Biometric unlock has not yet been tested on a real device.** All verification so
  far has been `npx tsc --noEmit` (type-checks clean) plus line-by-line diff review —
  nobody has yet triggered the actual Face ID/Fingerprint prompt on a physical phone to
  confirm the OS-level permission dialog, the debounce behavior under rapid backgrounding,
  or the Settings toggle round-trip. Worth doing before considering B.2b-security fully
  closed out in practice, not just in code.
- **A routine PROGRESS2.md-only commit can silently revert real code changes if a file
  is open with unsaved/stale changes in a VS Code tab — this has now happened twice**
  (previously the Settings recovery-key badge in an earlier session; this session, the
  entire B.2c 1,025-line SettingsScreen.tsx cleanup). Close/Save All tabs before *any*
  commit, including ones that are only meant to touch PROGRESS2.md — not just before
  dedicated edit sessions.

- **Carried forward from PROGRESS1.md — still relevant:**
  - Watch for duplicate-import bugs reappearing in App.tsx after multi-part edits to
    its import block — always close/reload the file in the VS Code tab before restarting
    Metro after editing it.
  - A routine "session checkpoint" commit can silently revert real work if a file is
    open with unsaved/stale changes in a VS Code tab — this has happened once already
    (a Settings recovery-key badge fix). Close/Save All tabs before the start-of-session
    commit block, not just before edit sessions.
  - CSV import: no upfront warning if Date/Label/Amount are left unmapped — minor,
    not fixed, low priority.
  - The two new EF/FI income-info lines in SavingsScreen.tsx have not been visually
    confirmed on a real device yet (functionally fine, just not eyeballed).
  - Firestore rules changes require a separate `firebase deploy --only firestore:rules`
    step — editing firestore.rules alone does nothing until deployed.

▶️ Next step
- **Tier 1, Tier 2, and Tier 3 pre-Phase-B audit fixes are all fully verified and
  complete** (the orphaned household-doc cleanup is a deliberate, documented deferral).
- **B.1, B.2a, B.2b, B.2b-security, and B.2c are all complete.**
- **B.3 (B.3a + B.3b + B.3c) — Accounts tab redesign — is fully complete and verified
  on-device.**
- Next up is **B.4a — Convert essential-screen add/edit flows to bottom sheets, one
  screen at a time**, reusing the new `src/components/BottomSheet.tsx` built in B.3c,
  per the checkpoint table below:

  | Order | Item | Source |
  |---|---|---|
  | ✅ B.1 | Essential vs. additional feature split — formal write-up | Already decided |
  | ✅ B.2a | Splash/Intro screen | Standard-screens gap-check |
  | ✅ B.2b | Onboarding (short, skippable, shown once after account creation) | Standard-screens gap-check |
  | ✅ B.2b-security | Security setup step within onboarding — PIN eye icon + real biometric unlock (Face ID/Touch ID/Fingerprint), auto-offered opt-out | Onboarding research |
  | ✅ B.2c | Standalone Profile screen, split out of Settings | Standard-screens gap-check |
  | ✅ B.3a | Accounts tab redesign: colored account cards | Apple Wallet-inspired |
  | ✅ B.3b | Accounts tab redesign: stacked/fanned card view | Apple Wallet-inspired |
  | ✅ B.3c | Accounts tab redesign: "Add account" as a bottom sheet | Apple Wallet-inspired |
  | ▶️ B.4a | Convert essential-screen add/edit flows to bottom sheets, one screen at a time | Cards + bottom sheets pattern |
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
  branch returns `<IntroScreen />` instead of a plain spinner; profile-index load and a
  1.6s minimum-display timer run together via `Promise.all`; `'onboarding'` added to
  the `Screen` union; `CreateProfileScreen`'s success callback routes to `'onboarding'`
  instead of `'home'`; lock condition (`lockIfConfigured`) checks both PIN and biometric
  state.
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
- `mobile-app/src/screens/SetPinScreen.tsx` — modified. Swapped raw `<TextInput>` fields
  for `<PinField>`.
- `mobile-app/src/screens/PinUnlockScreen.tsx` — modified. Swapped raw `<TextInput>` for
  `<PinField centered>`; added auto/manual biometric prompt with debounce guard; fixed
  the missing "Unlock" button text label.
- `mobile-app/app.json` — modified. Added `NSFaceIDUsageDescription` (iOS),
  `USE_BIOMETRIC` permission (Android), and the `expo-local-authentication` config plugin.
- `mobile-app/package.json` — modified. Added `expo-local-authentication`.
- `mobile-app/src/DataContext.tsx` — modified. Removed a stray duplicate, un-awaited
  cloud-backup call left in place from an earlier session's fix, which was causing solo
  (non-household) profile backups to fire twice per save.
- `mobile-app/src/screens/ProfileScreen.tsx` — new (built in commit `d0375c6`, logged
  this session after being discovered already complete). Standalone Profile screen:
  identity header (avatar initials, `@username`, Firebase email, vault status badge),
  Account & Security shortcuts back to Settings, full Household & Sharing section
  (roster with owner badges, invite/link code generation with 15-min countdown,
  join-with-code + 3-way merge conflict resolution, peer-recovery approval banner +
  modal, leave/transfer-ownership flow), Session Actions (Lock App, Sign Out with
  `testID="sign-out-button"`), and supporting modals (peer recovery approval, transfer
  ownership, remove member, join data conflict comparison). Exports `getInitials()`,
  reused by `SettingsScreen.tsx`'s Profile Card.
- `mobile-app/src/navigation/RootStack.tsx` — new (built in commit `d0375c6`). Native
  stack with two screens: `Main` (renders `MainTabs`, header hidden) and `Profile`
  (renders `ProfileScreen`, header shown, back button labeled "Settings").
- `mobile-app/src/navigation/MainTabs.tsx` — modified (commit `d0375c6`). Bottom tab
  navigator with 10 tabs (Home, Calendar, Accounts, To-Pay, Planning, Transactions,
  Insights, Income, Savings, Settings).
- `mobile-app/src/screens/HomeScreen.tsx` — modified (commit `d0375c6`). Sign Out button
  removed (moved to `ProfileScreen.tsx`).
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (Profile Card added in commit
  `d0375c6`; ~1,025 lines of duplicated Household/linking/peer-recovery/roster logic
  removed in commit `302e52d`; that removal was accidentally reverted by an unrelated
  PROGRESS2.md-only commit, then restored again this session in commit `c5fd7d0`). Now
  contains only: Profile Card, Appearance, Notifications, Categories, Merchants & Payees,
  Categorization Rules, Security (Change Password + Secret Recovery Key), Quick Unlock,
  Auto-lock, Active Devices, and Data.
- `mobile-app/src/types.ts` — modified. Added optional `color?: string` field to
  `BalanceAccountEntry`.
- `mobile-app/src/components/AccountCard.tsx` — new. Reusable Apple Wallet-style colored
  account card component. Exports `DEFAULT_GROUP_COLORS`, `COLOR_PALETTE`, and the
  `AccountCard` component itself (props: `account`, `group`, `onPress`, `style`, `testID`).
- `mobile-app/src/screens/AccountsScreen.tsx` — modified. Renders each account via
  `<AccountCard />` instead of a plain row; Add/Edit modal gained a horizontal color
  swatch picker wired to the new `color` field. B.3b added: `viewMode`
  ('stacked'/'list', defaults to 'stacked') and `expandedAccountId` state; stacking
  margin/zIndex/opacity math per section; a Cards/List segmented toggle in the TOTAL
  BALANCE banner; a "Collapse" chip in each section's header when that section has an
  expanded card.
- `mobile-app/src/components/AccountCard.tsx` — modified (B.3b). Added `isStacked` and
  `isExpanded` props; expanded cards get a white border highlight, deeper shadow, and a
  "Tap to edit" hint badge next to the group icon.
- `mobile-app/src/components/BottomSheet.tsx` — new (B.3c). Reusable bottom sheet
  component built on React Native's built-in `Modal` (`animationType="slide"`, no new
  dependencies). Props: `visible`, `onClose`, `title`, `children`, `testID`. Rounded top
  corners, drag-handle pill, tap-to-close backdrop, safe-area bottom padding, internal
  scrollable content capped at ~85% screen height with keyboard avoidance. Intended for
  reuse across every essential-screen add/edit flow in B.4a.
- `mobile-app/src/screens/AccountsScreen.tsx` — modified (B.3c). Add/Edit account now
  renders inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/state
  unchanged. Removed unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`
  styles.
- For the full file inventory through the end of Phase A, see PROGRESS1.md.

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
