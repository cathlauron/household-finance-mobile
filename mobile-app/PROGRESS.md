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

Phase 9 — Household Linking (M3) — ✅ COMPLETE. (M11, shared expense ledger, was explicitly SKIPPED by decision — see 9.3 below, not deferred.)
- 9.1 — Set up the chosen sync/backend service. ✅ COMPLETE, CONFIRMED WORKING ON A REAL DEVICE.
  - Sync service chosen: **Firebase** (Firestore, in "test mode" — wide-open rules for now, to be locked down with real security rules before this handles any real household data).
  - A free Firebase project was created (household-finance-mobile), Firestore Database was enabled in test mode, and a Web app was registered inside that Firebase project to get connection keys (firebaseConfig — these are not secret; they only identify which project to connect to, not a password).
  - `npm install firebase` was run inside mobile-app/.
  - `mobile-app/src/firebase.ts` initializes the Firebase app and exports `db` (a Firestore instance).
  - Verified end-to-end with a temporary test button (added and then fully removed from SettingsScreen.tsx same session — confirmed via grep returning zero results).

- 9.2a — Household key encryption + linking plumbing. ✅ COMPLETE. `npx tsc --noEmit` passed clean (no output).
  - **`src/household.ts`** — the core "how linking works" logic (data layer, no UI):
    - `generateHouseholdId()` — a random, non-secret ID identifying one shared household document in Firestore (like a folder name).
    - `generateHouseholdKey()` — the actual shared secret (32 random bytes) used to encrypt/decrypt the household's shared data. Generated once, when a household is first created.
    - `wrapHouseholdKey(householdKey, personalKey)` / `unwrapHouseholdKey(wrapped, personalKey)` — encrypts/decrypts the household key using one person's own passphrase-derived key (reuses `encryptJSON`/`decryptJSON` from encryption.ts), so two people with two different passphrases can each unlock the same shared household key with their own.
    - `saveHouseholdData(householdId, encryptedPayload)` / `loadHouseholdData(householdId)` — Firestore read/write for the actual encrypted household data itself, stored at `households/{householdId}`.
    - `saveWrappedHouseholdKey(username, householdId, wrappedKey)` / `loadWrappedHouseholdKey(username)` / `deleteWrappedHouseholdKey(username)` — Firestore read/write for each linked person's own wrapped copy of the household key, stored at `householdKeys/{username}`.
  - **`src/storage.ts`** — `ProfileIndexEntry` now has an optional `householdId` field. Added `updateProfileHouseholdId(username, householdId)`.
  - Not yet wired into `household.ts`'s Firestore layout above at the time of this checkpoint — see note under 9.2b, since 9.2b ended up using its own simpler code-based mechanism instead (see below).

- 9.2b-i — "Start linking" (generate & share a code). ✅ COMPLETE, CONFIRMED WORKING ON A REAL PHONE.
  - **New file `src/linking.ts`** — a different, simpler mechanism than the `household.ts` design from 9.2a (see Decisions below for why): a short 6-character link code (e.g. "7F3K9Q", using an unambiguous alphabet with no 0/O/1/I/L) that a person reads/texts/tells to the other phone directly.
    - `startHouseholdLink(username, model)` — generates a fresh random shared secret + a short code, encrypts the shared secret with a key derived from the code itself, encrypts the phone's own current household data with the shared secret, and uploads both (plus the host's username) to Firestore at `linkCodes/{code}`. Returns the code (to show on screen) and the raw secret (kept in memory for the next checkpoint).
  - **SettingsScreen.tsx** — added a "Start linking (get a code)" button under a new Household section, showing the generated code plus a plain-English instruction once generated.
  - Confirmed on-device: code generated, visible on screen.

