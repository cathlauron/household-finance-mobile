Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

✅ Done

Phase 0 — Decisions & Foundation
- 0.1 — Sync decision: Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design.
- 0.2 — Blank Expo project created and confirmed working.
- 0.3 — Offline behavior and minimum phone OS version decided (see Decisions below).

Phase 1 — Security & Sign-In (M1–M2)
- 1.1 — Data model setup. Done.
- 1.2 — Create-profile & sign-in screens, with password protection. ✅ Complete.
- 1.3 — Encrypt the data at rest. ✅ Complete.
- 1.4a — Quick PIN unlock: set-a-PIN screen + safe storage. ✅ Complete.
- 1.4b — "Lock" uses the quick PIN screen instead of full sign-out, once a PIN is set up. ✅ Complete.
- 1.4c — Auto-lock timer. ✅ Complete. Backgrounding the app and idling both trigger the lock screen, confirmed on a real device.

Phase 2 — Getting Around the App (M4)
- 2.1 — Bottom tab bar with all 10 main sections. ✅ Complete.
- 2.2 — Basic theming (colors/light-dark mode) ported over from the web app. ✅ Complete.

Phase 3 — Calendar (M5)
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE
- 5.1 — Add/edit/delete Bills. ✅ Complete.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete.

Phase 6 — Transactions (M8) — ✅ CORE COMPLETE (CSV import still optional/outstanding)
- 6.1 — Unified transaction list. ✅ Complete.
- 6.2 — Manually add a transaction, incl. receipt photo attachment, edit/delete. ✅ Complete and confirmed working on a real phone.
- 6.2b — Manual transactions now have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import: NOT yet done. Explicitly optional/deferrable per the roadmap.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync (tripFullChecklistTotal/syncTripSavingsGoal), verified in an earlier session.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone, including Events' own savings-goal auto-sync (syncEventSavingsGoal), mirroring Travel's pattern, verified in an earlier session.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice. Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. Scoped as its own future checkpoint.

Phase 11 — Settings (M14) — 🔧 IN PROGRESS
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE — CORRECTED THIS SESSION. Previous session logs incorrectly listed this as "not yet started"; direct file inspection this session showed SettingsScreen.tsx already has full, working add/edit/delete for all three (Categories with color-swatch picker and duplicate-name checking; Merchants & Payees with optional default category; Categorization Rules with up/down reorder arrows since rule order determines match priority, plus amount-range validation). All three sections were verified end-to-end on a real phone this session (add/edit/delete for Categories and Payees; add/reorder/delete for Rules) — see dated session entry below. This checkpoint required NO new code, only verification and correcting the log.
- 11.2 — Notifications (native push). ✅ Verified in an earlier session — wiring confirmed sound: rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. On-device confirmation still DEFERRED — Expo Go on Android doesn't support expo-notifications as of SDK 53+ (confirmed via direct testing). Needs a real installed build (Phase 13) or an untried iPhone Expo Go test. The temporary "Send a test notification in 10 seconds" button on SettingsScreen.tsx should be removed once real on-device confirmation happens.
- 11.3 — Security & Household & Data. NOT yet started. This is the next and last piece of Phase 11 — see "Next step" below.

---

## 📅 Session entry — Phase 11.1 verified complete (no new code required); PROGRESS.md corrected

This session set out to build Checkpoint 11.1 (Categories, Payees, Rules) from
scratch, per the previous session's "Next step" note. Before writing any code, the
person was asked to paste the actual current contents of `src/types.ts` and
`src/screens/SettingsScreen.tsx`, per the project's own discipline of never guessing
at existing code before patching it.

**What the file inspection revealed:**
- `HouseholdModel` in `src/types.ts` already has `categories: Category[]`,
  `categoryBudgets: CategoryBudget[]`, `payees?: Payee[]`, and
  `categorizationRules?: CategorizationRule[]` — all fully typed, including the
  supporting `Category`, `Payee`, and `CategorizationRule` type definitions themselves.
