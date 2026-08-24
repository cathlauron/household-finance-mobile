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
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync (tripFullChecklistTotal/syncTripSavingsGoal), verified in an earlier session.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone. UPDATE (this session): Events now has its own savings-goal auto-sync, mirroring Travel's pattern exactly. See dated session entry below for full detail. This was the last outstanding piece flagged from the previous session's "Next step" — Phase 8 is now genuinely fully complete, not just "complete except for X."

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

## 📅 Session entry — Events savings-goal auto-sync (mirrors Travel, fully verified on-device)

This session copied the savings-goal auto-sync pattern built for Travel in the prior
session over to Events — closing out the one piece Phase 8 was missing.

**Code changes made:**
- `src/types.ts` — Added `trackInSavings?: boolean` and `savingsGoalId?: string` to the
  `EventItem` type, matching the fields already on `TravelTrip`.
- `src/screens/EventsScreen.tsx`:
  - Added `SavingsGoal` to the type import line.
  - Added `syncEventSavingsGoal(ev, trackInSavings, budget, allGoals)` — the Events
    equivalent of Travel's `syncTripSavingsGoal()`. Since Events have no checklist (just
    a flat `budget` field, unlike Travel's checklist-derived total), this function uses
    `budget` directly as the target amount rather than needing a
    `tripFullChecklistTotal()`-style helper first. Same removal/create/update logic as
    Travel: if tracking is off or budget is 0, the linked goal (matched by
    `savingsGoalId`) is removed if one exists; otherwise it's created or updated in
    place, named `"Event: {event name}"`, with `targetDate` set from the event's
    `onetimeDate` where available.
  - Added `trackInSavingsInput` state, reset to `false` on `openAddModal()` and loaded
    from `ev.trackInSavings ?? false` on `openEditModal()`.
  - `handleSaveEvent()` (the save handler) now runs the sync before saving, and persists
    both the updated event (with its `trackInSavings`/`savingsGoalId` fields) and the
    updated `savingsGoals` array in one `saveModel()` call — same one-call-for-both-
    pieces approach used for Travel, so event and goal data can never be saved out of
    sync with each other.
  - `handleDeleteEvent()` now looks up the event being deleted and, if it had a
    `savingsGoalId`, filters that goal out of `model.savingsGoals` in the same update
    that removes the event — no orphaned goals left behind.
  - Added a "✓ Auto-saving to Savings tab" / "Not tracked in Savings tab" toggle to the
    add/edit modal, placed directly under the Budget field, above the existing
    Completed toggle — visually matching Travel's toggle styling (new
    `trackSavingsToggle`/`trackSavingsToggleActive`/`trackSavingsToggleText`/
    `trackSavingsToggleTextActive` style entries, styled identically to the existing
    `completedToggle` family).
- Explicit scope note carried over from the plan: like Travel, this only syncs the
  savings goal target — it does NOT convert a completed event into an actual logged
  expense/transaction. That remains a separate, not-yet-built feature for both screens.

**Process note on patch reliability (confirms last session's lesson):**
- The person's pasted terminal output for this session showed visibly truncated/
  garbled echo of both Python heredoc scripts (e.g. the second script's visible output
  jumped straight from an early line to "EventsScreen.tsx patched successfully -- all 9
  edits applied." with everything in between compressed/missing from the paste) — but
  both scripts DID report their success message, meaning every `assert` passed and the
  file was actually written in full. This matches the known Codespace-terminal-echo
  quirk documented in the prior session's Code health notes: garbled on-screen echo
  during/after a large heredoc paste does not mean the underlying file write failed.
  `npx tsc --noEmit` returning clean output afterward is itself strong independent
  confirmation the files ended up syntactically correct.

**Verification on physical device, all 6 steps confirmed working by the person:**
1. Created a new event with a ₱5,000 budget, toggled "Auto-saving to Savings tab" on,
   saved — a new goal "Event: {event name}" appeared in Savings with a ₱5,000 target.
2. Edited the event's budget to ₱7,500, saved — the SAME goal updated its target to
   ₱7,500 (not duplicated).
3. Toggled tracking off, saved — the goal disappeared from Savings.
4. Toggled tracking back on, saved — the goal reappeared.
5. Deleted the event entirely — the linked goal was removed along with it, no orphan
   left in Savings.
6. `npx tsc --noEmit` returned zero output (no type errors) after both patch scripts
   applied, before any device testing began.

🧹 Code health
- npx tsc --noEmit ran clean (0 errors) after this session's Events savings-goal sync
  changes, immediately following both patch scripts.
- This session reconfirms (rather than newly discovers) the existing lesson that a
  large heredoc paste's on-screen terminal echo can look garbled/truncated even when the
  actual file write completes correctly and completely — see the dated session entry
  above and the "Known issues" note below. No new code-health issues surfaced this
  session.
- Previous sessions' fixes (setNotificationHandler shouldShowBanner/shouldShowList
  properties, MainTabs.tsx id prop, LoansScreen.tsx/SavingsScreen.tsx progress-bar width
  typing, the line-by-line anchor patch technique used for both Travel and now Events)
  remain fixed — implied by this session's clean npx tsc --noEmit run, not individually
  re-diffed line by line.

⚠️ Known issues / gotchas (non-code)
- Expo tunnel (`--tunnel`) occasionally fails with `CommandError: TypeError: Cannot read properties of undefined (reading 'body')`, pointing at ngrok. Not a bug in the app. Fix order: (1) `npm install --save-dev @expo/ngrok@latest` then retry `npx expo start --tunnel`; (2) `npx expo start --tunnel --clear`; (3) check terminal text for an ngrok signup-link prompt.
- Expo Go on Android cannot run any expo-notifications functionality (local or remote/push) as of Expo SDK 53+ — confirmed via direct testing. Affects on-device testing of all Checkpoint 11.2 work until Phase 13 (real installed build). iPhone via Expo Go may still work (untried) since the restriction is Android-specific.
- npx tsc (and likely other npx-invoked project tools) must be run from inside mobile-app/, not the repo root, or npx will try to fetch an unrelated package also called "tsc" from the internet.
- PROGRESS.md can drift from what's actually in the code — confirmed multiple times across sessions now. When a file's actual contents look more complete (or less complete) than this log describes, don't assume the log is "close enough" — verify directly via terminal output before updating status.
- Large heredoc pastes (cat > file << 'ENDOFFILE' with a lot of content, or a multi-line python3 - << 'PYEOF' script) can render garbled/truncated in the Codespace terminal's own on-screen echo, even when the underlying file write succeeds correctly and completely. This has now been observed across two consecutive sessions (Travel's session and this one). Always trust the script's own printed success message plus a clean npx tsc --noEmit run over what scrolled by on screen — verify with cat -n against the actual file directly if there's ever real doubt.
- Multi-line Python patch scripts that match whole text blocks verbatim can fail with AssertionError even when the target code is visually identical on inspection, due to invisible whitespace/formatting differences. Prefer line-by-line anchor matching instead — this technique was used successfully for both Travel (prior session) and Events (this session).

