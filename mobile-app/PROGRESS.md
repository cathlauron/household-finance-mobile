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
- 2.2 — Basic theming (colors/light-dark mode) ported over from the web app. ✅ Complete. Confirmed working on a real Android phone via Expo Go.

Phase 3 — Calendar (M5) — ✅ ✅ ✅ ALL COMPLETE
- 3.1 — Month grid view. ✅ Complete.
  - mobile-app/src/screens/CalendarScreen.tsx — full month grid (Sun–Sat columns), today highlighted with a gold circle border, Prev/Next month navigation (wraps correctly across year boundaries), "Today" pill button.
- 3.2 — Tap a day to see what's happening that day. ✅ Complete.
  - Every real day cell is tappable, opening a popup (React Native Modal) with the full date, a Close button, and tap-outside-to-close.
- 3.3 — Running balance projection ("what will my balance be"). ✅ Complete.
  - mobile-app/src/balanceProjection.ts — new file. Ports the web app's computeRunningBalances/getMonthEvents logic (household-finance-app-spec-and-scale.md §7) to TypeScript: totalLiquidBalance() sums Cash+Debit+Credit accounts; computeMonthEvents() walks Bills, Debts, Income, manual transactions, and savings contributions for a given month (including full custom-recurrence support: daily/weekly/biweekly/monthly/yearly, with or without a finite occurrence count); computeRunningBalances() projects a per-day balance across the month from the account's "as of" date, in either direction; formatPeso() for currency display.
  - CalendarScreen.tsx now shows a "TOTAL BALANCE" banner at the top, a small projected balance under every day number in the grid, and the projected balance for that specific day inside the day-tap popup.
  - Confirmed working on a real Android phone via Expo Go.
  - Known current limitations (intentional, to be revisited later): Loans aren't included in the projection yet, since Loans don't have a due-date field in the data model yet (only Bills and Debts do) — this will be picked up once Loans gets its own due-date fields. Income only ever uses the *expected* payday amount, not a logged *actual* amount — that refinement waits for a real "log actual payday" screen.

🔧 In progress

