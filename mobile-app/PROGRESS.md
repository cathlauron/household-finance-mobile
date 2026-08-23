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
- Insights pill-switcher + 7 report types built (10.2): Monthly Close-out, Year in Review, Cash-Flow Forecast, SubscriptionAudit, Weekly Digest, Merchant Spending, Person Spending

### Phase 11 — Settings (in progress)
- Settings tab created and wired into MainTabs (replacing PlaceholderScreen) — src/screens/SettingsScreen.tsx
- Categories manager: add / rename / recolor / remove, tap-row-to-edit pattern matching IncomeScreen.tsx. Uses the existing `categories: Category[]` field already present in HouseholdModel/defaultModel — no data model changes needed.
- Fixed color palette (15 swatches) used for the color picker, since React Native has no built-in color picker.
- Notifications section: "Alert me X day(s) before due" number field, saves on blur, wired to model.settings.notifyDaysBefore (already existed on the data model — no changes needed there). Confirmed working on phone — field saves correctly.
- **Merchants & Payees manager**: add / rename / edit default category / remove, same tap-row-to-edit modal pattern as Categories, in its own modal (`payeeModalOpen` state, separate from the Categories modal). Fields: name (required, must be unique) + default category (optional free-text). Added a new `Payee` type to `src/types.ts` and a new optional `payees?: Payee[]` field on `HouseholdModel` (optional so existing saved profiles without it don't break). Confirmed working on the user's phone — add/edit/delete all tested.
- **Categorization Rules manager** (new this session): auto-fills a transaction's Category field based on the label (and optionally an amount range) — e.g. "contains jollibee → sets Dining". Same tap-row-to-edit modal pattern as Categories/Payees, plus ▲/▼ reorder arrows since rules are checked in array order and the first match wins. New `CategorizationRule` type added to `src/types.ts`, new optional `categorizationRules?: CategorizationRule[]` field on `HouseholdModel`. New helper file `src/categorization.ts` exports `computeAutoCategory()`, which checks a saved Payee's own default category first (more specific signal), then falls through to the first matching rule. Wired into TransactionsScreen.tsx's add/edit form: typing in the Label or Amount field triggers auto-fill, but only when the Category field is still empty — never overwrites something the user already typed. Confirmed working on the user's phone: auto-fill on label match, and rule reordering via arrows, both tested successfully.

### Cross-cutting fixes
- Person-picker added to Transactions screen
- 4 pre-existing TypeScript type errors fixed

## ⚠️ NOT started yet
- **Phase 9 — Shared Expenses / Household Linking** (no evidence in files or commits)
- **Phase 11 — Settings, remaining sub-sections**: Layout & Navigation, Security (change passphrase, PIN setup), Household & Data (backup/export/import, linking), Help & FAQ
- **Phase 12 — Polish & Real-Device Testing** (offline behavior, accessibility, full tab-by-tab pass)
- **Phase 13 — Publishing** (EAS Build, app store)

## 🔧 In progress / just finished
- Nothing currently mid-way. Last confirmed-complete work: Categorization Rules manager added to Settings + wired into Transactions auto-fill (this session), tested working on the user's phone via Expo Go.

## 📌 Decisions made
- Payment log dates typed as YYYY-MM-DD (e.g. 2025-03-24) — no date picker yet
- Payment log entries stored per-income-source, alongside the source's existing fields
- Transaction id prefixes: "bill-", "debt-", "loan-", "income-", "saving-", manual — consistent pattern in transactions.ts
- Settings screen built as one screen with sections (starting with Categories), rather than a drill-in category list like the web app — revisit this if it gets crowded once more sections are added
- Category colors picked from a fixed 15-swatch palette (matches the web app's default auto-assigned colors) rather than a native color picker
- Payees have no color/parent concept (unlike Categories) — just name + an optional default category text field, matching the web app's simpler Payee shape
- `payees` field added as optional (`payees?: Payee[]`) on HouseholdModel rather than required, so older saved profiles that predate this feature don't break when loaded — same pattern already used for groceries/travel/events/yearlyGoals
- Categorization Rules follow the same "optional field" pattern: `categorizationRules?: CategorizationRule[]` on HouseholdModel
- Auto-categorize priority order: a matching Payee's default category always wins over a matching Rule (Payee match is a more specific signal — an exact name match vs. a "contains" substring match)
- Auto-fill only ever fills an *empty* Category field — it's a convenience, not something that silently overwrites a category the user already picked

## 🛠️ Known environment fixes — Codespaces / Expo tunnel mode
- Codespaces assigns Metro a private local address (e.g. `10.x.x.x`) that phones can't reach directly — `npx expo start` alone will spin forever on the phone. Fix: run `npx expo start --tunnel` instead.
- If `--tunnel` throws `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, this is **not** actually an ngrok version mismatch (a prior session's note was wrong about the cause) — it's usually fixed simply by clearing the Metro bundler cache: run `npx expo start --tunnel -c` (the `-c` flag clears the cache). This resolved it directly in this session without needing to touch ngrok auth at all.
- Separately, ngrok tunnels do require a free ngrok account + authtoken to work reliably going forward. Sign up at https://dashboard.ngrok.com/signup, then get your authtoken at https://dashboard.ngrok.com/get-started/your-authtoken. Note: `npx ngrok config add-authtoken ...` does NOT work in this project's environment (the bundled ngrok binary here is v2.3.40, an older version with a different CLI — `config` is not a recognized subcommand for it). If auth is ever needed again, this will need a different approach — but in practice, `-c` alone was sufficient to fix the immediate issue this session.
- This only needs the `-c` cache-clear once per Codespace typically — after that, plain `npx expo start --tunnel` should keep working for the rest of that Codespace's life.

## 🚨 Process note — read this every session
PROGRESS.md drifted out of sync with actual completed work at least twice in the past (see git history for details). The 114-commit audit that rebuilt this file is the reliable baseline. Going forward: if the person's pasted `git status` is clean and matches this file, trust it and proceed directly — no need to re-audit the whole repo every time.

Also: code and file edits should always be done in the Codespaces **file editor** (left-hand file list → open/create a file → paste there), never pasted into the **terminal**. The terminal is only for short one-line commands like `git status`, `git add/commit/push`, and `npx expo start`.

When Claude hands off updated/new files at the end of a session, it should give the **complete file contents** to paste in as a full replacement — not a series of "find this line, change it to that" instructions — except for very small, low-risk additions (like a single new type or a single field), which can stay as targeted snippets since the risk of a paste error is low and asking for the whole file would be overkill.

## ▶️ Next step
Continue Phase 11 — Settings. Remaining sub-sections, roughly smallest/lowest-risk first:
(a) Layout & Navigation — smaller UI-only settings, good next pick
(b) Household & Data — backup/export/import, linking (bigger, multi-step)
(c) Security — change passphrase form + PIN setup (touches encryption directly, so extra care needed — save for when there's a full session to focus on it)
(d) Help & FAQ — smallest, mostly static content, could even be done same-session as (a)

Recommend Layout & Navigation next, since it's UI-only and low-risk, then Help & FAQ if there's time left in the same session.
