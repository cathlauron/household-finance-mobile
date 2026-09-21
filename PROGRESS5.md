Household Finance Mobile App — Progress Log (Pre-Phase C: Visual Redesign & Branding)

This file picks up exactly where PROGRESS4.md left off. PROGRESS4.md is
now closed/historical — it covers the combined on-device re-test pass
(all 13 original bugs verified fixed), B.12b in full (implemented AND
verified on-device), and the "fewer words" pass through 13 screens. See
PROGRESS4.md for that detail, plus everything it links back to
(PROGRESS3.md, PROGRESS2.md, PROGRESS1.md, PROGRESS.md).

✅ Carried forward from PROGRESS4.md — still true
- Phase A (Firebase Auth, household linking, account recovery,
  multi-device sessions) — complete. Detail in PROGRESS1.md.
- Phase B checkpoints B.1 through B.14 — code-complete. Detail in
  PROGRESS2.md.
- Phase B Part 2 (Iconization & Minimalism Pass, bottom nav redesign,
  SettingsScreen.tsx/ProfileScreen.tsx fewer-words) — code-complete.
  Detail in PROGRESS3.md.
- All 13 original on-device bugs (#1-13) — fixed AND fully verified on
  a real device in the combined re-test pass. No further action needed
  on any of them.
- B.12b in full (B.12b-1 Pension/Social Security offset, B.12b-2
  multi-account selector for the FI Calculator, B.12b-3 scenario-
  comparison modal) — implemented, tsc-clean, AND confirmed on-device.
- Nearly every recent design-change request (Android in-app date
  picker, bottom-nav Calendar removal + Home date shortcut, PIN toggle
  switch, SUB/CANCELLED hollow badge, "which of these is you?"
  confirm/cancel step, Reports show/hide list, ToPay/Planning pill
  reversal, swipe-to-navigate on Bills/Debts/Loans/Income/Savings-
  derived Transactions rows) — implemented AND confirmed on-device.
- "Fewer words" pass complete on 13 screens: SettingsScreen.tsx,
  ProfileScreen.tsx, OnboardingScreen.tsx, SavingsScreen.tsx,
  SignInScreen.tsx, MoreScreen.tsx, LoansScreen.tsx, IncomeScreen.tsx,
  GroceriesScreen.tsx, DebtsScreen.tsx, TransactionsScreen.tsx,
  BillsScreen.tsx, CreateProfileScreen.tsx.
- PC.6-2 DONE: outlined red "Log out" pill under the Data group on the
  Settings hub (testID settings-log-out-button), with a "Log out?" alert
  (Cancel / "Yes, log out"). SettingsScreen takes an onSignOut prop, passed
  from RootStack.tsx. Pushed and confirmed on-device.
- PC.6-3 DONE: Language row (Preferences group, value "English") and a new
  SUPPORT group (Help & support, About us). All three open static placeholder
  pages inside the existing page mechanism. No new styles, no type changes,
  no RootStack changes. Pushed and confirmed on-device.
- PC.6-4 DONE: value labels on the Settings hub and polish. Values added:
  Quick Unlock ("On" only when a PIN is set, otherwise blank), Notifications
  (On / Off from model.settings.pushNotificationsEnabled), Left to Spend
  (caution threshold %, falls back to 20), and counts for Categories,
  Category Watchlist, Merchants & Payees and Categorization Rules. Hub row
  titles are now Title Case (Backup & Data, Help & Support, About Us).
  SettingsRow title and value now truncate to one line (numberOfLines, plus
  flexShrink on the value). Pushed and confirmed on-device.
- PC.6 (Settings hub with drill-in pages) is COMPLETE: PC.6-1 through PC.6-4
  done. Only PC.6-1b (Maestro flow edits) remains untested.
- PC.7 DONE: Subscription "Coming soon" placeholder screen. New route
  Premium (RootStack), new file mobile-app/src/screens/PremiumScreen.tsx,
  built from the mockup image the person supplied: hero card with a crown
  (MaterialCommunityIcons "crown", colors.premium), Monthly / Yearly toggle
  with a "Save 20%" badge, a four-line benefits card, a plan card with price,
  and a footer. Entry point: a one-row "Membership" group on the Settings hub
  ("Subscription", value "Coming soon"), between the profile card and
  Account. No payment, paywall or subscription state exists anywhere. Pushed
  and confirmed on-device.

📌 Decisions carried forward — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs
  before committing.
- PowerShell here-strings only, never bash heredoc syntax, for this
  project. Chain git commands on separate lines rather than with "&&".
- Insist on real command output/diffs from Antigravity/Copilot, not
  narrative summaries — investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs git push themselves).
- Close/Save All open VS Code tabs before any commit, including
  progress-file-only commits.
- After any round of fixes, independently re-verify against real,
  current code before considering it done - don't trust progress-log
  claims or commit messages alone.
- Never hand the person a conditional/branching instruction - get the
  real answer via investigation first, then give one unconditional fix.
- Reminder/notification testing is DEFERRED BY THE PERSON, to be the LAST
  thing tested or done when asked. An installed build now exists (Phase C
  preview APK), so it is testable; see "Notifications: investigation done,
  TESTING DEFERRED" above for the plan.

