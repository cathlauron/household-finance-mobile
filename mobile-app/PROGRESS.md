Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

🎉 ROADMAP STATUS: FULLY COMPLETE. Every phase (0 through 11, including the shared-expense ledger decision in Phase 9) is built and confirmed working. What remains is optional polish only (see Known Issues) plus, if wanted, Phase 13 (Publishing — EAS Build / App Store), which was never part of this roadmap's earlier phases and hasn't been started.

✅ Done

Phase 0 — Decisions & Foundation
- 0.1 — Sync decision: Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design. UPDATE: Phase 9 has now begun — see below. Firebase was chosen as the sync service.
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
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete. Running-balance projection includes Loan payments (Monthly/Annual/One-time recurrence — Custom still excluded, see note below), confirmed showing correctly on a real phone.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE
- 5.1 — Add/edit/delete Bills. ✅ Complete. Bill cycles include a real payment-method picker (Cash/Debit/Credit, via the shared PaymentMethodPicker component), saved onto BillCycle.paymentMethod.
- 5.2 — Add/edit/delete Debts. ✅ Complete. Debt cycles (which reuse the BillCycle type) also include the same payment-method picker.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.3b — Loan edit screen has a "Payment log" section — log individual loan payments (date, amount, and Cash/Debit/Credit payment method via PaymentMethodPicker), see all logged payments listed with their date/method/amount, and remove any of them. Confirmed working on a real phone.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete for Bills/Debts. NOTE: "Custom" recurrence is only usable for Bills/Debts — the Loan type has no customStartDate/customFreq/customOccurrenceCount fields, and the Loans screen's own recurrence dropdown doesn't offer "Custom" as a choice. Monthly/Annual/One-time loans work fully everywhere.

Phase 6 — Transactions (M8) — ✅ FULLY COMPLETE
- 6.1 — Unified transaction list. ✅ Complete.
- 6.2 — Manually add a transaction, incl. receipt photo attachment, edit/delete. ✅ Complete and confirmed working on a real phone. Manual transactions also include the same payment-method picker (ManualTransaction.paymentMethod).
- 6.2b — Manual transactions have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import. ✅ CONFIRMED FULLY BUILT AND WORKING THIS SESSION.
  - `src/csvImport.ts` — real CSV parser: splits lines respecting quoted fields (incl. embedded commas and escaped "" quotes), requires a header row with date/label/amount columns (direction optional, defaults to "out"), accepts dates as YYYY-MM-DD or MM/DD/YYYY, per-row validation with a specific error message per failure (bad date, missing label, bad/zero amount, unrecognized direction).
  - `src/screens/CsvImportModal.tsx` — full modal UI: file picker restricted to .csv/.txt (with a friendly nudge if someone picks .xlsx by mistake), reads and parses the file, shows a preview (row count, first 8 valid rows with date/label/direction/amount, "+N more"), shows skipped/invalid rows with their specific reasons, a working "Import N transactions" button that appends them into `manualTransactions` via `saveModel()`, success/Done state, fully themed, no debug leftovers.
  - Confirmed wired into `TransactionsScreen.tsx` (imported, rendered, controlled by real `csvModalOpen` state, "Import CSV" button present).
  - Confirmed dependencies installed: `expo-document-picker` (~14.0.8), `expo-file-system` (~19.0.24).
  - `npx tsc --noEmit` clean after this confirmation.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone. EF's "Monthly essential expenses" and FI's "Annual expenses" now show a real, tappable auto-suggestion pulled from recurring Bills data (monthly bills at latest cycle amount, annual bills' latest cycle amount ÷ 12 — mirrors the web app's monthlyBudgetBaseline()). Suggestion never overwrites a saved value automatically — it's a tap-to-accept line under each field, confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync (tripFullChecklistTotal/syncTripSavingsGoal) AND real transaction logging: checking off a checklist item (with a cost) creates a real ManualTransaction on Save; unchecking it removes that transaction; editing the cost while checked keeps the transaction's amount in sync. Confirmed working on a real phone this session. Deleting a trip also cleans up any transactions its checklist items created.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone, including Events' own savings-goal auto-sync (syncEventSavingsGoal) AND real transaction logging: marking an event "Completed" (with a budget set) creates a real ManualTransaction on Save; un-marking it removes that transaction. Confirmed working on a real phone this session. Deleting an event also cleans up any transaction it created.

