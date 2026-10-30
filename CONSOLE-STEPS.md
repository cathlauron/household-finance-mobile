# Firebase Console steps for Cath (no code)

Open https://console.firebase.google.com/project/household-finance-mobile, then the left
menu: Build › Firestore Database › Data.

## 1. Remove old empty households (answer 13, 2026-10-30)

From now on the app removes the household made for an invite code that was never used.
Older ones may still be there. To find and remove them:

1. Click the `households` collection.
2. Click each household and look at its `members` field.
3. A household is an old empty one when ALL of these are true:
   - `members` has exactly 1 entry, and
   - that person is not using it: their `householdKeys` record (collection `householdKeys`,
     document = their username) has a different `householdId`, or there is none.
   Your own household and your partner's shared one have 2 members: never delete those.
4. For an old empty one: click the three dots next to the document name › Delete document.
   If it has a `parts` sub-collection, delete that too (Firebase asks).
If unsure about one, leave it: an empty record harms nothing. Ask Claude with its ID.

## 2. Someone emails "Delete my account" (answer 3)

1. Reply from support.financeflow00@gmail.com to check it's really them: it must come from
   the email address on the account.
2. Build › Authentication › Users: find the email. Note its User UID. Click the three dots ›
   Delete account.
3. Firestore Database › Data, delete these documents (document name = their username,
   unless it says UID):
   - `usernames/<username>` (this frees the username, answer 2)
   - `profileBackups/<username>`
   - `recoveryKeys/<username>`
   - `householdKeys/<username>`
   - `sessions/<UID>` (and its `devices` sub-collection)
4. Their household (`households/<id>`, the id is in their `householdKeys` record before you
   delete it):
   - only them in `members`: delete the household (and its `parts`).
   - shared: leave it. What they added stays for the others (your answer). The owner
     handover and the new household key happen when they leave in the app; for an email
     request, ask Claude for the steps for that household.
5. Reply to say it's done, within 30 days of the request.