⚠️ Known issues / gotchas - carried forward, still open
- [RESOLVED, CONFIRMED ON-DEVICE by the person] Bug #14 (root cause found,
  fix committed and pushed in dc2a674): what looked like "only the first ticked
  hiddenReportIdsRef/hiddenReportIds were confirmed correct at every step
  via on-device Metro logs (every tap logged the right growing/shrinking
  array, no lost taps, no stale reads). The real bug: the horizontal pill
  row that lets you SWITCH between multiple ticked reports was invisible
  on-device. Root cause per Antigravity's investigation + git history:
  mobile-app/src/screens/ReportsScreen.tsx's pillScroll style had
  `{ flexGrow: 0, flex: 1 }` (self-contradicting) AND its parent
  tabRowWrap used `alignItems: 'center'`, so the horizontal ScrollView
  had no reliable width or height and collapsed to ~0px, leaving only the
  fixed-size "Customize" icon visible. This was introduced in commit
  751c42c, explicitly labeled "(pending on-device test)" - it has likely
  NEVER worked correctly on a real phone. Fix applied to the file on disk:
  pillScroll changed to `{ flex: 1, height: 54 }`; the two temporary
  console.log debug lines (in toggleReportVisibility and right before the
  return statement) were also removed. The fix was committed and pushed by accident in dc2a674 (the "PROGRESS5:
  document Bug 14 root cause..." commit), because the start-of-session
  block runs git add -A and swept the modified file in. Checked afterward:
  the file on disk has pillScroll { flex: 1, height: 54 } and the working
  tree was clean. Confirmed on-device by the person: the report icons now show and
  switching between reports works. The fix had already been verified in an
  earlier session, so this log entry was stale, not the fix.
  Process note: git add -A at session start commits any unfinished work.
  Check git status before running that block when something is
  deliberately uncommitted.
- Bug #9's Face-ID-specific "fails to even prompt" symptom still needs
  re-verification on a real installed build - suspected to be an Expo
  Go limitation, not re-testable until Phase C.
- Deferred to Phase C, do not chase now: subscription reminder deep-
  link, Bill reminders/Weekly recap toggle visibility in Settings,
  subscription double-notify, Weekly Spending Recap toggle/day-pills/
  hour input + actual firing, Subscription Cancel-Reminder wording and
  tap-to-deep-link (warm and cold start).
- [RESOLVED: screenshots work on the installed Phase C build, so the cause
  was Expo Go on this phone; no repo change was needed] Screenshot
  restriction on the person's phone, was PARKED for Phase C (not a
  bug in this repo). Device: Vivo V40 Lite 5G, Android 16, Expo Go only
  (no other Expo project has ever been opened in it). Once signed in,
  screenshots fail on Home, all four bottom tabs and the lock screen with
  "Unable to capture screenshot due to app restrictions". Screenshots work
  on the phone's home screen, in other apps, on Expo Go's project list and
  on the Finance Flow sign-in screen. Ordered test after force-stopping
  Expo Go: phone home screen OK, Expo Go project list OK, app sign-in
  screen OK, signed-in Home FAILS (the only failing step).
  Established (Antigravity, two investigation rounds, raw output):
  * Nothing in this repo blocks screenshots. Zero hits for FLAG_SECURE,
    setSecure, SECURE_FLAG, setRecentsScreenshotEnabled, ScreenCapture,
    preventScreenCaptureAsync or screenCaptureAsync across mobile-app/src,
    App.tsx, app.json, package.json and git history (including deleted
    code). expo-screen-capture is not installed. There is no android/
    folder, no app.config.*, no eas.json, and no relevant app.json plugin.
  * 3,081 native/JS files in the 12 packages searched (expo,
    expo-local-authentication, expo-notifications, expo-image-picker,
    expo-sharing, expo-document-picker, expo-clipboard, expo-file-system,
    datetimepicker, react-native-screens, gesture-handler,
    safe-area-context) contain no FLAG_SECURE or setSecure. Antigravity
    reports the only FLAG_SECURE in all of node_modules is react-native's
    ReactModalHostView.kt, which copies the flag onto a Modal only if the
    Activity already has it (its whole-node_modules scan output was never
    shown, so that last claim is unverified).
  * Modal and Alert.alert are used on both signed-out and signed-in
    screens, and StatusBar / setStatusBarHidden is not used anywhere, so
    none of them explains why only signed-in screens fail.
  * Expo package 54.0.37. Expo Go expected for SDK 54: 54.0.8. The Expo Go
    version actually installed on the phone was NOT checked.
  * Expo Go's own native code is not in this repo, so anything set inside
    Expo Go cannot be found here.
  Tried and did NOT help: installed expo-screen-capture and called
  allowScreenCaptureAsync() in App.tsx on every screen change. Screenshots
  still failed. Fully reverted (git restore of App.tsx, package.json and
  package-lock.json, then npm install). Verified afterward: git status
  clean, package.json has no expo-screen-capture, App.tsx has no
  ScreenCapture, npx tsc --noEmit clean. (The revert was not actually done
  when the first screenshot note was pushed; it was done and verified in a
  follow-up.)
  NOT proven: Antigravity claimed 95%+ confidence in "Expo Go window flag
  left by an earlier project" or "biometric overlay". Neither fits: only
  this project was ever opened in Expo Go, and plain tabs fail with no
  biometric prompt showing. One earlier failure on the sign-in screen
  (with the temporary edit installed) cleared after force-stopping Expo Go.
  That fits "restriction starts after sign-in and lasts until Expo Go is
  force-stopped", but the force-stop and the edit removal happened
  together, so it was not isolated. Other untested ideas: a Vivo / Android
  16 system feature (the message wording may be Vivo's own, not stock
  Android's, unconfirmed), or the installed Expo Go being an older build
  than 54.0.8.
  Phase C check: on the first EAS installed build (no Expo Go), take
  screenshots on the sign-in screen and on signed-in Home and a tab. If
  they work, the cause was Expo Go on this phone and nothing needs
  changing. If they still fail, look at Vivo's own security / privacy
  settings for the app first, and only then reopen a code investigation.
  Nothing needs re-enabling before publishing, because the app never
  blocked screenshots.
  Meanwhile: Android emulator screenshots, or photographing the phone
  screen, are the only workarounds.
- Could not be tested yet (needs specific conditions, not pass/fail):
  legacy-profile crash guards on Home/Dashboard (no legacy profile
  available); two-device sync checks throughout (single-device
  household right now).
- Orphaned households/{householdId} Firestore documents from abandoned
  link codes - known, accepted limitation, needs server-side cleanup,
  not a client patch.
- PC.1a NOT yet verified on a real device (tsc-clean only). Check: splash
  animation timing, slide swipe + dots, Skip/Get Started routing, image
  sizing on small screens.
- PC.1a has no persistent "seen intro" flag. Intro shows whenever the
  device has zero local profiles, so (a) an existing account holder on a
  fresh device sees the slides before signing in, and (b) quitting before
  creating a profile shows them again on next launch. Decide in PC.1b
  whether to add a stored flag or leave as-is.
- Intro slide copy has not had the "fewer words" pass.
- Cosmetic: App.tsx 'intro' block is mis-indented with a trailing-
  whitespace line after it. Tidy when next editing that file.
- PC.2b on-device check pending: keyboard + scrolling on Create Profile, eye
  toggles on both password fields, error text, real test-account creation,
  recovery modal (Copy Key, checkbox gating Continue), landing on Quick Unlock,
  dark mode readability.
- Other screens still using the old hardcoded hex colours (#FAFAF9, #1C1917):
  PinUnlockScreen.tsx and SetPinScreen.tsx (each self-contained). Restyle later.
- Sign-in recovery modal in SignInScreen.tsx still has the old look.
- Settings > Security retroactive recovery-key modal still has the old look.
- PC.5a: the "[avatar] base64 chars:" size printed in Metro was NOT
  recorded. Check a real number next time (expected roughly 15,000 to
  25,000, unverified).
- PC.5a: app.json photosPermission option name for the expo-image-picker
  plugin was written from memory. Phase C's EAS build is its real test.
- PC.5a: avatars are keyed by username. Two linked members with the same
  username would share one avatar. Cosmetic only. It is unconfirmed that
  Firestore rules always stop duplicate usernames across phones.
- [RESOLVED in PC.5-1, 49af80f] PC.5a: getInitials() in ProfileScreen.tsx has a hard-coded special case
  that turns the username "cathlauron" into "CL". Remove it during PC.5.
- [RESOLVED in PC.5-1, 49af80f: all five dead styles deleted] PC.5a: now-unused styles left behind (tsc does not flag these): avatar
  and avatarText in HomeScreen.tsx, avatarCircle and avatarText in
  ProfileScreen.tsx, profileAvatarCircle and profileAvatarText in
  SettingsScreen.tsx. Tidy in PC.5/PC.6.
- PC.5a: ManualTransaction.receiptPhoto stores UNRESIZED photos (quality
  0.5 only) inside the encrypted model. Already the biggest inflator of
  document size and a Firestore 1 MiB limit risk. Out of scope for PC.5a,
  worth its own fix (resize on pick, same helper approach).
- PC.5-1: formatMemberSince() parses Firebase's user.metadata.creationTime
  text with new Date(). If the text is ever missing or unreadable, the
  "Member since" card silently hides (by design), so a missing card means
  no usable date, not a crash. Uses the en-US locale ("Sep 2026").
- [RESOLVED in PC.5-2b] PC.5-2 watch item: the Household Members roster falls back to the
  usernames 'Owner' / 'Member' when memberUsernames is missing. Looking up
  model.avatars?.[m.username] with those fallbacks would hit the wrong key,
  so the roster avatar code must show plain initials for fallback names
  instead of an avatar lookup. Confirm against the real roster code first.
- Cosmetic, harmless: git prints "LF will be replaced by CRLF" for
  ProfileScreen.tsx on Windows. No action needed.
- PC.5-2b: roster avatar fallback detection relies on capitalisation. Real
  usernames are always lowercase (sanitizeUsername lowercases them), while
  the fallbacks 'Owner' and 'Member' are capitalised, so a capitalised
  non-current member gets plain initials with no avatar lookup. Unverified:
  whether any hand-edited Firestore household doc has a capitalised real
  username. Roster avatars for a SECOND linked member were not confirmed
  on-device (single-account test only).
- PC.5-2b: sign-out-round-trip.yaml and change-password.yaml now tap the
  alert button "Yes, log out" after sign-out-button. Before this, neither
  flow confirmed the alert, so both were probably already failing. It is
  NOT confirmed that either flow has been re-run for real, and how Maestro
  matches alert button text on the device is unverified. Re-run both.
- PC.5-2a: iOS back label. RootStack sets Settings' headerBackTitle to a
  fixed 'More', so reaching Settings from Profile may show "More" as the
  back label on iOS while going back to Profile. Unverified, cosmetic.
- Still hardcoded old red #e5484d in ProfileScreen.tsx: dangerButton
  (roster Remove, unlink and similar) and errorText. Left alone on purpose.
  Swap to colors.error / colors.errorBg in a later pass.
- PC.6-1b: Maestro flows edited but NEVER RUN. Maestro reported "0 devices
  connected", so neither flow started. change-password.yaml now taps
  settings-row-security after each more-settings-row (2 places).
  pin-quick-unlock.yaml now taps settings-row-quickunlock once, before
  waiting for change-pin-button. Committed untested by choice. Re-run both
  once a device or emulator is connected, with Expo Go installed and Metro
  running (the flows open exp://192.168.1.62:8081, whose IP may have changed).
  Unverified: whether pin-quick-unlock.yaml's later Settings visit still
  finds profile-card (the hub) or lands on a page left open from the first
  visit.
- POSSIBLY BROKEN, not yet checked: sign-out-button exists only on the
  Profile screen, but sign-out-round-trip.yaml and the end of
  change-password.yaml tap it right after home-tab. Those flows probably
  need more-tab -> more-settings-row -> profile-card first, the way
  pin-quick-unlock.yaml does. Fix in a separate small step once the flows
  can run. The "Yes, log out" confirm step added in PC.5-2b is equally
  unrun.
- PC.6-1: Settings back handling uses a navigation 'beforeRemove' listener
  that calls preventDefault and closes the open page. It passed the
  on-device test, but it is unverified whether it could ever block a
  programmatic removal of the Settings screen (for example a lock or
  sign-out while a page is open). Watch for a Settings screen that will
  not close.
- PC.6-1: SettingsScreen.tsx is still about 2,200 lines. Sections were
  wrapped in page conditions, not extracted into files. The style
  deletion mistake from PC.5-2a is the reason no state or handler was
  moved.
- PC.6-3: the About page version ("Version 1.0.0") is HARD-CODED text.
  expo-constants is not installed. It will silently drift from app.json when
  the version is bumped. Fix later by installing expo-constants or reading
  the version from app.json.
- PC.6-3: Language and Help & support are placeholders with no behaviour.
  The Language row's value "English" is hard-coded and there is no i18n or
  locale setup anywhere. Date and number formatting is a mix of hard-coded
  en-US and en-PH. Help copy is placeholder wording and has not had the
  "fewer words" pass.
- PC.6-2: RootStack.tsx now registers Settings with a render callback
  (children pattern, same as Profile) instead of component=, so it can pass
  onSignOut. The Settings back listener is only attached while a page is
  open, so Log out on the hub is not blocked by it. Log out while a
  drill-in page is open is impossible by design (the pill is hub-only).
- PC.6-2: settings-log-out-button now gives the Maestro flows a second
  sign-out route (more-tab -> more-settings-row -> settings-log-out-button).
  The sign-out-button reachability issue above is still unfixed and the
  flows are still unrun.
- PC.6-4: Devices and List Rows deliberately show NO value on the hub.
  Devices: deviceSessions includes signed-out and revoked devices, so
  .length would overcount, and the status field name was not confirmed.
  List Rows: the meaning of swipeToDeleteEnabled being false as "tap to
  open" was not confirmed, so "Swipe / Tap" could mislabel it. Revisit both
  after checking the real code.
- PC.6-4: Quick Unlock's value depends on pinIsSet, which starts false and
  loads async on mount, so the row shows blank until it loads, then "On" if
  a PIN is set. It never shows "Off" for that reason.
- PC.6-4: Notifications shows On / Off from pushNotificationsEnabled only. It
  does not reflect the bill-alert or weekly-recap settings.
- PC.6-4: Left to Spend uses ?? 20 as the fallback for
  cautionThresholdPercent. It was not confirmed that 20 matches the real
  default used elsewhere.
- PC.6-4: Security, Backup & Data, Help & Support and About Us show no value
  (no data exists to show, or it would be ambiguous).
- PC.7: the Subscription screen is a static placeholder. The Subscribe button
  is a non-touchable disabled View that reads "Coming soon". The footer says
  "Not available yet. Nothing will be charged." on purpose, replacing the
  mockup's "Cancel anytime. No hidden fees." (no purchase exists to cancel).
- PC.7: prices are STATIC PLACEHOLDERS with a hard-coded peso sign. Monthly
  is 99.00 (from the mockup). Yearly is 950.40, derived as 99 x 12 x 0.8 from
  "Save 20%", not from the mockup. Neither follows the app's currency setting.
- PC.7: the four benefit lines are copied from the mockup, but several are
  already free today (Reports, multiple accounts, no transaction cap).
  Decide what premium actually gates before this screen is used for real.
- PC.7: the Monthly / Yearly toggle is local screen state only. It is not
  stored anywhere and resets each time the screen opens.
- PC.7: no Profile-screen row for Subscription. The Profile "Account &
  Security" card's subtitle is about credentials and devices, so a
  monetization row sat badly there. Add a separate banner later if wanted.
- PC.7: the route is named Premium but the header title reads "Subscription".
  This is intentional, so the route name cannot be confused with the
  recurring-bill subscription feature (Bill.isSubscription, Subscription
  Audit). Do not rename the route to Subscription.
- PC.7: the Settings row uses the Ionicons sparkles-outline icon, not the
  crown, because SettingsRow only accepts Ionicons names and hard-codes the
  icon colour to colors.gold. Showing the crown in orange on the hub would
  need an optional icon colour or icon family prop in SettingsHub.tsx.
- [PARTLY RESOLVED: Bills, Debts, Income now use it, see batch 1] PC.9: only Dashboard used PullToRefreshScrollView. The other screens were
  NOT converted, and the swipe-vs-pull interaction on rows (SwipeableRow),
  Calendar's month swipe and nested scrollers is UNVERIFIED. The design
  expects a sideways drag to fail the pull gesture (failOffsetX), but this is
  reasoning, not proof, until tested on a screen with swipeable rows.
- [RESOLVED in batch 1 Step 0: props and ref are now forwarded] PC.9: PullToRefreshScrollView accepted only style, contentContainerStyle,
  refreshing, onRefresh and children. It sets its own ref and onScroll
  internally. Screens that need keyboardShouldPersistTaps, their own onScroll
  or a ref will need the component extended first.
- PC.9: iOS uses RN's ScrollView and Android uses react-native-gesture-
  handler's ScrollView, so scroll behaviour can differ slightly by platform.
- PC.9: because useRefresh changed shape, any OTHER screen still
  destructuring { refreshControl } from it would fail to compile. Not
  confirmed either way: check with the rollout investigation and
  npx tsc --noEmit.
- [RESOLVED: checked, only useRefresh.tsx exists] PC.9: possible duplicate file, useRefresh.ts vs useRefresh.tsx. An earlier
  Antigravity output showed "useRefresh.ts" while the PC.9 command wrote
  src\useRefresh.tsx. Not yet checked. Run
  Get-ChildItem mobile-app\src -Filter "useRefresh*".
- PC.9: hashes for PC.8-1 and PC.9 were not recorded here (see git log).
  The "spinner still collapses after an offline failed refresh" behaviour on
  Android was part of the test plan, but its result was not recorded
  separately from the overall "passed".
- Bug #14 was unchanged by PC.8/PC.9; it was fixed separately (see above).
- PC.9 batch 1: which platform(s) the on-device test covered (Android only,
  or iOS as well) was not recorded. The custom pull gesture is Android-only;
  iOS uses the native RefreshControl, which is the lower-risk path.
- PC.9 batch 1: the pull-vs-swipe interaction is now confirmed on Bills,
  Debts and Income, but it is still UNVERIFIED for any screen with a
  horizontal scroller (filter pills, tag rows) inside the main vertical
  ScrollView. The failOffsetX rule was only tested against SwipeableRow.
  Batch 2's investigation asks about this.
- PC.9: SettingsScreen keeps a scrollRef and calls scrollTo({ y: 0,
  animated: false }) when switching pages. It is UNVERIFIED that the
  gesture-handler ScrollView (Android branch) exposes scrollTo through the
  forwarded ref the same way. Do not convert Settings without testing this.
- PC.9 process lesson: in batch 1, DebtsScreen.tsx's opening <ScrollView>
  tag was NOT replaced (the find string, which included leading spaces,
  did not match), while the closing tag WAS. tsc caught it (TS17002).
  Rule now: search for JSX tags WITHOUT the leading spaces, and grep each
  file for "ScrollView" after editing, before running tsc.
- PC.9: the pull only refreshes what refreshModel() refreshes (the cloud
  model). It does nothing for screens whose data is not in the model.
- PC.9 rollout: the batch 1 open question "nested horizontal scroller
  inside a main ScrollView" is CLOSED for every converted screen (none
  exist, per the batch 2 investigation). The failOffsetX rule has still
  only ever been tested against SwipeableRow pans, not other horizontal
  gestures.
- PC.9 rollout: pull-to-refresh now works on some tabs and not others
  (Groceries List yes / Calculator no; Savings Goals yes / Emergency Fund
  and FI no). This is deliberate, but the person may find the difference
  confusing. Revisit if it feels inconsistent.
- PC.9: Antigravity's stated reason for skipping the Savings calculator tabs,
  that refreshModel() could wipe unsaved form calculations, was NOT verified
  against the real refresh code. The real reason for skipping them is that
  there is nothing to refresh on those tabs.
- PC.9: screens NOT converted, on purpose or deferred: More (no data),
  Premium (static), Calendar (no vertical scroller, the month grid is not
  in a scroll container), Planning and Reports (horizontal pill rows only;
  their child screens carry their own scrollers), the nine Reports child
  screens (optional later), Profile, Settings. Settings has a scrollRef with
  scrollTo, which is UNVERIFIED with the gesture-handler ScrollView (see the
  earlier Settings note). Profile was assessed as a plain single
  ScrollView but was not converted or tested.
- PC.9: which platforms the batch 1, 2a and 2b on-device tests covered
  (Android only, or iOS too) was not recorded. Android runs the custom
  gesture; iOS uses the native RefreshControl.
- PC.9: commit hashes for PC.8-1, PC.9, batch 1, 2a and 2b were not recorded
  here (see git log).
- PC.9: Home embeds DashboardScreen, so Home's pull-to-refresh comes through
  Dashboard's PullToRefreshScrollView. It was not separately confirmed that
  the pull works on the Home tab as well as when Dashboard is shown alone.

📁 Files in the repo
See PROGRESS4.md's own "Files in the repo" section for the full recent
inventory (openBillRequest.ts, openDebtRequest.ts, openLoanRequest.ts,
SwipeableRow.tsx, BillsScreen.tsx, DebtsScreen.tsx, LoansScreen.tsx,
IncomeScreen.tsx, SavingsScreen.tsx, ToPayScreen.tsx, RootStack.tsx,
TransactionsScreen.tsx, types.ts, fiScenario.ts,
SavingsFiComparisonModal.tsx). PROGRESS2.md/PROGRESS3.md hold the full
inventory before that. New/modified files for this new phase will be
tracked fresh below as they happen.
PC.0/PC.1a additions: mobile-app/App.tsx (modified),
mobile-app/src/screens/IntroScreen.tsx (modified, the splash),
mobile-app/src/screens/IntroSlidesScreen.tsx (new),
mobile-app/assets/{intro-track,intro-goals,intro-private,splash-bg}.png (new),
plus theme.ts and the logo/splash assets from PC.0a-c.
PC.0 to PC.2 additions/changes: mobile-app/App.tsx, src/theme.ts,
src/screens/IntroScreen.tsx (the splash), src/screens/IntroSlidesScreen.tsx (new),
src/screens/OnboardingScreen.tsx (step 1 removed), src/screens/SignInScreen.tsx
(restyled); assets: logo.png, splash-logo.png, splash-icon.png, icon.png,
adaptive-icon.png, eco_house_logo.svg, intro-track/goals/private.png,
splash-bg.png.
PC.2b: mobile-app/src/screens/CreateProfileScreen.tsx (restyled, scrolling added).
PC.4: mobile-app/src/screens/HomeScreen.tsx (header/date-row/layout restyled,
imports getInitials from ProfileScreen.tsx), mobile-app/src/screens/
DashboardScreen.tsx (Total Balance/Amount Owed cards restyled with icon
bubbles, card/container style tokens updated) - both committed together in
"PC.4: restyle Home (header, date row, card styling, icon buttons)".
PC.4c: mobile-app/src/theme.ts (okBg/warnBg tokens added),
mobile-app/src/screens/HomeScreen.tsx (full-file redesign v2 - centered
date pill, bell icon, no title text, tinted % Left to Spend card),
mobile-app/src/screens/DashboardScreen.tsx (getUpcomingDue exported,
This Month/Due Soon/Savings Goals cards get icon bubbles + arrow badges +
dividers), mobile-app/src/navigation/MainTabs.tsx (onLock prop dropped,
Home tab headerShown:false), mobile-app/src/screens/SettingsScreen.tsx
(change-pin-button testID added), mobile-app/src/screens/ProfileScreen.tsx
(lock-app-button testID added) - all committed. mobile-app/flows/
pin-quick-unlock.yaml (rewritten for the new Settings/Profile-based PIN
and Lock navigation path, run for real and passing) - committed as 75f2be3
("PC.4c: Home redesign v2 + pin-quick-unlock.yaml Maestro flow update").
PC.5a additions: mobile-app/src/types.ts (AvatarConfig type + optional
avatars?: Record<string, AvatarConfig> on HouseholdModel),
mobile-app/src/mergeModels.ts (mergeAvatars helper + avatars line in
mergeModels), mobile-app/app.json (expo-image-picker plugin with
photosPermission), mobile-app/package.json + package-lock.json
(expo-image-manipulator 14.0.8), mobile-app/src/avatars.ts (new),
mobile-app/src/components/Avatar.tsx (new),
mobile-app/src/components/AvatarPickerSheet.tsx (new),
mobile-app/src/screens/ProfileScreen.tsx, HomeScreen.tsx,
SettingsScreen.tsx (old initials circles swapped for Avatar).
PC.5-1 (49af80f): mobile-app/src/screens/ProfileScreen.tsx (header restyled
with no card box, larger avatar, pencil icon, @username, email, vault badge,
new "Member since" card via formatMemberSince(); cathlauron special case
removed; dead avatarCircle/avatarText styles removed),
mobile-app/src/screens/HomeScreen.tsx (dead avatar/avatarText styles
removed), mobile-app/src/screens/SettingsScreen.tsx (dead
profileAvatarCircle/profileAvatarText styles removed).
PC.5-2a and PC.5-2b: mobile-app/src/screens/ProfileScreen.tsx (Account &
Security is now ONE grouped card with shield / phone / settings icon rows
(Password & Encryption Key, Active Devices, All settings), all opening
Settings; Lock App restyled as a quiet outlined pill, testID
lock-app-button kept; Sign Out restyled as an outlined red pill reading
"Log out", testID sign-out-button kept; the confirm alert now says
"Log out?" with buttons Cancel / "Yes, log out"; Household Members roster
shows an Avatar per member), mobile-app/flows/sign-out-round-trip.yaml and
mobile-app/flows/change-password.yaml (added a tapOn text "Yes, log out"
step after sign-out-button). New makeStyles entries: shortcutCard,
shortcutItem, shortcutIconBubble, shortcutDivider (shortcutRow removed).
PC.6-1 (pushed, on-device test passed): mobile-app/src/components/
SettingsHub.tsx (NEW: SettingsGroup = labelled grouped card with dividers,
SettingsRow = icon bubble, title, optional value, chevron, optional
testID), mobile-app/src/screens/SettingsScreen.tsx (imports SettingsHub;
new page state, scrollRef and a beforeRemove back listener; the screen now
opens on a hub of grouped rows, and each existing section is wrapped in a
{page === '...' && (...)} condition with its code unchanged). New testIDs:
settings-back-button, settings-row-security, settings-row-quickunlock,
settings-row-devices, settings-row-appearance, settings-row-notifications,
settings-row-listrows, settings-row-leftspend, settings-row-categories,
settings-row-watchlist, settings-row-payees, settings-row-rules,
settings-row-data. Existing testIDs (profile-card, current-password-input,
new-password-input, confirm-new-password-input, change-password-button,
change-pin-button) were kept.
PC.6-1b: mobile-app/flows/change-password.yaml and
mobile-app/flows/pin-quick-unlock.yaml (extra tap on the Security /
Quick Unlock row; committed untested).
PC.6-2 and PC.6-3 (pushed, on-device tests passed):
mobile-app/src/screens/SettingsScreen.tsx (onSignOut prop; Log out pill on
the hub; Language row in Preferences; new Support group; three new page
blocks with page ids 'language', 'help', 'about'), mobile-app/src/
navigation/RootStack.tsx (Settings registered with a render callback that
passes onSignOut). New testIDs: settings-log-out-button,
settings-row-language, settings-row-help, settings-row-about.
PC.6-4 (pushed, on-device test passed): mobile-app/src/screens/
SettingsScreen.tsx (value props on seven hub rows; three hub titles
changed to Title Case), mobile-app/src/components/SettingsHub.tsx
(numberOfLines on title and value, flexShrink on value). No new testIDs.
  Maestro flows unaffected (they tap by testID).
  PC.7 (pushed, on-device test passed): mobile-app/src/screens/
  PremiumScreen.tsx (NEW), mobile-app/src/navigation/RootStack.tsx (imports
  PremiumScreen, Premium: undefined added to RootStackParamList, Premium
  registered with component=, title "Subscription", headerBackTitle
  "Settings"), mobile-app/src/screens/SettingsScreen.tsx (new "Membership"
  group above Account). New testIDs: settings-row-premium,
  premium-screen-container, premium-billing-monthly, premium-billing-yearly,
  premium-coming-soon-button. No changes to theme.ts or types.ts.
  PC.8-1 and PC.9 (pushed, on-device tests passed on Dashboard):
  mobile-app/src/PullToRefreshScrollView.tsx (NEW: iOS = RN ScrollView +
  RefreshControl, Android = custom drag-following pull with PanGestureHandler),
  mobile-app/src/useRefresh.tsx (returns { refreshing, onRefresh } now; first
  added in PC.8-1 with a refreshControl), mobile-app/src/screens/
  DashboardScreen.tsx (uses PullToRefreshScrollView; ScrollView import
  removed). No changes to theme.ts, types.ts or RootStack. No new
  dependencies. No new testIDs.
  PC.9 batch 1 (pushed, on-device test passed): mobile-app/src/
  PullToRefreshScrollView.tsx (REWRITTEN: accepts ScrollViewProps, forwardRef
  on both platforms, chains onScroll), mobile-app/src/screens/BillsScreen.tsx,
  DebtsScreen.tsx and IncomeScreen.tsx (now use PullToRefreshScrollView; each
  imports useRefresh and PullToRefreshScrollView; ScrollView removed from the
  react-native import). No new dependencies, testIDs or type changes.
  PC.9 batch 2a (pushed, on-device test passed): mobile-app/src/screens/
  LoansScreen.tsx, TransactionsScreen.tsx, EventsScreen.tsx, GoalsScreen.tsx
  and TravelScreen.tsx (use PullToRefreshScrollView; Events, Goals and Travel
  keep ScrollView in the react-native import for their modals).
  PC.9 batch 2b (pushed, on-device test passed): mobile-app/src/screens/
  AccountsScreen.tsx, GroceriesScreen.tsx and SavingsScreen.tsx (use
  PullToRefreshScrollView on the main list, the Groceries List tab and the
  Savings Goals tab only; ScrollView kept in the react-native import).
  No new dependencies, testIDs, theme or type changes. PullToRefreshScrollView.tsx
  and useRefresh.tsx were not changed after batch 1.

=====================================================================
🎨 NEW PHASE — Pre-Phase C: Visual Redesign & Branding
    ("Finance Flow" rebrand)
=====================================================================

Goal: restyle the app to match the "Finance Flow" mockup the person
supplied - a new color palette, a house+leaf logo, an onboarding
carousel, restyled Sign In/Home/Profile/Settings screens, and a new
Subscription screen. This sits before Phase C (EAS Build/publishing)
since there's no reason to publish under the old look. Bug #14 and the
rest of the "fewer words" pass (next up: EventsScreen.tsx) are paused,
not abandoned - return to them before or alongside Phase C.

📌 Decisions locked this phase
- Renaming the app to "Finance Flow" - the app's display name, splash
  screen text, app.json/package.json name field, and (later) its store
  listing.
- Logo: eco_house_logo.svg (house outline with a leaf at the roof peak,
  cream line art on a deep-green radial-gradient rounded-square
  background) is CONFIRMED as the final logo asset.
- Google/Apple/Facebook sign-in buttons will be REAL OAuth, not
  decorative. This is genuine Firebase Auth federated-provider work
  (Firebase Console setup, native packages, app.json/eas.json changes).
  Confirmed understanding: this CANNOT be tested inside Expo Go -
  testing is deliberately deferred until Phase C's EAS Build / custom
  dev-client step.
- Subscription screen ships this phase as a static "Coming soon" style
  screen only - matches the mockup visually, reachable from Settings/
  Profile, but has NO real payment or paywall logic (no fake charge, no
  real subscription state stored anywhere).
- Approximate color palette (estimated from the mockup - to be
  reconciled against the app's real existing theme-token names once
  Antigravity reports them back, see PC.0):
  deepGreen #16332A (splash background, dark headers)
  accentGreen #2E5D3A (primary buttons, active nav icon)
  cream #F6F1E6 (screen backgrounds)
  cardWhite #FBF9F3 (cards, input fields)
  inkText #22281F (primary text)
  mutedText #6E7568 (secondary text/labels)
  divider #E5E0CF (borders, dividers)
  premiumOrange #E08A2C (Subscription/crown accent only)
  [CORRECTION from PC.7: the real theme token is colors.premium, #E08A2C in
  both light and dark. There is no premiumOrange token. Use colors.premium.]

📌 PC.0 / PC.1a decisions and results (added this session)
- PC.0a (b62e17c): visible app name renamed to Finance Flow.
- PC.0b (a256aeb): Finance Flow light palette in theme.ts, premium token added.
- PC.0c (760af3c): Finance Flow logo assets, palette-matched splash with
  wordmark and tagline.
- PC.1a (cc6a74e): fuller splash, 3 intro slides, first-run wiring.
  Verified against real code: tsc --noEmit clean, git status clean/pushed.
  * IntroScreen.tsx (the splash): ImageBackground splash-bg.png, logo
    spring/fade, staggered title/tagline fade, static leaf-outline icon,
    1500ms loading bar via Animated (useNativeDriver:false because it
    animates width). Uses hardcoded SPLASH_GREEN/CREAM constants on
    purpose - ignores light/dark mode so launch always looks the same.
  * IntroSlidesScreen.tsx (new): 3 slides (track / goals / private),
    horizontal paging ScrollView, dots, Skip on slides 1-2, "Get Started"
    on slide 3. Skip and Get Started both call onDone.
  * App.tsx: new Screen state 'intro'. After the 1600ms splash minimum,
    profiles.length ? 'signIn' : 'intro'. Intro onDone -> 'createProfile'.
  * New assets in mobile-app/assets: intro-track.png, intro-goals.png,
    intro-private.png, splash-bg.png.
    
  📌 PC.1 findings and decisions (added this session)
- Locked: avatars = initials + real photo picker + preset avatars.
  Settings gets Language and About us rows (static), everything restyled to
  the mockup, nothing existing removed. Match the mockup as closely as possible.
- Sign-in uses email (Firebase) AND username (local profile lookup); keep both
  fields in PC.2, restyled. No fake-email scheme exists.
- "Member since" does not exist in the app. PC.5 derives it from Firebase
  user.metadata.creationTime, no new storage.
- expo-image-picker installed; expo-image-manipulator and Firebase Storage not.
- CreateProfileScreen/SignInScreen use hardcoded old hex colours, not theme tokens.
- PC.1b: remove OnboardingScreen step 1 (duplicates intro slide 3), relabel to
  STEP 1 OF 2. First-run: intro -> createProfile -> recovery key -> Quick Unlock -> ready -> home.

📌 PC.0 to PC.2 decisions and results (added this session)
- PC.0a (b62e17c): visible app name renamed to Finance Flow.
- PC.0b (a256aeb): Finance Flow light palette in theme.ts, premium token.
- PC.0c (760af3c): logo assets, palette-matched splash.
- PC.1a (cc6a74e): IntroScreen.tsx (the splash) now has splash-bg.png,
  logo spring/fade, staggered title/tagline, static leaf icon, 1500ms
  Animated loading bar (useNativeDriver:false, animates width). Splash
  uses hardcoded green/cream constants on purpose (ignores light/dark).
  New IntroSlidesScreen.tsx: 3 slides (track/goals/private), paging
  ScrollView, dots, Skip on slides 1-2, Get Started on slide 3.
  App.tsx: new Screen state 'intro'; profiles.length ? 'signIn' : 'intro';
  intro onDone -> 'createProfile'. New assets: intro-track/goals/private.png,
  splash-bg.png.
- PC.1b (0a19088): OnboardingScreen step 1 (welcome, duplicated intro slide
  3) removed. Step state is now 2|3, badge reads STEP {step-1} OF 2.
  First-run order: splash -> intro -> createProfile -> recovery key modal ->
  Quick Unlock (PIN/biometric) -> ready -> home.
- PC.2: SignInScreen.tsx restyled using theme tokens (navy2 background,
  navy3 inputs/cards, navy4 borders, gold primary button, ink/inkDim/inkFaint
  text). Uses logo.png (green badge), NOT splash-logo.png (cream line art,
  invisible on cream). Left icons sit in a wrapper View because
  PasswordField's style prop only reaches the inner TextInput. New
  makeMainStyles(colors) at the bottom of the file; old styles object kept
  for the recovery modal, which was deliberately NOT touched. Heading and
  subtitle centered (deliberate change from the left-aligned mockup).
- Locked: avatars = initials + preset avatars + real photo picker. Photo
  stored inside the encrypted household model (option B); linked household
  members can see each other's photos, accepted trade-off. Preset avatars
  stored as a simple choice, not an image.
- Locked: Settings gets static Language and About us rows; everything else
  restyled to the mockup; nothing existing removed. Match the mockup as
  closely as possible.
- Locked: sign-in keeps email (Firebase Auth) AND username (local profile,
  cloud backup, recovery key and PIN lookup). No fake-email scheme exists.
- Locked: NO "Forgot password?" link. Data is encrypted with the password, a
  Firebase reset email would change the login but not the encryption key and
  would look like a lockout. Recovery already exists via the Secret Recovery Key.
- Locked: social sign-in buttons are drawn now and show a "Coming soon" alert;
  PC.3 makes them real (testing deferred to Phase C EAS build).
- "Member since" did not exist anywhere in the app; PC.5 derives it from
  Firebase account creation time, no new storage.
- Real findings: expo-image-picker is installed; expo-image-manipulator and
  Firebase Storage are not. No Google/Apple/Facebook sign-in packages installed.
  CreateProfileScreen and SignInScreen recovery modal use hardcoded old hex
  colours instead of theme tokens.
- Theme token map: navy2 screen bg #F6F1E6, navy3 card/input #FBF9F3, navy4
  border #E5E0CF, ink #22281F, inkDim #626A5B, inkFaint #A0A597, gold (primary
  button) #2E5D3A, error #E11D48.

📌 PC.2b decisions and results (added this session)
- CreateProfileScreen.tsx restyled with theme tokens, same look as sign-in
  (logo.png badge, FINANCE FLOW wordmark, icon-prefixed fields, pill button,
  serif centered heading). Old module-level styles object replaced by
  makeStyles(colors) at the bottom of the file.
- Real bug fixed: the screen was a plain View with no scrolling, so with the
  keyboard open the password fields, button and hint were unreachable. Now
  KeyboardAvoidingView (iOS padding) + ScrollView with
  keyboardShouldPersistTaps="handled".
- All five testIDs unchanged (email-input, username-input, password-input,
  confirm-password-input, create-profile-button); Maestro flows in
  mobile-app/flows/ (create-profile, sign-in, change-password,
  sign-out-round-trip) depend on them.
- Recovery-key modal restyled only (navy3 card, serif title, outlined green
  Copy Key pill). Logic untouched: copy-to-clipboard with "Copied!" feedback,
  "I have saved it" checkbox, Continue disabled until ticked, the retry alert
  when the cloud save of the recovery key fails. The modal is used only in
  this file; Settings has its own separate retroactive-recovery modal.
- Copy changes: heading "Create your account", subtitle "Start your financial
  journey.", link "Already have an account? Sign in". The old "FIRST-TIME
  SETUP" eyebrow is gone from the main screen (modal keeps its own eyebrow).
- PC.3 explicitly deferred to Phase C (see checkpoint table).

📌 PC.4 decisions and results (added this session)
- Home screen is two files: HomeScreen.tsx (header + "Left to Spend" card)
  embeds DashboardScreen.tsx (every other card: Total Balance, Amount Owed,
  This Month, Due Soon, Savings Goals, etc.). Both were edited.
- No bell/notification-dot added. Investigation confirmed nothing in the app
  currently tracks unread or due-alert state, so a bell that did nothing
  would be misleading - deliberately left out. Revisit only if/when real
  due-alert tracking exists.
- Header restyled to match the mockup: initials-circle avatar (via the
  existing getInitials helper from ProfileScreen.tsx - avatar is initials-only
  for now, real photo/preset avatars arrive in PC.5a), "Hi, {username}" +
  "Good to see you!" greeting, and two round icon buttons replacing the old
  Set PIN / Lock buttons' plain styling (keypad icon + lock icon). The
  set-pin-button and lock-button testIDs were preserved unchanged since
  Maestro flows depend on them.
- Added a tappable full-date pill row ("Sat, Sep 18, 2026" style) below the
  header using the existing home-calendar-shortcut testID (also preserved for
  Maestro) - tapping it still navigates to Calendar, unchanged behavior.
- "Left to Spend" card and "Watched Categories" card (both pre-existing
  features) were kept and restyled to match the new look, not removed.
- DashboardScreen.tsx: Total Balance and Amount Owed cards restyled with
  icon-bubble accents (wallet icon for balance, receipt icon in an
  orange-tinted bubble for Amount Owed); card corner radius increased and a
  border added (borderColor: colors.navy4) across all cards; screen
  background changed from colors.navy1 to colors.navy2 to match Home.
- Confirmed via Antigravity investigation before writing code (per standing
  workflow): keypad icon name resolves fine in Ionicons, no tsc errors from
  the new imports.
- On-device verification passed: header layout (avatar/greeting/icon
  buttons), date pill navigates to Calendar, keypad icon opens Set/Change
  PIN, lock icon locks and prompts PIN/biometric, Total Balance/Amount Owed
  icon bubbles render correctly, rounded card corners throughout, no overlap
  while scrolling, dark mode readable.
- Confirmed DashboardScreen.tsx is only ever imported by HomeScreen.tsx (per
  the investigation report) - no other screen was affected by its style
  changes.

📌 PC.4c decisions and results (added this session)
- Home Screen Redesign v2: centered date pill, bell icon (with a red dot
  that lights up only when something's due in the next 14 days, reusing
  DashboardScreen's now-exported getUpcomingDue helper), "Home" title text
  removed, Left to Spend card tinted green/orange/red by status with a %
  bar and "X left of Y" / "Z% used" line, icon bubbles added to Total
  Balance/This Month/Amount Owed/Due Next 14 Days/Savings Goals, up/down
  arrow badges + vertical divider lines added to the This Month
  Income/Expenses/Net row.
- Locked: the "% used" figure is % of TODAY'S total balance, not a
  budget/limit (no budget-limit setting exists in the data model). Read as
  "of what you have right now, this much is projected to be left by
  payday" - flagged, not objected to.
- Set PIN / Lock buttons removed from Home entirely (not just restyled).
  Both capabilities already existed elsewhere and were kept, with new
  testIDs added: Settings > Change PIN now has testID="change-pin-button";
  Profile > Lock App now has testID="lock-app-button" (via Settings'
  existing profile-card row, testID="profile-card", which already
  navigated to Profile). theme.ts gained two new tokens, okBg and warnBg,
  for the tinted Left to Spend backgrounds. MainTabs.tsx dropped the dead
  onLock prop passthrough to HomeScreen and set headerShown: false on the
  Home tab screen.
- Files touched and committed (git status confirmed clean after commit):
  theme.ts, HomeScreen.tsx (full-file replace), DashboardScreen.tsx,
  MainTabs.tsx, SettingsScreen.tsx, ProfileScreen.tsx.
- mobile-app/flows/pin-quick-unlock.yaml updated to match: the old
  set-pin-button/lock-button taps (which no longer exist on Home) are
  replaced with more-tab -> more-settings-row -> change-pin-button, and
  later more-tab -> more-settings-row -> profile-card -> lock-app-button.
  Confirmed via investigation this is the ONLY flow file referencing
  either old testID. Confirmed more-tab's real testID
  (tabBarButtonTestID: 'more-tab') and that ProfileScreen has no loading
  gate before lock-app-button renders, so no extra wait step was needed
  beyond the standard extendedWaitUntil.
- On-device verification passed: header layout (avatar/greeting/date pill/
  bell), tapping "Hi, {username} ›" opens Profile, tapping the date pill
  opens Calendar, Settings > Change PIN and Profile > Lock App both still
  work end to end, dark mode readable including the new tinted Left to
  Spend card. The pin-quick-unlock.yaml Maestro flow was run for real
  (not just tsc-checked) and passes.
- Minor known non-issue: the "Due Next 14 Days" icon bubble renders
  purple/indigo on-device even though its style block
  (styles.iconBubbleSmall) is identical to This Month's (which renders
  green/teal) - the color difference predates this session's changes and
  was left as-is since the person didn't flag it as wrong.

📌 PC.5a decisions and results (added this session)
- PC.5a-1 (d298368): foundation, no visible change. AvatarConfig type
  {type: 'initials'|'preset'|'photo', presetId?, photoDataUri?, updatedAt?}.
  HouseholdModel gets optional avatars?: Record<string, AvatarConfig>,
  KEYED BY USERNAME. Old models load fine (field is optional).
  sanitizeModelIds spreads ...model so it passes avatars through untouched.
- mergeModels lists every field by name, so avatars had to be added there
  or "Merge both" during linking would silently drop everyone's avatars.
  New mergeAvatars(): per username, the more recently updated wins, ties
  go to "a".
- Keyed by username, NOT Firebase uid: getCurrentFirebaseUser() can be
  null on cold start, while username is always in memory on every screen.
  Roster already has each member's username (memberUsernames).
- Photos live INSIDE the encrypted household model (no Firebase Storage).
  makeAvatarDataUri() in avatars.ts: 192px wide, JPEG quality 0.6,
  rejects anything over 80,000 base64 chars (about 60 KB). Uses the NEW
  ImageManipulator.manipulate(...).resize().renderAsync().saveAsync() API
  because manipulateAsync is marked @deprecated in the installed 14.0.8.
- Preset avatars = Ionicons icon on a coloured circle (12 presets in
  AVATAR_PRESETS). Only the preset id is stored, no image files.
- Avatar.tsx is one shared component (variant 'filled' for Home,
  'outlined' for Profile/Settings). It takes initials as a prop so it
  never imports a screen.
- AvatarPickerSheet.tsx uses the existing BottomSheet: 12 presets, "Choose
  a photo" (square crop), "Use my initials" (only shown once something is
  set). Photo picking is wrapped in setAutoLockSuppressed(true/false),
  same pattern as the receipt picker, so the PIN lock does not fire when
  returning from the gallery.
