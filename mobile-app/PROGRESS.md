Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

✅ Done

Phase 0 — Decisions & Foundation
- 0.1 — Sync decision: Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design. UPDATE: Phase 9 has now begun — see below. Firebase was chosen as the sync service.
- 0.2 — Blank Expo project created and confirmed working.
- 0.3 — Offline behavior and minimum phone OS version decided (see Decisions below).

Phase 1 — Security & Sign-In (M1–M2)
- 1.1 — Data model setup. Done.
- 1.2 — Create-profile & sign-in screens, with password protection. ✅ Complete.
- 1.3 — Encrypt the data at rest. ✅ Complete.
- 1.4a — Quick PIN unlock: set-a-PIN screen + safe storage. ✅ Complete.
- 1.4b — "Lock" uses the quick PIN screen instead of full sign-out, once a PIN is set up. ✅ Complete.
- 1.4c — Auto-lock timer. ✅ Complete. Backgrounding the app and idling both trigger the lock screen, confirmed on a real device.

Phase 2 — Getting Around the App (M4)
- 2.1 — Bottom tab bar with all 10 main sections. ✅ Complete.
- 2.2 — Basic theming (colors/light-dark mode) ported over from the web app. ✅ Complete.

Phase 3 — Calendar (M5)
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete. Running-balance projection includes Loan payments (Monthly/Annual/One-time recurrence — Custom still excluded, see note below), confirmed showing correctly on a real phone.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE
- 5.1 — Add/edit/delete Bills. ✅ Complete.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete. NOTE: "Custom" recurrence is only usable for Bills/Debts — the Loan type has no customStartDate/customFreq/customOccurrenceCount fields, and the Loans screen's own recurrence dropdown doesn't offer "Custom" as a choice. Monthly/Annual/One-time loans work fully everywhere.

Phase 6 — Transactions (M8) — ✅ CORE COMPLETE (CSV import still optional/outstanding)
- 6.1 — Unified transaction list. ✅ Complete.
- 6.2 — Manually add a transaction, incl. receipt photo attachment, edit/delete. ✅ Complete and confirmed working on a real phone.
- 6.2b — Manual transactions now have a real "Belongs to" person picker (matching Income's pattern), replacing the previous hardcoded owner: 'shared'. ✅ Complete and confirmed working on a real phone.
- 6.3 — CSV import: NOT yet done. Explicitly optional/deferrable per the roadmap.

Phase 7 — Income & Savings (M9) — ✅ FULLY COMPLETE
- 7.1 — Income sources with pay schedules. ✅ Complete.
- 7.2 — Savings goals + Emergency Fund/FI calculators. ✅ Complete and confirmed working on a real phone.

Phase 8 — Groceries / Travel / Events / Goals (M10) — ✅ FULLY COMPLETE
- 8.1 — Grocery list + calculator. ✅ Complete and confirmed working on a real phone.
- 8.2 — Travel checklist. ✅ Complete and confirmed working on a real phone, including real savings-goal auto-sync (tripFullChecklistTotal/syncTripSavingsGoal), verified in an earlier session.
- 8.3 — Events + Year-End Goals. ✅ Complete and confirmed working on a real phone, including Events' own savings-goal auto-sync (syncEventSavingsGoal), mirroring Travel's pattern, verified in an earlier session.

Phase 9 — Shared Expenses / Household Linking (M3, M11) — 🔧 IN PROGRESS
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore, in "test mode" — wide-open rules for now, to be locked down with real security rules in Checkpoint 9.2b before any real household data touches it).
  - A free Firebase project was created (household-finance-mobile), Firestore Database was enabled in test mode, and a Web app was registered inside that Firebase project to get connection keys (firebaseConfig — these are not secret; they only identify which project to connect to, not a password).
  - `npm install firebase` was run inside mobile-app/.
  - `mobile-app/src/firebase.ts` initializes the Firebase app and exports `db` (a Firestore instance).
  - Verified end-to-end with a temporary test button (added and then fully removed from SettingsScreen.tsx same session — confirmed via grep returning zero results).

