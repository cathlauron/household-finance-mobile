# Household Finance App — Spec & Scale

Generated fresh from analysis of the current `household-finance-app.html`
(Aug 16, 2026). This is a snapshot reference, not the source of truth — the
live file always wins if they disagree. Re-generate or amend this doc
whenever a phase changes the shape of something described here.

---

## 1. Architecture

- **Single self-contained HTML artifact.** One `<div id="app">`, one
  `<style>` block, one `<script>` IIFE. No build step, no external JS
  framework — all rendering is done via template-string `innerHTML` swaps
  driven by a hand-rolled render loop (`renderTabContent()` /
  `renderShell()`).
- **No routing.** `activeTab` is a module-level variable; `goToTab()` swaps
  it and calls `renderTabContent()`.
- **Re-render granularity is per-tab, not per-component.** Most state
  changes call `renderTabContent()` (full tab re-render) or `persistModel()`
  + a full render; a handful of hot paths (Calendar balance edits, bill/debt
  status hints, loan/goal progress bars) patch specific DOM nodes directly
  for performance instead of a full re-render — see §6.
- **Event binding is a mix of two patterns:**
  - **Delegated** (preferred for anything in a repeating list): a single
    listener on `#app` (`ROW_ACTIONS` table, keyed by `data-row-action`),
    plus smaller delegated listeners for compact-date inputs, amount
    formatting, and chip-suggestion clicks — set up once in `boot()`.
  - **Direct** (`.onclick =`, `addEventListener`) re-bound after every
    render for one-off buttons/inputs that exist once per tab render.
- **Data persistence:** `window.storage` (get/set/delete, personal scope) is
  the only storage layer. Every write is `JSON.stringify`'d and, for
  encrypted payloads, additionally wrapped in `{iv, data}` from
  `encryptJSON()`. There is no server backend and no external API calls
  except Google Fonts CSS loading.

## 2. Security & auth model

- **Per-profile encryption.** A profile's data (`model`) is encrypted with
  AES-GCM using a key derived via PBKDF2 (200,000 iterations, SHA-256) from
  the person's typed passphrase and a random per-profile salt.
- **Storage keys**, all namespaced by sanitized username:
  - `profiles-index` — a shared, unencrypted array of `{username, name,
    householdId, themePreview}` (readable pre-login, used for the sign-in
    autocomplete list and theme preview).
  - `profile:<username>:security-config` — `{salt}`.
  - `profile:<username>:security-verify` — an encrypted `{check:
    'vault-ok'}` sentinel used to verify a passphrase without decrypting
    real data.
  - `profile:<username>:app-data` — the encrypted `model` (unlinked
    profiles only).
  - `profile:<username>:household-key` — this profile's own wrapped copy of
    a shared household AES key (linked profiles only).
  - `household:<householdId>:app-data` — the encrypted shared `model`
    (linked profiles only, one copy shared by every linked profile).
- **Household linking:** a random AES-GCM household key is generated once,
  then wrapped (encrypted) separately for each linked profile with that
  profile's own passphrase-derived key — so N profiles can each unlock the
  same shared data with their own distinct passphrase. Linking two profiles
  that both already have data prompts a three-way choice: keep mine, keep
  theirs, or merge (`mergeModels()` — matches people by name, concatenates
  every other list, keeps the more recent `asOfDate`).
- **No passphrase recovery.** If lost, the data is unrecoverable by design.
- **Passphrase change** re-derives a new key, re-wraps the household key (if
  linked) or re-encrypts the full model (if not), and updates
  `security-config`/`security-verify`.

## 3. Data model (`model` shape)

Produced by `defaultModel()`, backfilled/repaired by `migrate()` on every
load. Top-level keys:

