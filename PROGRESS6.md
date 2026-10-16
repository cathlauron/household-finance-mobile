Household Finance Mobile App — Progress Log (Phase D: Apple-Inspired Design Polish Pass, the H series Home redesign, and the V series visual-system pass: mint base, accessible colors, shared components)

>>> START HERE: The redesign code is on the `redesign` branch; read the two design artifacts listed in PROGRESS6.md's R series section first.
>>> NEWEST (2026-10-16): see "R SERIES, SESSION 4" and the NEWEST ▶️ Next step bullet (security review → transitions → merge + EAS build).
>>> (older) 2026-10-15: see "R SERIES, SESSION 3".

This file picks up from PROGRESS5.md. PROGRESS5.md is now PAUSED, not closed for good —
work there stopped mid-way through Quick Unlock Step 6 (build made, installed, opens; the
actual test checklist not yet run) to prioritize this design pass instead. Nothing in
PROGRESS5.md is abandoned; see it for full step-by-step detail on Quick Unlock (Steps 1-6),
the Finance Flow rebrand (PC.0-PC.9), and everything it links back to (PROGRESS4.md,
PROGRESS3.md, PROGRESS2.md, PROGRESS1.md, PROGRESS.md).

✅ Carried forward from PROGRESS5.md — still true (condensed; see PROGRESS5.md for detail)
- Phase A (Firebase Auth, household linking, account recovery, multi-device sessions) —
  complete.
- Phase B checkpoints B.1 through B.14 — code-complete.
- Phase B Part 2 (Iconization & Minimalism Pass) — code-complete.
- All 13 original on-device bugs (#1-13) — fixed and fully verified on a real device.
- The Finance Flow rebrand (Pre-Phase C, checkpoints PC.0 through PC.9) is DONE: new
  palette/logo, restyled onboarding/sign-in/create-profile/Home/Profile/Settings screens,
  avatar system, Subscription placeholder screen, pull-to-refresh rolled out across nearly
  every screen with synced data (LATER REMOVED in Home round 2 in favour of native rubber-band overscroll).
- Bug #14 (the report-switcher pill row collapsing to invisible) — fixed and confirmed
  on-device.
- The "Quick Unlock after a full close" feature: Steps 1, 2, 3a, 3b-1, 3b-2, 3c-1, 3c-2,
  4a, 4b, 4c-1, 4c-2, 5a-1, 5a-2 (offline unlock for unlinked profiles, partially tested)
  and 5b (account switching) are ALL DONE and confirmed on-device. Step 6 (one EAS build +
  full on-device test pass, including the true-offline-relaunch test Expo Go couldn't run,
  and real Google/Apple/Facebook sign-in for PC.3) is IN PROGRESS: the build was produced
  and installed and confirmed to open, but the actual test checklist has not been run yet.

⏸️ Deferred from PROGRESS5.md — paused, not abandoned, resume there when this pass wraps
- Quick Unlock Step 6's test checklist: close/reopen, log out, remote revoke, 5 wrong
  PINs, airplane mode / true offline relaunch, photo avatar in the switcher, all 5
  accounts — plus real Google/Apple/Facebook sign-in testing for PC.3.
- The 5a-2 "offline unlock shows no loading indicator, looks like a freeze" cosmetic
  finding — never investigated.
- All five Maestro automated test flows (create-profile, sign-in, change-password,
  pin-quick-unlock, sign-out-round-trip) — still targeting Expo Go, never updated for an
  installed build, never run for real.
- Notification loose ends: subscription reminder's tap-to-deep-link path (untested);
  sign-out doesn't cancel scheduled notifications; a cancelled subscription still gets a
  "due soon" reminder; the weekly recap's "tap to see the breakdown" opens nothing.
- Optional pull-to-refresh on Profile, Settings, and the Reports child screens.
- Firestore security rules hardening: confirm sign-in is required in the Firebase
  Console; consider removing the ownerUid fallback (needs Rules Playground testing first);
  never checked — join-a-household-by-ID risk, username squatting, link-code guessability,
  whether sign-up is open to anyone.
- Actual Phase C publishing (C.1 real installable build for distribution, C.2 optional
  Google Play / Apple App Store listing).
- Small stray items: Change PIN's ~50-second timing never re-measured on an installed
  build; (RESOLVED in V.2d: the chip row was removed) PinUnlockScreen's password-mode chip row had garbled/truncated username labels;
  avatar refresh in the switcher only updates the account currently signing in; a known
  offline-cache gap for linked households' data; iOS may need a faceIDPermission config
  entry (unconfirmed, only matters once an iOS build happens); About page's version number
  is hard-coded and will drift from app.json.

📌 Decisions carried forward — still active (project-wide, not phase-specific)
- Always retrieve/view exact current file contents before writing code; confirm design
  decisions before writing code; review real diffs before committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project. Chain git
  commands on separate lines rather than with "&&".
- Insist on real command output/diffs from Antigravity/Copilot, not narrative summaries.
- Close/Save All open VS Code tabs before any commit, including progress-file-only commits.
- After any round of fixes, independently re-verify against real, current code before
  considering it done — don't trust progress-log claims or commit messages alone.
- Never hand the person a conditional/branching instruction — get the real answer via
  investigation first, then give one unconditional fix.

=====================================================================
ARCHIVED SECTIONS: see PROGRESS6-ARCHIVE-1.md
=====================================================================
Older detailed sections were moved to PROGRESS6-ARCHIVE-1.md on 2026-10-14: Phase D
(D.1-D.7), Calendar view modes + Swipe/Scroll, the full Android test pass, the H series
(Home redesign), the mint background restyle, Home round 2 and the bell inbox, the whole
V series (V.0-V.8), Cleanup Batches A-F, and Home + Calendar polish Parts 1-3. Nothing
was deleted. Open the archive for full detail, file lists and the reasoning behind each
decision. Some of these predate the R series redesign; where the R series section below
disagrees, the R series wins.

Standing decisions from the archived sections (still active, do not re-litigate)
- No react-native-reanimated (plain Animated only). No true squircles. No audio cues.
  react-native-svg IS installed (leaves, gradients).
- Haptics via src/haptics.ts: hapticMedium for rare heavy commits (delete), hapticLight
  for Save/Submit, hapticSelection for boolean toggles. The shared Button fires its own
  haptic; never add an inline one as well (double buzz).
- src/tokens.ts (radii and spacing keyed by pixel value, radii.pill = 999) is a static
  file, not part of ThemeContext. src/typography.ts exists for NEW code only.
- Root screen changes fade in via ScreenFade in App.tsx (keyed on screen; the cold-start
  splash stays instant). It is a fade-in, not a two-layer cross-fade.
- Pull-to-refresh is removed everywhere. PullToRefreshScrollView (named export) now only
  gives rubber-band overscroll.
- Never white text or icons on a pastel status colour. Use colors.navy2, or the fixed
  '#C81E43' for destructive fills and badges (colors.error is a pastel in dark mode).
- Shared components: Pill (no variant prop; use tone / fill / minWidth / compact),
  Button (primary, destructive, quiet, solidDanger, outlineDanger, secondary; size
  compact), Card (card / banner), AmountInput (money fields only; allowNegative only on
  the Accounts balance; percent and day/month fields stay plain TextInput).
- Number | '' states: pass numbers into the setters and use typeof x === 'number' ? x : ''
  (never x ? x : '').
- Destructive actions: outlined opener; solid red only on the final "Yes, ..." confirm.
- Settings sub-page titles come from navigation.setOptions (PAGE_TITLES); no in-body back
  links. Settings opens a page from route.params.page.
- Bell inbox: recovery requests, overdue items, due in the next 14 days. Read state per
  item per profile (bellReadState.ts). Only one-time borrowed loans can be overdue.
  todayISO in dateUtils.ts uses the LOCAL date, never toISOString (UTC is wrong in PH).
- Open-bill/debt/loan requests remember a pending request if To-Pay has not mounted yet.
- Calendar: bottom sheet (iOS 'modal', Android 'formSheet'); out-of-month days are
  display-only; range stays +/-24 months; the Swipe and Scroll FlatLists need their key
  props.
- The leaf/gradient background renders once at the App.tsx root (not on the 'loading'
  splash). IntroScreen's splash stays opaque.
- The SafeAreaView import from 'react-native' is left as-is on purpose (swapping it would
  double the status-bar padding on some screens).
- Never write find/replace text from an Antigravity summary; use real file text. Locator
  lines shown in a snippet are not pasted. Antigravity line numbers are unreliable.
- After native-module or root App.tsx changes, retest with npx expo start -c and a fully
  closed and reopened Expo Go before deciding a fix failed.

Still open from the archived sections (check against the R series first)
- Dark mode: the Calendar "today" cell used '#FFFFFF' on colors.gold (white on pastel);
  change to colors.navy2 if it is still there.
- Test whether swiping the Calendar sheet down works on Android; if it does, remove the
  Android X.
- Update mobile-app/EMULATOR-TESTING-CHECKLIST.md sections 14-15 (old Insights sections).
- Phone checklist: dark-mode leaf opacity; Android large-font setting on tab labels, Pills
  and the Month pill; bell fresh-launch tap-through; bell recovery row with a second
  device; which Settings sub-pages looked cream or solid.
- Needs an iPhone: iOS card shadow, iPhone Calendar 'modal' look, iOS faceIDPermission.
- No manual "Sync now" button (useRefresh.tsx and refreshModel are kept but unused).
- Optional: delete now-unused styles (Settings/Profile danger styles, cancelInlineButton,
  primaryFullButton, Calendar dayBalanceText); Transactions default month; tidy imports.
- A NEW EAS build is required before any of this works in an installed app
  (react-native-svg is a native module).

=====================================================================
📚 Rubber band audit session log archived in PROGRESS6-ARCHIVE-2.md (2026-10-15).
Its two open problems (Bills no bounce, Person Spending top-only bounce) are DONE per
Cath (2026-10-15). Everything else from it is folded into the sections here.

=====================================================================
🎨 R SERIES: Finance Flow full redesign to match the Claude Design mockups (2026-10-14)
=====================================================================

Why: Cath wanted every screen to look exactly like her Claude Design mockups, then chose
"Everything, including features" (bills, loans, cards and transactions get full pages, not
expanding rows). Unlike the Antigravity rounds, this work was done in a Claude Code session
with direct repo access: Claude wrote the code, ran npx tsc --noEmit, and committed and
pushed every step to the `redesign` branch (65 commits, all tsc clean). Cath tested each
step on her phone in Expo Go and replied "device test is as described" before the next.

🔗 Design references (most up-to-date versions as of this wrap-up)
- Mockups (Design canvas, 55 artboards, all screens): "Finance Flow Redesign"
  https://claude.ai/artifact/AszP4RAjsgqkyB4uYXwXgA (version 213, id 1792004732-0aef).
  Includes this session's changes: soft gradients on every screen (in its shared
  ds/financeflow/components/bundle.css), an interactive Wallet on Home (swipe with corner
  lift, hold-to-move with slant and see-through held card, type tags, gradient cards),
  To-Pay without the top + (the + button adds a bill), Plan without the floating +.