- Editing happens ONLY on Profile (tap the avatar, camera badge). Home
  and Settings just display it. Saves go through the existing saveModel.
- Testids added: avatar-edit-button (Profile), avatar-choose-photo and
  avatar-picker-sheet (picker). No existing testID changed.
- PC.5a-2 (hash not recorded here, see git log): picker sheet + Avatar on
  Home/Settings/Profile. On-device verification PASSED: sheet opens,
  preset saves and shows on Home/Settings/Profile, photo crop + save
  works, PIN lock did not trigger after the gallery, "Use my initials"
  resets, avatar persists after closing and reopening the app, dark mode
  readable.
- Household Members roster avatars deliberately deferred to PC.5.

📌 PC.5-1 decisions and results (added this session)
- PC.5 is split in two. PC.5-1 = cleanup + header restyle + "Member since"
  (49af80f, pushed, on-device test passed). PC.5-2 = shortcut rows, roster
  avatars, Log out / Lock App restyle.
- Investigation (Antigravity) confirmed before any code: creationTime is an
  optional string (not a Date); no Maestro flow asserts on visible Profile
  text; only the testIDs matter, and all were kept. The roster
  username fallback, the cathlauron special case and the dead styles were
  all confirmed real.
- Mockup interpretation, locked: the app has no display name, so the header
  shows @username. Household & Sharing, the vault badge and Lock App are
  kept (nothing existing removed). No dead "Personal information" row is
  added. The pencil icon top-right replaces the old camera badge; tapping
  the avatar OR the pencil opens the picker (avatar-edit-button testID
  kept).
