Household Finance Mobile App — Progress Log (Phase D: Apple-Inspired Design Polish Pass)

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
  every screen with synced data.
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
  build; PinUnlockScreen's password-mode chip row has garbled/truncated username labels;
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

▶️ Next step
- Nothing has been investigated or decided yet — this session only set up the new file and
  paused PROGRESS5.md.
- IMMEDIATE NEXT ACTION for the next session: run D.1. Suggested shape (confirm before
  running): an Antigravity investigation-only prompt asking it to report, with real file
  paths and real code, (a) which screens/components currently do anything animation- or
  transition-related and how, (b) whether expo-haptics or any haptics call exists anywhere,
  (c) how corner radius is currently applied (a shared style token vs. scattered per-screen
  values), and (d) confirmation of whether react-native-reanimated is truly absent from
  package.json. Bring that back, and separately/alongside it, go screen by screen (or
  flow by flow — e.g. "deleting a transaction," "switching tabs," "opening a bill") and
  decide together which of the four buckets are worth pursuing and how far, before writing
  any code.
