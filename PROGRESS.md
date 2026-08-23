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
- 6.2b — Manual transactions now have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. Free-text input with tappable chips for existing people; typing a new name quietly creates that person via the same findOrCreatePerson() logic Income uses. Verified: new transactions can be assigned a person, editing round-trips the saved person correctly, and old transactions (owner still 'shared' from before this change) open without crashing and show a blank picker rather than "shared" as a literal name. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import: NOT yet done. Explicitly optional/deferrable per the roadmap.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — seven of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit). Still to build: Tax Summary, Payment Methods.

🧹 Code health
- This session fixed all 4 pre-existing `npx tsc --noEmit` type errors that had built up across earlier sessions without being caught:
  - MainTabs.tsx: React Navigation v7 requires an explicit `id` prop on `Tab.Navigator` (didn't exist as a requirement in v6). Fixed with `id={undefined}`, which is valid since this app only has one navigator.
  - LoansScreen.tsx (1 spot) and SavingsScreen.tsx (2 spots): progress-bar `width` styles were being built as plain strings (`pct + '%'`), which doesn't satisfy React Native's stricter `DimensionValue` type. Fixed by templating as `` `${pct}%` as const `` instead.
  - `npx tsc --noEmit` now returns clean (0 errors) as of this session. Confirmed no visual regression on Loans and Savings progress bars on a real phone after the fix.
  - Going forward: run `npx tsc --noEmit` at the end of any session that touches multiple files, not just the one file being edited — this session's errors had accumulated silently across at least 2-3 prior sessions before being caught.

⚠️ Known issues / gotchas (non-code)
- Expo tunnel (`--tunnel`) occasionally fails with `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, pointing at ngrok. This is a tunnel-tooling hiccup, not a bug in the app. Fix, in order, if it happens again:
  1. `npm install --save-dev @expo/ngrok@latest` (from inside mobile-app/), then retry `npx expo start --tunnel`.
  2. If that doesn't work: `npx expo start --tunnel --clear`.
  3. If that still doesn't work: ngrok may be asking for a free account/token — read the exact terminal error text for a signup link and follow it.
- PROGRESS.md can drift from what's actually in the code. Always verify claims in this file against the actual screen/router code when in doubt, not just against this log. (This session's own catch: 4 type errors had accumulated without being tracked here — now fixed and logged above.)

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
  Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code. If the tunnel throws an ngrok-related error, see Known Issues above before troubleshooting further.
- Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts.
- PIN quick-unlock: The PIN is always a convenience re-entry method on top of an already-unlocked session — never a substitute for the real passphrase; "Use passphrase instead" is always available from the PIN screen.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage under "autoLockMinutes" for a future Settings screen to adjust via setAutoLockMinutes(newValue).
- Auto-lock suppression: Any feature that opens a native OS picker/UI on top of the app (photo picker, and — in the future — things like document/CSV pickers) must wrap that call with setAutoLockSuppressed(true) / setAutoLockSuppressed(false) from src/autoLockSuppress.ts, using try/finally so it's always cleared. This is now the established pattern going forward, not a one-off fix.
- Theming approach: Colors live in theme.ts (lightTheme/darkTheme); ThemeContext.tsx exposes useTheme(). Fonts have NOT been ported yet — default system fonts still in use. Full 13-theme picker, custom colors, and font pairing are deferred to a later checkpoint once a real Settings screen exists.
- Screen pattern for simple list-based tabs (Accounts, Bills, Debts, Loans, Transactions, Savings, Groceries, Travel, Events, Goals): a scrollable list of rows, each tappable to open an edit modal (for editable record types); a "+ Add X" button opens the same modal blank.
- Person/owner picker pattern (established with Income, now also on Transactions): a free-text input plus a row of tappable chips for existing model.people entries. findOrCreatePerson(people, typedName) resolves the typed name against existing people case-insensitively, or creates a new Person record on save if no match — this is the standard pattern to reuse for any future screen needing a "belongs to" field (e.g. Bills/Debts/Loans owner, if/when that's added).
- Due dates / transaction dates: Entered as plain typed text in YYYY-MM-DD format, with a basic format check before saving. A native date-picker UI is a nice-to-have polish item for later — the stored data shape won't need to change when that's added.
- To-Pay tab structure: Uses an in-screen pill-button switcher (ToPayScreen.tsx) rather than a separate bottom tab per record type. Has three pills: Bills, Debts, Loans.
- Savings tab structure: Same in-screen pill-button switcher pattern as To-Pay, applied to Goals / Emergency Fund / FI Calculator.
- Planning tab structure: Same in-screen pill-button switcher pattern, with four pills (Groceries / Travel / Events / Goals) in a horizontally scrollable row.
- Insights tab structure: Same in-screen pill-button switcher pattern as To-Pay/Savings/Planning, with two pills: Dashboard / Reports. InsightsScreen.tsx is the pill-switcher; MainTabs.tsx's "Insights" tab points to it instead of DashboardScreen directly.
- Reports page structure: ReportsScreen.tsx is a second-level pill-switcher (horizontally scrollable pill row), rendering whichever report is selected. Each report page is its own file under src/screens/reports/ rather than one growing file — this pattern continues for any remaining report pages (Tax Summary, Payment Methods).
- Recurring schedule design (Checkpoint 5.4): A shared src/recurrence.ts module (getNextDueDate, formatShortDate, recurringTypeLabel) is reused across Bills, Debts, and Loans rather than duplicating due-date math per screen. Events use their own simpler month/day (Annual) or full-date (One-time) fields directly on EventItem rather than pulling in recurrence.ts, since Events only support two recurrence options (no Custom yet). Custom recurrence for Bills/Debts/Loans exists in the data model but is NOT yet implemented in recurrence.ts's actual due-date math — SubscriptionAuditReport.tsx works around this by treating Custom bills as monthly-equivalent, flagged in that file as a simplification.
- Dashboard design (Checkpoint 10.1): outstandingBalance() was exported from balanceProjection.ts (previously private to that file) so Dashboard could reuse the exact same math Bills/Debts screens rely on. computeRunningBalances() was reused the same way for Cash-Flow Forecast.
- Payoff Simulator design: Built as a modal (LoanPayoffSimulatorModal.tsx) opened from a button on LoansScreen.tsx, rather than a separate tab/screen.
- Unified Transactions design (Checkpoint 6.1/6.2): buildTransactionsList() lives in its own src/transactions.ts module so future checkpoints can extend it without touching screen code. Income and savings-goal contributions are still intentionally left out of this list for now — that hookup is a flagged follow-up, not yet done. This means "Income" figures on both Dashboard and Year in Review only count manual "money in" entries and loan repayments received, not recurring paycheck income — flagged on-screen in Year in Review via a footer note.
- Manual transaction edit/delete design: The derived TransactionEntry list carries an optional rawId pointing back to the real ManualTransaction record. Only manual transactions are directly editable from the Transactions tab.
- Calculator input persistence design (Checkpoint 7.2): EF/FI calculator inputs are hand-typed only — no auto-pull from Bills/Income data yet. That auto-pull is a flagged nice-to-have follow-up, not required by the roadmap. Inputs save via an explicit Save button rather than on every keystroke, to avoid re-encrypting the whole file per digit typed.
- Savings goal amount design: A goal's currentAmount is always derived by summing its contributions list (not typed directly), matching the pattern already used for Loan payments.
- Events design (Checkpoint 8.3): No per-event checklist and no auto-sync of an event's budget to a savings goal — both flagged follow-ups, not yet built, matching the same simplification already made for Travel.
- Year-End Goals design (Checkpoint 8.3): Each goal has an explicit mode field ('progress' or 'checklist') rather than inferring the mode from whether a target amount is set — a deliberate, explicit choice from the start (unlike the original web app, which inferred it).
- Checkpoint tracking discipline: Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version. Claims in this file (e.g. "still to build") should be spot-checked against the actual router/screen code, not assumed correct from a prior session's notes.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE'` block — never by pasting code at a bare prompt.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, first check whether that file already exists.
- New-screen wiring discipline: When a new report/screen file is created, the session isn't done until it's actually imported and wired into its parent pill-switcher/router AND confirmed visible on a real device — creating the file alone is not sufficient, per an earlier session's catch.
- Editing an existing file safely: For small, well-defined changes, a targeted `sed` command is used instead of retyping the whole file, after first running `grep` to see exactly what's there. For changes involving multi-line blocks where exact whitespace matters, a small inline Python script (via `python3 - << 'ENDOFFILE'`) that does an exact string match-and-replace is used instead — this session's person-picker patch and type-error fixes both used this method successfully across 4 files in one go.
- End-of-session code health check: Run `npx tsc --noEmit` before wrapping up any session, even if the session's own change compiles clean — it can catch type errors left over from earlier sessions that were never verified. Established this session after finding 4 such pre-existing errors.
- Tab bar structure: Used @react-navigation/bottom-tabs directly. All 10 tabs shown flat in the bar (no "More" overflow menu yet).

▶️ Next step

Checkpoint 10.2 is nearly done — 7 of 9 original report pages are built, wired in, and confirmed working on a real phone. Next up, in order of what's likely most valuable:

1. The final two Reports pages: Tax Summary and Payment Methods. Ask the person whether both are worth building for a 2-person household, or whether to skip one/both and move to Phase 9 or the flagged follow-ups below instead.
2. Still-flagged follow-ups from earlier phases (small, can be picked up any time): income/savings-goal contributions aren't yet folded into the unified Transactions list (this also affects the "Income" figures on Dashboard and Year in Review); EF/FI calculators don't auto-pull figures from Bills/Income; Events have no per-event checklist or savings-goal auto-sync; Travel's own savings-goal auto-sync is still outstanding; Custom recurrence math isn't implemented in recurrence.ts yet (Bills/Debts/Loans data model supports it, but due-date calculation doesn't). (Manual transactions' owner field is now resolved — see Phase 6 above — no longer on this list.)
3. Phase 9 — Shared Expenses / Household Linking (M3, M11) — still the biggest remaining phase, flagged as the hardest technical part of the whole project, and still deferred pending revisiting the Phase 0.1 sync decision.
4. Loans still aren't included in the Dashboard's "Amount Owed" or "Due Soon" cards, or in the Calendar's/Cash-Flow Forecast's running-balance projection — matching balanceProjection.ts's own pre-existing limitation. Worth a dedicated checkpoint later to add loan due-dates into that projection everywhere it's used.

Recommend asking the person at the start of the next session which of these to tackle first.


Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math not yet implemented)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance()
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
  - mobile-app/src/screens/TransactionsScreen.tsx — now includes a person picker for manual transactions (matches Income's pattern)
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx — Goals / Emergency Fund / FI Calculator pill-switcher tab
  - mobile-app/src/screens/GroceriesScreen.tsx — grocery list + running-tally calculator
  - mobile-app/src/screens/TravelScreen.tsx — trip checklist
  - mobile-app/src/screens/EventsScreen.tsx — birthdays/anniversaries/other events, Annual or One-time
  - mobile-app/src/screens/GoalsScreen.tsx — Year-End Goals, Track-progress or Simple-checklist mode
  - mobile-app/src/screens/PlanningScreen.tsx — Groceries / Travel / Events / Goals pill-switcher tab
  - mobile-app/src/screens/DashboardScreen.tsx — Total Balance, This Month, Amount Owed, Due Soon, Savings Goals overview
  - mobile-app/src/screens/InsightsScreen.tsx — Dashboard / Reports pill-switcher tab
  - mobile-app/src/screens/ReportsScreen.tsx — second-level pill-switcher between report pages (7 pills)
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx — income/expenses/net + spending by category
  - mobile-app/src/screens/reports/YearInReviewReport.tsx — year totals, 12-month chart, top categories, debt paid, goals reached
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx — 30/60/90-day balance projection with warning callout
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx — per-person spending breakdown
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx — weekly summary digest
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx — spending grouped by merchant
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx — recurring bills ranked by monthly-equivalent cost
  - mobile-app/src/navigation/MainTabs.tsx — Insights tab wired to InsightsScreen; Tab.Navigator now has an explicit id prop for React Navigation v7 compatibility
  - mobile-app/App.tsx — includes auto-lock suppression check
  - mobile-app/package.json / package-lock.json

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
