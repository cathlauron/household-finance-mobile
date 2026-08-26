Household Finance Mobile App — Progress Log (Auth → UI/UX → Publish)

This file tracks progress on 4-REMAINING-WORK-ROADMAP.md only (Phase A: Firebase Auth, Phase B: UI/UX Polish, Phase C: Publishing).

For everything already built before this — all 11 phases of the original app (security/sign-in, navigation, Calendar, Accounts, Bills/Debts/Loans, Transactions, Income/Savings, Groceries/Travel/Events/Goals, Household Linking, Dashboard/Reports, Settings) — see PROGRESS.md, which is now closed and kept only as a historical record. Nothing in PROGRESS.md is repeated here.

✅ Done

Phase A — Firebase Auth
- A.1 — Decision confirmed. Sign-in method: email + password via Firebase Authentication. The existing passphrase-based sign-in and data encryption stays exactly as it is — the passphrase still derives the encryption key, unchanged. Firebase Auth is added ALONGSIDE it, not replacing it: a real, logged-in Firebase account will now be required before the app can read/write Firestore at all, closing the "knowing the link code is enough" gap accepted at the end of Phase 9 (see PROGRESS.md). Existing profiles and the existing linked household must NOT be lost — that's the explicit job of Checkpoint A.5 later in this phase.

📌 Decisions made
- Checkpoint A.1 (Firebase Auth approach) is DECIDED: email + password via Firebase Authentication, layered on top of (not replacing) the existing passphrase/encryption system.
- Progress tracking for this remaining work (Phase A/B/C) is kept in this separate file, PROGRESS1.md, rather than appended to the original PROGRESS.md — done deliberately so the original file stays intact as a clean record of the first 11 phases.

⚠️ Known issues / gotchas
- (Carried forward context only, not new issues) Firestore rules currently rely on document-ID secrecy rather than real per-user auth — this is exactly what Phase A is closing. See PROGRESS.md for full detail on this accepted limitation as it stood before Phase A began.

▶️ Next step
- Checkpoint A.2 — Add Firebase Auth to the project (enable Email/Password sign-in in the Firebase console, add the Firebase Auth SDK code to the app).

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
