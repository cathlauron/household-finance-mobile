# Claude's background tester (hidden browser)

Set up 2026-10-22 so Claude can try the app itself, in its own cloud workspace, without
Cath's computer or phone. Tested and working that day: the welcome slides, the guest set-up
(4 steps), Home, the tabs and the Plan pages all open and respond to taps.

## How to run it (Claude, inside mobile-app)

    npm ci
    npm run browser:build
    PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npm run browser:walk -- Skip "fill:Name=Cath" Continue "Worry less about money" Continue Continue "No, just me" "See my Home"

(`/opt/pw-browsers` is where Claude's workspace keeps its browsers. If it's missing, run
`npx playwright install chromium` first.) After the set-up steps above you are on Home in
guest mode; add more steps to go anywhere. Steps:
- plain text: tap the thing with exactly that text
- `~text`: tap something containing that text
- `fill:Box=value`: type into the box with that placeholder or label (`fill:=value` = the only box)
- `wait:3000`: wait, then take a picture

A picture after every step and `log.txt` go to `mobile-app/web-shots/` (not saved to git).
Look at the pictures with the Read tool; the PROBLEMS list at the end shows crashes and
steps that found nothing to tap.

## Always shows (web only, not app bugs)

- `ExpoNotifications.getLastNotificationResponse is not available on web`
- `importScripts ... jsQR.min.js failed to load` (the QR scanner's helper can't download here)

## What it can and can't show

Can: what each screen shows, what a tap or a form does, wrong pages opening, crashes,
empty states, guest-mode data, light and dark looks.

Can't (these stay "Needs your phone"): signing in, linking with your partner and syncing
(it never touches the real Firebase, on purpose), fingerprint / PIN, notifications, camera
and QR scanning, haptics, the exact feel of swipes and animations, anything that only
happens in a real EAS build. The web version draws almost exactly like the phone, but not
pixel for pixel.

Later option (ask Cath first): run the Firebase emulator here (Java is installed) so sign-in
and two-person syncing can be tested too, still without touching her real data.

## Packages added for this (checking only, never in the phone app)

`react-dom`, `react-native-web`, `@expo/metro-runtime` (web build) and `playwright` (the
hidden browser), all in devDependencies. No app package changed version.
