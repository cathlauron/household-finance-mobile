Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

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
- 5.1 — Add/edit/delete Bills. ✅ Complete. Bill cycles include a real payment-method picker (Cash/Debit/Credit, via the shared PaymentMethodPicker component), saved onto BillCycle.paymentMethod. Confirmed wired in BillsScreen.tsx and compiling clean.
- 5.2 — Add/edit/delete Debts. ✅ Complete. Debt cycles (which reuse the BillCycle type) also include the same payment-method picker, confirmed wired in DebtsScreen.tsx.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.3b — Loan edit screen has a "Payment log" section — log individual loan payments (date, amount, and Cash/Debit/Credit payment method via PaymentMethodPicker), see all logged payments listed with their date/method/amount, and remove any of them. Only shown once a loan already exists (save the loan first, then reopen it to log payments). Confirmed working on a real phone.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete for Bills/Debts. NOTE: "Custom" recurrence is only usable for Bills/Debts — the Loan type has no customStartDate/customFreq/customOccurrenceCount fields, and the Loans screen's own recurrence dropdown doesn't offer "Custom" as a choice. Monthly/Annual/One-time loans work fully everywhere.

Phase 6 — Transactions (M8) — ✅ CORE COMPLETE (CSV import still optional/outstanding)
- 6.1 — Unified transaction list. ✅ Complete.
- 6.2 — Manually add a transaction, incl. receipt photo attachment, edit/delete. ✅ Complete and confirmed working on a real phone. Manual transactions also include the same payment-method picker (ManualTransaction.paymentMethod), confirmed wired in TransactionsScreen.tsx.
- 6.2b — Manual transactions have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import: a CsvImportModal component exists and is wired into TransactionsScreen.tsx ("Import CSV" button next to "+ Add transaction"). Not yet explicitly re-confirmed working end-to-end on a real phone this session — flagged to verify, but appears built. Explicitly optional/deferrable per the roadmap either way.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync (tripFullChecklistTotal/syncTripSavingsGoal), verified in an earlier session.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone, including Events' own savings-goal auto-sync (syncEventSavingsGoal), mirroring Travel's pattern, verified in an earlier session.

Phase 9 — Household Linking (M3) — ✅ COMPLETE. (M11, shared expense ledger, was explicitly SKIPPED by decision — see 9.3 below, not deferred.)
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore). Originally set up in "test mode" (wide-open rules) — real security rules are now in place and confirmed working (see 9.4 below).
  - A free Firebase project was created (household-finance-mobile), Firestore Database was enabled, and a Web app was registered inside that Firebase project to get connection keys (firebaseConfig — these are not secret; they only identify which project to connect to, not a password).
  - `npm install firebase` was run inside mobile-app/.
  - `mobile-app/src/firebase.ts` initializes the Firebase app and exports `db` (a Firestore instance).

- 9.2a — Household key encryption + linking plumbing. ✅ COMPLETE.
  - **`src/household.ts`** — the core "how linking works" logic (data layer, no UI): `generateHouseholdId()`, `generateHouseholdKey()`, `wrapHouseholdKey`/`unwrapHouseholdKey`, `saveHouseholdData`/`loadHouseholdData`, `saveWrappedHouseholdKey`/`loadWrappedHouseholdKey`/`deleteWrappedHouseholdKey`.
  - **`src/storage.ts`** — `ProfileIndexEntry` now has an optional `householdId` field, plus `updateProfileHouseholdId(username, householdId)`.
  - Not currently used by the live linking flow — see 9.2b, which used a simpler mechanism instead.

- 9.2b-i — "Start linking" (generate & share a code). ✅ COMPLETE, CONFIRMED WORKING ON A REAL PHONE.
  - **`src/linking.ts`** — a short 6-character link code mechanism (unambiguous alphabet, no 0/O/1/I/L). `startHouseholdLink(username, model)` generates a fresh shared secret + short code, encrypts the shared secret with a key derived from the code itself, encrypts the phone's own current household data with the shared secret, uploads both to Firestore at `linkCodes/{code}`.
  - **SettingsScreen.tsx** — "Start linking (get a code)" button under a Household section.

