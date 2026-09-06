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
- **B.4a (Bills) — Convert Add/Edit Bill to a bottom sheet — COMPLETE, VERIFIED ON
  DEVICE.** First screen converted in the rollout of `src/components/BottomSheet.tsx`
  (built in B.3c) to the other essential screens. Investigated all essential screens
  first: confirmed Bills, Debts, Loans, Transactions, Income, Savings, and three small
  modals inside Settings (Category, Payee, Rule) all still use the old centered-modal
  pattern; confirmed Calendar's modal is a read-only day-details viewer (not an add/edit
  form, no conversion needed) and Home/Dashboard screens have no modals at all.
  Confirmed `BottomSheet.tsx` needed zero changes to support any of these forms —
  fully generic via its `children` prop, and its existing ~85% screen height cap plus
  internal scroll comfortably fits even the taller forms. **Bills was chosen to go
  first** (over the simpler Savings form) specifically because it sits alongside Debts
  and Loans in the To-Pay tab and establishes the exact repeatable conversion pattern
  those two will follow next. Swapped `BillsScreen.tsx`'s centered
  `Modal`/`Pressable`/`KeyboardAvoidingView`/`ScrollView` wrapper for `<BottomSheet />`;
  confirmed it was the only modal in the file, with zero secondary dialogs affected.
  All form state, handlers, and validation (`nameInput`, `categoryInput`,
  `amountInput`, `priorityInput`, `notesInput`, `paymentMethodInput`, `recurTypeInput`,
  `onetimeDateInput`, `dayInput`, `monthInput`, `errorMsg`, `handleSave`, `handleDelete`)
  left completely untouched — same scope discipline as the B.3c Accounts conversion.
  Removed the now-unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`
  styles. `npx tsc --noEmit` clean (0 errors), diff reviewed line-by-line before
  approval, hand-pasted per standing small-fix policy, committed as
  "feat(bills): B.4a convert Add/Edit Bill to bottom sheet", pushed to `main`. Manually
  verified on-device: sheet slides up correctly; all fields work (name, category,
  amount, recurrence pills + conditional date fields, priority pills, payment method
  picker, notes); form scrolls smoothly; Save/Delete/Cancel all work as before.
- **B.4a (Debts) — Convert Add/Edit Debt to a bottom sheet — COMPLETE, VERIFIED ON
  DEVICE.** Second screen converted, following the exact same pattern established by
  Bills. Confirmed only one modal existed in `DebtsScreen.tsx` with no secondary
  dialogs. Swapped the centered `Modal`/`Pressable`/`KeyboardAvoidingView`/`ScrollView`
  wrapper for `<BottomSheet />`; all form state, handlers, and validation
  (`creditorInput`, `categoryInput`, `amountInput`, `recurTypeInput`,
  `onetimeDateInput`, `dayInput`, `monthInput`, `interestRateInput`,
  `minPaymentInput`, `feesPortionInput`, `paymentMethodInput`, `notesInput`,
  `errorMsg`, `handleSave`, `handleDelete`) left completely untouched. Removed the
  now-unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
  This form has 10+ fields (the most complex converted so far after Bills) and was
  confirmed to exceed `BottomSheet`'s 85%-screen-height cap on typical phones —
  unlike Bills, which mostly fit without scrolling, Debts genuinely relies on the
  sheet's internal scroll to reach Save/Delete/Cancel, and this was flagged and
  verified rather than assumed. `npx tsc --noEmit` clean (0 errors), diff reviewed
  line-by-line before approval, hand-pasted per standing small-fix policy, committed
  as "feat(debts): B.4a convert Add/Edit Debt to bottom sheet", pushed to `main`.
  Manually verified on-device: sheet slides up correctly; all fields work including
  interest rate, minimum payment, and fees portion; form scrolls smoothly all the way
  to Save/Delete/Cancel with nothing cut off; Save/Delete/Cancel all work as before.
- **B.4a (Loans) — Convert Add/Edit Loan to a bottom sheet — COMPLETE, VERIFIED ON
  DEVICE.** Third screen converted, completing the To-Pay tab trio (Bills, Debts,
  Loans). Investigated via a dedicated Antigravity prompt first: confirmed only one
  modal exists for Add/Edit Loan (a separate `LoanPayoffSimulatorModal` also lives in
  the file but is untouched — a distinct payoff-projection popup, not part of the
  Add/Edit form); mapped every form state variable, ref, and handler
  (`nameInput`, `loanTypeInput`, `directionInput`, `totalAmountInput`,
  `expectedPaymentInput`, `interestRateInput`, `recurTypeInput` + its conditional
  date fields, `paymentsInput` + the payment-log add/remove handlers, `errorMsg`,
  `handleSave`, `handleDelete`, `openAddModal`, `openEditModal`, `closeModal`);
  confirmed exactly 4 unused styles to remove
  (`modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`); flagged that — like
  Debts — the form (especially in Edit mode with the full payment log visible) exceeds
  `BottomSheet`'s 85%-screen-height cap and relies on its internal scroll to reach
  Save/Delete/Cancel. Swapped the centered
  `Modal`/`Pressable`/`KeyboardAvoidingView`/`ScrollView` wrapper for `<BottomSheet />`;
  all form state, handlers, and validation left completely untouched. Removed the
  4 now-unused styles. `npx tsc --noEmit` clean (0 errors), diff reviewed line-by-line
  before approval, hand-pasted per standing small-fix policy, committed as
  "feat(loans): B.4a convert Add/Edit Loan to bottom sheet", pushed to `main`. Manually
  verified on-device: sheet slides up correctly; all fields work including the payment
  log (add/remove entries, payment method picker) when editing an existing loan; form
  scrolls smoothly to Save/Delete/Cancel; the separate Payoff Simulator button still
  opens its own popup untouched.
- **B.4a (Bills, Debts, Loans) — the entire To-Pay tab trio — FULLY COMPLETE, ALL
  VERIFIED ON DEVICE.**
- **B.4a (Transactions) — Convert Add/Edit Transaction to a bottom sheet — COMPLETE,
  VERIFIED ON DEVICE.** Fourth screen converted. Investigated via a dedicated
  Antigravity prompt first: confirmed `TransactionsScreen.tsx` has two distinct modals
  — the Add/Edit Transaction form (the one being converted) and a separate CSV Import
  wizard (`CsvImportModal`, its own component, rendered independently and explicitly
  confirmed untouched by the conversion). Mapped every form state variable and handler
  before touching anything (label/amount/category/person-chip fields, auto-categorization
  via `computeAutoCategory`, payment method picker, receipt photo attach/remove,
  `handleSave`, `handleDelete`, `closeModal`); confirmed exactly 4 unused styles to
  remove (`modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`). Swapped the
  centered `Modal`/`Pressable`/`KeyboardAvoidingView`/`ScrollView` wrapper for
  `<BottomSheet />`; all form state, handlers, and validation left completely untouched.
  Removed the 4 now-unused styles. `npx tsc --noEmit` clean (0 errors), diff reviewed
  line-by-line before approval, hand-pasted per standing small-fix policy, committed as
  "feat(transactions): B.4a convert Add/Edit Transaction to bottom sheet", pushed to
  `main`. Manually verified on-device: sheet slides up correctly; label/amount entry and
  auto-categorization work; person chips and payment method picker work; receipt photo
  attach/preview/remove works; form scrolls smoothly to reach Save/Delete/Cancel with
  nothing cut off; "Import CSV" still opens its own separate, unaffected popup.
- **B.4a (Income, Savings, Settings modals) — Convert the remaining 5 Add/Edit forms
  to bottom sheets — COMPLETE, VERIFIED ON DEVICE.** Final batch of B.4a conversions,
  done in a single investigation pass covering Income, Savings, and 3 Settings modals
  (Category, Payee/Merchant, Categorization Rule). Investigated via a dedicated
  Antigravity prompt: located and confirmed all 5 as genuine add/edit forms (none
  were confirmation dialogs or pickers); confirmed `IncomeScreen.tsx` and
  `SavingsScreen.tsx` each have exactly one modal (no sibling dialogs); confirmed
  `SettingsScreen.tsx` has 3 *other* modals that must NOT be touched — Quick PIN setup
  (hosts `<SetPinScreen>`), the Secret Recovery Key generator, and the "sign out this
  device" confirmation — all three explicitly flagged as using `Modal`/`Pressable` and
  the `modalOverlay`/`modalCard`/`modalTitle` styles, meaning none of that import or
  those styles could be removed from `SettingsScreen.tsx` the way they were removed in
  every single-modal file before it. Mapped every form state variable and handler for
  all 5 forms before touching anything (Income: person/category/source-name/amount/
  frequency fields, all 4 frequency-conditional date pickers, payment log add/remove;
  Savings: name/target-amount/target-date, contribution row add/remove; Category:
  name + 15-swatch color picker; Payee: name + default category; Categorization Rule:
  contains-text, min/max amount, target category). Swapped each centered
  `Modal`/`Pressable`(/`KeyboardAvoidingView`/`ScrollView` where present) wrapper for
  `<BottomSheet />`; all form state, handlers, and validation left completely
  untouched across all 5. Removed the 4 now-unused styles
  (`modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle`) from `IncomeScreen.tsx`
  and `SavingsScreen.tsx` only — deliberately left every one of those styles, plus
  `Modal`/`Pressable` in the import list, fully intact in `SettingsScreen.tsx` since
  the 3 other modals there still depend on them. `npx tsc --noEmit` clean (0 errors),
  diff reviewed line-by-line before approval, hand-pasted per standing small-fix
  policy, committed as "feat(income,savings,settings): B.4a convert remaining add/edit
  forms to bottom sheets", pushed to `main`. Manually verified on-device: Income add/
  edit works across all frequency variants (monthly/semimonthly/weekly/biweekly/
  onetime) plus payment log add/remove; Savings add/edit works with contribution row
  add/remove; Settings → Categories add/edit + color swatch picker works; Settings →
  Merchants & Payees add/edit works; Settings → Categorization Rules add/edit works;
  and — critically — the 3 untouched Settings modals (Quick PIN setup, Secret Recovery
  Key, sign-out-this-device confirmation) were separately re-tested and confirmed
  still fully functional.
- **B.4a — ALL essential-screen Add/Edit flows converted to bottom sheets — FULLY
  COMPLETE, ALL VERIFIED ON DEVICE.** Accounts (B.3c), Bills, Debts, Loans,
  Transactions, Income, Savings, and the 3 Settings modals (Category, Payee,
  Categorization Rule) are all done. Calendar (read-only day-details modal) and
  Home/Dashboard (no modals) needed no conversion, confirmed during initial B.4a
  investigation.
- **B.4b-1 (Bills, pilot) — Build reusable `<CollapsibleRow />` and convert the
  Bills list to tap-to-expand — COMPLETE, PENDING ON-DEVICE VERIFICATION.**
  Investigated first via a dedicated Antigravity report-only pass across every
  essential list screen (Bills, Debts, Loans, Transactions, Income, Savings, plus
  the 3 Settings sub-lists) before writing any code: confirmed Accounts already has
  its own B.3b fanned-card expand pattern and should stay untouched; confirmed the
  3 Settings sub-lists (Categories, Merchants & Payees, Categorization Rules) are
  too thin on secondary detail to benefit, and Rules' reorder arrows would conflict
  with a tap-to-expand gesture on the same row — all 3 explicitly excluded from
  B.4b. Confirmed Calendar's day-tap dialog is a read-only projection view, not an
  editable record list, and is out of scope. Built new
  `src/components/CollapsibleRow.tsx`: a reusable component (`collapsedContent`/
  `expandedContent` slots, `isExpanded`/`onToggle` controlled by the parent so only
  one row is expanded at a time, an optional `onEdit` callback rendering a
  dedicated "Edit" button inside the expanded drawer, a chevron icon that flips
  based on state, `LayoutAnimation.easeInEaseOut` for the expand/collapse
  animation — no new dependencies, confirmed `react-native-reanimated` is not in
  `package.json`) themed via the app's existing `useTheme()`/`colors` pattern.
  Converted `BillsScreen.tsx` as the pilot screen (chosen first, mirroring how
  B.4a also converted Bills before Debts/Loans/etc.): collapsed rows show exactly
  what they showed before (name, recurrence + due date + category, amount);
  expanded rows add full recurrence detail, payment method (read from the bill's
  most recent cycle — `bill.cycles[0].paymentMethod`, confirmed against the real
  `BillCycle` type rather than assumed), a priority badge (high/medium/low, styled
  per severity using real theme colors — `colors.errorBg`/`colors.error` for high,
  `colors.orange` for medium), and notes, each only rendered if actually set on
  that bill. Tapping a bill row now expands/collapses it in place; the dedicated
  "Edit" button inside the expanded drawer is what opens the existing Add/Edit
  bottom sheet (a plain tap on the row body no longer jumps straight to editing).
  The proposed diff was applied directly to the working tree once by Antigravity
  for verification purposes only — real `npx tsc --noEmit` output (0 errors), the
  real `theme.ts` color list, the real `Bill.priority` and `BillCycle.paymentMethod`
  type definitions, and a real `git diff --stat` were all checked against the
  actual repo before anything was hand-applied — then fully reverted
  (`git checkout` + file deletion, confirmed clean via `git status`) before the
  person applied the same content by hand via find/replace paste. `npx tsc --noEmit`
  confirmed clean again after the hand-paste. **  Still needs a manual on-device pass**
  (expand/collapse animation, Edit button routing to the bottom sheet, priority
  badge colors, notes/payment-method conditional rendering) before this is
  considered fully verified — not yet done as of this entry.
- **B.4b-2 (Loans only) — Convert the Loans list to tap-to-expand via
  `<CollapsibleRow />` — CODE COMPLETE, PENDING ON-DEVICE VERIFICATION.
  Debts not yet converted.** Hand-pasted per standing small-fix policy rather
  than Antigravity-applied. The paste introduced a run of `npx tsc --noEmit`
  syntax errors, resolved across 3 rounds of Antigravity report-only
  investigation (real file contents shown each round, no fixes applied
  without first seeing the actual current state):
  1. A stray leftover `v` character had overwritten the entire loans-list
     block during the paste, deleting the opening `<TouchableOpacity
     style={styles.addButton}>` tag that its own matching closing tag still
     expected — cascading into "JSX expressions must have one parent
     element" and mismatched closing-tag errors from line 392 all the way to
     the bottom of the file. Fixed by restoring the missing
     `{loans.length === 0 ? ... : loans.map(...)}` block and the
     `<TouchableOpacity>`/`<Text>+ Add loan</Text>` wrapper around it.
  2. The reconstructed block initially used `<CollapsibleRow>` props
     (`title`/`subtitle`/`amountLabel`/`onPress`) and a helper function
     (`loanTypeLabel`) copied from an assumption about the component's shape
     rather than verified against it — both wrong. Confirmed the real
     `CollapsibleRowProps` type (`collapsedContent`/`expandedContent`/
     `isExpanded`/`onToggle`/`onEdit`/`testID`) and a real working usage
     example already in `DebtsScreen.tsx` (its own `expandedDebtId` state
     pattern, `styles.detailContainer`/`detailRow`/`detailLabel`/
     `detailValue`, and its `paymentMethodLabel()`/`fullRecurrenceDetail()`
     helpers) before rewriting the Loans block to match the real prop
     contract, using an inline `remaining`/`isExpanded` computation and
     `expandedLoanId` state instead of the nonexistent `loanTypeLabel()`.
  3. That rewrite introduced two smaller issues, both confirmed against real
     file content before fixing rather than guessed at: (a) `expandedLoanId`
     was accidentally declared twice near the top of the component (the
     variable already existed in the file from an earlier point in the same
     paste), and (b) the new JSX referenced `styles.debtCollapsedRow`/
     `debtRowMain`/`debtName`/`debtSub`/`debtAmount` — real style names, but
     from `DebtsScreen.tsx`, not `LoansScreen.tsx`. Confirmed
     `LoansScreen.tsx`'s own real `makeStyles(colors)` output already has
     equivalent styles under different names (`loanCollapsedWrap`/
     `loanRowTop`/`loanRowMain`/`loanName`/`loanSub`/`loanAmount`) and
     swapped to those instead of adding new duplicate styles.
  `npx tsc --noEmit` clean (0 errors) after all three rounds, committed and
  pushed this session. **Not yet manually verified on-device** (expand/
  collapse, Edit button opening the bottom sheet, remaining-balance display)
  — pending, same as B.4b-1.
- **B.4b-2 (Debts) — confirmed already complete, no changes needed.** Before
  starting the Debts conversion, sent a dedicated investigation-only prompt
  to Antigravity to check the real current state of `DebtsScreen.tsx` first,
  since it was the original screen the `<CollapsibleRow />` pattern was
  copied from for Bills and Loans in earlier sessions. Confirmed via real
  file content (not assumed): `DebtsScreen.tsx` already renders its list
  through `<CollapsibleRow />` (`expandedDebtId` state, `onEdit` opening the
  edit bottom sheet, `paymentMethodLabel()`/`fullRecurrenceDetail()` helpers,
  `detailContainer`/`detailRow`/`detailLabel`/`detailValue`/
  `detailNotesText` styles) exactly matching the shape Bills and Loans were
  converted to follow. No diff was needed or applied. **B.4b-2 (Debts and
  Loans) is now fully complete** — Loans' code is done pending on-device
  verification (see above); Debts' code and on-device behavior were already
  in place from before this checkpoint was tracked.
- **B.4b-3 (Transactions, Income, Savings Goals) — Convert all three lists to
  tap-to-expand via `<CollapsibleRow />` — CODE COMPLETE, PENDING ON-DEVICE
  VERIFICATION.** Investigated first via a dedicated Antigravity report-only
  pass confirming none of the three screens had been converted yet (all three
  still used a plain `TouchableOpacity` row opening the edit sheet directly on
  tap), and pulling the real current state of each file's list-rendering code,
  state variables, helper functions, and `makeStyles(colors)` output before
  writing anything — deliberately avoided repeating the B.4b-2 mistake of
  guessing at prop names or reusing style names from a sibling screen. Also
  pulled the real, complete contents of `CollapsibleRow.tsx` itself and a real
  working usage example from `DebtsScreen.tsx` before writing any conversion
  code, rather than relying on the general shape described in this file.
  Converted all three: **Transactions** (expanded drawer shows full date, type,
  direction, and "Belongs To"; non-manual/derived entries get no `onEdit` and
  show a "edit on its own tab" note instead — confirmed the separate
  `CsvImportModal` import wizard is untouched); **Income** (expanded drawer
  shows category, "Belongs To", and a logged-payments summary with count and
  total); **Savings Goals** (expanded drawer shows remaining amount, number of
  contributions logged, and the most recent contribution's date/amount).
  Added `expandedTxnId`/`expandedIncomeId`/`expandedGoalId` state to each
  respective screen; added `txnCollapsedRow`/`rowCollapsedRow`/
  `goalCollapsedWrap` plus shared `detailContainer`/`detailRow`/`detailLabel`/
  `detailValue` styles to each file's `makeStyles(colors)`. All three hand-pasted
  by the person per standing small-fix policy (not Antigravity-applied).
  `npx tsc --noEmit` confirmed clean (0 errors) after all three pastes.
  **Not yet manually verified on-device** (expand/collapse animation, Edit
  button routing to the bottom sheet for Income/Savings, the disabled-edit
  behavior on non-manual Transaction rows, and the logged-payments/
  contribution summary text) — pending, same outstanding gap as B.4b-1/B.4b-2.
- **B.4b (Bills, Debts, Loans, Transactions, Income, Savings Goals) — FULLY
  COMPLETE, ALL SIX VERIFIED ON DEVICE.** A pre-verification code review
  (Antigravity, investigation-only) confirmed all six screens' `expanded*Id`
  state, `onToggle`/`onEdit` wiring, and `makeStyles(colors)` style
  definitions were correct, and that `LayoutAnimation.configureNext()` fires
  before the state update on every call site. It also flagged several
  harmless leftovers from the hand-paste conversions (an unused `Platform`
  import in Bills/Debts/Loans/Transactions, an unused `loanProgressPct()`
  helper and two unused `progressTrack`/`progressFill` styles in
  `LoansScreen.tsx`, and one line where two `useState` declarations had been
  merged onto a single line) — all cleaned up, `npx tsc --noEmit` clean,
  committed as `3a48191`. Manual on-device testing then confirmed expand/
  collapse, single-row-open-at-a-time behavior, and Edit-button routing
  work correctly on all six screens, including Transactions' non-manual
  entries correctly showing "edit on its own tab" with no Edit button.
- **Real bug found during B.4b on-device testing, root-caused and fixed:
  Firestore rule regression silently broke cloud backup for every existing
  profile — COMPLETE, VERIFIED FIXED ON DEVICE.** Every single account
  save during testing triggered a "Backup Failed" alert. Investigated via
  Antigravity (real code + real git diff/log review, no guessing): the
  Tier 1 security fix (`03df99b`, from before Phase B) had added a strict
  `resource.data.ownerUid == request.auth.uid` check to the
  `profileBackups` collection's `allow update` rule — correct for new
  documents, but any backup document that existed *before* that fix has no
  `ownerUid` field stored on it at all, so the direct-equality check always
  failed and Firestore rejected the write for every pre-existing profile.
  This had actually been failing silently since `03df99b` — an unrelated
  later fix (`70431f9`, wiring up the "Backup Failed" alert itself, done to
  close a different Tier 2 finding) just made the pre-existing failure
  visible for the first time. Fixed by changing the `allow update` rule to
  use `resource.data.get('ownerUid', request.auth.uid)` — the same
  fallback-to-self pattern already used by the sibling `allow get` rule and
  by `householdKeys`'s own rules — so a legacy document with no `ownerUid`
  yet is treated as already belonging to whoever's currently signed in and
  saving it. Also added a `console.error(...)` logging the real underlying
  error in `DataContext.tsx`'s catch block, so a future recurrence would be
  diagnosable from device logs instead of only showing the generic
  user-facing alert.   `npx tsc --noEmit` clean, `firebase deploy --only
  firestore:rules` run and confirmed live via real deploy output, verified
  on-device — the "Backup Failed" alert no longer appears on save.
- **B.5 (UI/UX psychology pass) — investigation + Batch 1 + Batch 2 fixes applied,
  CODE COMPLETE, PENDING ON-DEVICE VERIFICATION.** Ran a report-only Antigravity
  audit across all 9 essential screens against 10 UX/psychology principles (Hick's
  Law, Fitts's Law, Gestalt/proximity, Miller's Law, progressive disclosure, color
  psychology, trust markers, Picture Superiority Effect, persistent progress
  indicators, Jakob's Law). Report came back with real code shown for every finding,
  grouped by screen, plus a prioritized top-10 list. Two findings were explicitly
  rejected as out of scope for a UI polish pass rather than acted on: dropping
  username from sign-in (touches the real Firebase auth flow, not a UI tweak) and
  collapsing the 10-tab bottom nav down to 4-5 (a real architecture change needing
  its own dedicated checkpoint later). Everything else was split into two batches.
  **Batch 1** (7 unconfirmed-delete findings + sign-out confirmation, a stray
  duplicate "Appearance" header in Settings, and a missing disabled-button style on
  PinUnlockScreen's Unlock button) was applied directly via hand-pasted snippets —
  every delete action across Accounts, Bills, Debts, Loans, Transactions, Income, and
  Savings Goals now goes through a native `Alert.alert` confirm/cancel dialog before
  actually deleting, and Sign Out does the same. Hit a missing `Alert` import across
  7 files on first `npx tsc --noEmit` run — fixed by adding it to each file's
  `react-native` import line. **Batch 2** followed a second, more targeted
  investigation prompt (since the report-only findings for these didn't show enough
  surrounding code to safely diff blind) covering: the SavingsScreen EF/FI calculator
  backspace-snap-back bug (empty string was being treated as "use the stored value"
  instead of "the user cleared it" — fixed by switching the four input states from
  `useState('')` to `useState<string | null>(null)` and the display-value checks from
  `!== ''` to `!== null`); dynamic red/orange/green color-coding + a status label on
  the EF calculator's "Months Covered" result; hiding PinUnlockScreen's PIN input
  entirely when no PIN is configured, promoting the biometric retry button to primary
  styling instead; a working "Copy Recovery Key" button on CreateProfileScreen (added
  the `expo-clipboard` dependency via `npx expo install expo-clipboard`); LENT/
  BORROWED direction badges plus color-coded amounts on Loans list rows, and a second
  banner metric splitting "Owed (Borrowed)" from "Owed to You (Lent)"; debt amounts
  recolored from neutral ink to `colors.orange` on both the Debts banner and list
  rows; a green "Total Monthly Income" hero banner plus `+`-prefixed green amounts on
  Income (computed inline in the file, deliberately not moved into a shared
  `income.ts` export, to avoid touching a file not otherwise part of this pass); and
  the Home tab now mounts the real `<DashboardScreen />` in place of the old
  placeholder text, with a small custom header row (username + Set/Change PIN + Lock)
  layered on top so those two actions aren't lost. Two small mid-batch errors were
  caught and fixed the same session: an `IncomeScreen.tsx` reference to a nonexistent
  `styles.balanceBanner` (fixed by using the inline style directly instead of a `??`
  fallback to it), and a `CreateProfileScreen.tsx` reference to `copied`/`setCopied`
  state that was never declared (fixed by adding the missing `useState(false)` line
  once the real surrounding code — the other `useState` declarations already in the
  component — was seen). `npx tsc --noEmit` clean (0 errors) after both batches.
  Calendar (report finding #8) was deliberately left for a follow-up investigation
  during the original B.5 pass, since the day-cell container layout and full modal
  styles weren't shown in enough detail to safely restructure without guessing —
  since built as its own follow-up, see the new B.5 (Calendar) entry directly below.
- **B.5 (Calendar) — dot indicators + real event list in the day popup — CODE
  COMPLETE, TESTING DEFERRED (see 📌 Decisions above).** Investigated first via a
  dedicated Antigravity report-only pass confirming the real, full contents of
  `CalendarScreen.tsx` (day-cell row/column structure, full modal styles,
  confirmation that `useMemo` was not yet imported), rather than guessing at
  spacing the way the original B.5 report had flagged as a risk. Wired the existing
  `computeMonthEvents(model, year, monthIndex)` resolver (already built in
  `balanceProjection.ts`, returning a day-number-keyed map of bills/debts/loans/
  income/manual transactions/savings due that month) into the screen via a
  `useMemo`, recomputed only when `model`/`year`/`month` change. Each day cell now
  shows up to 4 small colored dots (one per item due that day, capped so a busy day
  doesn't overflow the cell) using a new `EVENT_DOT_COLORS` map keyed by
  `CalendarEvent['type']` (bill/debt/loan/income/saving/manual). The day-tap popup's
  old one-line placeholder sentence was replaced with a real, scrollable list of
  every item due that day (colored dot + label + formatted amount per row), falling
  back to "Nothing due on this day" when the map has no entry for that day. No new
  dependencies — `ScrollView` from `react-native` covers the scrollable list.
  `npx tsc --noEmit` clean (0 errors) confirmed by the person after pasting.
  Hand-pasted per standing small-fix policy. **This closes out every finding from
  the original B.5 UI/UX psychology audit — Batch 1, Batch 2, and Calendar are all
  now code-complete.**
- **B.6a + B.6b — Reusable `<DateField>` component built and rolled out to every
  remaining date-entry field app-wide — CODE COMPLETE, PENDING ON-DEVICE VERIFICATION.**
  Investigated first via a dedicated Antigravity report-only pass confirming, screen by
  screen, that every date value in the app is stored as a plain `string` in `'YYYY-MM-DD'`
  format (never a `Date` object), validated everywhere via the same
  `/^\d{4}-\d{2}-\d{2}$/` regex, and that `@react-native-community/datetimepicker` was
  not yet installed. Explicitly confirmed which fields are real calendar dates (in
  scope) versus recurrence-pattern inputs — day-of-month (1–31), month+day (annual),
  and day-of-week pill selectors on Bills/Debts/Loans/Events/Income — which are **not**
  calendar dates and were correctly left untouched. Installed
  `@react-native-community/datetimepicker` via `npx expo install`. Built new
  `src/components/DateField.tsx`: wraps the native picker, rendering it as Android's
  native `DatePickerDialog` (which layers over a `Modal` without conflict) versus an
  inline iOS calendar card with its own "Done" button (avoiding the known iOS
  nested-`Modal` conflict, since every form in this app already renders inside
  `<BottomSheet />`'s own `Modal`); timezone-safe ISO parsing (`[y, m, d]` construction,
  never `new Date(isoString)`, to avoid a UTC-midnight day-shift bug in western
  timezones); a friendly formatted-date display (e.g. "Mar 15, 2025") instead of the
  raw ISO string; optional `clearable`/`label`/`placeholder`/`testID`/`style` props;
  styled to match the app's existing input fields via the real `theme.ts` color tokens.
  Converted all 9 remaining date-entry fields across the app: `TransactionsScreen.tsx`
  (transaction date), `BillsScreen.tsx` (one-time due date), `DebtsScreen.tsx`
  (one-time due date), `LoansScreen.tsx` (one-time due date, custom-schedule start
  date, and the payment-log date field), `IncomeScreen.tsx` (one-time income date and
  the payment-log date field), `SavingsScreen.tsx` (target date and the contribution-row
  date field), `GoalsScreen.tsx` (target date), `EventsScreen.tsx` (one-time event
  date), and `TravelScreen.tsx` (trip start date and end date). The first 4 files
  (Transactions, Bills, Debts, Loans) matched the initial investigation's proposed
  code exactly and were pasted directly. The remaining 5 files' real code did not match
  the initial proposal closely enough to paste blind — a second, narrower
  investigation-only prompt pulled the real, literal, unparaphrased code for each of
  those 9 remaining fields before any replacement snippet was written, avoiding a
  repeat of an earlier session's guess-then-fix cycle (see 📌 Decisions below). All 9
  files hand-pasted by the person per standing small-fix policy, not Antigravity-applied.
  `npx tsc --noEmit` clean (0 errors) after all 9 files. **Not yet manually verified
  on-device** (native date picker opening/closing correctly on both iOS and Android,
  the clearable "×" button, correct date formatting  files, and no visual regressions on any of the 9 converted screens) — added to
  the running on-device checklist per the current batched-testing policy.
- **B.7 prep work: biweekly income anchor date + expanded monthly obligations
  baseline — CODE COMPLETE, PUSHED.** Before building "Left to Spend" itself, fixed
  two real gaps it depends on. Fix 1: biweekly income sources previously had no way
  to store an anchor payday date, so `computeNextPayDate()` could never resolve a
  next payday for them. Added a "When was your most recent payday?" date field to
  the biweekly branch of `IncomeScreen.tsx` (using the existing `DateField`
  component), and added a real 14-day-increment biweekly branch to
  `computeNextPayDate()` in `income.ts`. Fix 2: the "monthly expense baseline" figure
  (used by the Emergency Fund/FI calculators, and about to be reused as the basis
  for Left to Spend's caution threshold) previously only counted recurring bills —
  it ignored debts and loan payments entirely. Added a new exported
  `computeMonthlyObligationsBaseline(bills, debts, loans)` function in
  `balanceProjection.ts` that combines bills + debt minimum payments (falling back
  to the latest cycle's amount due if no minimum payment is set) + borrowed-loan
  expected payments (loans marked "lent" are excluded, matching how the rest of the
  app already treats lent loans). Deleted the old, now-unused
  `computeMonthlyExpenseBaseline()` from `SavingsScreen.tsx` and updated its one
  call site to use the new combined function instead. Both fixes were reviewed as
  real diffs before approval, hand-pasted via find/replace snippets (with one
  missing-import round-trip needed — `computeMonthlyObligationsBaseline` wasn't
  actually imported into `SavingsScreen.tsx` on the first pass; found the real
  import line via `Select-String` rather than guessing, then fixed). `npx tsc
  --noEmit` clean, committed and pushed.
- **B.7 ("Left to Spend" hero stat) — design decisions made, build not yet started.**
  See 📌 Decisions below for the full definition and color scheme agreed on so far.
- **B.7 prep, part 2: Settings-placement investigation prompt drafted, not yet run.**
  Wrote a dedicated investigation-only prompt for Antigravity covering: the real,
  current list of `SettingsScreen.tsx` section headers and the real JSX of whichever
  section already has a tunable number/preference (to match its visual pattern); the
  real JSX/state of `SavingsScreen.tsx`'s EF/FI calculator inputs (the closest existing
  "financial assumption the person tunes themselves" example); how settings are
  currently persisted (AsyncStorage vs. the household model/Firestore) so the new
  `cautionThresholdPercent` field syncs across a linked household rather than being
  stuck on one phone; and whether a   slider component is already installed. Session ended before this was run —
  prompt is ready to paste into Antigravity at the start of next session, response not
  yet reviewed.
- **B.7 ("Left to Spend" hero stat + the Settings caution-threshold control) —
  CODE COMPLETE, `npx tsc --noEmit` CLEAN, PENDING ON-DEVICE VERIFICATION.** Ran
  the drafted Settings-placement investigation prompt from the prior session.
  Confirmed: `notifyDaysBefore` is the exact right pattern to copy — a plain
  field on `model.settings`, saved via `saveModel()`, syncing across every
  linked household member automatically; no slider dependency is installed
  anywhere in the app; and given `notifyDaysBefore` already proves out a plain
  number field works fine for this kind of setting, went with a plain 0–100
  number input instead of adding `@react-native-community/slider` as a new
  dependency for one control. A second investigation confirmed the real
  `useData()` hook shape, `formatPeso`'s real import path/signature, the real
  top-of-file imports and 4 relevant style keys in `DashboardScreen.tsx`, and
  that `balanceProjection.ts` has no existing import relationship with
  `income.ts` (so importing `computeNextPayDate` into it introduces no
  circular-import risk). Added `cautionThresholdPercent: number` to the
  `Settings` type and `defaultModel.ts` (default `20`). Added two new exports
  to `balanceProjection.ts`: `computeLeftToSpend(model, today?)` — resolves the
  earliest upcoming payday across every income source via the existing
  `computeNextPayDate()`, falls back to the last day of the current month if
  none resolve, and projects the balance to that date via the existing
  `computeRunningBalances()` — and `getLeftToSpendStatus(amount, model, colors)`
  — the same three-tier red/orange/green shape as `SavingsScreen.tsx`'s
  `getEfStatus()` (red if negative, green at/above `cautionThresholdPercent`%
  of `computeMonthlyObligationsBaseline()`, orange in between). Added a new
  "Left to Spend" section to `SettingsScreen.tsx`, placed directly after
  Notifications, styled identically to the existing `notifyDaysBefore` row
  (same `notifyInput` style, same on-blur save pattern) with its own
  `cautionThresholdInput` state and `saveCautionThreshold()` handler. Added the
  hero stat card itself directly to `HomeScreen.tsx` (not `DashboardScreen.tsx`
  — kept in the smaller, fully-visible file per the investigation), reading
  `model` via `useData()` and rendering the projected amount, its color-coded
  status label, and a small "until your next payday" / "through end of month"
  caption underneath. One assumption was explicitly flagged rather than
  silently guessed at: `model.income` as the field name on `HouseholdModel`
  was inferred (not directly confirmed in any investigation pass) from
  `IncomeSource` already being imported into `balanceProjection.ts` — flagged
  to the person as something to watch for in the `npx tsc --noEmit` output.
  All 5 files hand-pasted by the person per standing small-fix policy.
  `npx tsc --noEmit` confirmed clean (empty output, 0 errors) this session —
  the `model.income` assumption held. **Not yet manually verified on-device**
  (the Settings number field saving/persisting correctly, the hero card
  rendering with the right color/label, and the payday-vs-end-of-month
  fallback behaving correctly with zero or multiple income sources) — added
  to the running on-device checklist per the current batched-testing policy.
- **7 bugs from the full on-device testing pass — ALL CODE-COMPLETE, PENDING ON-DEVICE
  VERIFICATION.** Investigated via Antigravity (report-only, real code shown for every
  claim) across two rounds — an initial investigation, then a targeted follow-up
  verifying 6 function/component signatures (`deriveKey`, `decryptJSON`,
  `loadWrappedHouseholdKey`, `unwrapHouseholdKey`, `loadEncryptedProfileData`,
  `PasswordField`'s real props, `getNextDueDate`) before approving the two fixes that
  depended on them, per standing policy of never approving a fix referencing unverified
  code. One design question (a manual biometric-priority toggle) was raised, investigated,
  and explicitly rejected in favor of just fixing the underlying detection bug — see
  📌 Decisions below. All fixes hand-pasted by the person; `npx tsc --noEmit` confirmed
  clean (0 errors) after several rounds of fixing paste-introduced errors (a stray
  overwritten JSX block in `LoansScreen.tsx`-adjacent files, misplaced `await` inside a
  `useEffect`, a wrong function name reference, and an undefined theme color) — resolved
  each time by requesting real current file content before proposing a correction, not
  guessing from the error text alone.
  - **Fixed:** Biometric label always said "Face ID," even on fingerprint-only Android
    devices. Root cause: Android's OS reports facial-recognition hardware capability at
    the system level even when the phone's actual biometric setup is fingerprint-only,
    and the old code checked for facial recognition first. `getBiometricLabel()` in
    `biometrics.ts` now branches on `Platform.OS`: iOS keeps Face ID/Touch ID detection
    unchanged; Android now checks fingerprint first and only falls back to "Face Unlock"
    wording if fingerprint genuinely isn't available. A manual preference toggle (letting
    the person pick which biometric to prioritize) was considered and explicitly rejected
    — Android's OS decides which sensor prompt actually appears regardless of app-level
    preference, so a toggle would only let the person override an already-correct label,
    not control real sensor behavior.
  - **Fixed:** No way to turn PIN unlock back off. Settings > Security's Quick Unlock
    section now shows a "Turn Off" button alongside "Change PIN" whenever a PIN is
    configured, with a native `Alert.alert` confirmation before removing it via the
    already-existing `removePin()` function in `pin.ts`.
  - **Fixed:** "Copy Recovery Key" button was missing from Settings — it only existed on
    the one-time account-creation screen. Added the same copy-to-clipboard (via the
    already-installed `expo-clipboard` dependency) + transient "Copied! ✓" confirmation
    pattern to Settings > Security's Secret Recovery Key section.
  - **Fixed:** Save button felt slow/unresponsive on Bills (pattern established; the
    other 6 essential screens still need the same treatment — see ⚠️ Known issues below).
    `handleSave` now sets a `saving` state before awaiting the cloud write, disables the
    Save button and shows an `ActivityIndicator` in its place while in flight, and clears
    the state in a `finally` block regardless of success/failure — prevents duplicate
    taps queuing up concurrent saves.
  - **Fixed:** Bills' and Loans' collapsed list-row summary lines now match Debts' order
    (category → repeat/one-time → date). Loans' row previously showed only the loan type
    with no recurrence or date info at all — now computes its own `nextDue` via the
    already-existing `getNextDueDate()` helper (confirmed reusable as-is; Loans already
    imported `RecurringType` and had no conflicting local computation) and shows
    type → recurrence → next due date → interest rate (if set).
  - **Fixed:** Lock screen's "Use password instead" previously signed the person all the
    way out and re-showed the full email+username+password Create/Sign-In screen.
    `PinUnlockScreen.tsx` now supports an in-place "password mode": toggling it reveals a
    password-only field (using the existing `PasswordField` component, confirmed via its
    real props interface — no `autoFocus` prop exists on it, so that was dropped from the
    proposal rather than added to the component), plus an account chooser chip row shown
    only when more than one profile has signed in on this device (`loadProfilesIndex()`).
    Submitting derives the key from the typed password (`deriveKey`) and confirms it by
    attempting to unwrap the household key or decrypt the stored profile data — success
    unlocks in place without touching the Firebase session or device-session record; failure
    shows "Incorrect password — try again." A "Sign in to a different account" ghost button
    still routes to the real full sign-out for the one case that genuinely needs it. Session/
    device revocation is untouched — a remotely-revoked session still forces the full
    sign-in screen via the existing `handleRemoteRevoked()` path in `App.tsx`, unrelated to
    this change.
  - **Documented as an accepted platform limitation, no code change:** Calendar's native
    date-picker popup looking visually inconsistent on Android. Investigated feasibility of
    a themed custom calendar UI on Android and concluded it's technically possible but not
    worth the risk — it would require an inline (non-modal) calendar component crammed into
    forms already constrained to `<BottomSheet />`'s 85%-height cap, creating real layout/
    keyboard-collision problems, for a cosmetic mismatch most Android users won't find
    unusual (native `DatePickerDialog` is what Android apps normally look like).
- **Full on-device testing pass — COMPLETE across B.4b, B.5 (Batch 1 + Batch 2 +
  Calendar), B.6 (all 9 date fields), and the older loose ends (IntroScreen timing,
  the `profileBackups` rule fix on a linked profile).** The master checklist that had
  been deliberately deferred since the "testing is batched, not per-checkpoint"
  decision was finally run end-to-end on a real device. The large majority of it is
  confirmed working exactly as built — see the updated ⚠️ Known issues below for the
  short list of real bugs and open questions this pass surfaced, which now take
  priority over continuing further down the B.7+ checklist.
- **B.8 (Category watchlists under Insights) — CODE COMPLETE, `npx tsc --noEmit`
  CLEAN, PENDING ON-DEVICE VERIFICATION.** Investigated first via a dedicated
  Antigravity report-only pass confirming: `InsightsScreen.tsx` is a pill-toggle
  switcher between `DashboardScreen.tsx` and `ReportsScreen.tsx` (Dashboard chosen
  as the right home for the new card); `Category` is a free-form, user-managed
  list stored on `HouseholdModel.categories` (not a fixed enum); and — the key
  discovery — `HouseholdModel` already has a real, unused `categoryBudgets:
  CategoryBudget[]` field (`{ id, category, monthlyBudget }`), already wired into
  `defaultModel.ts` and `mergeModels.ts`'s de-dupe-by-category-name merge logic,
  but with zero UI anywhere reading or writing it. A second investigation pass
  confirmed `categoryBudgets`/`CategoryBudget` genuinely have no UI usage
  app-wide (types/defaultModel/mergeModels only), and pulled
  `MonthlyCloseOutReport.tsx`'s existing inline "spend per category this month"
  logic as the pattern to generalize into a shared function rather than writing
  a fourth copy of it. Decided to build the watchlist directly on top of the
  existing `categoryBudgets` field (a watched category *is* a `categoryBudgets`
  entry, with `monthlyBudget` as its limit) rather than adding a new settings
  field, and to fold the management UI into `SettingsScreen.tsx` right next to
  the existing Categories section rather than a new standalone screen — decided
  after a follow-up investigation confirmed `SettingsScreen.tsx`'s real
  `useData()` → `saveModel()` save pattern and its real Categories
  add/edit/delete handler shapes to match against. Added two new exports to
  `transactions.ts`: `computeCategorySpend(model, category, monthPrefix)`
  (pulled out of `MonthlyCloseOutReport.tsx`'s inline logic) and
  `getCategoryBudgetStatus(spent, budget, colors)` — the same three-tier
  red/orange/green shape as `getEfStatus()`/`getLeftToSpendStatus()` (green
  under 80%, orange 80–99%, red at/over 100%, "No limit set" if budget is 0).
  Added a new "Watched Categories" card to `DashboardScreen.tsx`, shown only
  when `model.categoryBudgets.length > 0`, listing each watched category's
  spend-vs-limit and color-coded status. Added a new "Category Watchlist"
  section to `SettingsScreen.tsx` (new `watchCategoryInput`/`watchLimitInput`/
  `watchErrorMsg` state, `handleAddWatchedCategory()`/
  `handleRemoveWatchedCategory()` handlers using the real `saveModel()`
  pattern, duplicate-category-name and invalid-limit validation) directly
  below the existing "+ Add category" button. Hit one hand-paste error along
  the way — the Dashboard card's JSX block got pasted twice in a row, with the
  second copy landing outside the component's closing brace and breaking
  `npx tsc --noEmit` with 3 syntax errors. Investigated via a dedicated
  Antigravity report-only prompt (real file content around the error shown,
  not guessed from the error text) confirming the exact duplicate block and
  its boundaries; fixed by deleting the orphaned second copy. All snippets
  hand-pasted by the person per standing small-fix policy. `npx tsc --noEmit`
  confirmed clean (empty output, 0 errors) after the fix. **Not yet manually
  verified on-device** (adding/removing a watched category in Settings, the
  Dashboard card appearing/updating correctly, and the red/orange/green status
  coloring at different spend levels) — added to the running on-device
  checklist per the current batched-testing policy.
- **B.9 (Yours/Mine/Ours labels + transaction comments) — CODE COMPLETE, `npx tsc
  --noEmit` CLEAN, PENDING ON-DEVICE VERIFICATION.** Investigated in four rounds via
  Antigravity report-only prompts before writing anything, specifically to close a
  real fragility gap found during investigation: there was no existing link anywhere
  in the app between a household's `Person` records (`model.people`, shape `{ id,
  name, role? }`) and the `username` string of whichever profile is actually signed
  in on a device — `Person.role` ('primary'/'partner') was confirmed dormant and
  never read anywhere. Decided against name-matching (fragile, doesn't scale past
  2 people) in favor of an explicit, per-profile stored preference — the person's own
  proposed design: whatever a given profile enters shows as "Mine" on that profile's
  device, shows as that person's real name on every other linked profile's device
  (not a generic "Yours"), and anything explicitly assigned to `'shared'` shows as
  "Ours" everywhere. This scales to any number of household members with no extra
  logic, since there's no fixed "Yours" bucket — everyone just sees their own things
  as "Mine" and everyone else's by name.

  Built new `src/myPerson.ts` (same per-profile AsyncStorage pattern as `pin.ts`/
  `onboarding.ts`/`biometrics.ts`): `getMyPersonId()`/`setMyPersonId()`/
  `clearMyPersonId()`, keyed as `profile:${username}:my-person-id`. Added a "Which
  of these is you?" picker to `ProfileScreen.tsx`, rendered directly under the
  existing household member roster, listing `model.people` with a "This is me"
  indicator on whichever is currently selected — tapping a person calls
  `setMyPersonId()` and updates local state immediately. Added a `notes?: string`
  field to `ManualTransaction` (`types.ts`) and `TransactionEntry` (`transactions.ts`,
  confirmed via investigation to be that type's real home — an earlier message
  mislabeled its file as `types.ts`, caught and corrected before pasting), carried
  through in `transactions.ts`'s manual-transaction mapping. `TransactionsScreen.tsx`
  gained: a `notesInput` field (new Notes input in the Add/Edit form, populated on
  edit, saved on both the new-transaction and editing branches), a `myPersonId`
  state resolved via `getMyPersonId(username)` in a `useEffect`, and a new
  `ownerLabel()` helper resolving a transaction's owner to "Mine" / "Ours" / "
  {Name}'s" — replacing the old "Belongs To: Shared"-only display in the expanded
  row, which now also shows the new Notes field for manual transactions.
  `PersonSpendingReport.tsx` was updated the same way — each person's report card
  is now labeled "Mine" instead of their own name when `p.id === myPersonId`, and
  the "Shared" card is now labeled "Ours".

  One real gap in the earlier investigation was caught and closed mid-session before
  any code was pasted: a prior response had asked the person to check which of two
  possible lines already existed in `TransactionsScreen.tsx` (`const { model,
  saveModel } = useData();` vs. one that already included `username`) and pick the
  right fix themselves — flagged as unacceptable per the person's explicit standing
  instruction going forward (see 📌 Decisions below) that Claude should always get
  the real answer itself before handing over any conditional/branching instruction.
  A follow-up investigation-only prompt confirmed the real line was
  `const { model, saveModel } = useData();` (no `username` yet), and a single,
  unconditional one-line fix was given instead.

  All edits hand-pasted by the person per standing small-fix policy; `npx tsc
  --noEmit` confirmed clean (empty output, 0 errors) after the full batch. **Not yet
  manually verified on-device** — needs checking: the "Which of these is you?"
  picker saves and persists correctly on `ProfileScreen.tsx`; a transaction's owner
  correctly shows as "Mine"/"Ours"/a real name in both Transactions and Person
  Spending; the new Notes field saves, edits, and displays correctly; and — a known,
  accepted gap, not yet fixed — the   picker currently only renders inside
  `ProfileScreen.tsx`'s "Linked" section, so a solo (unlinked) profile tracking more
  than one person has no way to set "which one is me" yet.
- **B.11 (Weekly spending recap push notification) — CODE COMPLETE, `npx tsc
  --noEmit` CLEAN, PENDING ON-DEVICE VERIFICATION.** Investigated via two rounds of
  Antigravity report-only prompts before writing anything. Round 1 confirmed the
  existing bill-alert notification system only ever uses a fixed one-time
  `SchedulableTriggerInputTypes.DATE` trigger (no recurring/weekly trigger type is
  used anywhere), that `rescheduleBillNotifications()` wipes and rebuilds *every*
  scheduled notification on every save/login/sync (9 real call sites across
  `App.tsx`/`DataContext.tsx`), and that a ready-made "last 7 days through today"
  spending calculation already exists in `WeeklyDigestReport.tsx`
  (`buildTransactionsList` + `transactionTotals`, both exported from
  `transactions.ts`). Round 2 confirmed the exact real import lines and export
  location for those two functions before writing any code. Decided: the recap
  shows a real peso amount (not a generic message); day/time are both
  person-configurable from Settings (defaulting to Sunday at 6 PM); and the
  "week" is the same rolling 7-day window the Weekly Digest report already uses,
  not a strict calendar Sunday–Saturday week.

  Added `weeklyRecapEnabled`/`weeklyRecapDay`/`weeklyRecapHour` to the `Settings`
  type and `defaultModel.ts` (default: off, Sunday, 18:00). Added
  `toDateKey()`/`nextWeeklyOccurrence()` helpers and a new weekly-recap
  scheduling block directly inside `rescheduleBillNotifications()` in
  `pushNotifications.ts` — placed there specifically so it survives every one of
  that function's 9 existing call sites automatically, rather than as a separate
  call that the wipe-and-rebuild cycle would silently delete. Added a "Weekly
  spending recap" toggle, a Sun–Sat day-pill picker, and an hour input to
  Settings > Notifications, reusing the existing `requestNotificationPermission()`
  flow and Android notification-channel setup — no separate permission prompt.

  One `npx tsc --noEmit` regression was hit and fixed after the initial paste: the
  new day-pill picker referenced 5 style names (`pillRow`/`pillButtonSmall`/
  `pillButtonActive`/`pillButtonText`/`pillButtonTextActive`) that don't exist in
  `SettingsScreen.tsx`'s own stylesheet — each screen has its own separate
  `makeStyles(colors)` block with no sharing between files. Investigated via a
  dedicated Antigravity report-only prompt confirming `IncomeScreen.tsx`'s real,
  already-working day-of-week picker uses those exact 5 names with real, working
  style definitions; copied those definitions into `SettingsScreen.tsx`'s own
  stylesheet rather than guessing at replacement names. `npx tsc --noEmit`
  confirmed clean (empty output, 0 errors) after the fix. All edits hand-pasted
  by the person per standing small-fix policy. **Not yet manually verified
  on-device** (toggle on/off, day-pill selection, hour input saving/persisting,
  and — hardest to verify without waiting a full week — the recap notification
  actually firing with a correct, current spending total) — added to the running
  on-device checklist per the current batched-testing policy.

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
  - **Claude must never hand the person a conditional/branching instruction that
    requires them to read code and decide which branch applies** (e.g. "if the file
    already says X, do Y; otherwise do Z") — that's exactly the kind of ambiguity
    that goes wrong quietly. Get the real, current answer via a targeted
    investigation-only prompt first, then give one single, unconditional fix.
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
- **New this session:** When a proposed conversion is meant to be applied identically
  across many files, don't assume a proposal written against the first file or two
  will match the literal code in the rest — confirm the real code for every remaining
  file (a second, narrower investigation pass if needed) before pasting, rather than
  discovering the mismatch only when Ctrl+F comes up empty. This session, 4 of 9 files
  matched the original proposal exactly; the other 5 needed their real code pulled
  fresh before correct replacement snippets could be written.
- **New this session:** When a hand-paste introduces new compile errors, don't
  guess at a fix from the error text alone — have Antigravity show the real,
  current file content around the error first (investigation-only, no
  changes applied), and only propose a correction once the actual broken
  state is confirmed. This session needed three such rounds in a row for one
  file (`LoansScreen.tsx`) —   each guess-first attempt would have introduced
  a *different* wrong assumption (wrong props, then wrong helper function,
  then wrong style names borrowed from a sibling screen) instead of
  progressing toward a fix.
- **New this session — testing is now batched, not per-checkpoint, until further
  notice.** Per explicit instruction, on-device manual testing is deliberately being
  held off across the remainder of Phase B (and any further checkpoints, until the
  person says otherwise) so features can be built back-to-back without pausing to
  test each one individually. `npx tsc --noEmit` after every change remains
  mandatory and unchanged — that's a compile-time safety net, not a substitute for
  on-device testing, and catches a different class of problem (syntax/type errors,
  not visual or behavioral bugs). When the person is ready to test, a single
  consolidated on-device checklist covering every untested item accumulated during
  this stretch will be provided, rather than testing screen-by-screen as before.
  Accepted trade-off, called out explicitly: this project's own history (Tier 1's
  silently-reverted recovery-key badge, the doubled cloud-backup calls, the
  Firestore ownerUid regression, several rounds of hand-paste syntax errors) shows
  bugs that compile cleanly can still slip through and only surface on a real
  device — batching many changes before the first real test increases how much
  ground has to be covered, and how hard it can be to isolate which specific change
    causing this problem, if one turns up. Proceeding this way at the person's
  explicit, informed request.
- **New this session — B.7 "Left to Spend" definition finalized.** "Left to Spend"
  = the existing day-by-day balance projection engine's projected balance on the
  household's next payday (the earliest upcoming payday across every income
  source, if there's more than one person/source), rather than a new, separate
  calculation. If no payday can be resolved (no income sources yet, or a household
  whose only income is biweekly with no anchor date set — now fixed, see above),
  falls back to "balance projected to the end of the current month" instead, with
  a small label under the number clarifying which one is being shown (e.g.
  "through end of month" vs. "until payday").
- **New this session — Left to Spend color coding: three tiers, not two.** Red =
  projected number is negative. Green = healthy. Amber/orange = positive but
  "cutting it close" — a mid-tier caution color, added after the person asked for
  one rather than just red/green.
- **B.7 finalized — caution threshold is a real Settings control, synced via
  the household model, in its own section.** `cautionThresholdPercent` (default
  `20`) lives on `model.settings`, right alongside `notifyDaysBefore`, so it
  syncs across every linked household member automatically the same way every
  other setting does — no separate AsyncStorage key. Rendered as a plain 0–100
  number field (matching `notifyDaysBefore`'s exact existing visual pattern),
  not a slider — no slider dependency exists in the app yet, and a plain
  number field was confirmed to work fine for this exact kind of setting. Lives
  in its own new "Left to Spend" section in `SettingsScreen.tsx`, placed
  directly after Notifications rather than folded into the Savings-screen EF/FI
  settings, since it's a Home-tab-facing setting, not a savings-calculator one.
  The hero stat itself lives directly in `HomeScreen.tsx`, not
  `DashboardScreen.tsx`.

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
- **Every item on the deferred on-device testing checklist has now been run on a
  real device — CONFIRMED WORKING** for: all delete confirmations (Accounts, Bills,
  Debts, Loans, Transactions, Income, Savings Goals) and Sign Out; the EF "Months
  Covered" red/orange/green status coloring; PinUnlockScreen's hide-the-PIN-box-when-
  none-is-set behavior; the "Copy Recovery Key" button on CreateProfileScreen; Loans'
  LENT/BORROWED badges + split banner; Debts' orange amounts; Income's green hero
  banner + `+`-prefixed amounts; Home showing the real Dashboard with its header row;
  Calendar's colored dots, real day-list popup, and empty-day fallback; all 9
  converted date fields (open/format/clear, nothing visually broken); and the
  `profileBackups` Firestore rule fix on a second, linked/household profile. The
  bullets below are the real bugs and open questions this testing pass actually
  surfaced — these are the new priority.
- **6 of the 7 testing-pass bugs are now CODE-COMPLETE (`npx tsc --noEmit` clean),
  PENDING ON-DEVICE VERIFICATION** — see the new ✅ Done entry above for full detail
  on each. The 7th (Calendar's Android date-picker styling) was investigated and
  documented as an accepted platform limitation rather than fixed. Still genuinely
  open:
- **Save-button spinner/disabled-state fix (Issue 7) has only been applied to
  Bills so far — the other 6 essential screens still need the same pattern.**
  `BillsScreen.tsx` now has the `saving` state + disabled/spinner Save button;
  `DebtsScreen.tsx`, `LoansScreen.tsx`, `TransactionsScreen.tsx`, `IncomeScreen.tsx`,
  `SavingsScreen.tsx`, and `AccountsScreen.tsx` still use the old plain Save button
  with no loading feedback. Rolling this out is a repeat of the same small pattern,
  not a new investigation.
- **EF/FI calculator backspace-to-empty — reported as still possibly not working,
  but needs more detail before it can be investigated.** Doesn't say which of the
  four inputs, or what happens after backspacing to empty (snaps to the old value?
  to a default? to "auto"?). The backspace-to-null fix was already applied to all
  four inputs in B.5 Batch 2, so before touching this again, get a precise repro:
  which field, and what it shows immediately after clearing it.
- **Unclear where the Savings-screen Save button navigates/scrolls to after saving
  a goal.** Flagged as confusing during testing; not yet investigated. Needs a look
  at `SavingsScreen.tsx`'s save handler to see what happens after a successful save
  (closes the sheet? scrolls to the row? nothing visible?) and whether that's right.
- **B.7 "Left to Spend" — not yet verified on-device.** Needs checking: the new
  "Left to Spend" number field in Settings saves and persists correctly (and
  syncs to a second linked device, if available); the Home tab hero card renders
  with the right amount, the right red/orange/green color, and the right
  "until your next payday" / "through end of month" caption; and the fallback
  to end-of-month behaves correctly for a household with zero income sources,
  and correctly picks the *earliest* payday for a household with more than one
  income source.
- **B.8 Category Watchlist — not yet verified on-device.** Needs checking:
  adding a watched category + limit in Settings saves and shows up correctly;
  removing one works and the Dashboard card disappears once none are left;
  the "Watched Categories" Dashboard card shows correct spend-vs-limit figures;
  and the red/orange/green status coloring actually changes correctly at the
  the 80%/100% thresholds as spend crosses them.
- **B.9 Yours/Mine/Ours + Notes — not yet verified on-device.** Needs checking:
  the "Which of these is you?" picker on `ProfileScreen.tsx` saves/persists and
  shows the right person selected on reopen; a transaction you entered shows
  "Mine" on your own device and your real name on a second linked device; a
  transaction explicitly set to shared shows "Ours" everywhere; the Person
  Spending report's card labels update the same way; and the new Notes field on
  a manual transaction saves, survives editing, and displays correctly in the
  expanded row. Also a known, accepted gap to revisit later (not a bug): the
  picker only appears inside the "Linked" section of `ProfileScreen.tsx` right
  now, so a solo/unlinked profile tracking more than one person's entries has
  no way to set "which person is me" yet.
- **B.10 Refund Tracker — not yet verified on-device.** Needs checking: the
  "Expecting a refund for this?" toggle only appears on money-out transactions,
  and disappears (replaced by an explanatory note) once a refund has already
  been marked received; typing a smaller "amount you expect back" than the
  original expense (a partial refund) saves and displays correctly; tapping
  "Mark as Received" creates a real linked income transaction that shows up in
  the Transactions total and Dashboard figures, and switches the badge from
  orange "REFUND PENDING" to green "REFUNDED"; tapping "Undo" removes that
  linked transaction, updates totals back down, and reverts the badge to
  Pending; and deleting an original expense that had already been marked
  received also removes its linked refund transaction, with no orphaned entry
  left behind in the list.
- **B.10 (Refund tracker) — CODE COMPLETE, `npx tsc --noEmit` CLEAN, PENDING
  ON-DEVICE VERIFICATION.** Investigated in two rounds via Antigravity report-only
  prompts before writing anything. Round 1 confirmed there was no existing
  "refund" concept anywhere in the codebase, pulled the real `ManualTransaction`/
  `TransactionEntry` shapes, found the app's existing "expected vs. actual"
  pattern (Bills' due/paid split, Income's expected/logged split, and — most
  relevantly — Travel checklist items' `expenseTransactionId` link, which creates
  a real linked transaction when checked and removes it when unchecked), and
  confirmed Dashboard's "Watched Categories" card (from B.8) as the right shape
  to model a new "Pending Refunds" summary against, plus confirmed no color token
  in `theme.ts` is unclaimed — every semantic color is already green/orange/red.
  Presented 3 design questions; decided: marking a refund "received" logs a real
  linked income transaction (not just a status label); partial refunds are
  supported (the expected-back amount can be typed separately from what was
  spent); and the "pending" badge reuses the existing orange "owed" color rather
  than adding a new token. Round 2 pulled the real, current Add/Edit transaction
  modal JSX, the full `useState` block, `openEditModal`/`resetForm`/`closeModal`,
  the real delete handler, the real `reconcileTravelChecklistTransactions`-style
  linked-transaction pattern (copied exactly rather than reinvented), the real
  `buildTransactionsList()` manual-transaction loop, and the real style block —
  confirming everything needed to write safe, non-guessed replacement snippets.

  Added two new optional fields to `ManualTransaction` in `types.ts`:
  `refundExpectedAmount?: number` (set while a refund is pending; supports
  partial refunds) and `refundTransactionId?: string` (set once received,
  pointing at the real linked income transaction — same pattern as Travel/Events'
  `expenseTransactionId`). In `TransactionsScreen.tsx`: added
  `refundTrackingEnabled`/`refundAmountInput` state; a new "Expecting a refund
  for this?" toggle shown only when `directionInput === 'out'` and the
  transaction isn't already refunded, revealing an "Amount you expect back"
  field pre-fillable to any amount (partial refunds); `resetForm`/`openEditModal`
  updated to reset/populate the new fields; `handleSave` now computes and saves
  `refundExpectedAmount` on both the new-transaction and editing branches;
  `performDelete` now also removes the linked income transaction if the deleted
  expense had already been refunded, so nothing orphaned is left behind; two new
  handlers, `handleMarkRefundReceived()` (creates the real linked "money in"
  transaction and stamps `refundTransactionId` on the original) and
  `handleUndoRefund()` (removes that linked transaction and clears the stamp,
  reverting to Pending); the expanded row now shows an orange "REFUND PENDING ·
  ₱X expected" badge with a "Mark as Received" button, or a green "REFUNDED ·
  ₱X" badge with an "Undo" button, plus a small note in the collapsed row's
  subtitle line ("· Refund pending" / "· Refunded"); 8 new styles added
  (`refundToggle`/`refundToggleActive`/`refundToggleText`/
  `refundToggleTextActive`/`refundBadge`/`refundBadgeReceived`/
  `refundBadgeText`/`refundActionButton`/`refundActionButtonText`).

  Both files hand-pasted by the person per standing small-fix policy (not
  Antigravity-applied). `npx tsc --noEmit` confirmed clean (empty output, 0
  errors) on the first paste, no error/fix rounds needed this time. On-device
  verification (toggle appears only on expenses, partial-refund amount entry,
  the orange Pending badge → Mark as Received → green Refunded badge → Undo
  round-trip, the linked transaction actually appearing in totals, and deleting
  an already-refunded expense correctly cleaning up its linked transaction) is
  deferred per the current batched-testing
- **B.11 Weekly spending recap — not yet verified on-device.** Needs checking:
  toggling it on/off in Settings saves and persists; the Sun–Sat day pills render
  with correct themed (gold-when-selected) styling now that the missing styles
  were added; the hour input saves on blur; and — since this can only really be
  confirmed by waiting for the scheduled time to arrive — that the notification
  actually fires at the chosen day/hour with a spending total that matches what
  the Weekly Digest report shows for the same 7-day window.

- **Pre-Phase-B audit findings — TIER 1, TIER 2, AND TIER 3 FULLY VERIFIED & COMPLETE**
  (the one exception — orphaned household docs — is a deliberate, documented deferral).
  Full finding-by-finding detail preserved in this file's session-entry history below.
- **B.2c cleanup: verify the actual on-device Settings/Profile UI once, before calling
  it fully closed — still open, more detail below since this was flagged as unclear
  during testing.** Everything was verified via `npx tsc --noEmit` (clean) and
  line-by-line diff review, but nobody has yet manually tapped through Settings →
  Profile Card → back on a real device/simulator since the ~1,025-line removal. What
  this specifically means: B.2c's cleanup deleted the entire duplicated Household
  section (roster, invite/link codes, peer recovery, etc.) that used to render
  directly inside `SettingsScreen.tsx`, leaving only the small Profile Card that now
  navigates to `ProfileScreen.tsx` for all of that. The open question is whether that
  removal left any leftover empty space behind in Settings — e.g. a container `View`
  with no content, extra scroll room, or a visible gap where that section used to sit
  — once you actually scroll through Settings on a device, tap into the Profile Card,
  and come back. Low risk given the clean compile and reviewed diff, but still not
  yet eyeballed.

- **IntroScreen animation timing — CONFIRMED FINE on a real device during this
  session's full testing pass.** No cut-off text or animation reported. Closed out.

- **Biometric unlock — CONFIRMED WORKING on a real device this session (the real
  Face ID/Fingerprint prompt, the debounce behavior, and the Settings toggle
  round-trip were all tested), but with one real bug found: the app always labels
  the prompt/UI "Face ID," even on a device enrolled for fingerprint only.** Tested
  on a device set up for fingerprint unlock, and the app still showed Face ID
  wording throughout (PinUnlockScreen's retry button, onboarding Step 2/3 copy, and
  the Settings toggle label — all driven by `getBiometricLabel()` in
  `biometrics.ts`). `getBiometricLabel()` needs to actually branch on which
  biometric type the device has enrolled (via
  `LocalAuthentication.supportedAuthenticationTypesAsync()`) rather than defaulting
  to Face ID wording. Not yet fixed — needs its own small investigate-then-fix pass.
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
- **New priority, ahead of B.7: fix the real bugs and open questions surfaced by this
  session's full on-device testing pass (see ⚠️ Known issues above for the full
  list)** — the biometric label bug, the missing "turn off PIN" option, the
  lock-screen password-only re-entry flow, the missing Recovery Key copy button in
  Settings, Calendar's Android date-picker styling, the Bills/Debts/Loans
  summary-line consistency pass, and the save-button responsiveness/loading-state
  issue. Two items need a quick clarification from the person before they can be
  investigated: exactly which EF/FI calculator field(s) still misbehave on
  backspace-to-empty, and what "where does the Savings Save button go" is actually
  describing.
- **Tier 1, Tier 2, and Tier 3 pre-Phase-B audit fixes are all fully verified and
  complete** (the orphaned household-doc cleanup is a deliberate, documented deferral).
- **B.1, B.2a, B.2b, B.2b-security, and B.2c are all complete.**
- **B.3 (B.3a + B.3b + B.3c) — Accounts tab redesign — is fully complete and verified
  on-device.**
- **B.4a is fully complete.** Every essential-screen Add/Edit flow now uses
  `<BottomSheet />` — Accounts, Bills, Debts, Loans, Transactions, Income, Savings, and
  the 3 Settings modals (Category, Payee, Categorization Rule). All verified on-device.
- **B.4b is fully complete and verified on-device**, including a real
  Firestore rule bug found and fixed along the way (see ✅ Done above).
- **B.5 (UI/UX psychology pass) — FULLY CODE-COMPLETE (Batch 1 + Batch 2 +
  Calendar), `npx tsc --noEmit` clean, testing deferred.** Per the new batching
  decision above, on-device testing is being held rather than done now. Remaining
  open question (not yet decided, no rush): whether to act on either of the two
  explicitly-deferred B.5 findings (sign-in credential simplification, 10-tab nav
  consolidation) as their own future checkpoints — revisit once B.5's checklist
  item is eventually tested, or sooner if the person wants to decide now.
- **B.6 (B.6a + B.6b) is fully code-complete.** A reusable `<DateField>` component now
  covers every real calendar-date input in the app; on-device testing is deferred per
  the batching decision above.
- **Continuing to build forward through the B.7+ checklist without pausing for
  on-device testing between items, per the batching decision above.** Each new
  checkpoint still gets `npx tsc --noEmit` verification and diff review before
  being marked code-complete; a running, growing on-device checklist is being
  kept in ⚠️ Known issues above so nothing gets lost by the time testing happens.
- **B.7 is code-complete** (see ✅ Done above) — "Left to Spend" hero stat on Home,
  plus its Settings caution-threshold control, both built and `npx tsc --noEmit`
  clean. On-device verification is pending per the current batched-testing policy
  (see the new checklist item in ⚠️ Known issues above).
- **B.8 (Category watchlists under Insights) is code-complete** (see ✅ Done
  above) — reuses the existing `categoryBudgets`/`CategoryBudget` model field
  (already defined but previously unused anywhere in the UI) as the watchlist
  itself. New `computeCategorySpend()`/`getCategoryBudgetStatus()` helpers in
  `transactions.ts`, a new "Watched Categories" card on `DashboardScreen.tsx`,
  and a new "Category Watchlist" management section in `SettingsScreen.tsx`.
  `npx tsc --noEmit` confirmed clean. On-device verification is pending per
  the current batched-testing policy.
- **B.9 (Yours/Mine/Ours labels + transaction comments) is code-complete** (see
  ✅ Done above) — a new per-profile `myPerson.ts` preference, a "Which of these
  is you?" picker on `ProfileScreen.tsx`, "Mine"/"Ours"/real-name owner labels in
  Transactions and Person Spending, and a new Notes field on manual transactions.
  `npx tsc --noEmit` confirmed clean. On-device verification is pending per the
  current batched-testing policy (see the checklist item in ⚠️ Known issues
  above). **B.10 (Refund tracker) is also code-complete** (see ✅ Done above) —
  a new `refundExpectedAmount`/`refundTransactionId` pair on `ManualTransaction`,
  an "Expecting a refund for this?" toggle with partial-refund support in the
  Add/Edit form, and Mark as Received/Undo actions that create and remove a real
  linked income transaction, mirroring the existing Travel-checklist linked-
  transaction pattern. `npx tsc --noEmit` confirmed clean. On-device verification
  is pending per the current batched-testing policy (see the new checklist item
  in ⚠️ Known issues above). **B.11 (Weekly spending recap push notification) is
  also code-complete** (see ✅ Done above) — a new `weeklyRecapEnabled`/
  `weeklyRecapDay`/`weeklyRecapHour` settings trio, scheduling folded directly
  into `rescheduleBillNotifications()` so it survives the existing
  wipe-and-rebuild cycle, and a Settings toggle + day-pill + hour picker reusing
  `IncomeScreen.tsx`'s existing pill styles. `npx tsc --noEmit` confirmed clean.
  On-device verification is pending per the current batched-testing policy (see
  the new checklist item in ⚠️ Known issues above). **B.12 (Expanded FI/
  retirement calculator) is the next unbuilt checkpoint**, whenever the person is
  ready to keep building forward. No investigation has been done on it yet.
- Checkpoint table below (B.4a shown as in-progress, not yet checked off since Loans/
  Transactions/Income/Savings/Settings modals remain):

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
  | ✅ B.4a | Convert essential-screen add/edit flows to bottom sheets (Accounts, Bills, Debts, Loans, Transactions, Income, Savings, 3 Settings modals) | Cards + bottom sheets pattern |
  | ✅ B.4b-1 | Build `<CollapsibleRow />`, convert Bills list to tap-to-expand (pilot) — verified on-device | Cards + bottom sheets pattern |
  | ✅ B.4b-2 | Roll `<CollapsibleRow />` out to Debts and Loans — verified on-device | Cards + bottom sheets pattern |
  | ✅ B.4b-3 | Roll `<CollapsibleRow />` out to Transactions, Income, and Savings Goals — verified on-device | Cards + bottom sheets pattern |
  | ✅ B.5 | UI/UX psychology pass — Batch 1 + 2 + Calendar all code-complete; on-device testing deferred per batching decision | Cross-generational research |
  | ✅ B.6a | Date picker, part 1 — reusable `<DateField>`, Transactions + Bills — code-complete, on-device testing deferred | Requested |
  | ✅ B.6b | Date picker, part 2 — rolled out to every remaining screen (Debts, Loans, Income, Savings, Goals, Events, Travel) — code-complete, on-device testing deferred | Requested |
  | ✅ B.7 | "Left to Spend" hero stat on Home tab — code-complete, on-device testing deferred | Simplifi-inspired |
  | ✅ B.8 | Category watchlists under Insights — code-complete, on-device testing deferred | Simplifi-inspired |
  | ✅ B.9 | Yours/Mine/Ours labels + transaction comments — code-complete, on-device testing deferred | Monarch-inspired |
  | ✅ B.10 | Refund tracker — code-complete, on-device testing deferred | Simplifi-inspired |
  | ✅ B.11 | Weekly spending recap push notification — code-complete, on-device testing deferred | Monarch-inspired |
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
- `mobile-app/src/screens/BillsScreen.tsx` — modified (B.4a). Add/Edit Bill now renders
  inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/state unchanged.
  Removed unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
- `mobile-app/src/screens/DebtsScreen.tsx` — modified (B.4a). Add/Edit Debt now renders
  inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/state unchanged.
  Removed unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
- `mobile-app/src/screens/LoansScreen.tsx` — modified (B.4a). Add/Edit Loan now renders
  inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/state unchanged.
  Removed unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
  `LoanPayoffSimulatorModal` (a separate payoff-projection popup) left untouched.
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.4a). Add/Edit
  Transaction now renders inside `<BottomSheet />` instead of a centered `<Modal>`;
  form logic/state unchanged. Removed unused
  `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
  `CsvImportModal` (a separate CSV import wizard) left untouched.
