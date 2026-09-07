Household Finance Mobile App — Progress Log (Phase B on-device testing → Phase C: Publishing)

This file picks up exactly where PROGRESS2.md left off. PROGRESS2.md is now
closed/historical (all of Phase B's checkpoints B.1–B.14 are code-complete;
see it for full build detail on any of them). PROGRESS1.md (Phase A) and
PROGRESS.md (original Phases 0–11) are closed/historical before that.


📅 Session entries

### Session — B2.1 build (IconLabelHint component)
- Wrote an Antigravity investigation-only prompt for B2.1. Antigravity
  confirmed the project's existing conventions: Ionicons icon library,
  useTheme()/makeStyles(colors) for styling, no animation library beyond
  the base React Native Animated API, no existing tooltip/popover pattern
  to reuse.
- Reviewed Antigravity's proposed draft and fixed two real issues before
  finalizing: (1) it used `NodeJS.Timeout` as a type, which doesn't
  resolve in this project (no @types/node installed) — swapped to
  `ReturnType<typeof setTimeout>`; (2) it rendered the tooltip at a
  guessed size before measuring the real one, which would visibly jump
  for longer labels — restructured to measure invisibly first, then fade
  in only once the real size/position is known.
- Created `mobile-app/src/components/IconLabelHint.tsx` (new file) — a
  reusable component: icon-only by default, quick tap OR long-press
  reveals a floating label that auto-fades (~2.4s default) or dismisses
  early on an outside tap. Uses a transparent Modal to escape parent
  overflow clipping.
- Wired it into `mobile-app/src/screens/AccountsScreen.tsx`'s existing
  Cards/List view-mode toggle buttons as a real, working test spot —
  the toggle still functions exactly as before, plus now also shows a
  floating label on tap/long-press.
- `npx tsc --noEmit` run — clean, no errors.
- On-device testing (the 5-point checklist) explicitly deferred by the
  person to a later session — see ⚠️ Known issues and ▶️ Next step above.

✅ Carried forward from PROGRESS2.md — still true, not yet re-verified this file
- All of Phase B's checkpoints (B.1 through B.14) are CODE-COMPLETE and
  `npx tsc --noEmit` clean. Full build detail for each lives in PROGRESS2.md.
- Everything B.4b and earlier (B.1–B.4b, plus B.5's UI/UX Batch 1/2/Calendar
  work, plus B.6's date-field rollout) has ALREADY been verified on a real
  device once, in PROGRESS2.md's own "full on-device testing pass" session —
  see PROGRESS2.md for the full checklist of what was confirmed working, and
  the 7 real bugs that pass found (6 fixed and code-complete, 1 documented as
  an accepted Android platform limitation — Calendar's native date-picker
  styling).
- Everything from B.7 onward (B.7, B.8, B.9, B.10, B.11, B.12a, B.13a, B.13b,
  B.14, plus the post-B.14 audit's 4 must-fix bugs and 6 lower-priority
  fixes) is CODE-COMPLETE but has NEVER been tested on a real device yet —
  this is the main outstanding work this file exists to track.
- B.12b (pension/Social Security offset, multi-account selector, and a
  possible scenario-comparison modal for the FI calculator) was explicitly
  deferred and remains UNBUILT.

📌 Decisions carried forward from PROGRESS2.md — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs before
  committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project.
- Insist on real command output/diffs from Antigravity, not narrative
  summaries — Antigravity is investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs `git push` themselves).
- Close/Save All open VS Code tabs before any commit, including
  PROGRESS-file-only commits — a routine checkpoint commit has silently
  reverted real code twice in this project's history when a tab was left
  open with stale content.
- After any round of fixes, independently re-verify against real, current
  code before considering it done — don't trust progress-log claims or
  commit messages alone.
