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
5. Make a new money move, open it in Transactions: "Undo this move" puts both balances back
   (and removes its fee entry). Type in a new balance for one of its accounts, then open
   another new move between them: it explains it can't be undone. Older moves say the same.

## 9. Receipts (canvas R1-R3, 2026-10-27). NOT YET TESTED.
1. Plan > Shared expenses > Add: under the form, "Receipt photo (optional)" with "Add photo".
   Pick a photo: a small picture with "Change photo" and "Remove". Tap the picture: it opens
   full size; tap to close. Add: the expense shows a small paperclip in the list. Open it
   again: the photo is still there. Remove + Save: the paperclip is gone.
2. A bill > Pay: "Receipt photo (optional)" at the bottom of the sheet. Add one, Pay:
   History shows a paperclip and "· tap to see the receipt"; tapping the row opens it.
   Undo the payment: the receipt goes with it; the next bill starts with no receipt.
3. Same on a debt and a loan (loan: in "Payments"), and with "Just record it".
4. A trip item with a cost: tick it, add a receipt, Mark paid: a small picture shows next
   to the amount; tap it to see it full size. Untick the item: the picture is gone.
5. If your partner's phone is on the new build too: their phone shows the same receipts
   after a pull-down refresh.

## 10. Loans, Undo wording, alignment, investments (2026-10-27, evening). NOT YET TESTED.
1. Miduri: shows "Overdue ₱7,000.00 was due Oct 16", "next Oct 16" and Log payment ₱7,000.
2. Miduri > Log payment: type ₱3,500: an orange note says it's less than the ₱7,000 due for
   Oct 16 and Oct 16 stays open. Pay it: Oct 16 still shows overdue ₱3,500, the button says
   ₱3,500, the card says "₱3,500.00 toward Oct 16". Pay the ₱3,500: Oct 16 is done.
3. Olive (or any loan): log a payment with a past date: the button says "Undo the Sep 16
   payment" (not "today's"). If an older one is still past due, Log payment stays too.
   A bill paid today for an earlier date says "Paid Oct 1 ..." and "Undo the Oct 1 payment".
4. Look at the pay sheet (bill, debt, loan): one white group (Fees, Paid on, Paid from), the
   receipt row below with "Add photo" on the same line as its label; same width as the
   other sheets. Edit bill / debt / loan and the other forms: every value and arrow ends on
   the same right edge; "Interest (% a year)" on one line; ₱ right next to the amount
   (type ₱24,550 in Edit loan > You pay: all digits show).
5. Shared expense with a receipt: the paperclip is right after its name. Trip page: type an
   item: the Add pill sits on the same line, inside the card.
6. Plan > Investments > Add: Pag-IBIG MP2, put in so far ₱60,000, worth now ₱64,180: the
   page shows Worth ₱64,180, put in ₱60,000, up ₱4,180. Tap it > Add money ₱1,000 From
   Maribank > Save: Maribank goes down ₱1,000; Transactions shows "Invested: Maribank →
   Pag-IBIG MP2" in grey (not in spending). Take out ₱2,000 Into Maribank: Maribank goes
   up ₱2,000. Update value: no account changes. Home's balance never includes the worth.

## 11. Version 3.1 (2026-10-27, night). NOT YET TESTED.
Before testing: publish the new Firebase rules (steps in Claude's message, SEC-1).
1. Settings > About & Help says Version 3.1.0.
2. Invites still work (SEC-1): Household > invite > on the other phone (or "Finance Flow 2")
   join with the code: it joins as before. Then open an invite link on a phone that isn't in
   a household: it first asks "Join Cath's household?" with Not now / Join (SEC-7).
3. Sign out (or switch account): no bill or payday reminders arrive for that account
   afterwards (SEC-2). Signing back in sets them up again.
4. Lock screen PIN (SEC-5): 5 wrong PINs = wait 5 minutes; the next 5 wrong = 15 minutes;
   then 60; after that only the password opens it. The password (or the right PIN) starts
   the waits over.
5. Investments > an investment > Add money ₱1,000 from Maribank, turn "Every month" on > Save:
   To-Pay > Bills > Regular payments shows it for next month (and the calendar). Open it >
   Send: Maribank goes down ₱1,000 once; the investment shows ₱1,000 more; Transactions
   shows "Invested: ..." in grey, not as spending. Undo takes it back out. Add money again
   without the switch: the monthly amount stays as it was. "Stop putting money in every
   month" removes it from To-Pay.
6. A form with typing (e.g. New bill > Name): when the keyboard opens, the sheet glides up
   instead of jumping (and glides back down when it closes). Tell me if it now feels slow
   to make room (it starts once the keyboard is fully up).

## 12. Loans: Custom repeats and past due (H-47 / B-052, 2026-10-29). NOT YET TESTED.

1. To-Pay > Loans: Olive's row says "next Oct 16" (not Nov 16) and its amount is red (past due).
2. Open Olive: "14 of 49 payments made · next Oct 16". Home's bell / past-due list shows
   Olive, Oct 16, ₱24,550.
3. Log Olive's October payment (or just look, if you haven't paid yet): after it, Olive says
   "next Nov 16" and is no longer red.
