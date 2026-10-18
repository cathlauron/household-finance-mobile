# Finance Flow 2.1 — one combined test list

Do these in order on your phone. For each one, note "OK" or what you saw. If something fails, send a screenshot (or the first line of a red error screen) and the step number.

## Retests after the Oct 18 fixes (do these first)
1. Opening: close the app fully and open it. The logo draws itself, then FINANCE FLOW, the quote, and the small leaf with its bar appear one after another. (The plain green screen before it is the app loading; in Expo Go that part is slower than in the real build.)
2. Log out and sign in: nothing covers the screen. The logo at the top draws itself like the opening (leaf, roof, walls) again and again, the line under "Welcome back" changes ("Signing you in…", "Unlocking your data…"), and the fields fade back. Same on the account list (PIN or fingerprint) and the lock screen.
3. Settings › Quick unlock › PIN: a bottom sheet (Password, New PIN, Confirm PIN, Save at the top right). Saving shows the breathing logo.
4. Settings › Quick unlock › fingerprint switch on: a bottom sheet asks for your password; Turn on shows the breathing logo, then your phone may ask for your fingerprint.
5. Add a bill with only an amount and a name (no due date): it shows on Bills under "No due date".
6. New bill › Every month › pick the 15th: "Which one is due now?" shows the last few months and the next one. Pick an earlier month: it shows as overdue. Mark it paid: the next one is the month after.
7. Bill page › Edit: the bill's edit sheet opens without flashing, and other pages open normally afterwards. Try the same from a card page (Edit card), a pot (Edit) and a transaction (Edit).
8. Travel: under the trip there's Budget | To-do. To-do: add "Pack jackets" (optionally with a date using the calendar icon), tick it, remove one. It saves straight away.
9. Swipe along the bottom tab bar (left or right): it moves between Home, Transactions, To-Pay and Plan from any of them. On To-Pay, swiping the page still changes Bills / Debts / Loans. Tapping the tabs still works.

## 0. Get the build

```powershell
cd C:\Projects\household-finance-mobile
git fetch
git checkout v2.1
git pull
cd mobile-app
npm install
npx expo start -c
```
`npm install` is needed once (new package for the page transitions).

## 1. Loading animations
1. Log out, then sign in again with your password. While it works you should see the house-and-leaf logo gently breathing with a changing line ("Signing you in…", "Unlocking your data…").
2. Settings › Quick unlock: set or change your PIN. Same animation while it saves.
3. Close the app, reopen it, and unlock with your PIN from the account list. Same animation.

## 2. Opens from the phone first
1. Open the app once with internet (your real account). Close it fully.
2. Turn on airplane mode and open the app. It should go straight to Home (not the sign-in screen), with the offline banner.
3. Turn airplane mode off. Within a few seconds the banner goes away and your partner's latest changes appear.

## 3. Offline messages
1. Airplane mode on. Swipe the offline banner sideways: it disappears and a small cloud icon appears at the top right. Tap the cloud: the banner comes back.
2. Still offline, add ₱30 "Offline snack". A light pop-up at the top: "Saved on this phone. It'll sync when you're back online." (only the first time).
3. Airplane mode off. A light pop-up: "Back online. 1 change synced."
4. Airplane mode on. Profile › Household › Join with a code (any code) › Join. A sheet: "Joining a household needs the internet", Try again / Not now. No endless spinning.

## 4. Merge before saving (test accounts)
1. On testc add ₱20 "Merge check". Switch to testd: it's there. Add ₱40 "Second check" on testd. Switch to testc: both are there.
2. On testc, airplane mode on, add ₱30 "Offline snack 2", close the app fully, airplane mode off, open again. "Offline snack 2" is still there and shows on testd.
3. Your own account: add something small, check there's no "Sync Failed", then delete it.

## 5. Log out warning
1. Airplane mode on, add something, then Settings › Log out. The message says some changes haven't reached the household yet. Tap Cancel. Airplane mode off.