- 9.2b-ii — "Join with a code" + comparison screen. ✅ COMPLETE, CONFIRMED WORKING END-TO-END ON TWO REAL PHONES.
  - **`src/linking.ts`** — `joinHouseholdLink(codeInput)` looks up the code, unwraps the shared secret, unlocks the first phone's data. Friendly error if the code doesn't exist or fails to decrypt.
  - **SettingsScreen.tsx** — "Join with a code" input + comparison view (via `summarizeModel()`) with **Keep mine / Keep theirs / Merge both**.

- 9.2c — Making the choice permanent, wiring DataContext to read/write shared household data going forward. ✅ COMPLETE, CONFIRMED WORKING END-TO-END ON TWO REAL PHONES.
  - Full linking flow tested including merge, and confirmed real two-way sync after linking (new items on either linked profile appear on the other).

- **9.3 (shared expense ledger + settle-up) — SKIPPED BY DECISION, not deferred.** The person confirmed this doesn't reflect how they manage money as partners — they share expenses without tracking who owes whom. Do not resurface this as a pending checkpoint in future sessions.

- **9.4 — Firestore security rules (replacing wide-open test mode). ✅ COMPLETE, CONFIRMED WORKING.**
  - Real rules written and saved to the repo as `firestore.rules` (reference copy), and separately pasted/published live in the Firebase Console (Firestore Database → Rules tab) — the console is the actual enforcement point.
  - Rules restrict `linkCodes/{code}`, `households/{householdId}`, and `householdKeys/{username}` to only accept writes matching the app's real document shapes; block all deletes except on `householdKeys` (needed for unlinking); block listing/browsing; deny everything else outright.
  - Tested and confirmed working on real devices after publishing: sign-in, bill create/edit, and the linked-household flow all continued to work with no errors.
  - **Accepted limitation:** no real Firebase Auth/login layer, so rules can't stop someone who already knew another household's exact ID/code from reading/writing to it — they only block malformed writes and deletion of protected collections. Real per-user auth is a bigger, separate undertaking and is not currently planned.

Phase 10 — Dashboard & Reports (M12–M13) — ✅ FULLY COMPLETE
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" card includes a third Loans line (borrowed loans only — "lent" loans excluded) alongside Bills and Debts, and "Due in the Next 14 Days" includes upcoming loan payments too.
- 10.2 — Reports pages. ✅ COMPLETE — all NINE report pages built and wired into ReportsScreen.tsx's pill switcher: Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary, and **Payment Methods**.
  - **Payment Methods report — CONFIRMED BUILT AND WORKING THIS SESSION** (`src/screens/reports/PaymentMethodsReport.tsx`). PROGRESS.md had previously (incorrectly) listed this as not built — that note was stale; this session's audit found the file already existed, fully implemented, and already wired into ReportsScreen.tsx's 9th pill. Groups every paid Bill cycle, paid Debt cycle, non-"lent" Loan payment, and outgoing manual Transaction by its logged PaymentMethod (Cash / Debit — account name / Credit — account name), with a "Not set" bucket for anything logged before payment methods existed or left unpicked. Doesn't reuse buildTransactionsList() (transactions.ts) since that helper doesn't carry paymentMethod through — walks the same raw model records directly instead.
  - Tax Summary: `src/screens/reports/TaxSummaryReport.tsx`. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full expense-by-category breakdown. Confirmed working on a real phone.
  - **IMPORTANT LIMITATION, flagged on-screen:** Tax Summary's "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment). Debt-side fees are NOT included — Debt/BillCycle in types.ts has no feesPortion field. Real data-model gap, not a report bug.
