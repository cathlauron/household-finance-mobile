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
  - mobile-app/src/balanceProjection.ts — ports the web app's computeRunningBalances/getMonthEvents logic (household-finance-app-spec-and-scale.md §7) to TypeScript.
  - CalendarScreen.tsx shows a "TOTAL BALANCE" banner at the top, a small projected balance under every day number in the grid, and the projected balance for that specific day inside the day-tap popup.
  - Confirmed working on a real Android phone via Expo Go.
  - Known current limitations (intentional, to be revisited later): Loans aren't included in the projection yet, since Loans don't have a due-date field in the data model yet. Income only ever uses the *expected* payday amount, not a logged *actual* amount.

Phase 4 — Accounts (M6) — ✅ ✅ COMPLETE (verified this session; was previously built but not marked done in this log)
- 4.1 — Add/edit Cash, Debit, Credit accounts. ✅ Complete.
  - mobile-app/src/screens/AccountsScreen.tsx — real screen (not a placeholder), wired into the tab bar in MainTabs.tsx.
  - Shows a "Total Balance" banner, three sections (Cash / Debit / Credit) each with their own subtotal, tap-to-edit on any existing account, a "+ Add [type] account" button per section, and a "Remove this account" option inside the edit modal.
  - Verified this session by reading the actual file contents — matches the account shape (BalanceAccountEntry) used by balanceProjection.ts.
- 4.2 — Balance calculation engine (matches web app math). ✅ Complete.
  - The engine already existed inside balanceProjection.ts (built during Checkpoint 3.3) and is more complete than the checkpoint description implies: it factors in Cash+Debit+Credit totals, unpaid bill/debt balances, expected income paydays, savings goal contributions, AND manual transactions — recalculated fresh every time it's read, so any data change is reflected automatically.
  - The one gap: there's no Transactions screen yet (still a placeholder, planned for Phase 6), so this hasn't been "tested by literally tapping a button to add a transaction" — but the underlying math is correct and will pick up real transactions automatically once that screen exists.

🔧 In progress

Nothing in progress right now — Phases 0 through 4 are fully complete. Ready to start Phase 5, Checkpoint 5.1 — Add/edit/delete bills.

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
- Theming approach: Colors live in theme.ts as plain exported objects (lightTheme/darkTheme, type ThemeColors); ThemeContext.tsx wraps the app and exposes useTheme() for any screen to read live colors from, with light/dark/device mode persisted via AsyncStorage. Fonts have NOT been ported yet — screens currently use default system fonts. The full 13-theme picker, custom colors, and font pairing options from the web app are deferred to a later checkpoint once a real Settings screen exists to host them.
- Calendar month math (Checkpoint 3.1): Standard plain-JavaScript Date math (no calendar library added).
- Calendar day-tap popup (Checkpoint 3.2): Used React Native's built-in Modal + Pressable components rather than adding a new library.
- Data loading architecture (needed for Checkpoint 3.3): mobile-app/src/DataContext.tsx — a React context that holds the decrypted household data model in memory once signed in/unlocked, and exposes it to any screen via useData(). This is the shared foundation every future data-driven screen (Bills, Debts, Transactions, etc.) reads from and writes to.
- Running balance projection (Checkpoint 3.3): mobile-app/src/balanceProjection.ts, a close TypeScript port of the web app's computeRunningBalances/getMonthEvents/eventDelta functions. Deliberately excludes Loans (no due-date field yet) and actual-vs-expected income logging (no UI for it yet) — both are flagged as known gaps to revisit, not silent omissions.
- Accounts screen (Checkpoint 4.1–4.2): mobile-app/src/screens/AccountsScreen.tsx uses a single reusable add/edit modal for all three account groups (Cash/Debit/Credit), keyed by which group's "+ Add" button was tapped. Account records use a simple {id, name, amount} shape (BalanceAccountEntry in types.ts). No separate "calculation engine" needed to be built for 4.2 — the existing balanceProjection.ts functions already read live from whatever accounts/bills/debts/income/transactions exist in the model, so they stay correct automatically as data changes.
- Checkpoint tracking discipline: ALWAYS run the full "wrap up this session" step (including a fresh, complete PROGRESS.md rewrite) before ending a session, even for small changes — a skipped wrap-up is what caused Phase 4 to be built but not logged here, requiring this session to verify and backfill it.
- File-creation discipline: For a full-file rewrite, opening the file in the Codespace's built-in editor (`code filename`), selecting all, deleting, and pasting the new content is the reliable approach — safer than pasting large multi-line code directly at the bash `$` prompt.
- Overwrite-safety discipline: Before assuming a file's current shape, always cat (or open) it first rather than guessing.
- Tab bar structure: Used @react-navigation/bottom-tabs directly rather than a custom-built tab bar, matching the web app's own eventual "Bottom navigation" layout