- 9.2b-ii — "Join with a code" + comparison screen. ✅ COMPLETE, **CONFIRMED WORKING END-TO-END ON TWO REAL PHONES THIS SESSION.**
  - **`src/linking.ts`** — added `joinHouseholdLink(codeInput)`: looks up the code the first phone generated, uses the code to unwrap the shared secret, then uses that secret to unlock the first phone's uploaded data. Throws a plain, friendly Error if the code doesn't exist or fails to decrypt (e.g. mistyped), which the screen catches and displays.
  - **SettingsScreen.tsx** — added a "Join with a code" text input + button next to "Start linking." On success, shows a new comparison view: a plain-English one-line summary of both people's data (via new `summarizeModel()` helper — counts of people/income/bills/debts/loans/savings goals/accounts/etc., e.g. "4 bills, 2 debts, 1 savings goal") side by side, with three buttons: **Keep mine / Keep theirs / Merge both**.
  - **Important — what this checkpoint deliberately does NOT do yet:** tapping any of the three buttons currently only shows a "Choice recorded: ___. This will be made permanent in a future update." message. Nothing is actually saved, merged, or made shared yet — no data changes hands, no `ProfileIndexEntry.householdId` gets set, nothing changes in Firestore. This was intentional, to test and confirm the code-sharing + unlock-and-compare mechanism itself worked correctly before building the (bigger, more permanent, harder-to-undo) actual save/merge logic on top of it.
  - **Confirmed this session on two separate real phones:** Phone A tapped "Start linking," got a code. Phone B entered that code via "Join with a code," and the comparison screen correctly showed both phones' real data summaries side by side. Tapping each of the three choice buttons correctly showed the "Choice recorded" placeholder message. Nothing else changed on either phone, as expected/intended for this checkpoint.
  - `npx tsc --noEmit` passed clean (no output) before testing.

- 9.2c — Making "Keep mine / Keep theirs / Merge both" permanent, wiring DataContext to read/write shared household data going forward. ✅ COMPLETE, CONFIRMED WORKING END-TO-END ON TWO REAL PHONES THIS SESSION.
  - Full linking flow tested: host generates code (9.2b-i) → joiner enters code, sees an accurate comparison screen, picks "Merge both" → joiner's data correctly shows both profiles' items → host taps "I've shared this code — finish linking" → host correctly detects the joiner already finished and completes linking → host's data also shows both profiles' items.
  - Confirmed real two-way sync after linking: new items added on either linked profile appear on the other profile after switching.
- **9.3 (shared expense ledger + settle-up) — SKIPPED BY DECISION, not deferred.** The person confirmed this doesn't reflect how they manage money as partners — they share expenses without tracking who owes whom, so this feature isn't wanted. A scoping discussion (data model, netting logic, settle-up flow) happened this session but no code was written. Do not resurface this as a pending checkpoint in future sessions.

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone. "Amount Owed" card includes a third Loans line (borrowed loans only — "lent" loans excluded since that's money owed to you, not an expense) alongside the existing Bills and Debts lines, and the "Due in the Next 14 Days" list includes upcoming loan payments too. Confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice. Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. Scoped as its own future checkpoint.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE (Household section within it now superseded by Phase 9's real linking UI — see above)
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three (Categories with color-swatch picker and duplicate-name checking; Merchants & Payees with optional default category; Categorization Rules with up/down reorder arrows since rule order determines match priority, plus amount-range validation). Verified end-to-end on a real phone in an earlier session.
- 11.2 — Notifications (native push). ✅ COMPLETE, WITH FULL REAL ON-DEVICE CONFIRMATION. rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. Confirmed firing on a real physical device. The temporary "Send a test notification in 10 seconds" debug button has been removed from SettingsScreen.tsx, and the app was confirmed still working correctly (including real notifications) on-device afterward. Fully clean, no leftover debug UI.
- 11.3 — Security & Household & Data. ✅ COMPLETE (Household sub-section since replaced by real linking UI from 9.2b, see above).
  - **Security (change passphrase):** Verifies the current passphrase is correct first (re-derives a key from it and successfully decrypts existing data) before changing anything. Generates a brand new random salt, derives a new key from the new passphrase + new salt, re-encrypts all in-memory data with it, saves it, updates the profiles index with the new salt, and swaps the in-memory session key so future saves keep working without needing to sign out and back in. Confirmed on-device: changed passphrase, fully closed and reopened the app, signed in successfully with the new passphrase.
  - **Household:** Originally a one-line placeholder; now replaced with the real "Start linking" / "Join with a code" flow built in 9.2b (see Phase 9 above).
  - **Data (backup + clear):** "Save a backup" writes the full decrypted model to a JSON file via expo-file-system and opens the native share sheet via expo-sharing so the file can be saved to Files, emailed, etc. "Clear all data & start fresh" wipes all entries back to defaultModel() after a confirm step, while keeping the same username/passphrase. Both confirmed working on-device.
  - New files/changes: src/storage.ts (added updateProfileSalt, saveEncryptedProfileData/loadEncryptedProfileData), src/DataContext.tsx (added changePassphrase), src/screens/SettingsScreen.tsx (added Security/Household/Data sections). New dependency: expo-sharing (~14.0.8).
  - npx tsc --noEmit passed clean with zero errors.