## 6. Joining a household
1. Make a new pair (teste / testf). Invite on teste, join on testf: the choices are only "Keep theirs" and "Merge both" (no "Keep mine"). The invite hint says "This phone links by itself once they finish."
2. Switch back to teste: already linked.
3. Optional (the parked one): wait 20 minutes before switching back; it should still link.

## 7. Pay part of a bill and back-dating
1. To-Pay › a bill (e.g. Meralco ₱3,100) › Mark as paid. The sheet shows "Paying the … bill", Pay all / Pay part of it, a Paid on row (Today / Yesterday / Pick a date) and Paid from.
2. Choose Pay part of it, type 1,000. It says "₱2,100 will be added to your next Meralco bill." Pay.
3. The bill page now shows "Paying in parts", New charges ₱3,100 and Carried from last time ₱2,100 (total ₱5,200).
4. Edit the bill: the big amount says "New charges" (₱3,100) with "Plus ₱2,100 carried…" under it.
5. Pay a different bill with Pick a date set to before the date you last updated balances (Accounts). The blue note appears: "Your balances were updated on …". Tick "It isn't included, take it off my balance", pay, and check that account went down.
6. Pick a future date: you can't (it says a payment can't be dated in the future).

## 8. Payday reminder time
1. Settings › Paydays › Remind me at: pick 9:00 PM. The note under it says 9:00 PM.
2. "Pick a time" opens the phone's clock picker.

## 9. Look and feel
1. Every page (Accounts, Savings, To-Pay, Settings…) has the same soft time-of-day glow at the top as Home, without sun rays, rain or stars. Bottom sheets have it too.
2. Opening a page: it slides in from the right over the old one (Paper slide); Back slides it away.
3. Switching tabs: the new tab slides in from the side you're moving to.
4. Calendar opens as a rounded sheet from the bottom.
5. Transactions: the Recurring and Search icons sit on the "Transactions" title line.
6. Profile shows your username without "@", no grey note under Name/Username.

## 9b. Swiping and cards
1. On Home, swipe the page sideways (not on the Left to Spend card or the cards stack): it moves to Transactions; keep swiping to To-Pay and Plan, and back. Tapping the tabs still works.
2. Swiping on the Left to Spend card still turns its pages; swiping the cards stack still changes the front card.
3. To-Pay: swipe between Bills, Debts and Loans. Past Loans it goes on to Plan; before Bills, back to Transactions.
4. Savings: swipe between Pots, Emergency and FI.
5. Accounts: tap a card: it opens the same card page as tapping it on Home. Its "Edit card" opens that card's edit sheet on Accounts. (Long-press a card on Accounts also opens the edit sheet.)
6. Travel: open a trip. Budget | To-do at the top (tap or swipe). Add "Pack jackets" and "Book the bus", tick one, remove one, Save, reopen: they're still there.

## 9c. Credit cards and refunds
1. Home › a debit or cash card › Move money: under "From" there are no credit cards; under "To" there are.
2. Pick a credit card under "To": the title says "Pay card" and the note says it frees up the card's available limit. Move ₱500: the card's available amount goes up by ₱500 and the other account goes down by ₱500.
3. Open a credit card's page: the top-right button says "Pay card" and opens with that card already under "To".
4. A savings pot › Add money: "Take it from" shows no credit cards. Editing a pot's "Kept in" shows no credit cards either.
5. New transaction, money out ₱1,000, turn on "Expecting a refund": the note says "Up to ₱1,000.00, the full amount". Type 1,500: the note turns red. Tap Add: it takes you to Amount back with "A refund can't be more than the ₱1,000.00 paid." Change it to 1,000 (or less): it saves.

## 10. Earlier untested items
1. Forms: tap Add with fields empty on New transaction, bill, debt, loan, income, pot, goal, event, trip and account: each takes you to the first missing field in red (already tested, quick re-check).
2. Storage pieces still only switch on for usernames starting with "test" (Firebase: the test household has a parts folder; your real one doesn't).

When everything is OK: the pieces get switched on for everyone, a Finance Flow 2 build is made, and 2.1 is merged into main as 2.1.0.
