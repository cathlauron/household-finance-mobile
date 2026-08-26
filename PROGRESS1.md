Household Finance Mobile App — Progress Log (Auth → UI/UX → Publish)

This file tracks progress on 4-REMAINING-WORK-ROADMAP.md only (Phase A: Firebase Auth, Phase B: UI/UX Polish, Phase C: Publishing).

For everything already built before this — all 11 phases of the original app (security/sign-in, navigation, Calendar, Accounts, Bills/Debts/Loans, Transactions, Income/Savings, Groceries/Travel/Events/Goals, Household Linking, Dashboard/Reports, Settings) — see PROGRESS.md, which is now closed and kept only as a historical record. Nothing in PROGRESS.md is repeated here.

✅ Done

Phase A — Firebase Auth
- A.1 — Decision confirmed. Sign-in method: email + password via Firebase Authentication. The existing passphrase-based sign-in and data encryption stays exactly as it is — the passphrase still derives the encryption key, unchanged. Firebase Auth is added ALONGSIDE it, not replacing it: a real, logged-in Firebase account will now be required before the app can read/write Firestore at all, closing the "knowing the link code is enough" gap accepted at the end of Phase 9 (see PROGRESS.md). Existing profiles and the existing linked household must NOT be lost — that's the explicit job of Checkpoint A.5 later in this phase.
- A.2 — Firebase Auth plumbing added to the project (see full session entry below). Email/Password enabled in Firebase console; `src/firebase.ts` updated to also initialize and export `auth`; new `src/authFirebase.ts` created with reusable sign-up/sign-in/sign-out/current-user/subscribe functions. Not yet wired into any screen at the time this checkpoint closed.
- Household linking (built pre-Phase A, see PROGRESS.md) now confirmed working END-TO-END under real per-user Firebase Auth + uid-based Firestore security rules — see the "Fix: host-side finish linking" session entry below. Both the host and joiner side of linking (start code → join with code → mine/theirs/merge → finish linking on both phones) were tested together and both phones correctly end up "✓ Linked" sharing the same data.

📌 Decisions made
- Checkpoint A.1 (Firebase Auth approach) is DECIDED: email + password via Firebase Authentication, layered on top of (not replacing) the existing passphrase/encryption system.
- Progress tracking for this remaining work (Phase A/B/C) is kept in this separate file, PROGRESS1.md, rather than appended to the original PROGRESS.md — done deliberately so the original file stays intact as a clean record of the first 11 phases.
- PROGRESS1.md lives at the REPO ROOT (`/workspaces/household-finance-mobile/PROGRESS1.md`), NOT inside `mobile-app/` where PROGRESS.md and most code live. Confirmed this session after some confusion — `cd` to the repo root, or use the full path, whenever reading/writing this file from the Codespace terminal. All app code changes (src/, firestore.rules, etc.) still happen from inside `mobile-app/` as before.

⚠️ Known issues / gotchas
- (Carried forward context only, not new issues) Firestore rules currently rely on document-ID secrecy rather than real per-user auth for SOME collections — this is exactly what Phase A is closing. See PROGRESS.md for full detail on this accepted limitation as it stood before Phase A began. NOTE: as of this session, the `households` and `householdKeys` collections DO now have real uid-based rules (see firestore.rules) — it's unclear from this file alone whether `linkCodes` and every other collection have been fully reviewed/tightened yet as part of A.4. Worth explicitly re-checking A.4's status next session.
- **New, resolved-but-worth-remembering:** `getReactNativePersistence` needs a `// @ts-ignore` above its import line in `firebase.ts` due to a types-resolution quirk in Firebase ^12.18.0 with this project's TS config. If this ever needs touching again (e.g. a Firebase version upgrade), re-check whether the `@ts-ignore` is still needed or whether a newer Firebase version fixed the types export properly.
- **Resolved this session, but worth remembering the pattern:** Firestore security rules must be deployed separately from app code — editing `firestore.rules` in the repo does nothing on its own until `npx firebase-tools deploy --only firestore:rules` is actually run. See session entry below for the one-time setup this required (`.firebaserc`, `firebase.json`, `firebase login --no-localhost`).

▶️ Next step
- Re-confirm current status of Checkpoints A.3, A.4, and A.5 at the start of next session — based on code seen this session (Firebase Auth wired into linking flows, uid-based security rules already live on `households`/`householdKeys`), meaningful progress may already exist beyond what this file's "Done" section currently reflects. Once confirmed, update this file accordingly and proceed with whichever of A.3/A.4/A.5 is genuinely still unfinished.

Files in the repo (relevant to this phase)
- See PROGRESS.md for the full file inventory as of closing 3-ROADMAP.md. This file will only note NEW files or MEANINGFULLY CHANGED files as Phase A/B/C proceeds.

## 📅 Session entry — Checkpoint A.2: Firebase Auth added to the project

**What was done:**
1. **Firebase Console:** Email/Password sign-in method enabled under Build → Authentication → Sign-in method, for the household-finance-mobile project.
2. **Installed `@react-native-async-storage/async-storage`** — lets Firebase Auth remember a signed-in user between app opens on a phone, instead of signing them out every time.
3. **`src/firebase.ts` updated** — now also initializes Firebase Auth (via `initializeAuth` + `getReactNativePersistence`, wrapped in the same try/catch-on-double-init pattern already used for the Firestore `app` setup, to survive Metro fast-refresh reloads) and exports `auth` alongside the existing `db`.
   - Known quirk hit and resolved: `getReactNativePersistence`'s TypeScript types don't resolve cleanly from the main `firebase/auth` import path in this installed Firebase version (^12.18.0) under this project's module resolution settings — confirmed it's a types-only issue (the function exists and works at runtime), fixed with a `// @ts-ignore` comment directly above that one import line rather than changing behavior.
