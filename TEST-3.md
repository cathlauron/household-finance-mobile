# Version 3 test list

Test on the `v3` branch (PowerShell):

    cd C:\Projects\household-finance-mobile
    git checkout v3
    git pull
    cd mobile-app
    npx expo start -c

Everything in TEST-2.1.md is in version 3 too. These are the version 3 extras.

## 0. The new start (no account until the first money entry)
1. Sign-in screen › "Create a new account": three Welcome screens (swipe or Next), Skip top-right.
2. Four questions: name, what you want help with, the look (Light / Dark / Like my phone, falling leaves, mood colours), whether others use your phone. "See my Home".
3. Home opens with no account. Settings or Profile shows "Save Finance Flow first".
4. Add a ₱50 transaction: "Keep your first entry safe" sheet. Continue with email › finish sign-up (use a username starting with "test"): the ₱50 entry is in the new account.
5. "Not now" instead keeps it on screen only.

## 1. Hide amounts (H1b, H2b)
1. Home: an eye sits next to "Left to spend". Tap it: the amount shows ₱ *****, and so do "of ₱…", the other two card pages, the slim bar when you scroll, and every card in the Accounts stack.
2. Close the app fully and reopen: amounts are still hidden. Tap the eye again: they come back.

## 2. Welcome back (H3b)
The card shows after 3 or more days away. To test now: on a test account, Settings › About & Help › "Test: pretend I was away 6 days", then close the app fully and open it again.
1. It sits between Left to Spend and Accounts: "Welcome back", good news first (a payday, a bill paid, money saved while you were away), then "N days to catch up. No rush, nothing is lost."
2. Quick catch-up: lists paydays that were due while away (Came in logs it into the payday's usual account) and bills that came due (tap one to pay it).
3. Everything: opens Transactions.
4. I'll estimate the rest: enter a rough amount and the account, Add: one "Spending while away (dates)" line appears in Transactions, category Other.
5. ✕ closes it for this visit.

## 3. Running low (H4b)
1. When Left to Spend is Running low (orange) or Overspent (red), a card under it says "Running low until payday (date)" and "N ways to free up ₱X".
2. Ways come from savings pots (emergency pot last), money you lent, and refunds you're waiting for. Use opens the pot's Move out sheet; the others open the loan or the transaction. Nothing moves by itself.
3. ✕ hides it until tomorrow.
4. Settings › Budgeting › "Heads-up when money gets tight": off hides the card; on brings it back.

## 4. Credit cards (K1c, K4, K5)
1. Open a credit card's page (from Home or Accounts; from Accounts the back button says Accounts). The card says "Available to use".
2. The first time, "One quick question about (card)": pick "What I can still use" or "What I owe", type the limit, Save.
   - What I can still use: the number stays the same.
   - What I owe: the card now shows the limit minus that number as "Available to use".
   - Ask me later hides it until you open the page again.
3. After that, "Credit card" shows Limit, You owe, Next statement and Pay. Details sets the limit, the statement due day and the minimum; the due date and minimum then show under Next statement.
4. Pay opens Pay card with the card under To. Paying more than you owe isn't allowed.
5. New transaction, money out, Paid with a credit card: "Split into payments" with No / 3 / 6 / 12 appears (not for cash or debit). Pick 6 on ₱7,500: "₱1,250.00 a month for 6 months on (card). Your spending counts the whole amount today." Add it: the card page shows "Installments: (name) · 6 of 6 left · ₱1,250.00 a month".

## 5. From the 2.2 build notes (2026-10-27). NOT YET TESTED.
1. Calendar, Oct 30 (or any day): every bill and debt due that day shows, the same ones the
   Bills and Debts pages say are due then (also the one that was missing). Home's Due soon
   shows it too. Left to Spend may go down by that debt's amount: it was missing there too.
2. A bill or debt due on the 31st shows on Nov 30 / Feb 28 in the calendar.
3. Loans: the loan you pay every 16th says "next Oct 16" (with Overdue, as Oct 16 hasn't
   been logged yet). Log the Oct 16 payment: it then says "next Nov 16" and the Overdue
   tag goes. The loan's own page says the same.
4. Any form: hold the big amount at the top (₱0.00): Paste appears; paste "₱1,500.50": it
   shows ₱1,500.50. Also works in the smaller amount boxes.
5. A bill and a debt with a Note: their page shows a Note section with it. A payment made
   with a note shows it in that payment's History line.

## 6. Trip page, form rows, Plan swipe (2026-10-27). NOT YET TESTED.
1. Open BKK (empty checklist): under the Savings switch you see CHECKLIST, "What will it
   cost?" and the "Add an item" row. Add an item there: it appears; the page grows.
2. Edit trip: "Dates (optional)" sits on one line on the left; a long date range is cut
   with "…" on the right if it doesn't fit. Check a few other forms with long values.
3. Savings, Yearly Goals, Shared Expenses, Groceries, Travel, Events: swiping sideways never
   takes you back to Plan. The back arrow (and your phone's back) still do.

## 7. Regular payments, transfers, support (2026-10-27). NOT YET TESTED.
1. To-Pay > + > New bill: under Bill / Debt / Loan there's "Bill | Regular payment". Pick
   Regular payment: the title says "New regular payment". Add "For Mama", ₱5,000, every
   1st. Bills now has a "Regular payments" section with it; the card on top says
   "Bills ₱… · regular payments ₱…". Left to Spend counts it; the calendar shows it as
   "Regular payment".
2. Open it: the button says Send. Send it: it shows under "Paid and sent this month" as Sent.
3. Move money between two accounts with a note: Transactions shows "Moved: Cash → BDO"
   in grey with the note; In / Out at the top don't change. Tap it: its page shows from,
   to, date, fee and note.
4. Settings > About & Help > Contact support: your email app opens to
   support.financeflow00@gmail.com with "Finance Flow (version) (Android)" as the subject.
   Copy email address: "Copied".

## 8. One payment sheet (canvas R4, 2026-10-27). NOT YET TESTED.
1. A loan > Pay: change the amount (e.g. ₱4,800) and add a ₱25 fee > Pay: History shows
   ₱4,800 "· fee ₱25.00"; Transactions shows the payment and "Fee: (loan)" under Fees;
   the account went down by ₱4,825.
2. Same on a bill and a debt (debts still have "Late fee added by your lender", which is
   added to what you owe next, as before).
3. Just record it: on a loan (or bill / debt), switch to "Just record it", pick a past date,
   Save: no account asked for; History shows "· recorded only"; no account balance changes;
   nothing new in Transactions; the next payment moves on.
4. A trip item: tick it: the same sheet (amount can be changed: the item's cost becomes what
   you paid). "Just record it" keeps it as Paid in the trip's budget, no spending.