- "Member since" card is hidden entirely when creationTime is missing or
  unparseable.
- Removed: the 'cathlauron' -> 'CL' special case in getInitials (all
  callers keep working; they just get real initials now), and the five dead
  styles listed under Known issues.

📌 PC.5-2 plan, locked (added this session)
- Shortcut rows: keep the two existing rows ("Password & Encryption Key",
  "Active Devices") with shield and phone icons inside ONE grouped card, and
  add a third row, "All settings", for the mockup rows that have no
  matching feature yet. All rows open Settings (Settings accepts no
  section param, so no deep-jump).
- Sign Out is restyled as the outlined red "Log out" pill from the mockup
  (existing testID must be kept). Lock App stays as a quiet outlined button
  above it (lock-app-button testID kept).
- Roster: show each linked member's Avatar using model.avatars?.[m.username]
  (see the fallback-username watch item under Known issues).

📌 PC.5-2 decisions and results (added this session)
- PC.5-2a (commit "PC.5-2a: Profile grouped shortcut card, outlined Log out
  pill, quiet Lock App", pushed, on-device test passed): grouped shortcut
  card, Lock App and Log out restyle. Both pills use colors.error /
  colors.navy4 tokens so they stay readable in dark mode.
- PC.5-2b (commit "PC.5-2b: Log out alert wording, roster avatars, Maestro
  sign-out confirm step", pushed, on-device test passed): alert wording,
  flow fix, roster avatars. The alert confirm button is "Yes, log out" (not
  "Log out") so it never shares text with the "Log out" pill behind it.
- Roster avatar rule, locked: the current user always uses their real
  username from useData(); other members use the roster username; a
  capitalised 'Owner' / 'Member' means a fallback and skips the avatar
  lookup (plain initials).
- Investigation (Antigravity) confirmed: no Maestro flow tapped visible
  text "Sign Out", "Lock App", "Password & Encryption Key" or "Active
  Devices"; Settings is a stack push from Profile (back returns to
  Profile); colors.error and colors.errorBg exist in light and dark.
- PROCESS MISTAKE, do not repeat: in PC.5-2a I gave a "select from
  lockButton down to hintText and paste" edit without having seen the real
  lines in between. The range held eight unrelated styles (inputLabel,
  input, errorText, successText, saveButton, saveButtonText, cancelButton,
  cancelButtonText), so tsc reported 28 errors. Fixed by restoring the
  originals from git (git show HEAD:...), nothing was committed broken.
  Rules from now on: give "between markers" edits only when the real lines
  on BOTH sides of the range have been seen; a style listing from
  Antigravity that shows only the styles used by a block is NOT proof that
  the styles are contiguous; run npx tsc --noEmit before every commit.

📌 PC.7 results (added this session)
- The mockup was NOT in the repo. PROGRESS5.md said "matches the mockup" but
  no image had ever been saved. The person supplied the image in chat, and
  the screen was built from it. Consider saving the mockup into the repo.
- Antigravity's proposed benefit list (real-time sync, unlimited household
  members, advanced projections) was rejected as invented and inaccurate,
  since the app already syncs through Firebase and links up to 5 members.
  The mockup's own four lines were used instead.
