Household Finance Mobile App — Progress Log (Phase D: Apple-Inspired Design Polish Pass, the H series Home redesign, and the V series visual-system pass: mint base, accessible colors, shared components)

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
🎨 NEW PHASE — Apple-Inspired Design Polish Pass
=====================================================================

Why this phase exists: the person shared a video ("What Founders Can Learn From Apple's
Design Domination") breaking down what actually makes Apple's software feel polished,
distilled into four buckets. This phase is about deciding, realistically, what's worth
adapting into a React Native/Expo app without a full rebuild, then doing it in small,
one-session-sized pieces — same pattern as every other phase in this project.

📚 Reference material (from the video, for context in future sessions)
1. Physics-based feedback — things respond like real objects (rubber-band/bounce at the
   end of a scroll, momentum, friction), so interactions feel physical instead of purely
   digital. The brain already knows physics; it doesn't have to learn a UI convention.
2. Micro-interactions / sensory feedback — small, almost-invisible cues: haptic buzzes,
   calibrated "click" feelings on things that don't physically move, subtle sounds,
   precise/buttery animations. These build trust and a sense of aliveness/reliability.
3. Mathematical consistency — literal math behind the polish: "squircles" (a smoother
   continuous curve, not a plain rounded-rectangle corner), consistent spacing, proportions
   that feel harmonious (golden-ratio-adjacent), audio and haptics calibrated as carefully
   as the visuals.
4. Reduction & systemic consistency — remove non-essential UI first, reveal complexity
   only when needed, keep key actions within roughly a "three tap" reach, use animated
   transitions (not hard screen swaps) so the user builds a mental map of where things
   live, and keep the same interaction patterns everywhere so something learned once works
   everywhere else in the app.

Important framing: this is inspiration, not a checklist to copy wholesale. A finance app
isn't a $1,000 phone's OS-level chrome — the goal is picking the highest-leverage 2-3
moments (not a full redesign) and doing them well, the same way Phase B's B.1 was an audit
before any fixes, not a blind pass through every screen.

📌 Real technical constraints to weigh honestly (not yet investigated — flag before D.1)
- react-native-reanimated is NOT installed (noted repeatedly in PROGRESS5.md's PC.9
  section) — likely needed for smooth physics-based gesture/scroll work beyond what
  PC.9's hand-built pull-to-refresh already does. This is a real dependency decision, not
  a small add.
- expo-haptics — not confirmed installed or used anywhere in the app yet. Needs checking.
- True squircle corners aren't a built-in React Native primitive — would need either a
  library, an SVG/Skia-based approach, or accepting a close visual approximation with a
  higher borderRadius + careful shadow work.
- Audio cues (button clicks, camera-shutter-style sounds) would need expo-av or similar,
  and aren't used anywhere in the app today per the file inventory in PROGRESS5.md.
- PC.9 already built a hand-rolled Android pull-to-refresh with physics-like drag-following
  behavior (PanGestureHandler + Animated) specifically WITHOUT reanimated. Any new
  gesture/animation work should look at that existing pattern first before reaching for a
  new dependency.

Checkpoint table (proposed structure, mirroring Phase B's audit-first approach)

| Checkpoint | What happens | Done when |
|---|---|---|
| D.1 | Audit pass — go through the app's actual current screens/interactions against the four buckets above (an Antigravity investigation into what libraries/patterns already exist, e.g. current animations, haptics, corner-radius usage, transition style, plus the person deciding what's realistic and worth doing), and produce a short, prioritized, written list of specific changes. | A written list exists in this file, each item roughly sized to a session. |
| D.2+ | Phased implementation of that list, one small piece per session, each with its own on-device verification before moving to the next. | Each listed item is either done and verified, or explicitly deferred with a reason. |

✅ D.1 — DONE. Audit findings (Antigravity investigation, full detail in chat transcript):
- Animation: NO react-native-reanimated anywhere. 7 existing uses of React Native's
  built-in Animated API and LayoutAnimation, all reasonably well-built already — springs/
  timings in IntroScreen, IconLabelHint, RowInteractionPreview; LayoutAnimation accordion
  expand/collapse in CollapsibleRow and AccountsScreen's stacked-card view; scale-on-swipe
  in SwipeableRow. PC.9's Android pull-to-refresh (PullToRefreshScrollView.tsx) already
  does real drag-following physics via PanGestureHandler + Animated — genuinely solid,
  reuse this pattern rather than reaching for a new dependency.
- Screen-to-screen nav: 100% default React Navigation transitions (native-stack +
  bottom-tabs), zero custom transition specs anywhere. The top-level app-state switch in
  App.tsx (Intro -> Onboarding/SignIn -> PinUnlock -> RootStack) is a hard conditional
  re-render with NO animation at all — a flat cut every time.
- Haptics: confirmed completely absent. Zero calls anywhere in src/ or App.tsx, and
  expo-haptics is not in package.json, package-lock.json, or node_modules.
- Corner radius / spacing: confirmed NO shared token file. borderRadius is hardcoded
  298 times across the codebase with arbitrary per-file values (2, 4, 6, 8, 10, 12, 14,
  16, 18, 20, 24, 29, 999, etc.); spacing (margin/padding) is the same story, no scale.
- Dependencies confirmed present: none of react-native-reanimated, expo-haptics, expo-av,
  react-native-svg, or any Skia package are installed. Full current dependency list is in
  package.json as of this session (see chat transcript for the exact block).
- Full screen inventory taken: 33 screens in mobile-app/src/screens plus 9 report
  sub-screens in mobile-app/src/screens/reports (42 total) — for reference in later
  design-pass sessions.

📌 D.1 DECISION — the actual plan for D.2 onward (agreed with Cath, do not re-litigate
without a real reason to revisit):

DOING, in this order:
- D.2 — Add expo-haptics (new, small dependency) and wire calibrated haptic feedback into
  a short curated list of moments only: swipe-to-delete (SwipeableRow), toggle switches,
  the pull-to-refresh trigger point in PullToRefreshScrollView, and primary Save/Submit
  buttons. Not a blanket sweep of every tap in the app.
- D.3 — Cross-fade the root-level screen swaps in App.tsx (Intro/Onboarding/SignIn/
  PinUnlock/RootStack), which today hard-cut with zero animation. Reuses the existing
  plain Animated API already used elsewhere in the app — no new dependency. This is the
  single most visually jarring thing found in the audit.
- D.4 — Create one small shared radii/spacing token file (new, no dependency) and retrofit
  it onto a short hand-picked list of high-visibility shared components only — AccountCard,
  BottomSheet, CollapsibleRow, and primary buttons — NOT all 298 existing borderRadius
  call sites. The token file itself should still be used for all new code going forward.

EXPLICITLY SKIPPED, with reasons (so this isn't silently re-proposed later):
- react-native-reanimated — not adopting it. What already exists (plain Animated +
  PC.9's PanGestureHandler-based pull-to-refresh) already covers the app's real physics
  needs; adding reanimated would be a real dependency/rewrite decision for no concrete win.
- True squircle corners — no RN primitive for this; would require an SVG/Skia library for
  a mostly-invisible refinement. Not worth the dependency for this app.
  (UPDATE, H.4: react-native-svg WAS later added for the Home leaf artwork. True squircles
  are still skipped.)
- Audio/click sound cues — would require adding expo-av for something that reads as
  tonally wrong in a finance app. Skipped.
- A full borderRadius/spacing migration across all 298 existing hardcoded sites — too
  large and too risky for a "polish pass"; the smaller D.4 token-file + spot-retrofit
  approach captures most of the visible benefit at a fraction of the risk.
- Overriding React Navigation's default stack/tab transitions beyond the D.3 root-level
  cross-fade — native platform defaults are the expected feel for in-app navigation; not
  worth fighting them.

✅ D.2 — DONE. Haptics fully wired across the curated D.2 scope; on-device testing still
deferred until D.4 (per the standing decision below).

Full D.2 scope, as shipped:
- expo-haptics installed; mobile-app/src/haptics.ts exports hapticSelection(),
  hapticLight(), hapticMedium(), each wrapped to no-op on Platform.OS === 'web' and to
  swallow errors on a device that doesn't support haptics.
- SwipeableRow.tsx (covers all 11 screens that use it: Accounts, Bills, Debts, Events,
  Goals, Groceries, Income, Loans, Savings, Transactions, Travel): hapticSelection() on
  the revealed view action, hapticMedium() on the revealed delete action.
- SettingsScreen.tsx's 4 track-and-thumb toggles (Biometric unlock, Push notifications,
  Weekly spending recap, Quick PIN): hapticSelection().
- PullToRefreshScrollView.tsx: hapticMedium() fires right before onRefresh() is invoked
  inside onHandlerStateChange, at the moment a pull gesture crosses PULL_TRIGGER_DISTANCE
  and commits (Android's custom hand-built gesture path only — iOS uses the native
  RefreshControl, which already has its own built-in system haptic).
  SUPERSEDED in Home round 2: pull-to-refresh was removed from every screen, so this haptic no longer exists.
- Primary Save/Submit buttons: hapticLight() wired into all of the following (settled
  decision: "+Add"-style sub-row buttons and anything that isn't the screen's own single
  confirming action were explicitly excluded, e.g. LoansScreen's "+ Add payment"):
  BillsScreen, DebtsScreen, AccountsScreen, EventsScreen (Save Event), GoalsScreen (Save
  Goal), GroceriesScreen (Save Item), IncomeScreen, LoansScreen (Save only, not Add
  Payment), SavingsScreen (Save Goal + EF calculator Save + FI calculator Save),
  TransactionsScreen, TravelScreen (Save Trip), SignInScreen, CreateProfileScreen,
  SetPinScreen, CsvImportModal (Import confirm), ProfileScreen (Approve peer recovery),
  and SettingsScreen's 3 sub-modal saves (Category, Payee, Rule).
- Toggle pills (settled decision: hapticSelection() only on genuine single-tap
  settings-style boolean flips, styled as a checkmark pill — NOT on list/multi-select
  checkboxes or text-link view switches, which stay untouched): EventsScreen ("Auto-save
  to Savings" toggle, "Completed" toggle), GoalsScreen ("Completed" toggle),
  GroceriesScreen ("Bought" toggle), TransactionsScreen ("Expecting a refund" toggle),
  TravelScreen ("Auto-saving to Savings tab" toggle), BillsScreen ("Subscription"
  checkbox).
- Explicitly left untouched, and NOT part of D.2's scope (a deliberate decision, not an
  oversight — revisit only if this specific gap is raised again later): Travel's
  checklist-item checkbox, Savings' FI-calculator account-picker multi-select checkboxes,
  Savings' "Show/Hide projected date" text link, and every "+Add" sub-row button
  throughout the app (e.g. Loans' "+ Add payment").
- Weight convention settled for this phase: hapticMedium() is reserved for rarer, heavier
  "commit" moments (delete via SwipeableRow, pull-to-refresh commit) — hapticLight() is
  used for frequently-tapped Save/Submit buttons so they don't feel heavy-handed —
  hapticSelection() is used for simple boolean toggle flips.

📌 Decision: on-device testing for this design-polish phase is being deferred until D.4
is also complete. D.2 (haptics), D.3 (root-level cross-fade), and D.4 (radii/spacing
token file) will all be tested together in one on-device pass at the end, rather than
testing after each checkpoint individually. This applies specifically to this design
phase, not to the still-paused PROGRESS5.md Quick Unlock Step 6 testing.

✅ D.3 — DONE. Root-level screen swaps in App.tsx now fade in instead of hard-cutting.

What shipped:
- mobile-app/App.tsx: added `Animated` to the existing react-native import line.
- Added `fadeAnim` (Animated.Value, starts at 1) and `isFirstRenderRef` inside
  AppContent. A useEffect keyed on `screen` resets fadeAnim to 0 and animates it to 1
  over 220ms on every screen change EXCEPT the very first render — the cold-start
  'loading' -> IntroScreen transition still shows instantly with no fade, matching how
  IntroScreen already runs its own internal splash animation.
- The existing waterfall of 8 `if (screen === ...) return ...;` blocks was left
  completely untouched internally — it was wrapped as-is inside a new nested
  `renderScreen()` function, and AppContent's real return is now a single
  `<Animated.View style={{ flex: 1, backgroundColor: colors.navy2, opacity: fadeAnim }}>`
  wrapping `renderScreen()`.
- 📌 Decision (from Antigravity's investigation): this is a FADE-IN of the incoming
  screen, not a true two-layer cross-fade. A true cross-fade would need the outgoing
  screen to stay mounted while fading out — but screens like 'home' have
  currentUsername/derivedKey set to null immediately on sign-out/lock, so keeping that
  screen mounted underneath an overlay risked it rendering with null user data. A
  single fade-in of the new screen, on a shared solid background color, was the
  architecturally safe choice instead.
- npx tsc --noEmit confirmed clean (0 errors) after the change.
- SUPERSEDED in V.2b: the fadeAnim / isFirstRenderRef / useLayoutEffect mechanism described
  above caused a one-frame flash (new screen shown at opacity 1, then snapped to 0). It was
  replaced by a ScreenFade component keyed on `screen` that starts at opacity 0 from its
  first frame. The behaviour (220ms fade-in, instant cold-start splash) is the same. See
  the "Sign-in flicker fix" entry in the V series.
- Not yet tested on a real device (deferred to the batched D.2+D.3+D.4 test pass, per
  the standing decision below) — a quick optional gut-check was suggested (sign in,
  trigger a lock/switch, confirm the fade shows and the splash still appears instantly
  with no flash) but not required before moving on.

📌 Decision: on-device testing for this design-polish phase is being deferred until D.4
is also complete. D.2 (haptics), D.3 (root-level cross-fade), and D.4 (radii/spacing
token file) will all be tested together in one on-device pass at the end, rather than
testing after each checkpoint individually. This applies specifically to this design
phase, not to the still-paused PROGRESS5.md Quick Unlock Step 6 testing.

✅ D.4 — DONE. Shared radii/spacing token file created.

What shipped:
- New file mobile-app/src/tokens.ts — exports `radii` and `spacing`, each a plain `as
  const` object keyed by the actual pixel value (e.g. `radii[10]`, `spacing[16]`), plus
  one named exception: `radii.pill` (999) for fully-rounded pill/capsule shapes.
- 📌 Decision: these values were NOT invented — they were reverse-engineered from a real
  audit (via Antigravity investigation) of BillsScreen.tsx, SettingsScreen.tsx,
  SwipeableRow.tsx, and PullToRefreshScrollView.tsx's existing StyleSheet.create(...)
  blocks. The audit found the app already uses a naturally consistent small set of radii
  (4, 6, 8, 10, 12, 14, plus 999 for pills) and a roughly 4px-based spacing scale (2, 4,
  6, 8, 10, 12, 14, 16, 20, 24, 40) — no scattered/arbitrary magic numbers were found. So
  D.4 codifies what's already in use rather than introducing a new opinionated scale.
- 📌 Decision: kept as a separate plain constants file (mobile-app/src/tokens.ts), NOT
  folded into theme.ts or ThemeContext. Reasoning: colors need to be React Context
  because they're dynamic at runtime (light/dark mode, live OS appearance changes) —
  radii/spacing are static and never change at runtime, so routing them through a hook
  would add unnecessary re-render overhead for no benefit.
- 📌 Decision: tokens are keyed by their own pixel value (e.g. `spacing[16]`) rather than
  semantic names like xs/sm/md/lg, specifically to avoid having to bikeshed which name a
  value like 14 belongs under when it doesn't map cleanly onto a 4-step naming scale.
- 📌 Decision (scope): this checkpoint ONLY creates the token file — it does NOT migrate
  any existing screen/component to use it. Retrofitting the ~9+ files that currently
  hardcode these numbers is separate, larger follow-up work, deliberately not bundled
  into D.4, so as not to risk a visual regression across many screens in one pass.
- npx tsc --noEmit confirmed clean (0 errors) — expected, since nothing yet imports this
  new file.

✅ D.2 + D.3 + D.4 are now ALL complete. Per the standing decision below, the on-device
test pass that was being held until D.4 finished is now due.

📌 Decision: on-device testing for this design-polish phase was deferred until D.2, D.3,
and D.4 were all complete, so they could be verified together in one pass rather than
after each checkpoint. That condition was met, and the combined test pass below is now
DONE.

✅ D.2 + D.3 + D.4 on-device test pass — DONE, all confirmed working.

What happened: initial on-device retest showed no haptic feedback and no visible
fade-in at all, despite the code (haptics.ts logging wrapper, the VIBRATE permission in
app.json, and App.tsx's useLayoutEffect swap) all being confirmed present and correct via
file inspection. No `[haptics] ... failed` warnings appeared in the Metro log either,
which — combined with Metro reliably picking up other same-session edits (confirmed via
an unrelated `<Text>` string-wrapping fix landing correctly) — pointed away from a code
bug and toward a stale bundle/cache.

📌 Root cause confirmed: a stale Metro bundle/cache, not a code issue. Running
`npx expo start -c` (clears the bundler cache) followed by a full close (swipe away from
recent apps, not just backgrounding) and fresh reopen of Expo Go resolved it completely —
haptics are now felt on a real device.

📌 Decision / lesson for future sessions: after any change to native-feedback code
(haptics, permissions, anything touching a native module) or to root-level
App.tsx render logic, do a full `npx expo start -c` + fully-closed-and-reopened Expo Go
retest before concluding a fix didn't work — a stale bundle can silently mask a correct
fix and look identical to a real bug (no errors, no warnings, just nothing visibly
happening).

- D.2 (haptics) confirmed on-device: swipe-to-reveal view/delete actions on multiple
  screens, Settings toggles, pull-to-refresh commit, primary Save buttons, and
  checkmark-pill toggles all produce the expected haptic feedback (light for
  Save/Submit and toggles, medium for delete/pull-to-refresh commit).
- D.3 (root-level fade-in) confirmed on-device: cold launch still shows the splash
  instantly with no fade flash; sign-in and lock/account-switch transitions now visibly
  fade rather than hard-cutting.
- D.4 (token file) confirmed the app still builds/runs fine on a real device with
  tokens.ts present (expected, since nothing yet imports it — no visual regression).

Design-polish phase D.1 through D.4 are now fully complete and verified, including
on-device confirmation.

✅ D.5 — DONE. Retrofitted the D.4 radii/spacing tokens onto the three shared
high-visibility components flagged in D.4's own "next step" notes: AccountCard,
BottomSheet, CollapsibleRow. Primary buttons turned out to be a much bigger job (no
shared button component exists — the same style block is copy-pasted across 16 separate
files) and were split out into their own checkpoint, D.5b, below.

What shipped, per an Antigravity investigation (full, unelided current file contents +
a value-by-value mapping against tokens.ts's existing radii/spacing keys, flagging
anything that didn't cleanly match):

- mobile-app/src/tokens.ts: added two new keys to `radii` — `16: 16` and `20: 20` —
  rather than forcing AccountCard's card corner (16) and BottomSheet's sheet corner (20)
  down to the nearest existing key (14) and changing how they actually look. 📌 Decision:
  same "codify what's already really in use" principle D.4 was built on originally — the
  first D.4 audit simply hadn't looked at these three files yet.
- AccountCard.tsx: new `import { radii, spacing } from '../tokens';` line; `card`'s
  `borderRadius: 16` -> `radii[16]`, `padding: 16` -> `spacing[16]`,
  `marginBottom: 12` -> `spacing[12]`; `topRightIcons`'s `gap: 8` -> `spacing[8]`;
  `editHintBadge`'s `borderRadius: 6` -> `radii[6]`; `topRow`'s `marginBottom: 12` ->
  `spacing[12]`; `badge`'s `paddingHorizontal: 8` -> `spacing[8]` and
  `borderRadius: 6` -> `radii[6]`; `nameWrap`'s `marginBottom: 14` -> `spacing[14]`;
  `balanceLabel`'s `marginBottom: 2` -> `spacing[2]`.
- BottomSheet.tsx: new `import { radii, spacing } from '../tokens';` line; `sheet`'s
  `borderTopLeftRadius`/`borderTopRightRadius: 20` -> `radii[20]`; `handleWrap`'s
  `paddingTop: 10` -> `spacing[10]` and `paddingBottom: 6` -> `spacing[6]`; `header`'s
  `paddingHorizontal: 20` -> `spacing[20]`, `paddingTop: 4` -> `spacing[4]`,
  `paddingBottom: 12` -> `spacing[12]`; `scrollContent`'s `paddingHorizontal: 20` ->
  `spacing[20]` and its iOS/Android conditional `paddingBottom: 12`/`20` ->
  `spacing[12]`/`spacing[20]`.
- CollapsibleRow.tsx: new `import { radii, spacing } from '../tokens';` line;
  `container`'s `borderRadius: 10` -> `radii[10]` and `marginBottom: 8` -> `spacing[8]`;
  `headerRow`'s `paddingVertical: 12` -> `spacing[12]` and `paddingHorizontal: 14` ->
  `spacing[14]`; `contentWrap`'s `marginRight: 8` -> `spacing[8]`; `chevronWrap`'s
  `paddingLeft: 4` -> `spacing[4]`; `drawerDivider`'s `marginHorizontal: 14` ->
  `spacing[14]`; `drawerContent`'s `paddingHorizontal: 14` -> `spacing[14]`,
  `paddingTop: 12` -> `spacing[12]`, `paddingBottom: 14` -> `spacing[14]`; `editButton`'s
  `borderRadius: 8` -> `radii[8]`, `paddingHorizontal: 14` -> `spacing[14]`,
  `marginTop: 12` -> `spacing[12]`; `editIcon`'s `marginRight: 6` -> `spacing[6]`.
- 📌 Decision: a handful of odd small values found during the investigation were
  deliberately left as literal numbers, untouched — AccountCard's
  `paddingHorizontal: 7` and its three `paddingVertical: 3` / `marginRight: 3` spots, and
  CollapsibleRow's `editButton` `paddingVertical: 9`, plus BottomSheet's drag-handle
  `borderRadius: 2`. None of these cleanly matched an existing or newly-added token, and
  forcing them onto one would have meant either inventing an oddly-specific new token key
  for a single use, or slightly changing the actual rendered spacing — consistent with
  D.4's original judgment call not to force-fit every number onto a token.
- npx tsc --noEmit confirmed clean after pasting.
- Visual no-op expected (values map to what was already rendering) — not yet re-checked
  on-device.

✅ D.5b — DONE. Retrofitted the D.4 radii/spacing tokens onto every primary Save/Submit
button in the app — the larger, separately-scoped piece split out of D.5 above, since it
touches 16 files rather than 3 shared components.

What shipped, per a two-pass Antigravity investigation (first pass gathered sample style
blocks; a second, more targeted pass confirmed exact unelided imports/style blocks/usage
scope for all 16 files before any code was written, since the first pass didn't fully
spell out SignInScreen.tsx's two separate button styles):

- 12 feature screens using a shared `saveButton` style key — AccountsScreen, BillsScreen,
  DebtsScreen, EventsScreen, GoalsScreen, GroceriesScreen, IncomeScreen, LoansScreen,
  SavingsScreen, SettingsScreen, TransactionsScreen, TravelScreen. Each got one new
  `import { radii, spacing } from '../tokens';` line and its `saveButton` block's
  `borderRadius: 999` -> `radii.pill`, `paddingVertical: 12` -> `spacing[12]`,
  `marginBottom: 10` -> `spacing[10]`.
- 4 auth/onboarding screens using a `primaryBtn` style key — CreateProfileScreen,
  AccountSwitcherScreen, SetPinScreen, and SignInScreen.tsx (which turned out to have TWO
  separate `primaryBtn` blocks: a static non-theme one for the account-recovery modal,
  and a theme-aware one for the main Sign In button — both were confirmed and updated).
  Same token substitution pattern (`radii.pill` or `radii[8]`, `spacing[N]`) applied to
  each.
- 📌 Decision: SettingsScreen.tsx's separate `primaryFullButton` style (used only by the
  "Change password" button) was deliberately left untouched — it was never part of this
  checkpoint's scope, and no assumption was made that it should be included.
- 📌 Decision (from the investigation step): every file was confirmed to use its
  save/submit style key for ONLY that screen's primary confirm action — no shared style
  block was found to be secretly reused by an unrelated secondary/cancel button, so no
  button's styling changed other than the intended Save/Submit ones.
- npx tsc --noEmit confirmed clean after pasting all 16 files' changes.
- Not yet re-tested on a real device.

✅ D.6 — IN PROGRESS (onboarding layout fixes + intro slides for new accounts). Found
during a fresh test-account run on a real Android phone. Nothing here is committed yet
unless the person says so.

Findings, from Antigravity investigations (real code viewed, not summaries):
- IntroSlidesScreen (3 slides) only ever showed when the device had ZERO saved profiles at
  launch (App.tsx: `if (!profiles.length) setScreen('intro')`, no persisted "seen" flag).
  So new test accounts on a phone that already had profiles never saw it. That was
  expected behavior, not a bug.
- Slides overlapped and bled off-screen: the illustration <Image> used width:'100%' +
  aspectRatio 900/800 with no bounded height inside a horizontal paging ScrollView.
- OnboardingScreen ("Set up Quick Unlock" STEP 1 OF 2, "You're all set!" STEP 2 OF 2)
  had no safe-area handling: headerRow paddingTop was a flat 16, and App.tsx's
  SafeAreaView is imported from 'react-native', which does NOTHING on Android. Other
  screens only looked fine because of hardcoded paddingTop of 40-80 (Sign In 48, Create
  Profile 40, PinUnlock 80, Account Switcher 48) or a real useSafeAreaInsets() (Home).
- "Quick PIN enabled" pill rendered twice on the "You're all set!" screen (one orphan
  block above the badge row, one inside it).

Fixes applied in code (paste-by-hand, tsc clean unless noted):
- IntroSlidesScreen.tsx: added `height` from useWindowDimensions(); wrapped the image in
  an `illustrationWrap` View with explicit height (height * 0.3); image is now
  width/height 100% inside it. Confirmed on-device: illustration stays on-screen and no
  longer touches the headline.
- OnboardingScreen.tsx: imported useSafeAreaInsets, added `const insets =
  useSafeAreaInsets();`, headerRow now `[styles.headerRow, { paddingTop: 16 +
  insets.top }]`; removed the orphan duplicate "Quick PIN enabled" block.
- App.tsx: the useSafeAreaInsets() call initially crashed with "No safe area value
  available" (no SafeAreaProvider existed above OnboardingScreen; React Navigation only
  provides one deeper in the tree). Fixed by importing SafeAreaProvider from
  'react-native-safe-area-context' and wrapping the root `App` component's tree in it.
  Crash confirmed gone on-device.
- 📌 Decision: intro slides now show BEFORE Create Profile for every new-account path,
  not just first launch. Sign In's "Create a new account" now sets `introFromSignIn` and
  goes to 'intro'; the intro's onDone still goes to 'createProfile'. IntroSlidesScreen got
  an optional `onBack` prop (Back link, top-left), passed only when opened from Sign In,
  so true first launch (nothing to go back to) shows no Back. topRow style changed to
  flexDirection:'row', justifyContent:'space-between'. Confirmed on-device: slides appear
  with Back/Skip and the illustration fits.
- Screen-flow facts learned: account creation is a top-level state switch in App.tsx
  (createProfile -> onboarding -> home), not React Navigation. OnboardingScreen renders
  BOTH the Quick Unlock step (step 2) and the "all set" step (step 3).

⚠️ OPEN (found on-device this session):
- Intro slides' "Skip" (and "Back") still collide with the Android status bar/battery
  icon. IntroSlidesScreen has no safe-area handling of its own and sits under App.tsx's
  Android-inert SafeAreaView. Planned fix: same useSafeAreaInsets() pattern as
  OnboardingScreen, adding insets.top to the topRow padding/height.
- NOT yet explicitly confirmed on-device after the fixes: OnboardingScreen's
  "STEP 1 OF 2"/"Skip" clearing the status bar, and "Quick PIN enabled" showing once.
- Deprecation warning in Metro: 'react-native' SafeAreaView is deprecated; every
  SafeAreaView import in App.tsx should eventually come from
  'react-native-safe-area-context'. Deliberately NOT bundled into this fix (separate
  checkpoint, low priority).

=====================================================================
🏡 H SERIES: Home Screen Redesign (H.1 to H.5), DONE and device-tested in Expo Go
=====================================================================

Why: a mockup-driven redesign of Home (Finance Flow look: quieter dashboard, tappable
cards, faint leaf artwork). Worked as Antigravity investigates (read-only), Claude reviews,
Cath pastes by hand. Every checkpoint compiled clean (npx tsc --noEmit, 0 errors). The
whole series was then device-tested in Expo Go and everything behaved as described.

✅ H.1: Date pill moved from the Home header into the Left to Spend card (top right,
chevron-forward, still opens Calendar, keeps testID home-calendar-shortcut). The wallet
bubble in that card was removed and the amount enlarged (26 to 32). The Total Balance
card was removed from DashboardScreen (HomeScreen still reads totalLiquidBalance() for
the "left of X" line; Accounts, Calendar and notifications never depended on that card).
The "Hi, testt..." greeting truncation is fixed: the old 3-slot flex header
(1 / 1.4 / 1) left the greeting ~39pt, so headerCenter was deleted and headerLeft/
headerRight are now content-sized.

✅ H.2: Dashboard quieted. This Month numbers were neutral here (statValue 14/600 in
colors.ink; the small green/red arrows the only colour cue). SUPERSEDED: the mint-restyle
checkpoint 3 (see below) made Income/Expenses/Net coloured again on purpose. Amount Owed, Due Next 14
Days and Savings Goals icons are now smaller (16), colors.inkDim, and moved to the left
using a new iconBubbleQuiet style. Amount Owed's amount was neutral, size 22 (now orange, see the mint-restyle section).

✅ H.3: Tappable Home cards.
- This Month opens the Transactions tab.
- Amount Owed opens To-Pay; tapping the "Bills", "Debts" or "Loans" text inside it opens
  that sub-tab.
- Due Next 14 Days opens a BottomSheet listing ALL due items; each row opens that bill,
  debt or loan. The card itself shows the first 5 plus a "+N more" line.
- Savings Goals opens Savings. Watched Categories was not tappable here; SUPERSEDED by Home round 2 (rows open Transactions filtered to that category).
- Plumbing: new src/openToPayTabRequest.ts (requestToPayTab, subscribeToToPayTabRequest,
  consumePendingToPayTab; holds a "pending" tab if ToPayScreen has not mounted yet).
  ToPayScreen subscribes and clears any stale open-bill/debt/loan request when the
  sub-tab is switched this way. CalendarEvent (balanceProjection.ts) got an optional
  id, set for bill, debt and loan events. DashboardScreen's DueItem got id, and
  getUpcomingDue no longer slices to 5 (the card slices, the sheet shows all).

✅ H.4: react-native-svg 15.12.1 installed (npx expo install). New
src/components/LeafBackground.tsx draws four faint leaves (opacity 0.07, brand green
colors.gold) behind Home, built from the logo's own leaf paths in
assets/eco_house_logo.svg (the left leaf was an open curve and was closed with Z so it
can be filled). It is exported as RIGHT_LEAF, LEFT_LEAF and LEAF_VIEWBOX (cropped
'420 480 200 210'). It is click-through. DashboardScreen's scroll container style is now
backgroundColor 'transparent' so the leaves show through. SUPERSEDED: LeafBackground is
now rendered ONCE in App.tsx behind the whole navigator, no longer inside HomeScreen (see
the mint-restyle section, checkpoint 4).

✅ H.5: Leaf transition on navigation. New src/leafTransition.ts (transient signal:
triggerLeafTransition / subscribeToLeafTransition) and
src/components/LeafTransitionOverlay.tsx (plain Animated, useNativeDriver true, ~750ms,
peak opacity 0.25, four leaves drift up and right and fade out, click-through). App.tsx:
NavigationContainer now has onReady={handleNavReady} and
onStateChange={handleNavStateChange}; those compare navigationRef.getCurrentRoute()?.name
against lastRouteNameRef and fire the transition only when the route name changes (so
bottom sheets and modals do not trigger it). The overlay renders right after the
NavigationContainer, inside the home block. Respects the phone's reduce-motion setting
via AccessibilityInfo (the app has no reduce-motion setting of its own).

📌 H-series decisions
- Leaves are SVG from the logo's own paths, not a PNG and not Ionicons leaf icons.
- react-native-svg was added for this. react-native-reanimated is still NOT used; plain
  Animated only (consistent with the D.1 decision).
- The leaf transition is an overlay in App.tsx above NavigationContainer, because every
  screen paints an opaque navy2 background, so anything behind the navigation tree would
  be hidden.
- Amount Owed has two tap behaviours: card tap goes to To-Pay; the three labels go to
  their own sub-tabs. Antigravity's suggested workaround of calling requestOpenDebt('') to
  switch sub-tabs was NOT used (built a proper tab-request signal instead).
- Watched Categories deliberately not tappable. SUPERSEDED in Home round 2.

⚠️ H-series known issues / gotchas
- react-native-svg is a native module. The already-installed EAS build does NOT contain
  it, so Home would crash on that install. A NEW EAS build is required before the H series
  reaches a real installed app. Expo Go works.
- This Month opens Transactions showing ALL time. TransactionsScreen has no month filter
  or route params, so a real current-month filter is a separate future item.
- Leaves only show around cards, in gaps and at edges, since the cards are solid. Tuning
  values: LeafBackground.tsx (o = 0.07, sizes, positions) and LeafTransitionOverlay.tsx
  (PEAK_OPACITY 0.25, DURATION_MS 750). Dark mode's brighter green may want lower opacity.
- App.tsx: the two leaf imports (LeafTransitionOverlay, triggerLeafTransition) were placed
  just above function AppContent(), which is valid but untidy; could be moved into the
  top import block later.
- A tab that keeps a nested screen open might not report a new route name, so it could
  skip the leaf transition (not observed in testing).
- Superseded notes: the "Leaves only show around cards" tuning note and the "Amount Owed
  neutral" / "This Month neutral" statements above describe H.1-H.5 as shipped. The later
  mint-restyle changed the page background, card colours, section colours and where the
  leaves are rendered; see the mint-restyle section.
  
📁 H-series files
- New: src/openToPayTabRequest.ts, src/leafTransition.ts,
  src/components/LeafBackground.tsx, src/components/LeafTransitionOverlay.tsx
- Edited: src/screens/HomeScreen.tsx, src/screens/DashboardScreen.tsx,
  src/screens/ToPayScreen.tsx, src/balanceProjection.ts, App.tsx, package.json
  (react-native-svg)
- Not yet committed unless the git commands from the session-wrap were run.

=====================================================================
📅 D.7: Calendar opens as a bottom sheet
=====================================================================

✅ D.7 — DONE on Android. Calendar now slides up as a rounded bottom sheet over Home
(instead of a full-screen push with a "< Home" header), styled after the iPhone
Calendar app's "New Event" sheet. Confirmed on a real Android phone: Calendar opens and
closes correctly and nothing else broke. The iPhone look could NOT be tested (Cath only
has an Android phone).

Findings (Antigravity investigation, real code viewed):
- Only one place opens Calendar: the Home date pill (testID home-calendar-shortcut). No
  Maestro flow touches Calendar.
- Installed: react-native-screens 4.16.0, @react-navigation/native-stack 7.18.9,
  @react-navigation/native 7.3.17. In this version presentation: 'formSheet' uses a real
  Material BottomSheetBehavior on Android (swipe-down + dimmed background). The older
  JSDoc in native-stack that says it falls back to "modal" on Android is outdated.
- 'transparentModal' was rejected: no swipe-down on Android and no gesture on iOS, so it
  would have needed hand-built close handling.
- The "Home shrinks back and peeks out above the sheet" effect in the reference
  screenshot is iPhone-only (native 'modal' presentation). Android has no equivalent, so
  Android shows a plain sheet over a dimmed Home.

What shipped:
- RootStack.tsx: new first line `import { Platform } from 'react-native';`. The Calendar
  Stack.Screen options are now presentation: Platform.OS === 'ios' ? 'modal' :
  'formSheet', headerShown: false, sheetAllowedDetents: [0.94], sheetCornerRadius: 20,
  sheetGrabberVisible: true (grabber is iOS-only; ignored on Android).
- CalendarScreen.tsx: added `import { useNavigation } from '@react-navigation/native';`
  and `const navigation = useNavigation();`. Added a sheet header at the top of the
  screen (empty left slot, "Calendar" title centred, "Done" on the right, which calls
  navigation.goBack()). New styles: sheetHeader, sheetHeaderSide, sheetTitle, sheetDone.
- App.tsx handleNavStateChange: the leaf transition is now skipped whenever the route
  being left or entered is 'Calendar' (prevName / involvesSheet check), since the leaf
  would otherwise drift over both Home and the sheet.
- npx tsc --noEmit confirmed clean after fixing the paste errors below.

📌 D.7 decisions
- Chose Option B: iPhone uses the native 'modal' look (like the reference screenshot),
  Android keeps 'formSheet'. Option A (formSheet on both) was the safer alternative.
- Did NOT build a custom "Home shrinks back" animation for Android.
- Calendar's own day-tap popup stays a React Native <Modal>, untouched.

⚠️ D.7 known issues / gotchas
- The iPhone 'modal' look is UNTESTED. Check it the first time an iPhone or iOS build
  is available.
- Cath reported "it still works, nothing broke" on Android. The specific checks from
  the test list (day popup opening and closing without closing the sheet, auto-lock or
  back gesture while the sheet is open) were not itemised individually. A native
  <Modal> opening inside a native sheet can misbehave. If it does, the planned fix is to
  turn the day popup into an in-screen overlay instead of a <Modal>.
- Lesson: the first paste attempt left duplicate lines (a second Ionicons import,
  duplicate `const { model }` and `const today` lines) and overwrote the loadingContainer
  style, giving 7 tsc errors. Fixed by removing the duplicates and restoring
  loadingContainer. When a snippet says "add after X", check the file for what is
  already there before pasting.
- Home's date pill still has the same tap target; only Calendar's presentation changed.

📁 D.7 files edited
- mobile-app/src/navigation/RootStack.tsx
- mobile-app/src/screens/CalendarScreen.tsx
- mobile-app/App.tsx

=====================================================================
📅 Calendar: View Modes menu + Swipe/Scroll month navigation (new work this session)
=====================================================================

✅ View modes menu — DONE, confirmed on-device, pushed. New iOS-Calendar-style menu
button in the Calendar header opens a popup (checkmark on the active choice) with four
view choices — Compact (existing dots), Stacked (thin colored bars per event, using the
same EVENT_DOT_COLORS as the dots/popup), Details (small labeled event pills, up to 2 per
day plus "+N more") — divider — List (a slim grid with the selected day's items listed in
a panel underneath, no popup) — divider — and two navigation choices, Swipe and Scroll
(see below). New file mobile-app/src/calendarSettings.ts (AsyncStorage-backed
getCalendarViewMode/setCalendarViewMode/getCalendarNavMode/setCalendarNavMode, mirroring
the existing autoLock.ts pattern) persists both choices between app launches.

✅ List mode's preview panel — DONE, confirmed on-device ("does not feel cramped"),
pushed. Tapping a day in List mode updates a panel under the grid (date, projected
balance, scrollable event list) instead of opening the popup; the tapped day gets a
faint ring. Compact/Stacked/Details still open the existing popup. One early bug (the
Total Balance banner was accidentally hidden in List mode) was found and fixed — the
banner now shows in all four view modes.

✅ MonthView extraction + day-taps-remember-their-own-month — DONE, confirmed on-device
together, pushed. The month grid was pulled out of CalendarScreen into its own
`MonthView` component (memoized per model/year/month) purely so Swipe/Scroll could reuse
it for many months at once — no visible change. Then `selectedDate` and `previewDate`
were changed from a bare day number to `{ year, month, day }`, so the popup and the List
preview always show the tapped day's own month rather than whatever month the header
happens to be on. (Minor, intended side effect: in List mode, leaving a month and coming
back no longer remembers which day was tapped — it resets to today/the 1st.)

✅ Swipe navigation — DONE, confirmed on-device ("device test went as described"),
pushed. A horizontal, paging FlatList of 49 months (24 before/after today,
`PAGES_EACH_SIDE = 24`) renders one `MonthView` per page. Swiping snaps one month at a
time and updates the header/chevrons via `onMomentumScrollEnd`; the chevrons and Today
button call `scrollToIndex` on the same list via a `pageIndex`-keyed `useEffect`, so
tapping them slides the page rather than just changing a label.
⚠️ Known limit (not yet fixed): past 24 months either side of today, the chevrons would
change the month title but the swipe list has no further page to show — flagged as
optional to fix if it comes up.

🔧 Scroll navigation — CODE APPLIED, HIT A CRASH ON FIRST DEVICE TEST, FIX GIVEN BUT NOT
YET RE-TESTED, NOT YET COMMITTED/PUSHED. Scroll mode was built as a vertical FlatList of
the same 49-month page list, each item showing its own "Month YYYY" label above a
`MonthView`; `onViewableItemsChanged` (50% visibility threshold) updates the header/
chevrons as the list scrolls; the chevrons and Today call `scrollToIndex` the same way
Swipe does, guarded by a `skipNextScrollSync` ref so a scroll-driven month change doesn't
immediately re-trigger its own scroll-to-index. No `getItemLayout` is set (a 4-week
month, a 6-week month, Details mode and List mode are all different heights, so item
height can't be predicted up front) — `onScrollToIndexFailed` retries the jump after a
short delay instead.

⚠️ Crash found on first on-device test of Scroll: switching the menu to "Scroll months"
threw `Invariant Violation: Changing onViewableItemsChanged nullability on the fly is
not supported`, with a Render Error overlay and a matching FlatList/invariant stack in
the Metro log (screenshot + full log reviewed). Root cause: the Swipe FlatList and the
Scroll FlatList sit in the same spot in a ternary with no `key` prop on either, so React
treated switching between them as updating one list in place rather than unmounting one
and mounting the other — and the vertical list's `onViewableItemsChanged` prop then
appeared "out of nowhere" on what React still thought was the same list instance, which
FlatList disallows changing after the fact.

📌 Fix given (paste provided, NOT yet confirmed applied/tested/pushed): add
`key="swipe-list"` to the Swipe FlatList and `key="scroll-list"` to the Scroll FlatList,
so React unmounts/remounts cleanly when the nav mode is switched. Also flagged: after
pasting, do a full reload (shake → Reload) rather than just editing in place, since the
crash's error screen can leave stale JS state behind.

📌 Calendar decisions
- Stacked mode reuses the exact same `EVENT_DOT_COLORS` palette already used for the
  Compact dots and the popup's event dots — no separate color set was introduced.
- Swipe and Scroll share one `MonthView` component and one 49-month page list
  (`buildMonthPages()`), rather than each mode having its own month-rendering logic.
- Per-month `computeMonthEvents`/`computeRunningBalances` are memoized inside `MonthView`
  itself (keyed on `model`, `year`, `month`), per an Antigravity investigation finding
  that `computeRunningBalances` walks every month between the accounts' "as of" date and
  the target month — memoizing was flagged as necessary once several months can be on
  screen at once (Swipe/Scroll), not optional polish.
- No new dependency was added for Swipe/Scroll — both use React Native's built-in
  `FlatList` (horizontal paging for Swipe, vertical for Scroll), consistent with the
  project's existing no-reanimated stance from the D.1 design-audit decision.

📁 Calendar files
- New: mobile-app/src/calendarSettings.ts
- Edited: mobile-app/src/screens/CalendarScreen.tsx (imports; new `MonthView` component;
  `viewMode`/`navMode`/`menuOpen` state loaded from calendarSettings.ts; `selectedDate`/
  `previewDate` as `{year,month,day}`; the view-mode menu popup; Stacked/Details/List
  cell rendering; the Swipe and Scroll FlatLists, both now needing their `key` props
  confirmed working)

=====================================================================
📅 Full on-device test pass — ALL PASSED (Android)
=====================================================================

✅ One combined on-device test pass covered everything below, and everything passed:
- Calendar Scroll mode: the `key="swipe-list"` / `key="scroll-list"` fix resolved the
  "Changing onViewableItemsChanged nullability" crash. Header/chevrons follow scroll, Today
  works, day taps open their own month's popup, List mode works inside Scroll, and
  switching back to Swipe is unaffected. View/nav choices persist after a full close.
- D.7 Calendar bottom sheet: opens/closes via Done and swipe-down; day popup inside the
  sheet works; no leaf animation on open/close.
- D.6 onboarding: intro slides show before Create Profile with Back/Skip; illustration
  fits; Skip/Back status-bar collision is FIXED and confirmed; OnboardingScreen header
  clears the status bar; "Quick PIN enabled" pill shows once.
- H.1–H.5 Home redesign: all tappable cards, sheets, leaves, and leaf transition behave.
- D.5 / D.5b token retrofit: corners/spacing look unchanged (visual no-op confirmed).
- Regression: haptics, root fade, and instant cold-start splash all still work.
⚠️ Still untested: iPhone 'modal' look for Calendar (no iPhone available).
⚠️ Still required: a NEW EAS build before the H series works in an installed app
  (react-native-svg is a native module).

=====================================================================
🎨 Shared mint background + white cards + filled tab icons (checkpoints 1-6, plus card/Calendar colour)
=====================================================================

Why: Cath supplied a mockup image as a colour/background reference ONLY for what already
exists. Explicitly NOT brought back: the Total Balance card, the wallet bubble in Left to
Spend, and the header date pill (the date pill stays inside the Left to Spend card).
Worked as Antigravity investigates (read-only), Claude reviews, Cath pastes by hand. No
new dependency and NO new EAS build (react-native-svg was already installed for H.4).

✅ Checkpoint 1: bottom tab bar. New TabIcon helper in MainTabs.tsx (added
`import { View } from 'react-native';`). Active tab shows the filled Ionicons variant
(home, receipt, swap-horizontal, ellipsis-horizontal), brand green label and a small
underline; inactive tabs are the outline icons in muted gray. The underline slot is
ALWAYS reserved (transparent when inactive) so icons do not jump when switching tabs.
tabBarLabelStyle is now { fontSize: 9.5, fontWeight: '600' }. Confirmed on-device.

✅ Checkpoint 2: theme tokens + page gradient. theme.ts: new ThemeColors keys added to
the type and to both palettes: indigo, indigoBg, cardTealStart, cardTealEnd,
cardTealText, cardTealTextDim, mintAccent, pageGradStart, pageGradEnd, peachCard,
peachBubble. Light values: pageGradStart #EAF5EE to pageGradEnd #FFFFFF, teal card
#134E48 to #082F2C, indigo #4F46E5 / #EEF2FF, peach #FFF6ED / #FFEDD5. Dark values: page
#0E1B15 to #161412, teal #164E44 to #0D332D, indigo #818CF8 / #1E1B4B, peach #281D17 /
#3E271B. LeafBackground.tsx now draws an SVG LinearGradient (id "pageBgGrad") behind the
four leaves. Confirmed on-device in light and dark mode.

✅ Checkpoint 3: Left to Spend card + Dashboard section colours.
- HomeScreen.tsx: card is a teal gradient with white text, mint progress bar and a
  translucent date pill (still inside the card, still opens Calendar).
- DashboardScreen.tsx: This Month Income = colors.ok, Expenses = colors.error, Net =
  ok/error by sign (this REVERSES H.2's neutral numbers on purpose). Amount Owed = peach
  card, peach icon bubble, orange amount. Due Next 14 Days = indigo icon bubble and
  indigo date pills (listDateBadge). Savings Goals and Watched Categories = light green
  icon bubble (Watched Categories gained an icon row using pricetag-outline).

✅ Left to Spend cropping fix: the first SVG approach measured itself before the card's
content laid out, so the teal stopped short of the right edge, the date pill ran off it
and the footer line sat on the pale background. Fixed with a NEW component,
mobile-app/src/components/CardGradient.tsx, which reads its real size from onLayout and
draws the gradient at exactly that size, plus a solid backgroundColor: colors.cardTealStart
on the card as a safety net (with overflow: 'hidden'). Confirmed working. A later
screenshot showed the card cropped again, but that was already fixed in earlier sessions;
the Antigravity investigation prompt for it was NOT run and is no longer needed.

✅ Checkpoint 4: ONE shared background behind the whole app.
- App.tsx: imports DefaultTheme and LeafBackground. In the authenticated `home` block,
  <LeafBackground /> renders ONCE just inside the outer View, before NavigationContainer,
  and NavigationContainer got theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors,
  background: 'transparent' } }}. The outer View deliberately KEEPS backgroundColor:
  colors.navy2 as a safety net under the gradient.
- RootStack.tsx: screenOptions gained contentStyle: { backgroundColor: 'transparent' }.
- MainTabs.tsx: screenOptions gained sceneStyle: { backgroundColor: 'transparent' }.
- HomeScreen.tsx: its own <LeafBackground /> and import were removed; root View is
  transparent.
- container style set to transparent in ToPayScreen, TransactionsScreen, MoreScreen.
Confirmed on-device.

✅ Checkpoint 5: container style set to backgroundColor: 'transparent' in ProfileScreen,
AccountsScreen, IncomeScreen, SavingsScreen, PlanningScreen, SettingsScreen,
PremiumScreen, BillsScreen, DebtsScreen, LoansScreen, EventsScreen, GoalsScreen,
GroceriesScreen, TravelScreen. Confirmed on-device.

✅ Checkpoint 6: container style set to transparent (it was navy1, not navy2) in
InsightsScreen, ReportsScreen and all nine files in screens/reports (CashFlowForecast,
MerchantSpending, MonthlyCloseOut, PaymentMethods, PersonSpending, SubscriptionAudit,
TaxSummary, WeeklyDigest, YearInReview). Insights wraps Reports, so all 11 were changed
together to avoid a solid band. Confirmed on-device.

✅ White cards (light mode only): theme.ts lightTheme navy3 changed from #FBF9F3 to
#FFFFFF. Dark theme untouched. Side effect, intended and accepted: everything that uses
navy3 is white in light mode too, i.e. cards, the stack and tab headers, the bottom tab
bar, and bottom sheets. Confirmed on-device.

✅ Calendar background: CalendarScreen.tsx container style backgroundColor changed from
colors.navy2 to colors.navy3 (white in light mode, still dark in dark mode). Only that one
line changed; the existing paddingHorizontal: 12 and paddingTop: 16 in the same style stay
as they were. Calendar deliberately does NOT get the shared mint background: on iOS it
opens as a native 'modal' and on Android as a 'formSheet', both outside the shared
background, so it keeps its own solid colour. Confirmed on-device (Android).

📌 Decisions for this restyle
- Layout is unchanged. The mockup was a colour/background reference only.
- ONE shared <LeafBackground /> in App.tsx instead of one per screen. Reasons: the SVG
  gradient id "pageBgGrad" could clash if mounted many times; leaves would ghost and
  double up during push/pop slides; it avoids duplicating the SVG tree per screen.
- Left to Spend is ALWAYS teal, not status-coloured. The status label text ("Looking
  good", etc.) still carries the status. Cath did not object.
- SVG gradients via the already-installed react-native-svg, NOT expo-linear-gradient
  (which would have needed a new native dependency and a new EAS build).
- Only the `container` style was changed per screen. Other navy1/navy2 uses (chips,
  inputs, rows, chart tracks) were deliberately left alone.
- Bottom sheets, dialog modal cards (CsvImport, LoanPayoffSimulator, SavingsFiComparison,
  Calendar day popup) stay OPAQUE.
- SUPERSEDED in V.2b/V.2c: all of those pre-auth screens except IntroScreen now render
  transparent over the shared LeafBackground, which moved to App.tsx's root. SetPinScreen
  is still its own thing (it is a modal inside Settings).
- Screens with their own background on purpose were left alone: IntroScreen (splash
  image, #1A3F22), SignInScreen, PinUnlockScreen, SetPinScreen, AccountSwitcherScreen,
  CreateProfileScreen, OnboardingScreen, IntroSlidesScreen. The shared background only
  exists inside the authenticated `home` block, so these are unaffected.
- Headers and the bottom tab bar stay solid so scrolled content never shows through them.

⚠️ Known issues / gotchas for this restyle
- Because navy3 is now white in light mode, headers, the tab bar and bottom sheets are
  white too. If they should stay cream, give them their own colour instead of navy3.
- Calendar's own cells and cards also use navy3; on the now-white Calendar page they may
  look flat. If so, consider a mint or navy2 tint for the page or the cells.
- The iOS-only 'modal' presentation for Calendar is still untested (no iPhone).
- Push/pop screen slides now show the shared background through the gap between cards
  during the ~300ms slide. Not observed as a problem. If it is, set animation: 'fade' or
  'simple_push' in RootStack's screenOptions.
- Not yet checked on the installed EAS build (see the react-native-svg note in the
  H-series known issues; that same NEW build is still required).

📁 Files for this restyle
- New: mobile-app/src/components/CardGradient.tsx
- Edited: mobile-app/App.tsx, mobile-app/src/theme.ts,
  mobile-app/src/components/LeafBackground.tsx,
  mobile-app/src/navigation/MainTabs.tsx, mobile-app/src/navigation/RootStack.tsx,
  mobile-app/src/screens/HomeScreen.tsx, DashboardScreen.tsx, ToPayScreen.tsx,
  TransactionsScreen.tsx, MoreScreen.tsx, ProfileScreen.tsx, AccountsScreen.tsx,
  IncomeScreen.tsx, SavingsScreen.tsx, PlanningScreen.tsx, SettingsScreen.tsx,
  PremiumScreen.tsx, BillsScreen.tsx, DebtsScreen.tsx, LoansScreen.tsx, EventsScreen.tsx,
  GoalsScreen.tsx, GroceriesScreen.tsx, TravelScreen.tsx, CalendarScreen.tsx,
  InsightsScreen.tsx, ReportsScreen.tsx, and the nine files in
  mobile-app/src/screens/reports/
- Confirmed on-device on Android; commit status: see the git commands in the session wrap.


SUPERSEDED by the V series (below), light mode only: navy1/navy2/navy4 changed from cream to
mint tints, cardTealStart/End changed from teal (#134E48/#082F2C) to forest green
(#2E5D3A/#173D2B), and ink/ok/error/orange values were deepened for contrast. The
"navy3 = white" decision above still stands. Solid auth screens (SignIn, CreatePofile,
PinUnlock, SetPin, AccountSwitcher, Onboarding, IntroSlides) still paint navy2, which is
now mint rather than cream, but they have no leaf background yet (planned for V.2).

=====================================================================
🏠 Home screen round 2: tappable hints, rubber band, scrolling Left to Spend, Watched Categories drill-down (DONE), bell inbox (DONE, device-tested)
=====================================================================

Why: Cath reviewed Home on a real Android phone (screenshots) and asked for several
edits. Worked as Antigravity investigates (read-only), Claude reviews, Cath pastes by hand.
Nothing new is committed beyond what is noted below.

✅ DONE, tested and pushed:
- Removed the chevron-forward beside the date in the Left to Spend date pill
  (HomeScreen.tsx). The pill still opens Calendar (it opens as a bottom sheet).

✅ DONE, code confirmed from real files shown by Antigravity, then device-tested with the batch (Cath: "everything works as described"):
- DashboardScreen.tsx "This Month" card: icon on the left as an iconBubbleQuiet (colors.okBg
  bubble, swap-horizontal-outline icon). The rowCard now uses `{ marginBottom: 10 }` (the
  earlier `gap: 12` mistake is gone, since iconBubbleQuiet already has marginRight: 12).
- Amount Owed pills (Bills / Debts / Loans): now three flex:1 pills in ONE row (owedPill,
  owedPillTextWrap, owedPillLabel, owedPillAmount with adjustsFontSizeToFit and
  minimumFontScale 0.75, plus a chevron). Each opens its own To-Pay sub-tab.
- Watched Categories status label has marginLeft: 8, so name and status no longer touch.
- PullToRefreshScrollView.tsx rewritten: no longer does pull-to-refresh. Accepts
  refreshing/onRefresh (ignored, so the 12 screens still compile). iOS: RN ScrollView with
  bounces + alwaysBounceVertical. Android: GHScrollView with overScrollMode="always". It
  forwards every other ScrollView prop (onScroll, scrollEventThrottle, stickyHeaderIndices
  all work). The 12 screens that use it are Accounts, Bills, Dashboard, Debts, Events,
  Goals, Groceries, Income, Loans, Savings, Transactions and Travel.

📌 Decisions (Cath, this session)
1. Remove pull-to-refresh from ALL screens and add a rubber-band feel to ALL screens.
   This SUPERSEDES PC.9 (hand-built Android pull-to-refresh) and the pull-to-refresh
   haptic in D.2. The old PanGestureHandler + Animated refresh code is gone from
   PullToRefreshScrollView.tsx. Leftover useRefresh / refreshing / onRefresh usage in the
   12 screens is ignored for now and can be tidied later.
2. Left to Spend moves INSIDE the scrolling content so the whole page moves under the
   finger (it also gets the rubber band at the top). Once scrolled past, a slim, simpler
   "Left to Spend ₱X" bar fades in and stays pinned under the profile/bell row. CONFIRMED
   and built (Checkpoint 1 below).
3. Watched Categories rows are tappable: they open Transactions filtered to that exact
   category, money out, this month. CONFIRMED and built (Checkpoint 2 below). This
   SUPERSEDES the H.3 decision that Watched Categories is not tappable.
4. Bell v1 = overdue bills and debts (overdue loans pending a check of how loan due dates
   are stored), over-budget categories, and peer-recovery requests. All of these clear
   themselves, so NO dismiss storage is needed. Goal milestones and the weekly recap are
   held back because they would need AsyncStorage dismiss state. Cath will test after all
   of it is built.
5. Bell inbox design (Cath accepted Claude's recommendations): the inbox shows three groups
   in this order: (1) peer recovery requests, which open Profile where the approve button
   already lives; (2) overdue items: bills and debts with a cycle whose due date is before
   today and an unpaid balance, plus ONE-TIME loans you owe (direction 'borrowed') with a
   past due date and money still owed; (3) "due in the next 14 days", the same list as the
   Dashboard card. Tapping an overdue or due item opens it via the requestOpenBill/Debt/
   Loan helpers. Over-budget categories from the earlier v1 list are NOT in this
   design; revisit only if Cath asks.
6. Bell read state: tracked PER ITEM, saved per profile in its own small file following
   the reportVisibility.ts pattern (key `profile:${username}:...`, try/catch, plain
   AsyncStorage). Opening the bell does NOT mark everything read; tapping an item marks it
   read. The red dot / unread count clears when every item is read. An item that stays
   overdue stays in the list but shows as read. A new item, or a recovery request with a
   new id, shows as unread. Read marks for items no longer relevant are pruned
   automatically so the saved list cannot grow forever. This SUPERSEDES decision 4's
   "no dismiss storage needed" (that assumed only self-clearing alerts).
7. Recurring loans are NOT treated as overdue: loans have only a payment history, no
   cycles, so there is no reliable way to say a recurring loan is late. Only one-time loans
   count. Antigravity's "today's date is past the due day and no payment this month" rule
   was an invented heuristic and was rejected.
8. ProfileScreen is left completely untouched. The bell gets its OWN small hook for the
   peer-recovery listener (a second listener on the same household doc is harmless).
   Antigravity's first hook was rejected: it used import paths that do not exist and would
   have left ProfileScreen without owner/member info.

📌 Findings from Antigravity (real code viewed)
- The white band during pull-to-refresh was the Android refresh indicator (opaque navy3)
  appearing between the fixed Left to Spend card and DashboardScreen's scroll area.
- Route names: tabs are 'Home', 'To-Pay', 'Transactions', 'More' (MainTabs). Stack routes
  are Main, Profile, Calendar, Accounts, Income, Savings, Planning, Insights, Settings,
  Premium (RootStack). Savings and Settings are STACK routes; To-Pay and Transactions
  are TAB routes.
- SettingsScreen keeps `const [page, setPage] = useState<string | null>(null)`, does not
  read route params, and would not react to changed params while mounted. Any deep link
  to a Settings page needs useRoute plus a useEffect on the param.
- DashboardScreen is used in TWO places: HomeScreen and InsightsScreen's Dashboard tab.
  Left to Spend must therefore be passed in from Home as an optional header, not
  hard-coded into Dashboard.
- Double-margin trap: the Left to Spend card has marginHorizontal: 14, and DashboardScreen's
  contentContainer already has padding: 14. Once the card moves inside, remove its margin.
- computeCategorySpend (transactions.ts) is an EXACT string match on t.category, filtered to
  direction 'out' and date.startsWith(monthPrefix). There is no sub-category rollup. A
  Transactions filter must use the same three conditions (category, money out, this month)
  to match the number on the card. Both use buildTransactionsList(model).
- TransactionsScreen has no route params and no category filter today. It only sorts.
- There is no isOverdue helper. todayISO is copied privately into TransactionsScreen and
  SavingsScreen (local date, correct for the Philippines). Antigravity's draft used a UTC
  date, which is wrong between midnight and 8am in PH; do not use that. A shared todayISO
  is needed. Existing helpers: outstandingBalance(record) for bills and debts, and
  loanOutstandingBalance(loan), both in balanceProjection.ts. getUpcomingDue in
  DashboardScreen explicitly drops overdue items (date < today).
- BottomSheet props: visible, onClose, title?, children, testID?.
- Peer-recovery requests are only surfaced in ProfileScreen (its own Firestore snapshot
  listener sets pendingRecovery). Neither Home nor the bell knows about them.
- Weekly recap is only a locally scheduled push (pushNotifications.ts). There is no
  in-app record of it.
- Stack: RN 0.81.5, Expo SDK 54, targetSdk/compileSdk believed 35, edgeToEdgeEnabled and
  newArchEnabled true. Android 12+ stretch overscroll IS supported on this stack, and the
  old code suppressed it with overScrollMode="never".

✅ Checkpoint 0: lost "open this bill/debt/loan" requests — DONE, compiled clean, pushed.
Existing bug found by investigation: openBillRequest.ts, openDebtRequest.ts and
openLoanRequest.ts dropped a request if nobody was listening (ToPayScreen is the only
listener, and tabs mount lazily, so on a fresh launch before To-Pay was ever opened the
request was lost and the user just landed on To-Pay with nothing open). Only
openToPayTabRequest.ts remembered a pending request.
Fix: each of the three files now keeps `let pendingRequest` and, when requestOpenX() is
called with zero listeners, stores it instead of dropping it; subscribeToOpenXRequest()
hands a pending request to the first subscriber and clears it. ToPayScreen needed no
change. Device-tested as part of the batch ("as described"); the specific fresh-launch
case (close app, go straight to Home, tap a due item without opening To-Pay) was not
itemised separately, so re-check it once if anything ever looks off.

✅ Checkpoint 1: Left to Spend scrolls, slim bar pins — DONE, compiled clean, device-tested,
pushed.
- DashboardScreen now takes optional props `{ header?: React.ReactNode; onScrollY?:
  (y: number) => void }`, renders {header} at the very top of its PullToRefreshScrollView,
  and forwards onScroll (scrollEventThrottle 16) to onScrollY. InsightsScreen still renders
  <DashboardScreen /> with no props, so it is unchanged.
- HomeScreen: the whole Left to Spend card is now passed in as `header`. New
  `showSlimBar` state flips on when scrollY > 150. The slim bar is an absolutely
  positioned, click-through View (slimBar / slimBarLabel / slimBarAmount styles) inside a
  `<View style={{ flex: 1 }}>` wrapping DashboardScreen. leftCard style lost its
  marginHorizontal and marginTop (DashboardScreen's padding: 14 already supplies the side
  margin) and gained marginBottom: 12.
- The 150px switch-over is a guess at the card's height; changing it is a one-number edit
  in HomeScreen's onScrollY.
- Correction to an earlier Antigravity claim: pull-to-refresh is disabled in this
  component, so no refresh spinner "moves"; this change is layout only.

✅ Checkpoint 2: Watched Categories tap-through — DONE, compiled clean, device-tested,
pushed.
- DashboardScreen: each Watched Categories row is a TouchableOpacity that calls
  navigation.navigate('Transactions', { categoryFilter, monthFilter: monthPrefix,
  filterNonce: Date.now() }), with a chevron. Navigation is untyped (useNavigation<any>)
  and there is no tab param list type, so no type changes were needed.
- TransactionsScreen: now imports useRoute, keeps `categoryFilter` state ({ category,
  month } or null), sets it from route params in a useEffect keyed on filterNonce, and
  filters the list to direction 'out' + exact category + date.startsWith(month), the
  same three conditions computeCategorySpend uses, so the list adds up to the card. A
  "Clear filter" chip (category · month, close icon) shows above the sort pills when a
  filter is active. The totals follow the filtered list automatically because they are
  computed from `transactions`.

📌 Findings from the second and third Antigravity investigations (real code viewed)
- Getting due items right: getUpcomingDue strips today to midnight and every event date
  is also midnight, so items due TODAY are included; only yesterday or earlier is dropped.
  Not a bug.
- The word "overdue" appears nowhere in mobile-app/src. Bills, Debts and the bell have no
  existing overdue logic to copy. Bills only sorts by next due date. The overdue rule is
  new: a cycle with dueDate before today (LOCAL date, not toISOString, which is UTC and
  wrong in PH between midnight and 8am) and amountDue - amountPaid > 0. Bills and Debts
  share the BillCycle shape (id, dueDate, amountDue, amountPaid, paidDate, notes, optional
  paymentMethod and feesPortion). Loan type has recurringType?, dueDate?, direction
  ('borrowed' | 'lent'), actualPayments (id, date, actual, paymentMethod?).
- Existing helpers: outstandingBalance(record) for bills and debts, loanOutstandingBalance
  (loan) (total minus actual payments, floored at 0), both in balanceProjection.ts (toNumber
  there is private). getNextDueDate(recurringType, dueDate, today, customStartDate,
  customFreq, customOccurrenceCount) in recurrence.ts returns a PAST date for a one-time
  item and rolls forward for recurring ones.
- Income is a STACK route (RootStack), not a tab. IncomeScreen and SavingsScreen receive
  openIncomeId/openIncomeNonce and openSavingsId/openSavingsNonce as props from RootStack's
  route.params. Tab.Navigator does not set `lazy`, so tabs mount lazily (default).
- ToPayScreen is the only subscriber to the open-bill/debt/loan requests, and passes them
  to Bills/Debts/Loans as props (openBillId/openBillNonce etc.). Each child has a ref
  guard so the same id + nonce does not reopen after a manual dismissal.
- storage.ts is only for profiles, encrypted data, pending host link and cloud-sync
  bookkeeping (AsyncStorage). Small per-profile preferences live in their own files:
  reportVisibility.ts (`profile:${username}:hidden-reports`, try/catch, JSON array) and
  onboarding.ts (`profile:${username}:onboarding-completed`). The bell's read state
  follows that pattern.
- ProfileScreen real imports for the household listener: getCurrentFirebaseUser from
  '../authFirebase'; loadProfilesIndex from '../storage'; subscribeToHousehold and
  HouseholdMemberInfo from '../household'; getPeerRecoveryRequest and
  PeerRecoveryRequestDoc from '../recovery'. The household id comes from
  loadProfilesIndex() -> the profile's householdId (no getStoredHouseholdId exists). The
  listener also sets owner/member state, so it cannot be swapped for a slimmer hook.
  Pending recovery is shown when the request status is 'pending' and requesterUid is not
  the current uid.
- BottomSheet scrolls (ScrollView inside, max height 85% of the screen), so it can hold a
  long inbox list. Do not nest another ScrollView in it.
- HomeScreen currently computes `hasDueSoon` from getUpcomingDue(model, 14) and shows a red
  dot on the bell; the bell button has no onPress yet.

⚠️ Known issues / gotchas (this round)
- The rubber-band rewrite is a BET. On Android 12+ the stretch appears once overScrollMode
  is not "never", but it stretches rather than slides, so it is subtler than iPhone. Cath's
  Android version is unknown. If it does not feel reactive enough, the next step is a
  custom drag-following bounce at both edges (only if needed). Because it touches every list
  screen, scroll a few screens on-device after applying.
- The custom Android bounce code Antigravity proposed only works after Left to Spend is
  inside the scroll area, and it covers only the top edge, so it was NOT used.
- If tsc complains about unused refreshing / onRefresh, paste the error.
- Antigravity's proposed bell used `new Date().toISOString()` for "today" (UTC bug), only
  checked bills, and used unverified screen names and BottomSheet props. All corrected.
- Transactions is a tab that stays mounted, so a Watched Categories filter stays until the
  user taps "Clear filter", even after leaving and returning. The chip is always visible.
  If it should reset on leaving the tab, that is a small follow-up.
- Transactions still has no general month filter; only the category drill-down sets one.
- (RESOLVED) The bell used to be inert. It now opens the inbox (3a/3b-1/3b-2).
- Rubber band on Android 12+ is a stretch, subtler than iPhone. Cath reports it works as
  described; revisit only if it is raised again.

✅ Checkpoint 3a: bell data layer — DONE, compiled clean, pushed.
- New src/dateUtils.ts: todayISO() returns the LOCAL date (not toISOString, which is UTC
  and wrong in PH between midnight and 8am).
- New src/overdue.ts: getOverdueItems(model) returns OverdueItem[] (kind 'bill' | 'debt' |
  'loan', id, optional cycleId, name, dueDate, amountOwed, key), oldest first. Bills and
  debts: a cycle with dueDate before today and amountDue - amountPaid > 0. Loans: ONLY
  one-time loans with direction 'borrowed' (dueDate.date before today, and
  loanOutstandingBalance > 0). Recurring loans are never overdue (decision 7).
- New src/bellReadState.ts: loadBellRead / markBellRead / pruneBellRead, key
  `profile:${username}:bell-read`, plain AsyncStorage JSON array with try/catch, following
  reportVisibility.ts.
- New src/usePendingRecovery.ts: the bell's own household listener (subscribeToHousehold +
  getPeerRecoveryRequest), logic copied from ProfileScreen's effect. Returns
  { request, requestId }. A request counts only when status is 'pending' and requesterUid
  is not the current uid. ProfileScreen untouched.

✅ Checkpoint 3b-1: bell sheet, recovery + overdue groups — DONE, device-tested, pushed.
- New src/useBellInbox.ts combines the three sources and read state. HomeScreen got a
  BottomSheet titled "Notifications", an onPress on the bell, and a count badge (9+ cap).
- One tsc error on the way: navigation.navigate('To-Pay') is not a valid route name for
  HomeScreen's stack-typed navigation (To-Pay is a TAB route). Fixed with a local cast,
  (navigation as any).navigate('To-Pay'), on that one call only.

✅ Checkpoint 3b-2: "Due in the next 14 days" group — DONE, compiled clean, device-tested,
pushed.
- useBellInbox now also takes getUpcomingDue(model, 14) (imported from DashboardScreen).
  BellItem has a third variant, group 'due', with key
  `due:${type}:${id || label}:${localISO(date)}`. DashboardScreen's DueItem is not
  exported, so the hook defines a matching BellDue type.
- HomeScreen: the old small due-soon dot and hasDueSoon-based rendering on the bell were
  removed; the badge now counts unread items across all three groups. The tap handler
  handles overdue and due items (requestOpenBill/Debt/Loan, with requestToPayTab as the
  fallback when an id is missing), then navigates to To-Pay.
- Pruning: read marks for overdue/due items that no longer exist are dropped; recovery
  marks are left alone because the recovery request loads later than the other lists.

📌 Bell inbox limits (as shipped)
- Only one-time borrowed loans can show as overdue.
- Read marks live on the phone, per profile. Two people in one household each have their
  own read/unread state.
- The due-soon window is fixed at 14 days, the same as the Dashboard card.
- The recovery row only opens Profile; approve/decline still lives there.
- Over-budget categories are NOT in the bell (decision 5).

⚠️ Bell test coverage: Cath reported the device test as "described" for each checkpoint.
The overdue debt/loan tap-through (landing on the right To-Pay sub-tab) was assumed to
pass, because openDueItem in Dashboard uses the identical request helpers. The recovery
row was NOT tested with a real second device. The fresh-launch case (close app, tap a
bell item before ever opening To-Pay) was not tested separately; it relies on Checkpoint 0.

▶️ Still to build (older list, bell items now done; see Next step at the bottom)
Done: corrections, Checkpoint 0 (lost open requests), Checkpoint 1 (Left to Spend
scrolling + slim bar), Checkpoint 2 (Watched Categories drill-down).
Remaining:
3a. Bell data layer: a new shared local-date todayISO helper; an overdue list for bills and
    debts (cycle rule above) plus one-time borrowed loans; a new small hook for the
    peer-recovery request (own listener, real imports listed above, ProfileScreen
    untouched); a new per-profile read-state file following reportVisibility.ts, with
    pruning.
3b. Bell UI: BottomSheet inbox opened from the bell, three groups (recovery, overdue, due
    in 14 days), per-item read marking, unread count replacing the red dot, tap-through
    (recovery -> Profile; items -> requestOpenBill/Debt/Loan then navigate to To-Pay).
4.  One combined on-device test pass for 3a + 3b, including a fresh-launch tap-through
    from the bell and a recovery-request test if a second device is available.

📁 Files for this round
- New: src/dateUtils.ts, src/overdue.ts, src/bellReadState.ts, src/usePendingRecovery.ts,
  src/useBellInbox.ts
- Edited for the bell: src/screens/HomeScreen.tsx (BottomSheet inbox, bell onPress, unread
  badge, tap handler, bell styles, imports of BottomSheet / useBellInbox / the open-request
  helpers / requestToPayTab)
- Edited and pushed: mobile-app/src/screens/HomeScreen.tsx (chevron removed; Left to Spend
  passed as header; slim bar), mobile-app/src/screens/DashboardScreen.tsx (header/onScrollY
  props; tappable Watched Categories; This Month, Amount Owed and status-label fixes),
  mobile-app/src/screens/TransactionsScreen.tsx (category/month filter and Clear filter
  chip), mobile-app/src/PullToRefreshScrollView.tsx (rubber band rewrite),
  mobile-app/src/openBillRequest.ts, openDebtRequest.ts, openLoanRequest.ts (pending
  request memory)

=====================================================================
🎨 V SERIES: Visual-system pass (screenshot audit, mint everywhere, accessible colors, shared components)
=====================================================================

Why: Cath supplied 51 screenshots of the real app for a design review. Claude reviewed them
and ran contrast math on the real theme values. Same working pattern as the rest of the
project: Antigravity investigates (read-only), Claude reviews, Cath pastes by hand. A
browser "studio" mockup file (screen-studio-v2.html) with before/after screens was built from
the real tokens as a reference only; it is not part of the repo.
Screenshots 00-04 were camera photos of the phone, not real screenshots, and were skipped.
The fingerprint and PIN prompts block screenshots on purpose, so they cannot be captured.

📌 V-series decisions (Cath agreed, do not re-litigate without a real reason)
1. MINT everywhere (not cream), including sign-in, onboarding, PIN, account switcher and
   every Settings sub-page. Cream was considered; Cath chose mint.
2. One green family: hero card, primary buttons and active pills share one hue.
3. New accessible semantic colors (about 4.5:1 or better on white and mint).
4. Account cards: subtle tints of the brand-green family plus a clear label for Cash /
   Debit / Credit, with a visible name and balance strip when stacked. Must also work with
   user-chosen colors (AccountCard has a 15-color COLOR_PALETTE).
5. One pill component, one card, one button set, one header. The page name goes in the
   header ("Security", "Help & support"), and the duplicate "‹ Settings" link under the
   header is removed.
6. Tab bar labels go from 9.5px to 11-12px, with a darker inactive color.
7. Destructive actions get quieter (outlined or text-only), with solid red reserved for the
   final confirmation.
8. Type scale: fixed sizes for title / section / body / caption / amounts, minimum about 12px.
   One font family, with serif reserved for a few deliberate moments. (No custom fonts are
   loaded today; expo-font is installed but unused.)

📌 Findings from the Antigravity investigations (real code viewed)
- Theme lives in src/theme.ts (ThemeColors type, lightTheme, darkTheme) and src/tokens.ts
  (radii, spacing). There are NO shared Card, Button, Input, Pill or Header components;
  every screen defines its own inline. Only CollapsibleRow, SwipeableRow, AccountCard,
  BottomSheet, DateField, PasswordField, PinField and a few sheets are shared.
- Hardcoded colors are scattered: #E5484D in 16 files, SignInScreen has about 19 hex values,
  TransactionsScreen hardcodes its own green/red/orange (#2f9e44 / #e5484d / #c2410c) that
  differ from the theme and ignore dark mode. Top hex files: theme.ts, SettingsScreen (21),
  SignInScreen (19), AccountCard (18), avatars.ts (12).
- SignInScreen has two style sets: module-level `styles` (near-black #1C1917 primaryBtn,
  used ONLY by the recovery-key modal's "Unlock & Restore Data" button) and theme-aware `ms`
  from makeMainStyles (colors.gold, used by the main green "Sign in" button). The near-black
  button is a stray inconsistent style, still to fix.
- Planning tab bug: PlanningScreen's horizontal ScrollView had no style, so it grew to share
  space with the flex:1 content and stretched the pills (ToPayScreen works because it uses a
  plain View). Reports tag chips: they reused pillScroll ({ flex: 1, height: 54 }), written
  for a horizontal row, inside a vertical column, with no alignItems:'center'.
- Stacked account cards overlap on purpose (marginTop: -80, zIndex by index), so only a
  strip of each earlier card shows, and that strip has no balance. It reads as clipped.
- Root cause of mixed backgrounds: authenticated screens are transparent over the shared
  LeafBackground gradient, but pre-auth screens and Settings sub-pages paint solid navy2.
- Smallest fonts: Calendar day balance 7.5px, event count 8px, chart axes 8-9px, tab labels
  9.5px, many captions at 10-11px.
- Settings sub-pages show two back controls (native header arrow plus an in-page "‹ Settings"
  link), and the header says "Settings" on every sub-page.
- Contrast on the ORIGINAL light values (white / mint backgrounds): inkFaint #A0A597 2.5 /
  2.3 (fails), ok #059669 3.8 (fails small text), orange #EA580C 3.6, error #E11D48 4.7
  (barely passes), Transactions' hardcoded green/red 3.5 / 3.9 (fail), white on Cash card
  #059669 3.8 (fails small text), dark-mode inkFaint about 4.4 (borderline).
- Dark mode has an existing problem NOT yet fixed: white icons/text sit on pastel
  error/orange/ok backgrounds (SwipeableRow delete, HomeScreen bell badge, TransactionsScreen
  refund toggle and badges) at about 1.8-2.5:1.

✅ V.0: Layout bug fixes — DONE, applied by Cath (ran tsc; on-device look confirmed as part
of the Step 1 review; commit status: confirm with git status)
- PlanningScreen.tsx: ScrollView got style={styles.pillScroll}; styles gained
  pillScroll: { flexGrow: 0 } and pillRow gained alignItems: 'center'.
- ReportsScreen.tsx: the SECOND ScrollView (tag chips) now uses styles.tagScroll /
  styles.tagRow; two new styles after pillRow: tagScroll: { flexGrow: 0 } and tagRow:
  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14,
  paddingVertical: 8 }. The first ScrollView (icon row) was left alone.

✅ V.1: Color tokens + mint base (Step 1) — DONE, tsc clean, reviewed on-device
(Home and Security screenshots), commit command given
- theme.ts ThemeColors type: new key `decor: string;` after inkFaint.
- lightTheme: inkDim #626A5B -> #586152; inkFaint #A0A597 -> #5F6657; NEW decor #A0A597
  (the old faint value, for purely decorative uses); navy1 #EEE9DE -> #DDEDE3; navy2
  #F6F1E6 -> #EAF5EE; navy3 stays #FFFFFF; navy4 #E5E0CF -> #DCE8E0; error #E11D48 ->
  #C81E43; ok #059669 -> #0B7A4B; orange #EA580C -> #C2410C; cardTealStart/End
  #134E48 / #082F2C -> #2E5D3A / #173D2B.
- darkTheme: only added decor: '#8C857F' (same as its inkFaint). Nothing else changed.
- BottomSheet.tsx: handle backgroundColor colors.inkFaint -> colors.decor (so the drag
  handle does not turn dark).
- reports/PaymentMethodsReport.tsx (about line 155): the 'unset' bar uses colors.decor
  instead of colors.inkFaint.
- Gotcha hit: the BottomSheet replacement first lost its trailing comma, giving
  "TS1005: ',' expected" at the next line (header: {). Fixed by restoring the comma.
  Lesson: when replacing one entry inside a style object, include the trailing comma.
- Gotcha: #059669 appears in BOTH light ok and dark goldDim. Never use find-and-replace-all
  on hex values; match the whole `ok: '#059669',` line.
- Checked safe: the four places that append an alpha suffix (LoansScreen 522 ok/orange +
  '20', ProfileScreen 1422 gold + '55', SettingsScreen 2415 ok + '22', TravelScreen 727
  accent + '22') all work, because the new values are plain 6-digit hex.
- Checked beneficial: white-on-orange refund badges in TransactionsScreen go from about
  3.2:1 to 4.6:1; text/checkmarks on green buttons switch from cream to mint (about 7-8:1).
- On-device result (Android, light mode): hero card is forest green and matches the primary
  button; deeper money colors read clearly; inactive tab labels are clearly darker;
  placeholders and hints are readable; page is mint on both Home and Security.


✅ V.2: Navigation chrome, dark-mode contrast, bordered inputs (partial V.3) — DONE, tsc
clean, device-tested in light and dark mode ("as described"). Commit status: confirm with
git status. Worked as Antigravity investigates (two read-only passes), Claude reviews,
Cath pastes by hand.

What shipped:
- MainTabs.tsx: tabBarLabelStyle fontSize 9.5 -> 11 (SUPERSEDES the 9.5 noted in
  Checkpoint 1); tabBarInactiveTintColor colors.inkFaint -> colors.inkDim. No wrapping
  on "Transactions" (about 63dp of 90dp per tab, estimate only).
- SwipeableRow.tsx: swipe delete background colors.error -> '#C81E43'; the "view" action
  icon (on colors.gold) color '#fff' -> colors.navy2.
- HomeScreen.tsx: bell badge background colors.error -> '#C81E43'.
- RowInteractionPreview.tsx: deleteBehind background colors.error -> '#C81E43' (matches
  the real swipe delete).
- TransactionsScreen.tsx: refundToggleTextActive and refundBadgeText '#fff' ->
  colors.navy2.
- SignInScreen, CreateProfileScreen, AccountSwitcherScreen, OnboardingScreen:
  primaryBtnText '#FFFFFF' -> colors.navy2 (white on dark-mode gold #10B981 failed
  contrast).
- SettingsScreen.tsx: added a PAGE_TITLES map plus a useEffect calling
  navigation.setOptions({ title, headerBackTitle }) so the native header shows the
  sub-page name; removed the in-body "‹ Settings" back link (testID settings-back-button)
  and the 15 in-body sectionTitle lines. Fixes the double back link and double title. The
  existing beforeRemove listener still sends native back / swipe-back / Android back to
  the Settings hub (confirmed from real code).
- SettingsScreen.tsx and ProfileScreen.tsx: styles.input -> backgroundColor colors.navy3,
  borderWidth 1, borderColor colors.navy4 (inputs on the mint page had no edge and
  vanished: Settings Security and Watchlist pages, Profile "join with a code").

Findings (real code viewed):
- Settings page ids and header titles: language "Language", help "Help & support", about
  "About us", appearance "Appearance", listrows "List Rows", notifications
  "Notifications", leftspend "Left to Spend", categories "Categories", watchlist
  "Category Watchlist", payees "Merchants & Payees", rules "Categorization Rules",
  security "Security", quickunlock "Quick Unlock", devices "Active Devices", data "Data".
- All 15 sub-pages are fragments inside one transparent container, so none paints a solid
  background in code.
- In dark mode error/orange/ok/gold are pastels, so white text or icons on them failed
  contrast. In light mode error is already #C81E43, so the fixed '#C81E43' is safe in
  both modes.
- LeafBackground uses StyleSheet.absoluteFill and renders once in App.tsx behind the
  NavigationContainer.
- Auth screens: App.tsx wrapper AND each screen container paint opaque colors.navy2, so
  a LeafBackground behind them would be invisible until their containers are transparent.

📌 V.2 decisions
- Never put white text/icons on a pastel status color. Use colors.navy2 (light in light
  mode, near-black in dark mode), or the fixed '#C81E43' for destructive actions and
  notification badges.
- The native header title is driven by navigation.setOptions inside SettingsScreen. Do not
  re-add in-body back links or titles.

📁 V.2 files edited: mobile-app/src/navigation/MainTabs.tsx, src/components/SwipeableRow.tsx,
src/components/RowInteractionPreview.tsx, src/screens/HomeScreen.tsx,
TransactionsScreen.tsx, SignInScreen.tsx, CreateProfileScreen.tsx,
AccountSwitcherScreen.tsx, OnboardingScreen.tsx, SettingsScreen.tsx, ProfileScreen.tsx

✅ V.2b: Shared leaf background behind ALL pre-auth screens + themed recovery button —
DONE, tsc clean, device-tested ("as described"), pushed. Worked as Antigravity
investigates (read-only), Claude reviews, Cath pastes by hand.

What shipped:
- App.tsx (AppContent final return): now `<View style={{ flex: 1, backgroundColor:
  colors.navy2 }}>` containing `{screen !== 'loading' && <LeafBackground />}` and then the
  fading screen wrapper. LeafBackground therefore renders ONCE at the root, BEHIND the
  fade, so leaves stay still while screens fade in over them. 'loading' (IntroScreen) is
  excluded because it is an opaque splash image on purpose.
- App.tsx 'home' block: its own <LeafBackground /> was removed (it would have doubled up)
  and its wrapper View is now backgroundColor 'transparent'.
- App.tsx: the six <SafeAreaView> wrappers (locked, onboarding, intro, switcher,
  createProfile, signIn) changed from colors.navy2 to 'transparent'.
- Container backgroundColor navy2 -> 'transparent' in IntroSlidesScreen, OnboardingScreen,
  CreateProfileScreen (the ScrollView style), SignInScreen (module-level container style)
  and AccountSwitcherScreen (the KeyboardAvoidingView inline style).
- SignInScreen.tsx recovery modal: the near-black "Unlock & Restore Data" button now uses
  ms.primaryBtn / ms.primaryBtnText (themed green) instead of the module-level
  styles.primaryBtn (#1C1917); its ActivityIndicator uses colors.navy2.
- SignInScreen.tsx makeMainStyles: primaryBtnText '#FFFFFF' -> colors.navy2. This was
  missed in V.2 and found by grepping primaryBtnText. A module-level (non-themed)
  styles.primaryBtnText with #FFFFFF still exists at the top level; it is no longer used
  by any button.

✅ Sign-in flicker fix (found while device-testing V.2b) — DONE, confirmed gone on-device,
pushed.
- Root cause: the old D.3 fade (see D.3 above) committed the NEW screen at opacity 1 and
  only THEN, in useLayoutEffect, snapped fadeAnim to 0 and animated back up. That gave a
  one-frame flash of the new screen, then a snap to invisible, then a fade-in. Antigravity's
  first suggested fix (just delete the setValue(0) snap) was REJECTED because it would
  have turned the fade into 1 -> 1 and deleted D.3 entirely.
- Fix: removed the fadeAnim / isFirstRenderRef / useLayoutEffect block from AppContent and
  added a small `ScreenFade` component (just above function AppContent) that owns its OWN
  Animated.Value, created at 0 on mount (1 when skip is true), and animates to 1 over
  220ms. AppContent renders `<ScreenFade key={screen} skip={screen === 'loading'}>`, so
  each screen change remounts a fresh fade that starts invisible from its very first
  frame. Cold-start splash is still instant.
- Alternatives from Antigravity's ranked list, deliberately NOT applied (change one thing
  at a time; revisit only if a flicker is seen again): (2) SignInScreen.tsx ~line 734
  calls setBusy(false) right before onSignedIn (probably harmless, same synchronous batch);
  (3) for linked-household members SignInScreen passes householdKey undefined to
  onSignedIn, so loadModel does an async load and Home can briefly show zeroes before the
  numbers appear; (4) SignInScreen busy starts false on the autoSignIn path, so the idle
  "Sign in" label can show for one frame before it becomes a spinner (possible fix:
  useState(Boolean(autoSignIn))).

✅ V.2c: PinUnlockScreen themed and transparent — DONE, tsc clean, device-tested, pushed.
- PinUnlockScreen.tsx now imports useTheme and builds its styles with makeStyles(colors)
  (module-level StyleSheet.create removed). Container is 'transparent', so the shared leaf
  background shows through when screen === 'locked'. LeafBackground is mounted for every
  screen except 'loading', and PinUnlockScreen can never render while screen is 'loading'.
- Token mapping used: title / typed text / retry icon+text -> colors.ink; eyebrow, subtitle,
  PIN/PASSWORD label (inkDim, not ink, so labels do not get heavier than before), hint
  text, ghost links -> colors.inkDim; input -> navy3 with navy4 border; error -> colors.error;
  primary button -> colors.gold with colors.navy2 text and spinner.
- The inline '#78716C' override on "Sign in to another account" was dropped (ghostBtnText
  is already inkDim).

✅ V.2d: account chips removed from PinUnlockScreen's password mode — DONE, device-tested,
pushed. The chip row only appeared after tapping "Use password instead" and duplicated the
account switcher, which "Sign in to another account" already opens. selectedUsername and
profiles state were left in place because handlePasswordUnlock still reads them. The five
chip styles (accountChooserRow, accountChip, accountChipActive, accountChipText,
accountChipTextActive) in makeStyles are now unused; harmless, can be deleted later.

📌 V.2b-d decisions
- LeafBackground lives in ONE place (App.tsx root), behind the screen fade, for every
  screen except the 'loading' splash.
- IntroScreen stays opaque on purpose. Its real SPLASH_GREEN is '#1B372C' (an earlier note
  in this file said #1A3F22, which was wrong).
- SetPinScreen was NOT touched: it is not a pre-auth route, it renders as a modal inside
  SettingsScreen, and it still has hardcoded #FAFAF9 / legacy colors (not yet reviewed).
- Fade timing/behaviour is now owned by ScreenFade, not by fadeAnim in AppContent.

⚠️ V.2b-d known issues / still to check
- PinField.tsx and PasswordField.tsx were opened by Antigravity but their code was never
  shown, so any hardcoded dot/placeholder/icon colors inside them are unreviewed. They
  looked fine in a light-mode screenshot of the PIN password mode (eye icon and dots
  readable). Dark mode of the pre-auth screens was not itemised in the device test.
- SetPinScreen's hardcoded legacy colors (see above) are still outstanding.
- Metro deprecation warning: SafeAreaView imported from 'react-native' (does nothing on
  Android) should eventually come from 'react-native-safe-area-context'.

✅ V.3: Active badge, leaf opacity, bordered Settings inputs, decor chevrons — CODE GIVEN
(Step A and Step B), NOT YET CONFIRMED applied, tsc-checked or device-tested. Worked as
Antigravity investigates (two read-only passes), Claude reviews, Cath pastes by hand.

Step A (given):
- LeafBackground.tsx: `const o = 0.07;` -> `0.05`. Dark mode uses the same value.
- SettingsScreen.tsx: the Security page "Secret Recovery Key" Active badge was hardcoded
  (rgba(34, 197, 94, 0.15) fill, #22c55e border/text). It now uses styles.statusBadgeActive
  / styles.statusBadgeTextActive, the same styles as the Active Devices badge.
- statusBadgeActive is now: backgroundColor colors.ok + '26', borderColor colors.ok,
  borderWidth 1, borderRadius 6, paddingHorizontal 8, paddingVertical 2.
  statusBadgeTextActive is now fontSize 11, fontWeight '700', color colors.ok.
  Side effect: the Active Devices rows also get the slightly bigger, stronger badge.
- SettingsScreen.tsx styles.input (the one with marginBottom: 14): backgroundColor
  colors.navy3, borderWidth 1, borderColor colors.navy4. This fixes the Security,
  Notifications/Watchlist and Household inputs that sat on the mint page with no edge.
  Side effect: inputs inside Settings' own bottom sheets (Category, Payee, Rule) are now
  white with a border on a white sheet (expected to look fine, not yet seen).

Step B (given): colors.inkFaint -> colors.decor on decorative-only items:
- Chevrons: CollapsibleRow.tsx (real code is isExpanded ? 'chevron-up' : 'chevron-down',
  size 16), DashboardScreen.tsx (2: Watched Categories row, Due Next 14 Days sheet row),
  SettingsHub.tsx, ProfileScreen.tsx (3: Password & Encryption Key, Active Devices, All
  settings), AccountSwitcherScreen.tsx.
- BillsScreen.tsx: CANCELLED badge BORDER only. The badge text stays inkFaint.
- TravelScreen.tsx: trackToggleDot inactive background only.
- SignInScreen.tsx (3) and CreateProfileScreen.tsx (4): the leading mail / person / lock
  icons inside the inputs (non-tappable, pointerEvents none).

📌 V.3 decisions
- Empty CHECKBOX borders STAY on inkFaint (Bills Subscription, Reports, Savings, Travel).
  A checkbox edge is how you see a tappable box exists, and decor is only about 2.5:1 on
  white. Revisit only if Cath prefers the lighter look.
- Interactive icons STAY on inkFaint: eye toggles in PasswordField and PinField,
  DateField's close-circle, LoansScreen's close icon. DateField's calendar icon also stays
  (its surrounding code was not shown, so it was not changed).
- No other input sits directly on the mint page: all the screens' other styles.input are
  inside white BottomSheets or navy3 modal cards. PasswordField adds no border or
  background of its own, so it cannot double up with the Settings input border.
- Part 2 search found no other borderColor / backgroundColor uses of inkFaint beyond
  those listed.

⚠️ V.3 notes
- Antigravity's first report described CollapsibleRow's chevron wrongly and only returned
  matching lines for the rest. The real code was fetched in a second pass before any
  Step B edit was written.
- Dark mode: decor is #8C857F; check chevrons still read on dark cards.
- ok + '26' on dark backgrounds has not been checked.
- Not verified: other uses of the hardcoded #22c55e, if any (the grep ran but its result
  was not shown).

⚠️ V-series known issues / still to do
UPDATE V.3 Step A: the Settings styles.input edit above completes this; no other input was found directly on the mint page.
- Double back link on Settings sub-pages: FIXED in V.2. Check whether any Maestro/e2e test
  references the removed testID settings-back-button, and whether Ionicons is still used in
  SettingsScreen.tsx. Some Settings sub-pages were reported as looking cream/solid
  on-device, but the code shows all 15 are transparent; cause not found (need to know
  which pages).
- Tab bar labels: FIXED in V.2 (11px, darker inactive). Re-check with Android's large font
  setting turned on.
- "Active" badge on the Security page: FIXED in V.3 Step A (theme ok color, stronger fill). Awaiting device confirmation.
- Leaf watermarks: opacity lowered to 0.05 in V.3 Step A (repositioning not done). Awaiting device confirmation.
  call: drop opacity from 0.07 to about 0.05 or reposition. Not changed yet.
- Auth/pre-auth screens: FIXED in V.2b/V.2c (shared leaf background, transparent
  containers). Settings sub-pages like Help and About were previously reported as looking
  solid; the code shows they are transparent, and the cause was never found. Ask which
  pages if it is seen again.
- Chevrons and the Travel inactive dot: moved to colors.decor in V.3 Step B (awaiting device confirmation). Empty-checkbox borders were deliberately kept on inkFaint (see V.3 decisions).
- Dark mode white-on-pastel badges: FIXED in V.2 for swipe delete/view, bell badge, refund
  toggle and badges, and the four primary buttons. The search only looked a few lines
  around each backgroundColor, so more white-on-colored pairs may exist; run a broader
  grep later.
- darkTheme.cardTealStart/End (#164E44 / #0D332D) are still blue-teal; suggested #1A3B2B /
  #0F261B to match the new forest green. darkTheme.inkFaint (#8C857F) is borderline 4.35:1;
  suggested #9E9892.
- TransactionsScreen hardcoded money colors, the SignIn recovery button (#1C1917), the
  19 hardcoded SignIn colors and the #E5484D uses in 16 files still need to move onto the
  theme.
- Tiny fonts (<11px): CalendarScreen 327/334 (7.5 and 8px), CashFlowForecastReport 219/203,
  YearInReviewReport 238/248, CsvImportModal 415, LoansScreen 278, AccountCard 188,
  MainTabs 94, TravelScreen 312, and about 33 occurrences at 10px.
- Calendar days show the same balance under every date; plan to show a balance only on days
  with activity.
- Number fields (e.g. FI Calculator) show raw "37200" with no peso sign or commas.
- Sub-tab pills, segmented controls and filter chips are three different pill styles; plan
  one shared Pill component.
- Destructive actions: "Clear all data" is a full-width red button right under "Save a
  backup"; screen 11 has seven red "Sign out" buttons in a row.
- Profile's three shortcut rows (Password & Encryption Key, Active Devices, All settings)
  all call navigation.navigate('Settings') and open the Settings hub, not their own pages.
  Fixing needs a route param plus a useEffect in SettingsScreen (it does not read params).
- PremiumScreen's "SAVE 17%" pill uses okBg (#ECFDF5), about 1.05:1 on a white card, so it
  is nearly invisible. LoansScreen's LENT/BORROWED badge text is 9px with a 12% tint.
  Both are left for V.4 (shared Pill) and V.6 (fonts).

▶️ V-series planned order (each step = one Antigravity investigation, one paste, one tsc, one
commit, one on-device check)
- V.2 — DONE (see the V.2 section above), except LeafBackground on the auth screens, which
  moves to V.2b.
- V.2b, V.2c, V.2d: DONE (see the V.2b section above). Original plan: auth/pre-auth screens background. Investigate (read-only) how App.tsx wraps
  each pre-auth screen (locked, onboarding, intro, switcher, createProfile, signIn), what
  each looks like on mint, and what it takes to show LeafBackground behind them (wrapper
  and each screen's container backgroundColor navy2 -> 'transparent', LeafBackground placed
  behind). Also the SignIn recovery-modal near-black button.
- V.3: code given in two steps (A and B), see the V.3 section; waiting on tsc and device confirmation.
- V.4: build shared Pill, Card, Button and Header components, then adopt them screen by
  screen; move hardcoded colors onto the theme.
- V.5: account card tints and a visible name/balance strip when stacked.
- V.6: tiny fonts and the type scale; Calendar balances only on days with activity;
  number-field formatting.
- V.7: quieter destructive actions.
- Dark mode follow-ups from the V.1 findings (cardTeal and inkFaint values above).

📁 V-series files (so far)
- V.3 edited (pending confirmation): LeafBackground.tsx, SettingsScreen.tsx, CollapsibleRow.tsx, SettingsHub.tsx, DashboardScreen.tsx, ProfileScreen.tsx, AccountSwitcherScreen.tsx, BillsScreen.tsx, TravelScreen.tsx, SignInScreen.tsx, CreateProfileScreen.tsx
- Edited: mobile-app/src/theme.ts, mobile-app/src/components/BottomSheet.tsx,
  mobile-app/src/screens/reports/PaymentMethodsReport.tsx,
  mobile-app/src/screens/PlanningScreen.tsx, mobile-app/src/screens/ReportsScreen.tsx
- V.2b-d edited: mobile-app/App.tsx, src/screens/IntroSlidesScreen.tsx,
  OnboardingScreen.tsx, CreateProfileScreen.tsx, SignInScreen.tsx,
  AccountSwitcherScreen.tsx, PinUnlockScreen.tsx
- Commit used for V.1 (run from the repo root, one command per line):
  git add -A
  git commit -m "Design pass step 1: mint base, accessible text and money colors, decor token"
  git push

▶️ Next step
- ACTIVE RIGHT NOW: the V series. V.3 Step A and Step B edits have been given. First run
  `npx tsc --noEmit` from mobile-app, then check on the phone in light AND dark mode: Security
  "Active" badge and inputs, fainter leaves, softer chevrons, Sign In / Create Profile icons,
  Bills CANCELLED badge, and that checkboxes keep their darker border. Then commit and push.
  After V.3 comes V.4 (shared Pill / Card / Button / Header), V.5 (account card tints),
  V.6 (tiny fonts, Calendar balances only on active days, number formatting) and V.7
  (quieter destructive buttons). Confirm with `git status` that everything is pushed.
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