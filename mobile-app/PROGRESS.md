# PROGRESS.md

## ✅ Completed
- Checkpoints 1.3, 1.4a, 1.4b: Data encryption, PIN setup/hashing, Lock button — confirmed complete and correct in repo
- Checkpoint 6.1: Transactions tab wired to a real TransactionsScreen
- Checkpoint 6.2: Manual transaction entry (modal form: label, direction pill, amount, date, optional category) — receipt photo support deferred
- Income Payment Log: Added a "Payment log" section inside the income-source modal (add/edit) — lets the user log actual paydays (date + amount), add/remove entries, saves and reloads correctly. Confirmed working on-device via Expo Go.
- Payment Log + Savings Contributions wired into Transactions/Reports: buildTransactionsList() (src/transactions.ts) now includes logged income paydays and savings goal contributions as real transaction entries, alongside bills/debts/loans/manual entries. YearInReviewReport.tsx's outdated "income doesn't include paychecks yet" disclaimer was removed since it's no longer true. This closes the gap between "payday is logged" and "payday shows up in the app" that was open at the end of the previous session.

## 🔧 In progress / just finished
- Nothing currently mid-way — last two features (Payment Log entry, and wiring it into Transactions/Reports) are both confirmed complete and pushed.

## 📌 Decisions made
- Payment log dates must be typed as YYYY-MM-DD (e.g. 2025-03-24) in the current UI — no date picker yet.
- Payment log entries are per-income-source, stored alongside the source's existing fields.
- Income transaction entries use id prefix "income-", savings contributions use "saving-", matching the existing "bill-"/"debt-"/"loan-"/manual id pattern in transactions.ts.
- IMPORTANT PROCESS NOTE: A past session wired Payment Log + Savings Contributions into Transactions/Reports but never committed/pushed it — it sat only in Codespace, invisible to PROGRESS.md and any other session, until this session found it via an unexpected `git status` diff and pushed it. Always run the sync-check block (git add -A && commit && push && status && cat PROGRESS.md) at the very start of every session, and pay attention if git status shows unexpected modified files — that's a sign of exactly this kind of drift.

## ▶️ Next step
Resume the main roadmap's next unfinished checkpoint per 3-ROADMAP.md — Checkpoint 6.3 (CSV import, optional/simplifiable) or Phase 7 (Income & Savings: pay schedules, EF/FI calculators), depending on what's next in the roadmap. Check 3-ROADMAP.md and confirm with the user which to prioritize before starting.