- Route named Premium, not Subscription, because "subscription" already has
  many hits for recurring bills (BillsScreen, pushNotifications, Reports,
  types.ts).
- Crown icon came from MaterialCommunityIcons, already available through
  @expo/vector-icons. Nothing new was installed.

📌 PC.6-4 results (added this session)
- Antigravity's investigation proposed values for Devices and List Rows.
  Both were rejected for now (see Known issues). Quick Unlock was changed
  from "On / Off" to "On or blank" because pinIsSet loads async and would
  show a false "Off".
- Nothing in the hub or SettingsHub used hard-coded colours, and dark-mode
  tokens were checked in theme.ts. No dark-mode fixes were needed.
- No Maestro flow taps a Settings row by visible text, so the title and
  value changes cannot break them.

📌 PC.6-2 and PC.6-3 results (added this session)
- Log out lives on the Settings hub only (page === null), as an outlined red
  pill using colors.error. Alert wording matches the Profile screen's.
- Antigravity's PC.6-3 investigation confirmed no existing Help, About,
  version or language code, and that page is typed string | null, so new
  page ids needed no type change.
- Deliberate deviations from Antigravity's proposed copy: no "local-first"
  claim in Help (the app syncs via Firebase), and the Language option reads
  "English", not "English (US)".
- SUPPORT sits between Data and the Log out pill. Language sits in
  Preferences after List Rows.
- (This entry sits above the earlier PC.6 entry, not below it, because the
  end of that entry was not visible when this was added. Move if desired.)

📌 Bug #14 investigation and screenshot-blocking findings (added this session)
- Bug #14 needed TWO separate Antigravity investigation rounds, not one,
  because the person's first plain-English description ("ticks stay
  saved, correct report shows, but only ever the first box") did not
  match "stale closure" or "stale render" - it turned out to describe a
  missing navigation control, not a data bug. Lesson: when the person's
  on-device description doesn't cleanly match either of the two
  hypotheses a prompt was built around, stop and ask a clarifying
  question rather than trusting the first investigation's framing.
- Antigravity's FIRST investigation (stale closure / stale render framing)
  correctly found hiddenReportIdsRef was added in commit cd67c77 as an
  unverified fix, and correctly proved via real Metro log lines pasted by
  the person that state updates in the current code ARE correct on every
  tap. Its proposed fix (draft-state-then-Done redesign of the Customize
  sheet) was REJECTED as solving a problem that didn't exist - confirmed
  first via two on-device checks (checkboxes flip instantly; no pill row
  of report icons exists anywhere except the Customize icon itself).
- Antigravity's SECOND investigation (pill row visibility framing) found
  the real bug: mobile-app/src/screens/ReportsScreen.tsx's pillScroll
  style `{ flexGrow: 0, flex: 1 }` combined with tabRowWrap's
  `alignItems: 'center'` collapses the horizontal ScrollView holding the
  report-switcher pills to near-zero size. Confirmed via git log -p that
  this exact code was introduced in 751c42c with a commit message noting
  "(pending on-device test)", and the very next on-device test session is
  where Bug #14 was first ever reported - strong evidence this has never
  rendered correctly on a real device.
- Fix applied to mobile-app/src/screens/ReportsScreen.tsx (committed in
  dc2a674, confirmed on-device):
  pillScroll changed from `{ flexGrow: 0, flex: 1 }` to
  `{ flex: 1, height: 54 }` (54 = 38px pill height + 12px top padding +
  4px bottom padding from pillRow, so exactly one row of pills fits with
  no extra gap). Both temporary console.log debug lines removed
  (toggleReportVisibility's log line, and the render-time log line right
  before `return (`). `npx tsc --noEmit` passed clean after the edit
  (compiles fine either way - does not prove the layout is fixed).
- Session also hit an unrelated Expo tooling snag: `npx expo start --tunnel`
  failed twice (ngrok "failed to start tunnel", then a TypeError). Resolved
  by simply retrying the same tunnel command a third time - no code change
  involved, not a project bug. Noting in case it recurs: check
  https://status.ngrok.com/ first, and `npx expo start` (no --tunnel) works
  fine as a fallback whenever phone and computer share the same WiFi.
- Screenshot-blocking removal: the person asked to temporarily disable
  on-device screenshot prevention for UI screenshotting. Investigated and
  CLOSED for now: the app contains no screenshot-blocking code, so there is
  nothing to remove. Full findings, what is unproven, and the Phase C check
  are under Known issues ("Screenshot restriction on the person's phone").
  A temporary expo-screen-capture allow call was tried, did not help, and
  was reverted.

  📌 PC.8-1 and PC.9 decisions and results (added this session)
- PC.8-1 (pushed, on-device test passed): pull-to-refresh on Dashboard only,
  using React Native's built-in RefreshControl through a new useRefresh hook.
  The hook calls refreshModel() from DataContext and shows an Alert per
  outcome: 'failed' (Could not refresh), 'cannot_decrypt' (Backup is locked),
  'conflict' (Not refreshed, nothing overwritten), 'backed_up' (Backed up).
- The web app's pull-to-refresh (UI-8 in household-finance-app.html) only
  re-rendered from the in-memory model, so it was a confidence cue, not a
  real reload. The mobile version does a real refreshModel() call.
- Request after PC.8-1: the screen itself should slide down as you pull, with
  an animated indicator underneath. iOS's native RefreshControl already does
  this. Android's only floats a small circle over the content, so this was
  an Android-only gap.
- Locked: Option B chosen over Option A. Option A (keep the native gesture,
  add a "Refreshing..." banner) was offered as the safer path and declined,
  knowing the gesture-coordination risk. Option B = hand-built gesture.
- PC.9 (pushed, on-device test passed on Dashboard): new
  mobile-app/src/PullToRefreshScrollView.tsx. iOS branch = RN ScrollView with
  RefreshControl (unchanged look). Android branch = AndroidPullToRefresh:
  PanGestureHandler wrapping an Animated.View, an indicator area above a
  react-native-gesture-handler ScrollView that grows as you pull (pushing the
  content down) with a sync-outline icon that rotates with the pull, then
  spins continuously while refreshing and collapses when refreshing ends.
  Constants: PULL_TRIGGER_DISTANCE = 70 (raw drag px to commit),
  INDICATOR_MAX_HEIGHT = 64. Gesture props: enabled={isAtTop && !refreshing},
  simultaneousHandlers={scrollRef}, activeOffsetY={[-1000, 15]},
  failOffsetX={[-15, 15]}. GH ScrollView has overScrollMode="never",
  onScroll + scrollEventThrottle 16 to track isAtTop. Height/opacity
  animations use useNativeDriver:false; the continuous spin uses true.
- useRefresh's return shape CHANGED from { refreshControl } to
  { refreshing, onRefresh }. Screens now pass those two props to
  <PullToRefreshScrollView> instead of a refreshControl prop.
- react-native-reanimated is NOT installed, so the gesture uses only
  react-native-gesture-handler + RN's own Animated. GestureHandlerRootView
  already wraps the whole app (confirmed by Antigravity).
- Dashboard was chosen as the first test screen because it has no tappable
  or swipeable rows, so the pull gesture cannot fight anything there.
  The other screens DO have SwipeableRow (horizontal swipe-to-delete),
  CollapsibleRow, TextInputs, and Calendar's horizontal month swipe.
- Rollout plan: one more Antigravity investigation (investigation only)
  listing every screen's ScrollView props and nested scrollers, then a first
  batch of 2-3 of the safest screens, then an on-device test, then the rest.
  On-device checks per screen: pull refreshes, normal scrolling never
  triggers the pull, swipe-to-delete still works, a sideways swipe never
  starts a pull.
- PC.9 Step 0 (batch 1, pushed): PullToRefreshScrollView.tsx was rewritten
  in full. Props are now Omit<ScrollViewProps, 'refreshControl'> plus
  refreshing / onRefresh / children, so screens can pass keyboardShouldPersistTaps,
  testID, style and so on. The component is React.forwardRef on both platforms.
  On Android one ref callback (setScrollRef) feeds BOTH the internal scrollRef
  (needed for simultaneousHandlers) and the caller's ref. A caller's own
  onScroll is chained from handleScroll, so isAtTop detection is not
  overwritten. The rest props are spread onto RNScrollView (iOS) and
  GHScrollView (Android, via an "as any" cast to avoid RN vs gesture-handler
  prop typing friction). Gesture logic is unchanged.
