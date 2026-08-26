Household Finance Mobile App — Progress Log (Auth → UI/UX → Publish)

This file tracks progress on 4-REMAINING-WORK-ROADMAP.md only (Phase A: Firebase Auth, Phase B: UI/UX Polish, Phase C: Publishing).

For everything already built before this — all 11 phases of the original app (security/sign-in, navigation, Calendar, Accounts, Bills/Debts/Loans, Transactions, Income/Savings, Groceries/Travel/Events/Goals, Household Linking, Dashboard/Reports, Settings) — see PROGRESS.md, which is now closed and kept only as a historical record. Nothing in PROGRESS.md is repeated here.

✅ Done

Phase A — Firebase Auth
- A.1 — Decision confirmed. Sign-in method: email + password via Firebase Authentication. The existing passphrase-based sign-in and data encryption stays exactly as it is — the passphrase still derives the encryption key, unchanged. Firebase Auth is added ALONGSIDE it, not replacing it: a real, logged-in Firebase account will now be required before the app can read/write Firestore at all, closing the "knowing the link code is enough" gap accepted at the end of Phase 9 (see PROGRESS.md). Existing profiles and the existing linked household must NOT be lost — that's the explicit job of Checkpoint A.5 later in this phase.
- A.5 — DONE. `SignInScreen.tsx` now handles profiles that existed before Firebase Auth was added (Checkpoint A.2). If Firebase sign-in fails with a "credential not recognized" style error, the app checks whether a local profile exists for that username AND the passphrase just entered actually decrypts it. If both are true, it quietly creates the missing Firebase account (using the email + passphrase just typed) and finishes signing in — nothing further is needed from the person, and no separate "migration" screen exists. If the passphrase is wrong, this check fails too and the normal "incorrect" error shows, so this never helps someone who doesn't already know the correct passphrase. No changes were needed to `ProfileIndexEntry`/`storage.ts` — email is still never stored locally (by design, same as before), so this works entirely off what's typed at sign-in time.
- A.2 — Firebase Auth plumbing added to the project (see full session entry below). Email/Password enabled in Firebase console; `src/firebase.ts` updated to also initialize and export `auth`; new `src/authFirebase.ts` created with reusable sign-up/sign-in/sign-out/current-user/subscribe functions.
- A.3 — CONFIRMED DONE. `SignInScreen.tsx` and `CreateProfileScreen.tsx` are fully wired to real Firebase Auth (`signInWithFirebase` / `createFirebaseAccount`). Real Firebase failures (wrong email/password, account already exists, etc.) are checked and gated BEFORE any local passphrase/profile logic runs — so a real Firebase Auth session is genuinely required to get into the app now, not just cosmetically wired up.
- A.4 — CONFIRMED DONE. `firestore.rules` requires `request.auth != null` PLUS a matching uid on every real collection (`linkCodes`, `households`, `householdKeys`), with a deny-all fallback rule for anything else not explicitly covered. This session's earlier fix (see "Fix: host-side finish linking" session entry) added the narrower `members`-only update rule to `households` on top of this. The original "knowing the document ID is enough" gap from before Phase A is fully closed — confirmed, not just believed.
- Household linking (built pre-Phase A, see PROGRESS.md) now confirmed working END-TO-END under real per-user Firebase Auth + uid-based Firestore security rules — see the "Fix: host-side finish linking" session entry below. Both the host and joiner side of linking (start code → join with code → mine/theirs/merge → finish linking on both phones) were tested together and both phones correctly end up "✓ Linked" sharing the same data.

📌 Decisions made
- Checkpoint A.1 (Firebase Auth approach) is DECIDED: email + password via Firebase Authentication, layered on top of (not replacing) the existing passphrase/encryption system.
- Progress tracking for this remaining work (Phase A/B/C) is kept in this separate file, PROGRESS1.md, rather than appended to the original PROGRESS.md — done deliberately so the original file stays intact as a clean record of the first 11 phases.
- PROGRESS1.md lives at the REPO ROOT (`/workspaces/household-finance-mobile/PROGRESS1.md`), NOT inside `mobile-app/` where PROGRESS.md and most code live. Confirmed this session after some confusion — `cd` to the repo root, or use the full path, whenever reading/writing this file from the Codespace terminal. All app code changes (src/, firestore.rules, etc.) still happen from inside `mobile-app/` as before.