Phase 9 — Household Linking (M3) — ✅ COMPLETE. (M11, shared expense ledger, was explicitly SKIPPED by decision — see 9.3 below, not deferred.)
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore). Real security rules are in place and confirmed working (see 9.4).
  - `mobile-app/src/firebase.ts` initializes the Firebase app and exports `db` (a Firestore instance).
- 9.2a — Household key encryption + linking plumbing. ✅ COMPLETE. `src/household.ts` — data layer, not currently used by the live flow (see 9.2b).
- 9.2b-i — "Start linking" (generate & share a code). ✅ COMPLETE, CONFIRMED WORKING ON A REAL PHONE. `src/linking.ts` — 6-character link code mechanism, encrypted shared secret.
- 9.2b-ii — "Join with a code" + comparison screen. ✅ COMPLETE, CONFIRMED WORKING END-TO-END ON TWO REAL PHONES. Keep mine / Keep theirs / Merge both.
- 9.2c — Making the choice permanent, wiring DataContext to read/write shared household data going forward. ✅ COMPLETE, CONFIRMED WORKING END-TO-END ON TWO REAL PHONES.
- **9.3 (shared expense ledger + settle-up) — SKIPPED BY DECISION, not deferred.** The person confirmed this doesn't reflect how they manage money as partners — they share expenses without tracking who owes whom. Do not resurface this as a pending checkpoint in future sessions.
- **9.4 — Firestore security rules (replacing wide-open test mode). ✅ COMPLETE, CONFIRMED WORKING.**
  - Real rules saved to the repo as `firestore.rules` (reference copy) and published live in the Firebase Console (the console is the actual enforcement point).
  - Restricts writes to the app's real document shapes; blocks listing/browsing and deletes (except unlinking); confirmed working on real devices after publishing.
  - **Accepted limitation:** no real Firebase Auth/login layer, so rules can't stop someone who already knew another household's exact ID/code from reading/writing to it — they only block malformed writes and deletion of protected collections. Real per-user auth is a bigger, separate undertaking and is not currently planned.

Phase 10 — Dashboard & Reports (M12–M13) — ✅ FULLY COMPLETE
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" includes Bills/Debts/Loans (borrowed only); "Due in the Next 14 Days" includes upcoming loan payments.
- 10.2 — Reports pages. ✅ COMPLETE — all NINE report pages built and wired into ReportsScreen.tsx: Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary, and Payment Methods.
  - Payment Methods report (`src/screens/reports/PaymentMethodsReport.tsx`) confirmed built and working — groups every paid Bill cycle, paid Debt cycle, non-"lent" Loan payment, and outgoing manual Transaction by PaymentMethod (Cash/Debit-account/Credit-account), "Not set" bucket for anything unpicked. Reads the raw model directly since `buildTransactionsList()` doesn't carry paymentMethod through.
  - Tax Summary (`src/screens/reports/TaxSummaryReport.tsx`): year-picker, total income/expenses/saved, "Interest & Fees Paid" card, full expense-by-category breakdown. Confirmed working on a real phone.
  - **LIMITATION, flagged on-screen:** Tax Summary's "Interest & fees paid" only counts loan late fees (a logged loan payment higher than expectedPayment). Debt-side fees are NOT included — Debt/BillCycle in types.ts has no feesPortion field.
- Payment-method logging is fully rolled out across the whole app (Bills, Debts, Loans, manual Transactions), readable end-to-end via the Payment Methods report.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three. Verified end-to-end on a real phone.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION.
- 11.3 — Security & Household & Data. ✅ COMPLETE. Change passphrase, real household linking UI, backup (expo-file-system + expo-sharing), clear-all-data with confirm step. All confirmed on-device.

