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
- 5.1 — Add/edit/delete Bills. ✅ Complete.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
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

Phase 9 — Shared Expenses / Household Linking (M3, M11) — 🔧 IN PROGRESS
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore, in "test mode" — wide-open rules for now, to be locked down with real security rules in Checkpoint 9.2/9.3 before any real household data touches it).
  - A free Firebase project was created (household-finance-mobile), Firestore Database was enabled in test mode, and a Web app was registered inside that Firebase project to get connection keys (firebaseConfig — these are not secret; they only identify which project to connect to, not a password).
  - `npm install firebase` was run inside mobile-app/.
  - New file `mobile-app/src/firebase.ts` created: initializes the Firebase app and exports `db` (a Firestore instance) for any future file to import when it needs to read/write shared household data. Nothing else in the app imports or uses `db` yet — this checkpoint was purely "prove the pipe works," not build any real feature on top of it.
  - Verified end-to-end with a temporary "Test Firebase Connection" button added to SettingsScreen.tsx (wrote a doc to Firestore, read it back, showed a ✅ success message). Confirmed working on a real phone. The temporary button, its handler function, its state, and its Firebase imports were then fully removed from SettingsScreen.tsx afterward — confirmed via `grep -n "firebase|Firebase" src/screens/SettingsScreen.tsx` returning zero results. No leftover debug code.
  - 9.2 (link two profiles/phones together) and 9.3 (shared expense ledger + settle-up) are NOT started yet — those are the next steps in this phase.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" card includes a third Loans line (borrowed loans only — "lent" loans excluded since that's money owed to you, not an expense) alongside the existing Bills and Debts lines, and the "Due in the Next 14 Days" list includes upcoming loan payments too. Confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice. Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. Scoped as its own future checkpoint.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three (Categories with color-swatch picker and duplicate-name checking; Merchants & Payees with optional default category; Categorization Rules with up/down reorder arrows since rule order determines match priority, plus amount-range validation). Verified end-to-end on a real phone in an earlier session.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION. rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. Confirmed firing on a real physical device. The temporary "Send a test notification in 10 seconds" debug button has been removed from SettingsScreen.tsx, and the app was confirmed still working correctly (including real notifications) on-device afterward. Fully clean, no leftover debug UI.
- 11.3 — Security & Household & Data. ✅ COMPLETE. Built from scratch and confirmed working on a real phone:
  - **Security (change passphrase):** Verifies the current passphrase is correct first (re-derives a key from it and successfully decrypts existing data) before changing anything. Generates a brand new random salt, derives a new key from the new passphrase + new salt, re-encrypts all in-memory data with it, saves it, updates the profiles index with the new salt, and swaps the in-memory session key so future saves keep working without needing to sign out and back in. Confirmed on-device: changed passphrase, fully closed and reopened the app, signed in successfully with the new passphrase.
  - **Household:** One-line placeholder text noting that sharing data between phones is coming in a future update (Phase 9), matching the earlier Phase 0.1 decision. Phase 9 has since begun (see above) — this placeholder text has NOT been updated/removed yet.
  - **Data (backup + clear):** "Save a backup" writes the full decrypted model to a JSON file via expo-file-system and opens the native share sheet via expo-sharing so the file can be saved to Files, emailed, etc. "Clear all data & start fresh" wipes all entries back to defaultModel() after a confirm step, while keeping the same username/passphrase. Both confirmed working on-device.
  - New files/changes: src/storage.ts (added updateProfileSalt, saveEncryptedProfileData/loadEncryptedProfileData), src/DataContext.tsx (added changePassphrase), src/screens/SettingsScreen.tsx (added Security/Household/Data sections). New dependency: expo-sharing (~14.0.8).
  - npx tsc --noEmit passed clean with zero errors.

**PHASE 11 IS FULLY COMPLETE — INCLUDING ALL CLEANUP. NO KNOWN LOOSE ENDS REMAIN IN THIS PHASE.**

---

## 📅 Session entry — Checkpoint 9.1: Firebase project created & connection confirmed on-device

