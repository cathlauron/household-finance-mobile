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
   mood samples, last 4 digits, leaf cover, new linking screen. NOT YET TESTED.
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
   polish P1-P4 and the new website (website/index.html). NOT YET TESTED.
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

Q  2026-10-21 fixes after Cath's video (slower feel, spinner, Groceries swipe). NOT YET TESTED.
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
