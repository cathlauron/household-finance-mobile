Household Finance Mobile App (Finance Flow) — Progress Log 7: Version 3

>>> START HERE (2026-10-16): This is the ACTIVE progress log. Version 2.0.0 is finished and
>>> merged into `main` (merge commit 9ae00f9). ALL new work happens on the `v3` branch.
>>> Read the "▶️ Next step" section at the bottom first.
>>> NEWEST (2026-10-27, wrap-up): VERSION 2.2.0 (versionCode 4) MERGED INTO `main`
>>> (merge 035628f; main = v2.2 exactly). Cath builds it, then tests TEST-2.2-FINAL.md
>>> (54 checks, one pass by screen). New work continues on `v3`. Security SEC-1..7 wait.
>>> NEWEST (2026-10-26): red error + Home behind pages + switcher look fixed on v2.2/v3;
>>> phone checks TEST-2.2 AO; security decisions wait in BUG-HUNT.md (SEC-1..7).
>>> NEWEST (2026-10-23, smoothness): new standing skill finance-flow-smoothness-check
>>> (repo .claude/skills, also offered as a card). Sub-pages now follow your finger on
>>> v2.2/v3 (Cath's pick B). Phone checks TEST-2.2 section AM. Save gate is now
>>> `npm run check:all` (inside mobile-app). 4 motion questions wait in SMOOTH-HUNT.md.
>>> NEWEST (2026-10-23 morning, smoothness 2): Cath's 4 answers built, plus no flicker /
>>> overlap / smooth fades checked screen by screen (SMOOTH-HUNT.md). Phone: TEST-2.2 AM + AN.
>>> NEWEST (2026-10-21, wrap-up): VERSION 2.2 work lives on branch `v2.2` (v3 = same
>>> commit, 590fa50). It is NOT on `main` yet. Cath tested sections A-N on her phone in
>>> Expo Go (TEST-2.2.md on v2.2). Start with the "FIRST THINGS NEXT SESSION" list in the
>>> newest Next step bullet. Cath is moving to another Claude account (free-trial limit);
>>> mockup screenshots are in design/2.2-mockups/ on v2.2.
>>> NEWEST (2026-10-18, wrap-up): VERSION 2.1.0 IS FINAL and merged into `main` (2a3d886,
>>> versionCode 3). Next: Cath makes the EAS build, then runs the post-build check list
>>> (see the newest "Next step" bullet). v3 has 2.1 merged in.
>>> NEWEST (2026-10-16, later): the whole Version 3 plan is in V3-PLAN.md (repo root, on
>>> `main`). Read it before building anything; Cath's answers to its 13 questions decide
>>> the details. It also lists three data risks found in today's code (fix those first).

This file picks up from PROGRESS6.md, which is now CLOSED (kept for reference, no longer
updated). PROGRESS6.md holds the full detail of the design polish pass, the H and V series,
and R series sessions 1-5 (the version 2 redesign), with older session logs in
PROGRESS6-ARCHIVE-1.md and PROGRESS6-ARCHIVE-2.md. PROGRESS5.md (Quick Unlock, Finance Flow
rebrand) is PAUSED, and PROGRESS4.md, PROGRESS3.md, PROGRESS2.md, PROGRESS1.md and
PROGRESS.md are closed history. All progress files live at the REPO ROOT, on `main`.

=====================================================================
🧭 How we work (current, 2026-10-16)
=====================================================================
- Claude works on the repo directly in a Claude Code session: edits code on the `v3`
  branch, runs `npx tsc --noEmit` (inside mobile-app) until clean, commits and pushes to
  `v3`. If Claude can't attach the repo, Cath connects GitHub for that Claude account at
  claude.ai/code (the Claude GitHub App is already installed on the repo).
- PROGRESS7.md lives on `main` (repo root). Claude reads it from `main` and updates it
  there at the end of a session (additive only for the Tier 1 sections), and also pushes
  the same commit to `v3` so both branches carry it.
- After each change Claude gives PowerShell test steps (never bash), usually:
    cd C:\Projects\household-finance-mobile
    git pull
    cd mobile-app
    npx expo start -c
  plus exactly what to tap and what Cath should see.
- Cath tests on her phone and replies "device test is as described" (or sends
  screenshots). Only then move on. Never say something works on her phone before she
  confirms it.
- Small batches. Anything visual or new: show a mockup first (Design canvas artifact),
  build only after Cath approves.
- Ask before anything that touches security/encryption or could lose data. Never simplify
  encryption without asking.
- Cath's start-of-session terminal output (from the repo root):
    git status
    git log -1 --oneline
    git branch --show-current
- When version 3 is ready: merge `v3` into `main` (same as the 2.0.0 merge), bump the
  version, make the EAS build.

=====================================================================
🌳 Branches and versions
=====================================================================
- `main` = version 2.0.0, the finished version (merge of `redesign` at 9ae00f9; app code
  identical to redesign c814819, tsc clean). Do not commit app code directly to main.
- `v3` = all version 3 work. Made from main at 9ae00f9.
- `redesign` = retired (kept on GitHub, untouched; can be deleted later if Cath wants).
- A local `v2.0.0` git tag was made in Claude's session but could not be pushed (the
  connection kept dropping). Optional; nothing depends on it.
- Version number lives in TWO places, keep them in step: mobile-app/app.json (`version`
  and `android.versionCode`, currently 2.0.0 / 2) and SettingsScreen `APP_VERSION`
  ('2.0.0'). Bump both to 3.0.0 / 3 when version 3 is ready.
- Side-by-side test builds: mobile-app/app.config.js + eas.json profile "preview-v2"
  (env APP_VARIANT=v2) build a SEPARATE app "Finance Flow 2"
  (com.cathlauron.householdfinance.v2) next to the original. A normal "preview" build is
  unchanged and updates the original Finance Flow. For version 3 testing, the same trick
  can be reused (rename to "Finance Flow 3" / a .v3 ID if Cath wants a third app, or keep
  the v2 slot).
- Finance Flow 2 build (version 2.0.0): https://expo.dev/accounts/cathlauron/projects/mobile-app/builds/c35f77f6-677e-451d-b6a0-eac340b27b81
  Downloaded by Cath; not opened/tested yet. Same household data as version 1 (same
  Firebase project, signs in with the same account); its own PIN and phone settings.

=====================================================================
✅ Done (summary — full detail in PROGRESS6.md and the files it points to)
=====================================================================
- Phase A (Firebase Auth, household linking, account recovery, multi-device sessions).
- Phase B (B.1-B.14) and Phase B Part 2 (Iconization & Minimalism Pass).
- All 13 original on-device bugs, and bug #14 (report-switcher pills).
- Finance Flow rebrand (PC.0-PC.9).
- Quick Unlock Steps 1-5b (Step 6 checklist: see Open items).
- Design polish pass, H series (Home redesign), V series (mint base, accessible colours,
  shared components), Home/Calendar polish, rubber-band fixes (Bills, Person Spending
  done per Cath 2026-10-15).
- R series redesign (version 2.0.0), sessions 1-5 on `redesign`, now in `main`:
  - Session 1 (steps 1-21): every screen matched to the Claude Design mockups; full pages
    for bills, loans, cards, transactions; Home wallet; gradients; Insights page.
  - Session 2 (steps 22-37): falling leaves, offline banner, recurring, envelopes,
    cancel-by reminders, account pickers, pay-from sheet.
  - Session 3: sign in once, simple forms, Shared Expenses, income by person, saved
    profile photos (encrypted, up to 4), money colours.
  - Session 4: dark-mode leaves, sky glow, weather/rain, preferred name step, keyboard
    fix, Mark all as read, code sweep (~2,100 lines removed, loading states), cancel-by
    reminders notify, transfer fees reduce balances, travel time note, payday nudge,
    envelope alerts, month-end summary.
  - Session 5: Firestore security fixes 1-3 (live invite code to join a household;
    ownerless fallbacks removed; usernames claimed once) — rules PUBLISHED in Firebase
    Console and device-tested; keyboard sweep (KeyboardAwareScrollView); softer rays
    (option A); "Add" word buttons; trip checklist notes/colours; the six rebuilt add
    forms (unverified, see Open items); semibold header buttons (unconfirmed); version
    2.0.0; the Finance Flow 2 side-by-side build.
- 2026-10-16: `redesign` merged into `main` (9ae00f9, no conflicts); `v3` branch created.
  PROGRESS6.md closed; this PROGRESS7.md started.

- 2026-10-18 (v2.1, device-tested "as described"): missing-field help on all forms
  (Option B look: scroll, red tint + red label, message, cursor; amount first on bills,
  debts and loans, which now need an amount for new items); quick fixes (plain username,
  no member notes, Quick unlock footer, right-side word buttons 1 pt lower); storage
  parts steps 2-4 on test accounts (rules published, parts copied/checked/synced on
  testa/testb); the inviter now links as soon as the other person joins (on app open,
  account switch and app resume); inviter can read their own code after 15 min.
- 2026-10-18 (v2.1, built, NOT device-tested; Cath chose to test all at the end of 2.1):
  merge before saving (merge3.ts + transaction save + waiting changes kept across
  restarts); Log out warns about unsent changes; "Keep mine" removed for joiners; Paper
  slide pages (@react-navigation/stack) + slide-by-direction tabs; 19 money checks.

- 2026-10-18 (v2.1, final rounds; Cath device-tested "as described": the opening no
  longer freezes, the leaf tick save/add animation, the see-through tick card, the
  sign-in / account switcher look): loading in place (round 5/6): the screen's own logo
  draws itself with changing green words instead of a separate busy screen, on Sign in,
  Account switcher, PIN unlock, Create profile, Onboarding, Set PIN (now a bottom sheet),
  fingerprint / change password / recovery key / backup in Settings, household linking in
  Profile, recovery in Sign in, CSV import. Opening animation moved to Reanimated + one
  native clock (no freeze while unlocking). Leaf tick (round 7 option C) after every
  Save/Add/Pay/Move/Settle. Fixes: no credit card as a source in Transfer/Pot; refunds
  capped; Bills "No due date" section; edit sheets opened after the page slide
  (afterSlide, no flashing back); swipe between tabs; Travel page Budget | To-do.
  Round 8: date box for monthly/yearly bills, debts and loans (pick any day, month or
  year), loan "First payment" date, calendar month-and-year shortcut. Version 2.1.0.


