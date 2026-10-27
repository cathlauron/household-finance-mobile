# Finance Flow bug hunt

Found by reading the real code before Cath runs into them (rule 4 of
`.claude/skills/finance-flow-bug-check/SKILL.md`). Nothing here is fixed until its row
says so, with proof.

**How sure:** certain (read in the code, no doubt) / likely (the code allows it; needs a
check to prove) / possible (depends on timing or phone behaviour).
**How bad:** could lose data / breaks a task / confusing / cosmetic.

## Areas

| Area | Status |
|---|---|
| 1. Data safety: saving, syncing, storage limit, Clear all, backup export | Done 2026-10-22 (part 1) |
| 1b. Data safety: leaving / dissolving a household, linking, recovery key, Firestore rules | Next (needs a Firebase test setup; see 'Ideas') |
| 2. Home | Done 2026-10-22 (H-08, H-09, H-11; Home opens with older and full data, amounts checked) |
| 3. Transactions | Done 2026-10-22 (H-16, H-17) |
| 4. To-Pay (Bills / Debts / Loans) | Checked 2026-10-22: payments, carry-over, undo, Feb 29 yearly bills, Still-to-pay total, overdue - no new bugs found |
| 5. Plan pages (Savings, Goals, Shared, Groceries, Travel, Events) | Done 2026-10-22: all open with older and full data, amounts checked (H-22) |
| 6. Settings | Done 2026-10-22 (H-20); saves after pop-ups checked |
| 7. Sign-in / unlock / linking screens | Done 2026-10-22: H-18 fixed; sign-in reviewed (wrong password vs missing account vs someone else's username handled). Low-priority note H-19 |
| 8. Notifications and the calendar | Reviewed 2026-10-22: reminders skip past times and logged paydays; calendar months change by swipe (checked on Cath's phone in L/M). Notifications themselves need a real phone |

## Good news first (checked 2026-10-22)

The progress log's "Known issues" still lists three data risks as "NONE fixed yet". The real
code says otherwise:
- **RISK 3 (two phones saving at once) is handled.** Every save reads the online copy and
  merges both phones' changes in one step (`household.ts` saveHouseholdDataChecked,
  `DataContext.tsx` pushHousehold, `merge3.ts`, 12 logic checks in `tests/merge3.test.mjs`).
  Changes made offline are merged, not thrown away.
- **RISK 1 (huge receipt photos) is partly handled.** Receipts are shrunk before saving
  (`avatars.ts` makeReceiptDataUri). They are still big for the space available: see H-02.

## Findings, area 1 (data safety), ranked

| id | What Cath would see | How sure | How bad | Where |
|---|---|---|---|---|
| H-01 | In a shared household, Settings > Clear all data & start fresh wipes the household for BOTH people. The warning only says "this profile". | certain | could lose data | `screens/SettingsScreen.tsx` ~1877-1890 (button, warning), `handleClearAllData` ~1188 |
| H-02 | After about three receipt photos (plus profile photos), "Online storage is full" appears and the partner stops seeing new changes. Real households still keep everything in one online copy of about 1 MB; the "parts" system that removes that limit is switched on for test accounts only. One receipt can use about a quarter of the space. | certain | breaks syncing | `householdPartsSync.ts` line 27 (`partsEnabledFor`: usernames starting with "test"), `avatars.ts` RECEIPT_MAX_BASE64_CHARS = 200,000, `DataContext.tsx` STORAGE_LIMIT_CHARS = 1,000,000 |
| H-03 | If the connection drops partway through opening the app, Home opens EMPTY and as if not linked. Anything added then overwrites the phone's own saved copy and the personal online backup with almost-empty data. (The shared household online is not touched, so reopening normally brings everything back.) | likely | could lose data (backup copies) | `DataContext.tsx` loadModel, the `catch` near line 618 (falls back to `defaultModel()`) |
| H-04 | On a slow connection, "Sync Failed" pops up although the save may still finish a moment later. Nothing is lost (it is re-sent and merged), but the message is alarming and wrong. | likely | confusing | `DataContext.tsx` persistModel ~1103-1124 (8-second limit on the online save) |
| H-05 | Settings > Export backup puts ALL money details in a plain, unlocked file on the phone and never deletes it; the line right under it says everything is encrypted. | certain | privacy | `screens/SettingsScreen.tsx` handleExportBackup ~1161, footer text ~1852 |
| H-06 | A change made while offline and then closing the app straight away might not be kept: the phone's own copy is written in the background without waiting. | possible | could lose a change | `DataContext.tsx` persistModel ~1063-1091 |

## Status after 2026-10-22 lunch batch (Cath's decisions: H-01 owner-only + option b, H-02 a, H-05 a)

| id | Status | Proof |
|---|---|---|
| H-01 | Fixed: owner only; warning names the others; members told why + offered Leave household | Proven: `__tests__/ClearAllData.test.tsx` (11 checks) and on the real Settings page as member and owner `__tests__/SettingsClearAll.test.tsx` (old behaviour fails both). AG1/AG2 are look-arounds |
| H-02 | Fixed: bigger storage on for every account; the household only moves into it when every phone reports 2.2+ | Proven (rules): `tests/partsGate.test.mjs` (red-green). Needs your phone: AG4 (two phones) |
| H-03 | Fixed (Cath's yes, 2026-10-22): opens this phone's copy, still linked, reconnects in the background | Proven: `__tests__/OpenOnBadConnection.test.tsx` (fix off: empty + not linked; on: phone copy, linked, nothing empty saved). Needs your phone: AH1 |
| H-04 | Cath, 2026-10-22: leave as is | - |
| H-05 | Fixed: backup locked with the account password, cache copies removed | Proven: `tests/backupFile.test.mjs` and on the real Settings page `__tests__/SettingsBackup.test.tsx` (this morning's page fails both). Needs your phone: AG3 (the share sheet itself) |
| H-06 | Cath, 2026-10-22: leave as is | - |
| H-07 | NEW + fixed: hooks after the loading return could crash Income and Settings (one was from today's backup change) | Proven: `npm run test:hooks` (3 errors -> 0), now a permanent check |
| H-08 | NEW + fixed: Home card's last-month line ran past the right edge (Oct -> Nov, Jan -> Feb) | Proven: `tests/homeChart.test.mjs` (red-green) |
| H-09 | NEW + fixed: Home / bell / To-Pay stayed on yesterday when the app was left open overnight | Proven: `__tests__/useToday.test.tsx` (red-green); seen in the hidden browser across midnight. Needs your phone: AG5 |
| H-10 | NEW + fixed: a quick second tap on Save/Add while a form closed could add it twice | Proven: shared Save bar (13 forms) `__tests__/SheetBar.test.tsx`; New transaction form `__tests__/TransactionDoubleTap.test.tsx` (without the guard it saved twice, with it once). Account form: a guard was added too, but the double save could not be reproduced there (a check with the guard off still passed, so it was dropped); not yet confirmed |
| H-11 | NEW + fixed: spending exactly what an account held could show "-₱0.00" and "Over budget" (rose) | Proven: `tests/centavos.test.mjs` (4 red -> green) |
| H-12 | NEW + fixed: 9 screens could show raw technical error text | Proven: `tests/friendlyError.test.mjs` (red-green) |
| H-14 | NEW + fixed: clearing the Running-low box and pausing saved 0 and showed 0 mid-typing | Proven on the real Settings page: `__tests__/SettingsRunningLow.test.tsx` (fix off: saved 0; fix on: nothing saved). AG7 is a look-around |
| H-13 | Cath, 2026-10-22: leave as is. Was PARKED: account balances aren't rounded to centavos; a card can show ₱0.00 in red. Rounding them changes what's saved when balances are baked in, so ask first | - |

## Recommendations for the parked ones (Cath decides)

- H-03 (opening with a bad connection shows an empty household): instead of an empty
  household, open from the copy saved on this phone and keep trying to connect in the
  background (the same way the app already opens when it starts offline). Nothing empty is
  ever saved over your copies.
- H-04 (false "Sync Failed"): when a save takes longer than 8 seconds, show "Still saving…
  it will finish when the connection allows" instead of the alarm, and only say "Sync
  Failed" if it really didn't arrive.
- H-06 (offline change + closing the app at once): wait for the phone copy to finish saving
  before the change counts as saved (a fraction of a second).
- H-13: round account balances to centavos everywhere they're worked out.

| H-15 | Fixed (Cath: grey when zero): red money totals (Bills still to pay, Debts, Loans, Groceries Bought, trip paid, event spent, Transactions Out) are grey at ₱0.00; Out drops its minus at zero | Proven: `__tests__/ZeroAmountsGrey.test.tsx` (Debts + Groceries red before, grey after), `tests/moneyColor.test.mjs`; seen in the hidden browser |
| H-16 | NEW + fixed: an expense waiting for a refund, edited to Money in, kept its expected refund (refund badge on income; Mark received could add the money twice) | Proven: `__tests__/RefundDirection.test.tsx` (red: refund kept; green: dropped). List and transaction page also only show a pending refund on money out |
| H-17 | NEW + fixed: deleting a refund entry left its expense saying "received" | Proven: `tests/refundDelete.test.mjs` (red-green). All three delete paths now use one shared delete |
| H-18 | NEW + fixed (security, Cath's rule): 5 wrong PINs only switched the lock screen to password until the app was reopened, so a PIN could be guessed by reopening again and again. Now the PIN is blocked for 5 minutes (saved on the phone); password and fingerprint still work; the password lifts the block | Proven: `__tests__/PinLockout.test.tsx`, `__tests__/PinLockScreen.test.tsx` (this morning's code fails). Needs your phone: AJ1 |
| H-19 | Fixed (Cath agreed): signing in on a new phone to a shared household, a dropped connection while reading the household now says "Check your connection" instead of asking for the recovery key. A wrong password still goes to recovery | Proven: `tests/signInRestore.test.mjs`, `__tests__/SignInNewPhoneOffline.test.tsx` (old sign-in fails). Needs a new phone or a reinstall to see on a phone |
| H-20 | NEW + fixed: turning on reminders / weekly recap saved the data from before the phone's permission pop-up, quietly undoing anything that arrived meanwhile (e.g. the partner's change) | Proven: `__tests__/SettingsNotifyStale.test.tsx` (partner's bill lost before, kept after) |
| H-21 | Fixed (Cath agreed): 25 "Delete...?" pop-ups (and two similar spots: event Done, subscription status) now start from the newest data when tapped, so a change arriving while the pop-up is open is kept | Proven: `__tests__/DeleteConfirmStale.test.tsx` (partner's transaction lost before, kept after) |
| - | Screen sweep: all 18 main screens open with older data AND with a full household (no crashes, no NaN/undefined on screen, data shown) | `__tests__/OldDataScreens.test.tsx` (36 checks; proven to fail when data is missing) |
| H-22 | NEW + fixed: a pot's target date had the year on the Savings list but not on its own page ("by Aug 18" for Aug 2027) | Proven: `__tests__/PotTargetYear.test.tsx` (red-green) |
| - | Detail pages sweep: bill, subscription, debt, loan, credit + debit card, pot, transaction pages, and pages for something deleted elsewhere, all open with full and older data | `__tests__/OldDataScreens.test.tsx` |

## Small questions (not bugs, Cath's taste) - ANSWERED 2026-10-22: grey when zero (H-15)

- Zero amounts shown in red: To-Pay > Debts "Total debt logged ₱0.00" and Groceries "Bought
  ₱0.00" are red even at zero. Keep red, or grey when it's zero?

## Question for Cath (2026-10-22, evening) - ANSWERED: yes, year only when not this year (done, dateText)

- About 30 places show dates without a year ("Nov 11", "Aug 18"). Fine for dates this
  year, misleading for next year (a trip, event or goal in 2027). Add the year only when the
  date isn't in this year ("Aug 18, 2027", but still "Nov 11")?

## Question for Cath (2026-10-22, not a bug) - ANSWERED: stay as is (renames don't carry over)

- Renaming a category (Settings > Categories) only renames it in the list; past
  transactions, bills, rules and watched categories keep the old name. Your web app did
  this on purpose ("everywhere they're already used stays as free text"). Keep it, or should
  a rename carry over to everything that used the old name?

## Ideas

- Sign-in, linking and two-phone syncing can't be tested in Claude's workspace yet: the
  Firebase emulator download is blocked there (storage.googleapis.com). Firestore rules
  can still be read and reviewed.

## Decisions needed from Cath before fixing (data rules: ask first) - ANSWERED 2026-10-22

- H-01: in a shared household, should Clear all clear only your own things, clear the
  whole household with a stronger warning that names your partner, or not be offered?
- H-02: turn the "parts" system on for real households (it was built and tested on test
  accounts in 2.1), or limit receipts / profile photos instead?
- H-05: keep Export backup (and lock the file with your password, then delete it after
  sharing), or remove it until there's a matching Restore?

## Security review 2026-10-26 (independent reviewer agent, checked by Claude) - WAITING FOR CATH

Nothing below has been changed: security changes need Cath's OK first, and database rules
are published by Cath in the Firebase Console. Claude re-read the code for SEC-1 and SEC-2
and confirmed them; the others are the reviewer's reading of the code.

- SEC-1 (serious, confirmed) Joining a household: any signed-in account can make its own
  invite code that points at someone else's household (the code's create rule allows extra
  fields), and the join rule never checks who made the code. Anyone who knows a household's
  ID (a removed member, or anyone who saw an invite) could add themselves. Removing a member
  also keeps the same household key, so a removed member who rejoins can read everything.
  Proposed: rules check that the code was made by the household's owner/a member and only
  allow the expected fields (Cath publishes); later, a new household key when someone is
  removed (encryption change, needs her OK).
- SEC-2 (medium, confirmed) Bill / payday reminders with amounts keep arriving after signing
  out, a "sign out other device" or unlinking (only cleared when they're rescheduled).
  Proposed: clear them on sign-out / revoke / unlink.
- SEC-3 (medium) A pending invite keeps the raw household key in ordinary phone storage
  until linking finishes. Proposed: keep it in the phone's secure vault.
- SEC-4 (medium) Peer recovery hands the household key over under a 6-digit code, readable
  by every member, no expiry in the rules. Proposed: longer code / requester-only reading /
  expiry.
- SEC-5 (low-medium) Lock-screen PIN: after each 5-minute block, 5 new tries, forever; moving
  the phone's clock ends the block. Proposed: growing wait, password after N rounds.
- SEC-6 (low) Saved data has no tamper check (AES-CBC without a MAC); 100k PBKDF2 rounds is
  below today's advice. Encryption change: Cath's decision.
- SEC-7 (low) A financeflow://join link starts the first join step without asking. Proposed:
  "Join X's household?" first. Also: the link code is written to the log; the recent-apps
  preview shows amounts.
- Checked and OK: secure random everywhere, recovery key strength, vault storage for stay
  signed in / quick unlock, no keys in logs, backup file encrypted, members-only reads,
  this week's new code (no old screen or callback survives lock or sign-out).