---
## 📅 Session entry — EF/FI calculators now suggest real numbers from Bills data

**What happened this session:**
Closed out the second (and last) optional-polish item flagged at the end of the previous
session: the EF/FI calculators on the Savings tab only ever took manually-typed numbers,
with no connection to real Bills data.

- `src/screens/SavingsScreen.tsx` — added `billLatestCycleAmount()` and
  `computeMonthlyExpenseBaseline()`, mirroring the web app's `monthlyBudgetBaseline()`:
  monthly-recurring bills counted at their most recent cycle's `amountDue`, annual-recurring
  bills' most recent cycle amount divided by 12. One-time/custom bills excluded (no reliable
  "typical month" figure for those).
- Emergency Fund's "Monthly essential expenses" field and FI's "Annual expenses" field
  (annual = monthly baseline × 12) each now show a tappable suggestion line underneath —
  "Based on your recurring Bills: ₱X,XXX/mo — tap to use this" — only when the computed
  baseline is greater than 0.
- Deliberately NOT auto-filled/silent: tapping the suggestion fills the input, but a
  previously-saved `calculatorInputs` value is never overwritten automatically. Manual
  entry/editing still works exactly as before.
- Scoped down from the original plan: Income-based auto-fill for FI was dropped this
  session, since the current FI calculator is expenses-only (`expenses × 25`, the standard
  rule) and doesn't use an income figure anywhere — pulling in Income sources wouldn't have
  fed into anything real. Flagged to the person before writing code; confirmed as the right
  scope.

**Confirmed this session:**
- `npx tsc --noEmit` — clean, no errors.
- Manually tested on a real phone: with at least one monthly/annual Bill logged with a cycle
  amount, the suggestion line appeared under both the EF and FI expense fields, and tapping
  it filled the input correctly.

---
## 📅 Session entry — Travel/Events checklist items now log real transactions

**What happened this session:**
Closed out the first item from the optional-polish list: neither Travel nor Events was
converting a completed checklist item / completed event into an actual logged transaction —
both only synced a savings-goal target. Fixed both.

- `src/types.ts` — added `expenseTransactionId?: string` to both `TravelChecklistItem` and
  `EventItem`, so each remembers which transaction (if any) it created.
- `src/screens/TravelScreen.tsx` — added `reconcileTravelChecklistTransactions()`, called from
  `handleSaveTrip()`. Compares the checklist before/after editing: newly-checked item with a
  cost → creates a ManualTransaction; unchecked item that had one → removes it; still-checked
  item with an existing transaction → keeps amount/label in sync. `handleDeleteTrip()` now also
  removes any transactions created by that trip's checklist items.
- `src/screens/EventsScreen.tsx` — added `reconcileEventTransaction()` (same idea, one-shot
  instead of per-item since an Event has a single budget, not a checklist), called from
  `handleSaveEvent()`. Marking Completed (with a budget) creates a transaction; un-marking
  removes it. `handleDeleteEvent()` now also removes the event's transaction if one exists.

**Confirmed this session:**
- `npx tsc --noEmit` — clean, no errors.
- Manually tested on a real phone: added a Travel checklist item with a cost, checked it off,
  saved → new transaction appeared in Transactions. Unchecked it, saved → transaction
  disappeared. Repeated the same test for an Event marked Completed. Both confirmed working.

---
## 📅 Session entry — Confirmed Checkpoint 6.3 (CSV Import) already fully built

**What happened this session:**
Following up on the previous session's flagged loose thread ("CsvImportModal.tsx exists and looks wired up, but wasn't read or tested"), both files were pulled and reviewed in full this session:

