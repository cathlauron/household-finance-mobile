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
  - mobile-app/src/screens/BillsScreen.tsx — scrollable list + tap-to-open modal to add/edit/delete a bill.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
  - mobile-app/src/screens/DebtsScreen.tsx — same list + modal pattern as BillsScreen.tsx, adapted for the Debt type.
  - mobile-app/src/screens/ToPayScreen.tsx — pill-button switcher at the top of the To-Pay tab, showing Bills/Debts/Loans depending on which is selected.
- 5.3 — Loans, fully complete:
  - 5.3a — mobile-app/src/screens/LoansScreen.tsx — list + add/edit/delete modal.
  - 5.3b — Loans added as a third pill in ToPayScreen.tsx alongside Bills/Debts. Confirmed working on-device.
  - 5.3c — Payoff Simulator (Snowball vs. Avalanche). ✅ Complete and confirmed working on a real phone.
    - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx — month-by-month simulation, extra-payment input, debt-free estimate, total interest per strategy, payoff-order list.
- 5.4 — Recurring schedules (monthly, custom, etc.) — "A bill correctly repeats on schedule." ✅ Complete.
  - 5.4c — Loans: added a "Repeats" picker (One-time / Monthly / Annual) to LoansScreen.tsx, matching the pattern already used on Bills/Debts. Loans are now sorted by next due date instead of alphabetically, and each row shows its recurrence + next due date alongside loan type/direction/interest rate.
    - types.ts: Loan gained optional recurringType and dueDate fields (same shape as Bill/Debt), plus recurrence helpers pulled from a shared src/recurrence.ts (getNextDueDate, formatShortDate, recurringTypeLabel).
    - Existing loans saved before this change load fine, defaulting to "One-time" with no date set until edited.
    - ✅ Confirmed working on a real phone: added a Monthly loan and an Annual loan, both showed the correct next-due label; edited an existing loan and the Repeats/date fields reopened correctly; total amount, expected payment, interest rate, direction, and the Payoff Simulator all still work unchanged.

Phase 5 (M7) is now fully complete — Bills, Debts, and Loans (including recurring schedules and the payoff simulator) are all built and confirmed working end to end.

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
- Theming approach: Colors live in theme.ts (lightTheme/darkTheme); ThemeContext.tsx exposes useTheme(). Fonts have NOT been ported yet — default system fonts still in use. Full 13-theme picker, custom colors, and font pairing are deferred to a later checkpoint once a real Settings screen exists.
- Screen pattern for simple list-based tabs (Accounts, Bills, Debts, Loans): a scrollable list of rows, each tappable to open an edit modal; a "+ Add X" button at the bottom opens the same modal blank.
- Due dates: Entered as plain typed text in YYYY-MM-DD format, with a basic format check before saving. A native date-picker UI is a nice-to-have polish item for later — the stored data shape won't need to change when that's added.
- To-Pay tab structure: Uses an in-screen pill-button switcher (ToPayScreen.tsx) rather than a separate bottom tab per record type — matches the web app's own To-Pay sub-tab pattern and keeps the bottom tab bar from getting overcrowded. Now has three pills: Bills, Debts, Loans.
- Recurring schedule design (Checkpoint 5.4): A shared src/recurrence.ts module (getNextDueDate, formatShortDate, recurringTypeLabel) is reused across Bills, Debts, and Loans rather than duplicating due-date math per screen — keeps the "next due date" logic consistent everywhere it's shown (list rows, sorting, Calendar).
- Payoff Simulator design: Built as a modal (LoanPayoffSimulatorModal.tsx) opened from a button on LoansScreen.tsx, rather than a separate tab/screen — matches how the web app treats it as a sub-view within Debts/Loans. Deliberately built without a charting library (plain stat cards + a payoff-order list) to keep the checkpoint scoped small.
- Checkpoint tracking discipline: Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block — never by pasting code at a bare prompt.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, first check whether that file already exists.
- Editing an existing file safely: For small, well-defined changes, a targeted `sed` command is used instead of retyping the whole file, after first running `grep` to see exactly what's there.
- Tab bar structure: Used @react-navigation/bottom-tabs directly. All 10 tabs shown flat in the bar (no "More" overflow menu yet).

▶️ Next step

Phase 5 is done. Next up is Phase 6 — Transactions (M8):
- 6.1 — Unified transaction list: pull together everything that already has a date/amount (bill payments, debt payments, loan payments, savings contributions) into one combined, sortable Transactions tab — matching how the web app's buildTransactionsList() works (see the spec doc §3.2).
- 6.2 — Manually add a transaction, with an optional receipt photo attached.
- 6.3 — CSV import (optional/can be simplified or deferred if it adds too much complexity for one checkpoint).

Recommend starting with 6.1 alone as its own checkpoint, since it touches every existing screen's data (Bills/Debts/Loans/Savings) without needing any new input UI yet.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types (Loan now includes optional recurringType, dueDate, interestRate)
  - mobile-app/src/recurrence.ts — shared recurrence helpers (getNextDueDate, formatShortDate, recurringTypeLabel), used by Bills/Debts/Loans
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
  - mobile-app/src/screens/LoansScreen.tsx — now includes a "Repeats" picker (One-time/Monthly/Annual), sorted by next due date
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
