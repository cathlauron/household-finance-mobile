Finance Flow 2.2.0 — complete phone test list (on the real build)
=================================================================

Made 2026-10-27 from TEST-2.2.md: every check NOT yet confirmed on Cath's phone, in one
pass, grouped by screen. Already passed (not repeated here): A-N (except the build items
below), Z, AB, AC, AG (except AG4/AG5), AH, AI, AJ, AK. Out-of-date steps were dropped or
reworded (dark mode is now instant; past Loans now goes to Plan; Salary with no income
now goes straight to adding one; rows no longer swipe to delete).

How to report: "device test is as described", or the IDs that failed + what you saw
(screenshot or a short screen recording in Downloads is perfect).

1. First open (after installing the build)
- I12 The first sign-in, PIN unlock and household linking take a few seconds, not 10-30.
- AO1 No red error at any point ("Interpolation property 'easing'...").
- AN1 (new phone / Clear all only) Welcome > set-up: each Continue slides the next step in
      from the right, Back slides it away; "See my Home": set-up fades out, Home fades in.
- AN2 Lock and unlock: locking is instant; unlocking fades Home in.
- AP2 Right after opening, tap around straight away: no short freeze.
- AG5 Leave the app open in the background overnight (no lock); in the morning Home's
      date, days to payday and "due" labels are today's.

2. Home
- AF1 / AN6 Moon/sun: the whole page changes in the same moment, no fade; other tabs
      already changed when you go to them. Same from Settings > Appearance.
- W2  + on Home: New transaction slides up over Home at once. Add: "Added", then
      Transactions shows the new entry glowing. Cancel: you stay on Home.
- AP3 After that Add, the slide to Transactions is smooth (no stutter).
- AM8 Add a ₱100 test transaction: Left to Spend counts down quickly to the new amount;
      delete it: it counts back up.
- W7 / AA6 Hold a Home card and move it slowly up and down, also to the very top/bottom:
      it stays under your finger, the page scrolls along at the edges, it drops in place.
- U6 / V5 Flip a card, within 3 s drag a card / go add a transaction elsewhere: smooth,
      and after closing and reopening the app the card order AND the transaction are kept.
- V4  Scroll down past the Left to Spend card and back: the slim bar comes and goes.
- AN9 Open the + form, Cancel, tap the bell straight away: its pop-up opens. Tap the bell
      right after Home appears: it opens.

3. Swiping between the main tabs
- AN3 / AP1 Swipe slowly from the middle of each tab, both ways: the next tab comes in
      beside it WITH your finger (never empty, never lagging, even right after saving),
      nothing overlaps or jumps when you let go; past Home or Plan it springs back.
- AO6 To-Pay > Loans, drag left: Plan comes in with your finger. On Bills, drag right:
      Transactions comes in. The bottom tab bar also changes tabs when you swipe on it.
- (new) Swipe sideways on the Left to Spend card: it changes the card, never the tab.

4. Transactions
- AO4 With NO accounts yet: + takes you to "Add an account" first; after saving it you're
      back in New transaction with that account picked.
- AO5 With NO income yet: Money in > Salary goes to adding a salary; after saving you're
      back in the transaction with that salary picked (amount/account you typed kept).
- AP4 With your full history: the tab opens smoothly; scroll to the bottom: all the old
      days are there. Change Newest/Oldest or a filter: smooth.
- AG6 Tap Add twice very quickly: only ONE is added.
- AN8 Search: drops down smoothly (tell Claude if the tab bar fades a moment later).
- AE3 Rows from bills/debts/loans still swipe to "View"; no red trash button anywhere.

5. To-Pay
- AO3 Bills / Debts / Loans = one grey bar, ONE white pill behind the chosen word, plain
      words, no boxes or shadows around each word (your mockup). The pill glides when you
      tap. Same look on Events, Groceries, Savings, Travel and in the + forms.
