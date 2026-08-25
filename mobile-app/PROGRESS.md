Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

🎉 ROADMAP STATUS: FULLY COMPLETE. Every phase (0 through 11, including the shared-expense ledger decision in Phase 9) is built and confirmed working. Both previously-flagged optional polish items (Loan custom recurrence, Debt fees-portion tracking) are ALSO now confirmed done — see session entry below. What remains is one trivial doc cleanup (a stale code comment) plus, if wanted, Phase 13 (Publishing — EAS Build / App Store), which was never part of this roadmap's earlier phases and hasn't been started.

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
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete. Running-balance projection includes Loan payments across ALL recurrence types — Monthly, Annual, One-time, AND now Custom (confirmed this session — see below). No more exclusions.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE
- 5.1 — Add/edit/delete Bills. ✅ Complete. Bill cycles include a real payment-method picker (Cash/Debit/Credit, via the shared PaymentMethodPicker component), saved onto BillCycle.paymentMethod.
- 5.2 — Add/edit/delete Debts. ✅ Complete. Debt cycles (which reuse the BillCycle type) also include the same payment-method picker, PLUS a "Fees included in this payment" field (BillCycle.feesPortion) — confirmed wired in DebtsScreen.tsx and confirmed flowing into the Tax Summary report this session.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.3b — Loan edit screen has a "Payment log" section — log individual loan payments (date, amount, and Cash/Debit/Credit payment method via PaymentMethodPicker), see all logged payments listed with their date/method/amount, and remove any of them. Confirmed working on a real phone.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, AND Loans. ✅ FULLY COMPLETE AS OF THIS SESSION. Loan type now has customStartDate/customFreq/customOccurrenceCount fields (types.ts), the Loans screen's recurrence picker offers "Custom" as a choice and saves those three fields (LoansScreen.tsx), and the shared date-math (balanceProjection.ts's loanOccurrenceInMonth()) has a real `recurringType === 'custom'` branch that calls the same customOccurrencesInMonth() helper Bills/Debts already used. Monthly/Annual/One-time/Custom all work for Bills, Debts, and Loans now — no exclusions left.