4. Look around: your other loans still show the next date you expect.

## 13. Batch 2026-10-29 (afternoon). NOT YET TESTED.

1. Transactions, sorted Newest: add a transaction now. It's at the very top. Add a second
   one a few seconds later: that one is now on top. (Sorted Oldest: the exact reverse.)
2. Idle lock: leave the app (home button) for 5 to 6 minutes, come back: "Are you still
   there?" shows with only the seconds that are LEFT (not a fresh minute). Leave it for 7
   minutes or more: the amounts are already hidden when you come back.
3. With your partner's phone (shared household): your partner adds a grocery item, an event,
   a trip to-do, a shared expense and moves money between accounts. On your phone each shows
   "by [name]" (grocery, event, to-do, shared expense) and the transfer's own page says
   "Added by [name]". New goals and new accounts say it too.
4. Plan > Travel > a trip > tap an item > in the form, tap the item's name or cost and change
   it (e.g. add a cost to an item that had none) > Save. The trip shows the new name and cost.
   A paid item's cost change also changes its spending entry.
5. Every Remove asks first now: Edit loan > the x beside a payment; a trip's item x and to-do
   x (on the trip page and in the form); Income > a payday's x; a savings entry's x; Groceries >
   Calculator > a line's x and Clear; a meal's ingredient x; an event item's x; a receipt
   photo's Remove. Each one: Cancel keeps it, Remove removes it.
6. Look around: nothing else looks or moves differently.

## 14. Batch 2026-10-29 (night). NOT YET TESTED.

1. To-Pay > Debts (A2): one card with "Still to pay this month", "No due date" total and
   "Paid this month: X of Y debts". Sections Overdue / This week / Later this month / Coming
   up / No due date. Pay a debt: it shows under "Paid this month" with a Paid tag.
2. Home > Left to Spend > swipe to "Where it comes from": "In your accounts now", then one
   line each (Past due, Bills, Debts, Loans, Groceries list, Trips, Events, ...), and they add
   up to Left to Spend. No "Other changes". Olive's Oct 16 is in Past due until you pay it.
3. Log a loan or bill payment: "Undo ..." shows with "Undo is there for 15 more minutes".
   After 15 minutes it's gone. Tap the payment in Payments / History: "Edit payment" opens
   with the note. Try a lower amount (refused), then a higher one, a different date or
   account, add a receipt > Save. The account's balance follows.
4. Shared > tap a settle-up older than 15 minutes: no Undo, it says to record a payment back.
   Move money older than 15 minutes: no Undo, it says to make a move back.
5. Edit loan > Payments: rows look like the loan page (month, "Paid Aug 16 · Cash", amount),
   newest first; the x only on payments added in the last 15 minutes or not saved yet.
6. Tap Add (or Save) twice very quickly on a new transaction, a move, or any big button:
   it's saved once.
7. Look around: Bills' "Paid this month" rows say "Paid Oct 20" (not 2026-10-20).

## 15. Batch 2026-10-29 (late). NOT YET TESTED.

1. To-Pay > Bills and Debts > "Paid this month": each paid row keeps its layout, with one line
   from the start of the name to the end of the amount, and the row faded (B14). Same on a
   trip's ticked items and on bought groceries.
2. Home > tap the Left to Spend amount (or swipe to "Where it comes from" > See every item):
   the Left to spend page (L4). The card, a "why" line, small bars (You have, Past due, Bills,
   Debts, Loans, Plans), every account, then every item still to go out (past due first).
   Tap an item: its own page opens.
3. Guest mode only: Home's "You picked" hides a step once you've added it (a bill, a debt...).

## 16. Batch 2026-10-29 (evening): E2, D2, F2 + F3. NOT YET TESTED.

1. Dropdowns (E2): in any form (new bill, debt, loan, income, pot, shared expense, investment,
   event, the pay sheet), tap a row with choices (Category, Repeats, Paid from, Type...): a
   list rises from the bottom, the chosen one ticked; tap one and it closes. Date rows still
   open the calendar.