---
## 📅 Session entry — Checkpoint 9.2c confirmed on two real phones; Checkpoint 9.3 scoped and then deliberately skipped

**What was done:**
- Ran the full linking flow test end-to-end on two real phones, following
  the plan laid out at the end of the previous session:
  - Phone (test1) started linking and got a code.
  - Phone (test2) joined with the code, saw an accurate side-by-side data
    comparison, and chose "Merge both" — confirmed both profiles' items
    correctly appeared afterward.
  - Phone (test1) tapped "I've shared this code — finish linking" and it
    correctly detected test2 had already finished, completing the link and
    pulling in the merged data.
  - Confirmed real two-way sync afterward: new items added on either
    linked profile showed up on the other after switching profiles.
- No code changes were needed — this session was pure on-device
  confirmation of code already written and marked code-complete last
  session.
- Discussed and scoped Checkpoint 9.3 (shared expense ledger + settle-up):
  proposed a 9.3a/9.3b/9.3c breakdown mirroring how 9.2 was split.
- **The person then decided not to build this feature at all** — as
  partners, they share expenses without tracking who owes whom, so a
  "who owes whom" ledger doesn't match how they manage money. This is
  recorded as a deliberate decision (see 📌 Decisions above), not a
  deferral — it should not be re-proposed in future sessions.

🧹 Code health
- No files changed this session.
- No new npm packages.
- No code was written or modified — this was a testing + scoping session.

⚠️ Known issues / gotchas (non-code)
- Firestore is still in test mode (wide-open rules) — now flagged as
  higher priority than before, since real shared data is now flowing
  through it via 9.2c (see Known issues above).
- All previously logged known issues still stand unchanged.

## 📅 Session entry — Checkpoint 9.2b-ii: "Join with a code" built AND confirmed on two real phones

**What was done:**
- Resolved last session's open design question by going with the simpler
  approach: linking starts from one phone's existing data as the shared
  starting point, rather than requiring both phones' data to already live
  in the cloud independently before a merge is possible.
- Added `joinHouseholdLink(codeInput)` to `src/linking.ts` — looks up the
  code, unwraps the shared secret using the code, then unwraps the host
  phone's uploaded data using that secret. Throws a plain Error on a bad/
  expired/mistyped code.
- Added a `summarizeModel()` helper to `SettingsScreen.tsx` — a short,
  human-readable one-liner counting people/income/bills/debts/loans/
  savings goals/accounts/trips/events/year-end goals for a given model,
  used to show "you have X, they have Y" without dumping raw data on
  screen.
- Added the "Join with a code" text input + button, and a new comparison
  view (shown once a code resolves successfully) with the two summaries
  side by side and three choice buttons: Keep mine / Keep theirs / Merge
  both.
