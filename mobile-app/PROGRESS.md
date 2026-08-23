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
- 3.1, 3.2, 3.3 — Full Calendar tab (month grid, tap-a-day, running balance projection). ✅ Complete.

Phase 4 — Accounts (M6)
- 4.1, 4.2 — Full Accounts tab (add/edit/delete Cash, Debit, Credit accounts; balance calculation engine). ✅ Complete.

Phase 5 — Bills / Debts / Loans (M7)
- 5.1 — Add/edit/delete Bills. ✅ Complete.
  - mobile-app/src/screens/BillsScreen.tsx — scrollable list + tap-to-open modal to add/edit/delete a bill.
  - Every bill currently saved as recurringType: 'onetime' with a single cycle — recurring schedules deferred to Checkpoint 5.4.
- 5.2 — Add/edit/delete Debts. ✅ Complete.
  - mobile-app/src/screens/DebtsScreen.tsx — same list + modal pattern as BillsScreen.tsx, adapted for the Debt type (fields: creditorOrPerson, category, amount via cycles[0], due date, interest rate %, minimum payment, notes). Also saved as recurringType: 'onetime' with a single cycle for now, matching Bills' approach — recurring schedules for Debts are also deferred to 5.4.
  - mobile-app/src/screens/ToPayScreen.tsx — pill-button switcher at the top of the To-Pay tab, showing Bills/Debts/Loans depending on which is selected.
  - mobile-app/src/navigation/MainTabs.tsx: the "To-Pay" tab points at ToPayScreen instead of BillsScreen directly.