- Design system: "Finance Flow" https://claude.ai/artifact/CHvvSdWHaX5qkmDvSE3BVZ
  (version 39, id 1792004719-e46a). Updated this session: README gains a Gradients
  section, the new Settings / Plan / Insights structure and Wallet behaviour; WalletCard
  and HeroCard guidelines rewritten; components/bundle.css has the gradient rules. The
  mockup canvas now points at this version.
- Both are private to Cath's account. Start a new conversation by reading them (Artifact
  read) rather than relying on older local copies.

🧪 How to test the redesign (it is NOT merged into main yet)
- From the repo root:  git status; git checkout redesign; git pull; cd mobile-app; npx expo start -c
- Afterwards:          cd ..; git checkout main
- PROGRESS6.md lives on main; the redesign code lives on the `redesign` branch.

✅ DONE on `redesign` (code-complete, tsc clean, each step device-tested in Expo Go unless noted)
- Steps 1-4: Finance Flow colours (theme.ts plus new keys positive, negative, saving,
  planned, onAccent, accentTint, buttonFill, onButton), floating rounded tab bar (Home,
  Transactions, To-Pay, Plan; Plan replaces More), Nunito font app-wide (AppText wrapper,
  all 53 files import Text/TextInput from it), floating + button on the thumb side
  (fabSide.ts).
- Step 5: Home greeting header, mood-coloured Left to Spend card (mood.tsx: good / low /
  over swaps accent colours app-wide; MoodThemeProvider in App.tsx), Wallet, Due soon,
  Insights. Left to Spend now records when balances were last updated (asOfDate +
  asOfAt) and counts same-day spending added after that exact moment (createdAt).
- Steps 6-9: Transactions, To-Pay, Plan, Settings in the new style; Settings opens from
  the Home photo.
- Step 10: animated opening screen (IntroScreen: logo draws itself, leaves drift,
  progress line fills once then fades), new LogoMark on sign-in, switcher, create
  account, unlock.
- Steps 11-12: forms and bottom sheets restyled; readable text sizes; large titles via a
  custom LargeHeader; the 54-leaf background field in the mood colour.
- Steps 13-16: Home exactly per mockup (two-page HomeHero), Transaction detail page,
  quick New transaction sheet, Search, To review, To-Pay with full Bill / Debt / Loan
  pages (PayDetail: Mark as paid / Undo, 6-month bars, history; billPayments.ts keeps
  paid cycles as history and queues the next one), Subscriptions page, Card page
  (CardDetail) and Move money (TransferScreen; a `transfers` record).
- Wallet (HomeWallet.tsx), after many rounds of Cath's feedback:
  - Cards show a Cash / Debit / Credit tag, a 1px edge in the card colour, minimal
    shadows, and a soft gradient (GradientFill kind "card").
  - Swipe right: the bottom-left corner lifts (rotate about 5° to 9°), the card slides off
    to the right and comes back in from the right to the back of the stack, levelling out.
    Swipe left (undo): the back card does the same and lands at the front.
  - Hold about 0.35s then drag: the card lifts 22px with the same 5° slant, goes 70%
    opaque, sits behind the cards in front of the gap (only its top shows) and a gap opens
    where it will land. On drop the lift and slant ease out.
  - Order is saved in model.walletOrder (debounced 1.2s). All animation uses the native
    driver.
- Gradients everywhere (new components/GradientFill.tsx):
  - It measures its parent and clips itself to the parent's corners.
  - kind "solid": Left to Spend at 26%, filled buttons at 18%.
  - kind "tint": light green fills such as icon tiles, the + button and selected states.
  - kind "surface": white boxes fade to a faint accent tint.
  - kind "card": Wallet cards.
  - 13 eased stops so no colour lines show.
  - Given `match={sameStyleAsParent}` it picks the look from the parent's background
    colour and skips tiny shapes. A script added it to 228 places in 48 files, plus the
    tab bar and the + button.