- **Deliberately** wired the three choice buttons to only show a
  "Choice recorded — this will be made permanent in a future update"
  message for now, rather than actually saving/merging anything — so this
  checkpoint could be tested and confirmed safely before building the
  harder, harder-to-undo "make it permanent" logic on top of it.
- `npx tsc --noEmit` passed clean (no output) before testing.
- **Tested on two real phones this session, confirmed working:** Phone A
  generated a code via "Start linking." Phone B entered it via "Join with
  a code" and correctly saw both phones' real data summarized side by
  side. All three choice buttons correctly showed the placeholder
  confirmation message on tap. No unintended data changes on either phone.

🧹 Code health
- Files changed: `src/linking.ts` (added `joinHouseholdLink`),
  `src/screens/SettingsScreen.tsx` (added join UI, comparison screen,
  `summarizeModel()` helper, new state variables/handlers).
- No new npm packages.
- `npx tsc --noEmit` passed clean before on-device testing.

⚠️ Known issues / gotchas (non-code)
(All previously logged items still stand except where noted.)
- Firestore is **still running in test mode** (wide-open rules). This is
  now a real priority rather than a someday item — as of this session,
  actual shared household data (via Checkpoint 9.2c) is flowing through
  it on real devices.
- Loans with "Custom" recurrence are still excluded from the projection/
  Dashboard — unchanged, still a real data-model gap.
- Debt-side "feesPortion" still doesn't exist in the data model — Tax
  Summary's Interest & Fees figure still only covers loan late fees.
- Pasting an entire large file's contents in one `cat` command can
  silently truncate mid-file in this terminal (seen with SettingsScreen.tsx
  in the previous session) — splitting into smaller `cat`/`head` calls
  reliably works around it. Worth defaulting to smaller pastes for large
  files going forward.
- **The "Keep mine / Keep theirs / Merge both" choice is currently
  cosmetic only** — nothing is actually saved as a shared household yet.
  This is the very next piece of real work (see Next step below), not a
  bug — it was left this way on purpose so the code-sharing/unlock/compare
  mechanism could be verified working before layering the permanent,
  harder-to-undo save logic on top.

📌 Decisions made
- (All decisions from prior sessions still stand — see below.)
- **Household linking mechanism, revised from the original 9.2a plan:**
  rather than the `household.ts` (Checkpoint 9.2a) design — which assumed
  both phones' data could already be looked up independently in the cloud
  by username — Phase 9 ended up using a simpler, code-based mechanism
  instead (`src/linking.ts`, Checkpoint 9.2b): one phone generates a short
  human-shareable code, which is used to pass along both a fresh shared
  secret AND that phone's current data to the other phone. This sidesteps
  the "which phone's data is the real starting point" ambiguity that
  blocked progress last session, at the cost of the first phone's data
  becoming the de facto starting point for the shared household (the
  second phone's own separate existing data is not automatically pulled
  in — hence the "Keep mine / Keep theirs / Merge both" screen, which lets
  the person choose explicitly rather than the app silently picking one
  side). `household.ts` from 9.2a still exists and is unused for now — it
  may end up unnecessary depending on how the "make it permanent" step
  (9.2c) is implemented, or its wrap/unwrap helpers may still get reused
  there. Worth revisiting once 9.2c is scoped.
