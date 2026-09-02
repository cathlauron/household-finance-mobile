# Emulator Testing Checklist — Household Finance App

Test everything below on the Android Studio emulator BEFORE moving to a real device.
Check off each item as it's confirmed working. Anything broken, note it under
"Issues found" at the bottom with a short description.

## 0. ⚠️ Known blocking issue (fix before anything else can be tested)
- [ ] Account creation fails on the emulator: "Something went wrong creating your
      account. Check your internet connection and try again." — happens even
      though the app successfully connected to the local Firebase emulator earlier.
      Nothing past this point can be tested until this is fixed.

## 1. Account creation & sign-in
- [ ] Create profile: valid email + username + password + confirm password succeeds
- [ ] Create profile: mismatched password/confirm shows an error, doesn't submit
- [ ] Create profile: password under 6 characters is rejected with a clear message
- [ ] Create profile: duplicate/already-used email is rejected with a clear message
- [ ] Create profile: duplicate/already-used username is rejected with a clear message
- [ ] Sign in: correct username + password succeeds
- [ ] Sign in: wrong password shows a clear error, doesn't crash
- [ ] Sign in: unknown username shows a clear error, doesn't crash
- [ ] Eye icon (show/hide password) works on: sign-in, create-profile (both fields),
      change-password (all fields)
- [ ] Sign out works and returns to the sign-in screen

## 2. PIN quick-unlock & auto-lock
- [ ] Can set up a PIN from Settings > Security
- [ ] App locks after backgrounding/minimizing, PIN screen shows on return
- [ ] Correct PIN unlocks the app
- [ ] Wrong PIN is rejected, doesn't unlock
- [ ] Auto-lock timer options (1/5/15/30 min) are selectable
- [ ] Changing the auto-lock timer takes effect without restarting the app
- [ ] Can remove/disable the PIN

## 3. Change passphrase
- [ ] Changing passphrase with the correct current passphrase succeeds
- [ ] Wrong current passphrase is rejected
- [ ] New passphrase + confirm mismatch is rejected
- [ ] After changing, sign out and sign back in with the NEW passphrase — succeeds
- [ ] Old passphrase no longer works after the change