- Never hand the person a conditional/branching instruction ("if the file
  says X do Y, otherwise do Z") — get the real answer via investigation
  first, then give one unconditional fix.
- For any fix small enough to hand-paste, the person applies it directly
  and runs git themselves; Antigravity applying+committing directly is
  reserved for large, well-reviewed, scattered multi-file changes.
- Orphaned `households/{householdId}` Firestore documents from abandoned
  link codes are a known, accepted limitation — deferred, needs server-side
  cleanup, not a client patch.
- Testing has been running in **batched mode** since partway through Phase
  B (build several checkpoints back-to-back, `npx tsc --noEmit` after each,
  defer on-device testing until a consolidated pass) — this was an explicit,
  informed trade-off. Now that every original Phase B checkpoint is
  code-complete, **this file's first job is running that consolidated
  on-device pass** for everything from B.7 onward.

⚠️ Known issues / gotchas — the on-device testing checklist to run through
Everything below is CODE-COMPLETE and `npx tsc --noEmit` clean, but UNTESTED
on a real device. This is the priority list for this file's first session.

- **B.7 "Left to Spend" hero stat + Settings caution threshold.** Check: the
  Settings number field saves/persists (and syncs to a 2nd linked device, if
  available); the Home hero card shows the right amount, right red/orange/
  green color, right "until payday" vs. "through end of month" caption; the
  end-of-month fallback and the earliest-of-multiple-paydays logic both work.
- **B.8 Category Watchlist.** Check: adding/removing a watched category +
  limit in Settings; the Dashboard card appears/disappears correctly and
  shows correct spend-vs-limit; red/orange/green thresholds trigger at the
  right spend percentages.
- **B.9 Yours/Mine/Ours + transaction Notes.** Check: the "Which of these is
  you?" picker on ProfileScreen saves/persists and shows the right person on
  reopen; a transaction shows "Mine" on your device and your real name on a
  linked device; shared transactions show "Ours"; Person Spending report
  labels match; the Notes field saves/edits/displays correctly. Known,
  accepted gap (not a bug): the picker only exists inside ProfileScreen's
  "Linked" section, so a solo/unlinked profile can't set "which person is me"
  yet.
- **B.10 Refund tracker.** Check: the "Expecting a refund?" toggle only shows
  on money-out transactions and disappears once refunded; partial refund
  amounts save/display; Mark as Received creates a real linked income
  transaction and updates totals; Undo removes it and reverts the badge;
  deleting an already-refunded expense cleans up its linked transaction too.
- **B.11 Weekly spending recap.** Check: toggle on/off persists; the Sun–Sat
  day pills render with correct selected styling; the hour input saves; and
  — hardest to verify, needs an actual wait — the notification fires at the
  chosen day/hour with a total matching the Weekly Digest report.
- **B.12a Expanded FI calculator.** Check: the SWR preset/Custom pill row;
  net-worth and monthly-savings suggestion rows; the Years Until FI result
  appearing/disappearing correctly based on inputs filled in; the show/hide
  projected-date toggle; Save persisting all 3 new fields.
- **B.13a/B.13b Tags + report filtering.** Check: a comma-separated tag saves
  on a new transaction and re-populates correctly on edit, with extra
  spaces/empty entries trimmed; the tag-pill toolbar appears ONLY on Monthly
  Close-out, Year in Review, Person Spending, Weekly Digest, Merchant
  Spending, and Tax Summary (never on Cash-Flow Forecast, Subscription
  Audit, or Payment Methods) and only when at least one tag exists anywhere;
  selecting a tag narrows each report correctly; "All" clears the filter.
- **B.14 Subscription cancel-reminder.** Check: the "This is a subscription"
  toggle saves/persists/re-populates on edit; the SUB/CANCELLED badge shows
  correctly; Keep/Cancel/Reactivate work (with the Cancel confirmation
  dialog); the reminder fires with correct name/date/amount wording; tapping
  it while backgrounded navigates to Bills (live-listener path); tapping it
  while the app was fully closed ALSO navigates to Bills once signed in
  (cold-start path — the harder case, worth deliberately testing rather than
  assuming it works); a normal bill-due notification tap does NOT trigger
  any navigation.
- **Post-B.14 audit's 4 must-fix bugs.** Check: a bill's subscription toggle
  actually persists through save now; tapping a subscription reminder
  correctly switches the bottom tab bar to To-Pay before opening the bill;
  turning off "Bill reminders" no longer also silently turns off "Weekly
  recap"; an older/legacy profile missing `income` or `categoryBudgets`
  no longer crashes Home/Dashboard on load (hardest to verify without an
  actual legacy profile on hand).
- **Post-B.14 audit's 6 lower-priority fixes** (delete try/catch on
  Accounts/Bills/Debts, the duplicate-notification fix for subscription
  bills, and Alert-confirm on the 3 Settings mini-form deletes) — lower
  risk, but still unverified on-device.