- AM1 Slowly drag the list left: Debts comes in with your finger and the pill moves along;
      past a quarter it settles on Debts, earlier it slides back.
- AM3 Tap Bills / Debts / Loans: the page slides there and the pill glides.
- AN4 / AE1 / AA1 / Y1 + > New bill, type an amount and name, tap Debt, Loan, Bill: same
      pop-up, the pill glides, fields fade out and in, the top of the pop-up glides to its
      new height; your amount, name and the keyboard stay.
- AA2 / AM10 Add from the switched form (e.g. a Debt): "Added", To-Pay shows Debts, the
      new one slides in, glows, and the list scrolls to it. Y2: Cancel after switching =
      still on your list, nothing added.
- AA3 Add a bill that lands further down: the list scrolls to it and it glows (same on
      Debts, Loans, Transactions).
- V1 / V2 Add a bill and pay one: the form closes and the list updates without a pause;
      Home and Transactions already show it.
- W8 / AE2 New bill: no "Subscription" category (use the switch); no line between the
      Subscription switch and its example text.

6. Calendar
- AO7 Home > calendar > + > Bill (then also Transaction, Debt, Loan) > fill in > Add: the
      form and calendar leave together and you land on that list with it glowing. Then
      open a Plan page: no Home behind it (see AO2).
- X2 / X3 + shows "Add on <day>"; pick a day, then Bill: Due on that day (same for the
      others). Cancel closes it and you stay on the calendar.
- AE4 Calendar > + > Cancel > back > open again > close: Home looks normal.
- AP5 It opens straight in the layout you chose last time.
- W5 / W6 / Y3 Year view: fling 2021 to 2031 and back: every year drawn; today circled;
      tapping a month opens it.
- V6 Due soon, overdue tags and calendar amounts agree; past midnight they update.

7. Plan pages
- AO2 Savings, Yearly Goals, Shared Expenses, Groceries, Travel, Events (each, then back):
      only Plan and the page move side by side; NO Home or second tab bar behind them.
      Best tested right after a calendar add or a search. Same from Home > Accounts, a
      card, Income, Settings.
- AM5 Savings (Pots/Emergency/FI), Groceries (List/Calculator/Meal ideas), Events
      (Upcoming/Done): pages follow your finger, bounce at the ends.
- AM6 / X1 A trip: swipe Budget / To-do anywhere on the page; what's below moves smoothly.
- AL1 A test trip next year (Apr 2-9) shows "Apr 2 – 9, 2027"; this year's dates show no
      year. Delete it (AL2: it disappears, nothing else changes).
- W9 Pull past the top/bottom on every page: all stretch and spring back like Bills.

8. Forms (any)
- AO8 Needed fields show a red *, the rest a grey "(optional)" (New bill, New transaction,
      New trip, Move money, Settings > New category, sign-in).
- U1 Every pop-up (Cancel, Done, drag down) slides away smoothly, no flicker.
- U2 / U3 Add two things quickly; add one and swipe the app closed at once: all kept.
- U5 Add a bill, within 2 s delete another: the new bill's glow fades on its own.
- AN5 / AM7 New loan I lent / I borrowed: the pill glides, fields fade; the form doesn't slide.
- V3 Typing in bill, debt and loan forms keeps up with your fingers.

9. Settings
- U4 Appearance Light / Dark / Device: the highlight moves at once, colours follow.
- AG7 Budgeting > "Running low" %: clear it and wait 2 s: stays empty; type 20, leave: 20.
- AM9 Phone Settings > Accessibility > Remove animations ON: pages, pill and numbers change
      at once (dragging still follows your finger). Turn it back off.

10. Needs the build, a second phone or the internet
- I11 The invite page's "Open Finance Flow" button opens the app on Household and starts
      joining.
- F7 / G7 Offline banner: swipe it UP or tap ✕ to put it away; sideways swipes don't.
- AG4 With your partner on 2.2: add something on each phone: both see both changes.