- `mobile-app/src/screens/IncomeScreen.tsx` — modified (B.4a). Add/Edit Income Source
  now renders inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/
  state unchanged (including all frequency-conditional fields and the payment log).
  Removed unused `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
- `mobile-app/src/screens/SavingsScreen.tsx` — modified (B.4a). Add/Edit Savings Goal
  now renders inside `<BottomSheet />` instead of a centered `<Modal>`; form logic/
  state unchanged (including contribution row add/remove). Removed unused
  `modalOverlay`/`modalKeyboardWrap`/`modalCard`/`modalTitle` styles.
- `mobile-app/firestore.rules` — modified. `profileBackups`'s `allow update`
  rule changed from a direct `resource.data.ownerUid == request.auth.uid`
  check to `resource.data.get('ownerUid', request.auth.uid) ==
  request.auth.uid`, matching the fallback pattern already used by the
  sibling `allow get` rule and by `householdKeys` — fixes legacy backup
  documents (created before the Tier 1 ownerUid rule) being unable to save
  at all. Deployed live via `firebase deploy --only firestore:rules`.
- `mobile-app/src/DataContext.tsx` — modified. Added `console.error('Cloud
  backup failed:', err)` inside `saveModel`'s cloud-backup catch block, so
  the real underlying error is now visible in device/Metro logs instead of
  only the generic user-facing "Backup Failed" alert.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (B.4a). 3 modals converted to
  `<BottomSheet />`: Add/Edit Category, Add/Edit Payee/Merchant, Add/Edit
  Categorization Rule — form logic/state unchanged for all 3. `Modal`, `Pressable`,
  and the `modalOverlay`/`modalCard`/`modalTitle` styles were deliberately **kept** in
  this file (not removed) since the Quick PIN setup modal, the Secret Recovery Key
  modal, and the "sign out this device" confirmation modal all still use them.
- `mobile-app/src/types.ts` — modified (B.7). Added `cautionThresholdPercent: number`
  to the `Settings` type.
- `mobile-app/src/defaultModel.ts` — modified (B.7). Added
  `cautionThresholdPercent: 20` to the default settings object.
- `mobile-app/src/balanceProjection.ts` — modified (B.7). Imports
  `computeNextPayDate` from `income.ts`; added `LeftToSpendResult` type,
  `computeLeftToSpend(model, today?)`, and `getLeftToSpendStatus(amount, model,
  colors)` — the household's projected balance on its next payday (or end of
  current month, as a fallback), plus the same red/orange/green tiering shape as
  `SavingsScreen.tsx`'s `getEfStatus()`.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (B.7). Added a new
  "Left to Spend" section (placed directly after Notifications) with a
  `cautionThresholdInput` state and `saveCautionThreshold()` handler, styled
  identically to the existing `notifyDaysBefore` row.
