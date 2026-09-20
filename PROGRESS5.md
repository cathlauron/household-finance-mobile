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

Checkpoint table

| Checkpoint | What happens | Done when |
|---|---|---|
| PC.0 | Lock the new palette into a central theme file, mapped onto the app's real existing token names; add eco_house_logo.svg into the repo in the correct assets location; confirm the rename touches every real spot it needs to (app.json, package.json, splash, any hardcoded name strings). | New palette + logo exist as real files in the repo; nothing else built on top yet. |
| PC.1 | Onboarding carousel (3 intro slides) merged with the existing biometric/PIN setup into one continuous first-run flow. Split: PC.1a = splash + 3 slides + first-run wiring (cc6a74e, pushed, awaiting on-device check). PC.1b = drop duplicate onboarding welcome step, 2-step Quick Unlock flow (0a19088, pushed, tsc-clean). | New user sees intro -> create profile -> recovery key -> Quick Unlock -> ready -> home, restyled. |
| PC.2 | Sign-in restyle: logo, icon-prefixed fields, pill button, social row (placeholder alerts), serif centered heading. Keeps BOTH email and username fields. | DONE and confirmed on-device (see decisions below). |
| PC.2b | Create Profile restyle (currently hardcoded old hex colours) plus the recovery-key modal. | NOT STARTED. |
| PC.3 | Real Google/Apple/Facebook sign-in wired to Firebase Auth. | Sign-in with at least one real provider works on an EAS dev-client build (not testable in Expo Go). |
| PC.4 | Home screen restyle. | Matches mockup layout/spacing/colors; all existing data/widgets intact. |
| PC.5a | Avatar system: initials, preset avatars, real photo picker. Photo stored inside the ENCRYPTED household model (needs expo-image-manipulator to shrink first). | NOT STARTED. |
| PC.5 | Profile screen restyle. "Member since" derived from Firebase user.metadata.creationTime. | NOT STARTED. |
| PC.6 | Settings screen restyle. | Matches mockup; every existing settings row/toggle still works. |
| PC.7 | New Subscription screen, "Coming soon" placeholder - no real payment/paywall logic. | Reachable from Settings/Profile, matches mockup visually, clearly non-functional. |
| PC.8 | Pull-to-refresh gesture, added as one reusable component/hook, applied across relevant screens. | Swipe-down refresh works consistently everywhere it makes sense. Note: this does NOT automatically resolve Bug #14 - that still needs its own separate investigation. |

Each row is sized to be one session's worth of work, same pattern as
every other phase.

▶️ Next step
- PC.2b: Create Profile restyle including the recovery-key modal. Start with an
  Antigravity investigation-only prompt against the real current
  CreateProfileScreen.tsx (and any shared pieces it uses) before writing code.
  Keep the recovery-key flow logic untouched; restyle only.
- Then PC.3 (social sign-in, deferred for testing), PC.4 (Home), PC.5a
  (avatar system), PC.5 (Profile), PC.6 (Settings + Language/About rows),
  PC.7 (Subscription), PC.8 (pull-to-refresh).
- Bug #14 and the "fewer words" pass (next: EventsScreen.tsx) stay paused.

--- Antigravity investigation prompt for PC.0 (run this next) ---

Investigate only. Do not commit, push, or change anything - just
report back exact, unelided file contents and findings so I can review
them with Claude.

I need two things:

1. RENAMING SURFACE AREA: Search the entire repo for every place the
   app's current name appears, so it can be renamed to "Finance Flow."
   Specifically report the full real contents of:
   - app.json (or app.config.js/ts if that is used instead) - full file
   - package.json - the "name" field and anything else app-name-related
   - eas.json if it exists
   - Any splash screen component or config referencing the app name as
     text
   - Any screen that renders the app name as a visible string (search
     for the literal current app name across src/)
   - The current app icon and splash image file paths (just the paths,
     not the image content), and the path convention used for any other
     image assets already in the repo (so a new logo file lands in the
     right place)

2. CURRENT THEME/COLOR SYSTEM: Report the full real contents of
   whatever file(s) define the app's color palette (provided via a
   useTheme() hook). Show:
   - The full theme/colors definition file(s)
   - The ThemeProvider or context that supplies it
   - Whether light/dark mode switching exists today, and how
   - One example screen file's real import + usage of colors (e.g.
     const { colors } = useTheme()) so the exact consumption pattern
     is visible

Report everything as real, complete code - no "..." elisions, no
summaries. This is investigation only.

--- end of prompt ---

📚 Older progress: PROGRESS4.md (combined on-device re-test pass,
B.12b, fewer-words through 13 screens, now closed), PROGRESS3.md,
PROGRESS2.md, PROGRESS1.md, PROGRESS.md.