- **B2.1 IconLabelHint component — on-device testing deferred.** Code is
  complete and `npx tsc --noEmit` clean, wired into AccountsScreen's
  Cards/List view toggle as a real test spot. NOT yet tested on a real
  device. When ready, check all five: (1) quick tap on Cards icon switches
  view AND briefly shows "Stacked card view" label; (2) quick tap on List
  icon switches view AND shows "List card view" label; (3) long-press on
  either icon shows the label WITHOUT switching the view; (4) tapping
  elsewhere while a label is showing dismisses it early instead of waiting
  out the ~2.4s auto-fade; (5) label never gets visually clipped at the
  screen edge. Also flagged during review: this component uses a
  transparent Modal to escape card overflow clipping — if an icon using
  this component ever ends up living inside an already-open BottomSheet
  (also a Modal) in a later batch, watch for Android-specific flakiness
  (two native Modals open at once is a known trouble spot); no fix needed
  unless that combination is actually hit.

▶️ Next step
- Run the on-device testing checklist above, in whatever order is most
  convenient, and report back real bugs (with repro steps) as they're found
  — same investigate-with-real-code-first approach as always for any fix.
- Once that pass is done (or the person decides to move on regardless),
  next up is Phase C (Publishing) — see `4-REMAINING-WORK-ROADMAP.md`,
  Phase C: C.1 (EAS Build → real installable .apk/TestFlight link — this is
  also when the app migrates off Expo Go, unlocking the previously-parked
  Android home-screen widget feature) and, optionally, C.2 (App Store /
  Play Store publishing).
- B.12b (pension/Social Security offset, multi-account selector, possible
  scenario-comparison modal) remains an open, unscheduled item whenever the
  person wants to revisit it.
- Phase B Part 2 (Iconization & Minimalism Pass) is now planned — see its
  own section below. It starts once the on-device testing pass above is
  wrapped up, or whenever the person is ready to switch focus.
- B2.1 (IconLabelHint component) is code-complete and compiles clean, but
  its 5-point on-device test checklist (see ⚠️ Known issues above) has
  been explicitly deferred — run it whenever ready, alongside (or before)
  the larger B.7–B.14 on-device pass. Nothing else in Phase B Part 2
  (B2.2 onward) should start until B2.1 is confirmed working on-device,
  since B2.2+ depends on reusing this exact component.

🎨 Phase B Part 2 — Iconization & Minimalism Pass (planned, not started)
Goal: reduce the app's reliance on text labels in favor of icons with a
tap/long-press-to-reveal label, and slim the bottom nav down to a small
set of core tabs. This is a new sub-phase of Phase B, layered on top of
the already-code-complete B.1–B.14 work above — nothing here removes or
replaces prior functionality, it's a visual/interaction pass.

📌 Decisions locked in for this sub-phase
- Label reveal mechanic: BOTH a quick tap and a long-press on an icon
  reveal its floating text label (fades/dismisses on its own or on next
  tap elsewhere). One reusable component, built once, used everywhere.
