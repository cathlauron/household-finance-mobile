# PROGRESS.md

## ✅ Completed
- Checkpoints 1.3, 1.4a, 1.4b: Data encryption, PIN setup/hashing, Lock button — confirmed complete and correct in repo
- Checkpoint 6.1: Transactions tab wired to a real TransactionsScreen
- Checkpoint 6.2: Manual transaction entry (modal form: label, direction pill, amount, date, optional category) — receipt photo support deferred
- Income Payment Log follow-up: Added a "Payment log" section inside the existing income-source modal (add/edit) — lets the user log actual paydays (date + amount), add/remove entries, saves and reloads correctly. Replaced the outdated "coming in a follow-up checkpoint" placeholder note under Biweekly frequency. Confirmed working on-device via Expo Go.

## 🔧 In progress / just finished
- Payment Log data now exists and saves, but nothing else in the app reads it yet (no Transactions entry, no running balance impact). This is expected — not a bug — and is separate future work.

## 📌 Decisions made
- Payment log dates must be typed as YYYY-MM-DD (e.g. 2025-03-24) in this checkpoint's UI — no date picker yet.
- Payment log entries are per-income-source, stored alongside the source's existing fields.

## ▶️ Next step
Decide and scope the next checkpoint: likely candidates are (a) making logged paydays actually appear in Transactions/running balance, or (b) resuming the main roadmap's next unfinished checkpoint per 3-ROADMAP.md — check the roadmap and confirm with the user which to prioritize before starting.