📌 Decisions made
(All decisions from prior sessions still stand — repeating only what's new/relevant below; see repo history for the full original list if ever needed.)
- Events savings-goal sync follows Travel's pattern exactly (this session): trackInSavings + savingsGoalId fields on the parent record; sync computed and applied on every save; linked goal removed on toggle-off or on deleting the parent record. The only structural difference is that Events uses its flat budget field directly as the sync target, since Events has no checklist to sum (unlike Travel's tripFullChecklistTotal()). This pattern is now implemented identically in both TravelScreen.tsx and EventsScreen.tsx and should be treated as the standard reference if any other screen ever needs the same kind of "auto-track a budget as a savings goal" behavior.
- Scope stays deliberately narrow (this session, reconfirmed from the original plan): Events' sync, like Travel's, only manages the savings goal target — it does not convert a completed event into an actual logged expense/transaction. That remains an explicitly separate, not-yet-built feature.
- Terminal-echo trust discipline (this session, reconfirming prior session's lesson): garbled/truncated on-screen echo during a large heredoc or Python patch script paste is not, by itself, evidence of a problem. The script's own printed success message (which only prints after every assert has passed) plus a clean npx tsc --noEmit run are the real signals to trust.
- Tax Summary scope decision (earlier session): Built with loan-late-fees-only for "interest & fees," clearly labeled in-app as a limitation, rather than waiting on a data-model change. This matches the project's general pattern of shipping a clearly-labeled partial feature over blocking on a larger prerequisite.
- Payment Methods report deferred (earlier session): The person chose to explicitly defer this rather than do the minimum data-model change to unblock it now. Next time this is picked up, it should be scoped as its own checkpoint (data model field + real Cash/Debit/Credit picker UI on payment-logging screens + manual transaction form), not just "one more report file."
- Checkpoint tracking discipline (reconfirmed): Every session ends with a full PROGRESS.md rewrite reflecting exactly what was verified via terminal output and confirmed working on-device — not just a note appended to the old version.
- File-creation discipline (reconfirmed): Files are created via cat > filename << 'ENDOFFILE'. Existence is checked first before creating. Editing existing files uses targeted sed for small changes, or a python3 - << 'ENDOFFILE' exact-match script for multi-line/whitespace-sensitive edits, using line-by-line anchor matching rather than whole-block matching.
- New-screen/new-logic wiring discipline (reconfirmed): A new feature isn't "done" until it's fully wired into its real data flow AND confirmed visible/working on a real device — all of this was completed this session for Events' savings-goal sync, matching how Travel and Tax Summary were both closed out in prior sessions.

▶️ Next step

Phase 8 is now genuinely fully complete (Events' savings-goal sync closes the last gap). Recommended order for next session — ask the person which to tackle first:

1. Phase 9 — Shared Expenses / Household Linking (M3, M11) — the biggest remaining phase, flagged as the hardest technical part of the whole project, and still deferred pending revisiting the Phase 0.1 sync decision.
2. Rest of Phase 11 (Settings): 11.1 (Categories, Payees, Rules) and 11.3 (Security & Household & Data) haven't been started yet.
3. Payment Methods report — as its own checkpoint, starting with the data-model decision (add paymentMethod to BillCycle/Debt cycles/LoanPayment/ManualTransaction) and a real picker UI, THEN the report itself.
4. Loans still aren't included in the Dashboard's "Amount Owed" or "Due Soon" cards, or in the Calendar's/Cash-Flow Forecast's running-balance projection — matching balanceProjection.ts's own pre-existing limitation. Worth a dedicated checkpoint later to add loan due-dates into that projection everywhere it's used.
5. Smaller loose ends still flagged from earlier sessions: EF/FI calculators still don't auto-pull figures from Bills/Income; Custom recurrence math isn't implemented in recurrence.ts yet (Bills/Debts/Loans data model supports it, but due-date calculation doesn't); neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target).

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types. UPDATED this session: EventItem now has trackInSavings?/savingsGoalId? fields, matching TravelTrip. Still no paymentMethod or feesPortion fields anywhere — see Phase 10.2 notes above.
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
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync (tripFullChecklistTotal, syncTripSavingsGoal), confirmed working on a real phone in an earlier session.
  - mobile-app/src/screens/EventsScreen.tsx — UPDATED this session: real savings-goal auto-sync (syncEventSavingsGoal), mirroring TravelScreen.tsx's pattern, confirmed working on a real phone (all 6 verification steps passed). See dated session entry above.
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
