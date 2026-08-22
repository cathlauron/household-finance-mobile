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
- 1.4c — Auto-lock timer. ✅ Complete.
  - Added mobile-app/src/autoLock.ts — stores "auto-lock after N idle minutes" (default 5), with getAutoLockMinutes / setAutoLockMinutes so a future Settings screen can read and change this value.
  - Updated mobile-app/App.tsx to add two automatic lock triggers, both gated on a PIN actually being set up (same rule 1.4b used):
    1. App switched away from (backgrounded) → locks immediately, via React Native's AppState listener.
    2. No taps anywhere on screen for the configured number of minutes (5 by default) → locks via an idle timer that resets on every tap.
  - Confirmed working on a real Android phone via Expo Go: backgrounding the app locked it immediately, and idling triggered the lock screen after the timeout.

🔧 In progress

Nothing in progress right now — Phase 1 (Security & Sign-In) is fully complete. Ready to start Phase 2 — Getting Around the App (M4): bottom tab bar with all main sections, plus basic theming.

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
- Git: The mobile-app project was created inside the existing household-finance-mobile git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
- Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
- Dev workflow in Codespaces: Because this project runs in GitHub Codespaces (cloud-based, not on the person's home network), Metro
cat > PROGRESS.md << 'EOF'
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
- 1.4c — Auto-lock timer. ✅ Complete.
  - Added mobile-app/src/autoLock.ts — stores "auto-lock after N idle minutes" (default 5), with getAutoLockMinutes / setAutoLockMinutes so a future Settings screen can read and change this value.
  - Updated mobile-app/App.tsx to add two automatic lock triggers, both gated on a PIN actually being set up (same rule 1.4b used):
    1. App switched away from (backgrounded) → locks immediately, via React Native's AppState listener.
    2. No taps anywhere on screen for the configured number of minutes (5 by default) → locks via an idle timer that resets on every tap.
  - Confirmed working on a real Android phone via Expo Go: backgrounding the app locked it immediately, and idling triggered the lock screen after the timeout.

🔧 In progress

Nothing in progress right now — Phase 1 (Security & Sign-In) is fully complete. Ready to start Phase 2 — Getting Around the App (M4): bottom tab bar with all main sections, plus basic theming.

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
- Git: The mobile-app project was created inside the existing household-finance-mobile git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
- Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
- Dev workflow in Codespaces: Because this project runs in GitHub Codespaces (cloud-based, not on the person's home network), Metro must always be started with tunnel mode:
    npx expo start --tunnel
  The plain `npx expo start` will start Metro on a local network address that the phone can't reach, causing a "Failed to download remote update" error. Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code.
- Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts too, rather than duplicating that logic.
- PIN quick-unlock (Checkpoint 1.4): Split into three small sub-steps (1.4a set-up, 1.4b wiring into Lock, 1.4c auto-lock timer) rather than one big change. The PIN is always a convenience re-entry method on top of an already-unlocked session — it is never a substitute for the real passphrase, and the app always keeps a "Use passphrase instead" fallback available from the PIN screen.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage under the key "autoLockMinutes" so a future Settings screen can adjust it without needing any structural changes — just call setAutoLockMinutes(newValue) from that screen once it exists.
- Checkpoint tracking discipline: A prior session completed 1.3/1.4a/1.4b but ended without running the "wrap up this session" step, so this file went stale for a while even though the work was safely committed to GitHub the whole time. Caught and corrected by cross-checking git log and the real files before proceeding, per the project's sync-check rule. No work was lost — this was a notes problem, not a data problem.

▶️ Next step

Phase 2 — Getting Around the App (M4), Checkpoint 2.1 — Bottom tab bar with all main sections (Home, Calendar, Accounts, To-Pay, Planning, Transactions, Insights, Income, Savings, Settings). Right now the app only has one placeholder Home screen after signing in — this checkpoint adds the actual tab navigation so each of those sections exists as its own (empty, for now) screen you can tap between.

Files uploaded to GitHub so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal, not the GitHub website)
  - mobile-app/src/types.ts — data model type definitions
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification (never stores the real PIN)
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5), readable/settable for a future Settings screen
  - mobile-app/src/storage.ts — reads/writes already-encrypted profile data and the profiles index
  - mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
  - mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
  - mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN)
  - mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
  - mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
  - mobile-app/App.tsx — wires all screens together, including the 'locked' state and the two auto-lock triggers
  - mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Future sessions should continue using that same terminal workflow.