- PC.9 batch 1 (pushed, on-device test passed): BillsScreen.tsx,
  DebtsScreen.tsx and IncomeScreen.tsx now use PullToRefreshScrollView. Each
  screen got the same four edits: ScrollView removed from the react-native
  import, useRefresh and PullToRefreshScrollView imported, the hook line
  "const { refreshing, onRefresh } = useRefresh();" added directly under
  useData() (above the "if (!model)" early return, so the Rules of Hooks
  hold), and the opening/closing <ScrollView> tags swapped. Only
  contentContainerStyle, refreshing and onRefresh are passed.
- Batch 1 was chosen because Antigravity's investigation confirmed for all
  three: one vertical ScrollView, rows are direct children, every TextInput
  sits inside the BottomSheet outside the ScrollView, no ref / onScroll /
  keyboardShouldPersistTaps, and the balance banner is INSIDE the ScrollView
  (so it slides down with the pull).
- Real result: this was the first time the pull gesture ran on screens with
  SwipeableRow, and it passed on-device. That was the untested interaction
  after Dashboard.
- Scope decisions for the rest: More, Premium, Calendar, Planning and Reports
  (pill rows) are NOT getting pull-to-refresh (no synced data to refresh,
  no vertical scroller, or only a horizontal pill row). Settings and Profile
  are deferred. The Reports child screens are optional and later. The
  Groceries Calculator tab and the Savings Emergency Fund and FI tabs are
  scratch calculators, not synced lists, so they are not planned.
- Batch 2 plan: 2a = Loans, Transactions, Events, Goals, Travel. 2b =
  Accounts (needs keyboardShouldPersistTaps="handled", now forwardable),
  Groceries List tab only, Savings Goals tab only. Investigation prompt
  written and run; see the batch 2 results below.
- PC.9 batch 2 investigation (Antigravity) findings: all eight screens have
  one clean main vertical ScrollView with rows as direct children; every
  hook line can go directly under the useData() line, above the
  "if (!model)" early return; NO horizontal scroller sits inside any main
  vertical ScrollView (Loans, Transactions, Accounts, Events, Goals, Travel,
  Groceries, Savings). Transactions' sort pill row is a plain View, not a
  scroller. That closes the batch 1 open question about nested horizontal
  scrollers, for these screens.
- PC.9 batch 2a (pushed, on-device test passed): LoansScreen.tsx,
  TransactionsScreen.tsx, EventsScreen.tsx, GoalsScreen.tsx and
  TravelScreen.tsx now use PullToRefreshScrollView. Loans and Transactions
  got the same four edits as batch 1 (ScrollView removed from the
  react-native import, two new imports, hook line under useData(), tags
  swapped). Events, Goals and Travel did NOT remove ScrollView from the
  react-native import, because each has a SECOND ScrollView inside its
  add/edit Modal (outside the main list). In those three, only the FIRST
  closing </ScrollView> was replaced.
- Transactions uses SwipeableRow with a gold "View ..." viewAction for rows
  linked to a bill, debt, loan or savings goal, and Delete for manual rows.
  Both swipe kinds passed on-device alongside the pull gesture.
- PC.9 batch 2b (pushed, on-device test passed): AccountsScreen.tsx,
  GroceriesScreen.tsx and SavingsScreen.tsx. In all three, ScrollView was
  KEPT in the react-native import. Accounts: the main list's opening tag
  is now <PullToRefreshScrollView with keyboardShouldPersistTaps="handled",
  refreshing and onRefresh (this used the prop forwarding from batch 1
  Step 0); the horizontal card-colour swatch ScrollView inside its
  BottomSheet is unchanged. Groceries and Savings each have one conditional
  tab body per tab inside a single return. Only the first opening and first
  closing tag were replaced: Groceries "list" tab and Savings "goals" tab.
- Locked: the Groceries Calculator tab and the Savings Emergency Fund and
  FI Calculator tabs stay on a plain ScrollView. They are local scratch
  calculators with nothing in the cloud model to refresh, and they hold
  TextInputs directly in the scroll body.
- Rollout method that worked (keep using it): search for JSX tags without
  leading spaces; when a tag appears more than once, put the cursor at the
  top of the file (Ctrl+Home), confirm the match count ("1 of 2" etc.), and
  use the single Replace button on the first match only; grep the files for
  "ScrollView|useRefresh" after editing and BEFORE running tsc.

📌 PC.6 decisions and results (added this session)
- Locked: Settings becomes an iPhone-style hub of short grouped cards.
  Each row opens ONE section on its own page inside the same file, driven
  by a single page state (null = hub). Rejected: separate sub-screen files
  (would move about 800 lines of state and handlers across files, the same
  kind of edit that caused the PC.5-2a style deletion), and extracting the
  modals first.
- Locked hub layout: profile card (profile-card, opens Profile) on top;
  ACCOUNT = Security, Quick Unlock (includes Auto-lock), Devices;
  PREFERENCES = Appearance (shows current value), Notifications (includes
  the push and weekly recap toggles), List Rows, and later Language;
  BUDGETING = Left to Spend, Categories, Category Watchlist, Merchants &
  Payees, Categorization Rules; DATA = Backup & data; later SUPPORT = Help &
  support, About us; later an outlined red "Log out" pill at the bottom.
- Locked: the mockup's "Linked accounts" row is DROPPED, replaced by a
  "Devices" row. Household linking already lives on Profile and there are no
  social accounts until Phase C.
- Locked: Language, Help & support and About us are static placeholders.
  Help & support says "Coming soon". About us shows the app name (Finance
  Flow) and version (1.0.0, from app.json). app.json has no privacy or
  terms URL.
- Locked: Settings gets its own Log out. Its testID will be
  settings-log-out-button, NOT sign-out-button, because Profile stays
  mounted under Settings and two elements with the same testID could
  confuse Maestro. Same alert wording as Profile: "Log out?" with Cancel /
  "Yes, log out". It needs onSignOut passed to SettingsScreen from
  RootStack.tsx, as Profile receives it.
- Investigation (Antigravity) confirmed: SettingsScreen takes no props;
  Settings is registered in RootStack (no bottom tab bar); no route params,
  scroll refs, back listeners or BackHandler existed; nothing in the app
  navigates to Settings with params; react-navigation native 7.3.17,
  native-stack 7.18.9, react-native 0.81.5, expo 54.
- Plan: PC.6-1 hub (done). PC.6-1b flow updates (done, untested). PC.6-2 =
  Log out on Settings plus the RootStack edit. PC.6-3 = Language, Help &
  support and About us placeholder pages. PC.6-4 = value labels ("English")
  and polish.
📌 "Fewer words" batch 1 (added this session)
- Audit run by Antigravity (investigation only): house style derived from
  git diffs c9bbda7 (Bills/Transactions), 738e454 (Income), 4ab1c07
  (Loans), e17a6bc (Events; it already trimmed EventsScreen, so Events
  needed nothing more). Rules seen in the diffs: questions become noun
  phrases, drop parenthetical explanations, drop "or leave it blank" and
  "e.g." tails on errors, "Deletes the X and Y. Cannot be undone." for
  delete alerts, empty states drop "Add your first one below.", buttons
  drop "this" (Delete bill), conversational placeholders shortened.
- Applied in one pass (pushed, tsc-clean, CONFIRMED ON-DEVICE by the person):
  * IncomeScreen.tsx: swipe-delete alert body now "Deletes the source and
    its logged payments. Cannot be undone." (the swipe path had been missed
    in 738e454).
  * TravelScreen.tsx: intro now "Add items with costs to track budget."
  * CsvImportModal.tsx: error now "Couldn't read CSV file."; help text now
    "Needs date, label and amount. Optional direction: in, out, saving
    (default out). Dates: YYYY-MM-DD or MM/DD/YYYY."
  * LoanPayoffSimulatorModal.tsx: hint now "Missing rates default to 0%,
    missing payments to 2% of balance." The order (0% for rates, 2% for
    payments) came from the old sentence; it was NOT checked against the
    calculation code.
- Deliberately SKIPPED (do not redo without a new decision): the 37
  "Failed to save/delete. Please try again." messages (about 2 words saved
  each, across many files); dropping "a"/"an" from "Enter a valid ...";
  "Enter month 1-12" / "Enter day 1-31" (conflicts with the house style);
  "Possible duplicate" -> "Duplicate" (the check is a date-window guess);
  placeholder trims (e.g. GCash/BPI examples); savings toggle label
  changes ("Don't save" would mislead); dropping "(optional)"; "COMMITTED
  BUDGET (CHECKED ITEMS)" trim; Snowball/Avalanche subtitle rewrite; the
  "Payoff order - <strategy>" heading trim (the strategy name appears in
  text only there; the gold card border is the only other cue).
- Protected, do NOT shorten: all delete/remove alerts already in short
  form; recovery-key, encryption and password warnings in SetPin, Settings,
  SignIn, CreateProfile, Profile; the exact text 'Password changed.'
  (SettingsScreen compares passChangeMsg === 'Password changed.') and the
  SignIn error string compared at SignInScreen.tsx:716; Maestro taps "Yes,
  log out".
- Not yet covered (next batches, by the audit's over-8-word counts):
  AccountsScreen (its long strings are protected alerts; only small trims
  remain), TaxSummaryReport, GoalsScreen, SavingsFiComparisonModal,
  AvatarPickerSheet, SetPinScreen, PremiumScreen, PaymentMethodsReport,
  CashFlowForecastReport, ReportsScreen, then the smaller files
  (PinUnlockScreen, YearInReviewReport, DashboardScreen, other reports,
  HomeScreen, CalendarScreen, small components). Also still open: about 38
  strings over 12 words remain in the 13 already-done screens (mostly
  Settings, Profile, SignIn, CreateProfile; many are protected security
  text). Ask Antigravity to re-list them when wanted.
- Maestro flows, suspected break (NOT verified): HomeScreen.tsx no longer
  renders "You're signed in, {username}!" (replaced by "Hi, {username}" in
  d4de454). create-profile, sign-in, pin-quick-unlock, change-password and
  sign-out-round-trip still wait for that text with extendedWaitUntil
  (timeout 120000). Only the assertVisible after it is optional: true, not
  the wait, so the flows will probably time out and fail there. Fix when
  the flows are run: wait on a testID that exists on Home (e.g.
  home-calendar-shortcut) instead. Antigravity's claim that they "pass or
  warn" contradicts its own pasted YAML.
📌 "Fewer words" batch 2 (added this session)
- Audit by Antigravity (investigation only), then cut down by review.
  Threshold used: only changes that save 4+ words or fix a string over
  12 words. Applied in one pass (pushed, tsc-clean, CONFIRMED ON-DEVICE by
  the person, except the avatar alert, which only shows when photo access
  is denied and was not triggered):
  * TaxSummaryReport.tsx: intro now "Income, spending, fees and savings
    for {year}. Not tax advice." (15 -> 10 words); fees note now "Loan
    late fees and logged debt fees only." (kept the meaning that unlogged
    fees are not counted).
  * SavingsFiComparisonModal.tsx: intro now "Base Plan is your saved plan.
    Change fields below to compare a What-If Plan. Nothing here changes
    what's saved." (28 -> 19 words; kept the terms Base Plan / What-If Plan
    and the "nothing is saved" reassurance).
  * AvatarPickerSheet.tsx: photo-permission alert now "Allow photo library
    access in your phone settings." (13 -> 8).
- Antigravity proposals REJECTED (do not redo without a new decision):
  * Tax intro "Financial summary for {year}. Not tax advice." (dropped the
    list of what is included) and fees note "Includes loan late fees and
    logged debt fees." (dropped the warning that totals can be incomplete).
  * Compare modal "Test a What-If scenario against your saved plan. Changes
    here are not saved." (dropped the "Base Plan" term).
  * PremiumScreen subtitle trim (placeholder screen built from the mockup;
    "match the mockup" decision). Still open if the person wants it.
  * PaymentMethodsReport footnote ("unassigned payments" reads oddly, saves
    only 3 words), CashFlowForecastReport footnote ("planned entries" is
    vaguer and drops what is included), ReportsScreen empty state ("Tap
    Customize above" was not confirmed to match the visible label, which may
    be an icon; saves 3 words).
- Nothing worth changing found in GoalsScreen.tsx (31 strings looked at) or
  SetPinScreen.tsx (11). Both left alone. Their delete alert and the PIN
  warning are protected.
- Not yet covered (batch 3, if wanted): AccountsScreen (long strings are
  protected alerts), PinUnlockScreen, DashboardScreen, HomeScreen,
  CalendarScreen, the other reports (YearInReview, SubscriptionAudit,
  WeeklyDigest, MerchantSpending, PersonSpending, MonthlyCloseOut),
  IntroScreen, IntroSlidesScreen, PlanningScreen, ToPayScreen,
  InsightsScreen, and the small components. Their inventory word counts are
  all low (0 strings over 8 words except AccountsScreen), so remaining gains
  are small. Reasonable to STOP the pass here. Intro slide copy also has
  not had the pass. About 38 strings over 12 words remain in the 13
  earlier screens (many are protected security text).