- Bottom nav core tabs (always visible): Home, Calendar, Transactions,
  To-Pay. Everything else (Accounts, Savings, Income, Insights, Planning,
  Settings) moves under "More." This mirrors a decision already made once
  in the original web app's own code (search "MF7" in
  household-finance-app.html for the original reasoning) and follows
  standard UI/UX principles for bottom-nav design: Fitts's Law/thumb-zone
  (put daily-use actions in the always-reachable row), Jakob's Law (match
  the pattern users already know from Mint/YNAB/GCash/banking apps), and
  Hick's Law (fewer always-visible choices = faster scanning). Open to
  revisiting if on-device use shows a different tab deserves the core row
  more than one of these four.
- B2.2 (the icon audit) will be done together, screen by screen, in its
  own dedicated session — not pre-drafted solo. Starting screen/order to
  be picked when that session happens.

▶️ Checkpoints
| Checkpoint | What happens | Done when |
|---|---|---|
| B2.1 | Build one reusable "icon + label" component: icon-only by default; a quick tap OR a long-press reveals a small floating label with the word. Built once, used everywhere. | ✅ CODE-COMPLETE, `npx tsc --noEmit` clean. Wired into AccountsScreen's Cards/List toggle as a real test spot. ⏳ On-device testing (5-point checklist below) deferred — not yet run. |
| B2.2 | Icon audit, done together in session — screen by screen, list every text label/button/section header that could become icon-only with the new component. Nothing changed yet, just a documented decision per item (iconize / keep as text / needs a new icon). | ✅ DONE. Full inventory + decisions recorded below under "B2.2 Audit Results." |
| B2.3+ | Apply the iconization from the B2.2 list, in small batches (1–2 screens per checkpoint) — swap text labels for the new component, add any new icons needed (matching the existing app's icon style). | Each batch's screens are iconized, tested on-device, and checked off the audit list. |
| B2.X | Bottom nav redesign — down to Home/Calendar/Transactions/To-Pay always visible, everything else under "More." | Bottom nav shows only 4 tabs + More on a real device; every previously-reachable tab is still reachable via More. |
| B2.X | General "fewer words" pass — trim subtitles, hint text, and section descriptions wherever a shorter phrase or icon can say the same thing. | Each screen reviewed once; wordier bits trimmed/replaced without losing anything a first-time user needs to understand a field/button. |

- Person may add more items to this sub-phase's list before B2.1 starts —
  section will be finalized (and re-pasted here) once they say they're done.

📋 B2.2 Audit Results (finished audit — decision per pattern, applies to all 37 screens/modals)

Full raw inventory (every button/label/header/icon, file-by-file with line
numbers) was gathered via Antigravity investigation and is not reproduced
here in full — see chat history for that pass if needed. Decisions below
are by PATTERN (same decision applies everywhere that pattern occurs):

ICONIZE (target for B2.3+):
- Segmented sub-tab pills with 3+ options: ToPayScreen (Bills/Debts/Loans),
  PlanningScreen (Groceries/Travel/Events/Goals), InsightsScreen
  (Dashboard/Reports), ReportsScreen (9 report tabs — highest priority,
  likely wrapping/scrolling as text today), SavingsScreen (Goals/
  Emergency Fund/FI Calculator), GroceriesScreen (Grocery List/Calculator).
- Row-level icon+text actions: CollapsibleRow's "Edit" (pencil+text →
  icon-only), AccountsScreen's "Collapse" (chevron+text → icon-only).