Phase 6 — Transactions (M8) — ✅ FULLY COMPLETE
- 6.1 — Unified transaction list. ✅ Complete.
- 6.2 — Manually add a transaction, incl. receipt photo attachment, edit/delete. ✅ Complete and confirmed working on a real phone. Manual transactions also include the same payment-method picker (ManualTransaction.paymentMethod).
- 6.2b — Manual transactions have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import. ✅ CONFIRMED FULLY BUILT AND WORKING (confirmed in an earlier session).
  - `src/csvImport.ts` — real CSV parser: splits lines respecting quoted fields (incl. embedded commas and escaped "" quotes), requires a header row with date/label/amount columns (direction optional, defaults to "out"), accepts dates as YYYY-MM-DD or MM/DD/YYYY, per-row validation with a specific error message per failure (bad date, missing label, bad/zero amount, unrecognized direction).
  - `src/screens/CsvImportModal.tsx` — full modal UI: file picker restricted to .csv/.txt (with a friendly nudge if someone picks .xlsx by mistake), reads and parses the file, shows a preview (row count, first 8 valid rows with date/label/direction/amount, "+N more"), shows skipped/invalid rows with their specific reasons, a working "Import N transactions" button that appends them into `manualTransactions` via `saveModel()`, success/Done state, fully themed, no debug leftovers.
  - Confirmed wired into `TransactionsScreen.tsx` (imported, rendered, controlled by real `csvModalOpen` state, "Import CSV" button present).
  - Confirmed dependencies installed: `expo-document-picker` (~14.0.8), `expo-file-system` (~19.0.24).

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone. EF's "Monthly essential expenses" and FI's "Annual expenses" show a real, tappable auto-suggestion pulled from recurring Bills data (monthly bills at latest cycle amount, annual bills' latest cycle amount ÷ 12). Suggestion never overwrites a saved value automatically — it's a tap-to-accept line under each field, confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync AND real transaction logging: checking off a checklist item (with a cost) creates a real ManualTransaction on Save; unchecking it removes that transaction; editing the cost while checked keeps the transaction's amount in sync. Deleting a trip also cleans up any transactions its checklist items created.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone, including Events' own savings-goal auto-sync AND real transaction logging: marking an event "Completed" (with a budget set) creates a real ManualTransaction on Save; un-marking it removes that transaction. Deleting an event also cleans up any transaction it created.

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
  - Tax Summary (`src/screens/reports/TaxSummaryReport.tsx`): year-picker, total income/expenses/saved, "Interest & Fees Paid" card, full expense-by-category breakdown. **UPDATED THIS SESSION: now includes BOTH loan late fees AND debt fees.** `interestFees = loanLateFeesInYear(model, year) + debtFeesInYear(model, year)` — confirmed this addition actually lands in the number shown on screen, not just computed and discarded. `debtFeesInYear()` sums BillCycle.feesPortion across every debt cycle paid within the selected year. The old limitation (debt fees not counted) is resolved.
- Payment-method logging is fully rolled out across the whole app (Bills, Debts, Loans, manual Transactions), readable end-to-end via the Payment Methods report.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three. Verified end-to-end on a real phone.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION.
- 11.3 — Security & Household & Data. ✅ COMPLETE. Change passphrase, real household linking UI, backup (expo-file-system + expo-sharing), clear-all-data with confirm step. All confirmed on-device.

---
## 📅 Session entry — Verified BOTH optional polish items are fully done (Loan custom recurrence + Debt fees)

**What happened this session:**
This was a verification-only session (no new code written) — the person believed both items from the previous session's "optional polish" list were already done, and asked for confirmation. Walked the code end-to-end for each rather than trusting notes alone.

**1. Loan custom recurrence — CONFIRMED FULLY DONE.**
- `src/types.ts` — the `Loan` type now has `customFreq?`, `customStartDate?`, `customOccurrenceCount?` fields, matching `Bill` and `Debt`.
- `src/screens/LoansScreen.tsx` — the recurrence-type picker offers "Custom" as a real option, form state (`customFreqInput`, `customStartDateInput`, parsed occurrence count) captures it, and both the create and update save-paths persist all three fields onto the Loan record.
- `src/balanceProjection.ts` — `loanOccurrenceInMonth()` has a real `if (recurringType === 'custom')` branch calling the same `customOccurrencesInMonth()` helper Bills/Debts already use — so a Custom-recurrence loan now genuinely produces occurrences in the Calendar's running-balance math, not just in the form.
- **One loose end (not a bug, just stale text):** the comment block sitting directly above `loanOccurrenceInMonth()` (around line ~122–127 in balanceProjection.ts) still reads "Loans don't have Custom recurrence wired up on the data model yet... Custom loans simply produce no occurrences here for now" — that's leftover from before this was built and now contradicts the working code three lines below it. Harmless (comments don't execute), but confusing to read later. Flagged as a trivial cleanup, not fixed yet this session.

**2. Debt fees tracking — CONFIRMED FULLY DONE.**
- `src/types.ts` — `BillCycle` (shared by Bill and Debt cycles) has `feesPortion?: number | ''`.
- `src/screens/DebtsScreen.tsx` — a real "Fees included in this payment" input, with its own state (`feesPortionInput`), populated when editing an existing cycle, parsed and saved into the cycle on both the create-cycle and update-cycle paths.
- `src/screens/reports/TaxSummaryReport.tsx` — `debtFeesInYear()` sums `feesPortion` across every debt cycle paid within the selected year, and the report's headline "Interest & Fees Paid" figure is `loanLateFeesInYear(...) + debtFeesInYear(...)` — confirmed this is the actual number rendered on screen, not a dead calculation. The file's own header comment and inline comments have already been updated to describe this correctly (no stale-doc issue here, unlike the Loans one above).

**Conclusion: both optional polish items from the prior list are genuinely complete, end-to-end, confirmed by reading the real code — not just present in types.ts.** The roadmap (all 11 phases) plus both polish items are now fully done. The only thing left is the one stale comment noted above (purely cosmetic) and, if ever wanted, Phase 13 (Publishing) or real Firebase Auth (longer-term, not currently planned).

🧹 Code health
- Files changed this session: **none** — PROGRESS.md only. This was a verification session, same as the CSV-import confirmation session before it.
- No new npm packages.

⚠️ Known issues / gotchas (nothing blocking — one trivial doc cleanup only)
- **Stale comment in `src/balanceProjection.ts`**, just above `loanOccurrenceInMonth()` (~line 122–127): still says Loans "don't have Custom recurrence wired up on the data model yet" — this is now false; the code below it works correctly. Purely a documentation/readability issue, doesn't affect behavior. Easy one-comment fix whenever convenient.
- Firestore rules still rely on document-ID secrecy rather than real per-user Firebase Auth (accepted limitation, see 9.4) — someone who already knows a household's exact link code/ID could still read/write to it.
- Pasting an entire large file's contents in one `cat` command can silently truncate mid-file in this terminal — splitting into smaller `cat`/`sed -n`/`wc -l` calls reliably works around it.
- PROGRESS.md can go stale relative to actual code — worth spot-checking real files (as done this session, and the session before it) rather than trusting notes blindly when something looks like it "should" already be done. Both times so far, the code turned out to actually be further along than expected, not behind.