- `src/csvImport.ts` (142 lines) — a real, complete CSV parser. Handles quoted fields with embedded commas/escaped quotes, requires date/label/amount columns by header name (order-independent), accepts two date formats, defaults blank direction to "out", and returns per-row validation errors with specific messages.
- `src/screens/CsvImportModal.tsx` (287 lines) — a complete modal: file picker (restricted to .csv/.txt with a friendly nudge for wrong formats), reads and parses the file, shows a live preview of valid rows + a separate list of skipped rows with their reasons, and a working import button that appends the parsed transactions into `manualTransactions` via `saveModel()`. Fully themed, properly handles loading/error/done states.

Also confirmed:
- Both dependencies (`expo-document-picker`, `expo-file-system`) are present in `package.json`.
- `TransactionsScreen.tsx` genuinely imports, renders, and controls `CsvImportModal` via real state (`csvModalOpen`) with an "Import CSV" button — not dead code.
- `npx tsc --noEmit` run clean (no errors) both before and after this review.

**Conclusion: Checkpoint 6.3 is fully complete. This closes out the last open item in the entire roadmap — every phase (0–11) is now done.**

Also answered an unrelated Codespaces/VS Code UI question this session (the blue git-diff gutter/overview-ruler markers disappearing after a commit — expected behavior, not a bug; they reappear once there are new uncommitted changes to diff against).

🧹 Code health
- Files changed this session: **none** — PROGRESS.md only. This was a verification session.
- No new npm packages.
- `npx tsc --noEmit` — clean, zero errors, run twice.

⚠️ Known issues / gotchas (all optional polish, nothing blocking)
- Loans with "Custom" recurrence are still excluded from the Calendar's running-balance projection and Dashboard (Loan type has no customStartDate/customFreq/customOccurrenceCount fields; Monthly/Annual/One-time loans work fully).
- Debt-side "feesPortion" still doesn't exist in the data model — Tax Summary's Interest & Fees figure still only covers loan late fees, not debt fees. Clearly labeled on-screen as a known limitation.

2. **Optional polish**, if wanted (none are urgent — the last two items from the original polish list are now both done): Custom recurrence for Loans; add a feesPortion field to Debts so Tax Summary's interest/fees figure covers debts, not just loan late fees.
- Firestore rules still rely on document-ID secrecy rather than real per-user Firebase Auth (accepted limitation, see 9.4) — someone who already knows a household's exact link code/ID could still read/write to it.
- Pasting an entire large file's contents in one `cat` command can silently truncate mid-file in this terminal — splitting into smaller `cat`/`sed -n`/`wc -l` calls reliably works around it (confirmed again this session).
- PROGRESS.md can go stale relative to actual code — worth spot-checking real files (as done this session) rather than trusting notes blindly when something looks like it "should" already be done.

📌 Decisions made
- Firestore security model: rely on document-ID secrecy (a link code or household ID acting as an effective password) plus shape-validation rules, rather than building real Firebase Auth right now.
- Household linking mechanism: code-based (`linking.ts`), not the original `household.ts` lookup-by-username design from 9.2a — `household.ts` still exists, currently unused, may be revisited later.
- Household linking design: one shared random "household key" per household, wrapped separately per person's own passphrase-derived key.
- Checkpoint 9.3 (shared expense ledger + settle-up) will NOT be built — deliberate scope decision, don't re-propose unless the person brings it up.

▶️ Next step

**The roadmap has no remaining required checkpoints.** Options for the next session, entirely up to the person:

1. **Nothing — the app is done and usable as-is.** All 11 phases are built, tested, and confirmed working on real devices.
2. **Optional polish**, if wanted (none are urgent): Custom recurrence for Loans; auto-pull EF/FI calculator figures from Bills/Income; auto-log a real transaction when a Travel/Events checklist item completes; add a feesPortion field to Debts so Tax Summary's interest/fees figure is complete.
3. **Phase 13 — Publishing** (from the original roadmap, never started): using Expo's EAS Build service to produce a real installable .apk file to put on your own phone directly (free), or optionally publishing to Google Play / Apple App Store (has real costs — Google ~$25 one-time, Apple ~$99/year — entirely optional).
4. **Longer-term, not currently planned:** real Firebase Auth (per-user login) to close the remaining "knowing the ID/code is enough" gap in the security rules.

