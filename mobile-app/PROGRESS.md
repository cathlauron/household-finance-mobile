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
- 6.2b — Manual transactions now have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import: NOT yet done. Explicitly optional/deferrable per the roadmap.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone. UPDATE (this session): the "Auto-saving to Savings tab" toggle added in an earlier session was previously only wired to local component state — it now actually creates/updates/removes a real linked SavingsGoal. See the dated session entry below for full detail. This closes out the last outstanding piece of Travel that earlier "Next step" notes had flagged as unfinished.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone. NOTE: Events' own savings-goal auto-sync (mirroring what Travel now has) is NOT implemented — confirmed via grep this session. See "Next step" below.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: New file src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice (Option 1 from the two options presented). Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. This should be scoped as its own checkpoint, not treated as "the last report left to fill in."

Phase 11 — Settings (M14) — 🔧 IN PROGRESS
- 11.2 — Notifications (native push). ✅ Verified in an earlier session — wiring confirmed sound: rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. On-device confirmation still DEFERRED — Expo Go on Android doesn't support expo-notifications as of SDK 53+ (confirmed via direct testing). Needs a real installed build (Phase 13) or an untried iPhone Expo Go test. The temporary "Send a test notification in 10 seconds" button on SettingsScreen.tsx should be removed once real on-device confirmation happens.
- 11.1, 11.3 — Not yet started.

---

## 📅 Session entry — Travel savings-goal auto-sync (Steps 8–9 completed & verified)

This session picked up mid-flow from a prior session that had already added the
"Auto-saving to Savings tab" toggle's *visual* UI to TravelScreen.tsx (Step 8) but had
not yet connected it to any real data — it was only backed by local `useState` at that
point. This session (Step 9) finished the actual sync logic and confirmed it end-to-end
on a physical device.

**Investigation before writing code (this session):**
- Confirmed `TravelTrip` (in `src/types.ts`) already had `budget?`, `trackInSavings?`,
  and `savingsGoalId?` fields defined, with an existing code comment flagging that
  Events should eventually reuse the same pattern.
- Checked `EventsScreen.tsx` via grep for `trackInSavings|savingsGoalId|SavingsGoal` —
  zero matches. Confirmed Events has no goal-sync implementation at all yet, so Travel
  is the *first* implementation of this pattern in the mobile app, not a copy of an
  existing one — the comment in types.ts was describing an intended future pattern, not
  documenting something already built elsewhere.
- Confirmed `SavingsGoal` (in `src/types.ts`) is a `type` (not `interface`) with fields:
  `id`, `name`, `targetAmount`, `targetDate`, `contributions`, `currentAmount`,
  `createdAt`.
- Inspected the full `handleSaveTrip()`/`handleDeleteTrip()`/`openAddModal()`/
  `openEditModal()` functions in TravelScreen.tsx before writing any patch, to match
  exact variable names and structure rather than guessing.

**Code changes made (all in `src/screens/TravelScreen.tsx` unless noted):**
- Added `tripFullChecklistTotal(trip)` — sums the cost of every checklist item
  regardless of checked state. Deliberately distinct from the pre-existing
  `tripChecklistTotal(trip)`, which only sums *checked* items and feeds a separate
  "committed so far" banner already shown in the modal. The savings goal target uses the
  *full* total, matching the original web app's `syncTravelSavingsGoal()` behavior of
  budgeting for the whole trip, not just what's already been paid for.
- Added `syncTripSavingsGoal(trip, budget, allGoals)` — the core sync function:
  - If `trackInSavings` is false, or budget is 0: removes the linked goal (matched by
    `savingsGoalId`) from the goals array if one exists; otherwise no-op.
  - If `trackInSavings` is true and budget > 0: looks for an existing goal by
    `savingsGoalId`. If found, updates its `name` (always `"Travel: {trip name}"`) and
    `targetAmount` to match the current budget. If not found, creates a new
    `SavingsGoal` with `targetDate` set to the trip's `startDate` (or `''` if unset),
    `contributions: []`, and `currentAmount: 0`.
  - Returns `{ goals, savingsGoalId }` so the caller can persist both the updated goals
    array and the trip's own updated pointer in a single `saveModel()` call, keeping
    trip and goal data from ever being saved out of sync with each other.