- `mobile-app/src/screens/HomeScreen.tsx` — modified (B.7). Imports `useData`
  and the two new `balanceProjection.ts` exports; computes `leftToSpend`/
  `leftToSpendStatus` and renders a new hero card above `<DashboardScreen />`
  showing the projected amount, its status color/label, and a payday/
  end-of-month caption.
- `mobile-app/src/transactions.ts` — modified (B.8). Added
  `computeCategorySpend(model, category, monthPrefix)` and
  `getCategoryBudgetStatus(spent, budget, colors)` — pulled the category-spend
  logic out of `MonthlyCloseOutReport.tsx`'s inline version into a shared,
  reusable function, plus the same three-tier red/orange/green status shape
  used elsewhere in the app.
- `mobile-app/src/screens/DashboardScreen.tsx` — modified (B.8). Imports the
  two new `transactions.ts` exports; added a new "Watched Categories" card
  (shown only when `model.categoryBudgets.length > 0`) listing each watched
  category's spend vs. limit with color-coded status.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (B.8). Added
  `watchCategoryInput`/`watchLimitInput`/`watchErrorMsg` state and
  `handleAddWatchedCategory()`/`handleRemoveWatchedCategory()` handlers (using
  the same `saveModel()` pattern as the existing Categories section); added a
  new "Category Watchlist" section (list + add form) directly below the
  existing "+ Add category" button.
