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
| 1b. Data safety: leaving / dissolving a household, linking, recovery key, Firestore rules | Next |
| 2. Home | To do |
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

## Decisions needed from Cath before fixing (data rules: ask first)

- H-01: in a shared household, should Clear all clear only your own things, clear the
  whole household with a stronger warning that names your partner, or not be offered?
- H-02: turn the "parts" system on for real households (it was built and tested on test
  accounts in 2.1), or limit receipts / profile photos instead?
- H-05: keep Export backup (and lock the file with your password, then delete it after
  sharing), or remove it until there's a matching Restore?