This session kicked off Phase 9 (Shared Expenses / Household Linking) — the
hardest technical part of the whole project, previously deferred from Phase
0.1. Checkpoint 9.1 is just "get the sync backend live and confirm the app can
talk to it" — no shared-expense features, no linking two profiles yet. Those
are Checkpoints 9.2 and 9.3, still ahead.

**Decision made this session:** Firebase (Firestore) was chosen as the sync
service, on Claude's recommendation as the simplest option to wire up with
Expo.

**What was done:**
- Created a free Firebase project (household-finance-mobile) at
  console.firebase.google.com.
- Enabled Firestore Database in **test mode** (wide-open read/write rules,
  time-limited to 30 days by Firebase itself). This is intentional and
  temporary — real security rules need to be written in a later checkpoint
  (9.2 or 9.3) once it's clear exactly what data needs protecting, before any
  real household data ever touches this database.
- Registered a Web app inside that Firebase project to get a `firebaseConfig`
  object (apiKey, authDomain, projectId, storageBucket, messagingSenderId,
  appId). These values are not secret — they only identify which Firebase
  project to connect to; actual protection comes from Firestore security
  rules, not from hiding these.
- Ran `npm install firebase` inside `mobile-app/`.
- Created `mobile-app/src/firebase.ts` — initializes the Firebase app and
  exports `db` (a Firestore instance). Nothing else in the app imports this
  yet; this file exists purely so future checkpoints have a ready-made
  connection to import from.
- Verified the connection actually works by temporarily adding a "Test
  Firebase Connection" button to SettingsScreen.tsx (wrote a test document to
  Firestore, read it back, displayed a ✅/⚠️/❌ result message). Tested on a
  real phone — got ✅ "Success! Firebase is connected and working."
- Fully removed the temporary test button, its handler function
  (testFirebaseConnection), its two pieces of state (firebaseTestMsg,
  firebaseTestBusy), and its two Firebase-related import lines from
  SettingsScreen.tsx immediately after confirming success. Verified clean via
  `grep -n "firebase|Firebase" src/screens/SettingsScreen.tsx` returning zero
  results — no leftover debug code or dead imports.

**Note on process this session:** two earlier attempts to paste
`src/firebase.ts` and to run a Python edit script directly into the terminal
got garbled/truncated mid-paste (a recurring theme with long multi-line
pastes in this particular terminal). Both times this was caught by asking for
a `cat`/`grep` confirmation immediately afterward rather than assuming the
paste worked — the file was rewritten cleanly via the VS Code text editor
instead of the terminal for the `firebase.ts` case, and the Python script
paste, despite looking scrambled mid-flight in the pasted transcript, actually
executed correctly (confirmed via the follow-up `grep`). Worth continuing to
always verify with a real `cat`/`grep` command rather than trusting that a
long paste landed exactly as intended.

🧹 Code health
- New dependency: `firebase` (installed via `npm install firebase`).
- New file: `mobile-app/src/firebase.ts`.
- No other files have lasting changes — SettingsScreen.tsx's temporary test
  code was fully added and then fully removed within this same session.
- `npx tsc --noEmit` not explicitly re-run after the final cleanup in this
  session's transcript — worth running at the start of next session just to
  triple-confirm, though the `grep` cleanup check strongly suggests it's clean.

⚠️ Known issues / gotchas (non-code)
(All previously logged items still stand except where noted.)
- **NEW:** Firestore is currently running in **test mode** — anyone with the
  Firebase project's config (which isn't itself secret, but still) could
  technically read/write the database while test mode is active. Test mode
  auto-expires after 30 days per Firebase's own rules, but real security rules
  should be written and deployed well before then, and definitely before any
  actual household data is ever written to Firestore (nothing real is stored
  there yet — only the throwaway test document during this session, which is
  harmless).
- Loans with "Custom" recurrence are still excluded from the projection/
  Dashboard, because the Loan data model itself has no custom-recurrence
  fields and the Loans screen's UI has no way to select "Custom" for a loan in
  the first place. Would need Loan type changes + a Loans screen UI change to
  fully resolve.
