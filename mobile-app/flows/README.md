# Maestro tap-through tests

`sign-in.yaml` and `tour.yaml` drive the **installed** app (3.10 or newer) on an Android
emulator or a plugged-in phone: open every tab and the main Settings pages, and fail if the app
crashes or something doesn't open. Written 2026-11-28; **not run yet** (they need an emulator on
Cath's computer). Use a test account, never the real household.

    maestro test -e EMAIL=test@example.com -e USERNAME=testuser -e PASSWORD=... flows/sign-in.yaml
    maestro test flows/tour.yaml

With Claude Code on the same computer, `maestro mcp` lets Claude run and read these itself.

`old-expo-go/` holds the five 2.x flows. They target Expo Go and buttons that have since moved
(the Security row, Save PIN, Change password), so they no longer run; kept for reference.
