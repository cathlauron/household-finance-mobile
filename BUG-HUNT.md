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
| 2. Home | Part done 2026-10-22 (H-08, H-09, H-11) |
| 3. Transactions | To do |
| 4. To-Pay (Bills / Debts / Loans) | To do |
| 5. Plan pages (Savings, Goals, Shared, Groceries, Travel, Events) | To do |
| 6. Settings | To do |
| 7. Sign-in / unlock / linking screens | To do |
| 8. Notifications and the calendar | To do |

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
| H-01 | Fixed: owner only; warning names the others; members told why + offered Leave household | Proven: `__tests__/ClearAllData.test.tsx` (11 checks, red-green). Needs your phone: AG1/AG2 |
| H-02 | Fixed: bigger storage on for every account; the household only moves into it when every phone reports 2.2+ | Proven (rules): `tests/partsGate.test.mjs` (red-green). Needs your phone: AG4 (two phones) |
| H-03 | PARKED: needs Cath's yes (changes loading / saving) | - |
| H-04 | PARKED: needs Cath's yes (changes syncing messages) | - |
| H-05 | Fixed: backup locked with the account password, cache copies removed | Proven: `tests/backupFile.test.mjs` (red-green). Needs your phone: AG3 |
| H-06 | PARKED: needs Cath's yes (changes offline saving) | - |
| H-07 | NEW + fixed: hooks after the loading return could crash Income and Settings (one was from today's backup change) | Proven: `npm run test:hooks` (3 errors -> 0), now a permanent check |
| H-08 | NEW + fixed: Home card's last-month line ran past the right edge (Oct -> Nov, Jan -> Feb) | Proven: `tests/homeChart.test.mjs` (red-green) |
| H-09 | NEW + fixed: Home / bell / To-Pay stayed on yesterday when the app was left open overnight | Proven: `__tests__/useToday.test.tsx` (red-green); seen in the hidden browser across midnight. Needs your phone: AG5 |
| H-10 | NEW + fixed: a quick second tap on Save/Add while a form closed could add it twice | Proven: shared Save bar (13 forms) `__tests__/SheetBar.test.tsx`; New transaction form `__tests__/TransactionDoubleTap.test.tsx` (without the guard it saved twice, with it once). Account form: a guard was added too, but the double save could not be reproduced there (a check with the guard off still passed, so it was dropped); not yet confirmed |
| H-11 | NEW + fixed: spending exactly what an account held could show "-₱0.00" and "Over budget" (rose) | Proven: `tests/centavos.test.mjs` (4 red -> green) |
| H-12 | NEW + fixed: 9 screens could show raw technical error text | Proven: `tests/friendlyError.test.mjs` (red-green) |
| H-14 | NEW + fixed: clearing the Running-low box and pausing saved 0 and showed 0 mid-typing | Proven on the real Settings page: `__tests__/SettingsRunningLow.test.tsx` (fix off: saved 0; fix on: nothing saved). AG7 is a look-around |
| H-13 | PARKED: account balances aren't rounded to centavos; a card can show ₱0.00 in red. Rounding them changes what's saved when balances are baked in, so ask first | - |

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

## Small questions (not bugs, Cath's taste)

- Zero amounts shown in red: To-Pay > Debts "Total debt logged ₱0.00" and Groceries "Bought
  ₱0.00" are red even at zero. Keep red, or grey when it's zero?

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