- Pasted terminal output can silently drop lines/commands from view without
  anything actually being missing, AND (new this session) long multi-line
  pastes can occasionally get garbled/corrupted when pasted directly into the
  Codespaces terminal — always spot-check with a direct ls/cat/grep command
  after any nontrivial paste, rather than assuming it landed correctly. Using
  the VS Code text editor (open file → select-all → paste → save) is a more
  reliable fallback for tricky pastes than the terminal's `cat > file 
  'ENDOFFILE'` heredoc pattern, when the heredoc approach garbles.

📌 Decisions made
- **Firebase (Firestore)** is the chosen sync/backend service for Phase 9,
  decided this session.
- Firestore was deliberately set up in test mode for this first checkpoint,
  with real security rules explicitly deferred to a later checkpoint in Phase
  9 — this was a conscious choice to get the pipe working end-to-end first,
  not an oversight.
- (All decisions from prior sessions still stand.)

▶️ Next step

**Checkpoint 9.1 (set up the sync/backend service) is complete and confirmed
working on a real device.**

The next-biggest items, in order of what's most natural to tackle next:
1. **Checkpoint 9.2 — Link two profiles/phones together.** This is the very
   next step in Phase 9. Will need real Firestore security rules written as
   part of this (or immediately before it) — test mode should not carry
   forward into a checkpoint where real linking/data-sharing actually happens.
2. **Checkpoint 9.3 — Shared expense ledger + settle-up.** Depends on 9.2
   being done first.
3. Once Phase 9 is further along, the Settings > Household placeholder text
   ("sharing data between phones is coming in a future update") should be
   replaced with the real linking UI/flow built in 9.2.
4. **Payment Methods report checkpoint** (deferred from Phase 10.2) — requires
   adding a paymentMethod field to the data model (BillCycle, Debt cycles,
   LoanPayment, ManualTransaction) AND a real Cash/Debit/Credit picker UI on
   the relevant payment-logging screens and the manual transaction form, not
   just a new report file.
5. **Custom recurrence for Loans** — would need new fields on the Loan type
   (customStartDate/customFreq/customOccurrenceCount) plus a "Custom" option
   added to the Loans screen's recurrence dropdown, before balanceProjection.ts
   could even use it.
6. Smaller loose ends still flagged from earlier sessions: EF/FI calculators
   still don't auto-pull figures from Bills/Income; neither Travel nor Events
   converts a completed item into an actual logged expense/transaction yet
   (both currently only sync a savings goal target); debt-side "feesPortion"
   doesn't exist in the data model, so Tax Summary's Interest & Fees figure
   only covers loan late fees, not debt fees.
7. **Optional/deferred from earlier:** Checkpoint 6.3, CSV import for
   Transactions — explicitly optional per the roadmap, still not built.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types. Still no paymentMethod or feesPortion fields anywhere — see Phase 10.2 notes above.
  - mobile-app/src/firebase.ts — NEW THIS SESSION. Initializes the Firebase app (project: household-finance-mobile) and exports `db`, a Firestore instance, for future checkpoints (9.2/9.3) to import when reading/writing shared household data. Not yet imported anywhere else in the app.
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math still Bills/Debts only — Loan type has no custom fields)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel(), and confirmed firing real notifications on a physical device (multiple sessions).
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index, incl. updateProfileSalt(), saveEncryptedProfileData(), loadEncryptedProfileData().
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance() + loanOutstandingBalance(). Includes Loans (Monthly/Annual/One-time) in computeMonthEvents()/computeRunningBalances(), excluding "lent" loans and Custom-recurrence loans.
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
  - mobile-app/src/screens/SettingsScreen.tsx — Contains ALL of Phase 11: Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2, fully clean), and Security (change passphrase) / Household (placeholder — still not updated for Phase 9) / Data (backup + clear all) sections (11.3). No leftover debug UI (Firebase test button added and fully removed this session).
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8) and firebase (NEW THIS SESSION).

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
