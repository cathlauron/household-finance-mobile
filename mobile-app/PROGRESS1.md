
## 📅 Session entry — 2026-09-02: Checkpoint A.7.9 core goal achieved — both Maestro flows (create-profile, sign-in) passing cleanly end-to-end via Antigravity

**What happened:** Resumed A.7.9 with Antigravity handling all terminal/emulator work directly (no manual multi-terminal juggling needed this time). Found the `create-profile.yaml` test was being blocked by an unrelated Expo Go warning screen (a big red "expo-notifications not supported in Expo Go" error overlay that pops up automatically on every app launch when testing, unrelated to any real bug), plus the keyboard staying open and blocking the Create Profile button during automated taps.

**Fixes applied and confirmed:**
1. `App.tsx` — added `LogBox.ignoreLogs(['expo-notifications: Android Push notifications'])` so this expected, harmless testing-only warning no longer pops up a blocking full-screen overlay. Does not affect real app behavior — only suppresses this one known message during testing.
2. `flows/create-profile.yaml` and `flows/sign-in.yaml` — replaced an unreliable "tap near the top of the screen" keyboard-dismiss step with a proper `- hideKeyboard` command; updated the final success-screen assertion to match the app's real text (`"You're signed in, testuser!"`, matched via regex `"You're signed in.*"` / `".*signed in.*"`) instead of the placeholder `"Welcome"` text used in the first draft; added `extendedWaitUntil` (45s for create-profile, 75s for sign-in) before each assertion, since real PBKDF2 key derivation + Firebase Auth + Firestore lookups on emulator hardware genuinely take longer than Maestro's default wait.

**Result — both flows now pass 100% clean (0 warned, 0 failed):**
- `create-profile.yaml`: opens the app, fills email/username/password/confirm, dismisses keyboard, taps Create Profile, confirms landing on the signed-in home screen. Confirmed via Expo terminal log inspection (no `createFirebaseAccount failed` / `Firebase auth code` / `Firebase auth message` errors) that the account was genuinely created against the local Firebase emulator, not just that the UI looked right.
- `sign-in.yaml`: opens the app, fills email/username/password for the now-existing testuser account, dismisses keyboard, taps Sign In, confirms landing on the signed-in home screen.

Both runs used a genuinely fresh state each time (Firebase emulator's Auth/Firestore data cleared via its REST API, plus `adb shell pm clear host.exp.exponent` to reset the app itself) — not testing against leftover data from a previous run.

Committed and pushed via Antigravity (approved by Claude after reviewing the final diff, per this project's investigate-then-approve workflow).

🧹 Code health
- `npx tsc --noEmit`: clean throughout every step of this session.
- Both flows: 0 warned, 0 failed, exit code 0.
- Committed and pushed — confirmed clean `git status` afterward.

⚠️ Reminder for next real (non-testing) use of the app: `USE_FIREBASE_EMULATOR` in `mobile-app/src/firebase.ts` is currently `true` (needed for this testing work) — must be set back to `false` before signing into the app for any real, non-test purpose, or it will try to reach the local fake Firebase emulator instead of the real one.