- `mobile-app/src/myPerson.ts` — new (B.9). Per-profile "which household Person
  is me" preference, same AsyncStorage pattern as `pin.ts`/`onboarding.ts`/
  `biometrics.ts`: `getMyPersonId()`, `setMyPersonId()`, `clearMyPersonId()`,
  keyed as `profile:${username}:my-person-id`.
- `mobile-app/src/types.ts` — modified (B.9). Added `notes?: string` to
  `ManualTransaction`.
- `mobile-app/src/transactions.ts` — modified (B.9). Added `notes?: string` to
  `TransactionEntry`; the manual-transaction mapping in the unified list builder
  now carries `t.notes` through onto each `TransactionEntry`.
- `mobile-app/src/screens/ProfileScreen.tsx` — modified (B.9). Added
  `myPersonId` state (loaded via `getMyPersonId(username)`), and a new "Which of
  these is you?" picker rendered under the household member roster, listing
  `model.people` with a "This is me" indicator and tap-to-select via
  `setMyPersonId()`.
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.9). `useData()`
  now also destructures `username`; added `notesInput` and `myPersonId` state
  (the latter resolved via a `useEffect` calling `getMyPersonId`); `resetForm`/
  `openEditModal`/both `handleSave` branches now read/write `notes`; added a new
  `ownerLabel()` helper resolving a transaction's owner to "Mine" / "Ours" / "
  {Name}'s"; the expanded row now shows that label (replacing the old
  "Shared"-only text) plus a new Notes line for manual transactions; the
  Add/Edit form gained a new Notes text input.