- `src/screens/SettingsScreen.tsx` already contained a complete, working
  implementation of all three features:
  - **Categories** — add/edit/delete via a modal, with a 15-color fixed swatch palette
    (`COLOR_PALETTE`) mirroring the web app's auto-assigned category colors, plus
    duplicate-name checking on save (case-insensitive).
  - **Merchants & Payees** — add/edit/delete via a modal, with an optional
    `defaultCategory` free-text field, also with duplicate-name checking.
  - **Categorization Rules** — add/edit/delete via a modal (label-contains text,
    optional min/max amount range, target category), PLUS up/down reorder arrows
    (`moveRule()`) since rules are matched in array order and the first match wins —
    correctly treated as functionally significant (unlike Categories/Payees, which are
    just alphabetically sorted for display and don't need reordering).
  - All three are wired to real `saveModel()` calls updating the corresponding
    `HouseholdModel` array — no local-only/placeholder state anywhere.
- Conclusion: this checkpoint had already been fully built in a prior session, but
  the outcome was never reflected in PROGRESS.md (which listed "11.1 — Not yet
  started") and, as far as the log shows, was never verified on an actual device
  either. This is the exact "PROGRESS.md can drift from what's actually in the code"
  risk already flagged in this file's own Known Issues section — now confirmed to have
  actually happened, not just a theoretical risk.

**No code was written or changed this session.** The only actions taken were:
1. Reviewing the pasted file contents.
2. Providing a 3-part on-device verification checklist (Categories add/edit/delete;
   Payees add/edit/delete; Rules add/reorder/delete).
3. The person ran through all three and confirmed everything works correctly.
4. This PROGRESS.md rewrite, correcting the status and documenting how/why the
   discrepancy happened.

**Verification on physical device, all confirmed working by the person:**
1. Added a category ("Pet Care") with a chosen color swatch — appeared correctly with
   its color dot.
2. Edited that category's color — the dot updated in the list.
3. Deleted the category — it disappeared from the list.
4. Added a payee ("Meralco") with default category "Utilities" — appeared showing
   both the name and category.
5. Deleted the payee — it disappeared.
6. Added two categorization rules ("grab" → Transportation, "jollibee" → Food) —
   both appeared in the list in the order added.
7. Used the ▲/▼ reorder arrows on one rule — confirmed the two rules swapped
   positions.
8. Deleted a rule — the list updated correctly.

🧹 Code health
- No code changes this session, so no new npx tsc --noEmit run was needed — the
  existing SettingsScreen.tsx and types.ts were already compiling cleanly as part of
  every previous session's clean-compile confirmations.
- This session is itself a "code health" event of a different kind: a confirmed
  instance of documentation drift (PROGRESS.md said "not started" for a feature that
  was, in fact, fully built and working). No prior session's dated entry describes
  building Phase 11.1 — it's unclear which earlier session actually wrote this code
  without logging it, but the code itself is dated informally via style patterns
  (e.g. shares the same modal/row/color-swatch conventions as Categories elsewhere in
  the app) as being original, first-generation work rather than a recent addition.
- Previous sessions' fixes (setNotificationHandler shouldShowBanner/shouldShowList
  properties, MainTabs.tsx id prop, LoansScreen.tsx/SavingsScreen.tsx progress-bar
  width typing, the line-by-line anchor patch technique used for Travel and Events)
  remain fixed — not re-verified this session since no files were touched.

⚠️ Known issues / gotchas (non-code)
- CONFIRMED THIS SESSION: PROGRESS.md drift is not just a theoretical risk — Phase 11.1 was fully built and working but incorrectly logged as "not yet started" for at least one full session cycle. Going forward, before starting any checkpoint that a prior "Next step" note describes as unbuilt, do a quick grep/file-read check of the relevant screen/type file first (as was done this session) rather than trusting the log at face value — especially for older checkpoints that may have been completed in a session whose write-up didn't make it into a later archived/rewritten version of this file.
- Expo tunnel (`--tunnel`) occasionally fails with `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, pointing at ngrok. Not a bug in the app. Fix order: (1) `npm install --save-dev @expo/ngrok@latest` then retry `npx expo start --tunnel`; (2) `npx expo start --tunnel --clear`; (3) check terminal text for an ngrok signup-link prompt.
- Expo Go on Android cannot run any expo-notifications functionality (local or remote/push) as of Expo SDK 53+ — confirmed via direct testing. Affects on-device testing of all Checkpoint 11.2 work until Phase 13 (real installed build). iPhone via Expo Go may still work (untried) since the restriction is Android-specific.
- npx tsc (and likely other npx-invoked project tools) must be run from inside mobile-app/, not the repo root, or npx will try to fetch an unrelated package also called "tsc" from the internet.
- Large heredoc pastes (cat > file << 'ENDOFFILE' with a lot of content, or a multi-line python3 - << 'PYEOF' script) can render garbled/truncated in the Codespace terminal's own on-screen echo, even when the underlying file write succeeds correctly and completely. Always trust the script's own printed success message plus a clean npx tsc --noEmit run over what scrolled by on screen — verify with cat -n against the actual file directly if there's ever real doubt.
- Multi-line Python patch scripts that match whole text blocks verbatim can fail with AssertionError even when the target code is visually identical on inspection, due to invisible whitespace/formatting differences. Prefer line-by-line anchor matching instead — this technique was used successfully for both Travel and Events.

📌 Decisions made
(All decisions from prior sessions still stand — repeating only what's new/relevant below; see repo history for the full original list if ever needed.)
- Verify-before-build discipline (this session, new): Before starting work on any checkpoint flagged as "not yet started" in this log, do a direct file-read/grep check of the relevant screen and type files first. This session found a checkpoint (11.1) that was fully built already, and building it "again" from scratch could easily have caused duplicate code, merge confusion, or overwritten a working feature. This is now the standard first step for picking up any checkpoint, not just a one-off this session.
- Phase 11.1 requires no further work (this session): Categories, Payees, and Categorization Rules are all considered genuinely complete and verified. No follow-up items are outstanding for this checkpoint.
- Events savings-goal sync follows Travel's pattern exactly (earlier session): trackInSavings + savingsGoalId fields on the parent record; sync computed and applied on every save; linked goal removed on toggle-off or on deleting the parent record.
- Terminal-echo trust discipline (earlier session): garbled/truncated on-screen echo during a large heredoc or Python patch script paste is not, by itself, evidence of a problem. The script's own printed success message plus a clean npx tsc --noEmit run are the real signals to trust.
- Tax Summary scope decision (earlier session): Built with loan-late-fees-only for "interest & fees," clearly labeled in-app as a limitation, rather than waiting on a data-model change.
- Payment Methods report deferred (earlier session): Scoped as its own future checkpoint (data model field + real Cash/Debit/Credit picker UI on payment-logging screens + manual transaction form), not just "one more report file."
- Checkpoint tracking discipline (reconfirmed): Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version.
- File-creation discipline (reconfirmed): Files are created via cat > filename << 'ENDOFFILE'. Existence is checked first before creating. Editing existing files uses targeted sed for small changes, or a python3 - << 'ENDOFFILE' exact-match script for multi-line/whitespace-sensitive edits, using line-by-line anchor matching rather than whole-block matching.
- New-screen/new-logic wiring discipline (reconfirmed): A new feature isn't "done" until it's fully wired into its real data flow AND confirmed visible/working on a real device.

▶️ Next step

Phase 11.1 and 11.2 are both done. The only remaining piece of Phase 11 is:

1. **Checkpoint 11.3 — Security & Household & Data.** This has NOT been started (confirmed only by the absence of any related code mentioned across every prior session's file inventory — should still be double-checked via file inspection first, per this session's new discipline, before assuming it's truly unbuilt). Based on the original web app's Settings tab, this checkpoint likely covers: changing/resetting the app passphrase, viewing/managing linked household members (deferred pending Phase 9's sync decision — may just be a placeholder note for now), and data export/backup or a "clear all data" option. Needs its own plain-English scoping conversation with the person before writing any code, since "Household" specifically may overlap with the still-deferred Phase 9 decision and shouldn't be built in a way that conflicts with it later.
2. After Phase 11 is fully wrapped, the next-biggest items remain: Phase 9 (Shared Expenses / Household Linking — the hardest technical part of the whole project); the Payment Methods report checkpoint; and adding Loans into the Dashboard's "Amount Owed"/"Due Soon" cards and the Calendar's/Cash-Flow Forecast's running-balance projection (a pre-existing gap in balanceProjection.ts).
3. Smaller loose ends still flagged from earlier sessions: EF/FI calculators still don't auto-pull figures from Bills/Income; Custom recurrence math isn't implemented in recurrence.ts yet (Bills/Debts/Loans data model supports it, but due-date calculation doesn't); neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target).

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types (confirmed already present, no changes this session). Still no paymentMethod or feesPortion fields anywhere — see Phase 10.2 notes above.
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math not yet implemented)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel()
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance()
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; confirmed wired to rescheduleBillNotifications()
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx
  - mobile-app/src/screens/AccountsScreen.tsx
  - mobile-app/src/screens/BillsScreen.tsx
  - mobile-app/src/screens/DebtsScreen.tsx
  - mobile-app/src/screens/LoansScreen.tsx
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync (tripFullChecklistTotal, syncTripSavingsGoal), confirmed working on a real phone.
  - mobile-app/src/screens/EventsScreen.tsx — real savings-goal auto-sync (syncEventSavingsGoal), mirroring TravelScreen.tsx's pattern, confirmed working on a real phone.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx
  - mobile-app/src/screens/InsightsScreen.tsx
  - mobile-app/src/screens/ReportsScreen.tsx — second-level pill-switcher between report pages (8 pills)
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx
  - mobile-app/src/screens/reports/YearInReviewReport.tsx
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (loan late fees only, clearly labeled), full expense-by-category breakdown.
  - mobile-app/src/screens/SettingsScreen.tsx — CONFIRMED THIS SESSION to already contain full Categories/Payees/Categorization Rules management (Checkpoint 11.1), verified working end-to-end on a real phone. Also includes Appearance mode picker, Notifications settings, and a temporary "Send a test notification in 10 seconds" button (Checkpoint 11.2) to be removed once real device confirmation happens in Phase 13. Does NOT yet contain any Security or Household & Data section (Checkpoint 11.3).
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