📌 Phase C start: first Android EAS build (added this session)
- Prep committed and pushed (423182b): mobile-app/eas.json (new; profile
  "preview" = internal distribution, Android buildType apk;
  cli.appVersionSource "local"), app.json android.versionCode 1, expo-font
  added (~14.0.12; expo-doctor now 18/18, duplicate expo-font gone),
  expo-image-picker microphonePermission false (drops RECORD_AUDIO; the
  camera permission was NOT blocked because nobody checked whether the app
  uses the camera).
- eas init run: project @cathlauron/mobile-app on the person's personal
  account (there is also a team account cathlaurons-team), project ID
  fc22064f-0d07-4d26-814d-61d99dbe6efd, app.json now has extra.eas.projectId
  and owner "cathlauron". eas init also rewrote android.permissions to
  android.permission.USE_BIOMETRIC and android.permission.USE_FINGERPRINT.
  Probably harmless (same permission, full name); not confirmed why. If
  biometric unlock misbehaves on the installed build, look here first.
- First build: eas build --platform android --profile preview FINISHED.
  Build page:
  https://expo.dev/accounts/cathlauron/projects/mobile-app/builds/0fd9cd0b-17c1-4642-8280-5dd02b2577d4
  Installed and tested on the person's Vivo V40 Lite 5G (Android 16).
  Free plan per the billing page screenshot: 15 Android and 15 iOS builds
  a month, low-priority queue. Whether fast-failed builds are still waived
  was not confirmed (2024 changelog said up to 10 a month).
- Antigravity's Phase C readiness report (investigation only): the app
  schedules LOCAL notifications only (no push token calls), so no FCM setup
  is needed; Firebase uses the JS SDK with a hard-coded config in
  src/firebase.ts (committed); no google-services.json; icons are 1024x1024
  and square; expo-image-picker photosPermission is iOS-only (resolves the
  old PC.5a note). Unverified claims in that report, not acted on: a
  missing SafeAreaProvider (I believe React Navigation supplies one), the
  notification icon being full colour (cosmetic).
- Decision: first build is the "preview" APK. expo-dev-client deferred until
  real Google/Apple/Facebook sign-in (PC.3) or heavy on-device iteration
  needs it.
- Process lesson: in the app.json edit, my find/replace snippets included
  context lines that were pasted on top of the existing ones, which
  duplicated blocks and broke the JSON (expo-doctor then crashed with a
  config error). Fixed by replacing the whole file. For short files, give a
  full-file replacement.
- Installed-build test results (first preview APK, on-device, by the
  person): screenshots WORK on sign-in, Home and tabs; layout OK;
  fingerprint/face unlock OK; photo avatar OK; notifications OK; gestures
  OK (checklist items 1 to 6 passed). Item 7: after fully closing and
  reopening the app it asks for email, username and password again, not the
  PIN. Believed to be by design (the encryption key exists only in memory,
  and App.tsx always starts at sign-in when a profile exists), but NOT
  confirmed: PinUnlockScreen.tsx and biometrics.ts were not read. The
  switch-away-and-return test (expect PIN screen) was not yet run. Letting a
  PIN unlock after a full close would mean storing the key on the phone; a
  security decision, deferred.
- Still TO DO on the installed build: reminder round (bill reminders,
  weekly recap, subscription reminder tap, all deferred from Expo Go), then
  update the five Maestro flows (appId com.cathlauron.householdfinance,
  replace the "You're signed in" waits).
- TO DO before real users: confirm the Firestore security rules require
  sign-in in the Firebase Console (the readiness report never checked them).
- Not yet done: iOS build (needs an Apple developer account, about $99 a
  year), Google Play (about $25 once), PC.3 social sign-in.

📌 Firebase review after the first installed build (added this session)
- Authentication > Sign-in method: only Email/Password is enabled; no
  Anonymous provider. Google's banner recommending "Sign in with Google" was
  ignored; the Google provider was NOT enabled (real social sign-in is PC.3,
  needs a dev-client build).
- Firestore rules were READ, not fully tested. The live version in the
  console is the one starred Sept 4, 2026 6:27 pm; it was assumed to match
  the text the person pasted (not diffed). Good: default deny at the end,
  list disabled on the sensitive collections, link codes readable for 15
  minutes, households capped at 5 members, household data readable only by
  members.
- FINDING: householdKeys (get, update), profileBackups (get) and
  recoveryKeys (update) use resource.data.get('ownerUid', request.auth.uid)
  == request.auth.uid, so a document with NO ownerUid can be read (or
  updated) by any signed-in user. Rules Playground (simulation type get,
  authenticated, fake UID) confirmed "read allowed" on /profileBackups/cas
  when it had no ownerUid. Old test documents lacked the field.
- Fix applied by the person (I did not see it): added ownerUid to the
  documents that lacked it, and deleted the other test accounts (cath2,
  cath4, cathh, fern). Only cas and cath remain. Retest in the playground:
  the person reported cas and cath "denied" (the collection tested was not
  stated; confirm /profileBackups and /householdKeys for both). Whether the
  deleted test users also were removed from Authentication was not stated.
- Rules were NOT changed. Optional hardening: remove the ownerUid fallback
  from those four rules. Only safe once every document has ownerUid (the
  create rules already require it for new documents). Test in the
  playground before publishing; a wrong edit could lock every user out.
  Never publish rules from a chat without testing.
- NOT verified (low to medium priority): whether anyone signed in can join
  a household just by knowing its ID (the join rule checks only that the
  caller adds their own uid; the ID looked 24 hex characters long in the
  console, generation code not read); usernames can be claimed by any
  account on householdKeys/{username} create; the linkCodes update rules
  have no 15-minute limit (only get does); link-code guessability; whether
  sign-up is restricted.
- Leftover test data seen in the console: an old linkCodes invite, an
  approved householdRecovery document, and empty-looking sessions entries
  (normal). Optional cleanup; do not delete sessions entries.
- Console screenshots shown in chat included household and user IDs, salts
  and one link code. Not passwords or usable keys, but future screenshots
  should be cropped to field names.
- Cold start on the installed build: switching to another app and back asks
  for the PIN; fully closing and reopening asks for email, username and
  password. Believed by design (the derived key lives only in memory), NOT
  confirmed: PinUnlockScreen.tsx and biometrics.ts were not read. Letting a
  PIN unlock after a full close would mean storing the key on the phone;
  a security decision, deferred.

📌 Notifications: investigation done, TESTING DEFERRED by the person
- Decision: real-device notification testing is deliberately deferred. It
  will be the LAST thing tested, or when the person asks. Do not start it
  unprompted.
- Antigravity read the code (nothing was run on a device). Confirmed in
  code: all notifications are LOCAL (expo-notifications), no server push.
  The whole schedule is cleared and rebuilt by rescheduleBillNotifications()
  (pushNotifications.ts) on sign-in, PIN unlock, every saveModel, every
  refresh, and linked-household snapshots. It is NOT run on cold start
  (the data is encrypted until sign-in), so reminders are only as fresh as
  the last sign-in or save.
- Timing, from the code:
  * Bill "X is due soon" and subscription "Still want X?": fire at exactly
    9:00 AM local, on the day that is (Settings > Alert me) days before the
    next due date. If that 9:00 AM has already passed, the reminder is
    silently skipped, not scheduled. Skipped for bills with no unpaid
    amount (first payment cycle only) or no computable due date.
  * Weekly recap: fires on the chosen weekday at the chosen hour (whole
    hours, 0-23, default Sunday 18:00). Always scheduled for the next
    future occurrence. It ignores Alert me. The amount in its text is
    baked in at schedule time.
  * All three use one-time DATE triggers, Android channel "bill-alerts".
    Foreground display is enabled (banner, sound, list).
- Which reminder a bill gets: an ACTIVE subscription gets only the "Still
  want X?" reminder; every other unpaid bill gets "due soon"; no bill gets
  both (the two loops use exactly complementary conditions).
- Tap handling (App.tsx): only the subscription reminder carries data
  (type subscriptionReminder, billId) and deep-links: To-Pay > Bills >
  that bill's edit sheet. From a cold start or the PIN lock screen the
  billId is held in a ref and opened after sign-in / unlock. "Due soon" and
  the recap carry no data and just open the app.
- Settings UI: Settings > Notifications shows Alert me, "Notify me on this
  phone", and "Weekly spending recap" all the time; the day pills and hour
  box appear only when the recap toggle is on. There are no subscription
  reminder controls in Settings (subscription reminders share the global
  toggle and Alert me; a bill is flagged in BillsScreen).
- No debug button or test trigger exists. Do not change the phone clock to
  force a reminder (effect on sign-in/sync unknown).
- FLAGS, all UNTESTED (found by reading code):
  1. Sign-out does not cancel scheduled notifications
     (cancelAllScheduledNotificationsAsync is only called inside
     rescheduleBillNotifications). Reminders and the recap total can still
     appear on the lock screen after signing out. Notification text is not
     encrypted. Highest-priority fix candidate; the fix looks small (cancel
     on sign-out and on remote revoke), investigate first.
  2. A CANCELLED subscription is treated as an ordinary bill, so it still
     gets a "due soon" reminder if it has an unpaid amount. The cancel
     alert says "Stop reminders", so this looks like a bug.
  3. The recap text says "tap to see the breakdown", but tapping opens
     nothing specific.
  Also: the header comment in pushNotifications.ts still says the app runs
  through Expo Go (stale). PROGRESS.md line 93 claimed reminders were
  confirmed firing on a real device in an earlier phase; not re-verified.
  Unverified: whether a new bill saved with an amount records a first
  payment cycle (needed for reminders); whether Android restores the
  scheduled notifications after a phone restart.
- Vivo prep to do before testing: Settings > battery, allow Finance Flow
  background activity (unrestricted); allow autostart if offered; confirm
  the "Bill alerts" channel is on. Vivo battery settings are the first
  suspect if a reminder never arrives.
- TEST PLAN, ready to run when asked (write down the time and screenshot
  every notification):
  1. Settings > Notifications: turn on Notify me (allow the Android
     prompt), turn on the weekly recap, set Alert me to 1 (reset after).
  2. Recap run 1: today's weekday pill and the NEXT hour (24-hour; the
     current hour rolls to next week). At the hour check the title, the
     amount against Reports > Weekly Digest, and the tap.
  3. Create four one-time bills, each with an amount, due two days from
     today: an ordinary bill, subscription A, subscription B, and
     subscription C (marked subscription, then cancelled).
  4. Recap run 2: set the next hour, SIGN OUT, and see whether the recap
     still arrives (expected yes, flag 1). Sign back in.
  5. Next morning at 9:00 AM (do not sign out first; A fully swiped away,
     B in the background): expect "Ordinary is due soon", "Still want A?",
     "Still want B?", and watch for a "due soon" for C (flag 2). Tap A
     while the app is closed: expect sign-in, then A's edit sheet. Tap B:
     expect the PIN, then B's edit sheet. Check wording, dates, amounts.
  6. Delete the test bills and reset Alert me.
  Send back: what arrived, when, exact text, screenshots, and which steps
  did not happen.

Checkpoint table

