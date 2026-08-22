Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

✅ Done
Phase 0 — Decisions & Foundation
0.1 — Sync decision: Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design.
0.2 — Blank Expo project created and confirmed working.
Created via npx create-expo-app@latest mobile-app --template blank, using SDK 54 ("For learning with Expo Go").
Project lives in the mobile-app/ folder inside this repo.
Confirmed working: scanned the QR code with Expo Go on an Android phone, saw the default "Open up App.js to start working on your app!" screen. This proves the full pipeline (Codespaces → tunnel → phone) works end to end.
0.3 — Offline behavior and minimum phone OS version.
Offline behavior: The app works fully offline at all times — no internet connection is ever required to use it, since all data lives directly on the phone (consistent with the 0.1 no-sync decision). Whenever the phone does have an internet connection, the app will quietly make a backup copy of the data to the cloud, purely as a safety net (e.g. if the phone is lost, broken, or replaced). This backup is not the same as the two-phone syncing feature — it never shares data with another phone or profile, it just protects against losing your one phone's data. Real two-phone syncing stays deferred to Phase 9, as decided in 0.1.
Minimum phone OS version: Recent phones only — roughly the last ~4 years of iOS/Android. Very old devices are not a target, in exchange for a simpler, faster build.
Phase 1 — Security & Sign-In (M1–M2)
1.1 — Data model setup. Done.
Created mobile-app/src/types.ts — TypeScript definitions describing the "shape" of every piece of financial data: People, Income sources, Bills, Debts, Loans, Savings goals, Balance accounts (cash/debit/credit/investment/property/vehicle), manual Transactions, Categories, and app Settings. Matches the behavior of the original web app.
Created mobile-app/src/defaultModel.ts — a function that returns a brand-new, empty version of all that data, for when someone creates a new profile.
1.2 — Create-profile & sign-in screens, with password protection. ✅ Complete.
Built the sign-in / create-profile screens (src/auth.ts and src/screens/CreateProfileScreen.tsx, wired into App.tsx).
Confirmed working on a real Android phone via Expo Go: successfully created a profile, signed in, and signed out.
1.3 — Encrypt the data at rest. ✅ Complete.
Created mobile-app/src/encryption.ts (salt generation + encrypt/decrypt logic for a profile's data).
mobile-app/src/storage.ts now only ever saves/loads an already-encrypted string (saveEncryptedProfileData / loadEncryptedProfileData) — it never touches plain, unencrypted profile data.
Confirmed via git log: committed as "Checkpoint 1.3: encrypt profile data."
1.4a — Quick PIN unlock: set-a-PIN screen + safe storage. ✅ Complete.
Created mobile-app/src/pin.ts — hashes a 4–6 digit PIN with a random salt (via expo-crypto) and stores only that hash, never the real PIN. Includes isValidPinFormat, savePin, hasPinSetUp, verifyPin, removePin.
Created mobile-app/src/screens/SetPinScreen.tsx — the screen where a person chooses and confirms their PIN.
Wired into mobile-app/src/screens/HomeScreen.tsx via a "Set a Quick PIN" / "Change my PIN" button.
1.4b — "Lock" uses the quick PIN screen instead of full sign-out, once a PIN is set up. ✅ Complete.
Created mobile-app/src/screens/PinUnlockScreen.tsx — the lightweight "enter your PIN" screen shown when locked.
App.tsx now has a 'locked' screen state that shows PinUnlockScreen instead of signing the person all the way out.
HomeScreen's Lock button calls onLock (→ PIN screen) if a PIN is set, or falls back to a full "Sign out" if no PIN has been set yet — so locking with a PIN is never possible before one actually exists.
The PIN screen always has an escape hatch ("Use passphrase instead") that falls back to a genuine full sign-out — the PIN is never the only way back into the app.
Confirmed working on a real Android phone via Expo Go, through Checkpoint 1.4b.
🔧 In progress

Nothing in progress right now — ready to start Checkpoint 1.4c.

📌 Decisions made
Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
Git: The mobile-app project was created inside the existing household-finance-mobile git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
Minimum phone OS version: Recent phones only (~last 4 years).
Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
Dev workflow in Codespaces: Because this project runs in GitHub Codespaces (cloud-based, not on the person's home network), Metro must always be started with tunnel mode:
  npx expo start --tunnel

The plain npx expo start will start Metro on a local network address that the phone can't reach, causing a "Failed to download remote update" error. Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code.

Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts too, rather than duplicating that logic.
PIN quick-unlock (Checkpoint 1.4): Split into three small sub-steps (1.4a set-up, 1.4b wiring into Lock, 1.4c auto-lock timer) rather than one big change. The PIN is always a convenience re-entry method on top of an already-unlocked session — it is never a substitute for the real passphrase, and the app always keeps a "Use passphrase instead" fallback available from the PIN screen.
Checkpoint tracking discipline: A prior session completed 1.3/1.4a/1.4b but ended without running the "wrap up this session" step, so this file went stale (still said "next step: 1.3") even though the work was safely committed to GitHub the whole time. Caught and corrected at the start of the 1.4c session by cross-checking git log and the real files before proceeding, per the project's sync-check rule. No work was lost — this was a notes problem, not a data problem.
▶️ Next step

Checkpoint 1.4c — Auto-lock timer. Add two automatic triggers that lock the app (via the same PIN-lock flow from 1.4b) without the person tapping "Lock" themselves:

Locks immediately when the app is switched away from / backgrounded.
Locks automatically after a set period of idle time with no taps.

Both only ever apply if a PIN has already been set up (mirrors 1.4b's own guard). Idle timeout length is a decision still to be confirmed with the person before writing any code (options discussed: 1 / 5 / 15 minutes).

Files uploaded to GitHub so far
2-PROJECT-INSTRUCTIONS.md
3-ROADMAP.md
household-finance-app (3).html (reference web app)
household-finance-app-spec-and-scale.md
README.md
PROGRESS.md (this file)
mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal, not the GitHub website)
mobile-app/src/types.ts — data model type definitions
mobile-app/src/defaultModel.ts — empty/default data factory function
mobile-app/src/auth.ts — username sanitizing / sign-in helpers
mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
mobile-app/src/pin.ts — PIN hashing, storage, and verification (never stores the real PIN)
mobile-app/src/storage.ts — reads/writes already-encrypted profile data and the profiles index
mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN)
mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
mobile-app/App.tsx — wires all screens together, including the 'locked' state
mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Future sessions should continue using that same terminal workflow.