- **Payment-method logging is now fully rolled out across the whole app**: Bill cycles, Debt cycles, Loan payments, and manual Transactions all capture an optional `paymentMethod` (Cash/Debit/Credit) via the shared `PaymentMethodPicker` component, and it's all readable end-to-end via the Payment Methods report.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE (Household section within it now superseded by Phase 9's real linking UI — see above)
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three. Verified end-to-end on a real phone.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION. `rescheduleBillNotifications()` called from both `loadModel()` and `saveModel()` in DataContext.tsx, non-blocking with silent-fail. Confirmed firing on a real physical device. No leftover debug UI.
- 11.3 — Security & Household & Data. ✅ COMPLETE.
  - **Security (change passphrase):** Verifies current passphrase first, generates a new salt, re-derives and re-encrypts, swaps the in-memory session key. Confirmed on-device end to end.
  - **Household:** Real "Start linking" / "Join with a code" flow (see Phase 9).
  - **Data (backup + clear):** "Save a backup" via expo-file-system + expo-sharing; "Clear all data & start fresh" with confirm step. Both confirmed working on-device.
  - `npx tsc --noEmit` passed clean.

---
## 📅 Session entry — PROGRESS.md audit: Payment Methods work was already fully done

**What happened this session:**
The plan going in was to continue "rolling out payment-method logging" to Bills, Debts, and Transactions one screen at a time, per the previous session's ▶️ Next step, then eventually build the Payment Methods report. Before writing any code, the actual source files were pulled and reviewed first (per the project's own rule of always reading real code before writing anything) — and it turned out **all of this was already done**:

- `BillsScreen.tsx` — already imports `PaymentMethodPicker`, has `paymentMethodInput` state, renders the picker in the modal, and saves it onto the bill's cycle in both the create and edit paths.
- `DebtsScreen.tsx` — same pattern, already fully wired.
- `TransactionsScreen.tsx` — same pattern, already fully wired onto `ManualTransaction.paymentMethod`.
- `types.ts` — `PaymentMethod` type already existed, with `paymentMethod?: PaymentMethod` already present on `BillCycle` (shared by Bills and Debts), `LoanPayment`, and `ManualTransaction`.
- `ReportsScreen.tsx` — already imports and renders `PaymentMethodsReport` as a 9th pill in `REPORT_TABS`.
- `src/screens/reports/PaymentMethodsReport.tsx` — **already exists**, fully implemented: walks bills/debts/loans/manual transactions directly (bypassing `transactions.ts`'s `buildTransactionsList()`, which doesn't carry `paymentMethod` through), groups by Cash/Debit-account/Credit-account, sorts by total with "Not set" pinned to the bottom, shows per-method progress bars and % of total.
- `npx tsc --noEmit` was run twice this session (once mid-audit, once at the end) and printed nothing both times — clean compile.

**Conclusion:** Phase 10.2 (Reports) is fully complete, including the Payment Methods report specifically. The previous PROGRESS.md's claim that this was still outstanding was stale — most likely from a session that did this work but never wrote up the update. No new code was written this session; the work was verifying reality against the notes and correcting the notes.

**One loose thread noticed but not resolved:** `TransactionsScreen.tsx` imports and renders a `CsvImportModal` component with a working-looking "Import CSV" button — this suggests Checkpoint 6.3 (CSV import, explicitly optional) may also already be built. This was NOT verified this session (didn't open `CsvImportModal.tsx` or test it on a real device) and is flagged below as the natural next thing to check, rather than assumed done.

🧹 Code health
- Files changed this session: **none** — PROGRESS.md only.
- No new npm packages.
- `npx tsc --noEmit` — clean, zero errors, run twice.

⚠️ Known issues / gotchas
- (All previously known issues still stand — see below.)
- **PROGRESS.md can go stale** — this session is proof: an entire checkpoint's worth of work (payment-method wiring across 4 screens + a full report page) was completed and never logged. Worth being a little more skeptical of "still needs doing" notes going forward and spot-checking the actual files before assuming work is required.
- Loans with "Custom" recurrence are still excluded from the projection/Dashboard.
- Debt-side "feesPortion" still doesn't exist in the data model — Tax Summary's Interest & Fees figure still only covers loan late fees.
- Firestore rules still rely on document-ID secrecy rather than real per-user auth (accepted limitation, see 9.4).
- Pasting an entire large file's contents in one `cat` command can silently truncate mid-file in this terminal — splitting into smaller `cat`/`head`/`tail` calls reliably works around it. (Reconfirmed this session — the first `cat` of three files in one command only returned the last file's content.)