- `mobile-app/src/screens/reports/PersonSpendingReport.tsx` — modified (B.9).
  Imports `getMyPersonId`; added `myPersonId` state resolved via a `useEffect`;
  each person's report card is now labeled "Mine" instead of their real name
  when `p.id === myPersonId`, and the shared card is now labeled "Ours" instead
  of "Shared".
- `mobile-app/src/types.ts` — modified (B.10). Added `refundExpectedAmount?:
  number` and `refundTransactionId?: string` to `ManualTransaction`.
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.10). Added
  `refundTrackingEnabled`/`refundAmountInput` state; a conditional "Expecting a
  refund for this?" toggle + expected-amount field in the Add/Edit form;
  `resetForm`/`openEditModal`/`handleSave` updated to reset/populate/save the
  new refund fields; `performDelete` now also removes a linked refund
  transaction if present; new `handleMarkRefundReceived()`/`handleUndoRefund()`
  handlers creating/removing a real linked income transaction (mirrors the
  Travel-checklist `expenseTransactionId` pattern); the list rows now show an
  orange "Refund Pending" or green "Refunded" badge with a Mark as
  Received/Undo action; - 8 new `refund*` styles added.
- `mobile-app/src/types.ts` — modified (B.11). Added `weeklyRecapEnabled: boolean`,
  `weeklyRecapDay: number`, and `weeklyRecapHour: number` to the `Settings` type.