- Step 17, Savings:
  - Pots / Emergency / FI tabs.
  - Pots: "Set aside in total", pot rows, and a new PotDetail page with Add money and Move
    out (with the account), history, target, "Kept in", and "Add ₱X every payday".
  - savingsPots.ts: payday top-ups catch up when Home opens; tested with a twice-a-month
    salary.
  - Money moved out is a negative contribution, so it returns to spending money and shows
    as money in.
  - Emergency and FI tabs are tappable rows with one edit sheet. New efTargetMonths
    setting (3/6/9/12).
- Step 18, Plan (each section is now its own page with + in the top bar):
  - Groceries:
    - List: tick buttons, "Show N more", and Finish trip, which adds one Groceries
      transaction and clears the ticked items.
    - Calculator: quantity × price.
    - Meal ideas: new mealIdeas data, kept on sync.
  - Travel: the next trip is featured with Budget / Saved or Left / Paid and its checklist
    ticks on the page; past trips show under or over budget.
  - Events:
    - Upcoming / Done tabs.
    - Expandable rows with item breakdowns and a "Save for this in Savings" switch.
    - Mark as done logs the expense.
    - Annual events return to Upcoming 30 days after done, with yearly history.
  - Yearly Goals: a progress ring; amount goals can follow a savings pot or a debt/loan;
    checklist goals tick on the page.
- Step 19, Insights and Reports:
  - Home › Reports opens Insights: 6-month bars, where this month went, and the Reports
    list. Each report is its own page (ReportDetailScreen); "More reports" lists the rest.
  - Close-out: shows last month with month arrows, under/over budget, and where it went
    against last month.
  - Cash flow: 30/60/90 days, the lowest point and why, a line chart, and the biggest
    moves.
  - Year in review: tiles, totals, and "Share your year" with no amounts.
- Step 20, Settings:
  - Profile card, then Household, Account & Security, Appearance, Notifications,
    Budgeting, Categories & Rules, Backup & Data and About & Help (each a page made of the
    existing blocks), then Lock app now, Switch account and Log out.
  - Appearance gains Mood colours and Falling leaves switches; "Device" is now
    "Automatic".
  - Profile opens with `section` "profile" or "household". Household linking code is
    unchanged.
  - Import from a spreadsheet moved from Transactions to Backup & Data.
- Step 21, onboarding:
  - The Welcome screen replaces the intro slides.
  - After Quick Unlock (unchanged; skipping it now continues) come 3 setup steps
    (components/OnboardSetup.tsx):
    1. Where's your money?: add accounts.
    2. Your month: a new settings.monthlySpendingBudget (used by the close-out when there
       are no category budgets), plus categories to watch.
    3. Make it yours: a new settings.walletName, Light / Dark, and which thumb taps +.
  - Unlock shows a quick tick after fingerprint or face, then goes straight in.
- Smaller agreed changes: no top-bar + on To-Pay (the floating + adds a bill, debt or loan
  for the segment showing); no floating + on the Plan tab.

🍂 R SERIES, SESSION 2 (2026-10-14 to 2026-10-15): steps 22-37
=====================================================================
Same way of working as session 1: Claude Code has direct access to the repo, edits the
code, runs npx tsc --noEmit, then commits and pushes to the `redesign` branch. Cath runs
git pull + npx expo start -c and tests in Expo Go. "device test is as described" is the
sign-off before the next step. 21 commits this session, all tsc clean (4b2d15d to aadb869).

✅ Done this session (all on `redesign`, device-tested unless marked)
- 22 Calendar matches the mockup (4b2d15d): white sheet; a month title with a chevron;
  four round buttons (previous, next, view options, close); a "Projected balance" label
  plus a Today chip; a box-free grid with 34px number circles and 5px dots; selected = ink
  circle; today = accent text; the day panel always shows (no popup). List mode was folded
  in (a saved 'list' setting shows as compact).
- 23 Calendar month/year picker (6d8ae5f): tap the month title to jump to any month
  (24-month range).
- 24-26 Falling leaves (881c73b, 1d74386, fa48404, 7d3d3e1) in
  components/FallingLeaves.tsx + components/leafShape.ts.
  - Depths: far 6, mid 6, near 2 (blur off).
  - FALL_SLOWDOWN 2.5, SWAY_SLOWDOWN 1.6, WIND_STRENGTH 0.3, GUST_TILT_DEG 6, gust 1600ms.
  - Sway uses self-chaining swings, not Animated.loop; the loop caused the twitch.
  - Tab switches blow the leaves sideways: TAB_ORDER Home, Transactions, To-Pay, Plan,
    -150 x the number of tabs moved. Settings gives a gust of -60, and back from Settings
    +60.
  - Onboarding steps also gust (useLeafGustOnStep).
  - LeafBackground switches between the static and falling leaves based on the setting,
    Reduce Motion, and the app being in the foreground. LeafTransitionOverlay was deleted.
- 27 Responsiveness pass (7750910, 12fb18e): plain ScrollView with
  keyboardShouldPersistTaps="handled" (first taps register); GradientFill memoized and
  using expo-linear-gradient (CardGradient stays SVG); HomeWallet tap maxDuration 340;
  Home useMemo for heavy sums.
- 28 Screen transitions (ecf6e6c, 02fc8dc):
  - Main tabs: navigation/TabPage.tsx slides each tab left or right by its position
    (320ms). An external currentTab store means AddFab no longer re-renders MainTabs.
    detachInactiveScreens={false}.
  - Other pages: RootStack uses animation 'slide_from_right', and
    navigation/DeferredContent.tsx builds the page content after the slide starts.
  - STILL LAGGY on device; parked (see known issues).
- 29 Subscriptions cancel-by reminders (2be9feb): a notification at 9:00 on the cancel-by
  day (or one minute from now if it is set for today after 9). Scheduled even with bill
  reminders off. Cancelled subscriptions no longer alert. Setting a cancel-by date asks
  for notification permission.
- 30 Live account balances + Left to Spend colour (7ae9ebe).
  - A balance = the saved snapshot (asOfDate/asOfAt) + activity since, matched by
    paymentMethod. Activity covers: manual transactions, paid bill/debt cycles, loan
    payments, savings contributions and logged paydays.
  - Editing a balance bakes the live figure into the snapshot.
  - "Running low" is measured against Settings › Budgeting › Monthly budget (a new
    AmountInput there, with an "At X%, Left to Spend turns orange below ₱Y" line), or
    against monthly bills if no budget is set.
  - Left to Spend = balance at the day before the next payday, never earlier than today.
- 31 Offline banner (a546cf8): components/OfflineBanner.tsx. DataContext tracks
  isOnline/pendingChanges with expo-network and syncs on reconnect. NOT WORKING on device;
  parked.
- 32 Make it repeat (a8e2228): recurring.ts and screens/RecurringScreen.tsx, reached from
  the repeat icon on Transactions.
  - TransactionDetail has a "Make it repeat" sheet: Never, weekly, every 2 weeks,
    monthly, yearly.
  - Recurring ids are `rec-<ruleId>-<date>`.
  - "Ask before adding" puts new ones in To review.
  - mergeModels merges rules by id and keeps the later nextDate.