📌 Decisions made
- (All decisions from prior sessions still stand — see below.)
- Firestore security model: rely on document-ID secrecy (a link code or household ID acting as an effective password) plus shape-validation rules, rather than building real Firebase Auth right now.
- Household linking mechanism: code-based (`linking.ts`), not the original `household.ts` lookup-by-username design from 9.2a — `household.ts` still exists, currently unused, may be revisited later.
- Household linking design: one shared random "household key" per household, wrapped separately per person's own passphrase-derived key.
- Checkpoint 9.3 (shared expense ledger + settle-up) will NOT be built — deliberate scope decision, don't re-propose unless the person brings it up.

▶️ Next step

1. **Verify Checkpoint 6.3 (CSV import) is actually done** — `CsvImportModal.tsx` exists and is wired into `TransactionsScreen.tsx` with an "Import CSV" button, but wasn't opened/read or tested on a real device this session. Read the file first, then confirm on-device if it looks complete. This is explicitly optional per the roadmap either way, so low urgency.
2. **Custom recurrence for Loans** — would need new fields on the Loan type (customStartDate/customFreq/customOccurrenceCount) plus a "Custom" option added to the Loans screen's recurrence dropdown, before balanceProjection.ts could even use it.
3. Smaller loose ends still flagged from earlier sessions: EF/FI calculators still don't auto-pull figures from Bills/Income; neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target); debt-side "feesPortion" doesn't exist in the data model.
4. **Longer-term, not currently planned:** real Firebase Auth (per-user login) to close the remaining "knowing the ID/code is enough" gap in the security rules — accepted limitation, not an active to-do.

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
  - mobile-app/src/screens/BillsScreen.tsx — includes payment-method picker on bill cycles, confirmed wired this session.
  - mobile-app/src/screens/DebtsScreen.tsx — includes payment-method picker on debt cycles, confirmed wired this session.
  - mobile-app/src/screens/LoansScreen.tsx — full payment log with date/amount/payment-method logging and removal, inside the edit-loan modal.
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx — includes payment-method picker on manual transactions, confirmed wired this session. Also renders CsvImportModal via an "Import CSV" button — not yet verified this session (see Next step #1).
  - mobile-app/src/screens/CsvImportModal.tsx — exists, referenced by TransactionsScreen.tsx. Not yet read/verified this session.
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/EventsScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx — "Amount Owed" shows Bills/Debts/Loans breakdown; "Due Soon" includes loan payments. Confirmed working on a real phone.
  - mobile-app/src/screens/InsightsScreen.tsx
  - mobile-app/src/screens/ReportsScreen.tsx — pill-switcher between report pages, now 9 pills including Payment Methods.
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx
  - mobile-app/src/screens/reports/YearInReviewReport.tsx
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (loan late fees only, clearly labeled), full expense-by-category breakdown.
  - mobile-app/src/screens/reports/PaymentMethodsReport.tsx — CONFIRMED BUILT THIS SESSION. Groups paid bill/debt cycles, non-lent loan payments, and outgoing manual transactions by PaymentMethod, with a "Not set" bucket, progress bars, and % of total.
  - mobile-app/src/screens/SettingsScreen.tsx — Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2), Security (change passphrase) / Data (backup + clear all) sections (11.3), and the real Household linking UI. No leftover debug UI.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8) and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