- `mobile-app/src/defaultModel.ts` — modified (B.11). Added defaults for the 3 new
  weekly-recap settings fields (off, Sunday, 18:00).
- `mobile-app/src/pushNotifications.ts` — modified (B.11). Added `toDateKey()` and
  `nextWeeklyOccurrence()` helpers; added a weekly spending recap scheduling block
  directly inside `rescheduleBillNotifications()`, reusing `buildTransactionsList`/
  `transactionTotals` from `transactions.ts` and `formatPeso` from
  `balanceProjection.ts`.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (B.11). Added a
  "Weekly spending recap" toggle, a Sun–Sat day-pill picker, and an hour input
  under Notifications; added `recapHourInput` state and
  `toggleWeeklyRecap()`/`setWeeklyRecapDay()`/`saveWeeklyRecapHour()` handlers;
  added `pillRow`/`pillButtonSmall`/`pillButtonActive`/`pillButtonText`/
  `pillButtonTextActive` styles to this file's own stylesheet (previously only
  defined in `IncomeScreen.tsx`).
- For the full file inventory through the end of Phase A, see PROGRESS1.md.
- `mobile-app/src/screens/AccountsScreen.tsx` — modified (B.5 Batch 1). Delete now
  requires confirming a native `Alert.alert` dialog before removing an account.