| Key | Shape | Notes |
|---|---|---|
| `settings` | object | See §3.1 |
| `people` | `[{id, name, role}]` | `role` is informational only |
| `income` | `[{id, personId, category, sourceName, expectedAmount, frequency, payDates[], paymentLog[], destinationAccountId, createdAt}]` | `paymentLog` entries: `{id, date, amount}` |
| `bills` | `[{id, name, category, amount, recurringType, dueDate, priority, owner, notes, cycles[], createdAt, customFreq, customStartDate, customOccurrenceCount}]` | `cycles`: `{id, dueDate, amountDue, amountPaid, paidDate, notes, expenseId, paymentMethod}` |
| `debts` | `[{id, creditorOrPerson, category, recurringType, dueDate, cycles[], notes, owner, interestRate, minPayment, balanceMode, totalAmountDue, isCreditCard, creditLimit, availableCreditOverride, availableCreditOverrideDate, customFreq, customStartDate, customOccurrenceCount, createdAt}]` | `cycles` add `feesPortion`, `paymentMethod` vs. bills |
| `loans` | `[{id, name, loanType, customTypeLabel, totalAmount, expectedPayment, actualPayments[], owner, recurringType, dueDate, direction, customFreq, customStartDate, customOccurrenceCount, createdAt}]` | `direction`: `'borrowed'` \| `'lent'` |
| `savingsGoals` | `[{id, name, targetAmount, targetDate, currentAmount, contributions[], createdAt}]` | |
| `expenses` | `[{id, amount, category, date, linkedSource, note}]` | Auto-generated/synced from paid bills, checked-off travel/event checklist items, purchased groceries — not directly user-editable as its own list |
| `groceries` | `[{id, item, plannedAmount, actualAmount, purchased, expenseId, store, aisle, unitQty, unitLabel}]` | |
| `travel` | `[{id, name, budget, startDate, endDate, checklist[], savingsGoalId, trackInSavings, createdAt}]` | checklist items carry `subItems[]` |
| `events` | `[{id, name, type, date, budget, expenseId, checklist[], recurrence, customTypeLabel, onetimeDate, customFreq, customStartDate, customOccurrenceCount, savingsGoalId, trackInSavings, completed, completedDate, createdAt}]` | |
| `groceryCalculator` | `[{id, label, amount}]` | Scratch tally, feeds into `groceries` |
| `mealIdeas` | `[{id, name, budget, ingredients[]}]` | |
| `yearlyGoals` | `[{id, title, description, mode, targetAmount, currentAmount, amount, targetDate, completed, createdAt}]` | `mode`: `'progress'` \| `'checklist'` |
| `categoryBudgets` | `[{id, category, monthlyBudget}]` | |
| `balanceAccounts` | `{asOfDate, cash[], debit[], credit[], investment[], property[], vehicle[]}` | Account shape: `{id, name, amount, currency, owner, startingBalance?, startingBalanceDate?, creditLimit?}`; `cash` is enforced to exactly one entry |
| `manualTransactions` | `[{id, date, label, amount, direction, owner, category, tags[], receiptPhoto, paymentMethod}]` | `direction`: `'in'` \| `'out'` \| `'saving'` |
| `categories` | `[{id, name, color, parentId}]` | One level of nesting max; seeded from `DEFAULT_CATEGORY_SEED` (83 entries) on first run |
| `payees` | `[{id, name, defaultCategory}]` | |
| `netWorthSnapshots` | `[{id, monthKey, date, value, auto}]` | One per calendar month, auto-captured on login |
| `transactionTemplates` | `[{id, label, amount, direction, owner, tags[]}]` | One-tap re-log |
| `hiddenTransactionIds` | `string[]` | Composite transaction IDs hidden from the Transactions list without touching the source record |
| `accountTransfers` | `[{id, date, fromAccountId, toAccountId, amount, fee, note}]` | Debit-to-debit transfers, withdrawals, cash advances, direct cash logs (blank `fromAccountId` = direct log) |

### 3.1 `settings` (selected fields)

`currency`, `notifyDaysBefore`, `theme`, `colorMode`, `customColor`,
`customTones`, `vaultName`, `fontSize`, `fontFamily`, `boldText`,
`italicText`, `layoutMode`, `scrollableTabsPosition`, EF/FI calculator
overrides (`efMonthsTarget`, `efMonthlyExpenses`, `efCurrentAmount`,
`fiAnnualExpensesOverride`, `fiWithdrawalRate`, etc.), `pushNotificationsEnabled`,
`showOtherAssetsOnCalendar`, `calendarHiddenBalGroups[]`, `dashboardWidgets[]`
(id + visible, order-significant), `exchangeRates{}` (per non-home currency
code), `moneyColors{in,out,save}`, `incomeToleranceDays`,
`creditAccountsMigratedToDebts` (one-time migration flag).

