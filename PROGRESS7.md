Household Finance Mobile App (Finance Flow) — Progress Log 7: Version 3

>>> START HERE (2026-10-16): This is the ACTIVE progress log. Version 2.0.0 is finished and
>>> merged into `main` (merge commit 9ae00f9). ALL new work happens on the `v3` branch.
>>> Read the "▶️ Next step" section at the bottom first.
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

=====================================================================
🔧 In progress
=====================================================================
- Nothing half-built. Cath is about to send her own notes and ideas for version 3; read
  them first and agree an order with her before building.

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

=====================================================================
▶️ Next step
=====================================================================
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
  with undo, the PROGRESS5 notification loose ends, Maestro flows.