- Updated the type import line to include `SavingsGoal` alongside the existing
  `TravelTrip`, `TravelChecklistItem`, `HouseholdModel` imports.
- `openAddModal()`: now resets `trackInSavings` to `false` (previously left it in
  whatever state the last-edited trip left it in).
- `openEditModal(trip)`: now loads `trackInSavings` from `trip.trackInSavings ?? false`
  instead of leaving local state stale from whatever was previously open.
- `handleSaveTrip()`: rewritten to build a `draftTrip` object first (carrying over
  `savingsGoalId` and `createdAt` from the prior trip when editing), compute its budget
  via `tripFullChecklistTotal()`, run it through `syncTripSavingsGoal()`, and save the
  resulting `finalTrip` (now including `budget` and the possibly-new `savingsGoalId`)
  alongside the synced goals array — both in one `saveModel(updated)` call.
- `handleDeleteTrip()`: rewritten to look up the trip being deleted, and if it had a
  `savingsGoalId`, filter that goal out of `model.savingsGoals` in the same update that
  removes the trip — so deleting a trip never leaves an orphaned goal behind in Savings.

**Verification on physical device, all confirmed working:**
1. Added a trip with a checklist item (cost ₱15,000), toggled "Auto-saving to Savings
   tab" on, saved — a new goal "Travel: {trip name}" appeared in the Savings tab with
   target ₱15,000.
2. Edited the trip's checklist (added/changed item costs), saved again — the goal's
   target updated to match the new total.
3. Toggled "Auto-saving to Savings tab" off, saved — the goal disappeared from Savings.
4. Deleted a trip that still had an active linked goal — the goal was removed along
   with the trip, no orphaned entry left behind.
5. `npx tsc --noEmit` returned zero output (no type errors) immediately after the patch
   applied, before any device testing.

**Process note on patch-script reliability (useful for future sessions):**
- A first attempt at this patch used one large Python script matching whole multi-line
  text blocks verbatim, and failed twice with `AssertionError: ... not found`, even
  though the target code looked visually identical when independently checked with
  `sed`/`grep` — almost certainly due to invisible whitespace/line-wrapping differences
  between the assumed text and the actual file content.
- Because that patch script only calls `f.write()` at the very end, after every
  `assert` has already passed, a failed assertion means the file was **never touched** —
  confirmed by re-inspecting the file after the failure and finding it completely
  unchanged. This is a safe failure mode, not a partial/corrupted edit, but it's worth
  knowing that an `AssertionError` here means "nothing happened," not "something broke."
- Fix: switched from whole-block string matching to a line-by-line approach — locating
  individual anchor lines (via small `find_line`/`find_containing` helper functions) and
  inserting/replacing only the specific line ranges needed around them. This applied
  cleanly on the first retry. Recommended default going forward: prefer this line-by-
  line anchor approach over large verbatim block matches for any future file patch,
  given block-matching failed here for reasons that weren't obvious from visual
  inspection alone.

🧹 Code health
- npx tsc --noEmit ran clean (0 errors) after this session's Travel savings-goal sync changes, and also after the prior session's Tax Summary changes.
- Confirmed in an earlier session: a very large single cat > file << 'ENDOFFILE' paste can make the Codespace terminal's on-screen echo look garbled/truncated mid-paste — but the file actually written to disk was correct and complete both times this was checked. Lesson for future sessions: if a big paste looks broken on screen, don't assume the file is broken — verify with cat -n on the actual file before troubleshooting or recreating it. If a file genuinely does come out truncated, the fix is to split the same content into two or more smaller cat > ... << 'ENDOFFILE' blocks rather than one giant one.
- This session added a second, related lesson specifically for *patch scripts* (not just file creation): prefer line-by-line anchor matching over whole-block verbatim matching, since the latter failed twice this session for reasons not visible via normal file inspection. See the dated session entry above for full detail.
- Previous sessions' fixes (setNotificationHandler shouldShowBanner/shouldShowList properties, MainTabs.tsx id prop, LoansScreen.tsx/SavingsScreen.tsx progress-bar width typing) remain fixed — implied by this session's clean npx tsc --noEmit run, not individually re-diffed line by line.