### 3.2 Transactions are derived, not stored, except for one type

`buildTransactionsList()` assembles the unified Transactions-tab list live,
every render, from: `expenses`, paid `debts` cycles, non-lent `loans`
payments (lent-loan repayments post as income), `savingsGoals`
contributions, resolved income occurrences (`incomeOccurrencesRecent()`),
and `manualTransactions`. Only `manualTransactions` is directly
CRUD-editable as "a transaction" — everything else is edited at its source
record, or hidden/reversed via `ROW_ACTIONS`' `txn-hide` /
`txn-delete-source` / `txn-open-edit-source` handlers.

## 4. Theming system

- 13 named themes (`THEMES`) + a single-hue-derived **custom** palette
  (`generatePaletteFromHex`) + a hand-picked **4-tone custom** palette
  (`generateFourTonePalette`), each with light/dark variants and a shared
  money-color triad (green/red/orange) stamped on afterward.
- Color mode: `light` / `dark` / `device` (follows `prefers-color-scheme`
  live).
- Font pairing (7 options), font size (5 steps via `--font-scale`), and
  bold/italic overrides are independent axes layered on top of the theme.
- Fonts are lazy-loaded per family (`ensureGoogleFontsLoaded`), not all
  upfront.
- Theme/font/color-mode state is duplicated into the (unencrypted)
  `profiles-index` entry as `themePreview` so the sign-in screen can render
  the right look before a passphrase is entered.

## 5. Component library (reusable render helpers)

- **`compactDateHTML()` / `setupCompactDateDelegation()`** — a styled
  label+icon wrapping a fully transparent native `<input type="date">`.
  Every date field in the app uses this instead of a raw date input.
- **`amountInputHTML()` / `parseAmountValue()` / `formatAmountString()` /
  `setupAmountFormatDelegation()`** — `type="text"` input with live
  comma-grouping and cursor-position preservation; stored value is always
  parsed back to a plain number.
- **`chipSuggestRowHTML()` / `categoryChipSuggestRowHTML()` /
  `tagSuggestRowHTML()`** — tappable suggestion chips replacing native
  `<datalist>` (unreliable on mobile Safari). Category variant shows each
  category's color dot and parent breadcrumb.
- **`paymentMethodPickerHTML()` / `bindPaymentMethodPicker()`** — shared
  Cash/Debit/Credit selector used on bill/debt cycles, loan payments, and
  the manual-transaction forms (Accounts-6).
- **`receiptFieldHTML()` / `resizeImageFile()`** — picks + client-side
  downscales (max 1000px, JPEG q0.72) a receipt photo to a base64 data URL
  stored directly on the transaction record.