## 4. Household linking
- [ ] "Start linking" generates a code and shows it on screen
- [ ] Code correctly expires after 15 minutes (or however it's currently configured)
- [ ] "Start over" / regenerate code has a cooldown before it can be used again
- [ ] Joining with a valid code works
- [ ] Joining with an expired/invalid code shows a clear error
- [ ] First-time link (2 people, no prior data): "Keep mine / Keep theirs / Merge"
      choice appears and each option works correctly
- [ ] Joining an existing household (3rd+ person): correct 2-choice dialog appears
      ("Keep household data" / "Merge mine in") — NOT the 3-choice one
- [ ] Linking completes automatically on both phones without a manual "finish" step
- [ ] "X of 5 linked" member count badge shows and updates correctly
- [ ] Household full (5 members) blocks a 6th person from joining, with a clear message
- [ ] Member roster shows everyone's name, "You" label, and "Owner" label correctly
- [ ] Owner can remove another member
- [ ] Non-owner member can only remove themselves (unlink), not others
- [ ] Owner leaving a 2+ person household shows a successor picker
- [ ] Owner leaving a 2-person household skips the picker (goes straight to dissolve)
- [ ] Last remaining member unlinking/leaving dissolves the household back to a
      normal personal profile (not stuck, not an orphaned empty household)
- [ ] Data really is shared correctly between two linked accounts (add something on
      one device, confirm it shows up on the other)

## 5. Home tab
- [ ] Total balance / net worth hero stats display correctly
- [ ] Quick-action buttons (Calendar / Transactions / To-Pay) navigate correctly
- [ ] "Due soon" section shows upcoming bills/debts/loans correctly
- [ ] "This month" income/expenses figures are correct
- [ ] Recent activity list shows latest transactions and is tappable-free (info only)

## 6. Calendar tab
- [ ] Month grid shows correct days/events for the current month
- [ ] Previous/next month navigation works
- [ ] Swiping left/right on the calendar changes months (if on a touch device)
- [ ] Tapping a day opens the day detail (agenda) view
- [ ] Quick-add from a day works (bill/debt/loan)
- [ ] Balance summary cards (Cash/Debit/Credit) show and can be expanded
- [ ] Eye icon (show/hide balance) works
- [ ] "Other assets" section (investments/property/vehicles) expands/collapses
- [ ] "Balance as of" date picker works and updates the running projection
- [ ] Quick Add (+) floating button opens the transaction form
- [ ] Legend/color coding matches what's shown on the calendar

## 7. Accounts tab
- [ ] Add a Debit account — saves correctly
- [ ] Add/edit the single Cash account — saves correctly
- [ ] Add a Credit card — saves correctly, appears in Debts too
- [ ] Withdraw cash from a debit account — balance updates correctly
- [ ] Log cash directly — balance updates correctly
- [ ] Transfer between two debit accounts — both balances update correctly
- [ ] Scheduled/recurring transfers can be created and "Log now" works
- [ ] Editing an account's starting balance updates the computed balance
- [ ] Deleting an account works and removes it everywhere it was shown

## 8. Transactions tab
- [ ] Add a manual transaction (money out/in/savings) — appears in the list
- [ ] Edit an existing manual transaction — changes save
- [ ] Delete a manual transaction — removed from the list
- [ ] Sort options (newest/oldest/highest/lowest amount) work
- [ ] Filter by type, owner, month, tag all work
- [ ] Date range filter works
- [ ] Hide/unhide a derived transaction (bill/debt/etc.) works
- [ ] "Delete completely" on a derived transaction actually reverses it at the source
- [ ] Bulk select mode: select multiple, apply a tag, works
- [ ] Bulk delete works and asks for confirmation first
- [ ] CSV export downloads/produces a file
- [ ] CSV import: file picker works, column mapping screen appears
- [ ] CSV import: duplicate detection flags likely-duplicate rows correctly
- [ ] CSV import: confirming import adds the transactions correctly
- [ ] Templates: saving a transaction as a template works
- [ ] Templates: one-tap re-use of a saved template works
- [ ] Attachments: adding a photo/PDF to a transaction works
- [ ] Attachments: viewing an attached photo/PDF works

## 9. To-Pay: Bills
- [ ] Add a new bill (all recurrence types: monthly/annual/one-time/custom) — saves
- [ ] Edit an existing bill — changes save
- [ ] Delete a bill — removed from the list
- [ ] Logging a payment cycle (mark paid, partial payment) works
- [ ] Payment method (cash/debit/credit) picker on a bill payment works
- [ ] Sort and filter (category, owner, date range) work
- [ ] Due-soon badge/highlighting shows correctly

## 10. To-Pay: Debts
- [ ] Add a new debt (all recurrence types, incl. one-time simplified paid toggle)
- [ ] Edit/delete a debt works
- [ ] Logging a payment cycle works
- [ ] Manual-balance vs Auto-cycle mode both work correctly for monthly debts
- [ ] "Pay minimum" / "Pay in full" quick actions work
- [ ] Payoff Simulator: Snowball vs Avalanche both compute and display correctly
- [ ] Consolidation What-If: selecting debts and entering new-loan terms computes
      a correct before/after comparison

## 11. To-Pay: Loans
- [ ] Add a new loan (Borrowed and Lent directions both) — saves
- [ ] Edit/delete a loan works
- [ ] Logging an actual payment works, late-fee detection works correctly
- [ ] Amortization preview computes and displays correctly
- [ ] Custom recurrence works correctly (confirmed fixed this phase — retest anyway)

## 12. Income
- [ ] Add an income source (all frequency types) — saves
- [ ] Edit/delete an income source works
- [ ] Logging an actual payday (payment log) works
- [ ] Destination account routing (which debit account payday goes to) works
- [ ] Sort/filter (person, category, date range) work
- [ ] Payday tolerance-window setting works as expected

## 13. Savings
- [ ] Add a savings goal — saves
- [ ] Logging a contribution updates the goal's progress correctly
- [ ] Emergency Fund calculator: auto-suggested figures appear, overrides work
- [ ] FI Calculator: auto-suggested figures (including the new income baseline)
      appear correctly, overrides work, projection computes correctly

## 14. Insights: Dashboard
- [ ] Every enabled widget renders without errors
- [ ] "Customize" lets you show/hide and reorder widgets, and it saves
- [ ] Category budgets: add one, spend tracking against it updates correctly
- [ ] Envelope budgets: add one, rollover mode (reset vs carry) works correctly
- [ ] Export (CSV / PDF / Both) works
- [ ] Print preview opens and looks correct

## 15. Insights: Reports
- [ ] Weekly Digest: week navigation and figures are correct
- [ ] Monthly Close-out: month navigation and figures are correct
- [ ] Year in Review: year navigation and figures are correct
- [ ] Financial Health snapshot: factors display sensible statuses
- [ ] Tax Summary: year navigation, figures, and CSV export all work
- [ ] Cash-Flow Forecast: 30/60/90-day toggle and chart work
- [ ] Subscription Audit: sort toggle and price-change detection work
- [ ] Merchant Spending: sort toggle and grouping work correctly
- [ ] Person Spending: per-person breakdown is correct
- [ ] Payment Methods: Cash/Debit/Credit breakdown is correct

## 16. Planning: Groceries
- [ ] Grocery List: add/edit/delete items, mark purchased, works
- [ ] Sort by store & aisle works
- [ ] Calculator: running tally add/remove works, "add all to list" works
- [ ] Meal Ideas: add a meal, add ingredients, auto-budget from ingredients works
- [ ] "Add ingredients to grocery list" from a meal idea works

## 17. Planning: Travel
- [ ] Add/edit/delete a trip works
- [ ] Checklist items: add/edit/delete/check-off work
- [ ] Sub-checklist items work
- [ ] Budget auto-syncs from checklist costs correctly
- [ ] "Auto-saving to Savings tab" toggle creates/updates a matching savings goal

## 18. Planning: Events
- [ ] Add/edit/delete an event works (Birthday/Anniversary/Other, all recurrences)
- [ ] Checklist items work, each logs its own transaction when checked off with a cost
- [ ] Marking an event completed logs the correct expense
- [ ] Custom-recurring events correctly auto-complete once occurrences run out

## 19. Planning: Year-End Goals
- [ ] Add/edit/delete a goal works in both modes (track-progress / checklist)
- [ ] Progress bar and percentage update correctly
- [ ] Year banner summary is correct

## 20. Planning: Shared Expenses
- [ ] Add a shared expense, split evenly — saves and computes correctly
- [ ] Add a shared expense, custom split — saves and computes correctly
- [ ] Balances (who owes whom) computes correctly across multiple entries
- [ ] Settle-up form works and correctly reduces the outstanding balance

## 21. Settings
- [ ] Profile & Personalization: vault name, currency, theme, color mode, font
      size/family, bold/italic all save and apply immediately
- [ ] Exchange rates: entering a rate for a foreign-currency account works
- [ ] Money color overrides work
- [ ] Notifications: alert-window days setting saves; browser push toggle works
- [ ] Layout & Navigation: switching between Bottom Nav / Top Menu / Sidebar /
      Scrollable Tabs all work correctly
- [ ] Swipe-to-delete toggle works
- [ ] Calendar balance-line visibility toggles work
- [ ] Categories: add/edit/delete/recolor a category works; parent/subcategory works
- [ ] Merchants & Payees: add/edit/delete works; default category works
- [ ] Categorization Rules: add/edit/delete/reorder works; auto-fill on a new
      transaction actually applies correctly
- [ ] Envelope Budgeting: add/edit/delete an envelope works; spend tracking and
      rollover both compute correctly
- [ ] Security: change passphrase (see section 3), PIN setup (see section 2)
- [ ] Household & Data: opens the backup/link panel correctly (see section 4 for
      linking-specific items)
- [ ] Backup: "Copy backup" and "Download .json" both work
- [ ] Restore: pasting valid backup JSON and confirming replaces data correctly
- [ ] Restore: invalid/garbled JSON shows a clear error, doesn't crash
- [ ] Clear all data: confirmation dialog appears, clearing actually empties
      everything but keeps the same username/passphrase
- [ ] Help & FAQ: all questions expand/collapse correctly
- [ ] Desktop/Mobile capability toggle switches content correctly

## 22. App-wide / cross-cutting
- [ ] Dark mode / light mode / device-follows-system all work correctly
- [ ] Every named theme applies correctly across every screen
- [ ] Currency symbol updates everywhere after changing currency
- [ ] Global search finds results across Bills/Debts/Loans/Events/Transactions
- [ ] Notification bell badge count matches what's actually due
- [ ] No crashes when rapidly switching between tabs
- [ ] App correctly returns to where you were after backgrounding and returning
      (without a PIN lock triggering, if within the auto-lock window)

## Issues found (fill in as you go)
- [ ] Issue:
      Screen/section:
      Steps to reproduce:
