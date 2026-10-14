Household Finance Mobile App — Progress Log (Phase D: Apple-Inspired Design Polish Pass, the H series Home redesign, and the V series visual-system pass: mint base, accessible colors, shared components)

>>> START HERE: The redesign code is on the `redesign` branch; read the two design artifacts listed in PROGRESS6.md's R series section first.

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
🫧 RUBBER BAND AUDIT (Android): plain ScrollViews swapped; Bills and Person Spending still have NO bounce (OPEN PROBLEMS)
=====================================================================

Why: Cath wanted the rubber-band overscroll on screens that lacked it. Worked as Antigravity investigates (read-only, three passes), Claude reviews, Cath pastes by hand. Every swap was one tag rename plus an import, with npx tsc --noEmit after each file.

✅ DONE, tsc clean, device-tested on Android:
- Screens using a plain react-native ScrollView were swapped to PullToRefreshScrollView (a NAMED export: import { PullToRefreshScrollView } from '...', with braces). It forwards refs and all ScrollView props, and has no onRefresh prop, so nothing broke.
- MoreScreen.tsx and PremiumScreen.tsx (done earlier in this work).
- SavingsScreen.tsx: only the Emergency Fund ('ef') and FI Calculator ('fi') tabs; the Goals tab already used it.
- SettingsScreen.tsx: the ONE ScrollView (ref={scrollRef}) that serves the hub and all 15 sub-pages. The import was added and ScrollView was kept in the react-native import because useRef<ScrollView> still needs the type.
- The 9 report screens in src/screens/reports/ (MonthlyCloseOut, CashFlowForecast, PersonSpending, WeeklyDigest, SubscriptionAudit, YearInReview, MerchantSpending, TaxSummary, PaymentMethods), each with import { PullToRefreshScrollView } from '../../PullToRefreshScrollView'.
- Device result: 8 of the 9 reports bounce at both top and bottom. Debts and Loans bounce. Device results for the Savings EF/FI tabs and Settings were not itemised separately.
- Deliberately NOT touched: ReportsScreen.tsx (only two horizontal pill ScrollViews), CalendarScreen (FlatList), BottomSheet (bounces={false} on purpose), IntroSlidesScreen, and the dialog modals (CsvImport, LoanPayoffSimulator, SavingsFiComparison).

⚠️ OPEN PROBLEM 1: BILLS SCREEN HAS NO BOUNCE ON ANDROID
- BillsScreen already uses PullToRefreshScrollView, yet it never bounces. Debts and Loans, with the same component, DO bounce.
- RULED OUT (tested on-device):
  - Short content: the test account has more bills than debts and loans combined, so Bills scrolls, and the "content shorter than the screen" theory is wrong.
  - Mount order: ToPayScreen's default sub-tab was temporarily changed from 'bills' to 'loans'. Loans (now mounted first) still bounced, and Bills (now mounted later) still did NOT. The line was then changed back to 'bills'. (Confirm with git diff that ToPayScreen.tsx shows no change.)
  - Remounting: opening Debts and then returning to Bills did not help.
- RULED OUT by reading real code: Bills, Debts and Loans have the SAME wrappers (SafeAreaView flex:1, then PullToRefreshScrollView with only contentContainerStyle), the same container/scrollContent styles, the same SwipeableRow + CollapsibleRow rows built with .map, and the same single useRef/useEffect that opens an item. None uses scrollTo, onLayout, a nested FlatList, nestedScrollEnabled or a sticky header.
- Only known differences, none shown to matter: Bills has subscription badges (SUB/CANCELLED) and Keep/Cancel/Reactivate buttons inside rows; it mounts by default; its open-bill prop can be filled at mount (deep link); it is sorted with sortByNextDue like Debts.
- UNTESTED ideas for next time (do NOT apply without evidence): the real Bills data (a particular bill or the subscription rows); whether something in the Bills modal or its sheet changes the scroll view; whether the row renders differently from Debts under the same SwipeableRow settings. A safe experiment is to temporarily render Bills with a trimmed list (for example only the first 3 bills) and see whether bounce returns.
- Rejected earlier: minHeight:'100.5%' in the shared component (unreliable, affects every screen) and flexGrow:1 on Bills (does not address the theory).

⚠️ OPEN PROBLEM 2: PERSON SPENDING REPORT BOUNCES AT THE TOP ONLY
- On Android it stretches when pulled down at the top but stays still when pushed past the bottom. The other 8 reports bounce both ways.
- Real code shows its structure matches WeeklyDigestReport (same container and contentContainer styles, same host in ReportsScreen, no absolute positioning or fixed heights). The only structural difference is that its last child is a plain Text footerNote (marginTop 4, marginBottom 12), outside any Card, and the number of cards depends on how many people have spending.
- Not yet checked: whether the report actually scrolls when dragged (if it fits the screen there is no bottom bounce to see), and how many cards the test account shows. Check this first.

📌 Lessons (this round)
- Never write find/replace text from an Antigravity summary. Use code Cath has pasted from the real file, or ask for a read-only dump first. The first PremiumScreen paste left two stray lines for this reason.
- The method that works: one file at a time, Ctrl+F the tag, change only the tag name, fix the import, run tsc.
- Remaining files that probably still use a plain ScrollView (not requested yet): ProfileScreen, AccountSwitcherScreen, SignInScreen, CreateProfileScreen, OnboardingScreen, SetPinScreen.

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
- LATEST (R series, 2026-10-14): the redesign is on the `redesign` branch, steps 1-21 done and device-tested. Next, in a NEW conversation: (1) read the two design artifacts listed in the R series section; (2) continue with step 22+: Shared Expenses, Envelope budgets, Recurring / "Make it repeat", the offline banner, the falling-leaves animation, cancel-by reminders; (3) optional mockup leftovers (Notifications page layout, Forgot password once Cath agrees, Profile sign-in methods); (4) run the deferred Left to Spend exact-time device test; (5) when Cath approves, merge `redesign` into main and make a new EAS build. Older bullets below are from before the redesign and still stand.
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