- **`ROW_ACTIONS`** — the central delegated-click dispatch table (edit/
  remove/collapse/add-cycle/toggle-paid/etc. for every tab's list rows),
  bound once via `setupRowActionDelegation()`.
- **`cancelButtonHTML()` / `attemptOpenRecord()` / `attemptStartNew()` /
  `handleRecordCancel()` / `markNewUnsavedRecord()`** — shared "new record
  not yet saved" guard: creating or opening a different record while one is
  mid-creation prompts a discard confirmation.
- **`ownerOptionsHTML()` / `ownerFilterOptionsHTML()` /
  `ownerSelectOptionsHTML()` / `ownerDisplayLabel()`** — the recurring
  "shared vs. a specific person" owner concept, used by Bills, Debts, Loans,
  Income, and manual Transactions.
- **Print / receipt / calendar-day modals** all reuse one
  `.print-preview-overlay` / `.print-preview-modal` shell.

## 6. Performance patterns worth knowing

- **`monthEventsCache`** — a per-render-pass memoization of
  `getMonthEvents(year, month)`, cleared at the top of every
  `renderTabContent()` call. Dashboard's 6-month trend charts and Calendar
  both hit this heavily; without it every trend chart would recompute
  overlapping months independently.
- **Calendar balance-cell patching** (`refreshCalendarBalanceCells()`) —
  editing a balance-account amount does *not* re-render the whole Calendar
  grid; it recomputes `computeRunningBalances()` and patches just each day
  cell's `.cal-balance` text/class.
- **Bill/debt/loan/goal status hints** similarly patch specific nodes
  (`refreshBillHints`, `refreshDebtStatus`, `refreshLoanCard`,
  `refreshGoalCard`, `refreshYGoalCard`) rather than a full tab re-render on
  every keystroke.
- **Toolbar popovers** (sort/filter/date-range, one set per tab) are
  mutually exclusive and closed generically via
  `closeAllToolbarPopovers()` inside the single global outside-click
  handler, rather than one bespoke handler per tab.

## 7. Accounts computation engine (Accounts-1 through Accounts-8)

A from-scratch balance-computation layer, separate from (and now feeding)
the older raw `balanceAccounts[...].amount` figures:

- **Anchor-and-project model:** each Debit/Cash account has a
  `startingBalance` + `startingBalanceDate`; balances are computed forward
  from that anchor by accumulating dated activity — never reconstructed from
  full history.
- **`computeDebitAccountBalance(id, asOfDate)`** = starting balance +
  routed income (`incomeRoutedToAccountBetween`, resolved actual-vs-expected
  same as the Calendar projection) + transfers in − transfers out (incl.
  fee) − tagged payments (`taggedPaymentsBetween('debit', accountId, ...)`).
- **`computeCashBalance(asOfDate)`** — same idea; Cash is a single account.
- **`computeCreditAvailable(debtId, asOfDate)`** = limit − outstanding,
  where fees-portion of a payment doesn't free up the limit; supports a
  manual "available credit as of" snapshot override
  (`availableCreditOverride[Date]`) that projects forward from a hand-typed
  figure instead of the full reconstructed cycle history.
- **Credit cards are Debt records**, flagged `isCreditCard: true` — there is
  no separate `balanceAccounts.credit` entity anymore; legacy
  `balanceAccounts.credit` entries were one-time migrated into Debt records
  (`creditAccountsMigratedToDebts` flag).
- **The Accounts tab** (Accounts-4) is the actual UI for all of this:
  Debit account cards, the single Cash card + withdraw/log-cash actions,
  debit-to-debit transfers, and editable credit-card cards with the
  available-credit override form.
- **Calendar's own Cash/Debit/Credit summary lines are now read-only**
  (Accounts-7), sourced from these computed functions "as of today" —
  editing happens only on Accounts (debit/cash) or Debts (credit).
  Investments/Property/Vehicles ("Other assets") remain directly editable
  on Calendar.
- **Payment-method tagging** (`{type: 'cash'|'debit'|'credit', accountId}`)
  exists on every bill cycle, debt cycle, loan payment, and manual
  transaction, feeding the Accounts computation engine and the "Payment
  Method Breakdown" Dashboard widget / Reports page (Accounts-8).

## 8. Tab-by-tab summary

| Tab | Sub-tabs / notable features |
|---|---|
| **Calendar** | Month grid with per-day event chips (bill/debt/loan/income/event/saving/transfer/manual), day-click modal with quick-add, running-balance projection, balance summary cards (liquid + "other assets," each collapsible, with per-line reveal/mask), Quick Add FAB panel |
| **Accounts** | Debit accounts, single Cash account (+ withdraw / log-cash / transfer forms), editable Credit cards — see §7 |
| **Transactions** | Unified derived list (see §3.2); sort/filter/date-range toolbar; bulk select + bulk-tag/delete; CSV import wizard (paste/upload → column mapping → preview with duplicate flagging → confirm); recurring templates; hide/unhide + edit/delete-at-source for non-manual rows; receipt photo viewer |
| **Bills** | Monthly/Annual/One-time/Custom recurrence; priority; payment cycles with sparkline price history; owner; category |
| **Debts** | Same recurrence model as Bills; one-time debts get a simplified paid/unpaid toggle instead of full cycle logging; monthly debts get a Manual-balance/Auto-cycle mode; **Payoff Simulator** sub-tab (Snowball vs. Avalanche, month-by-month projection, debt-free countdown) |
| **Loans** | Borrowed vs. Lent direction; expected-vs-actual payment tracking with late-fee detection; same recurrence model |
| **Savings** | Goals list; **Emergency Fund & Savings Rate** calculator sub-tab; **FI Calculator** sub-tab (both auto-derive from income/budget/account data with manual overrides) |
| **Income** | Frequency-based pay-date scheduling (weekly/biweekly/semimonthly/monthly/one-time); actual-pay logging with a configurable tolerance-day matching window against scheduled occurrences; destination-account routing |
| **Dashboard** | Fully customizable, reorderable, hide/show-able widget set (11 widgets: stats, spending trend, income vs. expenses, spending by category, category budgets, spending by person, payment-method breakdown, debt-free countdown, debt payoff trend, net worth trend, savings goals overview); CSV/PDF export; print preview |
| **Reports** | 9 sub-pages: Weekly Digest, Monthly Close-out, Year in Review, Tax Summary, Cash-Flow Forecast (30/60/90d), Subscription Audit, Merchant Spending, Person Spending, Payment Methods |
| **Groceries** | List / Calculator (running tally) / Meal Ideas (ingredient-cost-driven budget) sub-tabs; store/aisle/unit-price detail per item |
| **Travel** | Trip checklist with sub-items, auto-budget from checklist costs, optional auto-sync to a Savings goal |
| **Events** | Birthday/Anniversary/Other; Annual/One-time/Custom recurrence; checklist-driven or flat budget; auto-syncs to a Savings goal until completed, then posts as an expense |
| **Goals** (Year-End) | Track-progress or simple-checklist mode per goal |
| **Settings** | Drill-in category list: Profile & Personalization, Notifications, Layout & Navigation, Categories, Merchants & Payees, Security, Household & Data, Help & FAQ (with a Desktop/Mobile capability table) |

## 9. Layout modes

Four navigation layouts, switchable live from Settings → Layout &
Navigation, previewed live during first-run setup: **Bottom navigation**
(default for new profiles), **Top menu**, **Sidebar** (dropdown, not a full
drawer), **Scrollable tabs** (top or bottom placement).

## 10. Notifications

- In-app bell badge + panel, driven by `computeDueAlerts()` (bills + loans
  within `notifyDaysBefore` days).
- Optional native browser push notifications (`Notification` API),
  deduped per-item-per-day via a small persisted dedupe map, only fires
  while the tab is open.
- Budget-alert toasts (category over-budget) with their own per-category-
  per-month dedupe.

## 11. Cross-cutting conventions

- Every category-aware feature (transactions, budgets, reports) resolves a
  subcategory's spend up into its parent via `categoryRollupNames()` /
  `categoryRollupGroupLabel()` — one level of nesting only.
- Custom recurrence (daily/weekly/biweekly/monthly/yearly, optional finite
  occurrence count) is implemented once (`nextCustomRecurDueDate`,
  `customEventOccurrenceDates`, `isCustomRecurCompleted`) and reused by
  Bills, Debts, Loans, and Events rather than four separate copies.
- CSV export is per-tab and generic (`downloadCSVRows()` +
  `toCSVString()`); CSV import is a full wizard (see Transactions row
  above).
- `migrate()` is fully additive — every new field ships with a backfill
  branch so older saved profiles never see a shape change on upgrade.

## 12. Not yet built (cross-check against the current backlog doc)

As of this doc's generation: investment holdings detail (shares/cost
basis/current price) + allocation chart, loan amortization preview, debt
consolidation what-if, asset depreciation, a standalone financial-health
snapshot report, recurring/scheduled account transfers, attachments beyond
receipt photos, the CSS breakpoint-ladder consolidation, and the MF5–MF8 tab
restructuring (To-Pay/Planning consolidation, Home tab, pinned-tabs
picker, iconography pass). Re-verify this list against the live file before
trusting it — it drifts.