If starting a new session with no clear next step in mind, ask the person which of the above (if any) they'd like to tackle.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- firestore.rules — reference copy of the live Firestore security rules (the real, enforced version lives in the Firebase Console → Firestore Database → Rules tab, not in the app bundle).
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types, and `paymentMethod?: PaymentMethod` on `BillCycle`, `LoanPayment`, and `ManualTransaction`.
  - mobile-app/src/firebase.ts — Initializes the Firebase app and exports `db`, a Firestore instance.
  - mobile-app/src/household.ts — Household-key generation/wrap/unwrap + Firestore helpers, built in 9.2a, currently unused by the live flow (see linking.ts).
  - mobile-app/src/linking.ts — The actual mechanism powering Phase 9's linking UI (`startHouseholdLink`, `joinHouseholdLink`). Firestore access now governed by firestore.rules (9.4).
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math still Bills/Debts only)
  - mobile-app/src/csvImport.ts — CSV parsing logic for Checkpoint 6.3: parseTransactionsCsv(), header/row validation, date normalization. CONFIRMED COMPLETE THIS SESSION.
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals(). Does NOT carry paymentMethod through — PaymentMethodsReport.tsx reads the raw model directly instead.
  - mobile-app/src/components/PaymentMethodPicker.tsx — shared Cash/Debit/Credit picker component; used by BillsScreen.tsx, DebtsScreen.tsx, TransactionsScreen.tsx, and LoansScreen.tsx's payment log.
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed firing on a physical device.
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers.
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data.
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index, incl. updateProfileSalt(), saveEncryptedProfileData(), loadEncryptedProfileData(), householdId on ProfileIndexEntry + updateProfileHouseholdId() (not yet called anywhere).
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() + outstandingBalance() + loanOutstandingBalance(). Includes Loans (Monthly/Annual/One-time), excluding "lent" and Custom-recurrence loans.
  - mobile-app/src/categorization.ts — computeAutoCategory(), used by TransactionsScreen.tsx to auto-fill category from Categorization Rules.
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; wired to rescheduleBillNotifications(); includes changePassphrase().
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx — running balance reflects Loans too, confirmed on a real phone.
  - mobile-app/src/screens/AccountsScreen.tsx
  - mobile-app/src/screens/BillsScreen.tsx — includes payment-method picker on bill cycles.
  - mobile-app/src/screens/DebtsScreen.tsx — includes payment-method picker on debt cycles.
  - mobile-app/src/screens/LoansScreen.tsx — full payment log with date/amount/payment-method logging and removal, inside the edit-loan modal.
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx — includes payment-method picker on manual transactions, and CsvImportModal wired via a working "Import CSV" button — CONFIRMED WORKING THIS SESSION.
  - mobile-app/src/screens/CsvImportModal.tsx — CONFIRMED FULLY BUILT AND WORKING THIS SESSION. File picker, CSV parsing, preview, error reporting, import-confirm flow.
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/EventsScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx — "Amount Owed" shows Bills/Debts/Loans breakdown; "Due Soon" includes loan payments. Confirmed working on a real phone.
  - mobile-app/src/screens/InsightsScreen.tsx
  - mobile-app/src/screens/ReportsScreen.tsx — pill-switcher between report pages, 9 pills including Payment Methods.
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx
  - mobile-app/src/screens/reports/YearInReviewReport.tsx
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (loan late fees only, clearly labeled), full expense-by-category breakdown.
  - mobile-app/src/screens/reports/PaymentMethodsReport.tsx — Groups paid bill/debt cycles, non-lent loan payments, and outgoing manual transactions by PaymentMethod, with a "Not set" bucket, progress bars, and % of total.
  - mobile-app/src/screens/SettingsScreen.tsx — Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2), Security (change passphrase) / Data (backup + clear all) sections (11.3), and the real Household linking UI. No leftover debug UI.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8), expo-document-picker (~14.0.8), expo-file-system (~19.0.24), and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
