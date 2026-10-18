# Finance Flow — Version 3 Plan

> Copy of the Version 3 plan doc (made in one of Cath's Claude accounts; last copied 2026-10-17).
> The doc itself may only open in that Claude account; this file is the copy every account can read.
> Decisions Cath makes on the Questions lists get recorded in PROGRESS7.md.

Oct 16, 2026 · @Cath

## At a glance

Version 3 has one goal: make Finance Flow an app people aren't afraid to open. It has one urgent job before that: fix three ways today's app can lose or block household data.

- **Fix first.** A single receipt photo can stop a household from syncing; the household's data has a 1 MB ceiling; and two people saving at once can wipe out one person's change. Details in Everything that could go wrong.
- **Quick wins.** Six of your notes are small: the "@", the member note, the Add button, the payday reminder time, joining while offline, and the offline banner.
- **The focus.** Lead with the next step instead of the verdict, keep logging to seconds, and never punish anyone for coming back late (Catch-up mode, Calm Home, a weekly 2-minute check-in).
- **Smarter, privately.** Habit suggestions, a pay-this-off-first plan and cut-back ideas all learn on the phone, so the data stays encrypted.
- **Premium.** Safety stays free; Premium is the "does it for you" layer, with a 30-day trial that needs no card and pauses features instead of deleting them.
- **Honest limits.** Forgot password can only bring data back with a Recovery Key or a household member's approval, and Google or Apple sign-in needs an encryption decision from you first.

The Questions section at the end lists the 13 decisions that shape what gets built.

## Quick fixes

Six of your notes are small and safe. They can go into one or two test batches, and each takes a few minutes to check on your phone.

| Your note | What happens today | The fix |
| --- | --- | --- |
| The "@" before the username | Profile shows your username as "@cath", like a social media handle. Sign-in asks for "cath" with no "@", so it looks like part of the name. | Show the username plain everywhere: "cath". On Profile the row reads Username · cath. |
| The note under the member name | Profile says "What Home calls you. Your username stays the same." Setup shows a similar line. | Remove it from Profile. The setup line can go too (see Questions). |
| "Add" sits a hair too high | Every word button (Back, Add, Edit) shares one style. Last session's pixel check found them level, so the difference is probably how it looks next to the Back arrow. | Move all the word buttons down 1 point together, then you compare on the phone. If it still looks off, a screenshot of that page tells me exactly how much. |
| Payday nudge always at 6 PM | 6:00 PM is fixed in the code. Settings only has an on/off switch. | Add a "Remind me at" time under Payday nudge. Each person picks their own time, so changing yours doesn't change your partner's. |
| Joining a household offline just spins | Join doesn't check the connection and has no time limit. | Check first: "You're offline. Joining a household needs the internet." Any online step also gives up after 15 seconds with a clear message. |
| The offline banner can't be moved | It's a fixed strip under every page title while offline. | Swipe it away and it shrinks to a small cloud icon in the top bar. Tap the icon to see it again. More in Offline mode below. |

One extra fix in the same batch: the Quick unlock footer in Settings still says "Open the app with your fingerprint or a PIN instead of your password." That stopped being true when the app started opening straight in, and it's part of why Quick unlock feels confusing (see Locking).

## Back-dating payments

Back-dating is mostly a screen change. The app already saves a "paid on" date for every payment; the pay sheets just always fill in today. One "Date" row (Today · Yesterday · Pick a date) added to every sheet that moves money covers bills, debts, loans and the rest.

| Where | Can you pick the date today? | Version 3 |
| --- | --- | --- |
| Bill or debt: Mark as paid | No, always today | Add a Date row |
| Loan: log a payment | No, always today (dates can be changed later by editing the loan) | Add a Date row |
| Savings pot: add or take out | No, always today (editable later in the pot's history) | Add a Date row |
| Trip checklist item ticked | No, today | Ask the date when ticking |
| Event item done, grocery bought, Settle up | No, today | Add a Date row |
| New transaction, log a payday, transfer, shared expense | Yes | Keep, but add the balance note below |

**Rules that keep back-dating from breaking things**

1. **No future dates for "paid".** A payment can't be marked as paid tomorrow. Planning a future payment is a different feature.
2. **Catching up several missed months.** Each Mark as paid moves to the next due date, so the sheet should say which one you're paying ("Paying the Sep 15 bill"). When more than one is behind, offer "Mark the earlier ones paid too".
3. **Paid late.** If the date is after the due date, the history shows "Paid 3 days late". No fee is added unless you type one.
4. **The balance surprise (most important).** Account balances only count money dated after you last updated balances on the Accounts page. A payment back-dated to before that day won't change your balance, because the balance you typed should already include it. Today this happens silently, so it looks like a bug. Version 3 shows a note: "Your balances were updated on Oct 10, so this is already in them. Your balance won't change." with a choice: "It isn't included, take it off my balance".
5. **Past months change.** Back-dating into last month changes last month's totals and reports. If that month's summary was already sent, the sheet says "This changes your September summary".
6. **Envelope alerts.** Back-dated spending in the current month counts toward envelopes. Spending dated in a past month never sends an alert.
7. **Reminders.** Paying a bill early or late (by date) cancels that bill's reminder. The app already re-plans reminders on every save.
8. **Honest history.** The app keeps both dates: the day it was paid and the day it was logged. Your partner sees both, and the date can still be edited afterwards on the payment's page.

Back-dating also powers "Catch-up mode" in the Version 3 focus section: after a few days away, the app helps you log the missed days quickly.

## Sign-in, usernames and Forgot password

Email is already the sign-in; the username is your name inside the household. Adding Google or Apple sign-in doesn't remove usernames. The hard part is elsewhere: today your password is also the key that unlocks your encrypted data, so anything that replaces or resets the password has to give the data another way in.

**How it works today**

- Sign-in asks for email, username and password.
- Google's sign-in service (Firebase) checks the email and password.
- The same password, mixed with a random code, makes your personal key. That key unlocks the household key, and the household key unlocks the data. Nobody else can read it, including us.
- Each username can be claimed only once, and the app uses it to find your keys, backups and Recovery Key.

**What happens to usernames with Google, Apple or email sign-in?**

Keep them. The username stays your in-app name, used in household lists and when a member helps you recover. The email, Google or Apple account becomes how you prove who you are.

Duplicates by email are already blocked: Firebase allows one account per email address. Two gaps to handle:

- **Apple's "Hide my email"** gives a random forwarding address, so the same person could make a second account. Profile gets a "Ways to sign in" list, where you add Google or Apple to your existing account instead of making a new one.
- **Same address, two methods.** Signing in with Google using an address that already has a password account must join the two, not create a second one.

A related simplification: sign-in shouldn't need the username at all. The app can look it up from your account. That needs a small new lookup in the cloud and a security rules change, so it's on the Questions list.

**Will Forgot password work?**

Half of it works with email, and the other half needs something you set up beforehand.

- **The account part works.** Firebase can email a reset link, and you choose a new password.
- **The data part doesn't, by itself.** A new password makes a different key, and that key can't open data locked with the old one. That's the price of real encryption: we can't open it for you either.

(Diagram in the doc: your password, your Recovery Key, or a household member's approval each open the household key, which unlocks the household data. A new password after a reset makes a different key and opens nothing.)

Every way in opens the same household key. A reset password makes a brand-new key that was never given a copy, so on its own it opens nothing.

To get the data back after a reset, you need one of two things the app already has:

1. **Your Recovery Key** (the 16-character code in Settings), or
2. **Approval from another household member** who is signed in.

With neither, the data is gone for good, and no one can help. So Forgot password in version 3 should be built as one guided path:

1. Check the email address at sign-up (today nothing checks it, so a typo means reset emails go nowhere).
2. During setup, ask everyone to save their Recovery Key, and remind them later if they skipped it.
3. Forgot password: reset email → sign in with the new password → "Unlock your data" with the Recovery Key or a member's approval → the data is re-locked with the new password.

**Google and Apple sign-in need a decision first**

With Google or Apple there is no password, so something else has to make the key.

| Option | How it feels | Trade-off |
| --- | --- | --- |
| A. A separate data passcode | Sign in with Google, then type a passcode the first time on each phone | One more thing to remember. Encryption stays as strong as today. |
| B. The key stays on your phone | Like WhatsApp backups: a new phone needs your Recovery Key, or approval from a phone that's already signed in | Smoothest day to day, and the biggest build. Lose every phone and the Recovery Key, and the data is gone. |
| C. Keep the key on our server | Forgot password just works | Breaks the "nobody else can read your data" promise. Not recommended. |

My suggestion: version 3 does email checking, Recovery Key setup and Forgot password. Google and Apple sign-in come after, most likely with option B. Every option touches encryption, so nothing here gets built until you pick one.

## Locking: Quick unlock, PIN and Auto-lock

You guessed right. Now that the app opens straight in, Quick unlock has three jobs: unlocking after Auto-lock, switching between accounts on one phone, and confirming risky actions. The PIN is the backup for fingerprint, not a second lock.

**How it works today**

- **Sign in once.** Your sign-in details are kept in the phone's secure vault, so the app opens to Home.
- **Auto-lock** is Never by default, with 1, 5, 15 or 30 minutes as choices. When it locks, you open it with fingerprint, PIN or password.
- **Quick unlock** (fingerprint and PIN) is set per account. Its footer still describes the old behaviour, which is where the confusion comes from.

**Why have a PIN when fingerprint is on?** Fingerprint fails more often than people expect: wet or dusty hands, a cracked sensor, a new phone that hasn't learned your finger. Without a PIN, the only way in is typing your full password. The PIN is the quick fallback.

**What Auto-lock is for:** people who share their phone, or whose kids play games on it. With Never, anyone holding your unlocked phone can open Finance Flow and see everything.

**Proposed for version 3: one "Lock and privacy" section**

| Setting | What it does | Suggested default |
| --- | --- | --- |
| Lock the app | Never · When I leave the app · After 1, 5, 15 or 30 minutes | Asked during setup: "Do other people use your phone?" Yes → When I leave. No → Never. |
| Unlock with | Fingerprint or face, with PIN as the backup | Fingerprint if the phone has it |
| Hide amounts | Blurs balances on Home until you tap them | Off |
| Hide in recent apps | Blurs the app's preview when you switch apps, so balances don't show | On |
| Ask before risky actions | Fingerprint or PIN before showing the Recovery Key, changing the password, removing a member, exporting or deleting data | On |
| Switching accounts | Fingerprint or PIN opens another saved account on this phone | On when Quick unlock is set |

**What could go wrong**

- **Forgotten PIN:** after 5 wrong tries the app asks for the password. That already works.
- **Lost or stolen phone:** sign it out from another phone under Active devices. Help should explain this step by step.
- **Shared phone left on Never:** the setup question above is the fix. The app shouldn't decide for people, but it should ask.

## Offline mode

Most of the app works offline, because every change is saved on the phone first and sent later. A short list of things needs the internet, and each one should say so the moment you tap it, never spin without end.

**Works offline:** seeing everything; adding, editing and deleting transactions, bills, debts, loans, pots, trips, events, groceries and goals; marking things paid; logging paydays; transfers; appearance settings; locking and unlocking an account that's already on this phone; reminders, which the phone schedules itself.

**Needs the internet (the list you asked for)**

| Action | Why it can't work offline |
| --- | --- |
| Create an account | The username must be claimed in the cloud so no one else takes it |
| Sign in on a new phone, or after logging out | The password is checked in the cloud, and your keys are downloaded |
| Open a saved account whose data isn't on this phone yet | The data has to be downloaded first |
| Join a household, make an invite code, approve someone joining | The codes and keys are swapped through the cloud |
| Leave a household or remove a member | Who's allowed in is decided in the cloud |
| Change your password | The password and the locked keys must change together |
| Set up or use the Recovery Key; ask a member to recover you | These are stored in the cloud |
| See Active devices; sign out another phone | That list lives in the cloud |
| Get your partner's latest changes | They come through the cloud |
| Weather on Home (sky and rain) | Comes from a weather service |
| Future: Premium trial, subscribe, restore a purchase | Handled by Google Play |
| Future: Contact support, delete account | Sent to us |

**Allowed offline, but risky (the app should warn)**

| Action | What could go wrong | What the app should do |
| --- | --- | --- |
| Log out or switch accounts while changes are waiting | The waiting changes may never reach the cloud | "3 changes haven't synced yet. Log out anyway?" |
| Big changes in a shared household (a CSV import, many deletes) | When you reconnect, your whole copy is sent and can replace what your partner changed meanwhile (Risk 3) | Warn now; after the sync fix this risk goes away |
| Uninstall the app or clear its storage | Unsynced changes are deleted | Help article; nothing the app can do in that moment |

**How the app should tell you**

1. **The banner.** Shows once when you go offline. Swipe it away and it becomes a small cloud icon in the top bar; tap the icon to see it again.
2. **When you save something offline.** A small message: "Saved on this phone. It'll sync when you're back online." Shown on the first save, not on every tap, so it doesn't nag.
3. **When you tap something that needs the internet.** A short sheet: what needs the internet and why, with Try again. The button stays visible so people know the feature exists.
4. **When the connection comes back.** "Back online. 3 changes synced." Then it disappears.
5. **On a slow connection.** Today a save gives up after 8 seconds and shows "Sync Failed", even when the save lands a moment later. Version 3 should keep retrying quietly and only speak up if it still fails after a few tries.

## CSV import

The importer handles a clean, simple file, but many real bank files would go wrong, some of them silently. The worst cases: negative amounts are rejected, separate Debit and Credit columns don't work, and a date like 03/04/2026 can land in the wrong month without any warning.

**How it works today:** it expects a header row with date, label, amount and an optional direction column. Dates must be 2026-10-16 or 10/16/2026. Every imported row gets the category "Imported", the owner "Shared", no account, and is marked To review. Duplicates are checked only against transactions typed in by hand. There's no undo.

**Everything that can go wrong, and the fix**

| Problem | What happens today | Fix |
| --- | --- | --- |
| An Excel (.xlsx) file or a PDF statement (GCash and Maya send PDFs) | Rejected: "Select a CSV file" | Help article on saving as CSV; later, read .xlsx directly. PDF import is a separate, bigger feature. |
| Columns separated by semicolons or tabs | Everything lands in one column | Detect the separator from the first lines |
| Lines above the header (bank name, account number, period) | The first line is taken as the header and nothing matches | Find the header row automatically; let you tap it if unsure |
| A line break inside a memo | The row splits in two, both broken | Read quoted text across lines |
| Letters like ñ show as junk ("ParaÃ±aque") | The file isn't in the expected text format | Detect and convert common formats |
| A very big file (years of history) | Slow, may freeze, and can push the shared data over its size limit (Risk 2) | Show the size first, import in parts, warn before the limit |
| Opening balance, closing balance or total rows | Imported as if they were spending | Skip them and list them as "Skipped" in the preview |
| A running-balance column | Could be picked as the amount | Recognise "Balance" and never use it as the amount |
| Negative numbers for money out (very common) | The row is rejected: "must be greater than 0" | Negative = money out, positive = money in |
| Separate Debit and Credit columns | Only one is used; the other rows fail | Support two columns: Debit = out, Credit = in |
| "CR" or "DR" after the amount, or (1,200.00) in brackets | Direction ignored; brackets lose the minus | Read these markers |
| Excel's short form (1.5E+04) | Read as 1.5 | Read it properly; flag amounts that look odd |
| Another currency (an OFW account in dollars) | Imported as pesos | Spot the currency and ask what to do |
| Day and month order (03/04/2026) | Always read as month/day, so a day-first file lands in the wrong months | Check the whole column (a day over 12 settles it); if still unclear, ask with an example |
| Other date styles ("Oct 16, 2026", "16-Oct-26", a date with a time, Excel's date numbers) | Rejected | Accept all the common styles |
| Dates in the future or many years ago | Imported | Flag them in the preview |
| The same file imported twice | Caught (same date, amount and label) | Keep; also remember each file's date range: "You already imported Oct 1–15" |
| A bill already marked paid in the app also appears in the file | Counted twice | Also compare against bill, debt and loan payments, paydays and pot additions; offer "Link to the existing payment" |
| Moving money between your own accounts | Shows up as spending in one file and income in the other | Spot same-day in/out pairs and offer "This is a transfer" |
| No account chosen | Rows count in spending but never touch an account balance | Ask "Which account is this file from?" first, with the balance-date note from Back-dating |
| Every row is "Imported" | Reports show one big lump, and envelopes don't count it | Fill categories from your rules and past entries; show only the ones it couldn't place |
| Hundreds of rows To review | Overwhelming | Review by payee: "All 23 Jollibee → Food?" |
| A bad import | No undo; deleting rows one by one | Tag each import; "Undo this import" for 30 days and an import history |
| Importing offline in a shared household | Can replace your partner's newer changes (Risk 3) | Import only when online until the sync fix |
| The file stays in the app's temporary folder | A copy of your statement stays on the phone | Delete the temporary copy after import |

**The new import flow:** choose the file → "Which account is this from?" → a preview with a summary (143 rows, Jan 1 to Mar 31, ₱52,300 out, ₱60,000 in, 4 skipped, 2 possible duplicates) → fix columns only if needed → Import → "Done. Undo?"

To make presets for the banks you and your users actually have, I need real export files with the numbers and names blanked out. Those are on the Questions list.

## Version 3 focus: an app people aren't afraid to open

The goal is to make Finance Flow feel safe to open: lead with what you can do next, not how bad it is; make logging take seconds; and never punish anyone for coming back late. The app can't make a low balance higher. It can change when and how someone meets that number: early, in small doses, with a next step, so they keep coming back while there's still time to act.

**Why people avoid looking**

- **Bad news hurts, so people don't look.** Researchers call this the ostrich effect: investors checked their accounts more often when markets rose and less when they fell ([Karlsson, Loewenstein and Seppi, 2009](https://www.cmu.edu/tepper/faculty-and-research/assets/docs/ppaper-61264983153898-ostrich-effect-1.pdf)).
- **Shame,** especially in front of a partner or family.
- **Effort.** Logging feels like homework, and one missed week makes catching up feel impossible, so people stop altogether.
- **The comfort of not knowing.** Keeping it "in my head" feels like control, because no number can disagree with you.

**Ten rules for every screen in version 3**

1. **Lead with the next step, not the verdict.** Home opens on "You're on track for payday (Oct 30)", not on total debt.
2. **Bad news always comes with a plan.** Never "₱3,000 short" on its own; always "₱3,000 short. Here are 3 ways to close it."
3. **Calm words and colours.** Red only for real danger, like an overdue bill. Normal spending is never shown as an alarm.
4. **You choose how much you see.** A calm view shows only On track · Getting tight · Needs a look, with the numbers one tap away.
5. **Logging takes seconds.** One-tap suggestions, repeats and quick add. The target is under 5 seconds per entry.
6. **No penalty for coming back.** After days away: "Welcome back. Want a 2-minute catch-up?" Never a wall of 47 things to review.
7. **Use fresh starts.** People are more willing to start good habits at the beginning of a week, month or year ([Dai, Milkman and Riis, 2014](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)). Payday and the 1st of the month open with "New month, clean slate".
8. **Celebrate actions, not totals.** "You paid 4 bills on time this month" instead of "You spent ₱40,000". No streaks that break, because a broken streak makes people quit.
9. **Show what the money did.** "This month your money covered rent, groceries for 4, school fees, and ₱2,000 into your emergency pot."
10. **No blame between partners.** Household screens talk about "us", and the app never points at who overspent.

**Features that put the rules into practice**

| Feature | What you'd see |
| --- | --- |
| Calm Home | The top card is one sentence about where you stand and one suggestion. Numbers sit one tap below. |
| Catch-up mode | After 3 or more days away: "6 days to catch up. Quick version: just bills and paydays, about a minute." Optional "I'll estimate the rest" adds one Other spending line instead of every coffee. |
| Since you last looked | A short recap card, good news first, then one thing to look at. |
| Weekly 2-minute check-in | Monday morning, three cards: what happened (one line), one thing to watch, one small step. |
| Gentle daily nudge | At your chosen time: "Got 30 seconds? Log today." Skipped if you already logged today; never more than one a day. |
| Progress first | "Emergency pot covers 1.4 months", "Car loan 38% paid off", shown before any totals. |
| Hide amounts | Balances blurred until you tap. Helps in public, and for people who want to warm up first. |
| What do you want help with? | One question at setup (stop worrying · pay off debt · save for something · see where it goes) that decides what Home shows first. |
| Personal spending money | An idea for couples: each person has an amount the partner sees as one line, not every purchase. See Questions. |

**Words to change across the app**

| Instead of | Say |
| --- | --- |
| Overspent | ₱500 over your food plan. Move some from Fun? |
| Warning: low balance | Getting tight before payday |
| Budget exceeded | Past your plan this month. Adjust the plan? |
| Overdue! | Due 3 days ago. Pay now or change the date? |
| You missed 6 days | Welcome back |

**How we'll know it's working.** The data is encrypted, so we can't see how people use the app. Two privacy-safe options: anonymous counts people opt into (did the app get opened this week, was catch-up used; never amounts or names), and an occasional one-tap question: "How do you feel after opening Finance Flow? Calmer · Same · Worse."

## A smarter app

All of the learning can happen on the phone, from the household's own history, so the "nobody else can read your data" promise stays true. Three smart features fit version 3: habit suggestions (your coffee example), a pay-this-off-first plan, and cut-back ideas when bills fall behind.

**One important limit.** Your data is encrypted before it leaves the phone, so our side can't study it. That rules out big cloud AI, but simple pattern-spotting (what, how much, what time, how often) works well on the phone, and "it learns on your phone" is a selling point. If an AI feature that sends data out is ever added, it must be something people switch on knowingly.

The app already has the building blocks: repeats ("Make it repeat", with "Ask before adding"), category rules, and the To review screen with Approve all.

**A. Habit suggestions**

- **How it learns:** the same thing (label or payee), a similar amount, around the same time of day, on most days of the last 3 weeks. Example: coffee, about ₱150, logged around 8 AM on 12 of the last 15 weekdays.
- **How it asks:** at the usual time, "Coffee this morning? ₱150 from GCash." Tapping opens the app on a filled-in card: Log it · Change · Not today. The same card shows on Home as "Usually around now".
- **Also while typing:** "co…" suggests "Coffee ₱150 · GCash".

Rules so it helps and doesn't annoy:

1. Never saves money without a tap, unless you switch "Add automatically" on for that habit.
2. Says why: "You logged this 12 of the last 15 weekdays." Unexplained guesses feel creepy.
3. Learns from "Not today". After 3 skips in a row: "Stop suggesting coffee?"
4. If you log it yourself, the suggestion for that day disappears, so nothing is counted twice.
5. Habits are per person. Your coffee isn't your partner's.
6. At most 3 suggestion reminders a day, and none during quiet hours.

One thing to test before promising it: logging straight from the notification, without opening the app, may not work reliably on Android when the app is closed. Opening the app on the filled-in card is the safe first version.

**B. Behind on bills: cut-back ideas**

It starts when a bill or debt is overdue, or when Left to Spend can't cover the bills due before the next payday.

- **The problem, with a number:** "You're ₱2,400 short for bills due before payday (Oct 25)."
- **Ideas, easiest first:**
  - Subscriptions: "Netflix ₱549. Pause it this month?" (the Subscriptions page already tracks these)
  - Flexible spending compared with your usual: "Food delivery ₱3,100 this month, ₱1,800 usual. Skipping 2 orders saves about ₱800."
  - Habits: "Coffee ₱150 × 10 weekdays left = ₱1,500. Brewing at home 3 days saves ₱450."
  - Moving money: "Your Travel pot has ₱5,000." (never the emergency pot first)
  - More time: a short script for asking the biller for an extension or a payment plan.
- **You choose:** tick the ideas you'll try, and the app turns them into a small plan and adjusts your envelopes.

The tone is "ideas you can try", never orders. A line on the screen says they're ideas, not financial advice.

**C. Pay this off first**

Pick a debt, loan or card, and the app shows:

- what's left, the interest rate (debts and loans already have an optional field for it) and the minimum;
- "Pay ₱1,000 extra a month → paid off by March, saving about ₱2,300 in interest", with a slider to try other amounts;
- where the extra could come from (the ideas in B);
- for all debts together, the two well-known orders side by side: smallest balance first (quick wins that keep you going) and highest interest first (saves the most money). You pick one;
- progress afterwards: percent paid off, a small celebration at each quarter, and the plan adjusts when you pay extra.

**D. Later ideas**

- Categories filled in from your own history (it learns that "Jollibee" is Food).
- Month-end forecast: "At this pace you'll have about ₱1,200 left on payday."
- Unusual spending: "Electricity ₱4,800, about 60% more than usual."
- A bill's amount changed, or the same charge appears twice.
- Payday patterns: "Your pay usually lands a day early."

How these split between free and Premium is in the Premium section.

## Support and FAQ

Put a searchable Help section inside the app that works offline, plus a simple Contact us that sends app details but never financial data. Most questions will be about passwords, phones, sync, reminders and balances that don't match the bank.

**How to offer support**

1. **Help and FAQ in Settings.** Built into the app so it works offline. Searchable, short answers, with pictures where it helps.
2. **Help where it's needed.** A small "?" on tricky screens: the Accounts balance date, the Recovery Key, joining a household, Left to Spend.
3. **Contact us.** A short email form that attaches the app version, phone model, Android version, sync status and the last error code. Never amounts, names or labels, and people can see exactly what's attached before sending.
4. **Crash reports.** Today we only hear about a crash if someone tells us. A crash reporter (Firebase Crashlytics or Sentry) with all financial data removed fixes that.
5. **Saved replies.** A support inbox with ready answers for the common questions, so replies stay consistent and quick.
6. **Scam warning.** One line at the top of Help: "Finance Flow will never ask for your password or Recovery Key."

**What people will need help with**

| Topic | Example question | How we prevent it or answer it |
| --- | --- | --- |
| Forgot password | "I reset my password and my data won't open" | Recovery Key at setup; Forgot password flow; household approval |
| New or lost phone | "I got a new phone. How do I move my data?" | Step-by-step Help; sign out the old phone from Active devices |
| Someone used my phone | "My kid deleted things" | Lock settings, Hide amounts, an activity log with undo |
| Unknown device | "There's a phone in my device list I don't know" | Sign it out, change password, Help article |
| Fake support | "Someone messaged me asking for my Recovery Key" | The scam warning; we never ask |
| Partner can't see my entries | "My changes disappeared" | A sync status screen; the sync fix (Risk 3) |
| Leaving a household | "We separated. Who keeps the data?" | Clear rules shown before leaving: each person keeps a copy; Help explains it gently |
| Emergency access | "My partner is in hospital. Can I see the bills?" | Later: a trusted person who can request access |
| Balance doesn't match the bank | "The app says ₱8,200, my bank says ₱7,900" | Balance-date explanation; a Match my bank helper that shows the difference and likely causes |
| Left to Spend looks wrong | "Why is it so low?" | "How is this worked out?" breakdown on tap |
| Duplicates | "Everything shows twice" | Duplicate finder; import checks |
| Reminders not coming | "I didn't get the payday reminder" | Battery-saver steps for Xiaomi, Oppo, Vivo, Realme, Huawei and Samsung; a Test my reminders button |
| Too many notifications | "It keeps buzzing" | One switch per reminder type; quiet hours |
| Import failed | "My bank file won't import" | The new importer; a sample file to download |
| Get my data out or delete it | "Delete my account" | Export (CSV or PDF) and Delete account in Settings |
| Premium and billing | "I was charged", "Restore on my new phone" | Clear trial terms; Restore purchase; Help links to Google Play refunds |
| The app won't open properly | Stuck loading, blank screen after an update | Crash reports; a "Re-download my data" repair step |
| Text size and colours | "The text is too small" | Text size in Appearance; test layouts at the largest size |

**Things people may ask for that the app doesn't do yet**

- **Other currencies,** for OFW pay in dollars, riyal or dirham, or trips abroad.
- **Paluwagan:** tracking a rotating savings group, who has paid and whose turn it is.
- **Utang reminders:** a ready text message for someone who owes you, from the Loans page.
- **13th-month pay planning:** deciding ahead where it goes.
- **Bank statement PDFs:** importing the PDFs that banks and e-wallets email.
- **Receipt scanning:** reading the amount and shop from a photo.
- **Home screen widget:** Left to Spend at a glance.
- **Voice entry:** "Coffee 150".
- **Filipino or Taglish wording** as a language choice.
- **A printable monthly report** for a lender or for your own records.

## Premium and the free trial

Keep everything people need to stay safe and in control free, and make Premium the "it does it for you" layer: smart suggestions, pay-off plans, cut-back ideas and forecasts. After a month of that help, going without it is what people will feel.

**Free, always**

- Unlimited transactions, accounts, bills, debts, loans and pots. The current Premium page lists "Unlimited transactions" and "Multiple account support" as benefits, which suggests the free app has limits it doesn't have. Those lines should go.
- Bill and payday reminders. A missed bill costs the user money, and charging for the thing that prevents it would hurt trust.
- Encryption, offline use, locking, export, delete account.
- Left to Spend, the calendar, this month's reports, envelopes.
- Catch-up mode and the calm Home, because those are what bring worried people back.
- Basic CSV import.
- A shared household of 2 people (see Questions).

**Premium**

| Feature | Why it's worth paying for |
| --- | --- |
| Habit suggestions and one-tap logging | Saves time every day; the stickiest feature |
| Pay this off first planner | Shows the date you'll be debt-free and the interest you'll save |
| Cut-back ideas when money is tight | Turns a bad moment into a plan |
| Forecasts | Month-end prediction and cash flow 3 to 6 months ahead |
| Insights | Unusual spending, bills that changed, the full year in review |
| Smart import | Bank presets, categories filled in, PDF statements later |
| Bigger households | 3 to 6 people, all covered by one subscription |
| Receipt photos | Photos cost us storage once they're stored properly (Risk 1) |
| Backup history | Restore your data as it was on any day in the last 30 days |
| Themes, app icons, extra profile photos | Nice to have |
| Priority support | Faster replies |

**The one-month free trial**

| Option | How it works | Trade-off |
| --- | --- | --- |
| No card needed (recommended) | Every new household gets 30 days of Premium automatically | Fewer people pay at the end, but nobody feels tricked, and it suits a money app |
| Google Play trial | Needs a payment method first and turns into a paid plan unless cancelled | More people pay, but forgotten trials lead to refunds and 1-star reviews |

**Using "losing it" fairly**

Your idea is sound: people value what they already have more than what they might get. During the trial the app builds things that visibly belong to them, so the end of the trial feels like losing those things.

1. **Build it up during the trial.** "23 habits learned", "Your pay-off plan is 2 months ahead", "About ₱1,200 not spent on delivery since you started". Every number must be true and measured from their own data.
2. **Five days before the end:** "Your Premium month ends Sunday. Here's what it has done for you," listing their real numbers.
3. **At the end, pause, don't delete.** "Your smart features are paused." Habits and plans stay saved for 90 days, shown greyed out with Resume. Coming back is instant, which makes the loss feel real and the return easy.

What never to do: lock or hide people's own data, fake countdowns, guilt-trip buttons ("No thanks, I like wasting money"), or make cancelling hard. Google Play requires clear trial and price terms, and these tricks also earn the reviews that keep new users away.

**What Premium needs before it can exist**

- The app published on Google Play, using Google Play's billing. A subscription service such as RevenueCat manages trials and renewals.
- Delete account inside the app plus a web page for deletion requests. Google Play requires both for apps where people create accounts ([Google Play help](https://support.google.com/googleplay/android-developer/answer/13327111)). The app doesn't have this yet.
- A privacy policy and the Play Store's Data safety form.
- A small server-side check that someone really has Premium. That likely means Firebase's pay-as-you-go plan with a spending alert.
- Final prices. The placeholder is ₱99 a month or ₱950.40 a year; worth comparing with similar apps before deciding.

## Linked households: owner, merging and who added what

Your rules work, with one change I'd suggest: instead of the owner deleting the joiner's entries after a merge, the owner approves the merge before it happens. Nothing is added and then taken away, and nobody's data disappears without warning.

**How it works today (and one risk I found)**

- The person who starts the household is its owner.
- When someone joins, they pick Keep mine, Keep theirs or Merge both. **Keep mine replaces the whole household's data with the joiner's.** Someone joining an existing household could wipe out the owner's records. Under your rule, the joiner only gets Merge or Keep the household's data, so Keep mine goes away. This is a 2.1 fix.
- When the owner leaves a household of two, the household is closed. With three or more, the owner leaves and the others carry on.
- Nothing records who added an entry.

**Joining, the new way**

1. The owner makes an invite code, so the owner is clear from the start.
2. The joiner picks Bring my data (merge) or Start fresh (keep the household's data). Their own data stays saved on their phone either way.
3. Bring my data sends the owner a request: "Ana wants to bring 48 transactions, 3 bills and 2 accounts." The owner taps Bring all, Choose, or Don't bring, and can open the list first to spot duplicates.
4. The joiner is told what happened: "Cath added 45 of your 48 entries. 3 were left out as duplicates." Left-out entries stay on the joiner's phone, so nothing is lost.
5. Later removals: if the owner deletes something the joiner added, the joiner gets a small notice, and the item sits in Recently deleted for 30 days so it can be restored.

**Who added what**

- Every new entry saves who added it, and who last changed it.
- Lists show a tiny avatar on each row, and the details page says "Added by Ana · Oct 17, 9:14 AM".
- A filter on Transactions: Everyone, Me, Ana.
- Possible duplicates get a gentle flag: "Ana logged ₱1,250 Meralco on the same day. Same payment?" with Keep both or Merge.
- Entries made before this feature show "Added before tracking started".

**When the owner leaves**

| Situation | What happens |
| --- | --- |
| Owner leaves, other members stay | Before leaving, the owner picks the next owner. The app suggests the longest-standing member. |
| Household of two | The other person becomes owner and the household carries on. Today it closes instead. |
| Owner wants to step down but stay | Hand over ownership from Members at any time. |
| Owner deletes their account | Same as leaving: pick a successor first. |
| Owner disappears (lost phone, no reply) | After 60 days without the owner opening the app, a member can ask to take over. The owner gets a notice and 7 days to say no. |
| Who pays for a Family plan | The owner. Members keep Premium while they're in the household. |

The owner can remove members, approve merges and hand over ownership. Everyone can add and edit entries. Changing ownership needs a security rules update, so I'll show you the rules change before you publish it.

## Paying part of a bill (your Meralco example)

Debts already handle this: pay what you can and the unpaid part is added to the next due amount. Bills don't: Mark as paid only pays the full amount. The fix is to give bills the same "Pay part of it" option, and to show the carried amount separately so nobody confuses it with a bigger bill.

**Your example, step by step** (amounts made up)

|  | October bill | November bill |
| --- | --- | --- |
| New charges | ₱12,400 | ₱3,100 (you type it when the bill arrives) |
| Carried from last time | — | ₱9,400 |
| Total due | ₱12,400 | ₱12,500 |
| You pay | ₱3,000 (Pay part of it) | whatever you can |
| Left over | ₱9,400, carried to November | carried again if needed |

What you'd see:

- **The pay sheet** has two buttons: Pay all ₱12,400 and Pay part of it. Part shows: "₱9,400 will be added to your next Meralco bill."
- **The bill page** shows the two lines (New charges, Carried from last time) and a small "Paying in parts" label, so you can see it hasn't been forgotten.
- **When the new bill comes**, the app asks only for the new charges and adds the carried amount itself.
- **Left to Spend and the calendar** count only what you still plan to pay, so the leftover doesn't vanish or get counted twice.
- **A gentle check-in** when a bill has been carried 3 months in a row: "Meralco has carried a balance since August. Want a plan to catch up?" This opens the pay-off planner from A smarter app.
- **Fees:** the existing late fee field adds any fee to the next bill.

**Bills, debts and loans: how each handles part payments**

| Kind | What it's for | Paying part of it |
| --- | --- | --- |
| Bill | Something that charges you every period (Meralco, water, internet) | New: the unpaid part is carried to the next bill |
| Debt | Something you owe that has a minimum (credit card statement, store installment) | Already works: pay at least the minimum; the rest stays owed |
| Loan | A fixed amount you borrowed or lent, paid down over time | Already works: every payment lowers what's left, any amount |

One rule keeps it simple: a part-paid bill stays a bill. You never have to move Meralco into Debts.

## Credit cards

Today a card is just one number, and the app adds it to your total as if it were money you have: your Accounts page shows ₱5,855.07, which is Maribank ₱2,030.11 plus Atome ₱3,824.96. A card should instead track three things, its limit, what you owe and what's left to use, and its statement should appear in To-Pay by itself, so you never have to copy it into Debts.

**What a card would show**

|  | Example |
| --- | --- |
| Credit limit | ₱10,000 |
| You owe | ₱10,000 |
| Available to use | ₱0 |
| Next statement | ₱10,000 · minimum ₱500 · due Nov 5 |

The Accounts page total becomes cash plus debit only (₱2,030.11 in your screenshot). Cards get their own line: "Owed on cards ₱10,000 · Available ₱0".

**Your example, step by step**

1. **Spending with the card.** Each purchase is logged as spending, paid with Atome. It counts in this month's spending and envelopes when you buy. You owe more and have less available.
2. **Statement day.** The app adds "Atome statement ₱10,000, minimum ₱500, due Nov 5" to To-Pay. Nothing to type, and no separate debt to create.
3. **Paying it.** The pay sheet offers Pay in full ₱10,000, Pay the minimum ₱500 or Another amount, from Maribank, with an honest comparison:
   - "Pay the minimum: ₱9,500 stays in Maribank for your other bills this month. Interest next month: about ₱300."
   - "Pay in full: no interest."
4. **After paying ₱500.** Maribank goes down ₱500, you owe ₱9,500, and ₱500 is available to use again: "₱500 freed up on your Atome card." The payment is not counted as new spending, since the purchases already were. That stops the card being counted twice.
5. **Next statement.** It shows the unpaid ₱9,500, the interest, and any new purchases. Interest counts as a cost, so it shows in your spending and reports. The app estimates it from the card's monthly rate; you confirm the real number from your statement.
6. **Paid in full.** You owe ₱0 and the whole ₱10,000 limit is available again.

**Extras that make cards easier**

- **Installments.** Atome and many cards split a purchase into 3, 6 or 12 payments. Log it once with "Split into 3 payments", and each statement includes that month's part.
- **Gentle warnings.** "You've used 80% of your Atome limit", and "Using freed-up credit adds to next month's statement."
- **Pay-off plan.** "Pay ₱1,500 a month and it's cleared by March, about ₱900 in interest." (A smarter app, part C)

**Moving existing cards over.** The first time version 3 opens, it asks once per card: "Is ₱3,824.96 what you can still use, or what you owe?" and "What's the limit?" Nothing changes until you answer.

## Home screen widgets

Start with a quick-add widget that shows no money at all, only buttons, so nothing private sits on the home screen. A widget that shows balances comes second, with Hide amounts on by default.

| Widget | What it shows | Privacy |
| --- | --- | --- |
| Quick add (first) | Money out · Money in · your top 2 habits ("Coffee ₱150"). Tapping opens the app straight on a filled-in form. | Shows no amounts you haven't chosen |
| Left to Spend | "₱4,200 left until payday (Oct 30)" | Hidden until you tap, by default |
| Next bill | "Meralco · due in 3 days" | Bill name only; amounts optional |

Things to know:

- Widgets don't work in Expo Go, only in a real build, so testing them needs a new build.
- Android comes first, using a widget add-on built for Expo apps. iPhone widgets need a newer version of Expo than the app uses now, so they come with the iPhone version.
- A locked app stays locked: tapping the widget still asks for your fingerprint or PIN first.
- What the widget shows is a small copy kept on the phone. It updates when you use the app and every few hours.

## Premium plans and codes for friends

Using your answers: three plans like Spotify's, a 30-day trial with no card, and a way to give Premium to yourself and friends for free.

| Plan | Who | Price |
| --- | --- | --- |
| Individual | 1 person | \[PRICE\] |
| Duo | 2 people in one household | \[PRICE\] |
| Family | 3 to 6 people in one household | \[PRICE\] |

The household owner pays, and everyone in the household gets Premium. All plans include the trial.

**Codes for you and close friends:** Google Play's own promo codes only give a free trial, and still ask for a payment method. For free use without paying, the better tool is the subscription service (RevenueCat), which can give Premium straight to an account with no store and no card involved.

1. Your own account: given Premium permanently from the subscription dashboard.
2. Friend codes: you make a code such as CATH-FRIENDS-01, set how many people can use it and for how long (or forever). A friend types it in Settings › Premium › Have a code?
3. Our small server checks the code, grants Premium, and counts the uses. You can switch a code off anytime.

This needs the server piece listed under "What Premium needs before it can exist", so it arrives with Premium itself.

## Opening smoothly, online and offline

The biggest delay is in the code, not the phone: a linked household (like yours) signs in over the internet every time the app opens, before it shows anything. Offline, it can't open at all and drops to the sign-in screen with "Couldn't sign you in automatically". Single-person accounts already open offline.

**What happens at launch today**

1. The opening animation plays.
2. The saved sign-in is read from the phone.
3. Single-person account: your password is turned into your key on the phone, your data opens from the phone, and Home shows. Works offline.
4. Linked household: the app signs in to Google's service, downloads your keys, downloads the household's data, then shows Home. Each step waits for the internet.

Step 3 also does a deliberately slow calculation that protects your password, which may cost a second or more on cheaper phones. I'll measure it before changing anything.

**The fix: open from the phone first, then sync**

- Every account opens straight from the copy saved on the phone, linked or not, online or offline. Home appears right after the opening animation.
- Signing in and fetching your partner's changes happen in the background, with a small "Updating…" line that disappears when done.
- If the phone was signed out from another device, the app still locks itself as soon as it finds out.
- Offline, you're in with the offline banner showing, instead of the sign-in screen.
- Each screen draws instantly from saved data and never waits on the internet. Anything slow shows a short loading animation, never a frozen screen.

This touches how keys are kept on the phone, so I'll explain exactly what changes before building it.

**How we'll measure "smooth"**: time from tapping the icon to seeing Home, online, offline, and on a slow connection. Target: under 2 seconds after the opening animation, and the same offline as online.

## Testing on Android and iPhone

Yes, most of the checking can move off your phone. Some things still need your eyes and hands, so your phone becomes the last check instead of the first.

| Way | What it catches | What it needs |
| --- | --- | --- |
| Automatic money checks | Mistakes in the maths: carry-overs, cards, back-dating, Left to Spend, imports. I run them after every change, before you see anything. | Nothing from you. Free. |
| Automatic tap-through tests in Expo's cloud | Screens that break or crash. Scripted taps run on an Android emulator and an iPhone simulator, with screenshots for each step. | An Expo account (you have one). Uses build time from your Expo plan; a paid plan may be needed if we run it often. No Mac needed. |
| Android emulator on your PC | The same tap-through tests, run on your computer. | Android Studio installed, and Claude Code running on your PC or linked to this chat. |
| A real iPhone | How it looks and feels on iPhone, Face ID, notifications | Borrow one with Expo Go (free) for quick looks. Installing real iPhone builds needs Apple's developer program ($99 a year). |
| Your phone | Smoothness, looks, fingerprint, reminders, real offline | You, at the end of each batch |

I can't run a phone emulator inside my own workspace (it doesn't have the hardware for it), which is why the cloud and your PC are the options. My suggestion: start the automatic money checks right away in 2.1, then add the cloud tap-through tests once the Expo plan question is settled. iPhone builds can wait until there's an iPhone to try them on.

## Top bar alignment (from your screenshots)

On all 8 pages you sent, the Add button and the back label start and end on exactly the same pixel rows (rows 145 to 173 of 2,400), so they are mathematically level. What the eye catches is the letters: "Add" is all tall letters (A, d, d), while "Plan", "Home" and "Transactions" are mostly short ones, so Add's weight sits higher.

- **Fix to try in 2.1:** move only the right-side word buttons (Add, Edit, Move money, Approve all) down 1 point, about 3 pixels on your phone. Then you judge it side by side.
- **Transactions tab:** the Recurring and Search icons sit on the empty top row, about 100 pixels above the title. They move down onto the "Transactions" title line, as iPhone apps do.

## Everything that could go wrong

Three problems found in today's code matter more than anything else in this plan, because they can lose or block real data. They should be the first version 3 work, before any new feature.

**Risk 1. One receipt photo can stop the household from syncing.** Receipt photos are saved at nearly full size inside the shared household data. A phone photo at the setting the app uses is often more than 1 MB, and storing it as text makes it about a third bigger. Firebase allows at most 1 MB per stored item ([Firebase limits](https://firebase.google.com/docs/firestore/usage)), so one photo can be bigger than the whole allowance. After that, every save fails with "Sync Failed" until the photo is removed. **Until it's fixed, don't attach receipt photos.** Fix: shrink photos to about 150 KB, store them separately from the main data, and refuse anything that would go over the limit.

**Risk 2. The whole household lives in one item with a 1 MB ceiling.** Every transaction, bill and photo is locked together into one stored item. By my estimate, a busy household (about 8 entries a day) reaches the limit in roughly a year. Profile photos make it sooner: each can take about 100 KB once locked, and each person can keep 4, so two full photo sets use most of the space on their own. When the limit is hit, syncing stops for everyone in the household. Fix: shrink the text before locking it (it compresses well), keep photos separate, split the data by year, and show a storage meter that warns at 70%.

**Risk 3. Two people editing at once can lose one person's changes.** Each save sends the household's entire data and replaces what's stored. The other phone then swaps its copy for the incoming one. If both of you save within moments, or one phone was offline, the later save wins and the other person's change disappears. Fix: before saving, fetch the latest copy, merge item by item, and save only if nobody changed it in between. Deleted items get marked as deleted, so a merge can't bring them back.

The rest, grouped by area:

**Data and sync**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| Forgotten password and no Recovery Key | The data is lost for good | Recovery Key at setup, gentle reminders, household approval |
| Logging out with changes still waiting | Those changes may never reach the cloud | Warn first; try to sync before logging out |
| Slow or expensive mobile data | Every save sends the household's whole data; slow saves show a false "Sync Failed" | Compress, later send only what changed, retry quietly |
| Space on the phone | Android keeps this kind of app data in a small space shared by every account on the phone | Move large data into files |
| An app update changes how data is stored | An older app on your partner's phone misreads newer data | Label every save with a data version; an older app asks to be updated instead of guessing |
| The exported backup | It's a plain, readable file, a copy stays in the phone's temporary folder, and there's no way to restore from it | Delete the temporary copy, warn before sharing, add a password-locked export and a Restore |
| Firebase is down | Nothing syncs for a while | The app keeps working offline; a short status note |
| The phone's clock is wrong | Entries get the wrong date | Warn when the phone's time is far from the real time |

**Security and privacy**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| No App Check yet | Other software can misuse our Firebase project: fake sign-ups, extra costs | App Check (already planned) |
| Email never checked | Typos, sign-ups with someone else's email, reset emails that go nowhere | Verify the email at sign-up |
| Shared phone with Lock set to Never | Anyone holding the phone sees everything | The setup question in Locking |
| Recent-apps preview | Balances show when switching apps | Blur the app when leaving it |
| Lost or stolen phone | Someone opens the app | Sign out remotely from Active devices; Help article |
| Scam messages | Someone gives away their Recovery Key | "We'll never ask" warning in Help and at setup |
| A new feature loosens the cloud's security rules | Data could be exposed | Every rules change reviewed and tested on the phone before you publish it |
| Paying for Premium | — | Google Play handles payment; we never see card details |

**Money logic**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| Back-dated entries before the balance date | The balance doesn't move and it looks like a bug | The note and choice in Back-dating |
| Rounding | Totals drift by a centavo over many entries | Round every total; later store amounts in whole centavos |
| Short months and leap years | A bill due on the 31st in February | Tests for those dates in repeats and reminders |
| Travelling across time zones | Entries land on the wrong day | The app follows the phone's clock; the travel note explains it |
| Transfers counted twice | Spending looks higher than it was | Transfer detection (also in import) |
| Paying off a credit card | Counted as spending a second time | A clear card-payment flow and a Help article |
| More than one currency | Wrong totals | Multi-currency support later |

**Reminders**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| Battery savers on Xiaomi, Oppo, Vivo, Realme and Huawei phones | Reminders never arrive | Brand-by-brand steps in Help and a Test my reminders button |
| Newer Android delays exact alarms | Reminders arrive late | Ask for exact timing where Android allows; accept a few minutes' delay |
| Reminders only refresh when the app is opened | The people who stop opening the app stop getting reminders, exactly the people version 3 is for | Schedule further ahead, plus one gentle "We miss you" reminder |
| Reminder text is written in advance | An amount in the reminder can be out of date | Keep the wording general, or refresh it on each open |
| iPhone allows 64 waiting reminders | Some reminders are dropped | Prioritise the important ones when the iPhone version comes |

**Phones, builds and updates**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| Google Play requires apps to keep up with new Android versions | Updates are blocked on Play | One upkeep update a year |
| Works in Expo Go, fails in the real build | Bugs reach real users | Test on side-by-side builds before release |
| Older, cheaper phones | Screens feel slow | Test on a low-end phone |
| The largest text size | Words are cut off | Check every screen at the largest size |
| No crash reports | Crashes go unseen | A crash reporter |

**Publishing and business**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| No Delete account | Google Play rejects the app | In-app deletion and a web page |
| No privacy policy or Data safety answers | Rejected or removed from Play | Write them before publishing |
| Firebase's free daily limits as users grow | Syncing stops for a day when the limit is hit | Watch usage; pay-as-you-go plan with a spending alert |
| Trial abuse with new accounts | Free Premium forever | One trial per email and household |

**People and trust**

| Risk | What would happen | How we prevent it |
| --- | --- | --- |
| One partner deletes or changes the other's entries | Arguments, lost data | An activity list (who changed what, when) with undo |
| A couple separates | Confusion about who keeps the shared data | Clear rules shown before leaving: each person keeps a copy |
| Too much at once | People quit | The version 3 focus |
| Wrong smart suggestions | Annoying or creepy | Explain why, easy to dismiss, learn from "Not today" |
| Too many notifications | People switch them all off | A daily cap and quiet hours |

## Proposed order of work: version 2.1, then version 3

Your split is right. Version 2.1 makes what already exists safe, correct and smooth, with no big new screens. Version 3 brings the new features. Each numbered step is one or two small batches you test before the next one starts, and anything new or visual gets a mockup first.

**Branches:** a new `v2.1` branch from `main` for the polish. It's merged into `main` as version 2.1.0, then `v3` picks up from there.

**Version 2.1: safe, correct, smooth**

1. Check the Finance Flow 2 build and the six add forms on your phone (no code).
2. The three data risks: receipt photos, data size (compress and a storage meter), and merge before saving, plus the "changes haven't synced" warning on Log out.
3. Remove "Keep mine" when joining a household, so a joiner can never replace the household's data.
4. Open from the phone first, so the app opens smoothly online and offline.
5. Quick fixes: the "@", the member notes, top bar alignment (including the Transactions icons), the payday reminder time, the Quick unlock footer.
6. Offline messages: swipe-away banner, the "saved on this phone" note, the "needs the internet" sheet, the join check, quiet retries.
7. Pay part of a bill (Meralco), the Date row for back-dating, and the balance-date note.
8. Page and tab transitions, from the samples you pick.
9. Automatic money checks, running alongside every step from step 2.
10. A Finance Flow 2 test build, then the normal build that updates your app to 2.1.0, and the merge into `main`.

**Version 3: new features**

1. The calm app (the focus): the word pass, Calm Home, Catch-up mode, the weekly check-in, progress first.
2. Credit cards done properly: limit, owed, available, statements in To-Pay, installments.
3. Linked households: approving merges, who added what, handing over ownership.
4. Lock and privacy.
5. The new CSV importer.
6. Smart features: habit suggestions, the pay-off planner, cut-back ideas.
7. Widgets (Android first).
8. Accounts: email check, Recovery Key at setup, Forgot password, Delete account.
9. Help and FAQ, Contact us, crash reports, cloud tap-through tests.
10. Publishing and Premium: App Check, privacy policy, Google Play listing, plans, the free trial, friend codes.

**After version 3:** Google and Apple sign-in (option B), the iPhone version and iPhone widgets, more currencies, paluwagan, PDF statements.

## Cath's notes, 2026-10-18 (to do in version 3)

- **Peel-off Appearance switches (later, before finishing version 3):** instead of a plain toggle, the setting (e.g. Light / Dark) peels off like a sticker; while peeling, the "on" look peeks from underneath; peeling it fully off turns it on, peeling it back returns to the default. Make a mockup first. Not a priority now.
- **Swipe actions** on To-Pay (bills, debts, loans), Savings, Groceries, Events and Travel. Tap keeps working. Mockup first.
- **Travel to-do list:** budget on the left, to-do list on the right, so trip notes live in the app. Mockup first.
- **Time-of-day glow on every screen** (not just Home and sheets); the sun rays, rain and stars stay on Home only.
- **Calm Home:** C1 was too wordy; keep today's Home look and find a calmer way. Welcome back (C2) after 3+ days away, merged with "Since you last looked" (C5). Weekly check-in (C3) only when reports are turned on (monthly default, quarterly option, asked once after a month). C4 "short before payday, 3 ways" shows on opening the app when Left to Spend runs out before payday, with a Settings switch.
- **Credit cards:** K1 in the app's own colours; K3 redesigned with the Income section kept.
- **Loading animations** for creating an account, setup and Quick unlock (done in 2.1).

## Questions for you

These decide what gets built. Type your answer in the last column, or comment on a row.

| # | Question | My suggestion | Your answer |
| --- | --- | --- | --- |
| 1 | Start with the three data risks before the quick fixes? | Yes. Risk 1 can break syncing today. | yes |
| 2 | Have you or anyone in your household attached a receipt photo? | If yes, we check that entry first | no |
| 3 | Remove the similar note in setup ("Your username stays the same") too? | Yes, remove both | yes |
| 4 | For "Add": which page, and what should it line up with? A screenshot helps. | Nudge all word buttons 1 point down, then compare | i will attach a screenshot. for the add in accounts, it should be align to \<home, for the add in income, it should align to \<transactions, this is not an add button, but i would like the recurring button as well as the search button to align to transactions, the add button in savings, yearly goals, shared expenses, groceries, travel, and events should align to \<plan |
| 5 | Sign in with just email and password (the app finds your username)? Needs a security rules change. | Yes | yes |
| 6 | Google and Apple sign-in: option A, B or C? | B, after version 3 | agree |
| 7 | Ask "Do other people use your phone?" at setup to choose the lock? | Yes | yes |
| 8 | Personal spending money for couples (the partner sees one line, not every purchase)? | Worth a mockup | yes |
| 9 | Free households: 2 people free and bigger households Premium, or every size free? | 2 free, 3 or more Premium | my idea is that there would be a different premium amount for a single user, there's a different one for due, then family plan for 3 or more, more of like how spotify premium does it, or if you have other suggestions |
| 10 | Free trial with no card needed? | Yes, 30 days | agree |
| 11 | Opt-in anonymous usage counts and the "How do you feel?" question? | Yes, both off until people agree | yes |
| 12 | Which banks and e-wallets should the importer know first? Can you share an export with numbers and names blanked out? | Start with the ones your household uses | let me know how we could do this |
| 13 | Which email address should support messages go to? | A new one just for Finance Flow | yes, let's create a specific email for this |

**Sharing a bank file safely (question 12).** In your bank or e-wallet app or website, look for Download statement or Export transactions and pick CSV or Excel. Open it in Google Sheets, keep the header row and 5 to 10 rows, then replace names, account numbers and reference numbers with X. Change the amounts to made-up numbers, but keep their exact style (minus signs, commas, "CR"). Don't change the dates' style either. Attach the file here. A PDF statement is useful too, for later.

**More questions (Oct 17)**

| # | Question | My suggestion | Your answer |
| --- | --- | --- | --- |
| 14 | Start a `v2.1` branch from `main` now for the polish work? | Yes |  |
| 15 | Which page transition and which tab transition? (see the samples canvas) | Pages: 3 Paper slide. Tabs: B Quick fade. |  |
| 16 | When someone joins with their data, the owner approves it before it's added, instead of deleting it after? | Yes |  |
| 17 | If the owner hasn't opened the app for 60 days, a member can ask to take over, with 7 days for the owner to say no? | Yes |  |
| 18 | Card purchases count as spending when you buy, and paying the card is just moving money? | Yes |  |
| 19 | Are you on Expo's free plan? Cloud tap-through tests may need a paid one. | Check at expo.dev, Billing |  |
| 20 | Once you've made the support email, what's the address? | A Gmail just for Finance Flow |  |
