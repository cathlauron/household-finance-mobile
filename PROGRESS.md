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
- 1.4c — Auto-lock timer. ✅ Complete. Backgrounding the app and idling both trigger the lock screen, confirmed on a real device.

Phase 2 — Getting Around the App (M4)
- 2.1 — Bottom tab bar with all 10 main sections. ✅ Complete.
- 2.2 — Basic theming (colors/light-dark mode) ported over from the web app. ✅ Complete.
  - Theme infrastructure (mobile-app/src/theme.ts + mobile-app/src/ThemeContext.tsx) was actually built in an EARLIER session than PROGRESS.md previously reflected — this file had gone stale and didn't mention these files existed at all. Caught mid-session when App.tsx turned out to already import and use `useTheme()`/`ThemeContext` that PROGRESS.md said didn't exist yet.
  - theme.ts exports `lightTheme` / `darkTheme` (type `ThemeColors`) — colors ported from the web app's "Ink & Emerald" (Classic) theme: ink, inkDim, inkFaint, navy1–navy4, gold, goldDim, accent, error, errorBg, ok, orange.
  - ThemeContext.tsx provides `ThemeProvider` (wraps the whole app in App.tsx) and a `useTheme()` hook returning `{ colors, isDark, mode, setMode }`. Supports light/dark/device mode, persisted via AsyncStorage under the key "colorModePreference", and live-updates if mode is "device" and the phone's system theme changes.
  - This session's actual new work: wired the *already-existing* theme into the three screens that were still hardcoded with plain colors and hadn't been touched yet — mobile-app/src/navigation/MainTabs.tsx (tab bar + header colors), mobile-app/src/screens/PlaceholderScreen.tsx (background/text), mobile-app/src/screens/HomeScreen.tsx (background/text/buttons).
  - Confirmed working on a real Android phone via Expo Go: tab bar shows the ink/emerald palette instead of default blue, placeholder tabs show the warm cream background, Home screen buttons are styled correctly.
  - ⚠️ Mid-session mistake (caught and fixed, no data lost): at the start of this checkpoint, a new mobile-app/src/theme.ts was generated from scratch without first checking whether one already existed — it did, with different field names, and got overwritten. This broke ThemeContext.tsx's import. Caught immediately by checking git log and restoring the correct historical version via `git checkout d2e03e0 -- mobile-app/src/theme.ts`. Nothing was lost; this cost some back-and-forth but no code or data.

🔧 In progress

Nothing in progress right now — Phase 2 is fully complete (both 2.1 and 2.2). Ready to start Phase 3 — Calendar (M5), Checkpoint 3.1 — Month grid view.

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
- Theming approach: Colors live in theme.ts as plain exported objects (lightTheme/darkTheme, type ThemeColors); ThemeContext.tsx wraps the app and exposes useTheme() for any screen to read live colors from, with light/dark/device mode persisted via AsyncStorage. Fonts have NOT been ported yet — screens currently use default system fonts (no serif/sans pairing wired in). The full 13-theme picker, custom colors, and font pairing options from the web app are deferred to a later checkpoint once a real Settings screen exists to host them.
- Checkpoint tracking discipline: Twice now, work completed in one session didn't make it into PROGRESS.md accurately before the next session started — once for 1.3/1.4a/1.4b, and again this session for the theme.ts/ThemeContext.tsx work. Both times were caught safely via git history rather than causing real damage, but it's a reminder to ALWAYS run the full "wrap up this session" step (including a fresh, complete PROGRESS.md rewrite) before ending a session, even if it feels like a small change.
- File-creation discipline: Learned that pasting multi-line code directly at the bash `$` prompt fails silently/loudly (bash tries to run it as commands) rather than saving it. Files are always created either via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block (content included inside the same paste) or by opening the file in the Codespace's built-in editor — never by pasting code at a bare prompt.
- Overwrite-safety discipline (NEW, learned this session): Before creating any file with a `cat > filename << 'ENDOFFILE'` block, ALWAYS first check whether that file already exists (e.g. via `cat filename` or `git log --oneline -- filename`) rather than assuming a fresh file is needed. This session nearly broke a working theme system by blindly recreating theme.ts without checking first. No harm was done (git history made recovery easy), but this check should happen automatically from now on, every time, before any file-creation command is given.
- Tab bar structure: Used @react-navigation/bottom-tabs directly rather than a custom-built tab bar, matching the web app's own eventual "Bottom navigation" layout preference. All 10 tabs are shown flat in the bar for now (no "More" overflow menu yet).

▶️ Next step

Phase 3 — Calendar (M5), Checkpoint 3.1 — Month grid view. This replaces the Calendar tab's current "coming soon" placeholder with a real month grid the person can flip between months on, matching the web app's Calendar tab (see household-finance-app-spec-and-scale.md §8 and the .html reference file's calendarTabHTML()/renderCalendarGrid logic for the behavior to match).

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
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook; handles light/dark/device mode and persistence
  - mobile-app/src/storage.ts — reads/writes already-encrypted profile data and the profiles index
  - mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
  - mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
  - mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN), themed
  - mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
  - mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
  - mobile-app/src/screens/PlaceholderScreen.tsx — generic "coming soon" screen for tabs not yet built, themed
  - mobile-app/src/navigation/MainTabs.tsx — bottom tab navigator with all 10 sections, themed
  - mobile-app/App.tsx — wires all screens together via NavigationContainer + MainTabs + ThemeProvider, including the 'locked' state and the two auto-lock triggers
  - mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage, @react-navigation/native, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Every session should continue using that same terminal workflow.