Nothing in progress right now — Phase 3 is fully complete. Ready to start Phase 4, Checkpoint 4.1 — Add/edit Cash, Debit, Credit accounts.

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
- Git: The mobile-app project was created inside the existing household-finance-mobile git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
- Offline behavior: Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript (.ts files) inside mobile-app/src/, matching field names and behavior from the original web app's data shapes.
- Dev workflow in Codespaces: Because this project runs in GitHub Codespaces (cloud-based, not on the person's home network), Metro must always be started with tunnel mode, and it must be run from INSIDE the mobile-app folder, not the repo root:
    cd mobile-app
    npx expo start --tunnel
  Running `npx expo start` from the repo root fails with "ConfigError: The expected package.json path ... does not exist" because package.json lives inside mobile-app/, not at the top level. Always `cd mobile-app` first in a fresh terminal session before starting Metro. Always confirm the terminal shows an address ending in .exp.direct before scanning the QR code.
- Encryption approach: Uses crypto-js (imported in App.tsx for the WordArray type) plus expo-crypto (used directly in pin.ts for hashing). Salt generation lives in encryption.ts and is reused by pin.ts for PIN salts too, rather than duplicating that logic.
- PIN quick-unlock (Checkpoint 1.4): Split into three small sub-steps (1.4a set-up, 1.4b wiring into Lock, 1.4c auto-lock timer) rather than one big change. The PIN is always a convenience re-entry method on top of an already-unlocked session — it is never a substitute for the real passphrase, and the app always keeps a "Use passphrase instead" fallback available from the PIN screen.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage under the key "autoLockMinutes" so a future Settings screen can adjust it without needing any structural changes — just call setAutoLockMinutes(newValue) from that screen once it exists.
- Theming approach: Colors live in theme.ts as plain exported objects (lightTheme/darkTheme, type ThemeColors); ThemeContext.tsx wraps the app and exposes useTheme() for any screen to read live colors from, with light/dark/device mode persisted via AsyncStorage. Fonts have NOT been ported yet — screens currently use default system fonts (no serif/sans pairing wired in). The full 13-theme picker, custom colors, and font pairing options from the web app are deferred to a later checkpoint once a real Settings screen exists to host them.
- Calendar month math (Checkpoint 3.1): Standard plain-JavaScript Date math (no calendar library added) — new Date(year, month + 1, 0).getDate() gets the number of days in a month, and new Date(year, month, 1).getDay() gets which day of the week the 1st falls on, to figure out how many empty cells to pad the grid with at the start.
- Calendar day-tap popup (Checkpoint 3.2): Used React Native's built-in Modal + Pressable components rather than adding a new library. Selected day is tracked as a simple number-or-null piece of state (selectedDay) on CalendarScreen itself; the popup's visible prop is directly tied to "is selectedDay not null." Tapping the dark overlay outside the card closes the popup; tapping inside the card itself does nothing.
- Data loading architecture (needed for Checkpoint 3.3): Added mobile-app/src/DataContext.tsx — a React context that holds the decrypted household data model in memory once signed in/unlocked, and exposes it to any screen via useData(). Keeps username + derived encryption key in refs (not state) since they're only needed for the next save/load call, not for triggering re-renders. loadModel() decrypts and loads; saveModel() re-encrypts and persists; clearModel() wipes it from memory on lock/sign-out. This is the shared foundation every future data-driven screen (Bills, Debts, Accounts, etc.) will read from and write to — not something specific to Calendar.
- Running balance projection (Checkpoint 3.3): New file mobile-app/src/balanceProjection.ts, a close TypeScript port of the web app's computeRunningBalances/getMonthEvents/eventDelta functions. Reuses the exact same "walk from the accounts' as-of date, in either direction, summing daily deltas" approach as the original, rather than inventing a different calculation method. Deliberately excludes Loans (no due-date field yet) and actual-vs-expected income logging (no UI for it yet) — both are flagged as known gaps to revisit once their own data/screens exist, not silent omissions.
- Checkpoint tracking discipline: ALWAYS run the full "wrap up this session" step (including a fresh, complete PROGRESS.md rewrite) before ending a session, even for small changes.
- File-creation discipline: For a full-file rewrite, opening the file in the Codespace's built-in editor (`code filename`), selecting all, deleting, and pasting the new content is the reliable approach — safer than pasting large multi-line code directly at the bash `$` prompt.
- Overwrite-safety discipline: Before assuming a file's current shape, always cat (or open) it first rather than guessing.
- Tab bar structure: Used @react-navigation/bottom-tabs directly rather than a custom-built tab bar, matching the web app's own eventual "Bottom navigation" layout preference. All 10 tabs are shown flat in the bar for now (no "More" overflow menu yet).
- Session-start verification discipline: A private GitHub repo can't be fetched by a plain public web request — that's expected and not a red flag. When that happens, the person's own pasted terminal output (git status showing "up to date" + "clean") is treated as sufficient proof of sync on its own.
- Mid-session recovery discipline (new this session): If a session gets cut off before "wrap up this session" is run, the next session should not assume PROGRESS.md is accurate just because git status is clean — a clean git status only proves Codespace and GitHub agree with *each other*, not that PROGRESS.md's own description of what's built is current. When the person reports work was done that PROGRESS.md doesn't mention, the correct move is to ask them to cat the actual file(s) in question and verify directly, before updating anything.

▶️ Next step

Phase 4 — Accounts (M6), Checkpoint 4.1 — Add/edit Cash, Debit, Credit accounts. This needs a real Accounts screen (currently a PlaceholderScreen in the tab bar) where the person can add/edit/remove accounts in each of the three groups, matching the shape already used by balanceProjection.ts (model.balanceAccounts.cash / .debit / .credit) and the "as of" date field it already reads from. Since balanceProjection.ts already computes totals from this data, this checkpoint is really about giving the person a way to actually enter and edit that data for the first time — check mobile-app/src/types.ts first to confirm the exact shape of an account record before building the form.

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
  - mobile-app/src/DataContext.tsx — React context + useData() hook; holds the decrypted household data model in memory, loads/saves/clears it
  - mobile-app/src/balanceProjection.ts — running balance projection math (total balance, per-day projected balance, custom recurrence support)
  - mobile-app/src/storage.ts — reads/writes already-encrypted profile data and the profiles index
  - mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
  - mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
  - mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN), themed
  - mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
  - mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
  - mobile-app/src/screens/PlaceholderScreen.tsx — generic "coming soon" screen for tabs not yet built, themed
  - mobile-app/src/screens/CalendarScreen.tsx — real month grid calendar with prev/next navigation, today highlighted, tap-a-day popup, total balance banner, and per-day projected balances
  - mobile-app/src/navigation/MainTabs.tsx — bottom tab navigator with all 10 sections, themed; Calendar tab uses CalendarScreen instead of PlaceholderScreen
  - mobile-app/App.tsx — wires all screens together via NavigationContainer + MainTabs + ThemeProvider + DataProvider, including the 'locked' state and the two auto-lock triggers
  - mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage, @react-navigation/native, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Every session should continue using that same terminal workflow.