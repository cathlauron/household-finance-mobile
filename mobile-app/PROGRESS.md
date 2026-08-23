Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

✅ Done

Phase 0 — Decisions & Foundation
- 0.1 — Sync decision: No syncing between phones for now (deferred to Phase 9).
- 0.2 — Blank Expo project created and confirmed working.
- 0.3 — Offline behavior and minimum phone OS version decided (see Decisions below).

Phase 1 — Security & Sign-In (M1–M2)
- 1.1 — Data model setup. ✅ Complete.
- 1.2 — Create-profile & sign-in screens, with password protection. ✅ Complete.
- 1.3 — Encrypt the data at rest. ✅ Complete.
- 1.4a/b/c — Quick PIN unlock + auto-lock timer, fully wired into Lock. ✅ Complete.

Phase 2 — Getting Around the App (M4)
- 2.1 — Bottom tab bar with all 10 main sections. ✅ Complete.
- 2.2 — Basic theming (light/dark/device mode) ported from the web app's Classic theme. ✅ Complete.

Phase 3 — Calendar (M5)
- 3.1 — Month grid view, flip between months, "Today" button. ✅ Complete.
- 3.2 — Tap a day to open a popup showing the date and projected balance. ✅ Complete.
- 3.3 — Running balance projection engine (mobile-app/src/balanceProjection.ts) — walks bills, debts, income, manual transactions, and savings contributions day-by-day to project the liquid balance forward/backward from the "as of" date. Matches the web app's computeRunningBalances() logic. ✅ Complete.
  - Note: Loans are NOT yet included in the projection (the data model doesn't have due-date fields for loans yet — only Bills and Debts do). This will need to be added once Loans gets its own due-date fields in Phase 5.
  - Note: Income "actual paid" logs aren't factored in yet — every projected payday uses the expected amount, not a logged actual amount. Deferred until there's a real screen for logging actual paydays (later in Phase 7 — Income & Savings).

Phase 4 — Accounts (M6)
- 4.1 — Add/edit/delete Cash, Debit, Credit accounts, via a modal form on the Accounts screen. ✅ Complete.
- 4.2 — Balance calculation engine (totalLiquidBalance() in balanceProjection.ts) — sums Cash + Debit + Credit, shown as a "Total balance" banner on both the Accounts screen and the Calendar screen. ✅ Complete.

🔧 In progress

Nothing in progress right now. Phases 0–4 are fully complete and confirmed against the actual code (see "How this was verified" below). Ready to start Phase 5 — Bills / Debts / Loans (M7), Checkpoint 5.1 — Add/edit/delete Bills.

How this was verified (this session)
This session found that PROGRESS.md had drifted out of sync with the actual code again (same issue flagged twice before in earlier sessions). Real work — the full Calendar tab (3.1–3.3) and the full Accounts tab (4.1–4.2) — had been built in past sessions but never logged here. This was caught by:
1. Running `find mobile-app/src -type f -name "*.tsx" -o -name "*.ts" | sort` to see every file that actually exists.
2. Reading the full contents of CalendarScreen.tsx, AccountsScreen.tsx, balanceProjection.ts, MainTabs.tsx, and DataContext.tsx directly.
3. Confirming MainTabs.tsx still points every other tab (To-Pay, Planning, Transactions, Insights, Income, Savings, Settings) at PlaceholderScreen — proving Phase 5 (Bills/Debts/Loans) has NOT been started yet, and nothing beyond Phase 4 is hiding anywhere.

📌 Decisions made
- Sync method: None for now (Phase 0.1). Add real sync later in Phase 9.
- Expo SDK version: SDK 54.
- Git: mobile-app project lives inside the existing household-finance-mobile git repo (no separate repo).
- Offline behavior: Fully offline app, with automatic cloud backup (safety copy only) when internet is available.
- Minimum phone OS version: Recent phones only (~last 4 years).
- Data model language: TypeScript inside mobile-app/src/, matching field names/behavior from the original web app.
- Dev workflow in Codespaces: Metro must always run with tunnel mode: `npx expo start --tunnel`. Confirm the terminal shows an address ending in .exp.direct before scanning the QR code.
- Encryption approach: crypto-js (for the WordArray type) + expo-crypto (PIN hashing). Salt generation lives in encryption.ts, reused by pin.ts.
- PIN quick-unlock: Always a convenience re-entry method on an already-unlocked session, never a substitute for the real passphrase. "Use passphrase instead" fallback always available.
- Auto-lock timeout: Defaults to 5 minutes idle, stored via AsyncStorage key "autoLockMinutes", adjustable later from a Settings screen via setAutoLockMinutes().
- Theming approach: Colors in theme.ts (lightTheme/darkTheme, type ThemeColors); ThemeContext.tsx exposes useTheme() with light/dark/device mode persisted via AsyncStorage. Fonts NOT ported yet — screens use default system fonts. Full 13-theme picker, custom colors, and font pairing deferred to a later checkpoint once a real Settings screen exists.
- Data layer architecture (confirmed this session, built in an earlier one): DataContext.tsx (React context) holds the decrypted HouseholdModel in memory once signed in, exposing `model`, `loading`, `loadModel(username, key)`, `saveModel(updatedModel)`, and `clearModel()` to any screen via the `useData()` hook. Screens never touch encryption/storage directly — they call `saveModel()` and DataContext handles re-encrypting and persisting.
- Balance projection architecture: balanceProjection.ts is a standalone module (no React) exporting `computeMonthEvents()`, `computeRunningBalances()`, `totalLiquidBalance()`, and `formatPeso()`. Calendar and Accounts both import from it, so there's one shared source of truth for balance math rather than each screen calculating its own.
- Checkpoint tracking discipline (reinforced AGAIN this session): This is the third time real, working code existed that PROGRESS.md didn't reflect. Going forward, every session — even ones that feel like "just a small fix" — must end with a genuine PROGRESS.md rewrite, not an incremental edit assumed to be still-accurate. When in doubt at the START of a session about whether PROGRESS.md is accurate, run `find mobile-app/src -type f` and spot-check a couple of files BEFORE proceeding, rather than trusting the file blindly even after a clean git sync check (a clean git sync only proves Codespace and GitHub agree with each other — it does NOT prove PROGRESS.md's own content is accurate).
- File-creation discipline: Files are always created via `cat > filename << 'ENDOFFILE'` (content included in the same paste) or the Codespace's built-in editor — never by pasting code at a bare `$` prompt.
- Overwrite-safety discipline: Before creating any file with `cat > filename << 'ENDOFFILE'`, always check first whether that file already exists (`cat filename` or `git log --oneline -- filename`).
- Tab bar structure: @react-navigation/bottom-tabs, all 10 tabs shown flat (no "More" overflow menu yet).

