
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

Phase 3 — Calendar (M5)
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete. Built in an earlier session; confirmed present by reading CalendarScreen.tsx and balanceProjection.ts directly.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete. Built in an earlier session; confirmed present by reading AccountsScreen.tsx directly.

Phase 5 — Bills / Debts / Loans (M7)
- 5.1 — Add/edit/delete Bills. ✅ Complete this session.
  - New file: mobile-app/src/screens/BillsScreen.tsx — a scrollable list of bills (sorted by due date, undated ones last) plus a tap-to-open modal to add, edit, or delete a bill. Modeled directly on AccountsScreen.tsx's pattern (same modal/list structure, same styling approach) so it fits the rest of the app.
  - Fields covered this checkpoint: name, category, amount, due date (plain YYYY-MM-DD text for now — a nicer date picker can be swapped in later without changing the data shape), priority (none/low/medium/high), notes.
  - Every bill is currently saved as recurringType: 'onetime' with a single cycle — recurring schedules (monthly/annual/custom repeating bills) are intentionally deferred to Checkpoint 5.4 per the roadmap, so this stays a small, testable step. The underlying Bill/BillCycle shape already supports recurrence (see types.ts), so 5.4 will build on top of this rather than needing to redo it.
  - MainTabs.tsx updated: the "To-Pay" tab now points at BillsScreen instead of PlaceholderScreen. Debts and Loans (also part of Phase 5) still need their own screens — To-Pay will likely grow sub-tabs for Bills/Debts/Loans later, matching the web app's structure, but for now To-Pay = Bills only.
  - Confirmed working on a real phone: added a bill, saw it in the list, edited it, deleted it.

🔧 In progress

Phase 5 — Bills / Debts / Loans (M7), Checkpoint 5.2 — Add/edit/delete Debts. Not started yet. Bills (5.1) is the model to follow — same list + modal pattern, using the existing Debt type from types.ts.

How this was verified (prior session, still accurate)
An earlier session found PROGRESS.md had drifted out of sync with the actual code. Real work — the full Calendar tab (3.1–3.3) and the full Accounts tab (4.1–4.2) — had been built but never logged here. This was caught by:
1. Running `find mobile-app/src -type f -name "*.tsx" -o -name "*.ts" | sort` to see every file that actually exists.
2. Reading the full contents of CalendarScreen.tsx, AccountsScreen.tsx, balanceProjection.ts, MainTabs.tsx, and DataContext.tsx directly.
3. Confirming MainTabs.tsx still pointed every other tab at PlaceholderScreen — proving nothing beyond Phase 4 was hiding anywhere. (This session's find command confirmed the same thing again before starting Bills.)

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
- Git: The mobile-app project was created inside the existing household-finance-mobile git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
- Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
- Dev workflow in Codespaces: Because this project runs in GitHub Codespaces (cloud-based, not on the person's home network), Metro must always be started with tunnel mode, AND from inside the mobile-app folder (not the repo root):
    cd mobile-app
    npx expo start --tunnel
  Running `npx expo start` from the repo root fails with a "package.json does not exist" error, since the actual Expo project lives in the mobile-app subfolder, not the root. Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code.
- Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts too, rather than duplicating that logic.
- PIN quick-unlock (Checkpoint 1.4): Split into three small sub-steps (1.4a set-up, 1.4b wiring into Lock, 1.4c auto-lock timer) rather than one big change. The PIN is always a convenience re-entry method on top of an already-unlocked session — it is never a substitute for the real passphrase, and the app always keeps a "Use passphrase instead" fallback available from the PIN screen.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage under the key "autoLockMinutes" so a future Settings screen can adjust it without needing any structural changes — just call setAutoLockMinutes(newValue) from that screen once it exists.
- Theming approach: Colors live in theme.ts as plain exported objects (lightTheme/darkTheme, type ThemeColors); ThemeContext.tsx wraps the app and exposes useTheme() for any screen to read live colors from, with light/dark/device mode persisted via AsyncStorage. Fonts have NOT been ported yet — screens currently use default system fonts. The full 13-theme picker, custom colors, and font pairing options from the web app are deferred to a later checkpoint once a real Settings screen exists to host them.
- Screen pattern for simple list-based tabs (Accounts, Bills, and likely Debts/Loans/Savings next): a scrollable list of rows, each tappable to open an edit modal; a "+ Add X" button at the bottom opens the same modal blank. This keeps every list-style screen visually and structurally consistent, and makes each new one faster to build since the pattern is proven.
- Bill due dates (Checkpoint 5.1): Entered as plain typed text in YYYY-MM-DD format for now, with a basic format check before saving. A proper native date-picker UI is a nice-to-have polish item for later, not blocking any other checkpoint — the stored data shape (a plain date string) won't need to change when that's added.
- Checkpoint tracking discipline: PROGRESS.md has drifted out of sync with real code more than once now. Every session should end with a full PROGRESS.md rewrite (like this one) reflecting exactly what was verified via find/cat commands and confirmed working on-device — not just a quick note appended to the old version.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block (content included inside the same paste) — never by pasting code at a bare prompt, which bash tries to run as commands instead of saving.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, always first check whether that file already exists (e.g. via `cat filename` or `git log --oneline -- filename`) rather than assuming a fresh file is needed.
- Tab bar structure: Used @react-navigation/bottom-tabs directly rather than a custom-built tab bar, matching the web app's own eventual "Bottom navigation" layout preference. All 10 tabs are shown flat in the bar for now (no "More" overflow menu yet). To-Pay currently shows Bills only; Debts and Loans will likely need their own sub-tab or sub-navigation within To-Pay once built, to match the web app's To-Pay structure (see spec doc §8).

▶️ Next step

Phase 5 — Bills / Debts / Loans (M7), Checkpoint 5.2 — Add/edit/delete Debts. Build a DebtsScreen.tsx following the exact same pattern as BillsScreen.tsx (list + tap-to-edit modal), using the existing Debt type in types.ts. Decide at that point how Debts should be reachable from the To-Pay tab alongside Bills (e.g. a small sub-tab switcher at the top of To-Pay) — this hasn't been decided yet and should be discussed plainly with the person before building it, since it changes the To-Pay tab's structure.

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
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting, shared by Calendar and Accounts
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; every screen reads/writes the household model through this
  - mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
  - mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
  - mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN), themed
  - mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
  - mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
  - mobile-app/src/screens/PlaceholderScreen.tsx — generic "coming soon" screen for tabs not yet built, themed
  - mobile-app/src/screens/CalendarScreen.tsx — month grid, tap-a-day, running balance projection
  - mobile-app/src/screens/AccountsScreen.tsx — Cash/Debit/Credit account list + add/edit/delete modal
  - mobile-app/src/screens/BillsScreen.tsx — Bills list + add/edit/delete modal (NEW this session)
  - mobile-app/src/navigation/MainTabs.tsx — bottom tab navigator with all 10 sections, themed; To-Pay now shows Bills
  - mobile-app/App.tsx — wires all screens together via NavigationContainer + MainTabs + ThemeProvider, including the 'locked' state and the two auto-lock triggers
  - mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage, @react-navigation/native, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Every session should continue using that same terminal workflow. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
ENDOFFILE