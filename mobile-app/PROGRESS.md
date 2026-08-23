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

### Cross-cutting fixes
- Person-picker added to Transactions screen
- 4 pre-existing TypeScript type errors fixed

## ⚠️ NOT started yet
- **Phase 9 — Shared Expenses / Household Linking** (no evidence in files or commits)
- **Phase 11 — Settings** (Categories, Payees, Rules, Notifications, Security & Household & Data) — confirmed with user: not started, no SettingsScreen.tsx exists at all
- **Phase 12 — Polish & Real-Device Testing** (offline behavior, accessibility, full tab-by-tab pass)
- **Phase 13 — Publishing** (EAS Build, app store)

## 🔧 In progress / just finished
- Nothing currently mid-way. Last confirmed-complete work: Income Payment Log + wiring it into Transactions/Reports (this session).

## 📌 Decisions made
- Payment log dates typed as YYYY-MM-DD (e.g. 2025-03-24) — no date picker yet
- Payment log entries stored per-income-source, alongside the source's existing fields
- Transaction id prefixes: "bill-", "debt-", "loan-", "income-", "saving-", manual — consistent pattern in transactions.ts

## 🚨 Process note — read this every session
PROGRESS.md has drifted out of sync with actual completed work at least twice now:
1. A past session built and left uncommitted work (Payment Log → Transactions/Reports wiring) that sat invisible in Codespace for an unknown number of sessions.
2. PROGRESS.md itself was significantly stale — missing entire completed phases (7, 8, most of 10) despite the code and commits clearly showing them done.

**Going forward:** at the start of any session, if something seems off, don't just trust PROGRESS.md's summary — cross-check with `find src -type f` and `git log --oneline` if there's any doubt. This audit (all 114 commits + full file list) is the reliable baseline as of now.

## ▶️ Next step
Choose between:
(a) Phase 9 — Shared Expenses / Household Linking (flagged in the original roadmap as the hardest technical phase — depends on the Phase 0.1 sync decision)
(b) Phase 11 — Settings (Categories, Payees, Rules, Notifications, Security & Household & Data)
(c) Phase 12 — Polish/accessibility pass across everything already built

Recommend discussing with the user which to prioritize — Settings (11) is likely the most immediately useful gap since there's currently no way to manage categories/notifications/security settings from the app itself.