| Checkpoint | What happens | Done when |
|---|---|---|
| PC.0 | Lock the new palette into a central theme file, mapped onto the app's real existing token names; add eco_house_logo.svg into the repo in the correct assets location; confirm the rename touches every real spot it needs to (app.json, package.json, splash, any hardcoded name strings). | New palette + logo exist as real files in the repo; nothing else built on top yet. |
| PC.1 | Onboarding carousel (3 intro slides) merged with the existing biometric/PIN setup into one continuous first-run flow. Split: PC.1a = splash + 3 slides + first-run wiring (cc6a74e, pushed, awaiting on-device check). PC.1b = drop duplicate onboarding welcome step, 2-step Quick Unlock flow (0a19088, pushed, tsc-clean). | New user sees intro -> create profile -> recovery key -> Quick Unlock -> ready -> home, restyled. |
| PC.2 | Sign-in restyle: logo, icon-prefixed fields, pill button, social row (placeholder alerts), serif centered heading. Keeps BOTH email and username fields. | DONE and confirmed on-device (see decisions below). |
| PC.2b | Create Profile restyle plus recovery-key modal restyle, and wrapped in a ScrollView/KeyboardAvoidingView (was a plain View: fields and button were unreachable with the keyboard open). | DONE and confirmed on-device. |
| PC.3 | Real Google/Apple/Facebook sign-in wired to Firebase Auth. DEFERRED to Phase C: needs an EAS dev-client build, not testable in Expo Go. Sign-in buttons stay "Coming soon" alerts until then. | Not started, deliberately deferred. |
| PC.4 | Home screen restyle. | DONE and confirmed on-device (header, date row, card styling, icon buttons all verified). PC.4c (redesign v2 - centered date, bell, tinted % Left to Spend, card icons) also DONE, on-device verified, and its Maestro flow update run and passing. |
| PC.5a | Avatar system: initials, preset avatars, real photo picker. Photo stored inside the ENCRYPTED household model (needs expo-image-manipulator to shrink first). | DONE and confirmed on-device (PC.5a-1 d298368 foundation, PC.5a-2 picker + display). Roster avatars deferred to PC.5. |
| PC.5 | Profile screen restyle, "Member since" from Firebase creationTime, roster avatars. Split into PC.5-1 (49af80f), PC.5-2a and PC.5-2b. | DONE and confirmed on-device. Header, Member since, grouped shortcut card, Lock App / Log out pills, roster avatars all verified (roster avatars for a second linked member not confirmed). |
| PC.6 | Settings screen restyle as an iPhone-style hub with drill-in pages. Split: PC.6-1 hub, PC.6-1b Maestro flow updates, PC.6-2 Log out on Settings, PC.6-3 Language / Help & support / About us placeholders, PC.6-4 value labels and polish. | PC.6-1 DONE (pushed, on-device test passed). PC.6-1b committed but the flows are UNTESTED (no device connected). PC.6-2 DONE and PC.6-3 DONE (both pushed, on-device tests passed). PC.6-4 DONE (pushed, on-device test passed). PC.6 is COMPLETE apart from the untested PC.6-1b flows. |
| PC.7 | New Subscription screen, "Coming soon" placeholder - no real payment/paywall logic. | Reachable from Settings/Profile, matches mockup visually, clearly non-functional. DONE (pushed, on-device test passed). Entry point is Settings only, not Profile. |
| PC.8 | Pull-to-refresh gesture, added as one reusable component/hook, applied across relevant screens. Split: PC.8-1 = native RefreshControl on Dashboard only. PC.9 = custom drag-following pull gesture (Android only) via PullToRefreshScrollView, built and tested on Dashboard first. | PC.8-1 DONE (Dashboard, pushed, on-device test passed). PC.9 Option B DONE on Dashboard only (pushed, on-device test passed). PC.9 batch 1 DONE (Bills, Debts, Income; pushed, on-device test passed). PC.9 batch 2a DONE (Loans, Transactions, Events, Goals, Travel; pushed, on-device test passed). PC.9 batch 2b DONE (Accounts, Groceries List tab, Savings Goals tab; pushed, on-device test passed). PC.9 rollout COMPLETE. Deliberately NOT converted: More, Premium, Calendar, Planning and Reports (pill rows), Reports child screens, Profile, Settings, Groceries Calculator tab, Savings Emergency Fund and FI tabs. Bug #14 was fixed separately and is closed.|

Each row is sized to be one session's worth of work, same pattern as
every other phase.

▶️ Next step
- ACTIVE: quick unlock after a full close (see the 🔐 block near the end of
  this file). Steps 1 and 2 done and pushed. Option 1 chosen. Next: Step 3
  (vault storage for email + username + password).
- Bug #14 is CLOSED (confirmed on-device). Nothing immediate is pending;
  continue with the remaining pre-Phase C items below.
- Screenshot restriction: CLOSED. Works on the installed build; it was
  Expo Go on this phone.
- PC.5a is done and on-device verified (d298368 plus the picker commit).
  PC.4c and its Maestro flow are committed (75f2be3).
- PC.5 is DONE (PC.5-1, PC.5-2a, PC.5-2b, all pushed and on-device tested).
- PC.6 is COMPLETE: PC.6-1 through PC.6-4 DONE (pushed, on-device tests passed).
  PC.6-1b (Maestro flow edits) is committed but untested.
- PC.7 is DONE (Subscription placeholder screen, pushed, on-device test
  passed).
- PC.8-1 and PC.9 are COMPLETE (Dashboard, batch 1, batch 2a and batch 2b;
  all pushed and on-device tested). PC.8 is done.
  Remaining pre-Phase C items, in no fixed order (after the two immediate
  items above):
  (a) "Fewer words" pass: CLOSED by the person's decision. Batches 1 and 2
      pushed and confirmed on-device. The remaining files have almost no
      trimmable text. Intro slide copy was not trimmed. Reopen only if
      wanted.
  (b) Maestro flows: DEFERRED TO PHASE C by the person's decision. Manual
      on-device testing is the accepted check for now. When the first EAS
      installed build exists, update all five flows (create-profile,
      sign-in, change-password, pin-quick-unlock, sign-out-round-trip):
      change appId from host.exp.exponent (Expo Go) to
      com.cathlauron.householdfinance, replace the exp://192.168.1.62:8081
      openLink with launching the installed app, replace the
      "You're signed in.*" waits with a testID that exists on Home, and fix
      the sign-out-button reachability issue. Needs a device or emulator
      connected.
    (b2) Notification testing: DEFERRED by the person, do it LAST or when
      asked (plan and three untested flags in the notifications block
      above). Fix candidate when the time comes: cancel scheduled
      notifications on sign-out.
  (c) Optional: pull-to-refresh on Profile, Settings, and the Reports child
      screens, only if wanted (see Known issues for the Settings scrollTo
      risk).
  (d) Nothing to re-enable: the app never blocked screenshots, and they
      work on the installed build.
  Then Phase C (EAS Build).
  PC.3 (real Google/Apple/Facebook OAuth) still waits for Phase C's EAS
  dev-client build.
- Decision (updated): the Maestro flows stay untested through the rest of
  pre-Phase C and are updated and run once, against the Phase C installed
  build, not against Expo Go. Reason: they currently target Expo Go, wait
  on text Home no longer shows, and have never run, so fixing them now
  would mean doing the work twice.

=====================================================================
🔐 PHASE C FEATURE - Quick unlock after a full app close (IN PROGRESS)
=====================================================================
Goal: fully closing and reopening the app must NOT ask for email, username
and password. Only an explicit Log out, or a remote revoke from the Devices
screen, forces full sign-in. After a close: account switcher with avatars ->
pick an account -> fingerprint/face first -> "Use PIN instead" fallback.

📌 Confirmed by Antigravity investigation (real code read, nothing run)
- This CONFIRMS the two earlier "believed by design, not confirmed"
  cold-start notes above.
- Cause: App.tsx's launch effect only calls loadProfilesIndex() and sets
  'signIn' if any local profile exists (else 'intro'). It never checks
  Firebase's saved login, even though firebase.ts already configures Auth
  persistence with AsyncStorage.
- derivedKey lives only in React state (memory) in App.tsx, so every full
  close destroys it. PinUnlockScreen only works after backgrounding.
- Nothing signs the user out on close or background. Only handleFullSignOut
  (explicit) and handleRemoteRevoked (Firestore session doc revoked:true).
- No revocation check runs on launch. Sessions live at
  sessions/{uid}/devices/{deviceId}.
- Sign-in derives the key with deriveKey(password, salt) (encryption.ts,
  PBKDF2 100k). Linked households also unwrap a household key and pass it
  to loadModel. The Firebase password and the encryption password are the
  same string.
- expo-secure-store was NOT installed (zero uses). expo-local-authentication
  ~17.0.9 is installed. biometrics.ts and pin.ts exist, both keyed per
  username.
- No recent-accounts store existed. Avatars live inside the encrypted model
  (model.avatars[username]).

📌 Decisions locked (quick unlock)
- Option A: OS-enforced vault (expo-secure-store, requireAuthentication) for
  a fingerprint/face-locked copy, plus a separate PIN-locked copy.
- Explicit Log out and remote revoke wipe both copies and remove the account
  from the switcher.
- Offline at launch: let the person in (fingerprint/PIN still required),
  check revocation as soon as the phone is back online.
- 5 wrong PINs: wipe the quick-unlock copies, full password required.
- The switcher shows real avatar photos (an unencrypted copy sits in the
  app's private storage).
- The switcher lists up to 5 recent accounts (same as the household max).
- DECIDED (Option 1): every one of the 5 accounts gets quick unlock. The vault
  stores that account's email, username and password in two locked copies
  (fingerprint/face-locked and PIN-locked). After unlock, the app runs the
  normal sign-in path, including the linked-household key handling. This
  stores the REAL password (same on every device), so the wipe rules on log
  out, remote revoke and 5 wrong PINs are mandatory. Option 2 (one account,
  no passwords stored) was rejected.

📌 Plan (one Antigravity investigation before each step)
- Step 1: install expo-secure-store; add src/recentAccounts.ts (max 5). DONE
  in this commit, tsc-clean. Nothing visible changes.
- Step 2: DONE. The recent-accounts list is kept up to date (sign-in, create
  profile, avatar, PIN on/off, fingerprint on/off, removal on log out/revoke).
- Step 3: src/quickUnlock.ts (vault copies), saves at the right moments,
  wipes on log out, revoke and 5 wrong PINs.
- Step 4: AccountSwitcherScreen (avatars, fingerprint first, PIN fallback,
  password fallback).
- Step 5a: App.tsx launch logic plus revocation check (offline: allow, check
  later). Step 5b: switching to another remembered account (Option 1 only).
- Step 6: ONE EAS build, then on-device test (close/reopen, log out, remote
  revoke, 5 wrong PINs, airplane mode, photo avatar, all 5 accounts).

⚠️ Known issues / gotchas (quick unlock)
- expo-secure-store is native: the installed APK does not have it until the
  Step 6 build. Batch into ONE build (free plan: 15 Android builds a month).
- Firebase keeps ONE signed-in user, so switching accounts means a Firebase
  sign-in each time (Option 1). Do not touch the other account's sessions
  document when switching.
- app.json plugins now include "expo-secure-store" and package.json has
  expo-secure-store ~15.0.8 (both pushed in Step 1).
- Existing PINs are stored only as a hash, so a PIN-locked copy cannot be
  made for a PIN that was set earlier without the plaintext PIN. Step 3's
  investigation must decide how to migrate (for example on the next
  successful PIN entry).
- Recent accounts on a switch: leave the other account's sessions document
  alone so remote revoke still works, and check it BEFORE calling
  registerDeviceSession (which deletes and recreates the document and would
  erase a revoked flag). To confirm in Step 5.
- The PIN-locked copy can be guessed offline by someone who breaks the vault
  itself; the 5-tries rule does not stop that.
- iOS: expo-secure-store likely needs a faceIDPermission entry in its
  app.json plugin config. Unverified, check when an iOS build is planned.
- Saving a fingerprint-locked item may itself show a fingerprint prompt once.
  Unverified.


📌 Step 2 results (recent-accounts list kept up to date)
- Antigravity's plan was adjusted in five ways: (1) it awaited inside
  non-async callbacks (would not compile), so recordRecentAccount() in
  App.tsx does the awaits; (2) upsertRecentAccount ignores undefined fields,
  so clearing an avatar with undefined would have kept the old photo, and a
  cleared avatar is now stored as { type: 'initials' }; (3) turning the PIN
  off was missing from its plan (hasPin false is now set); (4) PIN,
  fingerprint and avatar updates use the new updateRecentAccountIfPresent so
  they never create a half-empty entry (no uid); (5) the lock screen's
  "Sign in to another account" is NOT a log out, so it keeps the account in
  the list (keepRecentOnSignOutRef in App.tsx).
- Written on: sign-in and profile creation (App.tsx, through
  recordRecentAccount, with uid, householdId, avatar, hasPin,
  biometricsEnabled); avatar save (ProfileScreen handleSaveAvatar); PIN set
  (SetPinScreen); PIN off and fingerprint on/off (SettingsScreen). Removed
  on explicit log out (Profile and Settings) and on remote revoke
  (handleRemoteRevoked).
- Skipped on purpose: refreshing lastUsedAt when the lock screen unlocks
  (only matters with 2+ accounts; Step 5a's cold-start unlock will do it).
- TEMP: saveRecentAccounts in recentAccounts.ts prints "[recent accounts]
  saved:" to Metro on every write (no photo data). Remove in Step 4.
- Checked in Expo Go through the Metro log (sign-in, PIN on/off,
  fingerprint on/off, avatar set/clear, lock-screen switch, log out).
- Metro showed "[avatar] base64 chars: 4516" for one test photo, far under the
  80,000 cap (this fills the number the PC.5a note said was never recorded;
  it is one sample, not the largest possible).
  
⚠️ Step 2 gotchas
- Avatar changes made on ANOTHER phone are not copied into the list until
  the next sign-in on this phone. Step 5a should refresh the avatar on unlock.
- Existing accounts appear in the list only after their next sign-in.
- The lock screen's password mode (chip row for other accounts) unlocks
  another account's DATA without signing into Firebase as that account (it
  derives the key but never calls sign-in) and registers no device session.
  Read from code, not tested. Step 5b replaces this path.
- "Sign in to another account" runs the full sign-out, which deletes this
  device's sessions document. While switched away, another phone's Devices
  screen may not be able to revoke this phone for that account, yet Step 3's
  vault would still allow a fingerprint sign-in. Decide in Step 5b (for
  example: keep the document, marked signed out, and check it before
  re-sign-in).
- Two writes to the list at the same moment could overwrite each other
  (read-modify-write, no lock). Unlikely with the current hooks.
- Antigravity claimed AsyncStorage has no practical size limit; not
  verified. 5 photo avatars is about 400 KB, which is small.

📚 Older progress: PROGRESS4.md (combined on-device re-test pass,
B.12b, fewer-words through 13 screens, now closed), PROGRESS3.md,
PROGRESS2.md, PROGRESS1.md, PROGRESS.md.
