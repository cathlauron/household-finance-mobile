Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

✅ Done

Phase 0 — Decisions & Foundation
- 0.1 — Sync decision: Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design.
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
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7) — ✅ FULLY COMPLETE
- 5.1 — Add/edit/delete Bills. ✅ Complete.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
- 5.3 — Loans, fully complete (list/add/edit/delete, To-Pay pill, Payoff Simulator). ✅ Complete.
- 5.4 — Recurring schedules (monthly, custom, etc.) for Bills, Debts, and Loans. ✅ Complete.

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

Phase 10 — Dashboard & Reports (M12–M13) — 🔧 IN PROGRESS
- 10.1 — Core dashboard charts. ✅ Complete and confirmed working on a real phone.
- 10.2 — Reports pages. 🔧 IN PROGRESS — eight of the original nine report pages are done and confirmed working on a real phone (Monthly Close-out, Year in Review, Cash-Flow Forecast, Person Spending, Weekly Digest, Merchant Spending, Subscription Audit, Tax Summary). Still to build: Payment Methods — deliberately deferred, see note below.
  - Tax Summary: src/screens/reports/TaxSummaryReport.tsx, wired into ReportsScreen.tsx as an 8th pill. Shows year-picker, total income/expenses/saved, an "Interest & Fees Paid" card, and a full (not top-6) expense-by-category breakdown. Confirmed compiling clean via npx tsc --noEmit and confirmed working on a real phone.
  - IMPORTANT LIMITATION, flagged on-screen in the app itself: "Interest & fees paid" only counts loan late fees (a logged loan payment higher than that loan's expectedPayment — same math LoansScreen already uses). Debt-side fees are NOT included, because Debt/BillCycle in types.ts has no feesPortion field at all — there's no data to pull from. This is a real data-model gap, not a report bug.
  - Payment Methods report was explicitly NOT built, by the person's own choice. Root cause: types.ts has no paymentMethod field anywhere (not on BillCycle, Debt cycles, LoanPayment, or ManualTransaction) — the mobile app has never asked "how did you pay for this" anywhere in the UI. Building this report properly requires real screen work first — adding the field to the model AND adding an actual Cash/Debit/Credit picker to the bill/debt/loan payment-logging screens and the manual transaction form — not just a report file. Scoped as its own future checkpoint.

Phase 11 — Settings (M14) — ✅ FULLY COMPLETE
- 11.1 — Categories, Payees, Rules. ✅ COMPLETE. Full add/edit/delete for all three (Categories with color-swatch picker and duplicate-name checking; Merchants & Payees with optional default category; Categorization Rules with up/down reorder arrows since rule order determines match priority, plus amount-range validation). Verified end-to-end on a real phone in an earlier session.
- 11.2 — Notifications (native push). ✅ COMPLETE, INCLUDING REAL ON-DEVICE CONFIRMATION THIS SESSION. rescheduleBillNotifications() is called from both loadModel() and saveModel() in DataContext.tsx, non-blocking with silent-fail via .catch(() => {}), so scheduled alerts stay in sync with bill/debt/loan/setting changes automatically. This session, the "Send a test notification in 10 seconds" button on SettingsScreen.tsx was used to confirm a real notification actually fires on the person's physical phone — earlier sessions had only confirmed the wiring, not an actual on-screen notification, because Expo Go on Android didn't support expo-notifications as of SDK 53+. That limitation is apparently no longer blocking (or wasn't hit) — the test notification fired successfully. The temporary test button is no longer needed and should be removed in a future cleanup pass (not done this session, to avoid touching a working, just-tested file unnecessarily).
- 11.3 — Security & Household & Data. ✅ COMPLETE THIS SESSION. Built from scratch and confirmed working on a real phone:
  - **Security (change passphrase):** Verifies the current passphrase is correct first (re-derives a key from it and successfully decrypts existing data) before changing anything. Generates a brand new random salt, derives a new key from the new passphrase + new salt, re-encrypts all in-memory data with it, saves it, updates the profiles index with the new salt, and swaps the in-memory session key so future saves keep working without needing to sign out and back in. Confirmed on-device: changed passphrase, fully closed and reopened the app, signed in successfully with the new passphrase.
  - **Household:** One-line placeholder text noting that sharing data between phones is coming in a future update (Phase 9), matching the earlier Phase 0.1 decision. No functionality built here by design.
  - **Data (backup + clear):** "Save a backup" writes the full decrypted model to a JSON file via expo-file-system and opens the native share sheet via expo-sharing (new dependency, installed this session) so the file can be saved to Files, emailed, etc. "Clear all data & start fresh" wipes all entries back to defaultModel() after a confirm step, while keeping the same username/passphrase. Both confirmed working on-device — backup successfully triggered the share sheet, and Clear All Data successfully wiped entries while the same login still worked afterward.
  - New files/changes: src/storage.ts (added updateProfileSalt, saveEncryptedProfileData/loadEncryptedProfileData), src/DataContext.tsx (added changePassphrase), src/screens/SettingsScreen.tsx (added Security/Household/Data sections). New dependency: expo-sharing (~14.0.8).
  - npx tsc --noEmit passed clean with zero errors.

**PHASE 11 IS NOW FULLY COMPLETE.**

---

## 📅 Session entry — Checkpoint 11.3 built (Security, Household, Data) + Checkpoint 11.2 real on-device confirmation

This session scoped and built Checkpoint 11.3, the last remaining piece of Phase 11,
following a plain-English discussion of what "Security," "Household," and "Data"
should each mean given the app's current state (no household linking yet, per the
Phase 0.1/Phase 9 decision).

**What was built:**
1. Installed `expo-sharing` (`npx expo install expo-sharing`) — the one new
   dependency needed for the backup file's native share sheet. `expo-file-system`
   and `expo-document-picker` were already present.
2. `src/storage.ts` — added `updateProfileSalt()` (updates just one profile's salt
   in the profiles index, used after a passphrase change since a new passphrase
   always gets a fresh salt) and `saveEncryptedProfileData()`/
   `loadEncryptedProfileData()` (already-encrypted read/write helpers keyed by
   username).
3. `src/DataContext.tsx` — added `changePassphrase(currentPassphrase, newPassphrase)`.
   Verifies the CURRENT passphrase is genuinely correct (re-derives a key from it
   and attempts to decrypt existing saved data) before touching anything, so a wrong
   "current" passphrase can never lock someone out or corrupt data. Once verified:
   generates a new random salt, derives a new key from the new passphrase + new
   salt, re-encrypts everything currently in memory, saves it, updates the profiles
   index, and swaps the in-memory session key (`keyRef.current`) so the very next
   `saveModel()` call works correctly without a re-login.
4. `src/screens/SettingsScreen.tsx` — added three new sections: Security (current/
   new/confirm passphrase fields + Change passphrase button, with inline validation
   for length, matching, and "must be different from current"), Household (a
   one-line placeholder), and Data (Save a backup button using
   `expo-file-system`'s `writeAsStringAsync` + `expo-sharing`'s `shareAsync`, and a
   Clear All Data button with a two-step confirm that calls `saveModel(defaultModel())`).
5. `npx tsc --noEmit` — passed clean, no errors. One brief moment of uncertainty
   flagged proactively: the `expo-file-system/legacy` import path, given how new the
   installed package version was (SDK 54) — turned out to be correct, confirmed by
   the clean compile.
6. A minor terminal-scrollback scare: the person's pasted output only showed 2 of
   the 3 `cat >` commands and not the `expo install` command — asked them to run
   `ls src/storage.ts && cat package.json | grep expo-sharing` to confirm nothing
   was actually missing before proceeding to on-device testing. Both were confirmed
   present; it was purely terminal scrollback truncation on paste, not a real gap.
   (See the existing Known Issues entry about garbled/truncated terminal echo on
   large heredoc pastes — this is another confirmed instance of that same pattern,
   this time on the paste side rather than the write side.)

**On-device verification, all confirmed working by the person, in this order:**
1. **Backup first** (deliberately done before the riskier tests) — tapped "Save a
   backup" under Settings → Data, phone's native share sheet appeared, backup saved
   successfully.
2. **Passphrase change** — filled in current/new/confirm passphrase fields, tapped
   "Change passphrase," saw "Passphrase changed." Then fully closed the app (not
   just backgrounded) and reopened it, and signed in successfully using the NEW
   passphrase — confirming the change was real and durable, not just an in-memory
   illusion.
3. **Clear All Data** — tapped "Clear all data & start fresh," confirmed via the
   two-step confirm, and confirmed the app was still signed in under the same
   username/passphrase afterward with all entries wiped.

**Bonus outcome — Checkpoint 11.2's long-deferred on-device gap closed:** As part of
general Settings-screen testing this session, the person also used the pre-existing
temporary "Send a test notification in 10 seconds" button and confirmed a real
notification fired on their physical phone. Earlier sessions had only ever confirmed
the *wiring* (rescheduleBillNotifications() called correctly from loadModel/saveModel)
but explicitly could NOT confirm an actual on-screen notification, because Expo Go on
Android was documented as not supporting expo-notifications as of SDK 53+. That
either no longer applies, or wasn't actually hit — either way, real notifications are
now confirmed working. The temporary test button was intentionally left in place this
session (not removed) to avoid making an unrelated change to a screen that had just
been modified and tested — removing it is a small, safe cleanup item for a future
session.

🧹 Code health
- npx tsc --noEmit passed clean with zero errors after all three file changes.
- New dependency added: expo-sharing (~14.0.8), confirmed present in package.json.
- No existing files were modified beyond the three listed above (storage.ts,
  DataContext.tsx, SettingsScreen.tsx) — Categories/Payees/Rules sections already in
  SettingsScreen.tsx from Checkpoint 11.1 were left untouched and re-confirmed
  compiling clean as part of the same tsc run.

⚠️ Known issues / gotchas (non-code)
(All previously logged items still stand — repeating only what's new/relevant below.)
- CONFIRMED AGAIN THIS SESSION: pasted terminal output can silently drop lines/commands from view (this session's paste showed only 2 of 3 cat > commands and omitted the expo install line) without anything actually being missing — always spot-check with a direct ls/cat/grep command if a pasted transcript looks incomplete, rather than assuming something failed to run.
- The Expo Go / Android / expo-notifications limitation noted in earlier sessions (Checkpoint 11.2) may be stale or was not encountered this session — a real test notification fired successfully on a physical Android(?) phone via Expo Go this session. This isn't being marked as a confirmed reversal of that limitation (device/OS specifics weren't re-confirmed), but Checkpoint 11.2 no longer needs to wait for Phase 13's real installed build to be considered device-verified.
- The temporary "Send a test notification in 10 seconds" button in SettingsScreen.tsx is still present and should be removed in a future small cleanup session, now that on-device confirmation has actually happened.

📌 Decisions made
(All decisions from prior sessions still stand — repeating only what's new/relevant below; see repo history for the full original list if ever needed.)
- Checkpoint 11.3 scope decision (this session): Security = passphrase change only (no passphrase recovery, by design — matches the web app's own stance). Household = placeholder text only, explicitly not building anything that could conflict with the still-deferred Phase 9 household-linking decision. Data = backup export (share sheet) + Clear All Data (with confirm), no restore-from-backup flow built yet (not requested, not scoped this session).
- Test-before-clear discipline (this session, new): When testing both a backup feature and a destructive "clear all data" feature in the same session, always test/confirm the backup works FIRST, before touching the destructive action — this was suggested and followed successfully this session.
- Passphrase-change key-swap requirement (this session, new): Any future feature that changes the encryption key must also update the in-memory session key reference (not just re-save with the new key), otherwise the very next save in the same session would silently fail or use a stale key. This is now the pattern to follow for any future re-encryption logic.
- Test button cleanup deferred, not skipped (this session): The temporary notification test button was deliberately left in place rather than removed in the same session as unrelated Security/Data work, to keep the diff focused and avoid retesting an already-working, just-verified file for no reason.

▶️ Next step

**Phase 11 (Settings) is now fully complete — all three checkpoints (11.1, 11.2, 11.3) built and confirmed working on a real device.**

The next-biggest items, in no particular order:
1. **Phase 9 (Shared Expenses / Household Linking)** — the hardest technical part of the whole project, previously deferred at Phase 0.1. This is the natural next big phase.
2. **Small cleanup:** remove the now-unneeded "Send a test notification in 10 seconds" button from SettingsScreen.tsx, now that Checkpoint 11.2 has real on-device confirmation.
3. **Payment Methods report checkpoint** (deferred from Phase 10.2) — requires adding a paymentMethod field to the data model (BillCycle, Debt cycles, LoanPayment, ManualTransaction) AND a real Cash/Debit/Credit picker UI on the relevant payment-logging screens and the manual transaction form, not just a new report file.
4. **Loans gap in Dashboard/Calendar/Forecast:** Loans still aren't included in the Dashboard's "Amount Owed"/"Due Soon" cards or the Calendar's/Cash-Flow Forecast's running-balance projection — a pre-existing gap in balanceProjection.ts.
5. Smaller loose ends still flagged from earlier sessions: EF/FI calculators still don't auto-pull figures from Bills/Income; Custom recurrence math isn't implemented in recurrence.ts yet (Bills/Debts/Loans data model supports it, but due-date calculation doesn't); neither Travel nor Events converts a completed item into an actual logged expense/transaction yet (both currently only sync a savings goal target).
6. **Optional/deferred from earlier:** Checkpoint 6.3, CSV import for Transactions — explicitly optional per the roadmap, still not built.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal)
  - mobile-app/src/types.ts — data model types, including full Category/Payee/CategorizationRule types. Still no paymentMethod or feesPortion fields anywhere — see Phase 10.2 notes above.
  - mobile-app/src/recurrence.ts — shared recurrence helpers, used by Bills/Debts/Loans (Custom due-date math not yet implemented)
  - mobile-app/src/transactions.ts — buildTransactionsList(), sortTransactions(), transactionTotals()
  - mobile-app/src/autoLockSuppress.ts — setAutoLockSuppressed()/isAutoLockSuppressed()
  - mobile-app/src/pushNotifications.ts — local bill-due notification scheduling, confirmed wired into DataContext.tsx's loadModel()/saveModel(), and now confirmed firing real notifications on a physical device this session.
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5)
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook
  - mobile-app/src/storage.ts — reads/writes encrypted profile data and the profiles index. THIS SESSION: added updateProfileSalt(), saveEncryptedProfileData(), loadEncryptedProfileData().
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting + outstandingBalance()
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; confirmed wired to rescheduleBillNotifications(). THIS SESSION: added changePassphrase().
  - mobile-app/src/screens/CreateProfileScreen.tsx
  - mobile-app/src/screens/SignInScreen.tsx
  - mobile-app/src/screens/HomeScreen.tsx
  - mobile-app/src/screens/SetPinScreen.tsx
  - mobile-app/src/screens/PinUnlockScreen.tsx
  - mobile-app/src/screens/PlaceholderScreen.tsx
  - mobile-app/src/screens/CalendarScreen.tsx
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
  - mobile-app/src/screens/DashboardScreen.tsx
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
  - mobile-app/src/screens/SettingsScreen.tsx — Now contains ALL of Phase 11: Categories/Payees/Categorization Rules (11.1), Appearance mode picker + Notifications settings + temporary test-notification button pending removal (11.2), and THIS SESSION's new Security (change passphrase) / Household (placeholder) / Data (backup + clear all) sections (11.3). Phase 11 is fully complete.
  - mobile-app/src/navigation/MainTabs.tsx
  - mobile-app/App.tsx
  - mobile-app/package.json / package-lock.json — THIS SESSION: added expo-sharing (~14.0.8).

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
