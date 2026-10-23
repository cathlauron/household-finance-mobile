Finance Flow 2.2 — device tests (copied from the "Device tests to do" doc, 2026-10-21)
=====================================================================================

The full checklist lived in a Claude Docs artifact in Cath's first Claude account
(https://claude.ai/artifact/X58irbPXSeBqRi89gUe1j8 — it may not open in another account).
Everything in sections A to N was ticked by Cath on her phone (Expo Go, branch v2.2),
EXCEPT the ones below. Keep adding new sections here (O, P, ...) in later sessions.

Still open (need the real 2.2 build, not Expo Go)
- I11 (build) The invite page's "Open Finance Flow" button opens the app on Household and
  starts joining.
- I12 (build) The first sign-in on a phone, PIN unlock and household linking take a few
  seconds, not 10 to 30.
- F7 / G7 (build) Offline banner: swipe it UP to put it away, or tap the ✕. Sideways swipes
  don't touch it.

Sections, for reference (all passed in Expo Go)
- A  Oct 19 fixes: joining, offline banner, one-card flip, email typo, wrong username,
     recovery-key dashes.
- B  Version 3 pieces: new start, hide amounts, welcome back, running low, credit cards.
- C  2.1 build retests (C1-C19).
- D  Opening words, account list, paid bill / new due date (bills, debts, loans).
- E  2.2 build basics (own category text, debt form, About says 2.2.0).
- F  Oct 20 fixes (opening words, accounts, forms, linking).
- G  Travel trip pages and the offline banner.
- H  New ways to link (send invite, QR, scan, type a code).
- I  Opening speed, saving speed, ticking, Delete at the bottom, trip dates, paid items,
     camera, invite link.
- J  After the safety review: two phones at once, log out while saving, take-off balance,
     re-ticking in the trip form, camera re-check.
- K  Edit flashing, invite code expiry, welcome screens, set-up look, Pay wording.
- L  Overdue debts/loans, priority, over budget, Device, leaves pause, calendar.
- M  Edit opens on the page, calendar list/year/today, Are you still there?, balance updates.
- N  Still there with the screen dark, balance updates, custom repeat for bills and debts,
     swipe-to-delete closing / flick, Edit on transaction/pot/card pages, who logged it.

Not yet tested at all (built 2026-10-21, after section N was written): nothing.

O  2026-10-21 batch (new Claude account): calendar circles, who logged it everywhere,
   mood samples, last 4 digits, leaf cover, new linking screen. PASSED on Cath's phone 2026-10-21.
- O1  Calendar page: today is a soft pale-green circle with a green number. Tap another
      day: a soft pale-grey circle (not black). Tap today: it stays pale green. The month
      name and the day heading under the calendar are lighter and slightly smaller. Year
      view: today is a pale-green circle and the year title is lighter too.
- O2  Add a bill > Due date: the pop-up calendar shows today and the chosen day as soft
      circles (pale green / pale grey), not squares.
- O3  Switch to Dark (Settings > Appearance) and look at O1 and O2 once: still soft, easy
      to read.
- O4  (Needs the other person in your household.) On their phone, add a bill, a debt, a
      loan, a savings pot, an income source and a trip. On your phone: a small letter on
      the bill, debt and loan icons in To-Pay (and Subscriptions); "added by <name>" under
      the pot in Savings; "· by <name>" after the income source and under the trip name.
- O5  On their phone: mark a bill paid, log a loan payment, add money to a pot, log a
      payday and add a trip item. On your phone: the bill's "Paid this month" row has the
      letter; the loan payment, the pot move, the payday and the trip item each say
      "by <name>" (trip item: "added by <name>").
- O6  On your phone, open each of those (bill, debt, loan, pot, trip, and Edit on the
      income source): at the bottom, "Added by <name> · <date, time>". Change something
      and save: "Changed by you · today, <time>" appears.
- O7  Things YOU add never get a letter or "by" on your own phone.
- O8  New account set-up, step 3 "Make it feel like yours": with Mood colours on, a
      "Swipe to see how Home changes" card shows. Swipe it: Running low turns the whole
      screen (Back, switches, dots, leaves) warm orange; Over budget turns it soft rose;
      Plenty left brings back green. Turn Mood colours off: the samples go and the screen
      is green. Step 4 is green again.
- O9  A debit card > Edit: a "Last 4 digits (optional)" box. Type 4821 and Save: Home's
      Wallet front card shows "•••• 4821" at the bottom right, on the balance line; the
      card's own page too. Cards behind the front one don't show it. Cash accounts have
      no box. Typing only 3 numbers and saving says "Type all 4 last digits, or leave it
      empty." Clearing the box and saving removes it from the card.
- O10 Auto-lock off, leave the app untouched 5 minutes, don't answer "Are you still
      there?" for a minute: the cover shows a green leaf on a pale green circle (no 🙈).
- O11 Linking screen (use a NEW empty test account; don't link your real one): Household >
      Type a code (or scan) from your real account's invite. You see both of you with
      what each has, "Merge both" (two-people icon, Suggested, picked) and "Keep <name>'s"
      (one-person icon). Continue opens a sheet with the same icon and what the shared
      household will have. "Go back" closes it and nothing happens.

P  2026-10-21 design-skills batch (taste, Emil Kowalski, Impeccable /polish): app-wide
   polish P1-P4 and the new website (website/index.html). PASSED on Cath's phone 2026-10-21.
- P1  Page titles everywhere (Home, To-Pay, Plan, Settings...) are slightly smaller and
      less heavy, like the calendar's month. Nothing in the app looks extra-bold now.
- P2  Amounts in lists line up digit by digit (look at Transactions and To-Pay).
- P3  Tap any row or button and hold: it squeezes slightly, then springs back when you let
      go. Same feel everywhere (rows, the +, buttons, tabs, sheet buttons).
- P4  Open any form (e.g. + > bill): the sheet leaps up and settles gently, and the dark
      background fades in. Drag the sheet down by its top bar (where Cancel / Add are):
      it follows your finger; let go far down and it closes, let go early and it
      springs back. Cancel / Add / Save still work with a normal tap.
- P5  Save something: the "Saved" leaf tick is quicker than before and gone sooner.
- P6  Add a transaction: it slides into the list (the rows below move down smoothly) and
      glows pale green for a moment. Same when you add a bill, a debt, a loan, a savings
      pot, or a trip item. Switching months or opening a screen does NOT do this.
- P7  Phone Settings > Accessibility > Remove animations ON, then back to Finance Flow:
      sheets just appear/disappear, taps don't squeeze, wallet cards move instantly, the
      leaf tick appears without drawing, new rows don't slide. Turn it OFF again after.
- P8  Search: closing it no longer starts slowly.
- P9  To-Pay: only overdue amounts are red (with the red Overdue tag); everything else is
      black. Priority tags (High/Medium/Low) are soft filled pills, not outlines. Same
      calm black on Home's due list, the calendar's day list (bills/debts/loans),
      Subscriptions, and on a bill/debt/loan page (red only if overdue). Money spent in
      Transactions is still red; money you lent is still green.
- P10 Shared household: the small "who logged it" letter is bigger and easy to read.
- P11 A form problem (e.g. try saving a card with 3 last digits) shows in a soft red box
      with an icon. (The new "wasn't saved" wording only appears if saving really fails.)
- P12 "Are you still there?" shows the leaf in the circle (no waving hand). Calendar's
      view menu (the square button) shows a proper check icon. Pay sheet ticks are icons.
- P13 Calendar year view: the tiny day numbers are a little bigger and still fit.
- P14 Website: on the computer run  start website\index.html  (from the repo folder). One
      phone at the top: swipe/drag it, tap the arrows or dots, or click it and use the
      arrow keys; each screen plays its little animation. Slider in "Slide to today"
      changes Left to spend, days to payday and what's still due. Make the window narrow
      (like a phone): everything stacks and nothing scrolls sideways.

Q  2026-10-21 fixes after Cath's video (slower feel, spinner, Groceries swipe). PASSED on Cath's phone 2026-10-21.
- Q1  Add a transaction: the form starts closing as soon as you tap Add (no waiting
      spinner), then the new row slides into the list and glows pale green for about a
      second and a half. Same for a bill, debt, loan, pot or trip item.
- Q2  Opening any form feels as quick as before the design update (or quicker).
- Q3  Long lists (Transactions, To-Pay) open and scroll as smoothly as before.
- Q4  Groceries: swipe sideways to move between List, Calculator and Meal ideas.
      Events: swipe sideways between Upcoming and Done.
- Q5  Quickly tick two grocery items (or two trip items) one after another: both stay
      ticked.
- Q6  Open a form, close it, and immediately open it again: it slides up normally.
- Q7  (From Cath's screen recording: the Pay sheet stayed on screen ~2 s after Pay.) On a
      bill or debt page: Pay > Pay. The sheet slides away right after you tap Pay, then
      the leaf tick shows "Paid". Saving anything should feel as quick as before the
      design update.
- Q8  (Cath: taps didn't respond at once, typing an amount lagged.) Taps respond straight
      away everywhere (rows just fade; only the main buttons like Save / Pay / Add squeeze).
      In + > transaction, typing an amount and a description keeps up with your fingers.

R  2026-10-21 Cath's notes (credit limit, K1 Bill | Debt | Loan, subscription example,
   light/dark lag, Add lag). PASSED on Cath's phone 2026-10-21.
- R1  Pay something with a credit card for more than it has available (bill Pay sheet, a
      new transaction, a trip item): it says "Insufficient balance: <card> has ₱X available
      to use." and doesn't save. A card with nothing left says so too. An amount within
      what's available still works.
- R2  To-Pay > Debts > +: "New debt" has Bill | Debt | Loan at the top (on Debt), one
      short line under it, and a ? button. Type an amount and "Owed to", then tap Bill:
      the New bill form opens with the same amount and name. Tap Loan: New loan, same.
      Same from Bills and Loans. Editing an existing one does NOT show the switch.
- R3  The ? opens a short explanation of Transaction, Bill, Debt and Loan, with "Quick way
      to tell" at the end. Tap ? again to hide it.
- R4  New bill: under the Subscription switch, an example says when to tick it.
- R5  Home's moon/sun button: the icon changes the moment you tap it; the app recolours
      right after.
- R6  Add a transaction: tapping Add responds straight away (the form closes, then the
      row slides in). Add a few things quickly one after another: all of them are there,
      also after closing and reopening the app.

S  2026-10-21 Speed sweep (cards, whole-app redraws) + "Hey, are you still there?".
   PASSED on Cath's phone 2026-10-21.
- S1  Home > Accounts cards: swipe right and left several times in a row, quickly. Each
      card follows your finger and flies off/comes back smoothly, with no hitch halfway.
- S2  Hold a card and drag it up and down: the gap moves smoothly, it drops in cleanly.
- S3  Flip a few cards, wait 5 seconds, close the app fully and reopen: the card order
      you left is still there. (Flip, then go straight to the home screen of the phone:
      also kept.)
- S4  Move around the app (Home, Transactions, To-Pay, Plan), add and edit a few things:
      everything still updates as before (amounts, Left to Spend, offline banner when you
      turn on airplane mode, back to normal when you turn it off).
- S5  Leave the app alone until the check-in appears: it says "Hey, are you still
      there?" and the button says "Good".

T  2026-10-21 Coffee cup icon, Insufficient balance for every account. PASSED on Cath's phone 2026-10-21.
- T1  The "Hey, are you still there?" check-in and the "Amounts hidden while you were
      away" cover both show a coffee cup on a pale green circle.
- T2  Pay a bill (or add a transaction) for more than a cash or debit account has: that
      account is greyed out with "Insufficient balance" under its name and can't be
      picked. Same for a credit card with less available than the amount.
- T3  Pick an account first, then raise the amount above what it has and tap Save /
      Pay: it says "Insufficient balance: <name> only has ₱X." and doesn't save. An
      account with nothing left says "Insufficient balance: <name> has no money left in it."

U  2026-10-21 Code review fixes + speed sweep 2. NOT YET TESTED (the code didn't reach GitHub until 2026-10-22; please re-test).
- U1  Open and close any pop-up form (Cancel, Done, or drag it down): it slides away
      smoothly every time, with no flicker or quick reappearing before it goes.
- U2  Add two things quickly one after the other (e.g. a transaction, then straight away
      another): both are there, also after closing and reopening the app.
- U3  Add a transaction, then immediately go to the phone's home screen and swipe the app
      closed. Reopen it: the transaction is there.
- U4  Settings > Appearance: tap Light / Dark / Device: the highlight moves at once, the
      colours follow right after.
- U5  Add a bill, then within 2 seconds delete another one: the pale green glow on the new
      bill fades away on its own (doesn't stay stuck).
- U6  Flip a Home card, then within 3 seconds long-press and drag a card: the drag stays
      smooth.
- U7  General feel: scrolling, opening forms and typing in amounts on Home, Transactions,
      To-Pay and Plan. Tell Claude any spot that still lags.

V  2026-10-21 Speed sweep 3 (shared calculations, quiet hidden tabs). NOT YET TESTED.
- V1  Visit Home, Transactions, To-Pay and Plan once. Then on To-Pay add a bill and
      pay one: the form closes and the list updates without a pause.
- V2  Go to Home and Transactions right after: both already show the new bill/payment
      (Left to Spend, Due soon, the payment in the list). Switching tabs slides smoothly.
- V3  Typing in a bill, debt or loan form keeps up with your fingers.
- V4  Scroll Home down past the Left to Spend card and back up: smooth; the slim
      "Left to spend" bar appears and goes away at the same point as before.
- V5  Flip a Home card, then within 3 seconds go to another tab and add a transaction.
      Come back after a few seconds: the card order AND the transaction are both kept
      (also after closing and reopening the app).
- V6  Calendar: Due soon on Home, overdue tags on To-Pay and the calendar amounts are
      the same as before. Leave the app open past midnight (or change the phone's date):
      overdue and due-soon update for the new day.

W  2026-10-22 Cath's video notes. NOT YET TESTED.
- W1  Home: tap the moon/sun. The whole screen changes colour quicker than before (the
      other tabs catch up in the background; go to them: already recoloured).
- W2  Home +: the New transaction form slides up over Home straight away (no switch to
      Transactions first). Add: "Added", then it goes to Transactions and you see the new
      entry there (glowing). Cancel: you're still on Home. + on Transactions as before.
- W3  With no salary set up: + > Money in > Salary. A red box says "No salary set up
      yet" with an "Add a salary" button. Tap Add without it: the red message appears
      and the form scrolls to it.
- W4  Tap "Add a salary": the form closes, Income opens with its Add form already open.
      Add a salary: you come straight back to New transaction, Money in > Salary, with the
      new salary picked (and the amount/account you typed kept).
- W5  Calendar > year view: scroll through all years quickly: the months are drawn as
      you scroll (no blank years). No empty months at the start; a note
      at the top, and ends at December 2031 with a note saying it covers 5 years back and
      5 years ahead (2021 to 2031). It starts at January 2021.
- W6  Year view: today's date still has its circle; tapping a month still opens it.
- W7  Hold a Home card and move it up and down slowly for several seconds: it keeps
      following your finger; the page doesn't scroll while you hold it. Let go: it drops
      into place, and the page scrolls normally again.
- W8  New bill > Category: "Subscription" is no longer a choice (use the Subscription
      switch). An old bill that had it still shows it.
- W9  Bounce: pull down / push up past the edge on Debts, Loans, Plan, Shared expenses,
      a trip's Budget and To-do, Savings Pots / Emergency / FI, Groceries, Events, Income,
      Accounts, a card's page, a bill's page, Subscriptions, Recurring, Search, Reports:
      all stretch like Bills, even when everything fits on the screen.

X  2026-10-22 More notes. NOT YET TESTED.
- X1  A trip's page: swipe left/right anywhere on the page (also the empty space below)
      to move between Budget and To-do.
- X2  Calendar +: a bottom sheet like the app's forms: "Add on Thu, Oct 22", one line
      "Everything you add starts on this day", then Transaction / Bill / Debt / Loan with a
      green icon tile and a short line each. Cancel closes it.
- X3  Calendar +, pick a day (e.g. Nov 3), then Bill: the New bill form opens with Due on
      Nov 3. Same for Debt and Loan. Transaction starts on that day too.

Y  2026-10-22 Switch in place + year view. NOT YET TESTED.
- Y1  To-Pay > Bills > +: type an amount and a name, then tap Debt at the top. The New
      debt form comes up right there (you stay on the Bills list behind it), with your
      amount and name. Tap Add: "Added", and To-Pay then shows Debts with the new debt.
- Y2  Same from Debts to Loan, Loans to Bill, etc. Cancel after switching: you're still on
      the list you started on, nothing added.
- Y3  Calendar > year view: fling quickly from 2021 to 2031 and back: every year is
      drawn (no blank pages), today is a green number in a circle.

Z  2026-10-22 Card stack rebuilt, smooth light/dark, calendar fixes. PASSED on Cath's phone 2026-10-22 (cards smoother).
- Z1  Home cards: swipe right and left several times quickly; the front card follows your
      finger exactly and flies off/comes back smoothly.
- Z2  Hold a card and move it up and down for several seconds: it stays right under your
      finger, the others part to show the gap, it drops cleanly. Tap a card: its page opens.
- Z3  Flip / move cards, wait 5 seconds, close and reopen the app: the order is kept.
- Z4  Home moon/sun: a quick soft fade to the new colour and back (no pause, no half-
      recoloured screen). Settings > Appearance Light/Dark does the same fade.
- Z5  Calendar: tap any day that isn't today: it gets a light grey CIRCLE (not a square).
- Z6  Calendar +: the four choices sit on the sheet with no white box around them, just a
      faint line between them (starting under the text).

AA 2026-10-22 One sheet for Bill/Debt/Loan, add from anywhere, see it land. NOT YET TESTED.
- AA1 To-Pay > Bills > +, type an amount and name, tap Debt: the same sheet just changes
      to the debt form (no closing and reopening), with your amount and name. Same for
      Loan, and back to Bill.
- AA2 Add it: "Added", To-Pay switches to Debts, the new debt slides in and glows, and the
      list scrolls to it if it's further down.
- AA3 Bills > + > add a bill that lands further down the list: the list scrolls to it and
      it glows (no need to scroll yourself). Same on Debts, Loans and Transactions.
- AA4 Calendar > pick a day > + > Transaction: the form comes up right over the calendar
      (no jump), on that day. Add: you go to Transactions and see it slide in and glow.
- AA5 Calendar > + > Bill (and Debt, Loan): the form comes up over the calendar, Due on
      the picked day. Add: you go to To-Pay on that list and see it slide in and glow.
      Cancel: you stay on the calendar.
- AA6 Hold a Home card and drag it to the very top or bottom of the screen: the page
      scrolls along while you hold it there; the card stays under your finger. Let go: it
      drops into the right place and the order is kept.

AB 2026-10-22 Front card, real cross-fade, one form sheet, no flash. PASSED on Cath's phone 2026-10-22.
- AB1 Hold a Home card and drag it down over Due soon and Insights: it stays in FRONT of
      them (like over Left to Spend). Inside the cards it behaves as before.
- AB2 Home moon/sun: the old look fades smoothly into the new one (no all-black or
      all-white moment). Same from Settings > Appearance.
- AB3 To-Pay > + (bill), switch to Debt, Loan, back to Bill: it's ONE sheet; only the form
      inside changes (the sheet may grow or shrink a little to fit). Add: the sheet slides
      away, then To-Pay shows that list with the new one gliding in and glowing.
- AB4 Home +: add a transaction. The form slides away over Home first, then Transactions
      shows with the new entry glowing (no flash of the form on Transactions).
- AB5 Calendar + > Bill / Debt / Loan / Transaction: form over the calendar; after Add it
      slides away, then the right list shows with the new one glowing.

AC 2026-10-22 Sweep (bugs, smoothness, animation). PASSED on Cath's phone 2026-10-22 (light/dark still slow: see board AF).
- AC1 Go into a page and back (e.g. Home > Accounts > Income > Not assigned, then back,
      back): the two pages move side by side, like the tabs. Going in, the new page pushes
      the old one out to the left; going back, the old page comes back in from the left as
      the top one leaves to the right. No empty moment, no pop at the end, and the pages
      never show through each other. Same when you swipe back with a finger.
- AC9 Calendar opens and closes as a sheet; the page behind it stays still.
- AC10 Moon/sun: tap it, then tap it again straight away: the screen never stays frozen
      on a picture of the old look; it ends in the mode of your last tap.
- AC2 Switching tabs feels a little quicker; everything slides with the same soft curve.
- AC3 Home cards: a flip is quicker and starts moving at once. Pick up a card: the page
      below glides down to make room (no jump) and glides back after the drop.
- AC4 Typing an amount or description in New transaction / New bill / New debt / New loan
      keeps up with your fingers, also with many accounts and a long history.
- AC5 Transactions list and Home scroll smoothly; Home doesn't hitch where the slim
      "Left to spend" bar appears.
- AC6 Calendar + > Transaction > Money in > Salary with no salary set up > Add a salary,
      add it: you come back to the calendar with the New transaction form and the salary
      picked.
- AC7 Bill form opened from the Calendar, switched to Debt, added: the debt is saved and
      everything else you changed just before is still there.
- AC8 Tap the moon/sun twice quickly: the app ends in the mode of your last tap.

AE 2026-10-22 Loan switch, subscription line, no swipe-delete, calendar layer. NOT YET TESTED.
- AE1 To-Pay > + > type an amount, switch Bill > Debt > Loan > Bill: the keyboard stays up
      the whole time and the sheet doesn't slide down and back up (same as Bill > Debt).
- AE2 New bill: no line between the Subscription switch and its example text.
- AE3 Swiping a row left no longer shows a red trash button anywhere; Settings no longer
      has "Swipe to delete". Deleting is from the item's page or its Edit form. Rows from
      bills/debts/loans in Transactions still swipe to "view" that item.
- AE4 Calendar > + > (any, or Cancel) > back > open the calendar again > close it: Home
      looks normal, no calendar behind it. The calendar still rises from the bottom.

AF 2026-10-22 Light/dark back to 2.1. NOT YET TESTED.
- AF1 Home moon/sun: the whole page switches in the same moment you tap, no fade, no
      photo, no wait (like 2.1). Same from Settings > Appearance. Other tabs are already
      switched when you go to them.

AG 2026-10-22 Bug-check batch 1 (Claude tested each with automatic checks first; these are
   only the things a computer can't show). Cath, 2026-10-22: "device test as described".
   AG4 (two phones, needs the partner's phone on 2.2) and AG5 (app left open overnight)
   can't be done in one sitting: still open until Cath confirms them. Before testing: `npm install`
   once after `git pull` (new testing tools).
- AG1 Settings > Backup & Data > Clear all data & start fresh, as the household OWNER: the
      box says it clears it for you AND your partner (by name), button "Yes, clear it for
      everyone". Tap Cancel (don't clear!).
- AG2 Same on your partner's phone (a MEMBER, if you can): no clear button; it says only
      the owner can, with "Leave household" (opens the Household page). Tap Cancel there.
- AG3 Settings > Backup & Data > Save a backup: asks for your password. A wrong one says
      "Incorrect password". The right one opens the share sheet; save it to Google Drive or
      email it to yourself and check the file arrives (it's locked, so it looks like
      gibberish if opened - that's correct).
- AG4 Two phones (when your partner has 2.2): open the app on both, add something on each:
      both see both changes as before. (Bigger storage switches on quietly in the
      background; nothing should look different.)
- AG5 Leave the app open in the background overnight (no lock), open it in the morning:
      Home's date, days to payday and "due" labels are today's, not yesterday's.
- AG6 Look-around: add a transaction and tap Add twice very quickly: only ONE is added.
- AG7 Settings > Budgeting > the "Running low" percent: clear the box, wait 2 seconds
      (don't leave the box): it stays empty (it used to jump to 0). Type 20 and leave the
      box: it saves 20.

AH 2026-10-22 afternoon: bad connection while opening, zero amounts grey. Cath, 2026-10-22:
   "device test as described".
- AH1 With your phone on very weak signal (or turn mobile data off a second after tapping
      the app open), open Finance Flow: Home shows your household as usual (not empty),
      and it catches up once the connection is back. Add something meanwhile: it's kept.
- AH2 To-Pay > Debts with no debts: "Total debt logged ₱0.00" is grey. Same for Bills /
      Loans totals, Groceries "Bought", and Transactions "Out" (no minus sign at zero).
      Anything above zero is still red.

AI 2026-10-22 late afternoon: refunds. Cath, 2026-10-22: "device test as described".
- AI1 Add an expense (Money out, e.g. ₱500 "Test shoes") with "Expecting a refund" on.
      Open it, Edit, switch to Money in, Save: the row no longer shows a refund badge, and
      its page has no "Mark refund as received".
- AI2 Add another expense with a refund expected. On its page tap "Mark refund as
      received": a "Refund: ..." money-in appears. Delete that refund entry: the expense
      goes back to waiting for its refund (its page offers "Mark refund as received"
      again). Delete both test entries afterwards.

AJ 2026-10-22 evening: PIN lock. Cath, 2026-10-22: "device test as described".
- AJ1 Lock the app, then type a WRONG PIN 5 times: it says "Too many incorrect PINs. Use
      your password, or try your PIN again in 5 minutes." Close the app completely and open
      it again: the same message is there and the right PIN still doesn't open it. Your
      password does. (Or wait 5 minutes: the PIN works again.)

AK 2026-10-22 evening: small ones. Cath, 2026-10-22: "device test as described".
- AK1 Settings > Notifications: turn "Notify me on this phone" off and on again: it stays
      on, and nothing else in the app changes (it used to be able to undo a change your
      partner made while the phone's permission pop-up was open).
- AK2 Plan > Savings > a pot with a target date next year: its page says "by <date>, 2027"
      (with the year), the same as the Savings list.

AL 2026-10-22 night: years on dates, confirm pop-ups, sign-in. NOT YET TESTED. (The sign-in
   fix only shows on a new phone or after reinstalling; nothing to test for it day to day.)
- AL1 Make a test trip for next year (e.g. Apr 2-9): Travel shows "Apr 2 – 9, 2027". This
      year's dates still show without a year ("Nov 11"). Delete the test trip.
- AL2 Look-around: delete a test bill, a test transaction and a test trip (make them
      first): each disappears and nothing else changes.

AM 2026-10-23: smoothness (sub-pages follow your finger). NOT YET TESTED.
- AM1 To-Pay: put your finger on the list and slowly drag left: the Debts page comes in
      WITH your finger, and the white highlight in Bills / Debts / Loans moves along with
      it. Let go past about a quarter of the screen: it settles on Debts. Let go early: it
      slides back to Bills.
- AM2 To-Pay on Loans: swipe left again: the page gives a little and springs back. You
      stay on Loans (it no longer jumps to Plan). Same on Bills swiping right (no jump to
      Transactions). The bottom tab bar still changes tabs when you swipe ON it.
- AM3 Tap Bills / Debts / Loans: the page slides there and the highlight glides.
- AM4 Swipe-to-delete on a bill still works (slow swipe on the row opens Delete; a quick
      flick across a row turns the page).
- AM5 Plan > Savings (Pots / Emergency / FI), Groceries (List / Calculator / Meal ideas),
      Events (Upcoming / Done): the same finger-following slide and bounce at the ends.
- AM6 Plan > Travel > open a trip: swipe on Budget / To-do: it follows your finger and
      the things below (Delete trip, other trips) move smoothly to the new height.
- AM7 Small switchers in forms (Bill / Debt / Loan in New bill, I borrowed / I lent):
      the white highlight glides; the form doesn't slide.
- AM8 Add a ₱100 test transaction from Home: Left to Spend counts down quickly to the
      new amount (about half a second). Delete the test transaction: it counts back up.
- AM9 Phone Settings > Accessibility > Remove animations ON: pages, highlight and numbers
      change at once (dragging still follows your finger). Turn it back off.
- AM10 Look-around: add a debt from New bill's Bill / Debt switch: To-Pay shows Debts
      and the new debt lights up once it's on screen.

AN 2026-10-23: smoothness 2 (no flicker, no overlap, smooth fades). NOT YET TESTED.
- AN1 Welcome > set-up: each Continue slides the next step in from the right; Back slides
      it away to the right. "See my Home": set-up fades out, Home fades in (no blink).
- AN2 Lock the app and unlock: locking is instant (no fade); unlocking fades Home in.
- AN3 Home: swipe slowly left from the middle of the page: Transactions comes in beside
      Home WITH your finger (never an empty side), and nothing overlaps when you let go.
      Do it on each tab, both ways; past Plan or Home it springs back.
- AN4 To-Pay > + > New bill. Tap Debt, then Loan, then Bill: the highlight glides at once,
      the fields fade out and the new ones fade in, the top of the pop-up glides to its new
      height (no jump). Type an amount first: it stays, and so does the keyboard.
- AN5 In New loan tap I lent, then I borrowed: same glide and fade.
- AN6 Dark mode (moon on Home): changes at once, like 2.1.
- AN7 Open a few Plan pages and go back: each slides side by side, nothing shows through.
- AN8 Search on Transactions: drops down smoothly; tell me if the tab bar fades a moment
      after the rest of the page.
- AN9 Pop-ups (my browser can't check these): open the + form, Cancel, then tap the bell
      straight away: the bell's pop-up opens. Tap the bell right after Home appears: it opens.
