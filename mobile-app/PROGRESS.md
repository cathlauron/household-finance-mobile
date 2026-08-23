# PROGRESS.md

## How this was verified (2024 audit)
PROGRESS.md had drifted significantly out of date — it was missing entire completed phases. This version was rebuilt by cross-referencing three sources of truth: the actual files in src/, the full git commit history (114 commits), and direct confirmation from the user. Treat this version as the accurate baseline going forward.

## ✅ Completed

### Phase 0 — Foundation
- Blank Expo project set up and running

### Phase 1 — Security & Sign-In
- Data model (1.1), Create-profile & sign-in screens (1.2), Data encryption (1.3), PIN quick-unlock + auto-lock on background/idle timeout, default 5 min (1.4a/b/c)

### Phase 2 — Navigation & Theming
- Bottom tab bar with 10 tabs (2.1)
- Theming ported from web app's Classic theme — light/dark colors + fonts (2.2)

### Phase 3 — Calendar
- Month grid view (3.1)
- Tap a day for a details popup (3.2)
- Running balance projection (3.3)

### Phase 4 — Accounts
- Confirmed complete (Add/edit Cash, Debit, Credit accounts + balance calculation engine)

### Phase 5 — Bills / Debts / Loans
- Bills add/edit/delete (5.1)
- Debts add/edit/delete + To-Pay Bills/Debts switcher (5.2)
- Loans add/edit/delete (borrowed/lent, progress bar) + Loan Payoff Simulator, Snowball vs Avalanche (5.3)
- Recurring schedules (One-time/Monthly/Annual) for Bills, Debts, and Loans (5.4)

### Phase 6 — Transactions
- Unified transaction list + Transactions tab wired into MainTabs (6.1)
- Manual transaction add/edit/delete + receipt photo attachment (6.2)
- CSV import (6.3) — src/csvImport.ts + CsvImportModal.tsx

### Phase 7 — Income & Savings
- Income sources with pay schedules (7.1) — src/income.ts + IncomeScreen.tsx
- Savings goals + Emergency Fund/FI calculators (7.2)
- Follow-up: Payment Log section on income sources (log actual paydays: date + amount, add/remove entries)
- Follow-up: Payment Log entries + Savings goal contributions wired into buildTransactionsList() (src/transactions.ts), so they show up as real transactions and feed Reports

### Phase 8 — Groceries / Travel / Events / Goals
- Groceries screen + calculator (8.1)
- Travel checklist (8.2)
- Events + Year-End Goals (8.3) — Phase 8 fully complete

### Phase 10 — Dashboard & Reports
- Dashboard wired into Insights tab (10.1)
- Insights pill-switcher + 7 report types built (10.2): Monthly Close-out, Year in Review, Cash-Flow Forecast, Subscription Audit, Weekly Digest, Merchant Spending, Person Spending

### Phase 11 — Settings (in progress)
- Settings tab created and wired into MainTabs (replacing PlaceholderScreen) — src/screens/SettingsScreen.tsx
- Categories manager: add / rename / recolor / remove, tap-row-to-edit pattern matching IncomeScreen.tsx. Uses the existing `categories: Category[]` field already present in HouseholdModel/defaultModel — no data model changes needed.
- Fixed color palette (15 swatches) used for the color picker, since React Native has no built-in color picker.
- Notifications section: "Alert me X day(s) before due" number field, saves on blur, wired to model.settings.notifyDaysBefore (already existed on the data model — no changes needed there). Confirmed working on phone — field saves correctly.
- **Merchants & Payees manager** (new this session): add / rename / edit default category / remove, same tap-row-to-edit modal pattern as Categories, in its own modal (`payeeModalOpen` state, separate from the Categories modal). Fields: name (required, must be unique) + default category (optional free-text — not wired to auto-categorizing yet, just saved for a later feature). Added a new `Payee` type to `src/types.ts` and a new optional `payees?: Payee[]` field on `HouseholdModel` (optional so existing saved profiles without it don't break). Confirmed working on the user's phone — add/edit/delete all tested.

### Cross-cutting fixes
- Person-picker added to Transactions screen
- 4 pre-existing TypeScript type errors fixed

## ⚠️ NOT started yet
- **Phase 9 — Shared Expenses / Household Linking** (no evidence in files or commits)
- **Phase 11 — Settings, remaining sub-sections**: Categorization Rules, Layout & Navigation, Security (change passphrase, PIN setup), Household & Data (backup/export/import, linking), Help & FAQ
- **Phase 12 — Polish & Real-Device Testing** (offline behavior, accessibility, full tab-by-tab pass)
- **Phase 13 — Publishing** (EAS Build, app store)

## 🔧 In progress / just finished
- Nothing currently mid-way. Last confirmed-complete work: Merchants & Payees manager added to Settings (this session), tested working on the user's phone via Expo Go.

## 📌 Decisions made
- Payment log dates typed as YYYY-MM-DD (e.g. 2025-03-24) — no date picker yet
- Payment log entries stored per-income-source, alongside the source's existing fields
- Transaction id prefixes: "bill-", "debt-", "loan-", "income-", "saving-", manual — consistent pattern in transactions.ts
- Settings screen built as one screen with sections (starting with Categories), rather than a drill-in category list like the web app — revisit this if it gets crowded once more sections are added
- Category colors picked from a fixed 15-swatch palette (matches the web app's default auto-assigned colors) rather than a native color picker
- Payees have no color/parent concept (unlike Categories) — just name + an optional default category text field, matching the web app's simpler Payee shape
- `payees` field added as optional (`payees?: Payee[]`) on HouseholdModel rather than required, so older saved profiles that predate this feature don't break when loaded — same pattern already used for groceries/travel/events/yearlyGoals

## 🛠️ Known environment fix — Expo tunnel mode in Codespaces
Codespaces assigns Metro a private local address (e.g. `10.x.x.x`) that phones can't reach directly — `npx expo start` alone will spin forever on the phone. Fix: run `npx expo start --tunnel` instead. If that throws `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, it's an ngrok version mismatch — run `npm install --save-dev @expo/ngrok@4.1.0` once, then `npx expo start --tunnel` again. This only needs doing once per Codespace (the package stays installed).

## 🚨 Process note — read this every session
PROGRESS.md drifted out of sync with actual completed work at least twice in the past (see git history for details). The 114-commit audit that rebuilt this file is the reliable baseline. Going forward: if the person's pasted `git status` is clean and matches this file, trust it and proceed directly — no need to re-audit the whole repo every time.

Also: code and file edits should always be done in the Codespaces **file editor** (left-hand file list → open/create a file → paste there), never pasted into the **terminal**. The terminal is only for short one-line commands like `git status`, `git add/commit/push`, and `npx expo start`.

When Claude hands off updated/new files at the end of a session, it should give the **complete file contents** to paste in as a full replacement — not a series of "find this line, change it to that" instructions — except for very small, low-risk additions (like a single new type or a single field), which can stay as targeted snippets since the risk of a paste error is low and asking for the whole file would be overkill.

## ▶️ Next step
Continue Phase 11 — Settings. Good next sub-sections to pick from, smallest first:
(a) Categorization Rules — auto-fill category based on label/amount (and could now also read a payee's default category, since that field just landed)
(b) Security — change passphrase form (touches encryption, so extra care needed)
(c) Layout & Navigation — smaller UI-only settings
(d) Household & Data — backup/export/import, linking (bigger, save for later)

Recommend Categorization Rules next — it's a natural continuation of Merchants & Payees (same list-manager pattern, and can reuse the default-category field just added).