- `mobile-app/src/screens/BillsScreen.tsx` — modified (B.5 Batch 1). Delete now
  requires confirming a native `Alert.alert` dialog before removing a bill.
- `mobile-app/src/screens/DebtsScreen.tsx` — modified (B.5 Batch 1 + Batch 2). Delete
  now requires confirming a native `Alert.alert` dialog; `balanceBannerAmount` and
  `debtAmount` styles recolored from `colors.ink` to `colors.orange`.
- `mobile-app/src/screens/LoansScreen.tsx` — modified (B.5 Batch 1 + Batch 2). Delete
  now requires confirming a native `Alert.alert` dialog; the balance banner now shows
  two split metrics ("Owed (Borrowed)" / "Owed to You (Lent)"); list rows show a
  LENT/BORROWED badge next to the loan name and color-code the amount by direction
  with a `+`/`−` prefix.
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.5 Batch 1). Delete
  now requires confirming a native `Alert.alert` dialog before removing a manual
  transaction.
- `mobile-app/src/screens/IncomeScreen.tsx` — modified (B.5 Batch 1 + Batch 2).
  Delete now requires confirming a native `Alert.alert` dialog; added a green "Total
  Monthly Income" hero banner (computed inline in-file) and recolored `rowAmount` to
  `colors.ok` with a `+` prefix.
- `mobile-app/src/screens/SavingsScreen.tsx` — modified (B.5 Batch 1 + Batch 2).
  Goal delete now requires confirming a native `Alert.alert` dialog; the EF/FI
  calculator's four input states changed from `useState('')` to
  `useState<string | null>(null)` (fixes a backspace-to-empty bug); added
  `getEfStatus()` helper dynamically coloring the "Months Covered" result
  red/orange/green with a status label.
- `mobile-app/src/screens/ProfileScreen.tsx` — modified (B.5 Batch 1). Sign Out now
  requires confirming a native `Alert.alert` dialog before signing out.
- `mobile-app/src/screens/SettingsScreen.tsx` — modified (B.5 Batch 1). Removed a
  stray duplicate "Appearance" section-title line that sat directly above the
  Profile Card.
- `mobile-app/src/screens/PinUnlockScreen.tsx` — modified (B.5 Batch 1 + Batch 2).
  Unlock button now visibly dims (`opacity: 0.4`) when disabled; the PIN input box
  and Unlock button are now hidden entirely when no PIN is configured, with the
  biometric retry button promoted to primary styling as the main action in that case.
- `mobile-app/src/screens/CreateProfileScreen.tsx` — modified (B.5 Batch 2). Added a
  "Copy Recovery Key" button (using the new `expo-clipboard` dependency) with a
  transient "Copied! ✓" confirmation; added the missing `copied`/`setCopied` state.
- `mobile-app/package.json` — modified (B.5 Batch 2). Added `expo-clipboard`.
- `mobile-app/src/screens/HomeScreen.tsx` — modified (B.5 Batch 2). Placeholder
  "You're signed in" text replaced with the real `<DashboardScreen />`, plus a small
  custom header row (username, Set/Change PIN, Lock) layered above it so those two
  actions remain reachable from Home.
- `mobile-app/src/components/CollapsibleRow.tsx` — new (B.4b-1). Reusable
  collapsed-row/tap-to-expand component (`collapsedContent`/`expandedContent`
  slots, controlled `isExpanded`/`onToggle`, optional `onEdit` button in the
  expanded drawer, chevron indicator, `LayoutAnimation`-based expand/collapse, no
  new dependencies). Intended for reuse across Debts, Loans, Transactions, Income,
  and Savings Goals in B.4b-2/B.4b-3.
- `mobile-app/src/screens/BillsScreen.tsx` — modified (B.4b-1). List rows now
  render via `<CollapsibleRow />` instead of a flat `TouchableOpacity` that opened
  the edit bottom sheet directly on tap. Added `expandedBillId` state,
  `paymentMethodLabel()` and `fullRecurrenceDetail()` helpers, and new
  `detail*`/`priority*`/`billCollapsedRow` styles. Removed the now-unused
  `billRow` style.
- `mobile-app/src/screens/LoansScreen.tsx` — modified (B.4b-2, Loans only).
  List rows now render via `<CollapsibleRow />` instead of the old
  `title`/`subtitle`/`amountLabel`/`onPress` row shape. Added `expandedLoanId`
  state; collapsed rows show name/loan type/direction/remaining balance,
  expanded rows show total amount, paid so far, and interest rate (using
  `styles.detailContainer`/`detailRow`/`detailLabel`/`detailValue`, already
  present in this file's `makeStyles`). Reuses the file's own existing
  `loanCollapsedWrap`/`loanRowTop`/`loanRowMain`/`loanName`/`loanSub`/
  `loanAmount` styles rather than introducing new ones.
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.4b-3). List
  rows now render via `<CollapsibleRow />` instead of a flat `TouchableOpacity`.
  Added `expandedTxnId` state and `txnCollapsedRow`/`detailContainer`/
  `detailRow`/`detailLabel`/`detailValue`/`detailNotesText` styles. Non-manual
  (derived) transactions get no `onEdit` callback and show a note instead.
  `CsvImportModal` confirmed untouched.
- `mobile-app/src/screens/IncomeScreen.tsx` — modified (B.4b-3). List rows now
  render via `<CollapsibleRow />` instead of a flat `TouchableOpacity`. Added
  `expandedIncomeId` state and `rowCollapsedRow`/`detailContainer`/`detailRow`/
  `detailLabel`/`detailValue` styles. Expanded drawer shows category, "Belongs
  To", and a logged-payments count/total summary.
- `mobile-app/src/screens/SavingsScreen.tsx` — modified (B.4b-3). List rows now
  render via `<CollapsibleRow />` instead of a flat `TouchableOpacity`. Added
  `expandedGoalId` state and `goalCollapsedWrap`/`detailContainer`/`detailRow`/
  `detailLabel`/`detailValue` styles. Expanded drawer shows remaining amount,
  contributions-logged count, and the most recent contribution's date/amount.
- `mobile-app/package.json` — modified (B.6a). Added
  `@react-native-community/datetimepicker`.
- `mobile-app/src/components/DateField.tsx` — new (B.6a). Reusable date-entry
  component wrapping the native date picker (Android native dialog / iOS inline
  calendar card, chosen specifically to avoid the iOS nested-`Modal` conflict since
  every form already renders inside `<BottomSheet />`). Props: `value`, `onChange`,
  `label`, `placeholder`, `clearable`, `testID`, `style`, `minimumDate`, `maximumDate`.
  Timezone-safe ISO string parsing/formatting; friendly display format (e.g.
  "Mar 15, 2025").
- `mobile-app/src/screens/TransactionsScreen.tsx` — modified (B.6a). Transaction date
  field now uses `<DateField />` instead of a raw `<TextInput>`.
- `mobile-app/src/screens/BillsScreen.tsx` — modified (B.6a). One-time due-date field
  now uses `<DateField />` instead of a raw `<TextInput>`.
- `mobile-app/src/screens/DebtsScreen.tsx` — modified (B.6b). One-time due-date field
  now uses `<DateField />` instead of a raw `<TextInput>`.
- `mobile-app/src/screens/LoansScreen.tsx` — modified (B.6b). One-time due-date field,
  custom-schedule start-date field, and the payment-log date field all now use
  `<DateField />` instead of raw `<TextInput>`s.
- `mobile-app/src/screens/IncomeScreen.tsx` — modified (B.6b). One-time income-date
  field and the payment-log date field now use `<DateField />` instead of raw
  `<TextInput>`s.
- `mobile-app/src/screens/SavingsScreen.tsx` — modified (B.6b). Target-date field and
  the contribution-row date field now use `<DateField />` instead of raw
  `<TextInput>`s.
- `mobile-app/src/screens/GoalsScreen.tsx` — modified (B.6b). Target-date field now
  uses `<DateField />` instead of a raw `<TextInput>`.
- `mobile-app/src/screens/EventsScreen.tsx` — modified (B.6b). One-time event-date
  field now uses `<DateField />` instead of a raw `<TextInput>`.
- `mobile-app/src/screens/TravelScreen.tsx` — modified (B.6b). Trip start-date and
  end-date fields now use `<DateField />` instead of raw `<TextInput>`s.
