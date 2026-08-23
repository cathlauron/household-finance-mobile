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
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete and confirmed working on a real phone.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete.

Phase 6 — Transactions (M8) — ✅ FULLY COMPLETE
- 6.1 — Unified transaction list. ✅ Complete and confirmed working on a real phone.
- 6.2 — Manually add a transaction. ✅ Complete and confirmed working on a real phone, including surviving a tab-switch/close-reopen.
- 6.2 follow-up — Receipt photo attachment. ✅ Complete and confirmed working on a real phone.
- 6.2 follow-up #2 — Edit/delete manual transactions. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import. ✅ Complete and confirmed working on a real phone (real CSV file imported, transactions appeared correctly in the list).
  - New src/csvImport.ts: pure parsing logic, no UI. parseTransactionsCsv(text) expects a header row matched by column name (date, label, amount required; direction optional) — columns can be in any order. Handles quoted CSV fields (including embedded commas and escaped "" quotes) via a hand-rolled splitCsvLine(), no external CSV library. Accepts dates as YYYY-MM-DD or MM/DD/YYYY. Direction accepts in/income/deposit, out/expense/withdrawal, saving/savings, or blank (defaults to 'out', since most bank/spreadsheet exports are expenses). Returns per-row results (validRows/invalidRows) with a human-readable error per invalid row, rather than failing the whole import on one bad row.
  - New src/screens/CsvImportModal.tsx: file-picker UI, opened from a new "Import CSV" button next to "+ Add transaction" on TransactionsScreen. Uses expo-document-picker (file picker, restricted after picking to filenames ending in .csv/.txt, with a friendly message if someone picks an .xlsx instead) and expo-file-system/legacy (readAsStringAsync) to read the file contents as UTF8 text. Correctly wraps the document-picker call in setAutoLockSuppressed(true) / setAutoLockSuppressed(false), using try/finally, matching the established pattern from the receipt-photo picker. Shows a preview (first 8 valid rows, plus a full list of skipped rows with their reasons) before anything is saved. On confirm, creates real ManualTransaction records (owner: 'shared', category: 'Imported') and appends them via saveModel().
  - No column-mapping UI and no duplicate-detection — deliberately kept simple per the roadmap's "or Claude explains why we're deferring this" allowance for 6.3. Flagged as possible future follow-ups, not forgotten.

Phase 7 — Income & Savings (M9) — IN PROGRESS
- 7.1 — Add income sources with pay schedules. ✅ Complete and confirmed working on a real phone.
  - New src/income.ts: Frequency type, FREQUENCIES, DOW_LABELS, frequencyLabel(), computeNextPayDate(), formatShortDate() — kept separate from recurrence.ts since a pay schedule's shape (weekly day-of-week, semi-monthly two-days) differs enough from Bill/Debt/Loan due dates.
  - New src/screens/IncomeScreen.tsx: list of income sources sorted by next pay date, tap-to-edit row pattern (matches Bills/Debts/Loans/Transactions), add/edit modal.
  - "Belongs to" is a plain text field with tappable chips of existing people below it — typing a new name auto-creates that person via findOrCreatePerson(), matching the web app's behavior. No separate "add a person" screen.
  - Category field has tappable suggestion chips (Salary, Freelance / Side gig, Business income, Rental income, Other) but stays free-text underneath.
  - Frequency-specific schedule inputs: Monthly (day 1–31), Semi-monthly (two days), Weekly (day-of-week pill), One-time (YYYY-MM-DD date), Biweekly (no fields — logged as it happens, matching the web app).
  - Deliberately deferred (flagged as follow-ups, not forgotten): actual-pay logging (real paydate + amount received vs. expected), wiring income into the unified Transactions list, and a destination-account picker to route income into a specific Debit account.
  - Confirmed on a real phone: adding a new person via the income form, that person then appearing as a chip on subsequent adds, editing an existing entry, and deleting one.
- 7.2 — Savings goals + Emergency Fund/FI calculators. Not started yet.

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app.
- Git: The mobile-app project lives inside the existing household-finance-mobile git repo — no separate repo.
- Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
- Dev workflow in Codespaces: Metro must always be started with tunnel mode, AND from inside the mobile-app folder:
    cd mobile-app
    npx expo start --tunnel
  Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code.
- Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts.
- PIN quick-unlock: The PIN is always a convenience re-entry method on top of an already-unlocked session — never a substitute for the real passphrase; "Use passphrase instead" is always available from the PIN screen.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage under "autoLockMinutes" for a future Settings screen to adjust via setAutoLockMinutes(newValue).
- Auto-lock suppression: Any feature that opens a native OS picker/UI on top of the app (photo picker, document/CSV picker, and any future ones) must wrap that call with setAutoLockSuppressed(true) / setAutoLockSuppressed(false) from src/autoLockSuppress.ts, using try/finally so it's always cleared. Confirmed in use by both ImagePicker (TransactionsScreen) and DocumentPicker (CsvImportModal).
- Theming approach: Colors live in theme.ts (lightTheme/darkTheme); ThemeContext.tsx exposes useTheme(). Fonts have NOT been ported yet — default system fonts still in use. Full 13-theme picker, custom colors, and font pairing are deferred to a later checkpoint once a real Settings screen exists.
- Screen pattern for simple list-based tabs (Accounts, Bills, Debts, Loans, Transactions, and now Income): a scrollable list of rows, each tappable to open an edit modal (for editable record types); a "+ Add X" button at the bottom opens the same modal blank.
- Due dates / transaction dates: Entered as plain typed text in YYYY-MM-DD format, with a basic format check before saving. A native date-picker UI is a nice-to-have polish item for later — the stored data shape won't need to change when that's added.
- To-Pay tab structure: Uses an in-screen pill-button switcher (ToPayScreen.tsx) rather than a separate bottom tab per record type — matches the web app's own To-Pay sub-tab pattern. Has three pills: Bills, Debts, Loans.
- Recurring schedule design (Checkpoint 5.4): A shared src/recurrence.ts module (getNextDueDate, formatShortDate, recurringTypeLabel) is reused across Bills, Debts, and Loans rather than duplicating due-date math per screen.
- Payoff Simulator design: Built as a modal (LoanPayoffSimulatorModal.tsx) opened from a button on LoansScreen.tsx, rather than a separate tab/screen.
- Unified Transactions design (Checkpoint 6.1/6.2): buildTransactionsList() lives in its own src/transactions.ts module (not inside TransactionsScreen.tsx) so future checkpoints can extend the same function without needing to touch screen code. Income and savings-goal contributions are still intentionally left out of this list for now — wiring income in is a flagged follow-up to 7.1.
- Manual transactions (Checkpoint 6.2): Owner is hardcoded to 'shared' for now — no per-person "who does this belong to" picker yet. Category is a free-typed optional text field, not a picker. Now that Income (7.1) has established the People list and the findOrCreatePerson() pattern, a follow-up could wire an owner picker into manual transactions too. Imported transactions (6.3) also default owner to 'shared' and category to 'Imported'.
- Manual transaction edit/delete design: The derived TransactionEntry list carries an optional rawId pointing back to the real ManualTransaction record. Only manual transactions are directly editable from the Transactions tab — this includes CSV-imported ones, since they're saved as real ManualTransaction records.
- CSV import design (Checkpoint 6.3): Parsing logic (src/csvImport.ts) is kept fully separate from the picker/UI (src/screens/CsvImportModal.tsx), matching the same "logic module vs. screen" split used by transactions.ts/income.ts elsewhere. No column-mapping UI (columns are matched by fixed header names only) and no duplicate-detection against existing transactions — both deliberately deferred to keep the checkpoint scoped, per the roadmap's explicit allowance to simplify 6.3.
- Income/pay-schedule design (Checkpoint 7.1): Kept in its own src/income.ts module rather than extending recurrence.ts, since pay-schedule shapes (weekly day-of-week, semi-monthly two-days) are different enough from Bill/Debt/Loan due-date shapes to not share logic cleanly. findOrCreatePerson() (in IncomeScreen.tsx) matches an existing person case-insensitively by trimmed name, or creates a new Person with role 'primary' (if first person) or 'partner' (otherwise) — mirrors the web app's own person-creation behavior.
- Checkpoint tracking discipline: Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version. If work is reported as done but PROGRESS.md wasn't updated at the time (as happened with 6.3), the next session should verify via git log/file listing before crediting it, rather than taking the claim at face value or dismissing it outright.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block — never by pasting code at a bare prompt.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, first check whether that file already exists.
- Editing an existing file safely: For small, well-defined changes, a targeted `sed` command is used instead of retyping the whole file, after first running `grep` to see exactly what's there. For changes involving multi-line blocks where exact whitespace matters, a small inline Python script (via `python3 - << 'ENDOFFILE'`) that does an exact string match-and-replace is used instead, and it reports clearly if the expected text wasn't found rather than silently doing nothing or corrupting the file.
- Tab bar structure: Used @react-navigation/bottom-tabs directly. All 10 tabs shown flat in the bar (no "More" overflow menu yet).

▶️ Next step

Phase 6 (Transactions) is now fully complete, including CSV import. Phase 7 is in progress. Recommend asking the person which they'd prefer next:

1. Income follow-ups (natural next small steps, flagged during 7.1):
   (a) Actual-pay logging — record what was actually received on a real date, vs. the expected schedule.
   (b) Wire income into the unified Transactions list (src/transactions.ts) so paydays show up there.
   (c) A destination-account picker to route income into a specific Debit account.
2. Move on to Checkpoint 7.2 — Savings goals + Emergency Fund/FI calculators.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans
  - mobile-app/src/income.ts — Frequency type + pay-schedule helpers (computeNextPayDate, frequencyLabel, formatShortDate, DOW_LABELS)
  - mobile-app/src/csvImport.ts — parseTransactionsCsv() and related CSV parsing types, no UI
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts
  - mobile-app/src/defaultModel.ts
  - mobile-app/src/auth.ts
  - mobile-app/src/encryption.ts
  - mobile-app/src/pin.ts
  - mobile-app/src/autoLock.ts
  - mobile-app/src/theme.ts
  - mobile-app/src/ThemeContext.tsx
  - mobile-app/src/storage.ts
  - mobile-app/src/balanceProjection.ts
  - mobile-app/src/DataContext.tsx
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
  - mobile-app/src/screens/TransactionsScreen.tsx — includes "Import CSV" button wired to CsvImportModal
  - mobile-app/src/screens/CsvImportModal.tsx — CSV file picker + preview + confirm-import UI
  - mobile-app/src/screens/IncomeScreen.tsx — Income tab, list + add/edit modal
  - mobile-app/src/navigation/MainTabs.tsx — Income tab wired to IncomeScreen
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json (includes expo-image-picker, expo-document-picker, expo-file-system)

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