- 33 Transactions need an account (ef9ca9f): components/AccountPicker.tsx replaces
  PaymentMethodPicker.
  - Money out: cash or debit is blocked at a zero balance or when the amount is more than
    the balance ("Insufficient balance"); credit is always allowed. Money in asks
    "Add to".
  - Accounts page: list view only; one + opens a Cash/Debit/Credit chooser; the per-group
    add buttons and type banners are gone (AccountCard hideTypeBadge); an Income row was
    added.
- 34 Same account rule everywhere (887c57c): components/PayFromSheet.tsx. Bills/debts
  "Mark as paid", loan "Log payment / Log money received", Loans "Log a new payment", and
  pots "Add money / Move out" all need an account and can't overdraw.
- 35 Income is a projection (067bac3, 6aeab0a).
  - Expected monthly income shows in blue (colors.planned) and is NOT in balances.
  - Only logged paydays add money, into the required "Paydays go into" account
    (IncomeSource.depositTo, PaymentLogEntry.paymentMethod/createdAt).
  - Calendar: expected income only for dates after today; logged paydays show as
    "(received)".
  - A payday logged near an expected one replaces it (isPaydayReceived window: weekly ±3
    days, biweekly/semi-monthly ±6, monthly/one-time ±10). nextHouseholdPayDate skips
    paydays already received early.
  - The squeezed payday-row calendar on the Income edit screen was fixed (rows are now
    vertical).
- 36 Small fixes (3885785): the Home wallet link says "Add account". The Income page
  explains that ₱65,000 = ₱30,000 every 2 weeks x 26 ÷ 12 (a monthly average); this was
  not a bug.
