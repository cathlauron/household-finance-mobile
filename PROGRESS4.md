Household Finance Mobile App — Progress Log (Phase B on-device bug-fixing → Phase C: Publishing)

This file picks up exactly where PROGRESS3.md left off. PROGRESS3.md is now
closed/historical — it covers Phase B Part 2 in full (the Iconization &
Minimalism Pass, B2.1–B2.3, the bottom nav redesign, the "fewer words" pass
on SettingsScreen.tsx/ProfileScreen.tsx) plus the first full on-device
testing pass across everything from B.7 onward. See PROGRESS3.md for that
detail. PROGRESS2.md (Phase B build, B.1–B.14) and PROGRESS1.md (Phase A)
and PROGRESS.md (original Phases 0–11) are closed/historical before that.

📅 Session entries

(New sessions from here on get logged here, newest near the top, same
format as PROGRESS3.md's own session entries.)

✅ Carried forward from PROGRESS3.md — still true, not yet re-verified this file
- All of Phase B's checkpoints (B.1 through B.14) are CODE-COMPLETE. Full
  build detail lives in PROGRESS2.md.
- Everything through B.6 (plus B.5's UI/UX batches) has been verified on a
  real device once already — see PROGRESS2.md's own on-device testing
  session for that checklist and the bugs it found/fixed.
- Phase B Part 2 (Iconization & Minimalism Pass — B2.1 through B2.3 batch 4,
  the bottom nav redesign, the SettingsScreen.tsx/ProfileScreen.tsx "fewer
  words" trims) is fully CODE-COMPLETE and `npx tsc --noEmit` clean. See
  PROGRESS3.md for the full build detail on every batch.
- A first full on-device testing pass was run across everything from B.7
  onward (Left to Spend, Category Watchlist, Yours/Mine/Ours, refund
  tracker, weekly recap, FI calculator, tags/report filtering, subscription
  cancel-reminder, all of Phase B Part 2's iconization/swipe-to-delete/
  bottom-nav work). Real results — including several previously-believed-
  fixed bugs that turned out NOT to actually work on-device — are listed
  below under ⚠️ Known issues. Reminder/notification-specific testing was
  explicitly deferred to Phase C (see below) rather than chased through
  Expo Go.
- The "fewer words" trimming pass is PARTIALLY done: SettingsScreen.tsx and
  ProfileScreen.tsx are complete. A full ranked-by-wordiness inventory of
  every remaining screen already exists (captured in PROGRESS3.md's session
  history) — next up per that list: OnboardingScreen.tsx (8 items),
  SavingsScreen.tsx (7), SignInScreen.tsx (7), MoreScreen.tsx (6), and 18
  more screens after that in descending order.

📌 Decisions carried forward — still active
- Always retrieve/view exact current file contents before writing code;
  confirm design decisions before writing code; review real diffs before
  committing.
- PowerShell here-strings only, never bash heredoc syntax, for this project.
- Insist on real command output/diffs from Antigravity/Copilot, not
  narrative summaries — investigation-only unless a change is large and
  well-reviewed enough to justify applying+committing directly (never
  pushing — the person always runs `git push` themselves).
- Close/Save All open VS Code tabs before any commit, including
  PROGRESS-file-only commits — a routine checkpoint commit has silently
  reverted real code twice in this project's history when a tab was left
  open with stale content.
- After any round of fixes, independently re-verify against real, current
  code before considering it done — don't trust progress-log claims or
  commit messages alone. (This one bit us directly in the first on-device
  pass — several fixes logged as done in PROGRESS3.md did not actually work
  on a real device.)
- Never hand the person a conditional/branching instruction ("if the file
  says X do Y, otherwise do Z") — get the real answer via investigation
  first, then give one unconditional fix.
- For any fix small enough to hand-paste, the person applies it directly
  and runs git themselves; Antigravity/Copilot applying+committing directly
  is reserved for large, well-reviewed, scattered multi-file changes.
- Orphaned `households/{householdId}` Firestore documents from abandoned
  link codes are a known, accepted limitation — deferred, needs server-side
  cleanup, not a client patch.
- Reminder/notification-related bugs and testing are explicitly deferred to
  Phase C — real push-notification delivery and deep-linking are far more
  reliable to verify on an actual installed build (EAS/TestFlight) than
  through Expo Go. Do not schedule investigation time on these until C.1
  is done.

⚠️ Known issues / gotchas — carried forward, still open

🐞 Real bugs confirmed on-device, needing investigation + fix (priority order suggested in PROGRESS3.md)
1. Offline sign-out → sign-in lockout — after airplane mode off/on, sign-in
   fails showing both "Incorrect password" and "missing information" at
   once; only a full app + Expo Go restart + QR rescan recovers it.
2. Offline delete hangs instead of showing an error (Accounts/Bills/Debts)
   — stuck loading spinner with airplane mode on, no error shown, only
   resolves once connectivity returns. Contradicts an earlier "shows a
   visible error on failed offline delete" fix — that fix needs
   re-investigation, likely a busy/loading flag not resolving on failure.
3. Left to Spend caution threshold doesn't persist — reverts to its old
   value after a full app close/reopen.
4. FI Calculator (Savings tab) largely non-functional on-device — "Years
   Until FI" shows literal placeholder text, the show/hide projected-date
   toggle doesn't appear, and none of the new fields (SWR, expected return,
   monthly savings, current savings) persist even locally.
5. Emergency Fund "Saved" checkmark still doesn't appear after saving.
6. None of the 3 promised background-save warnings (failed password-change
   cloud backup, failed account-recovery re-save, failed household-unlink
   personal backup) ever show on-device.
7. Events/Goals/Groceries/Settings saveModel try/catch sweep doesn't
   surface errors in practice on-device — likely same root cause as #2.
8. Travel checklist-item delete still leaves its linked expense behind in
   Transactions.
9. Biometric unlock failed outright on a Face ID device with fingerprint
   off (not just a wrong label — a functional failure).
10. Turning PIN off shows no loading indicator, reads as frozen.
11. Category Watchlist "over budget" wording fires at exactly 100% instead
    of only once genuinely over 100%.
12. "Which of these is you?" picker doesn't update Transactions live —
    needs a full app restart to take effect.
13. AccountsScreen Cards/List toggle — "Stacked card view" floating label
    (IconLabelHint) didn't appear on tap.

🎨 Design-change requests surfaced during testing (need scoping, not quick fixes)
- Replace Android's native date picker with the app's own themed calendar
  popup.
- Replace the PIN "Turn Off" text button with a toggle switch.
- Redesign the SUB/CANCELLED badge as a real hollow-box badge (matching
  Accounts' Cash/Debit/Credit badges) instead of blending in as plain text.
- Add an explicit confirm/save step to "Which of these is you?" instead of
  a single instant tap.
- Bottom nav: drop Calendar as a bottom tab entirely, replace with a small
  tappable date element at the top-center of Home that navigates to
  Calendar.
- Enable swipe-to-delete on Transactions' derived (non-manual) rows, paired
  with either a source-deletion warning or a redirect to the source screen
  to confirm — exact approach still undecided.
- Redesign Reports screen: replace the 9 icon sub-tabs with a checkbox-
  driven list (icon + title + checkbox) that shows/hides that report from
  the normal tab row — supersedes the B2.3 batch-1 iconization for this
  screen specifically.
- Reverse the icon-only decision for ToPayScreen/PlanningScreen's segmented
  pills — show icon + title together instead of icon-only.

🔔 Deferred to Phase C — do not chase now
- Subscription reminder tap → deep-link to To-Pay → Bills → specific bill
  (needs a real fired reminder).
- "Bill reminders" / "Weekly recap" independent toggles in Settings →
  Notifications (tester couldn't even locate this option — needs its own
  investigation once real-notification testing is possible).
- Subscription bills not double-notifying.
- Weekly Spending Recap: toggle/day-pills/hour input, turning it off, and
  the actual notification firing with a matching amount.
- Subscription Cancel-Reminder: reminder wording, warm-app tap-to-deep-
  link, cold-start tap-to-deep-link.

⏸️ Could not be tested yet (not pass/fail — needs the right conditions)
- Legacy-profile crash guards on Home/Dashboard (no legacy profile
  available to test with).
- Two-device sync checks throughout (Left to Spend, Category Watchlist,
  Yours/Mine/Ours labeling, FI Calculator) — single-device household right
  now.

✅ Confirmed working as designed in the first on-device pass
- "Copy Recovery Key" in Settings → Security.
- Bills/Loans/Debts summary-line ordering consistency.
- Lock screen "Use password instead" flow.
- Solo/unlinked profile correctly has no "which of these is you?" picker
  (documented gap, not a bug).

📁 Files in the repo
See PROGRESS3.md's own "Files in the repo" section for the full inventory
through the end of Phase B Part 2 (B2.1–B2.3 batch 4, bottom nav redesign,
SettingsScreen.tsx/ProfileScreen.tsx fewer-words pass). New/modified files
from here on will be tracked fresh in this file.

▶️ Next step
- Work through the real bugs found in the first on-device testing pass, one
  at a time, via the standard Antigravity/Copilot-investigates-first
  workflow — see the numbered list under ⚠️ Known issues above. Suggested
  order: (1) offline sign-out→sign-in lockout, (2) offline delete hanging,
  (3) Left to Spend threshold not persisting, (4) FI Calculator's
  non-functional fields, (5) Emergency Fund "Saved" checkmark, (6)
  background-save warnings, (7) Events/Goals/Groceries/Settings silent
  save failures, (8) Travel checklist-delete expense cleanup, (9) the
  remaining smaller bugs (biometric capture, PIN-off loading indicator,
  Category Watchlist wording, "which of these is you?" live update,
  AccountsScreen's missing label).
- Leave all reminder/notification testing and bugs alone until Phase C
  (C.1, EAS Build) is done — see the "🔔 Deferred to Phase C" list above.
- Once ready, separately scope and prioritize the design-change requests
  listed above (Android date picker, PIN toggle, SUB badge redesign,
  confirm-step for "which of these is you?", bottom-nav Calendar removal,
  Transactions swipe-to-delete on derived rows, Reports checkbox redesign,
  ToPay/Planning icon+title reversal) — these are new work, not bug fixes.
- Continue the "fewer words" pass: OnboardingScreen.tsx next (8 items),
  then SavingsScreen.tsx (7), SignInScreen.tsx (7), MoreScreen.tsx (6), and
  onward down the ranked list already captured in PROGRESS3.md's session
  history.
- Once the bug-fixing pass is far enough along (or the person decides to
  move on regardless), proceed to Phase C (Publishing) — see
  `4-REMAINING-WORK-ROADMAP.md`: C.1 (EAS Build → real installable
  .apk/TestFlight link) and, optionally, C.2 (App Store / Play Store
  publishing).
- B.12b (pension/Social Security offset, multi-account selector, possible
  scenario-comparison modal) remains an open, unscheduled item.

📚 Older progress: PROGRESS3.md (Phase B Part 2 + first on-device testing
pass, now closed), PROGRESS2.md (Phase B build, B.1–B.14, closed),
PROGRESS1.md (Phase A, closed), PROGRESS.md (original Phases 0–11, closed).