⚠️ Known issues / gotchas (non-code)
- Expo tunnel (`--tunnel`) occasionally fails with `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, pointing at ngrok. Not a bug in the app. Fix order: (1) `npm install --save-dev @expo/ngrok@latest` then retry `npx expo start --tunnel`; (2) `npx expo start --tunnel --clear`; (3) check terminal text for an ngrok signup-link prompt.
- Expo Go on Android cannot run any expo-notifications functionality (local or remote/push) as of Expo SDK 53+ — confirmed via direct testing. Affects on-device testing of all Checkpoint 11.2 work until Phase 13 (real installed build). iPhone via Expo Go may still work (untried) since the restriction is Android-specific.
- npx tsc (and likely other npx-invoked project tools) must be run from inside mobile-app/, not the repo root, or npx will try to fetch an unrelated package also called "tsc" from the internet.
- PROGRESS.md can drift from what's actually in the code — confirmed multiple times across sessions now. When a file's actual contents look more complete (or less complete) than this log describes, don't assume the log is "close enough" — verify directly via terminal output before updating status.
- Large heredoc pastes (cat > file << 'ENDOFFILE' with a lot of content) can render garbled in the Codespace terminal's own echo, even when the underlying file write succeeds correctly. Always verify with cat -n against the actual file rather than trusting what scrolled by on screen — see Code health above.
- Multi-line Python patch scripts that match whole text blocks verbatim can fail with AssertionError even when the target code is visually identical on inspection, due to invisible whitespace/formatting differences. Prefer line-by-line anchor matching instead — see Code health above and the dated session entry for the specific technique used.

📌 Decisions made
(All decisions from prior sessions still stand — repeating only what's new/relevant below; see repo history for the full original list if ever needed.)
- Travel savings-goal budget semantics (this session): The synced goal's target is the trip's *full* checklist total (every item, checked or not) — kept deliberately separate from the "committed so far" total (checked items only) already used for the modal's own progress banner. These are two different numbers serving two different purposes and should not be merged into one.
- Reference pattern for future goal-sync work (this session): The pattern built for Travel (trackInSavings + savingsGoalId fields on the parent record; sync computed and applied on every save; linked goal removed on toggle-off or on deleting the parent record) is now the reference implementation to copy when Events gets the same treatment. Events' types.ts entry already has a comment flagging this, but as of this session EventsScreen.tsx has zero implementation of it (confirmed via grep — no trackInSavings, savingsGoalId, or goal-sync logic present at all).
- Patch-script technique (this session): For future multi-line edits to existing files, prefer line-by-line anchor matching (locate specific anchor lines, then insert/replace narrow ranges around them) over large verbatim block replacement, based on this session's two failed whole-block attempts before switching approaches.
- Tax Summary scope decision (earlier session): Built with loan-late-fees-only for "interest & fees," clearly labeled in-app as a limitation, rather than waiting on a data-model change. This matches the project's general pattern of shipping a clearly-labeled partial feature over blocking on a larger prerequisite.
- Payment Methods report deferred (earlier session): The person chose to explicitly defer this rather than do the minimum data-model change to unblock it now. Next time this is picked up, it should be scoped as its own checkpoint (data model field + real Cash/Debit/Credit picker UI on payment-logging screens + manual transaction form), not just "one more report file."
- Paste-safety discipline (earlier session): For any future large file creation via cat > ... << 'ENDOFFILE', if the terminal echo looks garbled or cut off during/after the paste, do NOT assume the file is broken — always verify with cat -n first. If a file genuinely is incomplete, split the content into two+ smaller heredoc blocks instead of one large one.
- Checkpoint tracking discipline (reconfirmed): Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version.
- File-creation discipline (reconfirmed): Files are created via cat > filename << 'ENDOFFILE'. Existence is checked first before creating. Editing existing files uses targeted sed for small changes, or a python3 - << 'ENDOFFILE' exact-match script for multi-line/whitespace-sensitive edits — this session confirmed the line-by-line variant of that approach is more reliable than whole-block matching.
- New-screen/new-logic wiring discipline (reconfirmed): A new feature isn't "done" until it's fully wired into its real data flow AND confirmed visible/working on a real device — all of this was completed this session for Travel's savings-goal sync, matching how Tax Summary was closed out in the prior session.

▶️ Next step

Checkpoint 10.2 (Reports) remains done except for Payment Methods, which is intentionally deferred and rescoped (see above) rather than being "the next report to build." Recommended order for next session — ask the person which to tackle first:

1. Events' own savings-goal auto-sync is now the clearest small next item: Travel's implementation (this session) is the reference pattern to copy — tripFullChecklistTotal/syncTripSavingsGoal naming and logic should translate directly to an Events equivalent, adjusted for however Events' own checklist/budget fields are shaped (needs its own grep/inspection pass first, same as this session did for Travel, since Events' checklist fields haven't been confirmed yet). Other still-flagged small follow-ups: EF/FI calculators still don't auto-pull figures from Bills/Income; Events have no per-event checklist yet either (separate from the goal-sync question); Custom recurrence math isn't implemented in recurrence.ts yet (Bills/Debts/Loans data model supports it, but due-date calculation doesn't).
2. Phase 9 — Shared Expenses / Household Linking (M3, M11) — still the biggest remaining phase, flagged as the hardest technical part of the whole project, and still deferred pending revisiting the Phase 0.1 sync decision.
3. Loans still aren't included in the Dashboard's "Amount Owed" or "Due Soon" cards, or in the Calendar's/Cash-Flow Forecast's running-balance projection — matching balanceProjection.ts's own pre-existing limitation. Worth a dedicated checkpoint later to add loan due-dates into that projection everywhere it's used.
4. Rest of Phase 11 (Settings): 11.1 (Categories, Payees, Rules) and 11.3 (Security & Household & Data) haven't been started yet.
5. Payment Methods report — as its own checkpoint, starting with the data-model decision (add paymentMethod to BillCycle/Debt cycles/LoanPayment/ManualTransaction) and a real picker UI, THEN the report itself.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types (no paymentMethod or feesPortion fields yet — see Phase 10.2 notes above)
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math not yet implemented)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel()
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance()
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; confirmed wired to rescheduleBillNotifications()
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
  - mobile-app/src/screens/TransactionsScreen.tsx
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — UPDATED this session: real savings-goal auto-sync (tripFullChecklistTotal, syncTripSavingsGoal), replacing the local-state-only toggle from an earlier session. See dated session entry above.
  - mobile-app/src/screens/EventsScreen.tsx — confirmed this session to have NO trackInSavings/savingsGoalId/goal-sync logic yet; flagged as the next candidate to copy Travel's pattern into.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx
  - mobile-app/src/screens/InsightsScreen.tsx
  - mobile-app/src/screens/ReportsScreen.tsx — second-level pill-switcher between report pages (8 pills)
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx
  - mobile-app/src/screens/reports/YearInReviewReport.tsx
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (loan late fees only, clearly labeled), full expense-by-category breakdown.
  - mobile-app/src/screens/SettingsScreen.tsx — includes a temporary "Send a test notification in 10 seconds" button (Checkpoint 11.2) to be removed once real device confirmation happens in Phase 13
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
