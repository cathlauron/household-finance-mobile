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

Phase 6 — Transactions (M8) — ✅ CORE COMPLETE (CSV import still optional/outstanding)
- 6.1 — Unified transaction list. ✅ Complete and confirmed working on a real phone.
- 6.2 — Manually add a transaction. ✅ Complete and confirmed working on a real phone, including surviving a tab-switch/close-reopen.
- 6.2 follow-up — Receipt photo attachment. ✅ Complete and confirmed working on a real phone.
  - Added expo-image-picker (npx expo install expo-image-picker).
  - types.ts: ManualTransaction gained an optional receiptPhoto field (base64 data URI).
  - TransactionsScreen.tsx Add Transaction modal has a "Receipt photo (optional)" section — attach/preview/remove, stored as a base64 data URI directly on the manual transaction.
  - Auto-lock suppression pattern established (src/autoLockSuppress.ts) — see Decisions below.
- 6.2 follow-up #2 — Edit/delete manual transactions. ✅ Complete and confirmed working on a real phone.
  - src/transactions.ts: TransactionEntry now carries an optional rawId — the real id of the underlying ManualTransaction in model.manualTransactions — so a derived list entry (id: 'manual-' + t.id) can be mapped back to its source record for editing/deleting.
  - TransactionsScreen.tsx: tapping a manual transaction row opens the same modal used for adding, pre-filled with its existing details (including receipt photo). Save updates the record in place; a "Delete this transaction" button removes it. Bill/Debt/Loan-derived rows are shown but not tappable — they display "(edit on its own tab)" and must be edited from their own source tab, matching the web app's design.
  - Confirmed on a real phone: edit pre-fill works (including photo), save updates the list, delete removes the row and updates totals, non-manual rows are correctly non-interactive, and a new transaction with a photo can be added then re-opened for editing.

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
- Auto-lock suppression: Any feature that opens a native OS picker/UI on top of the app (photo picker, and — in the future — things like document/CSV pickers) must wrap that call with setAutoLockSuppressed(true) / setAutoLockSuppressed(false) from src/autoLockSuppress.ts, using try/finally so it's always cleared. This is now the established pattern going forward, not a one-off fix.
- Theming approach: Colors live in theme.ts (lightTheme/darkTheme); ThemeContext.tsx exposes useTheme(). Fonts have NOT been ported yet — default system fonts still in use. Full 13-theme picker, custom colors, and font pairing are deferred to a later checkpoint once a real Settings screen exists.
- Screen pattern for simple list-based tabs (Accounts, Bills, Debts, Loans, and Transactions): a scrollable list of rows, each tappable to open an edit modal (for editable record types); a "+ Add X" button at the bottom opens the same modal blank.
- Due dates / transaction dates: Entered as plain typed text in YYYY-MM-DD format, with a basic format check before saving. A native date-picker UI is a nice-to-have polish item for later — the stored data shape won't need to change when that's added.
- To-Pay tab structure: Uses an in-screen pill-button switcher (ToPayScreen.tsx) rather than a separate bottom tab per record type — matches the web app's own To-Pay sub-tab pattern and keeps the bottom tab bar from getting overcrowded. Has three pills: Bills, Debts, Loans.
- Recurring schedule design (Checkpoint 5.4): A shared src/recurrence.ts module (getNextDueDate, formatShortDate, recurringTypeLabel) is reused across Bills, Debts, and Loans rather than duplicating due-date math per screen.
- Payoff Simulator design: Built as a modal (LoanPayoffSimulatorModal.tsx) opened from a button on LoansScreen.tsx, rather than a separate tab/screen. Deliberately built without a charting library (plain stat cards + a payoff-order list) to keep the checkpoint scoped small.
- Unified Transactions design (Checkpoint 6.1/6.2): buildTransactionsList() lives in its own src/transactions.ts module (not inside TransactionsScreen.tsx) so future checkpoints (income, savings) can extend the same function without needing to touch screen code. Income and savings-goal contributions are still intentionally left out of this list for now since those input screens don't exist yet (Phase 7) — this is expected, not a bug.
- Manual transactions (Checkpoint 6.2): Owner is hardcoded to 'shared' for now — no per-person "who does this belong to" picker yet, since People/Income screens (Phase 7) haven't been built. Category is a free-typed optional text field, not a picker.
- Manual transaction edit/delete design: The derived TransactionEntry list (used for display/sorting/totals) carries an optional rawId pointing back to the real ManualTransaction record, rather than trying to parse it out of the prefixed display id. Only manual transactions are directly editable from the Transactions tab — Bill/Debt/Loan-derived rows must be edited at their source, matching the original web app's behavior.
- Checkpoint tracking discipline: Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block — never by pasting code at a bare prompt.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, first check whether that file already exists.
- Editing an existing file safely: For small, well-defined changes, a targeted `sed` command is used instead of retyping the whole file, after first running `grep` to see exactly what's there. For changes involving multi-line blocks where exact whitespace matters, a small inline Python script (via `python3 - << 'ENDOFFILE'`) that does an exact string match-and-replace is used instead, and it reports clearly if the expected text wasn't found rather than silently doing nothing or corrupting the file.
- Tab bar structure: Used @react-navigation/bottom-tabs directly. All 10 tabs shown flat in the bar (no "More" overflow menu yet).

▶️ Next step

Phase 6 (Transactions) core functionality is fully done and confirmed working. One optional item remains:

1. Checkpoint 6.3 — CSV import: Import transactions from a CSV file. The roadmap explicitly allows this to be simplified or deferred if it adds too much complexity for one checkpoint.

Two reasonable paths forward:
- (a) Tackle 6.3 (CSV import) now to fully close out Phase 6, or
- (b) Defer 6.3 and move on to Phase 7 — Income & Savings (M9), coming back to CSV import later.

Recommend asking the person which they'd prefer at the start of the next session, since CSV import is explicitly optional/deferrable per the roadmap and Phase 7 unlocks real functionality (people/income screens) that several existing screens are already stubbed out waiting for (e.g. manual transactions' hardcoded "shared" owner).

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types (ManualTransaction includes optional receiptPhoto)
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals() — TransactionEntry now includes optional rawId for manual entries
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed(), used to pause auto-lock around native pickers
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting
  - mobile-app/src/DataContext.tsx — shared in-memory data holder
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
  - mobile-app/src/screens/TransactionsScreen.tsx — unified transactions list, totals, sort toggle, add/edit/delete modal with receipt photo attachment
  - mobile-app/src/navigation/MainTabs.tsx — Transactions tab wired to TransactionsScreen
  - mobile-app/App.tsx — includes auto-lock suppression check
  - mobile-app/package.json / package-lock.json (includes expo-image-picker)

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
