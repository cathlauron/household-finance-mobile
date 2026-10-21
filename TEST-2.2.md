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

T  2026-10-21 Coffee cup icon, Insufficient balance for every account. NOT YET TESTED.
- T1  The "Hey, are you still there?" check-in and the "Amounts hidden while you were
      away" cover both show a coffee cup on a pale green circle.
- T2  Pay a bill (or add a transaction) for more than a cash or debit account has: that
      account is greyed out with "Insufficient balance" under its name and can't be
      picked. Same for a credit card with less available than the amount.
- T3  Pick an account first, then raise the amount above what it has and tap Save /
      Pay: it says "Insufficient balance: <name> only has ₱X." and doesn't save. An
      account with nothing left says "Insufficient balance: <name> has no money left in it."

U  2026-10-21 Code review fixes + speed sweep 2. NOT YET TESTED.
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
