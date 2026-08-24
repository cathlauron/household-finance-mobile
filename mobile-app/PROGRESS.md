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

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE, PLUS extra payment-method work this session
- 5.1 — Add/edit/delete Bills. ✅ Complete.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.3b — NEW THIS SESSION: Loan edit screen now has a real "Payment log" section — log individual loan payments (date, amount, and Cash/Debit/Credit payment method via the shared PaymentMethodPicker component), see all logged payments listed with their date/method/amount, and remove any of them. Only shown once a loan already exists (you save the loan first, then reopen it to log payments). Confirmed compiling clean (`npx tsc --noEmit`, zero errors) and confirmed working on a real phone: logged a payment with a payment method, saved, reopened the loan, confirmed it showed correctly, confirmed removing one works.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete. NOTE: "Custom" recurrence is only usable for Bills/Debts — the Loan type has no customStartDate/customFreq/customOccurrenceCount fields, and the Loans screen's own recurrence dropdown doesn't offer "Custom" as a choice. Monthly/Annual/One-time loans work fully everywhere.

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

Phase 9 — Household Linking (M3) — ✅ COMPLETE. (M11, shared expense ledger, was explicitly SKIPPED by decision — see 9.3 below, not deferred.)
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore). Originally set up in "test mode" (wide-open rules) — real security rules are now in place and confirmed working (see 9.4 below).
  - A free Firebase project was created (household-finance-mobile), Firestore Database was enabled, and a Web app was registered inside that Firebase project to get connection keys (firebaseConfig — these are not secret; they only identify which project to connect to, not a password).
  - `npm install firebase` was run inside mobile-app/.
  - `mobile-app/src/firebase.ts` initializes the Firebase app and exports `db` (a Firestore instance).

- 9.2a — Household key encryption + linking plumbing. ✅ COMPLETE. `npx tsc --noEmit` passed clean.
  - **`src/household.ts`** — the core "how linking works" logic (data layer, no UI): `generateHouseholdId()`, `generateHouseholdKey()`, `wrapHouseholdKey`/`unwrapHouseholdKey`, `saveHouseholdData`/`loadHouseholdData`, `saveWrappedHouseholdKey`/`loadWrappedHouseholdKey`/`deleteWrappedHouseholdKey`.
  - **`src/storage.ts`** — `ProfileIndexEntry` now has an optional `householdId` field, plus `updateProfileHouseholdId(username, householdId)`.
  - Not currently used by the live linking flow — see 9.2b, which used a simpler mechanism instead.