- 5.3 — Loans, fully complete (all three sub-steps done and confirmed on-device):
  - 5.3a — mobile-app/src/screens/LoansScreen.tsx — list + add/edit/delete modal, same pattern as Bills/Debts, using the existing Loan type (name, loanType, direction 'borrowed'|'lent', totalAmount, expectedPayment, actualPayments, interestRate).
  - 5.3b — Loans added as a third pill in ToPayScreen.tsx alongside Bills/Debts. Confirmed working on-device.
  - 5.3c — Payoff Simulator (Snowball vs. Avalanche). ✅ Complete and confirmed working on a real phone.
    - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx — month-by-month simulation comparing Snowball (smallest balance first) vs Avalanche (highest interest first), with an optional extra-monthly-payment input, a debt-free time estimate, total interest for each strategy, and a payoff-order list. Text/stat-card based (no chart library) to keep the change scoped — a visual chart is a possible future polish item, not required.
    - Only includes "borrowed" loans with a remaining balance > 0 (loans marked "lent" — money owed TO the person — are excluded, since paying those down isn't a cost to them).
    - Uses a fallback of 2% of balance (minimum 1) as the assumed minimum payment for any loan missing an expectedPayment, and 0% interest for any loan missing interestRate, so the simulator can still run on incomplete data — a hint is shown on-screen whenever a fallback was used.
    - types.ts updated: Loan gained an optional interestRate?: number | '' field (annual percentage, e.g. 12 = 12%).
    - LoansScreen.tsx updated: loan add/edit modal gained an "Interest rate, annual %" input field; a "📊 View Payoff Simulator" button now appears above the loan list whenever at least one simulate-able borrowed loan exists.

Phase 5 (M7) is now fully complete — Bills, Debts, and Loans (including the payoff simulator) are all built and confirmed working. Recurring schedules for Bills/Debts/Loans (Checkpoint 5.4) remain the one deferred piece of this phase.

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
- Screen pattern for simple list-based tabs (Accounts, Bills, Debts, Loans): a scrollable list of rows, each tappable to open an edit modal; a "+ Add X" button at the bottom opens the same modal blank. This keeps every list-style screen visually and structurally consistent, and makes each new one faster to build since the pattern is proven.
- Due dates (Bills & Debts, Checkpoints 5.1–5.2): Entered as plain typed text in YYYY-MM-DD format for now, with a basic format check before saving. A proper native date-picker UI is a nice-to-have polish item for later, not blocking any other checkpoint — the stored data shape (a plain date string) won't need to change when that's added.
- To-Pay tab structure (Checkpoint 5.2/5.3): Uses an in-screen pill-button switcher (ToPayScreen.tsx) rather than a separate bottom tab per record type — matches the web app's own To-Pay sub-tab pattern (spec doc §8) and keeps the bottom tab bar from getting overcrowded. Now has three pills: Bills, Debts, Loans.
- Payoff Simulator design (Checkpoint 5.3c): Built as a modal (LoanPayoffSimulatorModal.tsx) opened from a button on LoansScreen.tsx, rather than a separate tab/screen of its own — matches how the web app treats it as a sub-view within Debts/Loans rather than a standalone destination. Deliberately built without a charting library (plain stat cards + a payoff-order list) to keep the checkpoint scoped small; a visual chart is a reasonable later polish item, not a blocker for anything else.
- Checkpoint tracking discipline: Every session should end with a full PROGRESS.md rewrite (like this one) reflecting exactly what was verified via terminal output and confirmed working on-device — not just a quick note appended to the old version. For a session working through multiple sub-steps, PROGRESS.md is also updated mid-session at natural breakpoints, so a mid-session disconnect never loses more than one small sub-step of work.
- File-creation discipline: Files are always created via a `cat > filename << 'ENDOFFILE' ... ENDOFFILE` block (content included inside the same paste) — never by pasting code at a bare prompt, which bash tries to run as commands instead of saving.
- Overwrite-safety discipline: Before creating any file with a `cat > filename << 'ENDOFFILE'` block, always first check whether that file already exists (e.g. via `cat filename` or `git log --oneline -- filename`) rather than assuming a fresh file is needed.
- Editing an existing file safely: When only a small, well-defined change is needed (like swapping one screen name for another), a targeted `sed` command is used instead of retyping the whole file — after first running a `grep` to see exactly what's there, so the change is predictable and doesn't risk corrupting the rest of the file.
- Tab bar structure: Used @react-navigation/bottom-tabs directly rather than a custom-built tab bar, matching the web app's own eventual "Bottom navigation" layout preference. All 10 tabs are shown flat in the bar for now (no "More" overflow menu yet).

▶️ Next step

Phase 5 (Bills/Debts/Loans) is fully done except for recurring schedules (Checkpoint 5.4 — "A bill correctly repeats on schedule"). That's the next checkpoint to pick up: adding a recurrence pattern (monthly/annual/custom, similar to the web app) to Bills, Debts, and Loans, replacing the current "always one-time, single cycle" behavior.

Files in the repo so far
- 2-PROJECT-INSTRUCTIONS.md
- 3-ROADMAP.md
- household-finance-app (3).html (reference web app)
- household-finance-app-spec-and-scale.md
- README.md
- PROGRESS.md (this file)
- mobile-app/ folder (Expo project — built and saved directly via the Codespace terminal, not the GitHub website)
  - mobile-app/src/types.ts — data model type definitions (Loan now includes optional interestRate)
  - mobile-app/src/defaultModel.ts — empty/default data factory function
  - mobile-app/src/auth.ts — username sanitizing / sign-in helpers
  - mobile-app/src/encryption.ts — salt generation + encrypt/decrypt logic for profile data
  - mobile-app/src/pin.ts — PIN hashing, storage, and verification (never stores the real PIN)
  - mobile-app/src/autoLock.ts — auto-lock idle-minutes setting (default 5), readable/settable for a future Settings screen
  - mobile-app/src/theme.ts — color palette (light/dark), ported from the web app's Classic theme
  - mobile-app/src/ThemeContext.tsx — React context + useTheme() hook; handles light/dark/device mode and persistence
  - mobile-app/src/storage.ts — reads/writes already-encrypted profile data and the profiles index
  - mobile-app/src/balanceProjection.ts — running-balance math + formatPeso() currency formatting, shared by Calendar, Accounts, and the Payoff Simulator
  - mobile-app/src/DataContext.tsx — shared in-memory data holder; every screen reads/writes the household model through this
  - mobile-app/src/screens/CreateProfileScreen.tsx — create-profile screen UI
  - mobile-app/src/screens/SignInScreen.tsx — sign-in screen UI
  - mobile-app/src/screens/HomeScreen.tsx — placeholder home screen (Lock / Sign out / Set PIN), themed
  - mobile-app/src/screens/SetPinScreen.tsx — set/change PIN screen UI
  - mobile-app/src/screens/PinUnlockScreen.tsx — "locked, enter PIN" screen UI
  - mobile-app/src/screens/PlaceholderScreen.tsx — generic "coming soon" screen for tabs not yet built, themed
  - mobile-app/src/screens/CalendarScreen.tsx — month grid, tap-a-day, running balance projection
  - mobile-app/src/screens/AccountsScreen.tsx — Cash/Debit/Credit account list + add/edit/delete modal
  - mobile-app/src/screens/BillsScreen.tsx — Bills list + add/edit/delete modal
  - mobile-app/src/screens/DebtsScreen.tsx — Debts list + add/edit/delete modal
  - mobile-app/src/screens/LoansScreen.tsx — Loans list + add/edit/delete modal (now includes an interest rate field + a button to open the Payoff Simulator)
  - mobile-app/src/screens/LoanPayoffSimulatorModal.tsx — Snowball vs. Avalanche payoff simulator, opened as a modal from LoansScreen.tsx
  - mobile-app/src/screens/ToPayScreen.tsx — Bills/Debts/Loans pill switcher, home of the To-Pay tab
  - mobile-app/src/navigation/MainTabs.tsx — bottom tab navigator with all 10 sections, themed; To-Pay shows ToPayScreen
  - mobile-app/App.tsx — wires all screens together via NavigationContainer + MainTabs + ThemeProvider, including the 'locked' state and the two auto-lock triggers
  - mobile-app/package.json / package-lock.json — includes expo-crypto, crypto-js, @react-native-async-storage/async-storage, @react-navigation/native, @react-navigation/bottom-tabs, react-native-screens, react-native-safe-area-context

Note on mobile-app/ folder: This project lives entirely inside your Codespace and gets saved to GitHub via git add / git commit / git push in the terminal — not by uploading files through the GitHub website. Every session should continue using that same terminal workflow. Metro must be started from inside mobile-app (cd mobile-app first), always with --tunnel.