- `mobile-app/src/screens/CalendarScreen.tsx` — modified (B.5, Calendar). Imports
  `useMemo` and `ScrollView`; added `EVENT_DOT_COLORS` map; added a `monthEvents`
  memo wired to the existing `computeMonthEvents()` resolver; day cells now render
  up to 4 colored dots for items due that day; the day-tap popup now shows a real
  scrollable list of due items (dot + label + amount) instead of a placeholder
  sentence, falling back to "Nothing due on this day" when empty. Added
  `dotRow`/`dot`/`modalEventList`/`modalEventRow`/`modalEventDot`/`modalEventLabel`/
  `modalEventAmount` styles.

### Session entry — B.11 built: Weekly spending recap notification, plus a styling gap found and fixed
**What happened:** Investigated via two rounds of Antigravity report-only prompts.
Round 1 confirmed the existing bill-alert system uses only a fixed one-time
trigger (no recurring trigger type in use anywhere), that
`rescheduleBillNotifications()` wipes and rebuilds every scheduled notification
on every save/login/sync (9 real call sites), and that a ready-made "last 7 days
through today" spending calculation already exists via
`buildTransactionsList`/`transactionTotals`. Round 2 closed one small but real
gap before any code was written: confirmed the exact real import lines and
export location for those two functions, rather than assuming a file path.
Built the feature across `types.ts`, `defaultModel.ts`, `pushNotifications.ts`,
and `SettingsScreen.tsx`. Deliberately scheduled the recap notification *inside*
`rescheduleBillNotifications()` itself, rather than as a separate call
elsewhere, specifically because anything scheduled outside that function would
be silently wiped the next time anything in the app got saved.

After the first paste, `npx tsc --noEmit` surfaced 5 errors — a new day-pill
picker referenced 5 style names that don't exist in `SettingsScreen.tsx`'s own
stylesheet. Investigated via a dedicated Antigravity report-only prompt
confirming `IncomeScreen.tsx` already has a real, working day-of-week picker
using those exact names, with real style definitions to copy from — rather than
guessing at new values. Copied those 5 style definitions into
`SettingsScreen.tsx`'s own stylesheet. `npx tsc --noEmit` confirmed clean
(empty output, 0 errors) afterward.

**Result:** B.11 is code-complete. On-device verification (toggle, day-pill
selection, hour input, and the notification actually firing with a correct
amount) is deferred per the current batched-testing policy and added to the
running checklist.

**Design decision made this session:** No new standing rule — another direct
application of two already-standing practices: (1) get real, current file
content before proposing any fix rather than guessing from an error message,
and (2) when adding to a function that already has a "wipe everything and
rebuild" responsibility, fold new scheduling logic into that same function
rather than adding a separate call site that the wipe would silently undo.

### Session entry — B.10 built: Refund tracker, reusing the existing Travel-checklist linked-transaction pattern
**What happened:** Investigated via two rounds of Antigravity report-only prompts.
Round 1 confirmed no "refund" concept existed anywhere, pulled the real
`ManualTransaction`/`TransactionEntry` shapes, and — most importantly — surfaced
that the app already has a proven "check something, get a real linked
transaction created; uncheck it, get that transaction removed" pattern on
Travel checklist items via `expenseTransactionId`, which was the exact
mechanism needed for "mark a refund received." Also confirmed no unclaimed
color token exists in `theme.ts`. Presented 3 design questions (does "received"
touch real totals or just a label; are partial refunds supported; what color
for the badge) and got clear answers for all three before writing anything.
Round 2 pulled the real Add/Edit modal JSX, the full `useState` block, the real
`openEditModal`/reset/close functions, the real delete handler, the real
Travel-checklist linked-transaction handler to copy exactly, the real
`buildTransactionsList()` manual-transaction loop, and the real style block —
closing every gap before writing replacement snippets, rather than guessing at
code that hadn't actually been seen.

Built and hand-pasted across `types.ts` (2 new optional fields on
`ManualTransaction`) and `TransactionsScreen.tsx` (toggle + amount field in the
form, save/reset/edit/delete wiring, two new handlers mirroring the Travel
pattern, badge + action button in the row, 8 new styles).

**Result:** `npx tsc --noEmit` confirmed clean (empty output, 0 errors) on the
first paste — no error/fix rounds needed. B.10 is code-complete; on-device
verification (toggle visibility, partial refunds, the Pending→Received→Undo
round-trip and its effect on totals, and delete-cleanup of an already-refunded
expense) is deferred per the current batched-testing policy and added to the
running checklist.

**Design decision made this session:** No new standing rule — another
successful application of the existing "reuse a proven in-app pattern instead
of inventing a new one" approach, this time reusing Travel/Events'
`expenseTransactionId` linked-transaction mechanism for refunds rather than
building a second, parallel system.

### Session entry — B.8 built: Category Watchlist, reusing the existing (previously unused) `categoryBudgets` model field
**What happened:** Investigated via two rounds of Antigravity report-only prompts
before writing anything. Round 1 confirmed where "Insights" actually renders
(`InsightsScreen.tsx` → `DashboardScreen.tsx`/`ReportsScreen.tsx`), that
`Category` is a free-form user-managed list (not a fixed enum), that no
reusable "spend per category this month" function existed yet (only an inline
version inside `MonthlyCloseOutReport.tsx`), and — the key finding — that
`HouseholdModel.categoryBudgets: CategoryBudget[]` already exists as a real,
fully-wired field (defaults, merge-by-name-dedup logic) with zero UI usage
anywhere in the app. Round 2 confirmed that gap explicitly (searched every
file for `categoryBudgets`/`CategoryBudget` — only `types.ts`,
`defaultModel.ts`, `mergeModels.ts`) and pulled the real, complete
`MonthlyCloseOutReport.tsx` category-totaling code to generalize rather than
duplicate a third time. A third, narrower investigation (after the person
chose to fold the management UI into Settings rather than a new screen)
confirmed `SettingsScreen.tsx`'s real `useData()`/`saveModel()` save pattern
and its real Categories section's add/edit/delete handler shapes, since an
earlier guess (`updateModel`) turned out to be wrong — the real function is
`saveModel`.

Built the feature on top of the existing `categoryBudgets` field rather than
adding a new settings field: `computeCategorySpend()`/
`getCategoryBudgetStatus()` in `transactions.ts`, a new Dashboard card, and a
new Settings management section, all hand-pasted by the person. One paste
error occurred (the Dashboard card block got pasted twice, the second copy
landing outside the component and breaking the build with 3 syntax errors) —
investigated via a dedicated Antigravity report-only prompt showing the real
file content around the error rather than guessing from the compiler output
alone, confirmed the exact duplicate block, and fixed by deleting the
orphaned copy.

**Result:** `npx tsc --noEmit` confirmed clean (empty output, 0 errors).
B.8 is code-complete; on-device verification (adding/removing a watched
category, the Dashboard card's live spend/status display, and the
red/orange/green thresholds) is deferred per the current batched-testing
policy and added to the running checklist.

**Design decision made this session:** No new decision — this session is
another direct application of two already-standing rules: (1) before
building a new feature, check whether a related field/type already exists in
the model (`categoryBudgets` had been sitting there fully wired but unused —
building fresh would have meant a redundant, parallel data shape), and (2)
when a compile error appears after a hand-paste, get real current file
content around the error before proposing a fix, rather than guessing from
the error text alone.

### Session entry — B.7 built: "Left to Spend" hero stat + Settings caution-threshold control
**What happened:** Ran the Settings-placement investigation prompt drafted at the end
of the prior session. Confirmed `notifyDaysBefore` is the right pattern to copy
(a plain `model.settings` field, saved via `saveModel()`, syncing across every
linked household member) and that no slider dependency exists anywhere in the app —
decided a plain 0–100 number field was the right call over adding a new dependency
for one control. A second, narrower investigation confirmed the real `useData()`
hook shape, `formatPeso`'s real signature/import path, `DashboardScreen.tsx`'s real
imports and 4 relevant style keys, and confirmed no circular-import risk between
`balanceProjection.ts` and `income.ts`. Built the feature across 5 files: the new
`cautionThresholdPercent` settings field (`types.ts`, `defaultModel.ts`), two new
`balanceProjection.ts` exports (`computeLeftToSpend`, `getLeftToSpendStatus`) reusing
the existing `computeNextPayDate`/`computeRunningBalances`/
`computeMonthlyObligationsBaseline` functions rather than computing anything from
scratch, a new "Left to Spend" Settings section matching `notifyDaysBefore`'s exact
visual/persistence pattern, and a new hero card on `HomeScreen.tsx` (deliberately
not `DashboardScreen.tsx`) above the existing `<DashboardScreen />` mount. One
assumption was explicitly flagged rather than silently guessed at: `model.income`
as the real field name was inferred, not directly confirmed, from `IncomeSource`
already being imported elsewhere in `balanceProjection.ts`.

**Result:** All 5 files hand-pasted by the person per standing small-fix policy.
`npx tsc --noEmit` came back clean (empty output, 0 errors) — the flagged
`model.income` assumption held up. B.7 is code-complete; on-device verification
(the Settings field persisting, the hero card's color/label/caption rendering
correctly, and the payday-vs-end-of-month fallback behaving correctly) is deferred
per the current batched-testing policy, and added to the running checklist.

**Design decision made this session:** No new decision — this session is a direct,
successful application of the standing rule to flag any unverified assumption
explicitly to the person rather than silently building on it, and to confirm it
against real compiler output before treating it as settled.

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
noted in ⚠️ Known issues above.

**Design decision made this session:** No manual biometric-priority toggle — Android's
OS controls which sensor prompt appears regardless of app-level preference, so fixing
the underlying detection bug is the complete, correct fix; a toggle would only add
issues without adding real control.

### Session entry — B.9 built: Yours/Mine/Ours owner labels + transaction Notes field
**What happened:** Investigated in four rounds via Antigravity report-only prompts
before writing any code. Round 1 mapped the transaction data model, existing
"Belongs To" patterns (Income's real chip-picker UI, the existing `'shared'`
convention already used everywhere), where owner-based grouping already exists
(`PersonSpendingReport.tsx`), and theme colors for a possible badge. It surfaced a
real, unresolved gap: nothing in the app links a `Person` record to the
currently-signed-in `username` — `Person.role` looked promising but was confirmed
dormant (written once, never read). Round 2 confirmed that gap fully: no such link
exists anywhere (`ProfileScreen.tsx`'s roster only compares Firebase UIDs, not
`Person` ids; household merge logic matches people by name, not by any stored
link). Presented the person with two options (fuzzy name-matching vs. an explicit
stored preference); the person proposed a better design than either — no fixed
"Yours" bucket at all, just "Mine" (whatever's linked to me), real names for
everyone else, and "Ours" for anything shared — which was adopted directly. Rounds
3 and 4 pulled the exact real code needed to build it safely: `ProfileScreen.tsx`'s
real roster JSX and `useData()`/`username` access, the real AsyncStorage helper
conventions from `pin.ts`/`onboarding.ts`/`biometrics.ts`, confirmation that
`TransactionEntry` actually lives in `transactions.ts` (not `types.ts`, as an
earlier round had implied), and `TransactionsScreen.tsx`'s/`PersonSpendingReport.tsx`'s
real imports, state, and save-handler object literals.

Built and hand-pasted: a new `myPerson.ts` preference module; a `notes` field on
`ManualTransaction`/`TransactionEntry`; a "Which of these is you?" picker on
`ProfileScreen.tsx`; a new `ownerLabel()` helper and Notes field in
`TransactionsScreen.tsx`; and "Mine"/"Ours" labels in `PersonSpendingReport.tsx`.
Mid-batch, the person flagged that an earlier message had asked them to inspect
`TransactionsScreen.tsx` themselves and pick between two possible existing lines —
called out as unacceptable given their explicit standing instruction that Claude
should get real answers itself, not hand over branching decisions. A short
follow-up investigation-only prompt confirmed the real line, and a single
unconditional fix was given instead. This was adopted as a new permanent rule (see
📌 Decisions above).

**Result:** All edits hand-pasted by the person; `npx tsc --noEmit` confirmed
clean (empty output, 0 errors) after the full batch, no error/fix rounds needed
this time. B.9 is code-complete; on-device verification (the picker, the Mine/
Ours/name labels in both Transactions and Person Spending, and the Notes field)
is deferred per the current batched-testing policy and added to the running
checklist. One known, accepted gap carried forward rather than fixed this
session: the picker only renders inside `ProfileScreen.tsx`'s "Linked" section,
so a solo/unlinked profile has no way to set "which person is me" yet.

**Design decision made this session:** Owner labels resolve to "Mine" / "Ours" /
the real person's name — never a generic "Yours" — via an explicit
`profile:${username}:my-person-id` preference rather than name-matching, so the
same feature scales correctly to any number of household members with no extra
logic. New standing rule adopted: never hand the person a "check X, then do Y or
Z depending on what you find" instruction — always resolve it via investigation
first, then give one unconditional fix.


📚 Older detailed session logs archived in PROGRESS2-ARCHIVE-1.md (14 sessions,
covering Tier 1/2/3 audit fixes through B.6). Everything from them that still
matters is already folded into the ✅ Done / 📌 Decisions / ⚠️ Known issues sections
above.



