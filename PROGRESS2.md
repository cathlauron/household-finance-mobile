Household Finance Mobile App — Progress Log (Phase B: UI/UX Polish → Phase C: Publishing)

This file tracks Phase B and Phase C only. Phase A (Firebase Auth, household linking,
account recovery, multi-device active sessions) is fully complete — see PROGRESS1.md,
which is now closed and kept only as a historical record. PROGRESS.md covers the
original 11 phases before that. Nothing from either file is repeated here.

✅ Done
- (Nothing yet — this file starts at the beginning of Phase B.)

📌 Decisions made
- **Carried forward from PROGRESS1.md — still active going forward:**
  - Essential vs. additional feature split (Phase B priority order): Essential = 
    Sign-in/Security, Accounts, Calendar, Bills/Debts/Loans, Transactions, Income, 
    Savings + EF/FI calculators, Dashboard, Settings. Additional = Groceries, Travel, 
    Events, Year-End Goals, deep Reports pages, Shared Expense ledger, CSV import, 
    Payment-method breakdown.
  - Cards + bottom sheets are the default add/edit interaction pattern app-wide, 
    replacing full-screen navigation pushes for single-record add/edit flows.
  - UI/UX psychology pass (Hick's Law, Fitts's Law, Gestalt/proximity, Miller's Law, 
    progressive disclosure, color psychology, trust markers, Picture Superiority Effect, 
    persistent progress indicators, Jakob's Law) applied throughout Phase B rather than 
    as a separate rebuild.
  - Four items explicitly parked, pending a dedicated decision session: Receipt OCR, 
    an in-app AI assistant, Guest/read-only household access, and an Android home-screen 
    widget/app-shortcut for quick-logging (requires migrating off Expo Go to a custom 
    EAS development build — deliberately deferred to Phase C's C.1 EAS Build step, 
    since that migration is already required there).
  - Standing workflow rules still in effect: always retrieve/view exact current file 
    contents before writing code; confirm design decisions before writing code, review 
    before committing; PowerShell here-strings only, never bash heredoc; insist on real 
    command output/diffs from Antigravity, not summaries; close/Save All open VS Code 
    tabs before any session involving file edits (see PROGRESS1.md for the incident 
    this prevents); report-only-first workflow for any full-codebase audit.

⚠️ Known issues / gotchas
- **Carried forward from PROGRESS1.md — still relevant:**
  - Watch for duplicate-import bugs reappearing in App.tsx after multi-part edits to 
    its import block — always close/reload the file in the VS Code tab before restarting 
    Metro after editing it.
  - CSV import: no upfront warning if Date/Label/Amount are left unmapped — minor, 
    not fixed, low priority.
  - The two new EF/FI income-info lines in SavingsScreen.tsx have not been visually 
    confirmed on a real device yet (functionally fine, just not eyeballed).
  - Firestore rules changes require a separate `firebase deploy --only firestore:rules` 
    step — editing firestore.rules alone does nothing until deployed.

▶️ Next step
- Pending: results of the pre-Phase-B code-health/security audit (requested this 
  session, prompt already sent to Antigravity — see PROGRESS1.md's final session entry 
  for the exact prompt). Triage and approve fixes from that audit first.
- Once the audit is clear: begin Phase B at B.1 (essential vs. additional feature 
  split — formal write-up) per the checkpoint table in PROGRESS1.md's ▶️ Next step 
  section (item 6), copied below for convenience:

  | Order | Item | Source |
  |---|---|---|
  | B.1 | Essential vs. additional feature split — formal write-up | Already decided |
  | B.2a | Splash/Intro screen | Standard-screens gap-check |
  | B.2b | Onboarding (short, skippable, shown once after account creation) | Standard-screens gap-check |
  | B.2b-security | Security setup step within onboarding — biometric-first, PIN as labeled fallback | Onboarding research |
  | B.2c | Standalone Profile screen, split out of Settings | Standard-screens gap-check |
  | B.3a | Accounts tab redesign: colored account cards | Apple Wallet-inspired |
  | B.3b | Accounts tab redesign: stacked/fanned card view | Apple Wallet-inspired |
  | B.3c | Accounts tab redesign: "Add account" as a bottom sheet | Apple Wallet-inspired |
  | B.4a | Convert essential-screen add/edit flows to bottom sheets, one screen at a time | Cards + bottom sheets pattern |
  | B.4b | Carry collapsed-row/tap-to-expand pattern to every list screen | Cards + bottom sheets pattern |
  | B.5 | UI/UX psychology pass | Cross-generational research |
  | B.6a | Date picker, part 1 — reusable `<DateField>`, Transactions + Bills | Requested |
  | B.6b | Date picker, part 2 — roll out to every remaining screen | Requested |
  | B.7 | "Left to Spend" hero stat on Home tab | Simplifi-inspired |
  | B.8 | Category watchlists under Insights | Simplifi-inspired |
  | B.9 | Yours/Mine/Ours labels + transaction comments | Monarch-inspired |
  | B.10 | Refund tracker | Simplifi-inspired |
  | B.11 | Weekly spending recap push notification | Monarch-inspired |
  | B.12 | Expanded FI/retirement calculator | Simplifi-inspired |
  | B.13 | Report filtering by tag | Simplifi-inspired |
  | B.14 | Subscription cancel-reminder | Lightweight Rocket Money substitute |

  Full detail and reasoning for each item lives in PROGRESS1.md's Decisions section —
  this table is a working copy for convenience, not a replacement.

Files in the repo (relevant to Phase B/C)
- (Nothing yet — will be filled in as Phase B work begins.)
- For the full file inventory through the end of Phase A, see PROGRESS1.md.