4. **New file `src/authFirebase.ts`** created — NOT yet used anywhere in the app (that's Checkpoint A.3). Exports:
   - `createFirebaseAccount(email, password)` — creates a new Firebase account.
   - `signInWithFirebase(email, password)` — signs in to an existing account.
   - `signOutFirebase()` — signs the current account out.
   - `getCurrentFirebaseUser()` — one-time check of who (if anyone) is signed in.
   - `subscribeToAuthChanges(callback)` — subscribe to sign-in/sign-out changes over time; returns an unsubscribe function.
5. `npx tsc --noEmit` confirmed clean (zero errors) after the fix.

**Important — nothing user-facing changed yet.** No screen currently calls any of this. Signing up, signing in, and the actual passphrase/Firebase-Auth relationship all still happen exactly as before Phase A started. This checkpoint only builds the underlying plumbing; A.3 is where the Sign In / Create Profile screens actually start using it.

🧹 Code health
- Files changed: `mobile-app/src/firebase.ts` (updated).
- New file: `mobile-app/src/authFirebase.ts`.
- New package: `@react-native-async-storage/async-storage`.
- `npx tsc --noEmit` passes clean.

⚠️ Known issues / gotchas
- **New, resolved-but-worth-remembering:** `getReactNativePersistence` needs a `// @ts-ignore` above its import line in `firebase.ts` due to a types-resolution quirk in Firebase ^12.18.0 with this project's TS config. If this ever needs touching again (e.g. a Firebase version upgrade), re-check whether the `@ts-ignore` is still needed or whether a newer Firebase version fixed the types export properly.
- (Carried forward) Firestore rules still rely on document-ID secrecy — this is what the rest of Phase A is closing.

📌 Decisions made
- No new decisions this checkpoint — A.1's decision (email+password via Firebase Auth, layered on top of the existing passphrase system) stands and is now partially implemented at the plumbing level.

▶️ Next step
- Checkpoint A.3 — Wire the Sign In / Create Profile screens to actually use `authFirebase.ts` (real Firebase sign-up/sign-in), so you can genuinely sign in/out with Firebase Auth on your phone. This is the first checkpoint where behavior actually changes for you as a user.

Files in the repo (relevant to this phase — see PROGRESS.md for everything before Phase A)
- mobile-app/src/firebase.ts — UPDATED. Now also sets up and exports `auth` (Firebase Authentication), alongside the existing `db` (Firestore).
- mobile-app/src/authFirebase.ts — NEW. Real Firebase Auth functions (createFirebaseAccount, signInWithFirebase, signOutFirebase, getCurrentFirebaseUser, subscribeToAuthChanges). Not yet called from any screen.
- mobile-app/package.json — added @react-native-async-storage/async-storage.

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
- Created `firebase.json` at the repo root pointing `firestore.rules` at the existing `mobile-app/firestore.rules` file. **CORRECTION noted this session:** initially both these files were created inside `mobile-app/` — need to double check next session whether they ended up in the right place relative to where `firestore.rules` actually lives, since PROGRESS1.md itself turned out to live at the repo root rather than inside `mobile-app/`. Re-verify `firebase.json`'s `firestore.rules` path is correct if the deploy command is ever run from a different working directory than this session used.
- Logged in via `npx firebase-tools login --no-localhost` (device-code flow, since Codespaces has no local browser) — this is a one-time login per Codespace; may need to be redone if the Codespace is rebuilt/recreated from scratch.
- Deployed successfully via `npx firebase-tools deploy --only firestore:rules`, run from inside `mobile-app/` (where `firestore.rules` lives).

**Result — confirmed working:** Retested the full linking flow end-to-end: Account B (joiner) entered Account A's code, picked "Merge both," and successfully linked, merging both accounts' data. Signed back into Account A — the pending code box reappeared automatically (Bug 1 fix), tapped "I've shared this code — finish linking," and it succeeded this time ("Linked! Loading your shared data…"), with Account A now also showing "✓ Linked" and seeing the same shared/merged data as Account B.

🧹 Code health
- Files changed: `mobile-app/src/storage.ts`, `mobile-app/src/linking.ts`, `mobile-app/src/screens/SettingsScreen.tsx`, `mobile-app/firestore.rules`.
- New files: `.firebaserc`, `firebase.json` (repo root — see correction note above about verifying exact location next session).
- `npx tsc --noEmit` confirmed clean before pushing.
- Firestore rules deployed live via `npx firebase-tools deploy --only firestore:rules` — confirmed "Deploy complete!" and tested working against the real production Firestore rules, not just locally.

📌 Decisions made
- No scope decisions this session — this was entirely a bugfix session for the existing (pre-Phase A) household linking feature, surfaced by testing it for the first time under Phase A's new Firebase Auth + uid-based security rules.

▶️ Next step
- Same as above: re-confirm real current status of A.3/A.4/A.5 next session before continuing, given how much Firebase-Auth-dependent code (uid-based rules, linking screens using real auth) already appears to exist.