- 9.2a — Household key encryption + linking plumbing. ✅ COMPLETE. `npx tsc --noEmit` passed clean (no output).
  - **New file `src/household.ts`** — the core "how linking works" logic, no UI yet:
    - `generateHouseholdId()` — a random, non-secret ID identifying one shared household document in Firestore (like a folder name).
    - `generateHouseholdKey()` — the actual shared secret (32 random bytes) used to encrypt/decrypt the household's shared data. Generated once, when a household is first created.
    - `wrapHouseholdKey(householdKey, personalKey)` / `unwrapHouseholdKey(wrapped, personalKey)` — encrypts/decrypts the household key using one person's own passphrase-derived key (reuses `encryptJSON`/`decryptJSON` from encryption.ts), so two people with two different passphrases can each unlock the same shared household key with their own.
    - `saveHouseholdData(householdId, encryptedPayload)` / `loadHouseholdData(householdId)` — Firestore read/write for the actual encrypted household data itself, stored at `households/{householdId}`.
    - `saveWrappedHouseholdKey(username, householdId, wrappedKey)` / `loadWrappedHouseholdKey(username)` / `deleteWrappedHouseholdKey(username)` — Firestore read/write for each linked person's own wrapped copy of the household key, stored at `householdKeys/{username}`, keyed by username so any device can look up "what household is this username linked to" using just username + passphrase (no separate device-pairing step).
  - **Updated `src/storage.ts`** — `ProfileIndexEntry` now has an optional `householdId` field (absent = not linked, same as every profile before this checkpoint). Added `updateProfileHouseholdId(username, householdId)` to set or clear it locally, mirroring the existing `updateProfileSalt()` pattern (does nothing if username not found, so it can't accidentally create a stray entry).
  - No new npm packages needed — `doc`/`getDoc`/`setDoc`/`deleteDoc` from `firebase/firestore` were already available from the `firebase` package installed in 9.1.

- 9.2b — Firestore security rules + the real "Link with another profile" screen. 🔧 IN PROGRESS, PAUSED ON A DESIGN DECISION — see this session's entry below. No code written yet this session.
  - 9.2c (wiring DataContext to actually read/write shared data when linked) is NOT started yet.
  - 9.3 (shared expense ledger + settle-up) depends on 9.2 being fully done first.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" card includes a third Loans line (borrowed loans only — "lent" loans excluded since that's money owed to you, not an expense) alongside the existing Bills and Debts lines, and the "Due in the Next 14 Days" list includes upcoming loan payments too. Confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice. Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. Scoped as its own future checkpoint.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three (Categories with color-swatch picker and duplicate-name checking; Merchants & Payees with optional default category; Categorization Rules with up/down reorder arrows since rule order determines match priority, plus amount-range validation). Verified end-to-end on a real phone in an earlier session.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION. rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. Confirmed firing on a real physical device. The temporary "Send a test notification in 10 seconds" debug button has been removed from SettingsScreen.tsx, and the app was confirmed still working correctly (including real notifications) on-device afterward. Fully clean, no leftover debug UI.
- 11.3 — Security & Household & Data. ✅ COMPLETE. Built from scratch and confirmed working on a real phone:
  - **Security (change passphrase):** Verifies the current passphrase is correct first (re-derives a key from it and successfully decrypts existing data) before changing anything. Generates a brand new random salt, derives a new key from the new passphrase + new salt, re-encrypts all in-memory data with it, saves it, updates the profiles index with the new salt, and swaps the in-memory session key so future saves keep working without needing to sign out and back in. Confirmed on-device: changed passphrase, fully closed and reopened the app, signed in successfully with the new passphrase.
  - **Household:** One-line placeholder text noting that sharing data between phones is coming in a future update (Phase 9), matching the earlier Phase 0.1 decision. Phase 9 has since begun (see above) — this placeholder text has NOT been updated/removed yet. Will be replaced with the real linking UI in Checkpoint 9.2b.
  - **Data (backup + clear):** "Save a backup" writes the full decrypted model to a JSON file via expo-file-system and opens the native share sheet via expo-sharing so the file can be saved to Files, emailed, etc. "Clear all data & start fresh" wipes all entries back to defaultModel() after a confirm step, while keeping the same username/passphrase. Both confirmed working on-device.
  - New files/changes: src/storage.ts (added updateProfileSalt, saveEncryptedProfileData/loadEncryptedProfileData), src/DataContext.tsx (added changePassphrase), src/screens/SettingsScreen.tsx (added Security/Household/Data sections). New dependency: expo-sharing (~14.0.8).
  - npx tsc --noEmit passed clean with zero errors.

**PHASE 11 IS FULLY COMPLETE — INCLUDING ALL CLEANUP. NO KNOWN LOOSE ENDS REMAIN IN THIS PHASE.**

---

## 📅 Session entry — Checkpoint 9.2b: paused on a real design question (no code written yet)

This session set out to build Checkpoint 9.2b (Firestore security rules +
the real "Link with another profile" screen), but stopped short of writing
any code once a genuine design problem surfaced — one worth confirming with
the person before proceeding, per this project's own "confirm before
anything that could lose data" rule.

**What was done:**
- Retrieved the exact current contents of `household.ts`, `storage.ts`,
  `encryption.ts`, `auth.ts`, `DataContext.tsx`, and `SettingsScreen.tsx`
  directly from the Codespace via `cat` (split into smaller pastes/`head`
  after a couple of pastes got silently truncated mid-file — see Known
  issues below). All six files confirmed retrieved in full.
- While planning the actual linking screen, identified a real gap: **each
  profile's data currently lives ONLY on that person's own phone**, encrypted
  in local AsyncStorage — nothing about an unlinked profile exists in
  Firestore yet. This is different from the reference web app, where all
  data (linked or not) already lived in one shared storage layer from the
  start, so linking there just changes which key encrypts already-centralized
  data. On mobile, two phones about to link have no shared place to look at
  each other's existing data from, so a true three-way "keep mine / keep
  theirs / merge" choice (like the web app offers) isn't achievable in one
  simple step the way it is on web.
- Proposed a simpler, honest first version instead: linking makes the
  person's OWN current data become the shared household's starting content;
  the other (invited) person's own existing local entries are left
  untouched on their phone but are not pulled in or merged — they'd simply
  stop showing once that profile switches over to shared data. The screen
  itself would say this plainly before anyone links.
- **Asked the person to confirm this approach (or ask for the fuller
  merge-capable version to be scoped instead) before writing any code.**
  Awaiting their answer — this is the actual blocker, not a technical one.

**Nothing was written to any file this session.** No Firestore rules
changed. No SettingsScreen.tsx changes. `household.ts`/`storage.ts` are
exactly as they were at the end of 9.2a.

🧹 Code health
- No files changed this session (design discussion + file retrieval only).
- No new npm packages.
- Nothing to type-check — no code was written.

⚠️ Known issues / gotchas (non-code)
(All previously logged items still stand except where noted.)
- Firestore is **still running in test mode** (wide-open rules, from
  Checkpoint 9.1) — unchanged this session.
- Loans with "Custom" recurrence are still excluded from the projection/
  Dashboard — unchanged, still a real data-model gap.
- Debt-side "feesPortion" still doesn't exist in the data model — Tax
  Summary's Interest & Fees figure still only covers loan late fees.
- **Confirmed again this session:** pasting an entire file's contents in
  one `cat` command can silently truncate mid-file in this terminal —
  happened twice with `SettingsScreen.tsx` specifically (cut off at the same
  point both times: right before the imports/component start). Splitting
  into multiple smaller `cat` commands, or using `head -n <N>` for just the
  top portion of a long file, reliably worked around it both times. Worth
  defaulting to smaller/split pastes for any file that seems to be cutting
  off, rather than repeating the same full-file `cat`.

📌 Decisions made
- (All decisions from prior sessions still stand — see below.)
- **Household linking design**: one shared random "household key" per
  household, wrapped separately per-person with each person's own
  passphrase-derived key — matching the original web app's own approach
  exactly, rather than inventing a different scheme for mobile.
- **Firestore document layout** for household linking:
  - `households/{householdId}` → `{ data: <encrypted household data>, updatedAt }`
  - `householdKeys/{username}` → `{ householdId, wrappedKey, updatedAt }`
  Keyed by username (not by device) so linking/unlinking works from any
  device just using username + passphrase, with no separate device-pairing
  step needed.
- Checkpoint 9.2 was deliberately split into three sub-steps (9.2a/9.2b/9.2c)
  rather than attempted in one session, given how much is riding on getting
  the encryption/linking logic correct.
- **NOT YET DECIDED, awaiting the person's answer:** whether Checkpoint 9.2b
  should ship with the simpler "your data becomes the shared starting point,
  other person's existing local data is left behind" linking behavior, or
  whether to first scope a fuller "keep mine / keep theirs / merge" flow
  (which would need each phone's data reachable in the cloud independently
  before a merge is even possible — a bigger feature, likely its own
  checkpoint).

▶️ Next step

**Checkpoint 9.2b cannot proceed with code until the person answers the
open design question above** (simple "my data becomes the shared start"
approach vs. scoping the fuller merge-capable version first). Once answered:

1. **Checkpoint 9.2b — Firestore security rules + the real "Link with
   another profile" screen.**
   - Write real Firestore security rules replacing test mode, restricting
     `households/{householdId}` and `householdKeys/{username}` access
     appropriately.
   - Build the actual "Link with another profile" UI in Settings (replacing
     today's one-line placeholder text), using the `household.ts` functions
     built in 9.2a: enter the other person's username + passphrase, generate/
     wrap/store the household key for both people, and update each person's
     local `ProfileIndexEntry.householdId` via `updateProfileHouseholdId()`.
     Exact data-handling behavior depends on the pending decision above.
2. **Checkpoint 9.2c — Wire DataContext to read/write shared data when
   linked.** Once a profile has a `householdId` set, DataContext's
   load/save logic needs to use `loadHouseholdData()`/`saveHouseholdData()`
   (household.ts) instead of `loadEncryptedProfileData()`/
   `saveEncryptedProfileData()` (storage.ts) — and needs to unwrap the
   household key (via the wrapped key saved in 9.2b + the person's own
   passphrase-derived key) to actually decrypt/encrypt with it.
3. **Checkpoint 9.3 — Shared expense ledger + settle-up.** Depends on all of
   9.2 being done first.
4. Once 9.2 is fully done, the Settings > Household placeholder text should
   be fully replaced by the real linking flow (partially addressed in 9.2b).
5. **Payment Methods report checkpoint** (deferred from Phase 10.2) — requires
   adding a paymentMethod field to the data model (BillCycle, Debt cycles,
   LoanPayment, ManualTransaction) AND a real Cash/Debit/Credit picker UI on
   the relevant payment-logging screens and the manual transaction form, not
   just a new report file.
6. **Custom recurrence for Loans** — would need new fields on the Loan type
   (customStartDate/customFreq/customOccurrenceCount) plus a "Custom" option
   added to the Loans screen's recurrence dropdown, before balanceProjection.ts
   could even use it.
7. Smaller loose ends still flagged from earlier sessions: EF/FI calculators
   still don't auto-pull figures from Bills/Income; neither Travel nor Events
   converts a completed item into an actual logged expense/transaction yet
   (both currently only sync a savings goal target); debt-side "feesPortion"
   doesn't exist in the data model, so Tax Summary's Interest & Fees figure
   only covers loan late fees, not debt fees.
8. **Optional/deferred from earlier:** Checkpoint 6.3, CSV import for
   Transactions — explicitly optional per the roadmap, still not built.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types. Still no paymentMethod or feesPortion fields anywhere — see Phase 10.2 notes above.
  - mobile-app/src/firebase.ts — Initializes the Firebase app (project: household-finance-mobile) and exports `db`, a Firestore instance.
  - mobile-app/src/household.ts — Household-key generation, wrap/unwrap (per-person encryption of the shared key), and Firestore read/write for both the shared household data (`households/{householdId}`) and each person's wrapped key (`householdKeys/{username}`). Not yet called from any screen. Confirmed re-verified byte-for-byte via `cat` this session — unchanged from 9.2a.
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math still Bills/Debts only — Loan type has no custom fields)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel(), and confirmed firing real notifications on a physical device (multiple sessions).
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers. Confirmed re-verified via `cat` this session — unchanged.
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data. Reused by household.ts for wrapping/unwrapping the household key. Confirmed re-verified via `cat` this session — unchanged.
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index, incl. updateProfileSalt(), saveEncryptedProfileData(), loadEncryptedProfileData(), and (since 9.2a) householdId on ProfileIndexEntry + updateProfileHouseholdId(). Confirmed re-verified via `cat` this session — unchanged from 9.2a.
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance() + loanOutstandingBalance(). Includes Loans (Monthly/Annual/One-time) in computeMonthEvents()/computeRunningBalances(), excluding "lent" loans and Custom-recurrence loans.
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; wired to rescheduleBillNotifications(); includes changePassphrase(). Not yet updated to use household.ts (that's Checkpoint 9.2c). Confirmed re-verified via `cat` this session — unchanged.
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx — running balance reflects Loans too, confirmed on a real phone.
  - mobile-app/src/screens/AccountsScreen.tsx
  - mobile-app/src/screens/BillsScreen.tsx
  - mobile-app/src/screens/DebtsScreen.tsx
  - mobile-app/src/screens/LoansScreen.tsx
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx
  - mobile-app/src/screens/ToPayScreen.tsx
  - mobile-app/src/screens/TransactionsScreen.tsx
  - mobile-app/src/screens/IncomeScreen.tsx
  - mobile-app/src/screens/SavingsScreen.tsx
  - mobile-app/src/screens/GroceriesScreen.tsx
  - mobile-app/src/screens/TravelScreen.tsx — real savings-goal auto-sync (tripFullChecklistTotal, syncTripSavingsGoal), confirmed working on a real phone.
  - mobile-app/src/screens/EventsScreen.tsx — real savings-goal auto-sync (syncEventSavingsGoal), mirroring TravelScreen.tsx's pattern, confirmed working on a real phone.
  - mobile-app/src/screens/GoalsScreen.tsx
  - mobile-app/src/screens/PlanningScreen.tsx
  - mobile-app/src/screens/DashboardScreen.tsx — "Amount Owed" shows Bills/Debts/Loans breakdown; "Due Soon" includes loan payments. Confirmed working on a real phone.
  - mobile-app/src/screens/InsightsScreen.tsx
  - mobile-app/src/screens/ReportsScreen.tsx — second-level pill-switcher between report pages (8 pills)
  - mobile-app/src/screens/reports/MonthlyCloseOutReport.tsx
  - mobile-app/src/screens/reports/YearInReviewReport.tsx
  - mobile-app/src/screens/reports/CashFlowForecastReport.tsx
  - mobile-app/src/screens/reports/PersonSpendingReport.tsx
  - mobile-app/src/screens/reports/WeeklyDigestReport.tsx
  - mobile-app/src/screens/reports/MerchantSpendingReport.tsx
  - mobile-app/src/screens/reports/SubscriptionAuditReport.tsx
  - mobile-app/src/screens/reports/TaxSummaryReport.tsx — Year-picker, total income/expenses/saved, interest & fees (loan late fees only, clearly labeled), full expense-by-category breakdown.
  - mobile-app/src/screens/SettingsScreen.tsx — Contains ALL of Phase 11: Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2, fully clean), and Security (change passphrase) / Household (placeholder — still not updated for Phase 9, to be replaced in 9.2b) / Data (backup + clear all) sections (11.3). No leftover debug UI. Confirmed re-verified in full via `cat` this session (across two pastes + a `head` due to truncation — see Known issues) — unchanged from Phase 11.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8) and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
