# Household Finance Mobile App — Roadmap (Beginner Edition, v2)

This roadmap breaks the mobile app build into small **checkpoints**. Each checkpoint is sized to realistically fit inside one Claude conversation (before you'd hit a message limit), and each one ends with something concrete you upload to GitHub.

You do not need to memorize this document. At the start of every session, Claude will read your repo's `PROGRESS.md`, figure out which checkpoint comes next, and walk you through it.

---

## How to read this roadmap

- **Phase** = a big chunk of the app (matches the original M0–M15 structure).
- **Checkpoints** = the small steps inside each phase — this is the actual unit of "one conversation."
- **Done when** = the plain-English signal that a checkpoint is finished (usually: "you can see X happen on your phone" or "this file now exists in the repo").

---

## Phase 0 — Decisions & Foundation

**Goal:** Make the handful of upfront decisions every later phase depends on, and get a blank, working project running.

| Checkpoint | What happens | Done when |
|---|---|---|
| 0.1 | Claude explains, in plain terms, the sync options for sharing data between two phones (e.g., one household, two people), and helps you pick the simplest free one. | A written decision exists in `PROGRESS.md`. |
| 0.2 | Claude creates the blank Expo project structure and gives you exact copy-paste commands to run in your Codespaces terminal. | You type the commands, and a "Hello World" style blank app appears when you scan the QR code with Expo Go on your phone. |
| 0.3 | Decide offline behavior and minimum phone OS version (plain-English options, no research needed from you). | Decision recorded in `PROGRESS.md`. |

**Estimated sessions:** 2–3

---

## Phase 1 — Security & Sign-In (M1–M2)

| Checkpoint | What happens | Done when |
|---|---|---|
| 1.1 | Data model setup — the "shape" of all your financial data (bills, debts, income, etc.), matching the web app. | A file exists describing this shape; nothing visible yet. |
| 1.2 | Create-profile & sign-in screens, with password protection. | You can create a profile with a password on your phone and sign in/out. |
| 1.3 | Encrypt the data at rest (so it's genuinely protected, same as the web app). | Claude confirms and explains (simply) that your data is now encrypted; you do a test sign-in to confirm it still works. |
| 1.4 | Quick PIN unlock + auto-lock (matches the web app's convenience feature). | You can unlock with a short PIN after the first sign-in. |

**Estimated sessions:** 4–6

---

## Phase 2 — Getting Around the App (M4)

| Checkpoint | What happens | Done when |
|---|---|---|
| 2.1 | Bottom tab bar with all main sections (Home, Calendar, Accounts, To-Pay, Planning, Transactions, Insights, Income, Savings, Settings). | You can tap between empty tabs on your phone. |
| 2.2 | Basic theming (colors/light-dark mode) ported over. | The app's look matches your web app's style. |

**Estimated sessions:** 2–3

---

## Phase 3 — Calendar (M5)

| Checkpoint | What happens | Done when |
|---|---|---|
| 3.1 | Month grid view. | You can flip between months on your phone. |
| 3.2 | Tap a day to see what's happening that day. | Tapping a day opens a simple popup. |
| 3.3 | Running balance projection (the "what will my balance be" feature). | Numbers appear per day, matching the logic in your web app. |

**Estimated sessions:** 3–4

---

## Phase 4 — Accounts (M6)

| Checkpoint | What happens | Done when |
|---|---|---|
| 4.1 | Add/edit Cash, Debit, Credit accounts. | You can add an account and see it listed. |
| 4.2 | Balance calculation engine (matches web app math). | Balances update correctly when you add a transaction later (tested with dummy data). |

**Estimated sessions:** 2–3

---

## Phase 5 — Bills / Debts / Loans (M7)

| Checkpoint | What happens | Done when |
|---|---|---|
| 5.1 | Add/edit/delete bills. | You can add a bill and see it in a list. |
| 5.2 | Same for debts. | Same test, for debts. |
| 5.3 | Same for loans, plus the payoff simulator. | Same test, for loans; simulator shows a payoff estimate. |
| 5.4 | Recurring schedules (monthly, custom, etc.) | A bill correctly repeats on schedule. |

**Estimated sessions:** 4–6

---

## Phase 6 — Transactions (M8)

| Checkpoint | What happens | Done when |
|---|---|---|
| 6.1 | Unified transaction list. | All bills/debts/etc. show up together in one list. |
| 6.2 | Manually add a transaction + attach a receipt photo. | You can snap/attach a photo to a transaction on your phone. |
| 6.3 | CSV import (optional, can be skipped/simplified). | You can import a bank export file, or Claude explains why we're deferring this. |

**Estimated sessions:** 3–5

---

## Phase 7 — Income & Savings (M9)

| Checkpoint | What happens | Done when |
|---|---|---|
| 7.1 | Add income sources with pay schedules. | You can add a paycheck schedule. |
| 7.2 | Savings goals + Emergency Fund/FI calculators. | Adding a goal shows progress correctly. |

**Estimated sessions:** 2–3

---

## Phase 8 — Groceries / Travel / Events / Goals (M10)

| Checkpoint | What happens | Done when |
|---|---|---|
| 8.1 | Grocery list + calculator. | Basic list works. |
| 8.2 | Travel checklist. | Basic checklist works. |
| 8.3 | Events + Year-End Goals. | Basic add/edit works for both. |

**Estimated sessions:** 3–4

---

## Phase 9 — Shared Expenses / Household Linking (M3, M11)

*(This depends on the Phase 0.1 sync decision — the hardest technical part of the whole project.)*

| Checkpoint | What happens | Done when |
|---|---|---|
| 9.1 | Set up the chosen sync/backend service (step-by-step, free tier). | The service is live and connected — Claude confirms with a simple test. |
| 9.2 | Link two profiles/phones together. | Two phones show the same test data. |
| 9.3 | Shared expense ledger + settle-up. | Splitting a cost and settling up works between two linked profiles. |

**Estimated sessions:** 5–8 (this is the most technically involved phase — expect more back-and-forth)

---

## Phase 10 — Dashboard & Reports (M12–M13)

| Checkpoint | What happens | Done when |
|---|---|---|
| 10.1 | Core dashboard charts. | Charts render with your test data. |
| 10.2 | Reports pages (a few at a time — this phase may span several checkpoints). | Each report page shows correct numbers. |

**Estimated sessions:** 5–7

---

## Phase 11 — Settings (M14)

| Checkpoint | What happens | Done when |
|---|---|---|
| 11.1 | Categories, Payees, Rules. | You can manage categories on your phone. |
| 11.2 | Notifications (native push). | A test notification appears when a bill is "due soon." |
| 11.3 | Security & Household & Data (backup/export/import). | You can export your data as a backup file. |

**Estimated sessions:** 3–5

---

## Phase 12 — Polish & Real-Device Testing (M15)

| Checkpoint | What happens | Done when |
|---|---|---|
| 12.1 | Offline behavior, accessibility, touch sizing pass. | App still works with no internet; buttons are easy to tap. |
| 12.2 | Full run-through of every tab against the web app, fixing mismatches. | Claude and you go tab-by-tab confirming behavior matches. |

**Estimated sessions:** 3–5

---

## Phase 13 — Getting the App Onto Your Phone for Real (Publishing)

| Checkpoint | What happens | Done when |
|---|---|---|
| 13.1 | Use Expo's free build service (EAS Build) to create a real installable app file. | You have an `.apk` (Android) or a TestFlight link (iPhone) to install. |
| 13.2 | (Optional, has real-world costs) Publish to Google Play / Apple App Store. | Claude explains this step is optional and involves paid developer accounts (Google: one-time ~$25; Apple: ~$99/year) — **not free**, so this is entirely your call, not required to have a working app on your own phone. |

**Estimated sessions:** 1–2 (for 13.1; installing your own app directly is completely free and doesn't require 13.2)

---

## Overall Timeframe Estimate

| | |
|---|---|
| **Total checkpoints** | ~45–65, grouped across 13 phases |
| **Estimated sessions needed** | ~45–70 conversations (varies — some checkpoints may need 2 conversations if something needs debugging) |
| **Realistic calendar time** | **Roughly 2–5 months**, working through this steadily (a few sessions a week), given you're spreading work across 20 accounts to manage message limits |

**Please treat this as a rough estimate, not a promise.** The real pace depends on:
- How often you're able to sit down and work through sessions
- How much back-and-forth is needed when something doesn't work on the first try (very normal in coding — nothing is "wrong" when this happens)
- How much of the optional/advanced stuff (like Phase 9's linking, or full CSV import) you choose to include versus simplify or skip

**A tip to go faster:** you don't have to build every feature from your web app. If you want a working app sooner, ask Claude at any point to help you pick a smaller "first version" (e.g., skip household linking and CSV import at first, add them later) — Claude can re-order the roadmap around that anytime you ask.

---

## Using this roadmap

Same as before: say **"go"** or **"continue"** in any session, after pasting your GitHub repo link. Claude re-checks the repo, figures out the next unfinished checkpoint, and walks you through it — explaining everything in plain English, giving you exact copy-paste steps, and ending with files to upload to GitHub plus an updated `PROGRESS.md`.
