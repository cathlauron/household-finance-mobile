# Finance Flow bug log

Every bug Cath has reported, where it lives in the code, and whether an automatic check
guards it so it can't come back silently. Started 2026-10-22 from the notes left in the code
("Cath: ..." comments), TEST-2.1.md / TEST-2.2.md and the PROGRESS logs. Add a row for every
new bug (see `.claude/skills/finance-flow-bug-check/SKILL.md`).

**Guard** = the automatic check that fails if this bug comes back:
- a file + check name: guarded (proven red-green when it was written, from 2026-10-22 on)
- `logic (partly)`: an older check in `mobile-app/tests` covers the calculation, written
  before red-green proof was required
- `none yet`: nothing guards it; only Cath's phone would notice. Turning these into guards
  is ongoing work, most important first.
- `phone only`: can't be checked automatically (feel, speed, real phone features)

Status: **phone-confirmed** = Cath confirmed it on her phone (TEST-2.2 sections A-O,
TEST-2.1). All rows below were phone-confirmed fixed unless the status says otherwise.

## Bugs Cath reported

| id | What Cath saw | Where (file) | Guard |
|---|---|---|---|
| B-001 | Holding a Home card and moving it froze after a few seconds | homeScrollLock.ts | phone only |
| B-002 | A held card dragged to the top or bottom of the screen should scroll the page | homeScrollLock.ts | phone only |
| B-003 | "Scan to join" said "Allow the camera" but no pop-up came | components/HouseholdLinkWays.tsx | phone only |
| B-004 | After adding a bill she had to scroll down to find it | components/ArrivalGlow.tsx, arrivalFocus.ts | none yet |
| B-005 | Debts, Loans, Plan, FI didn't bounce at the ends like Bills | components/KeyboardAwareScrollView.tsx | phone only |
| B-006 | Switching Bill / Debt / Loan closed the sheet and opened it again | components/BottomSheet.tsx | none yet |
| B-007 | Switching Bill / Debt / Loan jumped to the other list | screens/BillsScreen.tsx, DebtsScreen.tsx, LoansScreen.tsx | none yet |
| B-008 | + on Home lagged | navigation/MainTabs.tsx, screens/TransactionsScreen.tsx | phone only |
| B-009 | After Add, the form slid away while Transactions was already showing (a flash) | navigation/MainTabs.tsx | none yet |
| B-010 | Swipe-to-delete opened when she meant to change screens (swipe-to-delete later removed at her request) | navigation/swipeTabs.tsx, components/SwipeableRow.tsx | none yet |
| B-011 | Going back from Accounts > Income > a person "looked buggy" (empty moment, then pop) | navigation/RootStack.tsx | phone only |
| B-012 | After + in the calendar, going back and reopening showed the calendar behind Home | navigation/RootStack.tsx | none yet |
| B-013 | Scrolling the months closed the calendar | navigation/RootStack.tsx | none yet |
| B-014 | Screens flash and go back; forms flashing; Edit on a debt opened and closed again; a form still opened by itself when tapping something | afterSlide.ts, navigation/TabPage.tsx, handledOpen.ts | none yet |
| B-015 | The invite sent through Messenger had no link | joinLink.ts | none yet |
| B-016 | An invite code stayed on Household long after its 15 minutes | storage.ts, screens/ProfileScreen.tsx | none yet |
| B-017 | The inviter stayed on "Almost there…" for minutes | screens/ProfileScreen.tsx, linking.ts | none yet |
| B-018 | Light/dark switch lagged; 2.1's was smoother | ThemeContext.tsx, screens/HomeScreen.tsx | phone only |
| B-019 | Tapping Add lagged; Save/Add lagged; a trip took seconds to save; the form waited with a spinner | DataContext.tsx | phone only |
| B-020 | Card animations lagged | DataContext.tsx | phone only |
| B-021 | Typing an amount lagged | screens/TransactionsScreen.tsx | phone only |
| B-022 | Budget / To-do on a trip didn't swipe | screens/TravelScreen.tsx | none yet |
| B-023 | No Overdue tag on a debt past its due date | screens/DebtsScreen.tsx, overdue.ts | logic (partly): sanitizeIds "overdue items" |
| B-024 | Opening: everything appeared at once and the loader was gone; the opening animation froze; then "too fast, then stuck on Almost there" | screens/IntroScreen.tsx | phone only |
| B-025 | Calendar year view started at Oct 2024 with empty months before it | screens/CalendarScreen.tsx | none yet |
| B-026 | The picked calendar day showed a square on Android | screens/CalendarScreen.tsx | phone only |
| B-027 | Calendar years showed blank while scrolling | screens/CalendarScreen.tsx | phone only |
| B-028 | Adding from the calendar jumped to the other screen before she'd added it | screens/CalendarScreen.tsx | none yet |
| B-029 | Reports "Customize" checklist didn't show several picks at once (old Bug #14) | screens/InsightsScreen.tsx / reports | none yet |
| B-030 | FI calculator largely not working (old Bug #4) | screens/SavingsScreen.tsx, fiScenario.ts | none yet |
| B-031 | Emergency fund calculator (old Bugs #5 / #5b) | screens/SavingsScreen.tsx | none yet |
| B-032 | Deleting while offline hung (old Bug #1) | netTimeout.ts, deleteRecords.ts | logic (partly): deleteRecords |
| B-033 | Left to Spend "caution" level didn't stay saved | balanceProjection.ts, Settings | none yet |
| B-034 | Two phones saving close together could lose one person's change (RISK 3) | merge3.ts, DataContext.tsx | logic (partly): merge3 (12 checks) |
| B-035 | Paying a bill / debt: amounts, carry-over, undo, paying twice | billPayments.ts, recurrence.ts | logic (partly): money |
| B-036 | Bill due dates on the 31st, "last day", yearly, past this month | recurrence.ts | logic (partly): money |
| B-037 | Loan schedule: missed payments, "which payment was this" | loanSchedule.ts | logic (partly): loanSchedule |
| B-038 | Trip items ticked as paid, "take it off my balance", unticking | trip payment code | logic (partly): paymentPlacement, travelChecklist |
| B-039 | Who logged / changed it (stamps) | whoStamp code | logic (partly): whoStamp |
| B-040 | Recovery key dashes, email format, email typo suggestions | typing helpers | logic (partly): typingHelpers |

## Still open (not fixed yet)

The full, current list lives in PROGRESS7.md, "Known issues / gotchas — still open"
(additive log, on `main`). The bug hunt (BUG-HUNT.md) re-checks each one against the real
code and records here whether it is still real.