- 37 Envelopes (aadb869): envelopes.ts and screens/EnvelopesScreen.tsx (route
  Envelopes), reached from Settings › Budgeting › Envelopes.
  - "Not given a job yet" = monthly budget (or this month's expected paydays) minus the
    envelope amounts, with an Assign sheet.
  - Each envelope shows left/over, spent of available, and a bar (orange at 80%, red at
    100%). Tap to edit or remove.
  - "Roll leftovers into next month": settings.envelopeRollover/envelopeRolloverFrom;
    counts from the month it is turned on; never rolls a negative.

📌 Decisions (session 2)
- Envelopes and the Category Watchlist are ONE list (model.categoryBudgets). Envelope
  spending counts by transaction category.
- Expected income is never real money: it is projection only (blue). Balances change only
  through logged paydays.
- Every money movement needs an account. Cash and debit can never go below zero; credit
  can.
- The Accounts page is a list only (the Home wallet already shows the stacked cards).
- The Income page total stays a monthly average; offered "Expected this month" instead
  (not chosen yet).
- Lag, the offline banner and the GO_BACK warning were deliberately parked by Cath.
- New packages: expo-linear-gradient ~15.0.8 and expo-network ~8.0.8 (both included in
  Expo Go; they still need the new EAS build).

⚠️ Known issues / open problems (session 2), parked by Cath
- SCREEN TRANSITION LAG (tabs and pages) is still there on device.
  Tried so far:
  - ios_from_right, which showed through because it only moved 30%
  - slide_from_right
  - DeferredContent
  - moving activeTab to an external store
  - TabPage self-animation
  - memoized GradientFill and screenOptions
  - native gradients
  Ideas not tried yet:
  - test in a release/EAS build first (Expo Go is slower)
  - react-native-reanimated or the native-stack defaults
  - profile the heaviest screens (Home, Settings)
- OFFLINE BANNER doesn't show in airplane mode, and a "Sync Failed" alert still appears.
  expo-network likely isn't reporting offline in Expo Go. Check
  Network.getNetworkStateAsync / isInternetReachable on device.
- Warning "The action 'GO_BACK' was not handled" after adding a transaction from the
  quick-add sheet.
- (Update to the older R-series known issues above:) the falling-leaves animation and the
  cancel-by reminders ARE now built (steps 24-26, 29).
- Still no device confirmation for the early-payday Calendar fix (6aeab0a) as a separate
  test; Cath's later tests passed.

📁 Files (session 2, under mobile-app/src)
- New:
  - components: FallingLeaves.tsx, leafShape.ts, OfflineBanner.tsx, AccountPicker.tsx,
    PayFromSheet.tsx
  - navigation: TabPage.tsx, DeferredContent.tsx
  - recurring.ts, envelopes.ts
  - screens: RecurringScreen.tsx, EnvelopesScreen.tsx
- Deleted: LeafTransitionOverlay.
- Changed:
  - screens: CalendarScreen, HomeScreen, AccountsScreen, CardDetailScreen,
    SettingsScreen, SubscriptionsScreen, TransactionsScreen, TransactionDetailScreen,
    PayDetailScreen, LoansScreen, PotDetailScreen, IncomeScreen, OnboardingScreen
  - components: OnboardSetup, LeafBackground, GradientFill, HomeWallet, AccountCard
  - navigation: MainTabs, RootStack, LargeHeader
  - balanceProjection.ts, pushNotifications.ts, DataContext.tsx, mergeModels.ts,
    types.ts, leafTransition.ts, PullToRefreshScrollView.tsx, App.tsx
  - package.json: expo-linear-gradient, expo-network

=====================================================================
🌿 R SERIES, SESSION 3 (2026-10-15): sign-in once, simple forms, Shared Expenses,
Settings / Profile / Household / Accounts / Income redesigns
=====================================================================
Same way of working: Claude Code (direct repo access) edits code on `redesign`, runs
npx tsc --noEmit until clean, commits and pushes; Cath tests in Expo Go (git pull;
cd mobile-app; npx expo start -c; for fair speed tests add --no-dev --minify) and replies
"device test is as described" before the next step. New designs are mocked up first on
the Design canvas and built only after Cath approves. 39 commits (07b4667 to 503ac53),
all tsc clean, all device-tested by Cath.

🔗 Design canvas for this session: "Finance Flow — Forms Redesign"
https://claude.ai/artifact/3tWYb57gAsRQjwXzf1rN1T (version 25). Rows: Home date pill/tile,
detailed and simple bill/debt/loan/income forms, Settings & Profile (simple), Change
password & Recovery key, Amount entry / Accounts / Income (incl. 3 Income options), and
Household / Security / switches. Uses the Finance Flow design system
https://claude.ai/artifact/CHvvSdWHaX5qkmDvSE3BVZ. Main mockups canvas (older):
https://claude.ai/artifact/AszP4RAjsgqkyB4uYXwXgA.

✅ Done this session (all on `redesign`, device-tested)
- Sign in once (07b4667): staySignedIn.ts keeps {email, username, password} in
  SecureStore (WHEN_UNLOCKED_THIS_DEVICE_ONLY). Cold start: unlinked profiles unlock
  offline; linked ones sign in silently under the opening screen. Cleared on full sign-out,
  switch account, remote revoke, password out of date, or unlocking into another account.
  Smaller bottom leaf on the opening screen.
- Round 1 (3c60ca6, d9d0595): sign-in logo lower and closer to the title; account card
  colours carry through (CardFace.tsx: Accounts, Wallet tags, account picker, transfer,
  transaction detail); To-Pay and other tabs stay on the same sub-tab after saving
  (stickyState.ts); Text size setting Small / Medium / Large (textSize.ts, AppText scales).
- Round 2 (1334291, 5a87720, d0fcd89): the cursor goes to the first field in every add
  form (AppText delayed autoFocus); Savings form says Save / Title; pull down on
  Transactions opens Search, which drops in from the top (pullDownToOpen.tsx).
- Round 3, debts (efc8a17): Mark as paid fills in the minimum; partial payments keep the
  original due as history; the unpaid minimum (plus an optional late fee) carries to the
  next due; one-time debts get a remainder cycle (billPayments.ts, PayFromSheet).
- Income + Money in (f54cd3b, 8fc28f7, 0dc0f62): Money in asks "What is it?" (salary,
  bonus, side job, allowance, gift, other; incomeKinds.ts). Salary picks an income source
  and logs a payday (the same record as logging it on Income). Extra income section on
  Income. Home "Accounts ›" header; Left to Spend third page "Where it comes from";
  date pill on the calendar button.
- Simple forms (f96f2f6, 3632134): approved "Option 2" layout (SimpleForm.tsx) for bills,
  debts, loans and income: Cancel / title / Save bar, big amount, white grouped rows,
  rows that open their choices underneath.
- Shared Expenses, 4 steps (7f97e16, 0e92c72, 70331d7, 1cb5644): sharedExpenses.ts and
  SharedExpensesScreen (Plan › Shared Expenses): people, add/edit/delete with equal or
  custom split, balances netted per pair, Settle up (optional account logs money in/out),
  Activity with Undo, "Split with others" from a transaction.
- Settings + Profile redesign (9f8aeeb, bd40cf2, f8a9c3c, 7645797, fc62d23):
  - Settings hub: profile card, a quiet "Finance Flow Premium › Upgrade" row, Money
    (Budgeting, Categories & Rules), App (Backup & Data, About & Help), Switch account,
    Log out. "Lock app now" removed.
  - Profile: picture with camera badge, @username, email; Username / Member since;
    Household / Account & Security; Appearance / Notifications.
  - Profile picture sheet: "Your photos" keeps up to 4 uploaded photos (model.avatarPhotos,
    encrypted and synced, Cath's choice), tap to use, + to add, Edit to delete.
  - Every Settings page uses plain grouped rows (SettingsHub: SettingsGroup with label /
    footer / plain, PlainRow, SegmentRow). Categories / Payees / Rules open as their own
    pages. About & Help shows the LogoMark. Premium page restyled as a plan page (Yearly
    ₱950.40 "Save 20%" / Monthly ₱99); Subscribe says it opens soon (no payments exist).
  - Change password and Secret Recovery Key are simple sheets (SheetBar with faded Done
    until ready, PasswordRow, SheetHero). After a password change that invalidates the
    key, "Make a new recovery key" opens the key sheet. Key shown on ONE line with dashes
    plus Copy key.
  - List Rows: only a Swipe to delete switch; its preview plays 3 times and only right
    after turning it on.
  - Household: a real Cancel invite (separate from New code).
- Home light/dark switch beside the bell (b61366d).
- Offline (99b8a63): DataContext re-checks the connection every 4s while open and when the
  app returns; a sync that fails while offline shows the offline banner instead of
  "Sync Failed". The GO_BACK warning no longer appears (Cath, 2026-10-15).
- Big amounts (df93f87 and earlier tries): CenteredAmount.tsx draws "₱0.00" itself,
  centred, with its own blinking cursor in the middle before typing; digits grow from the
  centre with commas. Used by every big amount (new transaction, bills, debts, loans,
  income, shared). Plain AmountInput fields are unchanged.
- Accounts redesign (87520ad): soft white Total balance in money colours (green / red /
  grey) with "Credit owed" in red and the next payday row (opens Income); accounts as
  simple rows with a colour chip and money-coloured balance.
- Income redesign, option 3 (4b74a4b, 19cc029): "Expected in <month>" (blue) with
  received (green) and a bar; one row per person (received / expected); a person's page
  (route IncomePerson) lists their paydays this month (logged = green tick with actual
  amount and "₱X more/less than expected"; to come = dashed blue) and their sources;
  tap a payday to log it (Log payday sheet, same record as Money in › Salary); + in the
  header adds a source. incomeMonth.ts matches logged paydays to scheduled ones within
  7 days; unmatched ones show as "Extra payday".
- Sheets reach the bottom edge (7c08965): BottomSheet's Modal is statusBarTranslucent +
  navigationBarTranslucent and pads by the bottom inset (no strip under sheets).
- Switches (ce4807b): AppSwitch everywhere: white knob, track = mood colour when on,
  light grey off. Account & Security: "Active devices" row opens its own page (This phone /
  Other devices with Sign out; "Sign out all other devices" with a confirm).
- Household redesign (503ac53): status card (Shared household / Just you), Members with
  Remove and Invite someone, "Which one is you?" with a tick, Unlink this device as a red
  row; one invite card (code, waiting, New code / Cancel invite); just-you view with
  Invite someone and a Join with a code row. Confirm steps unchanged.
- Transitions: tabs (TabPage) and pages (RootStack animation 'fade') now use a short soft
  fade; earlier slide attempts (420ms cross-fade, 560ms 22% glide, 400ms full push) were
  rejected. Cath still wants an "ebook page turn" feel (see Next step).

📌 Decisions (session 3)
- Sign in once: only a remote revoke, a full log out, or switching accounts asks for the
  password again.
- Repeating debts have no total balance; an overpayment only shows in history (a
  "Total still owed" field was offered, not built).
- Income page total = expected this calendar month (not a monthly average).
- Income page uses "by person" (option 3) so it stays short for 5 members with several
  sources each.
- Money colours on totals: green = real money, red = owed, blue = projected.
- Saved profile photos: encrypted and synced, up to 4 per person.
- Premium stays a placeholder; no payment flow. Benefits list is a placeholder for Cath to
  confirm (some imply free-tier limits that don't exist).
- Forgot password and Google/Apple sign-in: skipped for now (Cath, again 2026-10-15).
- Quick Unlock Step 6 (PROGRESS5) is no longer needed: the app opens straight in once
  signed in (Cath, 2026-10-15).
- New designs: mock up on the Design canvas first, build only after approval.

⚠️ Known issues / open problems (session 3)
- Leaves don't show in dark mode (Cath, 2026-10-15). FIRST item next session.
- Tab/page transitions: Cath wants an ebook page-turn feel (the screen slides left/right
  with that page feel, no 3D flip). Not started; after the code sweep.
- Cancel-by reminders don't notify yet; transfer fees are logged as a "Fees" transaction
  but don't reduce the balance. Accepted as known limits for now.
- iPhone-only checks (card shadow, Calendar look, faceIDPermission) wait for an iPhone.
- Leftover code from the old Accounts, Income, Settings and Profile layouts (unused
  styles, CollapsibleRow / stacked-card code, unused imports) is still in the files; for
  the code sweep.
- Update: PROGRESS6.md was about 550 lines (not 2,000) before this wrap-up; the rubber
  band section was archived to PROGRESS6-ARCHIVE-2.md.

📁 Files (session 3, under mobile-app/src)
- New: staySignedIn.ts, stickyState.ts, textSize.ts, pullDownToOpen.tsx, incomeKinds.ts,
  sharedExpenses.ts, incomeMonth.ts, components/CardFace.tsx, components/SimpleForm.tsx,
  components/CenteredAmount.tsx, components/AppSwitch.tsx,
  screens/SharedExpensesScreen.tsx.
- Changed: App.tsx, DataContext.tsx, types.ts (ManualTransaction.incomeKind,
  SharedExpense, SharedSettlement, sharedMembers, SavedAvatarPhoto, avatarPhotos,
  MAX_SAVED_AVATAR_PHOTOS, BillCycle dueBefore/carriedIn/lateFee), mergeModels.ts,
  billPayments.ts, balanceProjection.ts, autoLock.ts (default Never), components
  (AppText, AmountInput, PasswordField, BottomSheet, SettingsHub, AvatarPickerSheet,
  RowInteractionPreview, PayFromSheet, HomeHero, HomeWallet, AccountCard, AccountPicker,
  GradientFill, OfflineBanner), navigation (TabPage, RootStack: SettingsPage,
  SharedExpenses, IncomePerson routes; DeferredContent), screens (Settings, Profile,
  Premium, Accounts, Income, Transactions, Search, Bills, Debts, Loans, PayDetail,
  Home, SignIn, Intro, Plan, CardDetail, Transfer, TransactionDetail, Savings, Events,
  Groceries, Travel, Goals, PotDetail, Envelopes, Recurring, OnboardSetup).

=====================================================================
🌦️ R SERIES, SESSION 4 (2026-10-15 to 2026-10-16): leaves in dark mode, sky glow,
weather, rain, name step, Mark all as read, the code sweep, travel time note,
payday nudge, envelope alerts, month-end summary
=====================================================================
Same way of working: Claude Code (direct repo access) edits code on `redesign`, runs
npx tsc --noEmit until clean, commits and pushes; Cath tests in Expo Go (git pull;
cd mobile-app; npx expo start -c). Two conversations: the first did steps 1-4 below;
the second (this wrap-up) did the rest. 16 commits (3c922ec to 82ccaeb), all tsc clean.
Sign-off: "device test is as described" for steps 1-4, the name step, the keyboard fix,
Mark all as read, sweep batches 1 and 2 and the travel note; for batches 3a/3b/3c, the
cancel-by fix, fees + payday nudge and envelope alerts Cath replied "next"/"proceed"
(moved on without an explicit device-test line).

How access worked this time (for future conversations):
- The GitHub link belongs to each Claude account (each Gmail). In a new account, Claude
  could not attach the repo until Cath connected GitHub at claude.ai/code with THAT
  account and installed the Claude GitHub App on household-finance-mobile
  (github.com/apps/claude/installations/new). Step 2 (the app) carries over to all
  accounts; step 1 is once per Claude account.
- Without it, Claude can still read/write files in C:\Projects\household-finance-mobile
  through the desktop app's computer link, but cannot run git there; Cath then commits.

🔗 Design canvas for this session: "Finance Flow — Travel time note"
https://claude.ai/artifact/DHhxt3ET4wtbAwURpgtGDM (3 artboards: Home abroad light,
Home abroad dark, the sheet). Owned by the Gmail account used in this conversation. The
older "Forms Redesign" canvas belongs to a different account and could not be opened.

✅ Done this session (all on `redesign`)
- 1 Leaves in dark mode (3c922ec): dark page is a mood-tinted near-black (deep green /
  brown / wine) instead of pure black; leaves raised from 4% to about 7%.
- 2 Sky glow on Home only (2fafb02): soft time-of-day glow from the top-right (morning
  specks, afternoon rays, evening dusk, night stars); greeting follows the same phase;
  Settings > Appearance > Sky: Time-of-day glow and Live weather switches (saved on this
  phone); expo-location added, approximate location only. Cath chose glow on Home only.
- 3 Live weather (0f84678): Open-Meteo about once an hour (rounded location), last
  reading kept up to 6h offline; cloudy and rain looks; testing-only Preview weather row.
- 4 Falling rain (80efaa5): about 42 slanted drops, native driver, paused in the
  background, still with Reduce Motion; Settings > Appearance > Sky > Rain animation.
- 5 "What should we call you?" (c8fe9d1): onboarding is now 4 steps (name first);
  Profile has a Name row (edit sheet) and shows the name above @username; Home says
  "Hi, <name>" (falls back to the username). model.preferredNames[username] =
  {name, updatedAt} (encrypted, synced; latest change wins in mergeModels; clearing keeps
  an empty entry so it wins too). New preferredName.ts.
- 6 Sheets above the keyboard on Android (87bd17e): BottomSheet measures the keyboard
  and lifts itself (and caps its height); the edge-to-edge sheet window no longer
  resizes by itself. Fixes every sheet with a text field.
- 7 Bell "Mark all as read" (cc4a074): link beside the Notifications title, only while
  something is unread; markAllBellRead in bellReadState.ts.
- 8 Sweep batch 1, bugs (9c80bcf): Travel/Events completions use the phone's local date
  (todayISO, not UTC); PayFromSheet ignores a second quick tap (no double payments);
  unlinked profiles show "Couldn't save" if saving on the phone fails (8s timeout).
- 9 Sweep batch 2, loading states (d0ed994): components/LoadingView.tsx (spinner) on
  Insights, Subscriptions, Recurring, Shared Expenses and onboarding instead of a blank
  page; "Unlocking…" over the account switcher during an unlock; components/SavedToast.tsx
  (showSaved + SavedToastHost in App.tsx): a "Saved" pill after Paid / Log payment /
  Money received / Add money / Move out / Finish trip; pot Add money / Move out ignores a
  second tap.
- 10 Sweep batches 3a/3b/3c, clean-up (6d170a1, ccf3130, e00ab06): about 2,100 lines
  of leftovers removed with TypeScript's own remove-unused fixer plus an unused-style
  pass (Bills, Debts, Loans, Transactions, Savings, Income, Accounts, Settings, Home,
  Dashboard, Plan pages, onboarding, sign-in, reports). Deleted: CollapsibleRow,
  PaymentMethodPicker, IconLabelHint, ReportsScreen, useRefresh, PlanningScreen + its
  "Planning" route. Kept on purpose: typography.ts (for new code), ReportBits (shared
  report styles), AccountCard (helpers still used). A few read-but-never-set state
  values remain in SavingsScreen (harmless).
- 11 Cancel-by reminders fixed (62bf70d): reminder set-up runs one at a time (newest
  wins); a cancel-by for today set after 9:00 fires once, a minute after it is first set
  up (time remembered in AsyncStorage) instead of moving a minute later on every save;
  all reminders use the 'bill-alerts' channel; testing-only "Send a test reminder" row.
- 12 Travel time note (da12548, approved mockup): travelTime.ts remembers the phone's
  home time zone (first one seen, per phone); when the phone is in another zone with a
  different clock, Home shows "You're on <city> time · <difference> · dates follow this
  phone"; the sheet shows both clocks, what changes while away, "Hide until I'm back
  home" and "make <city> home"; reminders are set up again on a zone change; Settings >
  Appearance > Time > Home time zone.
- 13 Transfer fees (afafdfa): today's transfers already took the fee off (via the Fees
  transaction with the account); a transfer dated before the last balance update now
  takes the fee off the saved balance so it counts exactly once.
- 14 Payday nudge (afafdfa): 6:00 PM on each expected payday not yet logged (next 2 per
  source), "Payday: <source> - did <person>'s pay come in?"; tap opens IncomePerson (or
  Income); Settings > Notifications > Paydays switch (settings.paydayNudgeEnabled, on by
  default); testing-only "Send a test payday nudge".
- 15 Envelope alerts + month-end summary (82ccaeb): notification at 80% and at 100% of
  an envelope (once each per envelope per month, remembered in AsyncStorage; includes
  household spending); tap opens Envelopes. The 1st at 9:00 AM "<month> is done" opens
  the close-out report. Settings > Notifications > Budget switches
  (envelopeAlertsEnabled, closeOutReminderEnabled, both on by default); testing-only
  "Send a test month-end summary".

📌 Decisions (session 4)
- Sky glow on Home only (not every tab).
- The app always follows the phone's clock and time zone; location is never used to
  set the time. Abroad, a small note explains it (approved mockup).
- Every reminder needs "Notify me on this phone"; payday nudge, envelope alerts and
  month-end summary each have their own switch, on by default.
- Payday nudge time: 6:00 PM local. Month-end summary: the 1st at 9:00 AM.
- Clean-up is done with the compiler's own remove-unused fixer, never by hand, and always
  type-checked after.
- Testing-only rows (Preview weather, test reminder / payday nudge / month-end summary)
  only appear in Expo Go (__DEV__), never in a release build.

⚠️ Known issues / open problems (session 4)
- Session 3's known issues "leaves don't show in dark mode", "cancel-by reminders don't
  notify" and "transfer fees don't reduce the balance" are FIXED (see above). The old
  R-series note "Falling leaves: the animation itself is not built yet" is also out of
  date (built in session 2).
- Transfers have no list and no undo (a saved transfer can't be viewed or removed).
  Not requested yet.
- The first time this version runs, envelopes already past 80%/100% this month send
  their alert straight away (then once a month).
- Payday nudge, envelope alerts and month-end summary were tested with the testing rows
  and envelope changes; a real 6 PM payday and a real 1st-of-month were not waited for.
- Tab/page transitions (ebook page-turn feel) still not started.
- Still waiting for an iPhone: card shadow, Calendar look, faceIDPermission.
- Firestore security rules review not done yet (next).

📁 Files (session 4, under mobile-app/src)
- New: preferredName.ts, travelTime.ts, sky.ts, components/SkyGlow.tsx,
  components/FallingRain.tsx, components/LoadingView.tsx, components/SavedToast.tsx.
- Deleted: components/CollapsibleRow.tsx, components/PaymentMethodPicker.tsx,
  components/IconLabelHint.tsx, screens/ReportsScreen.tsx, useRefresh.tsx,
  screens/PlanningScreen.tsx (and the Planning route).
- Changed: types.ts (preferredNames, PreferredName, Settings paydayNudgeEnabled /
  envelopeAlertsEnabled / closeOutReminderEnabled), mergeModels.ts, DataContext.tsx,
  pushNotifications.ts, bellReadState.ts, useBellInbox.ts, App.tsx (SavedToastHost,
  Unlocking overlay, notification taps for payday / envelope / close-out), components
  (BottomSheet, OnboardSetup, PayFromSheet, LeafBackground, FallingLeaves, theme colours),
  screens (Home, Profile, Settings, PayDetail, PotDetail, Groceries, Travel, Events,
  Transfer, Insights, Subscriptions, Recurring, SharedExpenses) and the clean-up across
  most screens. package.json: expo-location.

📌 Decisions (R series)
- Exact-match sweep scope: "Everything, including features"; full pages instead of rows.
- Wallet: a corner lift (not a curl, not a cut-off card); the held card stays whole and
  slanted at 70% opacity, tucked behind the cards in front. Cath tried and rejected:
  cutting the card in half, fading its bottom half, see-through front cards, and floating
  fully on top.
- Gradients: wanted everywhere including white boxes, smooth with no visible lines, and
  clearly visible on the darker fills (Left to Spend, filled buttons).
- Close-out "Carry ₱X into next month" switch from the mockup was NOT built: Left to
  Spend comes from real balances, so leftover money already carries over; a switch would
  count it twice.
- Forgot password: NOT built for now (Cath chose "Not yet"). Data is encrypted with the
  password, so a reset would need the existing Recovery Key step afterwards.
- Unlock: go straight in after a quick tick (not the mockup's "Open Home" button).
- Onboarding's "Unlock with fingerprint" switch was left out (security setting; it stays
  in Settings › Account & Security).
- The old Reports "Customize" (hide reports) sheet was removed with the new Insights page.
- Left to Spend exact-time device test: Cath asked to revisit it after everything is
  added (still pending).

⚠️ Known issues / gotchas (R series)
- Not merged into main. A new EAS build is needed before the native splash change and
  react-native-svg work show in an installed app; Expo Go is slower than a release build.
- Falling leaves: the Settings switch is saved but the animation itself is not built yet.
- Mockup features not built (need features the app lacks): Google/Apple "Ways to sign
  in" on Profile, "Work offline" and "Sync photos only on Wi-Fi" switches, Text size and
  Wallet name rows in Appearance (wallet name is set only in onboarding), the
  Notifications page still has its old layout.
- Cancel-by reminders do not notify yet; transfer fees are logged as a "Fees" transaction
  but do not reduce the account balance directly.
- Rows that sit inside white groups and have their own solid background (needed for
  swipe-to-delete) carry their own GradientFill, so long lists draw many small gradients.
  Settings and Profile have the most; watch for slow scrolling.
- GradientFill matches only these background colours: navy3, accentTint, buttonFill, gold
  and cardTealEnd. Mood colours such as the HomeHero orange/red need kind="solid" passed
  explicitly.
- PROGRESS6.md is now over 2,000 lines; consider archiving older session logs or moving to
  PROGRESS7.md at the start of the next conversation.

📁 Files (R series, all under mobile-app/src unless noted)
- New: components/GradientFill.tsx, components/ReportBits.tsx, components/OnboardSetup.tsx,
  components/HomeWallet.tsx, components/HomeHero.tsx, components/LeafBackground.tsx,
  components/LogoMark.tsx, components/SegmentedControl.tsx, components/PayRow.tsx,
  navigation/LargeHeader.tsx, mood.tsx, billPayments.ts, savingsPots.ts, fabSide.ts,
  fabActions.ts, transactionActions.ts, screens/PotDetailScreen.tsx,
  screens/InsightsScreen.tsx, screens/ReportDetailScreen.tsx (also MoreReportsScreen),
  screens/PayDetailScreen.tsx, screens/CardDetailScreen.tsx, screens/TransferScreen.tsx,
  screens/TransactionDetailScreen.tsx, screens/SearchScreen.tsx, screens/ReviewScreen.tsx,
  screens/SubscriptionsScreen.tsx, screens/IntroScreen.tsx (opening animation).
- Heavily changed: theme.ts, types.ts (walletOrder, transfers, mealIdeas, MealIdea,
  SavingsGoal keptIn/autoAdd/isEmergency, contribution paymentMethod/auto, EventItem
  items/history, YearlyGoal linkedTo/completedDate, GroceryCalcEntry qty/unitPrice,
  Settings moodColorsEnabled/fallingLeavesEnabled/monthlySpendingBudget/walletName,
  CalculatorInputs efTargetMonths), mergeModels.ts, balanceProjection.ts (exported
  incomeOccurrencesInMonth and eventDelta; negative contributions allowed),
  transactions.ts, navigation/RootStack.tsx (routes Groceries, Travel, Events,
  YearlyGoals, PotDetail, Report, MoreReports, PayDetail, CardDetail, Transfer, ...),
  navigation/MainTabs.tsx, HomeScreen, DashboardScreen, TransactionsScreen, ToPay /
  Bills / Debts / Loans screens, SavingsScreen, GroceriesScreen (rewritten), TravelScreen,
  EventsScreen, GoalsScreen, PlanScreen, SettingsScreen, ProfileScreen, OnboardingScreen,
  IntroSlidesScreen (now the Welcome screen), PinUnlockScreen, the three rewritten
  reports (MonthlyCloseOut, CashFlowForecast, YearInReview), App.tsx (repo
  mobile-app/App.tsx).

▶️ Next step
- NEWEST (R series session 4, 2026-10-16): everything in "R SERIES, SESSION 4" is done on `redesign` (through 82ccaeb). Next, in this order:
  (1) Security review of the Firestore rules (mobile-app/firestore.rules): sign-in required, the ownerUid fallback, join-a-household-by-ID, username squatting, link-code guessability, open sign-up. Findings first, then fixes Cath approves; test in the Firebase Rules Playground before deploying.
  (2) Tab and page transitions: an ebook page-turn feel (slide left/right, not a 3D flip); show options first. Judge speed in a release build, not Expo Go.
  (3) Merge `redesign` into main and make the new EAS build (needed for react-native-svg, expo-linear-gradient, expo-network, expo-location); re-test the lag there.
  Optional: a transfers list with undo; archive the session 2-3 logs into PROGRESS6-ARCHIVE-3.md.
- (superseded by NEWEST above) NEWEST (R series session 3, 2026-10-15): everything in the "R SERIES, SESSION 3" section is done and device-tested on `redesign` (39 commits through 503ac53). Next, in a NEW conversation, in THIS order (Cath's order):
  (1) Leaves don't show in dark mode: investigate LeafBackground / FallingLeaves colours and opacity in dark mode, fix, device-test.
  (2) Code sweep: bugs, stale/unused code (old Accounts/Income/Settings/Profile layout leftovers, unused styles and imports), improvements and suggestions; include loading states everywhere (anything that loads shows an animation, never a frozen-looking screen). Give Cath suggestions before big changes.
  (3) Tab and page transitions: an ebook page-turn feel (slide left/right with that page feel, not a 3D flip); show options before building.
  Known limits, no action now: cancel-by reminders don't notify and transfer fees don't reduce balances; iPhone checks wait for an iPhone; Forgot password and Google/Apple sign-in stay skipped. Closed: offline banner, GO_BACK warning, rubber-band bounce, Calendar items, Quick Unlock Step 6 (no longer needed).
  Then: merge `redesign` into main, and make the new EAS build last.
- (superseded by NEWEST above) NEWEST (R series session 2, 2026-10-15): steps 22-37 are done on `redesign` (see the "R SERIES, SESSION 2" section). Next, in a NEW conversation:
  (1) Shared Expenses, from the SharedExpenses mockup artboard. It's big, so split it into small steps: people/members, add a shared expense with a split, netted balances, Settle up, the activity list, and a "Split with others" link from transaction detail.
  (2) Optional: change the Income total to "Expected this month".
  (3) The parked problems: transition lag, the offline banner, the GO_BACK warning.
  (4) Optional mockup leftovers (Notifications page layout, Forgot password once Cath agrees, Profile sign-in methods).
  (5) The deferred Left to Spend exact-time device test.
  (6) When Cath approves: merge `redesign` into main and make a new EAS build (needed for react-native-svg, expo-linear-gradient, expo-network).
- (superseded by NEWEST above) LATEST (R series, 2026-10-14): the redesign is on the `redesign` branch, steps 1-21 done and device-tested. Next, in a NEW conversation: (1) read the two design artifacts listed in the R series section; (2) continue with step 22+: Shared Expenses, Envelope budgets, Recurring / "Make it repeat", the offline banner, the falling-leaves animation, cancel-by reminders; (3) optional mockup leftovers (Notifications page layout, Forgot password once Cath agrees, Profile sign-in methods); (4) run the deferred Left to Spend exact-time device test; (5) when Cath approves, merge `redesign` into main and make a new EAS build. Older bullets below are from before the redesign and still stand.
- NEWEST (rubber band audit, swaps done): Bills (no bounce at all) and Person Spending report (bounces at the top only) are OPEN PROBLEMS, see the section above. Next: (1) check whether Person Spending actually scrolls and how many cards it shows; (2) try the trimmed-list experiment on Bills; (3) once the cause is found, consider swapping the remaining plain ScrollViews (Profile, AccountSwitcher, SignIn, CreateProfile, Onboarding, SetPin). Confirm with git status that the swaps are pushed.
- NEWEST (Parts 1-3, done and pushed): Home/Calendar polish and the Insights removal are finished. Small follow-ups: (1) fix white-on-gold in the Calendar "today" cell for dark mode (see open issue in the Part 1-3 section); (2) test whether swiping the Calendar sheet down works on Android, then remove the X if it does; (3) update EMULATOR-TESTING-CHECKLIST.md sections 14-15. Then continue with the bullet below.
- PREVIOUS (Batches A-F, all done, device-tested and pushed): the V series AND its optional leftovers are finished. Next, confirm with Cath which to do first: (a) run the short phone checklist (see "Still open after Batches A-F"); (b) make a NEW EAS build, which is required before the H series, mint restyle and Home leaves work on an installed app (react-native-svg is a native module), and which can double as the Quick Unlock Step 6 test build; (c) return to PROGRESS5.md's paused Quick Unlock Step 6 checklist and PC.3 real social sign-in on that build. Optional small items: a "Sync now" button in Settings, delete the now-unused styles, set Transactions' default month.
- (OLDER, superseded by the bullet above) V.8: the V series is code-complete. Batches 1-4 are device-tested; Batch 5 (SignInScreen styles themed) is tsc clean and needs its device check (see the Batch 5 entry). Then, optionally: Calendar tiny-font redesign, the shared src/typography.ts type scale, and the PinUnlockScreen dead-style tidy. After that, decide between (a) returning to PROGRESS5.md's paused Quick Unlock Step 6 checklist and PC.3 real social sign-in, or (b) making a new EAS build first, since react-native-svg (H series and mint restyle) is not in the installed build. Confirm with Cath before starting.
- (OLDER, superseded by the LATEST bullet above) ACTIVE RIGHT NOW: the V series. V.0 through V.4a and V.4b-1 to V.4b-5 (Button, Card on banners and report cards) are done and device-tested. V.4b-5 (Card on the 9 report cards) is done. Next: the
  small shared tab-header screenOptions item, then V.5 (account card tints), V.6 (tiny
  fonts, Calendar balances only on active days, number formatting) and V.7 (quieter
  destructive buttons, including dangerButton and deviceSignOutBtn). Optional: tidy
  unused hapticLight/radii/spacing imports in the 11 footer files; check that
  src/tokens.ts line 21 reads `16: 16,`. Confirm with `git status` that everything is
  pushed.
- Earlier (still true) next steps from the bell/Home work follow below.
- The bell inbox is finished (3a, 3b-1, 3b-2). Remaining: one optional device check of the
  recovery row with a second device, and the fresh-launch bell tap-through.
- Then commit and push everything outstanding (this round is already pushed through
  Checkpoint 2; older items listed below should be checked with `git status` first).
- Then decide: (a) call the design-polish phase complete and return to PROGRESS5.md's paused
  Quick Unlock Step 6 checklist (plus PC.3 real social sign-in), or (b) make a new EAS
  build first so the H series and mint restyle (react-native-svg) are testable on an
  installed app; this could double as the Step 6 build. Confirm with Cath before starting.
- Optional small items: reset the Transactions category filter when leaving the tab; a
  general month filter for Transactions; tidy App.tsx leaf imports; move SafeAreaView
  imports to react-native-safe-area-context; Calendar swipe list stops at +/-24 months; a
  look at whether Calendar's cells need a tint now that the page is white; tidy leftover
  useRefresh / refreshing / onRefresh usage in the 12 screens that no longer refresh.