⚠️ Known issues / gotchas
- **Accepted minor limitation (A.5):** if someone mistypes their email during the one-time auto-migration described above, `createFirebaseAccount` will succeed anyway (since that mistyped email isn't registered to anyone), silently creating a second, different Firebase account rather than erroring. This doesn't expose or lose any data — the local passphrase-encrypted data on the device is untouched either way — but it can leave an orphaned, unused Firebase account behind. Not fixed, since it's a personal app with a small number of profiles; worth remembering if a Firebase user list ever looks like it has more accounts than expected.
- (Carried forward) `getReactNativePersistence` needs a `// @ts-ignore` above its import line in `firebase.ts` due to a types-resolution quirk in Firebase ^12.18.0 with this project's TS config. Re-check if this ever needs touching again (e.g. a Firebase version upgrade).
- (Carried forward) Firestore security rules must be deployed separately from app code — editing `firestore.rules` in the repo does nothing on its own until `npx firebase-tools deploy --only firestore:rules` is actually run.
- (Carried forward, now resolved per A.4 confirmation above) Firestore rules previously relied partly on document-ID secrecy — this is now closed for `linkCodes`, `households`, and `householdKeys`, with a deny-all fallback for everything else.

▶️ Next step
- Phase A (Firebase Auth) is now fully complete — A.1 through A.5 all confirmed done. Next: begin Phase B, Checkpoint B.1 — the screen-by-screen UI/UX audit, producing a written list of specific issues/opportunities to work through in later B checkpoints.

Files in the repo (relevant to this phase)
- See PROGRESS.md for the full file inventory as of closing 3-ROADMAP.md. This file will only note NEW files or MEANINGFULLY CHANGED files as Phase A/B/C proceeds.

## 📅 Session entry — Checkpoint A.2: Firebase Auth added to the project

**What was done:**
1. **Firebase Console:** Email/Password sign-in method enabled under Build → Authentication → Sign-in method, for the household-finance-mobile project.
2. **Installed `@react-native-async-storage/async-storage`** — lets Firebase Auth remember a signed-in user between app opens on a phone, instead of signing them out every time.
3. **`src/firebase.ts` updated** — now also initializes Firebase Auth (via `initializeAuth` + `getReactNativePersistence`, wrapped in the same try/catch-on-double-init pattern already used for the Firestore `app` setup, to survive Metro fast-refresh reloads) and exports `auth` alongside the existing `db`.
   - Known quirk hit and resolved: `getReactNativePersistence`'s TypeScript types don't resolve cleanly from the main `firebase/auth` import path in this installed Firebase version (^12.18.0) under this project's module resolution settings — confirmed it's a types-only issue (the function exists and works at runtime), fixed with a `// @ts-ignore` comment directly above that one import line rather than changing behavior.
4. **New file `src/authFirebase.ts`** created. Exports:
   - `createFirebaseAccount(email, password)` — creates a new Firebase account.
   - `signInWithFirebase(email, password)` — signs in to an existing account.
   - `signOutFirebase()` — signs the current account out.
   - `getCurrentFirebaseUser()` — one-time check of who (if anyone) is signed in.
   - `subscribeToAuthChanges(callback)` — subscribe to sign-in/sign-out changes over time; returns an unsubscribe function.
5. `npx tsc --noEmit` confirmed clean (zero errors) after the fix.

🧹 Code health
- Files changed: `mobile-app/src/firebase.ts` (updated).
- New file: `mobile-app/src/authFirebase.ts`.
- New package: `@react-native-async-storage/async-storage`.
- `npx tsc --noEmit` passes clean.

Files in the repo (relevant to this phase — see PROGRESS.md for everything before Phase A)
- mobile-app/src/firebase.ts — UPDATED. Now also sets up and exports `auth` (Firebase Authentication), alongside the existing `db` (Firestore).
- mobile-app/src/authFirebase.ts — NEW. Real Firebase Auth functions (createFirebaseAccount, signInWithFirebase, signOutFirebase, getCurrentFirebaseUser, subscribeToAuthChanges).

## 📅 Session entry — Fix: host-side "finish linking" was failing after Firebase Auth + uid-based Firestore rules went live

**Context:** Household linking (built pre-Phase A — see PROGRESS.md) was tested end-to-end for the first time under real Firebase Auth with uid-based Firestore security rules. Two separate bugs surfaced and were fixed.

**Bug 1 — host lost its in-progress link code on app restart / account switch.**
The code + shared secret generated by "Start linking" only ever lived in React component state, so closing the app, restarting the phone, or signing into a different account before tapping "finish linking" silently lost it, with no way to recover except starting over.

Fix:
- `src/storage.ts` — added `savePendingHostLink`, `loadPendingHostLink`, `clearPendingHostLink`, persisting the pending code+secret to AsyncStorage per-username.
- `src/linking.ts` — `startHouseholdLink()` now calls `savePendingHostLink()` right after successfully creating the link code; `finishHostLink()` calls `clearPendingHostLink()` once linking actually completes.
- `src/screens/SettingsScreen.tsx` — added a `useEffect` that restores `linkCode`/`linkSecretHex` from `loadPendingHostLink()` whenever the Settings screen opens for a not-yet-linked profile, so the "finish linking" code box reappears automatically instead of vanishing.

**Bug 2 — host's "finish linking" tap failed with "Couldn't finish linking — check your connection and try again."**
The real cause was NOT a connection issue — `SettingsScreen.tsx`'s catch block was swallowing the actual error. Root cause: `finishHostLink()` (in `src/linking.ts`) calls `addMemberToHousehold(householdId)` to add the host's uid to that household's `members` list in Firestore — but the existing `households` security rule's `allow update` required the writer to ALREADY be in `members`, which is impossible for someone who is, by definition, in the middle of joining. The write was rejected by Firestore's rules and silently shown as a generic error.

Fix — `firestore.rules`: added a second, narrower `allow update` rule for the `households` collection (Firestore OR's multiple `allow update` blocks together) that permits an authenticated user to update ONLY the `members` field, and only to add their own uid — nothing else about the document can change via this rule.

**Deploy tooling set up this session (previously never configured for this repo):**
- Firebase CLI wasn't installed globally; used via `npx firebase-tools ...` instead (no permanent install needed).
- Created `.firebaserc` at the repo root (`/workspaces/household-finance-mobile/.firebaserc`) pointing at project id `household-finance-mobile`.
- Created `firebase.json` at the repo root pointing `firestore.rules` at the existing `mobile-app/firestore.rules` file.
- Logged in via `npx firebase-tools login --no-localhost` (device-code flow, since Codespaces has no local browser) — this is a one-time login per Codespace; may need to be redone if the Codespace is rebuilt/recreated from scratch.
- Deployed successfully via `npx firebase-tools deploy --only firestore:rules`, run from inside `mobile-app/` (where `firestore.rules` lives).

**Result — confirmed working:** Retested the full linking flow end-to-end: Account B (joiner) entered Account A's code, picked "Merge both," and successfully linked, merging both accounts' data. Signed back into Account A — the pending code box reappeared automatically (Bug 1 fix), tapped "I've shared this code — finish linking," and it succeeded this time ("Linked! Loading your shared data…"), with Account A now also showing "✓ Linked" and seeing the same shared/merged data as Account B.

🧹 Code health
- Files changed: `mobile-app/src/storage.ts`, `mobile-app/src/linking.ts`, `mobile-app/src/screens/SettingsScreen.tsx`, `mobile-app/firestore.rules`.
- New files: `.firebaserc`, `firebase.json` (repo root).
- `npx tsc --noEmit` confirmed clean before pushing.
- Firestore rules deployed live via `npx firebase-tools deploy --only firestore:rules` — confirmed "Deploy complete!" and tested working against the real production Firestore rules, not just locally.

## 📅 Session entry — Confirmed real status of A.3, A.4, A.5

**What was done:** Reviewed the actual code (not just prior notes) to settle whether A.3/A.4 were genuinely finished and what A.5 actually still needs.

- **A.3 confirmed done:** `SignInScreen.tsx` and `CreateProfileScreen.tsx` both call real Firebase Auth functions (`signInWithFirebase`, `createFirebaseAccount`) and gate on their success/failure before any local passphrase logic runs.
- **A.4 confirmed done:** `firestore.rules` requires `request.auth != null` plus a uid match on `linkCodes`, `households`, and `householdKeys`, with a deny-all fallback rule for anything not explicitly listed.
- **A.5 confirmed NOT done, and genuinely necessary:** `ProfileIndexEntry` has no email/uid field, `CreateProfileScreen.tsx` only handles brand-new profiles, and `SignInScreen.tsx` has no fallback for a pre-A.2 profile with no matching Firebase account. This is a real gap, not a formality — flagged clearly rather than assumed fixed.

📌 Decisions made
- None yet — next session should confirm whether any real, currently-used profile predates Checkpoint A.2 before scoping how big the A.5 migration work needs to be.

▶️ Next step
- Checkpoint A.5 — scope and build the pre-A.2 profile migration path, pending the person confirming whether this affects real data currently in use.