CONVERT/CLEANUP (replace raw characters/emoji with real Ionicons, no
behavior change, no IconLabelHint reveal needed for the pure-navigation
ones like ‹ › since they're already universally understood):
- Raw single-character buttons: ‹ › (Calendar month nav, TaxSummaryReport/
  YearInReviewReport year nav), ✕ × (delete-row buttons across Loans,
  Groceries, Travel, Income, Savings), ▲ ▼ (SettingsScreen categorization
  rule reordering), › (ProfileScreen/SettingsScreen nav row chevrons).
- Emoji used as icons: 📊 (LoansScreen "View Payoff Simulator"), 📎
  (TransactionsScreen attach receipt), 📄 (CsvImportModal choose file),
  📋 (CreateProfileScreen/SettingsScreen copy recovery key), 🔄
  (PinUnlockScreen retry biometric), ⚠️ (SignInScreen/ProfileScreen
  warning banners).
- Ad hoc ✓ character inside dynamic status toggles (keep the TEXT, just
  swap the character for a real Ionicons checkmark): "✓ Completed"/"Not
  yet" (EventsScreen, GoalsScreen), "✓ Auto-saving..." (TravelScreen,
  EventsScreen), "✓ Marked as bought" (GroceriesScreen), refund tracking
  toggle (TransactionsScreen), "✓ Linked" badge (ProfileScreen).

KEEP AS TEXT (no change):
- All modal action buttons: Save / Cancel / "Delete this X" — appears in
  every screen's edit modal. Kept for clarity on often-irreversible
  actions; already full-width, no space to save.
- All "+ Add X" buttons — the word after "+" distinguishes what's being
  added when multiple "+" buttons appear on one screen.
- All form field labels (e.g. "Bill name", "Amount", "Interest rate") —
  a blank input needs a visible label; iconizing these would hurt
  usability, not help it.
- Recurring-type / priority / frequency / direction selector pills INSIDE
  a form (One-time/Monthly/Annual/Custom, Low/Medium/High, Borrowed/Lent,
  day-of-week pills) — user is actively choosing a value; text wins over
  learned icons here.
- Metric headers (TOTAL BALANCE, TOTAL BILLS, Amount Owed, etc.) — the
  actual numbers people check daily; flagged as a possible FUTURE
  redesign, explicitly out of scope for this straight icon-swap pass.
- Person/category/payee/tag chips showing real user-entered data — can't
  iconize actual names/text the person typed.
- All auth & security screens (SignIn, CreateProfile, Onboarding,
  PinUnlock, SetPin, recovery key flows) — rarely-seen, trust-critical;
  clarity matters more than icon economy here. Emoji-to-Ionicons cleanup
  still applies to these screens per the CONVERT section above.

ALREADY ICON-ONLY, NO CHANGE NEEDED:
- CollapsibleRow's plain expand/collapse chevron, PasswordField/PinField's
  eye-toggle icon, DateField's calendar/clear icons, AccountCard's
  wallet/card type badges, AccountsScreen's color swatch circles.

EXPLICITLY OUT OF SCOPE FOR B2.2/B2.3:
- Bottom nav tabs (MainTabs.tsx, 10 tabs, currently text-only) — tracked
  separately as its own checkpoint (see B2.X, bottom nav redesign, below)
  since it's a structural change (4 core tabs + "More"), not a straight
  icon swap.

▶️ B2.3+ batch order (once B2.1's on-device testing is confirmed):
1. ReportsScreen's 9 report sub-tabs (highest value — likely wrapping as
   text today).
2. Remaining segmented pills: ToPayScreen, PlanningScreen, InsightsScreen,
   SavingsScreen, GroceriesScreen.
3. Character/emoji cleanup pass across all flagged screens (mechanical,
   low-risk, can be batched together).
4. CollapsibleRow "Edit" + AccountsScreen "Collapse" → icon-only.

📁 Files in the repo
See PROGRESS2.md's own "Files in the repo" section for the full inventory
through the end of Phase B. New/modified files tracked in this file from
here on:
- NEW: `mobile-app/src/components/IconLabelHint.tsx` — reusable icon +
  tap/long-press-to-reveal-label component (B2.1).
- MODIFIED: `mobile-app/src/screens/AccountsScreen.tsx` — Cards/List view
  toggle buttons now use IconLabelHint as a real test spot for B2.1;
  behavior unchanged, plus tap/long-press now also shows a floating label.

📚 Older progress: PROGRESS2.md (Phase B build, B.1–B.14, now closed),
PROGRESS1.md (Phase A, closed), PROGRESS.md (original Phases 0–11, closed).
