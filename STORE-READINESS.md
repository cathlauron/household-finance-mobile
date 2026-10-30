# Finance Flow: store readiness check (Google Play + App Store)

Checked 2026-10-29 against the store rules as published that day and the app on `v3`
(version 3.1.0 in app.json, Expo SDK 54, React Native 0.81). Asked for by Cath before the
3.2 build. Nothing here is legal advice.

Marks: HAVE = already in the app. MISSING = must be built or added before submitting.
CATH = an account, form or decision only Cath can do.

## Both stores

| # | Requirement | Status | Notes |
|---|---|---|---|
| B1 | Privacy policy: a public web page, plus a link inside the app | BUILT, NOT LIVE (2026-10-29) | Host at household-finance-mobile.web.app/privacy (existing Firebase site). Cath must read and approve the text. |
| B2 | Account deletion inside the app (Apple 5.1.1(v); Google User Data policy) | MISSING | Today there is only "Clear all data" and "Leave household". Deletes data, so it needs a mockup and Cath's OK first. Open question: what happens to a shared household when one member deletes. |
| B3 | Account deletion web page, usable without the app (Google) | BUILT, NOT LIVE (by email) | e.g. household-finance-mobile.web.app/delete-account: steps, or a request by email. |
| B4 | Support page with real contact details (Apple Support URL; Play contact) | BUILT, NOT LIVE | Support email exists: support.financeflow00@gmail.com. Needs the web page: mockup H1 (/support). |
| B5 | No placeholders or unfinished screens (Apple 2.1) | DONE except "Check sign-in speed" (remove after timing) | "Help & guides: Coming soon" (About & Help) has to go: mockup H1. "Check sign-in speed" is a developer tool: remove it after Cath times it. |
| B6 | Premium screen shows prices (₱99 / ₱950.40) but can't sell anything | MISSING | Must be hidden in the store build until real in-app purchases exist (Apple 3.1.1 / 2.1; Google Play Billing). Cath's call. |
| B7 | Privacy answers: Apple App Privacy label; Google Data safety form | CATH | Collected: email (account), financial data typed in by the user (encrypted), approximate location (rounded to about 1 km, kept on the phone, sent only to Open-Meteo for the Home sky and weather), profile photo or receipt photos if the user adds them. No ads, no tracking. Claude can draft the answers. |
| B8 | Age rating questionnaires (Apple's new system; Google IARC) | CATH | No ads, gambling or user chat. Finance apps are usually 18+ audience on Google's Target audience form. |
| B9 | Reviewer access: test login details | CATH | Make a test account with sample data, and give its email and password in the review notes. |
| B10 | Store listing: name, short and full description, screenshots | MISSING | Icon OK (1024×1024, no transparency). Google also needs a 1024×500 feature graphic and at least 2 phone screenshots. Apple needs 6.9-inch iPhone screenshots. |
| B11 | Permission explanations | HAVE | Face ID, location, camera and photos all say why. Background location is blocked. |

## Google Play only

| # | Requirement | Status | Notes |
|---|---|---|---|
| G1 | Target Android 16 (API level 36) for new apps (since 31 Aug 2026) | HAVE | The installed React Native 0.81 toolchain builds targetSdk 36 and compileSdk 36. Play Console confirms it at the first upload. |
| G2 | Upload an app bundle (.aab), not an .apk | DONE (eas.json production) | eas.json has only "preview" (APK) profiles. Add a "production" profile: small config. |
| G3 | Play Console developer account ($25), identity verified, package name registered (Android developer verification) | CATH | Package name com.cathlauron.householdfinance (confirm it, Batch 1). Check the Play Console Home page shows the app registered. |
| G4 | Closed test: 12 testers opted in for 14 days in a row | CATH | Applies to personal accounts created after 13 Nov 2023. Needs 12 real people who actually use the app (Google checks engagement). Allow about 3 weeks, and start it as early as possible. |
| G5 | Financial features declaration (every app must fill it) | CATH | Finance Flow tracks money but doesn't move it, lend it or hold it. Pick the right answer together in the Console. |
| G6 | Data safety: deletion questions and the deletion web link | MISSING | Needs B2 + B3 first. |
| G7 | Ads declaration, App access, Content rating, Target audience | CATH | Forms in Play Console › App content. |

## App Store only

| # | Requirement | Status | Notes |
|---|---|---|---|
| A1 | Apple Developer Program ($99 a year) | CATH | EAS builds and uploads iPhone apps in the cloud, so no Mac is needed. |
| A2 | Built with Xcode 26 and the iOS 26 SDK (since 28 Apr 2026) | HAVE (EAS) | Expo SDK 54 supports iOS 26, and the EAS build servers do the building. Confirmed at the first upload. |
| A3 | iPhone app ID (ios.bundleIdentifier in app.json) | DONE | Not set, so no iPhone build can be made yet. Suggest com.cathlauron.householdfinance (same as Android): Cath to confirm. |
| A4 | iPad: app.json says supportsTablet: true | DECIDED: yes (upright, full screen); layout stretched, centred-column mockup to come | Means iPad screenshots are needed and reviewers may test on an iPad. Turn it off unless Cath wants iPad. |
| A5 | Encryption export questions | CATH | The app encrypts data itself with standard methods (AES, PBKDF2 through crypto-js), not only Apple's. Answer App Store Connect's questions to match. It may ask for a document; extra steps apply for France. Then set ITSAppUsesNonExemptEncryption in app.json. |
| A6 | Sign in with Apple | HAVE (not needed) | Only needed when an app offers Google/Facebook-style logins. Finance Flow uses email and password. |
| A7 | EU trader status (Digital Services Act) | CATH | A form in App Store Connect, needed to be listed in the EU. |

## Not required, but recommended before launch
- Forgot password / email check (already on the list, batch 4). Without them, a user who forgets their password has only the Recovery Key.
- App Check (batch 4): protects the Firebase project from scripted abuse.

## What it means for the order
The 3.2 build can still go first as a phone test build. A store submission needs, at least,
B1 to B6 and G2 + A3 built, and the account steps G3, G4 and A1 started. G4 takes about 3
weeks, so it is worth starting early.

Sources (read 2026-10-29): Google Play target API level page and Android developer
verification page (developer.android.com); Play Console Help: app-account deletion
(answer 13327111), Financial features declaration (13849271), app testing requirements for
new personal accounts (14151465); Apple: Upcoming requirements (Xcode 26 / iOS 26 SDK),
App Review 5.1.1(v) account deletion, App Store Connect App privacy reference (privacy
policy URL required).

Updated 2026-10-29 (night): B1, B3, B4 built in mobile-app/hosting (live once published), B5, G2, A3 done, A4 decided. B6: Cath will make Premium payments real before uploading (not hidden).