▶️ Next step

Phase 5 — Bills / Debts / Loans (M7), Checkpoint 5.1 — Add/edit/delete Bills. This replaces the "To-Pay" tab's current PlaceholderScreen with a real screen where bills can be added, edited, and deleted, matching the web app's Bills tab behavior (see household-finance-app-spec-and-scale.md §3/§8 and the .html reference file's billsTabHTML()/billFormHTML() logic — recurrence types monthly/annual/onetime/custom, priority, owner, notes, and payment cycles). This session should decide how much of the full web version's payment-cycle complexity to bring into checkpoint 5.1 versus defer to 5.2+, since 5.1 is meant to be a small, single-session step (per the roadmap: "You can add a bill and see it in a list").

Files that exist so far (mobile-app/src/)
- types.ts — data model type definitions
- defaultModel.ts — empty/default data factory function
- auth.ts — username sanitizing / sign-in helpers
- encryption.ts — salt generation + encrypt/decrypt logic for profile data
- pin.ts — PIN hashing, storage, and verification
- autoLock.ts — auto-lock idle-minutes setting (default 5)
- theme.ts — color palette (light/dark), ported from the web app's Classic theme
- ThemeContext.tsx — theme context + useTheme() hook (light/dark/device mode)
- DataContext.tsx — decrypted data holder + useData() hook (model, loading, loadModel, saveModel, clearModel)
- balanceProjection.ts — running balance projection engine + totalLiquidBalance() + formatPeso()
- storage.ts — reads/writes encrypted profile data and the profiles index
- screens/CreateProfileScreen.tsx
- screens/SignInScreen.tsx
- screens/HomeScreen.tsx
- screens/SetPinScreen.tsx
- screens/PinUnlockScreen.tsx
- screens/CalendarScreen.tsx — full month grid + day-tap modal + projected balances
- screens/AccountsScreen.tsx — Cash/Debit/Credit add/edit/delete
- screens/PlaceholderScreen.tsx — still used by: To-Pay, Planning, Transactions, Insights, Income, Savings, Settings
- navigation/MainTabs.tsx — bottom tab navigator, all 10 tabs
- App.tsx — wires everything together via NavigationContainer + MainTabs + ThemeProvider + DataProvider, including the 'locked' state and auto-lock triggers
- package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage, @react-navigation/native, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Every session should continue using that same terminal workflow.