- 2026-10-20 / 21 (version 2.2, branch `v2.2`, all pushed; v3 = v2.2): see the commit
  messages for detail. Opening speed (remembered unlocked key with the saved sign-in,
  native PBKDF2 module modules/ff-crypto with JS fallback, identical keys); saves run one
  at a time in the background with 3-way merge against the base (no lost partner
  changes), wait for saves on log out/switch; Delete at the bottom of bill/debt/loan/
  card/pot/trip pages; trip dates tap; Travel checklist ticks ask how it was paid (P1-P3);
  four ways to link (Send invite with link, Show QR, Scan to join, Type a code) and the
  invite web page on Firebase Hosting (hosting/join.html, live at
  https://household-finance-mobile.web.app); invite codes expire after 15 minutes unless
  used; welcome screens fixed; set-up look preview (leaves pause in place, Device);
  Pay wording; Over budget wording; overdue tags and priority (High/Medium/Low) on bills,
  debts and loans, Running low names the High ones; calendar rebuilt like the iPhone
  (slides up, year view, Scroll/Swipe, Compact/Details/List, tap a day, + on the day,
  projected balance); Edit on bill/debt/loan/transaction/pot/card pages opens the form
  right on that page (fixed the flashing found in Cath's video); "Are you still there?"
  after 5 minutes untouched with Auto-lock off (also with the screen dark), cover after a
  minute, Auto-lock sheet; Balance updates list on card pages; Custom repeat for bills
  and debts; swipe-to-delete closes on screen change and a quick flick changes tab;
  shared household: small letter on transactions others logged + Added by / Changed by.
  Website mockup (Design canvas): phone Home matches the app, QR install card, animated
  How it works.

- 2026-10-22 (bug-check setup, on `v2.2`/`v3`, new Claude account): Cath was worn out by
  "fixed" claims that weren't, and fixes breaking other things. Set up, with her approval:
  1. Skill `.claude/skills/finance-flow-bug-check/SKILL.md` (loads in every account once
     the repo is attached) + root CLAUDE.md pointing to it: proof before "fixed", every bug
     becomes a permanent check, Claude tests before Cath, bug hunts, ask never guess.
  2. Screen checks: jest-expo + React Native Testing Library (dev only; no app package
     changed version). `npm run test:screens`; first checks: amount box (5) and Plan tab
     rows (6). Both proven red-green (broken on purpose -> failed -> restored -> passed).
  3. Background tester: the app runs as a web build in a hidden browser in Claude's
     workspace (guest mode, never touches Firebase). `npm run browser:build`,
     `npm run browser:walk -- <steps>`; how-to and limits in BUG-CHECK-BROWSER.md.
  4. BUG-LOG.md: 40 past bugs Cath reported, the file each lives in, and which are guarded.
  5. BUG-HUNT.md: hunt area 1 (data safety) done; findings H-01..H-06 (see Known issues).
  Checks at the end: tsc clean, npm test 104/104, test:screens 11/11.

- 2026-10-22 (lunch batch, on v2.2/v3, each proven with a check that failed first):
  H-01 Clear all data owner-only in a household (members offered Leave household);
  H-02 bigger storage (parts) on for every account, household moves into parts only when
  every phone reports 2.2+; H-05 backup file locked with the account password, cache copies
  removed; H-07 hooks after the loading return (Income x2, Settings x1) + permanent
  `npm run test:hooks`; H-08 Home card last-month line inside the chart; H-09 Home / bell /
  To-Pay follow the date (useToday); H-10 double-tap on Save/Add can't add twice;
  H-11 Left to Spend rounded to centavos (no "-₱0.00"/"Over budget" at zero, no "₱NaN");
  H-12 no raw technical error text (friendlyError). Firestore rules reviewed: no serious
  holes. Checks at the end: tsc clean, npm test 128/128, test:screens 28/28, test:hooks 0.

- 2026-10-22 (end of lunch batch): H-14 Running-low box no longer saves 0 while you clear
  it to type. Proofs on the REAL screens (stand-in data, no Firebase): New transaction
  double tap, Settings Clear all (member/owner), Settings Save a backup, Settings
  Running low; each fails with the old code. Account-form double save could not be
  reproduced (check dropped, guard kept). Final: tsc clean, npm test 130/130,
  test:screens 34/34 (9 files), test:hooks 0, hidden-browser walk OK.
- 2026-10-23 (smoothness, on v2.2/v3, commits 05bee29..16405b5): bug hunt done, Cath asked
  for a smoothness skill and the same slide on every page with sub-pages. Built:
  src/motion.ts (one curve + speeds) used by tabs, pages, sheets; tests/motion.test.mjs
  (npm run test:motion) fails on hand-typed curve/speeds, useNativeDriver false, missing
  Reduce Motion, sub-page screens not using SlidingPages; Reduce Motion added to Search,
  offline banner, swipe-row hint (S-01). components/SlidingPages.tsx (sample B "follows
  your finger", highlight glides with it, soft bounce at the ends, no jump to another
  tab, neighbour pages built after the screen settles) on To-Pay, Savings, Groceries,
  Events, Travel trip page (inline mode, height glides). SegmentedControl's highlight
  glides everywhere. New rows light up only once their page/tab is showing (pageActive).
  components/CountingText.tsx: Left to Spend, Bills, Debts, Loans, Savings totals count to
  new values (COUNT_MS 500). Save gate tools/check-all.mjs (npm run check:all): the old
  tee + grep gate didn't stop on failure (caught, nothing failing saved). Final: tsc
  clean, npm test 166/166, test:screens 110/110, hooks 0; hidden-browser swipes OK on
  To-Pay, Savings, Groceries, Events. Emulator walkthrough for Cath (10-22/23 night):
  welcome, set-up, Home, Transactions, To-Pay, Plan, calendar, bell, add account /
  transaction / bill all correct.
- 2026-10-23 morning (smoothness 2, v2.2/v3, 021d651..1c6c564): Cath's answers - bottom tabs
  follow the finger, Search uses the house curve, I borrowed / I lent changes the form like
  Bill / Debt / Loan, every coloured zero amount grey. Skill gained the rules "no flicker,
  no blank moment, no overlap, no snaps, smooth fades" (exceptions: sheets / calendar /
  Search over a dimmed page; locking instant). Built: page contents fade in, rows and help
  cards open smoothly (animateLayout.ts), late titles keep their space; whole screens dip
  in ONE animation (ScreenSwap in App.tsx, screenSwap.ts; CURVE_OUT for the fade-out half);
  set-up steps slide like pages (StepSlide.tsx); form switches fade their fields
  (FormSwapFade.tsx) and the pop-up glides to its new height (BottomSheet.tsx, only during
  a switch). Found by the frame recorder and fixed: the next tab came in empty on a finger
  swipe and pages overlapped for a frame at let-go (preload with 1.5 s fallback, TabPage
  layout effect). Tools: rec:/burst:/mdrag: walker steps, tools/flicker-check.py (sorts
  frames by time). Final: tsc clean, npm test 175/175, test:screens 130/130, hooks 0.
  Note: an earlier run of this same conversation did batches A and B; its reply never
  reached Cath, this run finished the work.

- 2026-10-23 to 10-26 (v2.2/v3, commits 3c192a9..1f61c1f): account first (no account /
  no income yet: + goes to adding one, then back with it picked); To-Pay past Loans /
  before Bills hands over to the main tabs with the finger; calendar + > add leaves at
  once and lands on the right screen; every form field marked red * or grey (optional)
  (MarkedLabel, permanent check RequiredMarks.test.tsx); afterSlide 1 s fallback (S-12);
  red "easing not supported by native animated module" error fixed (S-13, curvedRange);
  the still copy of the app on Home behind sliding pages fixed (S-14, ScreenSwap removes
  the old screen by the clock too); switchers back to the approved look (S-15, no Android
  elevation). Independent reviewer agents: design (agreed with S-15), security (findings
  SEC-1..7 in BUG-HUNT.md, waiting for Cath), motion.

=====================================================================
🔧 In progress
=====================================================================
- Nothing half-built. Cath is about to send her own notes and ideas for version 3; read
  them first and agree an order with her before building.

- 2026-10-21: Nothing half-built in code. Waiting on Cath: approval of mockups LK1-LK2
  and D1-D3 (with her changes, see Next step), and the website redesign comparison.

=====================================================================
📌 Decisions — still active
=====================================================================
Cath's answers to the V3-PLAN.md questions (2026-10-17)
- Q1 Yes: fix the three data risks before anything else.
- Q2 No receipt photos have been attached in her household.
- Q3 Remove BOTH notes ("What Home calls you..." on Profile and the similar setup line).
- Q4 Top bar: Add on Accounts level with "< Home"; Add on Income level with
  "< Transactions"; Add on Savings, Yearly Goals, Shared Expenses, Groceries, Travel, Events
  level with "< Plan"; on the Transactions tab the Recurring and Search icons should line
  up with the "Transactions" title. Measured from her screenshots (1080x2400): Add and the
  back labels already share the same pixel rows (145-173), visual centres within 1 px;
  plan = nudge right-side word buttons down 1 pt and let her judge; move the Transactions
  tab icons onto the title line.
- Q5 Yes: sign in with email + password only (app looks up the username; needs a rules
  change, show it before publishing).
- Q6 Agree: Google/Apple sign-in after version 3, option B (key stays on the phone).
- Q7 Yes: ask "Do other people use your phone?" at setup to choose the lock.
- Q8 Yes: mock up "personal spending money" for couples.
- Q9 Premium plans like Spotify: Individual, Duo, Family (3+); prices not set yet.
- Q10 Agree: 30-day trial, no card needed.
- Q11 Yes: opt-in anonymous usage counts and the "How do you feel?" question.
- Q12 She asked how to share bank files: answered in the plan (export CSV, blank out names
  and numbers, keep formats).
- Q13 Yes: a separate email just for support (she will create it).
Cath's answers to questions 14-20 (2026-10-18)
- Q14 Yes: `v2.1` branch made from main (polish work); merged into main as 2.1.0 later,
  then `v3` continues from main.
- Q15 Transitions: pages = 3 "Paper slide" (new page slides over the old like paper, soft
  shadow); tabs = C "Slide by direction" (tab to the right slides in from the right).
- Q16 Agree: when someone joins with data, the OWNER approves it before it is added.
- Q17 Agree: owner inactive 60 days -> a member can ask to take over; owner has 7 days to
  refuse.
- Q18 Agree: card purchases count as spending when bought; paying the card is moving money.
- Q19 She is on Expo's FREE plan and wants to stay free: use the free testing route
  (automatic money checks run by Claude; Maestro on an Android emulator on her PC or on
  GitHub Actions' free minutes; iPhone later).
- Q20 Support email: later.
New decisions (2026-10-17)
- Version split (Cath's idea, agreed): version 2.1 = make existing features safe, correct
  and smooth; version 3 = new features. Proposed branches: `v2.1` from main, merged to
  main as 2.1.0, then `v3` continues (waiting for her OK, question 14).
- Joiners choose only Merge or Keep the household's data ("Keep mine" goes away; today it
  can overwrite the owner's household data). Owner = whoever makes the invite code.
- Owner leaving must pick the next owner; a household of two continues instead of closing.
- Premium for Cath and close friends via RevenueCat granted entitlements + our own friend
  codes (Play promo codes only give trials and need a payment method).
- Widgets: quick-add first (no amounts shown), Android first.
Workflow / project-wide
- Version 2.0.0 is final; every remaining item below belongs to version 3 (Cath,
  2026-10-16). Work on `v3`; merge into `main` when version 3 is finalised.
- Always look at the real, current code before changing it; review real diffs; never
  trust progress-log claims or commit messages alone — re-verify against current code.
- PowerShell only for anything Cath runs (here-strings for file content, never bash
  heredocs; `type` not `cat`). Progress files are saved from the repo root.
- Never hand Cath a conditional "if X do Y, otherwise Z" instruction — find the real
  answer first, then give one unconditional step.
- tsc passing only proves it compiles; only Cath's device test proves it works.
- New designs: mock up on the Design canvas first, build only after approval.
- Clean-up is done with the compiler's own remove-unused fixer, never by hand, and always
  type-checked after.
- Testing-only rows (Preview weather, test reminders) only appear in Expo Go (__DEV__),
  never in a release build.
- Firestore emulator can't be downloaded in Claude's container: rules are checked by
  review plus Cath's device tests; rules changes are published by Cath in the Firebase
  Console.
Money rules
- Every money movement needs an account. Cash and debit can never go below zero; credit
  can.
- Expected income is projection only (blue); balances change only through logged
  paydays. Money colours on totals: green = real money, red = owed, blue = projected.
- Income page total = expected this calendar month; Income page is grouped "by person".
- Envelopes and the Category Watchlist are ONE list (model.categoryBudgets); envelope
  spending counts by transaction category.
- Repeating debts have no total balance; an overpayment only shows in history.
- Close-out "Carry ₱X into next month" switch NOT built (Left to Spend comes from real
  balances, so a switch would count leftover money twice).
- New transaction stays as it is (no Trip/Savings choice); tick trip items on Travel and
  add savings on the pot page. Trip budget = the whole checklist added up (blue); a ticked
  item is crossed out in red and counts as money out.
Design
- Rays: option A (softer rays). Sky glow on Home only.
- Top-right button is the word "Add" everywhere it was a +; the round + on Home and
  Transactions stays.
- Accounts page is a list only (Home wallet shows the stacked cards).
- Wallet: corner lift; held card stays whole, slanted, 70% opacity, tucked behind the
  cards in front (rejected: cut in half, faded bottom, see-through front cards, floating
  on top).
- Gradients everywhere including white boxes, smooth with no visible lines.
- Unlock goes straight in after a quick tick. Onboarding has no fingerprint switch (it
  stays in Settings › Account & Security).
- The app always follows the phone's clock and time zone; location never sets the time.
Security / sign-in
- Sign in once: only a remote revoke, a full log out, or switching accounts asks for the
  password again.
- Forgot password and Google/Apple sign-in: skipped for now (data is encrypted with the
  password, so a reset would need the Recovery Key step afterwards).
- Saved profile photos are encrypted and synced.
- Premium stays a placeholder; no payment flow; benefits list to be confirmed by Cath.
Reminders
- Every reminder needs "Notify me on this phone"; payday nudge (6:00 PM local), envelope
  alerts and month-end summary (1st, 9:00 AM) each have their own switch, on by default.
Testing
- Test new versions as a separate app next to the installed one until Cath finalises;
  then a normal "preview" build updates the original app and the side-by-side app can be
  uninstalled.

- 2026-10-18: Option B (Finance Flow look) APPROVED for the new start (B1-B9, three
  welcome screens B1/B1b/B1c with illustrations) and the missing-field help (B10-B11).
- 2026-10-18: Bills, debts and loans need an amount (checked first); editing may keep 0.
- 2026-10-18: Storage parts are switched on ONLY for usernames starting with "test" until
  the combined 2.1 test passes; then remove the gate (householdPartsSync.partsEnabledFor).
- 2026-10-18: Cath: "do all the other testing once 2.1 is complete"; build on without
  waiting for device tests until then. Cath wants to reach version 3 this session.
- 2026-10-18: Transitions: Paper slide WITHOUT drop shadow (pages stay see-through so the
  falling leaves show); Calendar is now a rounded sheet from the bottom (JS stack).

- 2026-10-18: Loading = the screen's own logo drawing itself (opening animation), green
  changing words, no circle, no extra screen. Save/Add = round 7 option C "Leaf tick",
  see-through card (navy3 at 65%). Repeating bills/debts/loans get a date box like
  "Once" (Cath: "just simply show me the calendar icon"). Version 2.1.0 is final; EAS
  build next. Overspent word still open (suggested "Over budget"; Cath prefers "running
  low" for H4b). Credit cards can't be a source of moved money, only receive payments.


- 2026-10-20/21 (version 2.2): Cath chose "best of both" for opening speed (remember the
  key + native PBKDF2). Edit always opens the form on the item's own page (no jumping back
  to the list). Calendar opens from the bottom as a full page that can't be dragged
  closed; Scroll and Swipe both kept. Mood colours follow Left to spend (green / orange
  "Running low" / rose "Over budget"); the word is "Over budget". Priority High/Medium/Low
  on bills, debts and loans. "Are you still there?" after 5 minutes untouched (only with
  Auto-lock off), 1-minute countdown, then amounts hidden behind a cover. Who logged it:
  Cath chose W1 option B (small letter on the icon, only for others' entries) and W2
  (Added by / Changed by as a footnote on the item's page). Balance updates go on each
  card's own page. Website: no Google Play yet, show the build's QR code first.
  Version 3 ideas from Cath: Apple-Wallet-style transit cards, boarding passes, event
  tickets.

- 2026-10-22 (Cath): NEW FEATURES PAUSED (version 3 work) until the bug hunt and its
  fixes are done. Bug-check skill is the standing way of working for any code change.
  Status words with Cath: "Proven" / "Changed, not yet confirmed" / "Needs your phone".
  Testing tools approved (dev only). Hunt order: data safety first, then Home,
  Transactions, To-Pay, Plan pages, Settings, sign-in/linking, notifications + calendar.
  Claude does NOT use Cath's computer (emulator) while she is working; only when she says
  she's free and gives permission that day. Claude's own hidden browser is used instead.
  Cath: "I do not want you to guess ever" - ask when anything is unclear.

- 2026-10-22 (Cath): Clear all in a household = owner only, warning names the others;
  members told only the owner can and offered Leave household. Storage: switch parts on
  for real households (option a). Backup: lock with the account password and delete after
  sharing (option a). While Cath is away, Claude parks anything needing her decision.

- 2026-10-23 (Cath): a smoothness skill like the bug-check one (finance-flow-smoothness-check;
  its "Cath's decisions" list is additive). Every page with sub-pages SLIDES; style B
  "follows your finger" (from canvas https://claude.ai/artifact/2iT3fSQu9ifvpzfDrYjWLJ,
  A/B/C). The switcher highlight glides with the page. Switchers inside forms only glide
  their highlight. Past the first/last sub-page: soft bounce, never another main tab.
  Money numbers count quickly to new values (instant with Reduce Motion). Ask her about
  any motion choice not yet decided.

- 2026-10-23 morning (Cath): bottom tabs follow the finger; Search matches the house curve;
  I borrowed / I lent and Bill / Debt / Loan: highlight glides, fields fade out and in;
  coloured zero amounts grey; dark mode stays INSTANT (asked again: 2.2 had "keep it
  instant like 2.1"); set-up steps slide like pages; no flicker / overlap, smooth fades
  everywhere (see the skill).

- 2026-10-23 (Cath): every form field shows a red * when needed, a grey "(optional)" when
  not; on/off switches get neither. After adding a missing account / salary from a form,
  go back to that form with it picked. Past Loans: Plan comes in with your finger.
- 2026-10-26: security changes wait for Cath's OK (BUG-HUNT.md SEC-1..7); database rule
  changes are published by Cath in the Firebase Console.

=====================================================================
⚠️ Known issues / gotchas — still open
=====================================================================
Found 2026-10-16 while planning version 3 (details and fixes in V3-PLAN.md, "Everything
that could go wrong"). NONE of these are fixed yet:
- RISK 1 (urgent): receipt photos are stored as full-resolution base64 (ImagePicker
  quality 0.5, no resize; TransactionsScreen) inside the ONE shared household document.
  Firestore's limit is 1 MiB per document, so one photo can make every household save
  fail ("Sync Failed") until it is removed. Cath told: don't attach receipt photos for now.
- RISK 2: the whole household model is one encrypted string in households/{id}.data
  (1 MiB ceiling). Estimate: a busy household (~8 entries/day) hits it in about a year.
  Saved profile photos (avatars.ts: up to 80,000 base64 chars each, 4 per person) use
  ~105 KB each once encrypted, so two full photo sets use ~80% of the space.
- RISK 3: saves overwrite the whole household doc (saveHouseholdData); the live listener
  REPLACES the local model with the incoming one (no merge); syncPendingChanges pushes
  the local model after being offline without fetching first. Two people saving close
  together, or one coming back online, can lose the other person's change.
- No "Delete account" anywhere (Google Play requires in-app deletion + a web link for
  apps with accounts). Needed before publishing / Premium.
- Settings "Export backup" writes the full model as PLAIN JSON to the cache folder, never
  deletes it, and there is no restore from it.
- Email is never verified at sign-up (no sendEmailVerification); no password reset exists
  yet (no sendPasswordResetEmail), although recovery.ts was designed for it.
- Payday nudge time is hard-coded to 18:00 (pushNotifications.ts); model.settings is
  household-wide, so a per-person time must be stored per username.
- Quick unlock footer in Settings still says "Open the app with your fingerprint or a PIN
  instead of your password" (out of date since sign in once).
- Joining a household has no online check and no time limit (ProfileScreen joinBusy).
- Offline banner can't be dismissed; log out / switch account doesn't warn about
  unsynced changes.
- Pay sheets (bills, debts via markPaid; loans in PayDetailScreen LoanBody; pot
  contributions) always use today's date; markPaid already accepts a date parameter.
  Back-dated items before balanceAccounts.asOfDate never change balances (silently).
- CSV import gaps: negative amounts rejected, debit/credit columns unsupported, only
  YYYY-MM-DD and MM/DD/YYYY dates (day-first files land in wrong months), no header-row
  detection, no account, everything "Imported", duplicates only vs manual transactions,
  no undo, cached file not deleted.
- Profile shows the username with an "@" (ProfileScreen lines ~737 and ~748).
Found 2026-10-17 (details in V3-PLAN.md):
- Joining a household offers Keep mine / Keep theirs / Merge (linking.ts JoinChoice);
  "Keep mine" on an EXISTING household overwrites everyone's shared data with the joiner's.
- Linked households can't open offline: attemptOfflineUnlock skips linked profiles, the
  launch signs in to Firebase first, and on failure shows the sign-in screen ("Couldn't
  sign you in automatically").
- Credit accounts are a single number added to Total balance as if it were money (no
  limit, no owed amount, no link to the card's statement/debt).
- Bills can't be part-paid (PayDetailScreen editableAmount only for debts), although
  markPaid already carries the unpaid part for anything without a minimum.
- Owner leaving a 2-person household closes it (unlinkHousehold dissolves when
  isOwner && memberCount <= 2).
- Pages use a 150 ms cross-fade (RootStack animation 'fade'); tabs a soft fade with a
  small drift (TabPage).

Unverified from version 2 (check first in the Finance Flow 2 build)
- The six rebuilt add forms (trip, event, goal, savings pot, grocery item, meal, commit
  e5a28fe) were never seen on a device: Cath couldn't see them in Expo Go (cause never
  found; her checkout was at 8825b62). They ARE in the Finance Flow 2 build.
- Semibold header buttons (Back / Add / Edit / Move money / Approve all, one shared
  navigation/LargeHeader headerButtonText) not yet confirmed by Cath.
- Screen transition lag (tabs and pages) was seen in Expo Go; must be judged in an
  installed build. Tried earlier (no luck): ios_from_right, slide_from_right,
  DeferredContent, external activeTab store, TabPage self-animation, memoized
  GradientFill/screenOptions, native gradients. Not tried: react-native-reanimated or
  native-stack defaults, profiling Home and Settings.
- Offline banner did not show in airplane mode in Expo Go and a "Sync Failed" alert still
  appeared (expo-network may not report offline in Expo Go) — re-check in the build.
- Warning "The action 'GO_BACK' was not handled" after adding a transaction from the
  quick-add sheet — re-check in the build.
- Early-payday Calendar fix (6aeab0a) never tested on its own; Left to Spend exact-time
  test still pending (Cath wanted to revisit it after everything was added).
Known limits / small gaps
- Transfers have no list and no undo (optional, not requested yet).
- New grocery item has no Quantity row (list items don't store quantity).
- The first time a new version runs, envelopes already past 80%/100% send their alert
  straight away (then once a month).
- Payday nudge and month-end summary were tested with testing rows only; a real 6 PM
  payday and a real 1st-of-month were not waited for.
- Rows inside white groups with their own background carry their own GradientFill, so
  long lists draw many small gradients (Settings, Profile most) — watch for slow scrolling.
- GradientFill only matches navy3, accentTint, buttonFill, gold and cardTealEnd; other
  mood colours (e.g. HomeHero orange/red) need kind="solid".
- Mockup features not built (the app lacks the feature): Google/Apple "Ways to sign in" on
  Profile, "Work offline" and "Sync photos only on Wi-Fi" switches, Text size and Wallet
  name rows in Appearance, the Notifications page still has its old layout.
- iPhone-only checks wait for an iPhone: card shadow, Calendar look, faceIDPermission.
- Finance Flow 2 shares the same household data as the original app; test with small
  entries and delete them afterwards.
Carried from PROGRESS5.md (paused; status not re-checked since)
- Quick Unlock Step 6 test checklist (close/reopen, log out, remote revoke, 5 wrong PINs,
  true offline relaunch, photo avatar in the switcher, all 5 accounts). NOTE: in R series
  session 3 Cath said Step 6 is no longer needed because the app opens straight in once
  signed in, but it was listed again as optional on 2026-10-16 — confirm with Cath
  whether to run it.
- The 5a-2 "offline unlock shows no loading indicator, looks like a freeze" finding.
- The five Maestro test flows still target Expo Go and were never run for real.
- Notification loose ends: subscription reminder tap-to-deep-link untested; sign-out
  doesn't cancel scheduled notifications; a cancelled subscription can still get a "due
  soon" reminder; the weekly recap's "tap to see the breakdown" opens nothing.
- Avatar refresh in the switcher only updates the account currently signing in; an
  offline-cache gap for linked households' data; Change PIN timing never re-measured on an
  installed build.
- Phase C publishing (C.1 real installable build for distribution, C.2 optional Play
  Store / App Store listing).
- App Check (Firebase) not set up yet.

- 2026-10-18: The merge-before-save, transitions, Keep-mine and log-out changes are not
  device-tested yet (combined 2.1 test list pending). After pulling, `npm install` is
  needed once (new package @react-navigation/stack).
- 2026-10-18: Parked: the 20-minute inviter test (teste/testf) for the 15-minute rule fix.
- 2026-10-18: Live receipt reading, Google/Apple sign-in and widgets need a development
  build (not Expo Go) plus accounts only Cath can create.

- 2026-10-18 (wrap-up): NOT device-tested yet (list for after the EAS build): in-place
  loading on every screen, round 8 due dates, travel to-do page, edit-sheet flashing fix,
  tab swipe, PIN/fingerprint sheets, household linking loading, offline A2/A3, parked
  A4-A6 + the 20-minute invite test. Storage parts are STILL test-only in 2.1.0
  (partsEnabledFor, usernames starting "test"); turning it on for everyone needs Cath's
  OK (touches data). After pulling, `npm install` once (react-native-reanimated,
  react-native-worklets).


- 2026-10-21: Not yet checked in a real build: I11 (invite page opens the app), I12
  (first sign-in / PIN / linking speed with the native PBKDF2), offline banner swipe-up.
  "Who logged it" is only on transactions so far (Cath wants it on every applicable
  screen). Mood colour preview on the set-up screen still not showing (Cath, Oct 21).
  Entries made before 2.2 have no "added by" and no balance-update history.

- 2026-10-22 (bug hunt area 1, details in BUG-HUNT.md on v2.2). Re-checked in code:
  RISK 3 IS handled (merge before save in one Firestore transaction, merge3.ts, 12
  checks); RISK 1 is partly handled (receipts shrunk, avatars.ts). Still open:
  H-01 Clear all data in a shared household wipes it for both people, warning says "this
  profile" (SettingsScreen ~1877/1188). H-02 real households still one ~1 MB online copy;
  parts only for "test" usernames (householdPartsSync.ts:27); a receipt can use ~1/4 of
  it. H-03 connection drop while opening -> empty Home, not linked; edits then overwrite
  the phone copy and personal online backup (DataContext loadModel catch ~618).
  H-04 "Sync Failed" after 8 s even when the save finishes later. H-05 Export backup is a
  plain file left in the cache, next to a line saying everything is encrypted.
  H-06 (possible) offline change + closing the app at once may not be kept.
  Decisions needed from Cath before fixing H-01, H-02, H-05 (listed in BUG-HUNT.md).
- 2026-10-22: PROGRESS7 may be behind TEST-2.2.md: v2.2 commits after the 10-21 wrap-up
  (TEST-2.2 sections AB-AF) aren't described here. Read TEST-2.2.md and `git log v2.2`.

- 2026-10-22 (lunch batch): PARKED for Cath's yes (recommendations in BUG-HUNT.md):
  H-03 empty household on a bad-connection open, H-04 false "Sync Failed", H-06 offline
  change + instant close, H-13 account balances not rounded to centavos (card ₱0.00 in
  red). Small question: zero amounts in red (Debts total, Groceries Bought). The storage
  parts only take over once your partner's phone also runs 2.2 (until then: same 1 MB).
  Sign-in/linking/sync can't be tested in Claude's workspace (Firebase emulator download
  blocked). Phone checks for this batch: TEST-2.2 section AG.

- 2026-10-23 (smoothness): WAITING for Cath (SMOOTH-HUNT.md S-04..S-07): main tabs follow
  the finger too? Search's own curve keep or match? "Loans Borrowed / Lent" turned out to
  be inside the New loan form (glides only), OK? Green zero amounts (Loans lent, Savings)
  grey too? Not motion: as a guest, the first item's sign-in sheet shows over an empty
  list. Hidden browser can't open the empty Travel "No trips yet" card (old build too;
  web only). Needs the phone: swipe feel, Android label/highlight order, the Bill/Debt/Loan
  hand-over glide. Emulator mouse drags don't act like a finger (Left to Spend card).

- 2026-10-23 morning (smoothness 2): the hidden browser can't show pop-ups opening while it
  records, nor a second pop-up after closing one (old version the same, not an app bug):
  pop-ups opening/closing, lock/unlock and sign-in stay phone checks (TEST-2.2 AN2, AN9).
  Small, to watch on the phone: opening Search, the tab bar's labels fade a moment late.

- 2026-10-26 security review (BUG-HUNT.md, NOT FIXED, Cath decides): SEC-1 serious - the
  join rule lets anyone who knows a household ID add themselves (invite code ownership not
  checked; removing a member keeps the same key). SEC-2 reminders with amounts keep coming
  after sign-out / revoke / unlink. SEC-3..7 smaller (pending invite key in plain storage,
  6-digit peer recovery, PIN retry rounds, no tamper check on saved data, join links).

=====================================================================
📁 Files in the repo
=====================================================================
Repo root (on `main`): PROGRESS.md, PROGRESS1.md, PROGRESS2.md, PROGRESS2-ARCHIVE-1.md,
PROGRESS3.md, PROGRESS4.md, PROGRESS4-ARCHIVE-1.md, PROGRESS5.md, PROGRESS6.md (closed),
PROGRESS6-ARCHIVE-1.md, PROGRESS6-ARCHIVE-2.md, PROGRESS7.md (this file, active),
V3-PLAN.md (the Version 3 plan, 2026-10-16; copy of the plan doc),
2-PROJECT-INSTRUCTIONS.md, 3-ROADMAP.md, 4-REMAINING-WORK-ROADMAP.md, README.md,
firebase.json, household-finance-app (3).html (the original web app),
household-finance-app-spec-and-scale.md, skills-lock.json, mobile-app\.

mobile-app\: App.tsx, index.js, app.json (version 2.0.0, versionCode 2), app.config.js
(side-by-side variant), eas.json (profiles preview and preview-v2), firestore.rules
(published 2026-10-16), firebase.json, package.json, tsconfig.json, CLAUDE.md, AGENTS.md,
EMULATOR-TESTING-CHECKLIST.md, flows\ (Maestro), assets\, src\.

mobile-app\src (as of 9ae00f9):
- Core/data: DataContext.tsx, types.ts, defaultModel.ts, mergeModels.ts, storage.ts,
  encryption.ts, household.ts, linking.ts, recovery.ts, sessions.ts, usernameClaim.ts,
  firebase.ts, auth.ts, authFirebase.ts, cloudBackup.ts, csvImport.ts, myPerson.ts,
  preferredName.ts, staySignedIn.ts, stickyState.ts, quickUnlock.ts, pin.ts,
  biometrics.ts, autoLock.ts, autoLockSuppress.ts, recentAccounts.ts,
  usePendingRecovery.ts.
- Money logic: transactions.ts, transactionActions.ts, balanceProjection.ts, income.ts,
  incomeKinds.ts, incomeMonth.ts, billPayments.ts, savingsPots.ts, envelopes.ts,
  recurring.ts, recurrence.ts, sharedExpenses.ts, overdue.ts, categorization.ts,
  fiScenario.ts, reportVisibility.ts.
- Reminders/inbox: pushNotifications.ts, bellReadState.ts, useBellInbox.ts,
  openBillRequest.ts, openDebtRequest.ts, openLoanRequest.ts, openToPayTabRequest.ts.
- Look and feel: theme.ts, ThemeContext.tsx, tokens.ts, typography.ts, textSize.ts,
  mood.tsx, sky.ts, travelTime.ts, avatars.ts, haptics.ts, leafTransition.ts,
  fabActions.ts, fabSide.ts, pullDownToOpen.tsx, PullToRefreshScrollView.tsx,
  calendarSettings.ts, dateUtils.ts, utils.ts, onboarding.ts.
- components\: AccountCard, AccountPicker, AmountInput, AppSwitch, AppText, Avatar,
  AvatarPickerSheet, BottomSheet, Button, Card, CardFace, CardGradient, CenteredAmount,
  DateField, FallingLeaves, FallingRain, GradientFill, HomeHero, HomeWallet,
  KeyboardAwareScrollView, LeafBackground, LoadingView, LogoMark, OfflineBanner,
  OnboardSetup, PasswordField, PayFromSheet, PayRow, Pill, PinField, ReportBits,
  RowInteractionPreview, SavedToast, SegmentedControl, SettingsHub, SimpleForm (incl.
  FormGroup, PickerRow, GroupLabel, BigTotal), SkyGlow, SwipeableRow, leafShape.ts.
- navigation\: MainTabs, RootStack, TabPage, DeferredContent, LargeHeader
  (headerButtonText), headerOptions.ts, navigationRef.ts.
- screens\: AccountSwitcher, Accounts, Bills, Calendar, CardDetail, CreateProfile,
  CsvImportModal, Dashboard, Debts, Envelopes, Events, Goals, Groceries, Home, Income,
  Insights, Intro, IntroSlides, LoanPayoffSimulatorModal, Loans, Onboarding, PayDetail,
  PinUnlock, Plan, PotDetail, Premium, Profile, Recurring, ReportDetail, Review,
  SavingsFiComparisonModal, Savings, Search, SetPin, Settings, SharedExpenses, SignIn,
  Subscriptions, ToPay, TransactionDetail, Transactions, Transfer, Travel, reports\.
Design canvases (private to the Claude account that made them; may not open in another
account): "Finance Flow Redesign" https://claude.ai/artifact/AszP4RAjsgqkyB4uYXwXgA,
design system "Finance Flow" https://claude.ai/artifact/CHvvSdWHaX5qkmDvSE3BVZ,
"Softer rays & matching forms" https://claude.ai/artifact/ASpENC4rLibfoA3QJd1Tvy,
"Every screen" https://claude.ai/artifact/SLMt6JRrmWzxccwqRvSBrm.

- 2026-10-18: New files: src/householdCloudParts.ts, householdPartsPlan.ts,
  householdPartsSync.ts, merge3.ts, components/Guided.tsx; tests/householdPartsPlan,
  merge3, money tests + tests/ts-resolve.mjs (npm test, 42 checks). Design canvas
  "Finance Flow — New start and form help" https://claude.ai/artifact/ASR1EPaw6Ro7jkQDwR5AJX
  now also has the row "Version 2.1 extras" S1-S9 (part-pay, back-dating, payday time,
  offline, Transactions icons): WAITING for Cath's approval.

- 2026-10-18 (wrap-up): New files: components/DrawingLogo.tsx (DrawingLogo, BusyWords,
  BusyHero, BusySectionTitle), components/LeafTick.tsx (showLeafTick + LeafTickHost),
  src/afterSlide.ts; TEST-2.1.md has a Retests section (1-11, 2b). v3 only: calmHome.ts,
  components/CalmHome.tsx, hideAmounts.ts, creditCards.ts, TEST-3.md, tests calmHome +
  creditCards. Design canvas https://claude.ai/artifact/ASR1EPaw6Ro7jkQDwR5AJX has the
  loading (L-rows), save-animation (round 7) and due-date (round 8) mockups.

- 2026-10-22 (on v2.2/v3): CLAUDE.md (root), .claude/skills/finance-flow-bug-check/SKILL.md,
  BUG-LOG.md, BUG-HUNT.md, BUG-CHECK-BROWSER.md, mobile-app/jest.config.js,
  mobile-app/__tests__/ (helpers/setup.js, helpers/render.tsx, AmountInput.test.tsx,
  PlanScreen.test.tsx), mobile-app/tools/browser-walk.mjs. package.json: scripts
  test:screens, browser:build, browser:walk; devDependencies jest, jest-expo,
  @testing-library/react-native, react-test-renderer, @types/jest, react-dom,
  react-native-web, @expo/metro-runtime, playwright.

- 2026-10-22 (lunch batch, v2.2/v3): src/components/ClearAllData.tsx, src/backupFile.ts,
  src/partsGate.ts, src/homeChart.ts, src/useToday.ts, src/friendlyError.ts,
  mobile-app/eslint.config.mjs (test:hooks); checks __tests__/ClearAllData, SheetBar,
  useToday; tests/backupFile, partsGate, homeChart, centavos, friendlyError.

- 2026-10-22 (end of lunch batch): src/autoSaveInput.ts; __tests__/TransactionDoubleTap,
  SettingsClearAll, SettingsBackup, SettingsRunningLow (pattern for checking whole screens:
  mock DataContext, firebase/*, sessions; see these files).

- 2026-10-23 (smoothness, v2.2/v3): .claude/skills/finance-flow-smoothness-check/SKILL.md;
  SMOOTH-HUNT.md (root); src/motion.ts, subPages.ts, pageActive.ts, countUp.ts,
  components/SlidingPages.tsx, components/CountingText.tsx; changed SegmentedControl,
  swipeTabs (heldOnUI, holdForSubPages), useArrival, TabPage, RootStack, BottomSheet,
  afterSlide, To-Pay/Savings/Groceries/Events/Travel screens, Bills/Debts/Loans/HomeHero
  totals; tests/motion, subPages, countUp; __tests__/SlidingPages, SubPageScreens,
  CountingText; tools/check-all.mjs (npm run check:all), browser-walk drag: step.
  DataContext stand-ins in __tests__ now include QuietWhenHidden.

- 2026-10-23 morning (smoothness 2): src/screenSwap.ts, animateLayout.ts,
  components/StepSlide.tsx, components/FormSwapFade.tsx, navigation/tabDrag.ts; changed
  App.tsx (ScreenSwap), BottomSheet (height glide + filler), TabPage (layout effect),
  MainTabs (preload), KindSwitch, Bills/Debts/Loans forms, GuestSetupScreen, motion.ts
  (CURVE_OUT, ROW_MS, FADE_IN_MS, FADE_OUT_MS, DIP_MS); tests/screenSwap, motion (more);
  __tests__/SmoothSwaps, SmoothTransitions, TabSwipe; tools/flicker-check.py,
  browser-walk rec:/burst:/mdrag:.

=====================================================================
📅 Session log
=====================================================================
- 2026-10-16 (session 1 of PROGRESS7): Claude attached the repo and read PROGRESS6.md.
  Gave Cath steps to install Finance Flow 2 (not yet done). Cath decided version 2.0.0
  is final: `redesign` merged into `main` (9ae00f9, no conflicts, code identical to
  c814819), new branch `v3`, PROGRESS6.md closed with a pointer, PROGRESS7.md started.
  Cath will send her notes and version 3 ideas next.
- 2026-10-17 (session 1, continued): Cath answered the plan's 13 questions and sent top bar
  screenshots plus new notes (linked household ownership and merges, who-added-what,
  owner leaving, Premium friend codes, widgets, transition samples, Meralco partial
  payments, credit cards, testing on iOS/Android, smooth loading, and splitting the work
  into 2.1 and 3). Claude measured the screenshots, read the code, added the new sections
  and questions 14-20 to the plan, made the transitions canvas, and refreshed V3-PLAN.md.
  Found in code: joiner "Keep mine" can overwrite a household; linked households can't
  open offline (launch signs in online first); credit accounts are added to Total balance
  as if they were money. No app code changed.
- 2026-10-16 (session 1, later): Cath sent her version 3 notes (back-dating, the "@",
  Google/Apple/email sign-in and Forgot password, member note, payday nudge time,
  support/FAQ, CSV import, the "avoid looking at money" focus, smart predictions,
  bill payoff priority, Add button alignment, offline join/banner/online-only list,
  Quick unlock/PIN/Auto-lock purpose, Premium tier and a loss-aversion free trial).
  Claude read the code for each and wrote the plan doc "Finance Flow — Version 3 Plan"
  (Claude Docs artifact https://claude.ai/code/artifact/e76ba69d-f14f-4c0c-878a-284001cafe88,
  may only open in the account that made it) and saved a copy as V3-PLAN.md. It has 13
  questions for Cath. While reading the code Claude found the three data risks now listed
  in Known issues. No app code changed.

- 2026-10-18 (session 2): long session on v2.1 (see Done, Decisions, Next step for the
  detail). Cath device-tested the form help, quick fixes and storage parts on test
  accounts; found the inviter-never-finishes linking trap and a rules bug
  (memberVersions without .get) which were fixed; then asked to batch all remaining
  testing at the end of 2.1.


- 2026-10-21 (on `v2.2` / `v3`, not main yet): TEST-2.2.md (device test status),
  design/2.2-mockups/*.png (screenshots of design rounds 15-18 and the website),
  website/mockup.html (the website mockup as a plain page), mobile-app/hosting/ (invite
  page + index for Firebase Hosting), mobile-app/modules/ff-crypto (native PBKDF2),
  new src files: pbkdf2Core.ts, fastCrypto.ts, deleteRecords.ts, joinLink.ts,
  takeOffBalance.ts, travelChecklist.ts, priority.ts, activity.ts, lookPreview.ts,
  components/StillThere.tsx, PriorityPick.tsx, CustomScheduleFields.tsx, DeleteRow.tsx,
  screens/CalendarScreen.tsx (rewritten). Design canvases and the plan doc are artifacts
  in Cath's first Claude account and may not open in other accounts:
  app canvas https://claude.ai/artifact/ASR1EPaw6Ro7jkQDwR5AJX, website canvas
  https://claude.ai/artifact/WGB2bNqnnRtLKbdWEQuuv2, plan doc
  https://claude.ai/artifact/X58irbPXSeBqRi89gUe1j8.

- 2026-10-22: bug-check setup (see Done). Also wrote a Claude Design brief for a
  clickable prototype (not in the repo; Cath has the file).
- 2026-10-22/23 (night): Claude drove the emulator on Cath's computer while she watched
  (stopped by Cath). Then the smoothness skill, the A/B/C slide canvas (Cath picked B),
  and four batches built while she was away (see Done).

- 2026-10-26 new files (v2.2/v3): mobile-app/src/components/ScreenSwap.tsx (moved out of
  App.tsx), src/components/MarkedLabel.tsx, src/accountHandoff.ts, src/quietMoves.ts;
  checks __tests__/ScreenSwap.test.tsx, RequiredMarks.test.tsx, AccountFirst.test.tsx.

=====================================================================
▶️ Next step
=====================================================================
- NEWEST (2026-10-18, day): v2.1 built through: missing-field help, quick fixes, storage
  parts (test accounts), auto-finish linking, merge before saving, log-out warning, no
  Keep mine, transitions, money checks. WAITING on Cath: (1) approve mockups S1-S9;
  (2) "yes, keep the key on the phone" for Open from the phone first (caches the
  password-wrapped household key locally). Then: build S1-S9, open-from-phone-first,
  ONE combined 2.1 test list, remove the parts test gate, Finance Flow 2 build, merge
  v2.1 -> main as 2.1.0, then version 3 in plan order (onboarding Option B approved).
- NEWEST (2026-10-18, night): Cath device-tested batches 1-2 (receipt shrink, storage meter)
  "as described", and fixed the account-creation "permission-denied" by re-publishing
  mobile-app/firestore.rules in the Firebase console (her console rules had been reset when
  she deleted all data to start fresh). Create account now shows which step failed + the
  Firebase code (1e1f0a8). New requests:
  (a) "Take me to the missing field" on Add (2.1): groundwork pushed (519df31:
      components/Guided.tsx + useFieldErrors; KeyboardAwareScrollView ScrollIntoViewContext),
      no form uses it yet. Next: wire New transaction + New bill, then the other forms.
  (b) New start of the app (version 3, her idea): set up first (welcome x3, name, help
      with, look, who uses the phone), then sign in at the FIRST money entry; email now,
      Google/Apple/Facebook later; "Look around with sample data"; accounts right after
      sign-in. Added to V3-PLAN.
  (c) Reading receipts (version 3): on-phone text recognition fills total/shop/date.
  MOCKUP for (a) and (b), waiting for Cath's approval before any code:
  Design canvas "Finance Flow — New start and form help"
  https://claude.ai/artifact/ASR1EPaw6Ro7jkQDwR5AJX
  Update (2026-10-18): Cath asked for a version in the app's own look, so the canvas now
  also has OPTION B rows (peach glow, warm brown #9A3E10, falling leaves, peach-gradient
  cards, pill buttons): B1-B9 new start, B10-B11 missing field. Plus a "Scan a receipt"
  row (version 3): R1 choose scan/photo, R2 live camera scan in parts for long receipts,
  R3 filled-in form + "Keep the scan" (small cropped black-and-white scan). Waiting for
  her pick (A or B) and approval.
- NEWEST (2026-10-18, latest): Cath chose OPTION B for storage: split the household into
  parts (Firestore 1 MiB per document; the free plan has 1 GiB total, 50k reads and 20k
  writes a day). Step 1 DONE on `v2.1` (018efbd): src/householdParts.ts (splitModel /
  joinParts / partTexts / changedParts; parts = core, txn-YYYY-MM, txn-undated,
  rcpt-<txn id>, avatars-<username>) + tests/householdParts.test.mjs (8 checks, `npm test`,
  Node 22 strip-types; no new packages). Not used by the app yet. Plan for the next steps
  (each tested before the next):
  (2) Firestore: households/{id}/parts/{partId} = {data (encrypted), updatedAt, updatedBy};
      rules draft for Cath to publish (members of the household may read/write/delete its
      parts; household doc may also gain `layout` and `memberVersions`); also delete parts
      when a household is dissolved.
  (3) Saving/loading in parts with a SAFE migration: the first 2.1 phone copies the
      household into parts, reads them back and checks they match before switching
      (households/{id}.layout = 1); the old single `data` field stays and keeps being
      written while it fits, until every member's phone reports 2.1+ (memberVersions);
      local copy on the phone also stored in parts (AsyncStorage size limits).
  (4) Test first on a THROWAWAY household (two test accounts) before Cath's real one.
  (5) Then merge-before-save inside each part (data risk 3) and the log-out warning.
  Still waiting: Cath's device test of batches 1-2 and her "Space used" number.
- NEWEST (2026-10-18, later): Cath said "next" without a device test of batch 1, so batch 1
  (receipt photos) is still NOT device-tested. Batch 2 on `v2.1`, NOT device-tested: data
  risk 2 part 1: DataContext measures the encrypted size on every save/load/incoming
  update (storageUsed 0-1, STORAGE_LIMIT_CHARS 1,000,000), one alert at 80%, and a save
  over the limit is kept on the phone (pending) with a one-time "Online storage is full"
  alert instead of a failed write; Settings > Backup & Data shows "Online storage · Space
  used N%". WAITING ON CATH: compressing the data before encrypting (data risk 2 part 2)
  changes the stored format, so phones on older versions (2.0.0 and the original app)
  could not read the household until updated. Asked her before building it.
- NEWEST (2026-10-18): VERSION 2.1 STARTED on branch `v2.1` (from main). Batch 1 done,
  NOT device-tested: data risk 1, receipt photos are shrunk before saving
  (avatars.ts makeReceiptDataUri: 1000/800/640 px steps, max 200,000 base64 chars, else a
  clear error; TransactionsScreen handlePickReceipt uses it). Cath switches to `v2.1`
  (git fetch; git checkout v2.1; git pull) and tests it. Then continue the 2.1 order in
  V3-PLAN.md: data risk 2 (compress + storage meter), data risk 3 (merge before save +
  log-out warning), remove "Keep mine" for joiners, open from the phone first, quick
  fixes, offline messages, part-pay bills + back-dating, transitions (Paper slide / slide
  by direction), money checks alongside.
- NEWEST (2026-10-17): Cath answered Q1-13 (recorded under 📌 Decisions). Plan updated with
  her new notes: linked households (owner, merge approval, who-added-what, owner handover),
  paying part of a bill (Meralco), credit cards done properly, widgets, Premium plans and
  friend codes, smooth opening online/offline, testing on Android/iPhone, top bar
  alignment, and the version 2.1 / version 3 order. Screen transition samples:
  Design canvas "Finance Flow — Screen transitions" https://claude.ai/artifact/VBwphCe7kuutjU3YbxYXQ9
  (pages 1-6, tabs A-C; suggested: pages 3 Paper slide, tabs B Quick fade).
  Waiting on her answers to questions 14-20 (V3-PLAN.md "More questions"). Then start
  version 2.1 step 1 (she checks the Finance Flow 2 build) and step 2 (the three data
  risks).
- NEWEST (2026-10-16, later): Cath answers the 13 questions at the end of V3-PLAN.md (or
  in the plan doc). Record her answers under 📌 Decisions. Then follow the plan's
  "Proposed order of work": (1) Cath checks the Finance Flow 2 build and the six add forms
  (no code); (2) fix the three data risks first: receipt photos (shrink, keep out of the
  main data, size guard), a storage meter + compress before encrypting, then merge before
  saving + the log-out warning; (3) the quick fixes; and so on. Ask before anything that
  touches encryption or the security rules.
- NEWEST (2026-10-16): On her computer Cath switches to `v3`:
    cd C:\Projects\household-finance-mobile
    git fetch
    git checkout v3
    git pull
    git branch --show-current     (should say v3)
- Then: read Cath's notes / version 3 ideas, sort them with the open items below into one
  ordered version 3 list, and agree the order with her before building.
- Open items for version 3 (Cath's earlier order):
  (1) Install and open Finance Flow 2 (build c35f77f6); sign in, set a PIN, check
      Settings › About says 2.0.0, compare with version 1.
  (2) In Finance Flow 2, check the six add forms and the semibold header buttons; also
      re-check lag, the offline banner and the GO_BACK warning in this real build.
  (3) Tab and page transitions with an ebook page-turn feel (slide left/right, not a 3D
      flip); show options / a mockup first; judge speed in a build, not Expo Go.
  (4) When version 3 is final: bump the version (app.json + SettingsScreen), merge `v3`
      into `main`, normal "preview" EAS build (updates the original Finance Flow), then
      Firebase App Check.
  Optional: Quick Unlock Step 6 checklist (confirm it's still wanted), transfers list
  with undo, the PROGRESS5 notification loose ends, Maestro flows.- 2026-10-18 (session 2, final part): opening freeze found and fixed, in-place loading on
  every slow screen, leaf tick everywhere, test-report fixes (A7, A9, A10, B5), round 8
  due dates. Cath called it version 2.1: bumped to 2.1.0 (versionCode 3), merged v2.1
  into main (fast-forward, 2a3d886), merged main into v3.
- NEWEST (2026-10-18, wrap-up): VERSION 2.1.0 FINAL on `main`. Cath runs the EAS build
  "preview-v2" (Finance Flow 2, side by side) and then the post-build check list:
  TEST-2.1.md Retests 1-11 (+2b), offline A2/A3, parked A4 merge / A5 log-out warning /
  A6 joining + the 20-minute invite test, travel to-do page, tab swipe, leaf tick, round 8
  due dates, edit-sheet flashing, PIN and fingerprint sheets, household linking loading.
  Then ask Cath before removing the storage-parts test gate. After that, version 3 on
  `v3`: B1 new start and B5 to device-test, K2 statements in To-Pay, limit warnings and
  pay-off plan, reports opt-in + weekly check-in, Travel to-do swipe actions, peel-off
  Appearance, the "Overspent" word.

- 2026-10-21 (session): version 2.2 polish with Cath testing in Expo Go; see Done. Found
  the edit-flashing cause from Cath's screen recording (form opened late after jumping
  back to the list, then the page was reopened over it).
- NEWEST (2026-10-21, wrap-up): work is on branch `v2.2` (v3 is the same commit). Cath
  switches Claude accounts. FIRST THINGS NEXT SESSION, in this order (mockup first for
  anything visual, as always):
  1. Calendar: make the green "today" circle a lighter shade, and the selected day a
     circle too (not a box), also light.
  2. Shared household "who logged it" (W1 B letter + W2 footnote) on every applicable
     screen, not just Transactions: bills, debts, loans (added + paid), savings moves,
     trip items, balance updates, income/paydays.
  3. LK1-LK2 (linking choice redesign): use different icons that match the app's vibe
     (not emoji), then build after approval.
  4. D1-D3 (last 4 digits on debit/credit cards): put the last 4 digits and the amount
     closer to the bottom of the card, the way the app's cards look now; then build.
  5. Mood colours preview still doesn't show when creating a new account (set-up "Make it
     feel like yours"); needs the swipe samples (approved L2 idea) to actually tint.
  6. "Are you still there?" cover after a minute: change its icon (the 🙈) to match the
     app's vibe/design.
  7. Website: only ONE phone (the main one at the top); swiping it shows the screen
     animations one after another (not six phones at once). Remove the "Meralco paid" and
     "Thailand" floating pop-ups. The site looks too plain: make a second, livelier design
     to compare side by side.
  Then: Cath's test of the newest items, the real 2.2 EAS build (preview-v2), I11/I12,
  merge v2.2 into main with the version bump check (2.2.0, versionCode 4 already set).
  PowerShell to get the code:
    cd C:\Projects\household-finance-mobile
    git fetch
    git checkout v2.2
    git pull
    cd mobile-app
    npm install
    npx expo start -c


- NEWEST (2026-10-22): NEW FEATURES ARE PAUSED. Work is the bug hunt, using the
  finance-flow-bug-check skill (on v2.2). FIRST: ask Cath the three decisions in
  BUG-HUNT.md (H-01 Clear all in a shared household, H-02 storage parts for real
  households, H-05 Export backup), then fix in small batches, each with a check proven
  red-green. Then hunt area 1b (leaving/dissolving, linking, recovery key, Firestore
  rules), then the screen areas in order. The 2026-10-21 list above (calendar circles,
  who logged it, LK, D1-D3, ...) waits until the hunt is done unless Cath says otherwise.
  PowerShell to get the code (npm install is needed once: new testing packages):
    cd C:\Projects\household-finance-mobile
    git fetch
    git checkout v2.2
    git pull
    cd mobile-app
    npm install
    npx expo start -c

- NEWEST (2026-10-22, after the lunch batch): Cath tests TEST-2.2 section AG on her phone
  (npm install once after pulling). Then ask her the parked items (H-03, H-04, H-06,
  H-13, zero amounts in red). Then continue the hunt: Transactions, To-Pay, Settings,
  sign-in screens (BUG-HUNT.md areas). New features stay paused.

- NEWEST (2026-10-22, 3 PM): Cath: "device test as described" for TEST-2.2 section AG.
  Still open: AG4 (two phones, once the partner's phone has 2.2) and AG5 (app left open
  overnight). Next: Cath's answers on the parked items (H-03, H-04, H-06, H-13, zero
  amounts in red), then continue the bug hunt (Transactions, To-Pay, Settings, sign-in).

- NEWEST (2026-10-22, afternoon): Cath's answers - H-03 do it (DONE: opens the phone's copy,
  still linked, reconnects in the background; __tests__/OpenOnBadConnection), H-04 / H-06 /
  H-13 leave as is, zero amounts grey (DONE as H-15 on 7 screens). Checks: tsc clean,
  npm test 133/133, test:screens 37/37, test:hooks 0. Phone checks: TEST-2.2 section AH
  (plus AG4/AG5 still open). Next: continue the bug hunt (Transactions, To-Pay, Settings,
  sign-in). New features stay paused.

- NEWEST (2026-10-22, late afternoon): Cath device-tested section AH. Bug hunt area 3
  (Transactions) started: H-16 expense with an expected refund switched to Money in kept
  the refund; H-17 deleting a refund entry left its expense "received" (all deletes now
  share deleteManualTxn). Both proven red-green. Checks: npm test 136/136, test:screens
  38/38, hooks 0. Phone: TEST-2.2 section AI. Next: rest of Transactions, then To-Pay.

- NEWEST (2026-10-22, evening): Cath device-tested AI. To-Pay checked, no new bugs.
  Category renames stay as is (Cath). H-18 (security): 5 wrong PINs now block the PIN
  for 5 minutes, saved on the phone (Cath chose 5 minutes; password and fingerprint still
  work). Checks: npm test 136/136, test:screens 42/42, hooks 0. Phone: TEST-2.2 AJ.
  Next: rest of sign-in / linking screens, Settings, notifications + calendar.

- NEWEST (2026-10-22, evening): Cath device-tested AJ. BUG HUNT FINISHED for every area
  a computer can check (BUG-HUNT.md): H-20 reminder switches saved data from before the
  permission pop-up (could undo the partner's change); H-22 pot page target date had no
  year. Screen sweep: all 18 main screens + Home + 9 detail pages open with older and full
  data (no crashes, no NaN/undefined, data shown) - __tests__/OldDataScreens + HomeData.
  Skill now gates every save on all checks passing (a failing check was committed once and
  fixed straight after). Checks: npm test 136/136, test:screens 91/91, hooks 0.
  Open questions for Cath: dates without a year (add the year only when not this year?),
  H-21 (confirm pop-ups, same fix as H-20?), H-19 (rare sign-in case). Phone: TEST-2.2 AK.
  Not checkable here: leaving/joining a household (needs two real accounts / the Firebase
  emulator, blocked in Claude's workspace). Then: the real 2.2 build (AG4, I11, I12).

- NEWEST (2026-10-22, night): Cath device-tested AK and agreed to all three open items.
  Done, each proven red-green: dates show the year only when not this year (dateText, 29
  places; trip ranges "Apr 2 – 9, 2027"); H-21 25 delete confirms start from the newest
  data; H-19 new-phone sign-in says "Check your connection" instead of asking for the
  recovery key. Checks: npm test 144/144, test:screens 95/95, hooks 0. Phone: TEST-2.2 AL.
  The bug hunt has no open items left that a computer can check. Next (Cath decides):
  the real 2.2 build (AG4 two phones, I11 invite link, I12 opening speed), then merge 2.2
  into main.

- NEWEST (2026-10-23, smoothness): Cath tests TEST-2.2 section AM on her phone (git pull on
  v2.2, npx expo start -c). Then answer SMOOTH-HUNT.md S-04..S-07. Save the smoothness
  skill card if not done (it's also in the repo). Still after that: the real 2.2 build
  (AG4, I11, I12), then merge 2.2 into main.

- NEWEST (2026-10-23 morning, smoothness 2): Cath does her batch test: TEST-2.2 sections AM
  and AN on her phone (git pull on v2.2, npx expo start -c). Nothing waits for her decision.
  Then: the real 2.2 build (AG4, I11, I12) and merging 2.2 into main.


- NEWEST (2026-10-26, checkpoint): Cath tests TEST-2.2 section AO on her phone (git pull on
  v2.2, npx expo start -c): no red error, no Home behind Plan pages, the approved switcher
  look, account / salary first, past Loans, calendar add, required marks. Then decide the
  security items in BUG-HUNT.md (SEC-1 first). Still after that: the real 2.2 build (AG4,
  I11, I12), then merge 2.2 into main.
- NEWEST (2026-10-26, later; CORRECTION, additive): the "Home behind every page" overlap
  was NOT the screen dip (that fixed only the red error). The independent motion reviewer
  disagreed and was right, proven with the real navigation library
  (__tests__/GoToMain.test.tsx): navigate('Main', ...) from a page on top (Calendar add,
  Search, card page, Review, reminder tap, quick add) stacked a SECOND Main; the old one
  (on Home) showed through sliding pages. Fixed in 12 places with navigation/goToMain.ts
  (commit 3b58a88, v2.2/v3); a check fails on any new navigate('Main'. Phone: TEST-2.2 AO2
  (best tested right after a calendar add or a search). Still open from the reviewers: tab
  finger-swipes are tracked on the JS side (can lag when the app is busy) - a bigger
  change, ask Cath; security items SEC-1..7 (BUG-HUNT.md) wait for Cath.

- NEWEST (2026-10-26, night, smoothness sweep; v2.2/v3 ddd7d0e..186e2f4): main-tab finger
  swipe now on the animation thread (S-16); every save no longer redraws the whole app
  (S-17, proven __tests__/NoRedrawOnSave); tabs pre-built one at a time (S-18); saving waits
  until the slide after + Add is done (S-19, still saves at once when put away / logging
  out); Transactions list draws the newest two months first (S-20); calendar opens in the
  saved layout, rain pauses behind other tabs (S-21). Found by an independent jank-review
  agent; a second agent reviewed Claude's changes. Phone: TEST-2.2 AO + AP. Still open
  (suggested, not urgent): pop-up forms build before rising; pop-up drag-down and keyboard
  jump. Security SEC-1..7 wait for Cath.

- NEWEST (2026-10-27): an independent agent reviewed the smoothness sweep. Fixed (360a3a0,
  v2.2/v3): goToMain now merges (a reminder's openBillId was wiped and all tabs rebuilt);
  tab swipe guards (a self-swiping card always wins; cancelled swipes never change tab);
  Transactions batches restart on a new sort/filter. Phone: TEST-2.2 AO + AP.

- NEWEST (2026-10-27, wrap-up): Cath called 2.2 done. Version checked (app.json 2.2.0 +
  versionCode 4, SettingsScreen APP_VERSION 2.2.0), v2.2 merged into `main` (035628f, no
  conflicts; Claude's workspace copy had been a shallow clone, unshallowed first). EAS build
  is Cath's to start (needs her Expo login). Then: TEST-2.2-FINAL.md on main = every
  check not yet confirmed on her phone (54, grouped by screen; also a checklist page in her
  Claude account). After her report: fix anything failed on `v3` (merge main into v3 first
  if they differ), then security SEC-1/SEC-2 (her OK + Firebase Console steps), then the
  open smoothness ideas (pop-up forms build before rising; pop-up drag-down; keyboard
  jump), then version 3 work on `v3`.

- NEWEST (2026-10-27, v3 work starts; Cath's 2.2 build notes): on `v3` (69c18e9, e7c124c):
  B-041 calendar / Due soon / Left to Spend forecast missed a debt due on a day the Debts
  page showed (payment round dates ignored; 31st in 30-day months) - fixed, proven;
  B-042 loan "next" date skipped an unpaid month (Oct 16) - loanNextDueDate, proven;
  B-043 paste into the big amount - proven; B-044 bill/debt notes shown on their page -
  proven. Phone: TEST-3.md section 5. Cath's decisions (AskUserQuestion, 10-27): receipts
  in ALL of shared expenses, bill/debt payments, loan payments and trip items; a new
  "Regular payment" kind for money that isn't a bill (e.g. monthly money for family:
  counts in Left to Spend, calendar, reminders); support email
  support.financeflow00@gmail.com as "Contact support" in Settings > About & Help;
  transfers (Move money) listed in Transactions with their note. All four: mockup first
  (Design canvas "Finance Flow v3 mockups: receipts, regular payments, transfers,
  support", boards R1-R3, P1 vs P2 option for regular payments, T1, S1), waiting for her
  pick/approval. Open: Travel trip page "Add an item" row not showing with an empty
  checklist (code draws it; asked Cath for a screenshot). Next: her mockup answers, then
  build in small batches on v3; then V3-PLAN items.

- NEWEST (2026-10-27, afternoon, v3 af17ccb..e6b5bfd): Cath approved all canvas mockups and
  picked option B (regular payments inside Bills). Built + checked: B-045 empty trip
  checklist cut off (heights race, phone only; proven with phone-like test), B-046 form
  labels squeezed, no swipe-back on the six Plan pages, Contact support (S1), transfers
  in Transactions + their page (T1; Undo held back: a balance typed in since would count
  twice), Regular payments (P2). Phone: TEST-3.md sections 6 and 7. New asks from Cath:
  (a) loans: edit the amount paid + a fees field, everywhere you pay; (b) "just record
  it" past payments with no account and no balance change, everywhere - one shared pay
  sheet drawn as canvas R4, waiting for her OK; (c) receipts on shared expenses /
  payments / trip items need the photo "parts" sync extended (sync change: her yes
  first); (d) investments (least priority, scope + mockup first).

- NEWEST (2026-10-27, evening, v3 591d438..96b58d9): Cath said yes to R4 ("build as
  drawn"), to extending the receipts sync, to transfer Undo "only until you update a
  balance", and "mockup first, decide later" for investments. Built + checked:
  591d438 one payment sheet (amount always editable, Fees (optional) as its own Fees
  entry, "Just record it" with no account / no balance change) for bills, debts, loans
  and trip items; 3d961a5 transfer "Undo this move" (blocked once a balance was typed in
  after it); ebcb4ae fixes from the independent review (H-23..H-26); a538a81 receipts on
  shared expenses, bill/debt/loan payments and trip items (ReceiptField; history rows
  with a paperclip open the photo); 96b58d9 review fixes for the receipts sync
  (H-27, H-28). Sync design: these receipts get their own `rcpt-x-<kind>-<id>` parts
  only when every member reports '3.0' (PARTS_APP_VERSION is now '3.0'; the layout-2
  move still needs only '2.2'); otherwise they stay inside the main copy. A part an
  older phone deleted is put back from what this phone saw. Known limit (H-29, tell
  Cath): while a phone is still on 2.2, about 4-5 such receipts can make the household
  say storage is full (nothing lost). Investments mockup: canvas board I1 (a Plan page:
  worth now vs put in; Update value / Add money / Take out; open question: count in
  Home's total or not). Screenshots of all v3 boards: design/3.0-mockups/ (on v3).
  Phone: TEST-3.md sections 8 and 9. Open question for Cath: a loan payment smaller
  than the monthly amount still counts as one full scheduled payment - warn, or count
  by running total? Next: Cath's phone tests (TEST-3 5-9), her answers (partial loan
  payments; investments yes/no + Home total), then SEC-1..7 when she's ready.

- NEWEST (2026-10-27, late, v3 9ef90e2..302d4e9): Cath's answers: partial loan payments
  "warn and count what I've actually paid in total"; investments "built yes. count it, but
  don't show it as readily available: count the money going in, add it back to the balance
  only when withdrawn". Her phone notes fixed: B-047 loan with no First payment date said
  "next Nov 16" with Oct 16 unpaid (schedule now starts from its payments; old wrong saved
  First dates repaired; H-30..H-32); loans count money paid (a smaller payment leaves that
  month open, with a warning in the pay sheet); B-048 "Undo today's payment" / "Paid today"
  for back-dated payments now name the date, Pay / Log payment stays while one is past due;
  B-049..B-051 alignment (receipt row, trip Add pill, every form's right edge, pay sheet
  laid out as R4) - two review agents walked every form in the web build. Investments
  built (Plan > Investments, canvas I1: Update value / Add money / Take out; money in from
  an account leaves it, taken out comes back; worth never in any balance; moves grey in
  Transactions; worth counts in the FI calculator's net worth). NOT built yet from I1:
  "Every month" automatic contribution (calendar / To-Pay) - ask Cath if wanted. Known:
  2.2 phones keep investments but don't take them off balances (until both phones are on
  3.0). Background tester: `npm run browser:build:fixture` gives the web build a made-up
  household (web only). Phone: TEST-3.md sections 9 and 10. Next: Cath's phone tests.

- NEWEST (2026-10-27, wrap-up): Cath: "device test is as described" for TEST-3 sections 9
  and 10 (receipts, loans past due + partial payments, Undo wording, alignment,
  investments). Version 3.0.0 set (app.json version 3.0.0 + versionCode 5, SettingsScreen
  APP_VERSION 3.0.0; PARTS_APP_VERSION already '3.0'), v3 merged into `main` (fc85302,
  no conflicts, main = v3). EAS build is Cath's to start (normal "preview" profile, replaces
  the installed app, same as 2.2). Open for later: "Every month" investment contribution
  (ask Cath), security SEC-1..7 (her OK), open smoothness ideas. New work continues on v3.

- NEWEST (2026-10-27, night, v3 53274d2..d7b9848, version 3.1.0 / versionCode 6 set on
  v3, NOT merged to main yet): Cath: "proceed with the remaining open items, make them 3.1".
  Her security answers (AskUserQuestion): YES to SEC-1 (invite rules) and SEC-2/3/5/7;
  NOT SEC-4 or SEC-6 for now; a new household key on member removal: LATER (plan + mockup
  first). Built: SEC-1 firestore.rules (code only for a household its maker is in, only the
  app's fields, its household fixed, finish only for that household; join checks the maker
  is a member) - CATH MUST PUBLISH THE RULES in the Firebase Console (no emulator here; the
  rules were read-checked by a review agent); SEC-2 every sign-out / revoke / switch clears
  reminders (epoch guard); SEC-3 pending invite key in SecureStore (old copies moved);
  SEC-5 PIN waits 5/15/60 min then password only (password or right PIN resets); SEC-7 join
  links ask "Join X's household?", link code no longer logged. Investments "Every month"
  (a regular payment linked by investmentId; Sent = investment entry from the account,
  the bill cycle recordedOnly + investEntryId; Undo removes both and the fee; one-off
  top-ups never change the plan; "Stop putting money in every month"). Smoothness: sheets
  glide for the keyboard. Not done (asked Cath): drag-down and build-before-rise need a
  BottomSheet rebuild. Review agent found H-34..H-38, all fixed. Phone: TEST-3 section 11.
  Next: Cath publishes rules, tests section 11, then merge v3 into main and build 3.1.0.

- NEWEST (2026-10-27, night wrap-up): Cath published the SEC-1 rules and said "device test
  is as described" (TEST-3 section 11). Version 3.1.0 (versionCode 6) merged into `main`
  (main = v3). EAS build is Cath's to start ("preview" profile, replaces the app). Still
  open for version 3: see the list given to Cath this day (accounts: Forgot password /
  email check / Delete account; publishing: privacy policy, Play listing, App Check;
  Premium payments; smart features; widgets; Help & FAQ; linked-household extras;
  security later items SEC-4, SEC-6, new key on removal; sheet rebuild for smoothness).

- NEWEST (2026-10-29, v3 abee78e): Cath's new priority list is logged in BUG-HUNT.md as
  H-39..H-47 (on v3): Transactions newest to the second; Debts show paid like Bills; "still
  to pay this month" totals on Debts (+ no-due-date total) and everywhere; idle lock counts
  in the background; who-added tag everywhere; trips fully editable + log with no account;
  paid struck through (MOCKUP FIRST); real dropdowns with a guessed category (MOCKUP PER
  SCREEN FIRST); loans' next payment due still wrong (came back after B-047, ask Cath for
  the loan's details). Skills improved first, at her request: finance-flow-bug-check now has
  "Fix directly, or ask first" (her picks: wrong logic with no look change, missing piece of
  an agreed rule, small text/alignment, crashes/frozen screens), "Cath's app-wide rules"
  (the list above as standing rules), "Same kind of thing, same behaviour", "When a fixed
  bug comes back", and a FULL SWEEP (data, rules, smoothness, security) before EVERY batch
  handed to her. Smoothness skill points to it. Cath: K5 step 1 tested OK; new work on v3.
  Next: work H-39..H-47 in her order; mockups for H-45 and H-46 before building them.

- NEWEST (2026-10-29, afternoon, v3 25bd87a..ecb96c8): Cath: "device test is as described"
  for TEST-3 s12 (H-47 Olive: Custom loans tracked). Her new asks + answers (AskUserQuestion):
  idle 5+1 timer keeps counting in the background; Undo 15 min for bill/debt/loan payments,
  shared payments, transfers and Edit loan's x, after that edit receipt / higher amount /
  date / account; household-edit notice: show both styles; one batch per phone test.
  Skills: smoothness check now also reviews LOOK consistency (no form unlike the app);
  bug-check: one batch per phone test, new rules (Undo 15 min, confirm before delete,
  household edits shown on opening). BUILT + PROVEN (red-green, check:all clean): H-39
  newest to the second (B-053); H-42 idle timer (B-054); H-43 who-added on groceries, meal
  ideas, events, trip to-dos, shared, settle-ups, transfers, investments, goals, accounts
  (B-055); H-44 trip item name/cost editable (B-056); H-49 confirm before 12 Remove/Clear
  buttons + permanent check (B-057). Phone: TEST-3 section 13. MOCKUPS (canvas "Finance
  Flow mockups: Oct 29 batch", https://claude.ai/artifact/VN7hDuBw6qXNwQc7FkJi9f): A1/A2
  Debts sections + totals (H-40/H-41), B1/B2 strikethrough (H-45), C1-C3 Undo 15 min + Edit
  payment (H-48), D1/D2 Edit loan payments (H-50), E1/E2 dropdown style + E3-E11 every form
  (H-46), F1-F3 household-edit notice (H-51). Next: Cath's phone test s13 and her picks.

- NEWEST (2026-10-29, night, v3 ..see git log): Cath: "device test is as described" (s13).
  Picks: A2, E2, F2 then F3, C1-C3 + D1-D2 approved, strikethrough = WHOLE ROW (canvas B3/B4
  added, her pick pending), trips "Just record it" is enough. New rule: Left to Spend counts
  everything before payday (her answers: past due yes, no-date debts no, plans: groceries,
  trips, events, savings plans, anything else; one line each). Standing: every report ends
  with "Next on our list". BUILT + PROVEN: Debts A2 (B-059); Left to Spend = accounts now
  minus everything still to pay to payday, every line shown, adds up exactly (B-060);
  Undo 15 min + Edit payment + Edit loan payments look (B-061); double-tap saves (B-058).
  Lesson: never pipe the check gate (a failing commit b593c9d slipped through, fixed in
  29c7f1b; skill updated). Phone: TEST-3 section 14. NEXT: E2 dropdowns on every form,
  F2 banner + F3 list, D2 inside Edit loan, strikethrough after her B3/B4 pick, H-53.

- NEWEST (2026-10-29, late, v3 7968595): Cath: "device test is as described" (s14); picked
  B14 (paid look) and L4 (Left to Spend page). BUILT + PROVEN: B14 paid look (B-062), L4 page
  (B-063), H-53 guest picks (B-064). Phone: TEST-3 section 15. NEXT: E2 dropdowns on every
  form, F2 banner + F3 list, D2 inside Edit loan.

- NEWEST (2026-10-29, evening, v3 ..ab207fe + H-51): Cath: "device test is as described"
  (s15), "do all three as one batch". BUILT + checked: E2 dropdowns on every form with a
  guessed category (B-065), D2 inside Edit loan (B-066), F2 banner + F3 list of household
  changes (B-067). (An earlier run of this request was cut off after E2 and D2 with F2/F3
  half-written; it was finished from where it stopped, not redone.) Phone: TEST-3 section 16.

- NEWEST (2026-10-29, 17:15): Cath: "device test is as described" (TEST-3 s16). Every item
  from her 2026-10-29 list is built and phone-tested. COMPLETE OPEN LIST given to her today
  (from BUG-HUNT.md, SECURITY-3.2-PLAN.md, SMOOTH-HUNT.md, BUG-LOG.md, this log):
  A. Release: v3 holds everything since 3.1.0 (K4, K5 step 1, all of 2026-10-29) and is NOT
     merged into main; then an EAS build (version 3.2) and its build-only phone checks.
  B. Security 3.2 (SECURITY-3.2-PLAN.md), her 4 open questions: K3 option A only or A then B;
     re-lock also when a member leaves / owner hands over; "Upgrade lock" for unlinked
     profiles; password rounds after "Check sign-in speed" on her phone. Then K5 steps 2-9
     and K3. K2 peel-off switches: mockup K2c only, her decision.
  C. Version 3 features not started: Forgot password / email check / Delete account;
     privacy policy; Play Store listing; Firebase App Check; Premium payments; smart
     features; widgets (need a development build); Help & FAQ; linked-household extras.
  D. Smoothness: rebuild BottomSheet on the animation library so big forms are ready before
     they rise (drag-down already done, bbde10c).
  E. Housekeeping: 17 older fixed bugs with no automatic check (BUG-LOG B-004..B-033 "none
     yet"); stray files firestore-debug.log, mobile-app/screen.png, screen2.png; Android
     package name (now com.cathlauron.householdfinance) to confirm before the Play Store;
     PROGRESS5 Quick Unlock Step 6 checklist (paused: still wanted?); Payment Methods report
     and orphaned Firestore household cleanup (older notes); guest "Keep your first entry
     safe" sheet shows before the item appears (cosmetic); H-04 / H-06 parked by her ("leave
     as is"); a fresh bug hunt with the improved skill.

- NEWEST (2026-10-29, 17:25): Cath shared her other account's conversation. Corrections to
  the open list: her K3 answers are IN (key chain; also re-key when someone leaves by
  themselves; unlinked accounts get a new Recovery Key after the upgrade); password rounds
  stay 100,000 until she times "Check sign-in speed" in the INSTALLED app; K4 is built on v3
  but its Firestore rules (householdRecovery: requester-only read once sent, 15-minute
  expiry) are NOT published yet (to publish with K3); K3 was being built by a helper in a
  separate copy that never reached the repo: not built; peel-off K2c mockup (top-right to
  bottom-left, live peek, steady peel on tap) waits for her OK; "big forms built before they
  rise" left out on purpose (it would add a blank moment): her call.
  SUGGESTED ORDER (batches, waiting for her OK): 1) Release 3.2 + speed check (merge v3 to main, version 3.2.0,
  EAS build, build-only phone checks, she times sign-in speed, stray files removed, package
  name confirmed). 2) Security: K3 + K5 writer steps (+ rounds from her timing), ONE rules
  publish (K4 + K3), 3-person test household. 3) Safety net + polish: checks for the 17
  unguarded old bugs, peel-off switches (after her OK), guest first-entry cosmetic, fresh
  bug hunt from data safety. 4) Accounts + publishing: Forgot password / email check /
  Delete account, privacy policy, Help & FAQ, App Check, Play listing. 5) Growth: Premium
  payments, smart features, widgets (development build), linked-household extras.
  Ask-later: big-form rise rebuild, Quick Unlock Step 6, Payment Methods report, orphaned
  household cleanup, H-04 / H-06.

- NEWEST (2026-10-29, 17:35): STORE READINESS CHECKED (Cath asked before the 3.2 build). Full
  table in STORE-READINESS.md (repo root, main). Peel-off: Cath picked K2d-1 and asked for
  it to peel from the top-right corner = mockup K2e (design/3.0-mockups/peel-off-switches-
  k2e.html on v3); waits for her OK. Help & FAQ is NEEDED: mockup H1 (help-faq-h1.html on
  v3), waits for her OK on design and answer wording.
  STORE LIST (complete): BOTH STORES: B1 privacy policy page + in-app link (MISSING);
  B2 in-app Delete account (MISSING, needs mockup + OK: data); B3 delete-account web page
  (MISSING); B4 support web page (MISSING; email exists); B5 no placeholders: "Help &
  guides: Coming soon", remove "Check sign-in speed" after timing (MISSING); B6 hide
  Premium prices until real in-app purchases (MISSING, her call); B7 privacy label / Data
  safety answers (Cath); B8 age rating forms (Cath); B9 reviewer test account (Cath); B10
  listing text, screenshots, Play feature graphic (MISSING; icon OK); B11 permission texts
  (HAVE). GOOGLE: G1 target API 36 (HAVE: toolchain builds 36); G2 production .aab profile
  in eas.json (MISSING); G3 Play account + verification + package name (Cath); G4 closed
  test 12 testers x 14 days if personal account made after 13 Nov 2023 (Cath, ~3 weeks);
  G5 Financial features declaration (Cath); G6 Data safety deletion link (after B2/B3);
  G7 ads / app access / content rating / audience forms (Cath). APPLE: A1 developer
  program $99/yr (Cath; EAS builds without a Mac); A2 Xcode 26 / iOS 26 SDK (HAVE via
  EAS, confirm at upload); A3 ios.bundleIdentifier missing (MISSING, confirm name); A4
  supportsTablet true -> iPad screenshots (her call); A5 encryption export answers
  (crypto-js AES/PBKDF2 = standard algorithms outside Apple's) + ITSAppUsesNonExempt-
  Encryption (Cath + Claude); A6 Sign in with Apple not needed (HAVE); A7 EU trader
  status (Cath). Recommended: Forgot password / email check, App Check.

- NEWEST (2026-10-29, 17:49): CATH'S ANSWERS. No Google Play developer account yet; no
  Apple developer account yet; iPad: YES (keep supportsTablet true -> iPad layout check +
  iPad screenshots); iPhone app ID = com.cathlauron.householdfinance (same as Android);
  Premium: NOT hidden now; she will deal with it before uploading to the stores (reading:
  real payments before upload; to confirm). She APPROVED mockups K2e (corner peel) and H1
  (Help & FAQ + support page). She asked what can be done before / alongside batch 1;
  suggested plan given in chat, waiting for her OK.

- NEWEST (2026-10-29, night): BATCH 1+ BUILT on `v3` (her OK on the plan). Commits 618f7e0
  (store basics), Help & FAQ, 4051237 (peel), iPad, 5dfdfc3 (TEST-3 section 17). All checks
  pass (287 logic, 212 screen). Her answers this round: peel Theme = "Match my phone" sticker
  + "Dark mode" sticker (Dark greyed while Match is on); stickers on the Appearance page only.
  Built: (1) app.json ios.bundleIdentifier com.cathlauron.householdfinance (+ .v2 for the
  side-by-side build), buildNumber 1, requireFullScreen true (iPad upright + full screen,
  avoids the iPad multitasking upload error); eas.json "production" profile (.aab) + submit.
  (2) Web pages in mobile-app/hosting: support.html (made from src/helpFaq.ts by
  tools/build-web-pages.mjs; tests/webPages.test.mjs fails if they differ), privacy.html,
  delete-account.html (by email for now), site.css, links on index.html. NOT LIVE until Cath
  publishes Firebase Hosting. Privacy/delete pages have 3 choices for her: "within 30 days",
  "not for children under 13", shared-household items on delete (left neutral). (3) Help &
  FAQ page (H1, HelpFaqScreen, route HelpFaq) replaces "Help & guides: Coming soon"; About &
  Help adds Privacy policy + Delete account (opens the web page; in-app delete = batch 2);
  "More languages are coming later" removed; APP_VERSION moved to src/appVersion.ts (check vs
  app.json). (4) Peel-off switches K2e: components/PeelSticker.tsx, peelGeometry.ts,
  screenPeel.tsx (ScreenPeelHost in App.tsx), screens/AppearancePage.tsx (Appearance moved
  out of SettingsScreen); new motion value PEEL_TAP_MS 1000. (5) iPad-size walk: everything
  works, pages stretch full width (H-55, centred column = mockup first). Walk tool: WALK_SIZE /
  WALK_DARK, peel: / mpeel: steps; the checking copy may open Settings as a guest.
  STORE-READINESS.md updated. Next: her phone test (TEST-3 section 17), publish the web pages,
  then batch 1 (release 3.2).

- NEWEST (2026-10-30, early): RELEASE 3.2.0 MERGED INTO `main` (merge 6ad15c7; main = v3).
  Cath: section 17 tested; web pages published (firebase-tools deploy --only hosting, worked).
  Her answers: deletion within 30 days YES; not for children under 13 YES; what a member added
  to a shared household STAYS after they delete their account (now on delete-account.html:
  she must publish hosting again). She found 2 things: (1) B-068 Dark mode sticker drawn half
  peeled at rest ("☀ Lark") = fixed (sticker owns its values; PeelAtRest check red-green);
  needs her phone. (2) About & Help didn't match mockup H1 = rebuilt with icon tiles
  (IconRow in SettingsHub), Help & FAQ + New with Contact support, "Your data" with a red
  Delete account. 3.2.0 = version 3.2.0, versionCode 7, stray files removed (2 debug logs,
  screen.png, screen2.png), debug logs in .gitignore. Store plans ON HOLD (her words: only
  asked for the requirements for the future; no Play account for now).
  Mockups waiting for her pick (artifact "Mockups: iPad layout and Delete account",
  design/3.0-mockups/ipad-delete/): iPad I1 full width / I2 centred 600 / I3 centred 720;
  Delete account DA1 one page / DA2 sheet in 2 steps; owner of a 3+ household: choose who
  takes over, or first-joined takes over automatically.
  NEXT: she tests TEST-3 section 18 in Expo Go, then builds 3.2.0 ("preview" profile) and
  times Check sign-in speed on the installed app. Then batch 2 (3.3): K3 + K5 steps 2-9 with
  her rounds, Delete account (her pick), iPad (her pick), ONE rules publish, remove "Check
  sign-in speed".

- NEWEST (2026-10-30, 00:10): Cath: "New" tag on Help & FAQ now disappears once opened
  (helpSeen.ts, per phone; check in HelpFaq.test, red-green) + tile/tag colours stronger.
  iPad PARKED (her idea for later: "look more like a website and mobile app combined, the
  best of both worlds", not just a wider column). Owner question: she said "yes" = read as
  "the owner chooses who takes over" (like leaving today); to confirm in the next report.
  Delete account: she asked what most apps use; Claude recommended DA1 (one page:
  what goes / what stays / password / one red button / "Save a backup first").
  Expo free plan (expo.dev/pricing, read 2026-10-30): 15 Android + 15 iOS builds a month,
  low-priority queue, resets on the 1st; EAS Update free for 1,000 monthly active users.
  OPEN LIST BY "NEEDS A BUILD?" (given to her this day):
  NEEDS A NATIVE BUILD (bundle into the next build): (1) EAS Update (expo-updates) so later
  JS-only changes reach the installed app without a build: recommended for THIS build,
  waiting for her yes. (2) Later, store-time only: Premium payments (store billing),
  Firebase App Check, widgets. (3) Build-only phone checks: sign-in speed timing, the peel
  on a real build, fingerprint/PIN, notifications, QR camera.
  NO BUILD NEEDED (Expo Go now; EAS Update later if added): Delete account in-app (her pick
  DA1/DA2 + rules publish); K3 + K5 steps 1-8 (step 9 = rounds from her timing); Forgot
  password / email check (needs a design: a reset locks encrypted data, Recovery Key path);
  remove "Check sign-in speed" after timing; checks for the 17 unguarded old bugs; guest
  first-entry cosmetic; fresh bug hunt; big-form rise (her call); Quick Unlock Step 6
  (still wanted?); Payment Methods report; orphaned household cleanup; H-04 / H-06 (parked).
  PARKED by her: iPad layout (idea above); store submission (Play account, testers, listing).

- NEWEST (2026-10-30, 00:25): CATH'S ANSWERS FOR BATCH 2 (all "a" except 12):
  1 updates download quietly, apply next launch; 2 deleted usernames become free; 3 email
  deletion requests: Cath deletes by hand with Claude's Console steps; 4 K3 test: Claude runs
  a private Firebase emulator copy, then a short 2-phone check; 5 partner installs 3.2.0;
  6 Forgot password = reset email -> sign in -> Recovery Key or member approval -> re-lock,
  WITH a warning before sending; 7 email check = gentle reminder until confirmed;
  8 Forgot password: mockup with the update, build after her pick; 9 guest first item shows
  in the list first (faded, "not saved yet"), then the sheet; 10 big-form rise: leave as is;
  11 short Quick Unlock check list in the 3.2 build checks; 12 Payment Methods report:
  DROPPED; 13 household created only when someone joins + Console steps to delete old empty
  ones; 14 fix H-04 and H-06. Plus: Delete account = DA1, owner chooses successor; the 17
  missing checks; a fresh bug hunt. Order: she builds 3.2.0 (needed `npm install` first for
  expo-updates) and sends sign-in times; Claude builds everything as ONE EAS Update
  (channel preview) + one rules publish; "Check sign-in speed" removed and rounds set then.

- NEWEST (2026-10-30, morning): BATCH 2 PROGRESS on `v3` (NOT on main; main = what she builds
  as 3.2.0). DONE, all checks pass (289 logic, 228 screen), each red-green where it fixes a bug:
  short Quick Unlock list in TEST-3 section 18; B-069 H-04 slow sync says "Still saving…"
  (SlowSyncNotFailed.test); B-070 H-06 saves wait for the phone copy (SaveWaitsForPhoneCopy.test);
  B-071 guest first item shows before the sheet (GuestFirstItem.test); B-072 an unused
  new-household code removes its empty household (UnusedCodeCleanup.test) + CONSOLE-STEPS.md
  (old empty households; email deletion requests); Delete account DA1 (deleteAccount.ts,
  DeleteAccountScreen.tsx, route DeleteAccount; needs NO rules change: existing rules already
  allow every step; DeleteAccount.test). Mockup FP (Forgot password + email check reminder):
  artifact "Mockup FP: Forgot password and email check", design/3.0-mockups/forgot-password-fp.html,
  waiting for her pick.
  BLOCKER for answer 4a: the Firebase emulator can't run in Claude's workspace (its download
  from storage.googleapis.com is blocked). K3 rules need a real test: ask her to run a
  prepared one-command rules test on her PC (needs Java 11+), or another way.
  NOT STARTED: K3 + K5 steps 1-8, the 17 missing checks, the fresh bug hunt.
  Web pages changed (support.html, delete-account.html): publish hosting again with the update.

- NEWEST (2026-10-30, 01:38): Cath APPROVED mockup FP (Forgot password with the warning before
  the email; "Confirm your email" note at the top of Settings, hides for a week on ✕). Build it
  in batch 2. Still waiting: her answer (a) one-command rules test on her PC / (b) 3-account
  real test, for K3.

### 2026-10-30 (later): the 17 old checks + bug hunt (batch 2, on v3)
- 17 old bugs without a check: 7 now guarded (tests/oldBugs.test.mjs), 4 pointed to existing
  checks, 2 removed features, 4 need a phone. Every BUG-LOG row now says which (none left "none yet").
  calendarPages.ts and linkCodeTime.ts split out of Calendar / Profile so they can be checked (same behaviour).
- Bug hunt: H-58 Delete account retry / username put-back FIXED and proven (B-073). H-59 (email
  note ✕ hides for every account on the phone) logged for Cath. Full checks pass: 295 logic, 235 screen.
- Next: K5 preparation steps (SECURITY-3.2-PLAN.md), then K3 once Cath picks (a) emulator or (b) 3 real accounts.
- 2026-10-30 (later still): Cath picked K3 option (a) (emulator test on her PC, Java install, one
  command; no real 3-person household). K5 step 2 built: rounds travel inside the salt
  (passwordRounds.ts); keys unchanged, proven by check. Checks: 299 logic, 235 screen.
  Next: K5 steps 3-5 (report 3.2 per phone/member, gated v2 writer, save key check) + K3, then
  ONE rules publish (K4 + K3) after her emulator run.
- 2026-10-30 (afternoon): Cath: "do everything on the next list". Done on v3, full checks pass
  (307 logic, 243 screen):
  - Bug hunt saving/syncing/encryption: H-60 fixed (B-074), nothing else found.
  - K5 steps 3-5 + K3 key chain built (see SECURITY-3.2-PLAN.md "Built so far"): keyChain.ts,
    keyChainPlan.ts, household.ts checked save, parts kv, sign-in / invite pickup, rules.
  - rules-test/ (repo root): Cath runs it on her PC after installing Java (Temurin 21):
    cd rules-test; npm install; npm test. Then ONE rules publish (K4 + K3) in the Console.
  - TEST-3 s19 = batch 2 phone list. Still waiting: her 3.2.0 build + sign-in times (rounds,
    removing "Check sign-in speed"), hosting republish, H-59 answer (email note per account?).
- 2026-10-30 11:30: Cath ran rules-test on her PC (Java + emulator): 21 pass, 0 fail (K3 + K4
  rules PROVEN on the emulator). The PERMISSION_DENIED lines are the "can't" checks being
  refused, as intended. Next: she publishes mobile-app/firestore.rules in the Console (K4 + K3).