- 9.2b-i — "Start linking" (generate & share a code). ✅ COMPLETE, CONFIRMED WORKING ON A REAL PHONE.
  - **New file `src/linking.ts`** — a short 6-character link code mechanism (unambiguous alphabet, no 0/O/1/I/L). `startHouseholdLink(username, model)` generates a fresh shared secret + short code, encrypts the shared secret with a key derived from the code itself, encrypts the phone's own current household data with the shared secret, uploads both to Firestore at `linkCodes/{code}`.
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

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" card includes a third Loans line (borrowed loans only — "lent" loans excluded) alongside Bills and Debts, and "Due in the Next 14 Days" includes upcoming loan payments too.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of nine report pages done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: **Payment Methods** — deliberately deferred, see note below (partial groundwork now laid this session, see Phase 5.3b).
  - Tax Summary: `src/screens/reports/TaxSummaryReport.tsx`, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full expense-by-category breakdown. Confirmed working on a real phone.
  - **IMPORTANT LIMITATION, flagged on-screen:** "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment). Debt-side fees are NOT included — Debt/BillCycle in types.ts has no feesPortion field. Real data-model gap, not a report bug.
  - **Payment Methods report — still NOT built.** UPDATE THIS SESSION: the `PaymentMethod` type and `PaymentMethodPicker` component already existed and are now actually wired into the Loans screen's new payment-log feature (5.3b above), so Loan payments now capture how they were paid. HOWEVER: BillCycle, Debt cycles, and ManualTransaction still have no paymentMethod field/picker anywhere — this report still needs those three wired up too, plus the report page itself still doesn't exist. Scoped as its own future checkpoint, now partially underway.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE (Household section within it now superseded by Phase 9's real linking UI — see above)
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three. Verified end-to-end on a real phone.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION. `rescheduleBillNotifications()` called from both `loadModel()` and `saveModel()` in DataContext.tsx, non-blocking with silent-fail. Confirmed firing on a real physical device. No leftover debug UI.
- 11.3 — Security & Household & Data. ✅ COMPLETE.
  - **Security (change passphrase):** Verifies current passphrase first, generates a new salt, re-derives and re-encrypts, swaps the in-memory session key. Confirmed on-device end to end.
  - **Household:** Real "Start linking" / "Join with a code" flow (see Phase 9).
  - **Data (backup + clear):** "Save a backup" via expo-file-system + expo-sharing; "Clear all data & start fresh" with confirm step. Both confirmed working on-device.
  - `npx tsc --noEmit` passed clean.

---
## 📅 Session entry — Loan payment log with payment-method picker (Checkpoint 5.3b)

**What was done:**
- Confirmed `LoanPayment` already had a `paymentMethod?: PaymentMethod` field in `types.ts` from earlier work, and that `PaymentMethodPicker` already existed as a shared component — this session wired both into the actual Loans screen for the first time, since nothing had used them yet.
- Added a "Payment log" section inside the edit-loan modal in `LoansScreen.tsx`, visible only once a loan already exists (a brand-new, unsaved loan shows a hint to save first, then reopen to log payments):
  - Lists every logged payment (date, payment-method label, amount) with a remove (✕) button per row.
  - A mini "log a new payment" form: date (YYYY-MM-DD, validated), amount (validated > 0), and the shared `PaymentMethodPicker` for Cash/Debit/Credit.
  - New helper `paymentMethodLabel()` turns a `PaymentMethod` into a friendly display string (e.g. "Debit — GCash"), reused in the payment list.
  - `handleSave()` now writes `paymentsInput` into the loan's `actualPayments` field on save.
- Nine total edits made to `LoansScreen.tsx`: imports, the new label helper, four new pieces of state, `openAddModal`/`openEditModal` reset/load logic, add/remove handlers, `handleSave` wiring, the JSX section itself, and new styles.
- `npx tsc --noEmit` passed clean, zero errors.
- **Confirmed on a real phone:** opened an existing loan, logged a payment with a payment method, saved, reopened the loan, confirmed the payment showed in the list with the correct amount and method, confirmed removing a logged payment works.

🧹 Code health
- Files changed: `mobile-app/src/screens/LoansScreen.tsx` only.
- No new npm packages.
- `npx tsc --noEmit` — clean, zero errors.

⚠️ Known issues / gotchas
- (All previously known issues still stand — see below.)
- Loan payments now capture a payment method, but **Bills, Debts, and manual Transactions still don't** — none of `BillCycle`, Debt cycles, or `ManualTransaction` have a `paymentMethod` field or picker UI yet. The Payment Methods report still can't be built until those three catch up.
- Loans with "Custom" recurrence are still excluded from the projection/Dashboard.
- Debt-side "feesPortion" still doesn't exist in the data model — Tax Summary's Interest & Fees figure still only covers loan late fees.
- Firestore rules still rely on document-ID secrecy rather than real per-user auth (accepted limitation, see 9.4).
- Pasting an entire large file's contents in one `cat` command can silently truncate mid-file in this terminal — splitting into smaller `cat`/`head` calls reliably works around it.

📌 Decisions made
- (All decisions from prior sessions still stand — see below.)
- **This session:** payment-method logging is being rolled out one screen at a time rather than all at once — Loans first (since it already had the type field and the shared picker just needed wiring up), Bills/Debts/Transactions to follow before the Payment Methods report itself gets built.
- Firestore security model: rely on document-ID secrecy (a link code or household ID acting as an effective password) plus shape-validation rules, rather than building real Firebase Auth right now.
- Household linking mechanism: code-based (`linking.ts`), not the original `household.ts` lookup-by-username design from 9.2a — `household.ts` still exists, currently unused, may be revisited later.
- Household linking design: one shared random "household key" per household, wrapped separately per person's own passphrase-derived key.
- Checkpoint 9.3 (shared expense ledger + settle-up) will NOT be built — deliberate scope decision, don't re-propose unless the person brings it up.

▶️ Next step

1. **Continue rolling out payment-method logging** — add the `paymentMethod` field + `PaymentMethodPicker` UI to Bill cycles, Debt cycles, and the manual Transaction form, mirroring what was just done for Loans in `LoansScreen.tsx` this session.
2. **Build the Payment Methods report page itself** — blocked until step 1 covers enough of the data for the report to be meaningful (currently only Loans capture it).
3. **Custom recurrence for Loans** — would need new fields on the Loan type (customStartDate/customFreq/customOccurrenceCount) plus a "Custom" option added to the Loans screen's recurrence dropdown, before balanceProjection.ts could even use it.
4. Smaller loose ends still flagged from earlier sessions: EF/FI calculators still don't auto-pull figures from Bills/Income; neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target); debt-side "feesPortion" doesn't exist in the data model.
5. **Optional/deferred from earlier:** Checkpoint 6.3, CSV import for Transactions — explicitly optional per the roadmap, still not built.
6. **Longer-term, not currently planned:** real Firebase Auth (per-user login) to close the remaining "knowing the ID/code is enough" gap in the security rules — accepted limitation, not an active to-do.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- firestore.rules — reference copy of the live Firestore security rules (the real, enforced version lives in the Firebase Console → Firestore Database → Rules tab, not in the app bundle).
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types, and `paymentMethod?: PaymentMethod` on `LoanPayment`. Still no paymentMethod field on BillCycle, Debt cycles, or ManualTransaction.
  - mobile-app/src/firebase.ts — Initializes the Firebase app and exports `db`, a Firestore instance.
  - mobile-app/src/household.ts — Household-key generation/wrap/unwrap + Firestore helpers, built in 9.2a, currently unused by the live flow (see linking.ts).
  - mobile-app/src/linking.ts — The actual mechanism powering Phase 9's linking UI (`startHouseholdLink`, `joinHouseholdLink`). Firestore access now governed by firestore.rules (9.4).
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math still Bills/Debts only)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/components/PaymentMethodPicker.tsx — shared Cash/Debit/Credit picker component; now used by LoansScreen.tsx's payment log (this session).
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
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; wired to rescheduleBillNotifications(); includes changePassphrase().
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx — running balance reflects Loans too, confirmed on a real phone.
  - mobile-app/src/screens/AccountsScreen.tsx
  - mobile-app/src/screens/BillsScreen.tsx
  - mobile-app/src/screens/DebtsScreen.tsx
  - mobile-app/src/screens/LoansScreen.tsx — UPDATED THIS SESSION: full payment log with date/amount/payment-method logging and removal, inside the edit-loan modal. Confirmed working on a real phone.
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/EventsScreen.tsx — real savings-goal auto-sync, confirmed working on a real phone.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx — "Amount Owed" shows Bills/Debts/Loans breakdown; "Due Soon" includes loan payments. Confirmed working on a real phone.
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
  - mobile-app/src/screens/SettingsScreen.tsx — Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2), Security (change passphrase) / Data (backup + clear all) sections (11.3), and the real Household linking UI. No leftover debug UI.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8) and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