2. New transaction: type "Jollibee" (or a name you've used before): Category is picked for you
   with a "Suggested" tag; change it if it's wrong.
3. Edit loan (D2): "Log a payment" opens the usual pay sheet and saves right away; tap a
   payment: Edit payment opens (receipt, higher amount, date, account). The x shows only in
   the first 15 minutes.
4. Household changes (F2 + F3), needs your partner's phone: your partner adds a transaction,
   pays a bill and edits a trip item. Close Finance Flow on your phone and open it again (or
   come back to it): a banner drops in, "[Name] changed 3 things". Tap it: the list. Tap a
   change: its page opens. Open the app again: the banner doesn't come back for the same
   changes.

## 17. Batch 2026-10-29 (Batch 1+): store basics, Help & FAQ (H1), peel-off switches (K2e). NOT YET TESTED.

1. Settings › About & Help: no "Coming soon". Rows: Contact support, Copy email address,
   Help & FAQ, then "Your data": Privacy policy and Delete account. ("More languages are coming
   later" under Language is gone too.)
2. Help & FAQ: tap a question: the answer opens under it and the rows below glide down; tap
   again: it closes. Type "undo" in Search help: only the undo question is left. Type
   nonsense: "No answers match that". Contact support opens your email app.
3. Privacy policy and Delete account open your browser. They only work after the web pages
   are published (step 6 in the report); before that the browser shows "Page not found".
4. Settings › your profile › Appearance (peel-off switches, K2e). Theme now has two stickers:
   Match my phone (Off) and Dark mode (☀ Light).
   a. Put your finger on the top-right corner of Dark mode and drag slowly down-left: the
      sticker peels, and the whole screen peels from its top-right corner, the dark page
      showing underneath. Let go before halfway: everything settles back, still light.
   b. Drag past halfway and let go (or just tap it once: one steady peel): the app turns
      dark with no flash. The sticker now says ☾ Dark in green.
   c. Peel the green Dark sticker the same way: the light page peels into view; it turns
      light again.
   d. Peel Match my phone on: Dark mode greys out and follows your phone's own setting.
      Peel it off again.
   e. Time-of-day glow, Live weather, Rain animation, Mood colours and Falling leaves peel the
      same way (no screen peel for these). Live weather with location off: it goes back to
      Off and explains why.
   f. While you hold a sticker, the page doesn't scroll.
   g. Phone set to Remove animations / Reduce motion: tapping a sticker turns it on/off at
      once; dragging still follows your finger.
5. Look around: the rest of Settings, Home and the + form are as before.

Needs your phone: the feel of the peel (speed, the curl, the shadow), dragging diagonally
(the hidden browser cancels diagonal touch drags; a phone shouldn't), TalkBack/VoiceOver
reading "Dark mode, switch, off" and a double tap turning it on.

## 18. Release 3.2.0 (2026-10-30). NOT YET TESTED.

First in Expo Go (git pull, npx expo start -c):
1. Settings › your profile › Appearance: Dark mode shows a clean "☀ Light" sticker (no
   "Lark", no pink showing on the right). Peel or tap it: the screen turns dark and the
   sticker shows a clean "☾ Dark". Peel it back: a clean "☀ Light" again. (B-068)
2. Settings › About & Help looks like mockup H1: Help & FAQ with a green "?" tile and a "New"
   tag, Contact support with a blue mail tile, Copy email address; "Your data": Privacy
   policy (grey lock) and Delete account (red, red tile). Version 3.2.0.
3. Delete account opens the web page; it now says what you added to a shared household stays.
Only if 1-3 are as described, make the build (3.2.0) and on the INSTALLED app:
4. Settings › About & Help › Check sign-in speed: send Claude the three times it shows.
5. Repeat 1 on the installed app (the peel on a real build), and check that sign-in,
   fingerprint/PIN and the household still work as before.
6. Quick Unlock, short check (old PROGRESS5 Step 6 list, Cath 2026-10-30), on the installed app:
   a. Close the app fully and open it again: PIN / fingerprint unlock appears and works.
   b. Log out and log back in: your data is all there.
   c. From the other phone (Settings › Account & Security › Active devices), sign this
      phone out: this phone goes to the sign-in screen next time it opens.
   d. Type a wrong PIN 5 times: it stops offering the PIN and asks for your password.
   e. Airplane mode on, open the app: it opens from the phone's copy; airplane mode off:
      your changes sync.
7. Updates: after the build is installed, open the app, close it, open it again: nothing
   changes yet (there is no update yet). This just confirms it opens normally.

## 19. Batch 2 (sent later as an EAS Update to 3.2.0, on v3). NOT YET TESTED.
Test in Expo Go first (from v3), then again once the update reaches the installed 3.2.0 app.
1. Sign in: "Forgot password?" under Sign in opens the warning sheet; Send → "Check your email"; the email arrives and the reset works.
2. Settings top: the "confirm your email" note shows if your email isn't confirmed; "Send link" works; ✕ hides it.
3. Settings › About & Help › Delete account: the page explains what happens (use a TEST account, never your real one).
4. Saving on both phones (yours + partner's, both on 3.2): a change on one shows on the other, both ways. (After both phones report 3.2 the household is saved in the new tamper-checked kind.)
5. Slow connection: "Still saving..." instead of "Sync Failed"; guest: the first item shows before the sheet rises.
K3 (new key after someone leaves) is checked on your computer with the rules test (rules-test folder, needs Java), not on the phone.
