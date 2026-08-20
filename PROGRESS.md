# Household Finance Mobile App — Progress Log

This file tracks what's been built so far. Claude reads this at the start of every session, but always double-checks the actual code too, since notes can drift from reality.

---

## ✅ Done

### Phase 0 — Decisions & Foundation
- **0.1 — Sync decision:** Chosen. No syncing between phones for now — each phone/profile will have its own separate data. Real multi-phone syncing is deferred to Phase 9, later in the roadmap, by design.
- **0.2 — Blank Expo project created and confirmed working.**
  - Created via `npx create-expo-app@latest mobile-app --template blank`, using **SDK 54** ("For learning with Expo Go").
  - Project lives in the `mobile-app/` folder inside this repo.
  - Confirmed working: scanned the QR code with Expo Go on an Android phone, saw the default "Open up App.js to start working on your app!" screen. This proves the full pipeline (Codespaces → tunnel → phone) works end to end.
- **0.3 — Offline behavior and minimum phone OS version.**
  - **Offline behavior:** The app works fully offline at all times — no internet connection is ever required to use it, since all data lives directly on the phone (consistent with the 0.1 no-sync decision). Whenever the phone does have an internet connection, the app will quietly make a backup copy of the data to the cloud, purely as a safety net (e.g. if the phone is lost, broken, or replaced). This backup is **not** the same as the two-phone syncing feature — it never shares data with another phone or profile, it just protects against losing your one phone's data. Real two-phone syncing stays deferred to Phase 9, as decided in 0.1.
  - **Minimum phone OS version:** Recent phones only — roughly the last ~4 years of iOS/Android. Very old devices are not a target, in exchange for a simpler, faster build.

---

## 🔧 In progress

Nothing in progress right now — ready to start the next checkpoint.

---

## 📌 Decisions made

- **Sync method:** None for now (Phase 0.1). Add real sync later in Phase 9.
- **Expo SDK version:** SDK 54, chosen specifically for compatibility with the plain Expo Go app (avoids needing a custom-built Expo Go, which SDK 57 currently requires).
- **Git:** The `mobile-app` project was created *inside* the existing `household-finance-mobile` git repo, and was told to skip creating its own separate git repo — everything stays under the one repo.
- **Offline behavior:** Fully offline app, with an automatic cloud backup (safety copy only, not multi-device sync) whenever internet is available.
- **Minimum phone OS version:** Recent phones only (~last 4 years).

---

## ▶️ Next step

**Phase 1 begins — Checkpoint 1.1: Data model setup.**

This is where real app code starts getting written. Checkpoint 1.1 defines the "shape" of all your financial data (bills, debts, income, accounts, etc.) inside the app, matching the behavior of your original web app. Nothing will be visible on your phone yet after this checkpoint — it's the invisible foundation everything else gets built on top of.

---

## Files uploaded to GitHub so far

- `2-PROJECT-INSTRUCTIONS.md`
- `3-ROADMAP.md`
- `household-finance-app (3).html` (reference web app)
- `household-finance-app-spec-and-scale.md`
- `README.md`
- `PROGRESS.md` (this file)
- `mobile-app/` folder (blank Expo project — created directly in Codespaces, not uploaded as a zip; see note below)

**Note on `mobile-app/` folder:** Since this was created directly in your Codespace (not on your computer), it's not something you need to download and re-upload — it already lives in your repo's `main` branch, saved automatically by Codespaces' connection to GitHub. Nothing extra to upload this session for that folder.