- **Household linking design**: one shared random "household key" (here:
  called the "shared secret" in linking.ts) per household — matching the
  original web app's own approach conceptually (one shared key, separately
  protected per person), even though the concrete mechanism
  (`linking.ts`'s short-code approach) differs from the original `household.ts`
  plan.
- Checkpoint 9.2 was deliberately split into sub-steps (9.2a → 9.2b-i →
  9.2b-ii → 9.2c) rather than attempted in one session, given how much is
  riding on getting the encryption/linking logic correct. This continues
  to pay off — 9.2b-ii was tested and confirmed working before any
  permanent/destructive logic was added on top of it.

- **Checkpoint 9.3 (shared expense ledger + settle-up) will NOT be built.**
  Decided this session: the person and their partner share expenses
  without tracking who owes whom, so a "who owes whom" ledger doesn't
  match how they actually manage money together. This is a deliberate
  scope decision, not a technical blocker — don't re-propose this feature
  in future sessions unless the person brings it up themselves.

▶️ Next step

1. **Write real Firestore security rules.** Still in test/wide-open mode —
   now a real priority, since Checkpoint 9.2c means actual shared
   household data is flowing through it on real devices as of this
   session.
2. **Payment Methods report checkpoint** (deferred from Phase 10.2) — requires
   adding a paymentMethod field to the data model (BillCycle, Debt cycles,
   LoanPayment, ManualTransaction) AND a real Cash/Debit/Credit picker UI on
   the relevant payment-logging screens and the manual transaction form, not
   just a new report file.
3. **Custom recurrence for Loans** — would need new fields on the Loan type
   (customStartDate/customFreq/customOccurrenceCount) plus a "Custom" option
   added to the Loans screen's recurrence dropdown, before balanceProjection.ts
   could even use it.
4. Smaller loose ends still flagged from earlier sessions: EF/FI calculators
   still don't auto-pull figures from Bills/Income; neither Travel nor Events
   converts a completed item into an actual logged expense/transaction yet
   (both currently only sync a savings goal target); debt-side "feesPortion"
   doesn't exist in the data model, so Tax Summary's Interest & Fees figure
   only covers loan late fees, not debt fees.
5. **Optional/deferred from earlier:** Checkpoint 6.3, CSV import for
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
  - mobile-app/src/household.ts — Household-key generation, wrap/unwrap (per-person encryption of the shared key), and Firestore read/write helpers for a `households/{householdId}` + `householdKeys/{username}` layout. Built in 9.2a; NOT currently used by the actual linking flow, which instead uses the simpler code-based mechanism in linking.ts (see Decisions above). May still be reused (fully or partially) when Checkpoint 9.2c is built.
  - mobile-app/src/linking.ts — **NEW this session (built across two sub-checkpoints).** The actual mechanism powering Phase 9's linking UI: `startHouseholdLink(username, model)` (9.2b-i) generates a short code + shared secret, encrypts and uploads the host's data to Firestore under that code. `joinHouseholdLink(codeInput)` (9.2b-ii) looks up that code, unwraps the shared secret, and unwraps the host's data. Both confirmed working end-to-end on two real phones this session. Nothing here makes any choice permanent yet — see 9.2c in Next step.
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math still Bills/Debts only — Loan type has no custom fields)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel(), and confirmed firing real notifications on a physical device (multiple sessions).
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers.
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data. Reused by household.ts and linking.ts for wrapping/unwrapping secrets/keys.
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index, incl. updateProfileSalt(), saveEncryptedProfileData(), loadEncryptedProfileData(), and (since 9.2a) householdId on ProfileIndexEntry + updateProfileHouseholdId() (not yet called anywhere — will be used in 9.2c).
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance() + loanOutstandingBalance(). Includes Loans (Monthly/Annual/One-time) in computeMonthEvents()/computeRunningBalances(), excluding "lent" loans and Custom-recurrence loans.
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; wired to rescheduleBillNotifications(); includes changePassphrase(). Not yet updated to read/write shared household data (that's Checkpoint 9.2c).
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
  - mobile-app/src/screens/SettingsScreen.tsx — Contains ALL of Phase 11: Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings (11.2, fully clean), Security (change passphrase) / Data (backup + clear all) sections (11.3), and now the real Household linking UI (Start linking / Join with a code / comparison + choice screen, built across 9.2b-i and 9.2b-ii). No leftover debug UI.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — includes expo-sharing (~14.0.8) and firebase.

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
