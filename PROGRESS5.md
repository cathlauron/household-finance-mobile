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
- Reminder/notification-related bugs and testing stay deferred until a
  real installed build exists (Phase C, EAS Build) - not reliably
  testable through Expo Go.

⚠️ Known issues / gotchas - carried forward, still open
- Bug #14 (NOT YET FIXED): Reports screen's "Customize" checkbox list
  doesn't reflect a multi-select live - checking several report
  checkboxes in one sitting only shows the first one chosen until the
  sheet is closed and reopened. Every other individual checklist
  behavior on that screen works correctly. Needs a fresh Antigravity
  investigation-only prompt against the real current
  reportVisibility.ts/ReportsScreen.tsx before any fix is written -
  do not assume PC.8's planned pull-to-refresh feature fixes this; if
  the real cause is a stale closure rather than a stale render, a
  manual refresh gesture won't fix the underlying data either.
- Bug #9's Face-ID-specific "fails to even prompt" symptom still needs
  re-verification on a real installed build - suspected to be an Expo
  Go limitation, not re-testable until Phase C.
- Deferred to Phase C, do not chase now: subscription reminder deep-
  link, Bill reminders/Weekly recap toggle visibility in Settings,
  subscription double-notify, Weekly Spending Recap toggle/day-pills/
  hour input + actual firing, Subscription Cancel-Reminder wording and
  tap-to-deep-link (warm and cold start).
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
| PC.6 | Settings screen restyle as an iPhone-style hub with drill-in pages. Split: PC.6-1 hub, PC.6-1b Maestro flow updates, PC.6-2 Log out on Settings, PC.6-3 Language / Help & support / About us placeholders, PC.6-4 value labels and polish. | PC.6-1 DONE (pushed, on-device test passed). PC.6-1b committed but the flows are UNTESTED (no device connected). PC.6-2 to PC.6-4 NOT STARTED. |
| PC.7 | New Subscription screen, "Coming soon" placeholder - no real payment/paywall logic. | Reachable from Settings/Profile, matches mockup visually, clearly non-functional. |
| PC.8 | Pull-to-refresh gesture, added as one reusable component/hook, applied across relevant screens. | Swipe-down refresh works consistently everywhere it makes sense. Note: this does NOT automatically resolve Bug #14 - that still needs its own separate investigation. |

Each row is sized to be one session's worth of work, same pattern as
every other phase.

▶️ Next step
- PC.5a is done and on-device verified (d298368 plus the picker commit).
  PC.4c and its Maestro flow are committed (75f2be3).
- PC.5 is DONE (PC.5-1, PC.5-2a, PC.5-2b, all pushed and on-device tested).
- PC.6-1 is DONE (Settings hub, pushed, on-device test passed). PC.6-1b
  (Maestro flow edits) is committed but untested.
- PC.6-2 next: outlined red "Log out" pill at the bottom of the Settings
  hub, testID settings-log-out-button, same "Log out?" / "Yes, log out"
  alert. Needs a small RootStack.tsx edit so SettingsScreen receives
  onSignOut. Start by looking at the real current RootStack.tsx Settings
  registration and the bottom of the hub in SettingsScreen.tsx.
- Then PC.6-3 (Language, Help & support, About us placeholders), PC.6-4
  (value labels, polish), PC.7 (Subscription "Coming soon" screen), PC.8
  (pull-to-refresh). PC.3 (real Google/Apple/Facebook OAuth) still waits
  for Phase C's EAS dev-client build.
- Whenever a device or emulator is available: run change-password.yaml,
  pin-quick-unlock.yaml and sign-out-round-trip.yaml, and fix the
  sign-out-button reachability problem listed under Known issues.
- Bug #14 and the "fewer words" pass (next: EventsScreen.tsx) stay paused.

📚 Older progress: PROGRESS4.md (combined on-device re-test pass,
B.12b, fewer-words through 13 screens, now closed), PROGRESS3.md,
PROGRESS2.md, PROGRESS1.md, PROGRESS.md.
