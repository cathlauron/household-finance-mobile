Household Finance Mobile App (Finance Flow) — Progress Log 7: Version 3

>>> START HERE (2026-10-16): This is the ACTIVE progress log. Version 2.0.0 is finished and
>>> merged into `main` (merge commit 9ae00f9). ALL new work happens on the `v3` branch.
>>> Read the "▶️ Next step" section at the bottom first.

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

=====================================================================
▶️ Next step
=====================================================================
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
