[... keep everything already in your existing PROGRESS.md above this line ...]

## ✅ Done
- Phase A — Firebase Auth: COMPLETE
  - A.1–A.4 (previous sessions): Firebase Auth wired in, Sign In/Create Profile
    screens use real Auth, Firestore security rules tightened to require a
    matching authenticated user (linkCodes, households, householdKeys).
  - A.5 (this session): New-device restore flow implemented and confirmed
    working live.
    - `cloudBackup.ts` — profile cloud backups now also store `salt` and
      (if linked) `householdId`, not just encrypted `data`. `data` is only
      meaningful/saved for unlinked profiles now.
    - `DataContext.tsx` — saveModel (both linked and unlinked branches),
      unlinkHousehold, and changePassphrase all keep the cloud backup's
      salt/householdId/data fields fresh on every relevant save.
    - `SignInScreen.tsx` — if no local profile exists for the entered
      username, falls back to checking the cloud backup. Verifies the
      passphrase is actually correct (via real decryption — either the
      personal backup, or by unwrapping the household key and decrypting
      shared household data for a linked profile) before setting up the
      device locally. Button shows "Restoring your data…" during this path.
    - `firestore.rules` — added a `profileBackups/{username}` match block.
      Deployed live via `npx firebase-tools deploy --only firestore:rules`.
      NOTE: this collection is intentionally readable by ANY authenticated
      user (not gated by ownerUid), same trust model as `linkCodes` — this
      is required because a brand-new device has no local record tying a
      username to anything yet. Safe because everything under `data` stays
      passphrase-encrypted; `salt`/`householdId` alone reveal nothing usable.
    - Tested live: refreshed an existing profile's backup, confirmed the
      `profileBackups` document appeared in the Firebase console with the
      right fields, then successfully signed into that same account on a
      device with no local data. Restore flow confirmed working.

## 📌 Decisions made
- (carry forward all previous decisions)
- profileBackups Firestore rule is auth-gated (any signed-in user can read
  any profileBackups doc), not ownership-gated — deliberate, matches
  linkCodes' existing trust model, safe because contents stay encrypted.

## ⚠️ Known issues / gotchas
- (carry forward all previous known issues)
- UNRESOLVED, FLAGGED NOT FIXED: `changePassphrase` in DataContext.tsx may
  not re-wrap the shared household key with the newly-derived key for a
  LINKED profile — only investigated/confirmed as a real risk, not yet
  fixed. Needs `household.ts` (the wrap/unwrap functions) reviewed in a
  dedicated session before touching this, since getting it wrong could
  actually lock someone out of their linked household. Do NOT change a
  passphrase while linked until this is checked.
- Old cloud backups saved before the A.5 salt field existed (or before
  today's firestore.rules deploy) will NOT support new-device restore
  until that profile saves again from a device that already has local
  data. Not a bug — just means "this only works going forward from
  whenever a profile's backup was last actually refreshed."

## 📁 Files in repo
- (carry forward full existing list)
- src/cloudBackup.ts — updated (salt + householdId fields, A.5)
- firestore.rules — updated (profileBackups match block added, A.5)

## ▶️ Next step
- Phase A is now fully complete. Recommended next: dedicated session to
  investigate + fix the changePassphrase/household-key-rewrap gap flagged
  above (bring household.ts into that session), OR move on to Phase B
  (UI/UX Polish) per 4-REMAINING-WORK-ROADMAP.md, starting with B.1 (the
  screen-by-screen audit pass) — person's call which to prioritize.

---

## Session entry — [today's date]

**What happened:** Fixed the firestore.rules gap from last session (added
missing `profileBackups/{username}` match block — the collection had no
explicit rule and was being silently blocked by the deny-all catch-all).
Deployed via `npx firebase-tools deploy --only firestore:rules` (firebase-tools
wasn't installed globally in this Codespace; used `npx firebase-tools`
instead of a bare `firebase` command, worked fine). Ran the full live test:
refreshed an existing profile's cloud backup with a trivial edit, confirmed
the profileBackups document appeared correctly in the Firebase console,
then signed into that same profile from a device with no local data and
confirmed the "Restoring your data…" flow worked end to end.

**Outcome:** Checkpoint A.5 confirmed complete. Phase A (Firebase Auth) is
now fully closed out per 4-REMAINING-WORK-ROADMAP.md.

**Flagged, not fixed:** changePassphrase may not re-wrap the household key
for linked profiles — see Known issues above.