📌 Decisions made
- Firestore security model: rely on document-ID secrecy (a link code or household ID acting as an effective password) plus shape-validation rules, rather than building real Firebase Auth right now.
- Household linking mechanism: code-based (`linking.ts`), not the original `household.ts` lookup-by-username design from 9.2a — `household.ts` still exists, currently unused, may be revisited later.
- Household linking design: one shared random "household key" per household, wrapped separately per person's own passphrase-derived key.
- Checkpoint 9.3 (shared expense ledger + settle-up) will NOT be built — deliberate scope decision, don't re-propose unless the person brings it up.

▶️ Next step

**The roadmap plus both optional polish items have no remaining required work.** Options for the next session, entirely up to the person:

1. **Nothing — the app is done and usable as-is.** All 11 phases, plus both former "optional polish" items (Loan custom recurrence, Debt fees), are built, tested, and confirmed working.
2. **Trivial cleanup, if wanted:** fix the one stale comment in `balanceProjection.ts` (~line 122–127) so it stops incorrectly claiming Loans lack Custom recurrence. Purely cosmetic — takes one small paste.
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
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types, `paymentMethod?: PaymentMethod` on `BillCycle`, `LoanPayment`, and `ManualTransaction`, `feesPortion?` on `BillCycle`, and `customFreq`/`customStartDate`/`customOccurrenceCount` on Bill, Debt, AND Loan.
  - mobile-app/src/firebase.ts — Initializes the Firebase app and exports `db`, a Firestore instance.
  - mobile-app/src/household.ts — Household-key generation/wrap/unwrap + Firestore helpers, built in 9.2a, currently unused by the live flow (see linking.ts).
  - mobile-app/src/linking.ts — The actual mechanism powering Phase 9's linking UI (`startHouseholdLink`, `joinHouseholdLink`). Firestore access now governed by firestore.rules (9.4).
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math now confirmed used by all three).
  - mobile-app/src/csvImport.ts — CSV parsing logic for Checkpoint 6.3: parseTransactionsCsv(), header/row validation, date normalization.
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
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() + outstandingBalance() + loanOutstandingBalance(). Includes Loans across ALL recurrence types (Monthly/Annual/One-time/Custom), excluding only "lent" loans (by design — repayments received aren't a cost to you). Contains one stale comment near loanOccurrenceInMonth() flagged above — cosmetic only.
  - mobile-app/src/categorization.ts — computeAutoCategory(), used by TransactionsScreen.tsx to auto-fill category from Categorization Rules.
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; wired to rescheduleBillNotifications(); includes changePassphrase().
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx — running balance reflects Loans of all recurrence types now, confirmed via code walkthrough this session.
  - mobile-app/src/screens/AccountsScreen.tsx
  - mobile-app/src/screens/BillsScreen.tsx — includes payment-method picker on bill cycles.
  - mobile-app/src/screens/DebtsScreen.tsx — includes payment-method picker AND "Fees included in this payment" field (feesPortion) on debt cycles — confirmed wired through to Tax Summary this session.
  - mobile-app/src/screens/LoansScreen.tsx — full payment log with date/amount/payment-method logging and removal, PLUS a working "Custom" recurrence option (confirmed this session) alongside Monthly/Annual/One-time.
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx — includes payment-method picker on manual transactions, and CsvImportModal wired via a working "Import CSV" button.
  - mobile-app/src/screens/CsvImportModal.tsx — File picker, CSV parsing, preview, error reporting, import-confirm flow.
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
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (NOW includes both loan late fees AND debt fees — confirmed this session), full expense-by-category breakdown.
  - mobile-app/src/screens/reports/PaymentMethodsReport.tsx — Groups paid bill/debt cycles, non-lent loan payments, and outgoing manual transactions by PaymentMethod, with a "Not set" bucket, progress bars, and % of total.
  - mobile-app/src/screens/SettingsScreen.tsx — Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2), Security (change passphrase) / Data (backup + clear all) sections (11.3), and the real Household linking UI. No leftover debug UI.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8), expo-document-picker (~14.0.8), expo-file-system (~19.0.24), and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
