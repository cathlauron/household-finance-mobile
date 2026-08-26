# Remaining Work Roadmap (Auth → UI/UX → Publish)

This picks up where 3-ROADMAP.md (now closed) left off. All core features are built — this covers the three things left: real login, visual polish, and getting the app installed on your phone (and optionally into app stores).

Order matters here by decision: **Firebase Auth first, then UI/UX, then Publish.**

---

## Phase A — Firebase Auth

**Goal:** Replace the current username+passphrase-in-storage model with real Firebase Authentication, closing the gap where anyone who knows a household's link code/ID could read or write to it. Includes a full security checklist pass adapted for a mobile app talking directly to Firebase (no traditional web server, so some checklist items are adapted or don't apply — see A.1).

| Checkpoint | What happens | Security items covered | Done when |
|---|---|---|---|
| A.1 | Claude explains, in plain terms, what changes for you as a user (do you still use a passphrase? what happens to existing profiles? why Firebase's `apiKey` being visible in the app is normal and not a leak). Confirms the approach before touching code. | — | A written decision exists in PROGRESS.md |
| A.2 | Add Firebase Auth to the project (email/password, or another method decided in A.1) | Auth fundamentals (hashing/salting — handled automatically by Firebase) | You can create a real Firebase-authenticated account |
| A.3 | Wire Sign In / Create Profile screens to use real Auth instead of local-only passphrase checks | Input validation/sanitization, proper error handling (no leaking internal details) | You can sign in/out using real Firebase Auth on your phone |
| A.4 | Write Firestore security rules so every read/write requires `request.auth.uid` to match the profile owner **or** a verified member of that household | Authorization checks, API endpoint protection, partial rate limiting (Firebase Auth has built-in sign-in attempt limits) | Rules written and deployed |
| A.4a | **Row-level security verification** — actually test the rules from A.4, not just assume they work: confirm (1) your own profile's data is readable/writable by you, (2) a linked household's data is readable/writable by both linked members, (3) an unauthenticated request is rejected, (4) an authenticated user who is *not* a household member is rejected from that household's data. Use the Firebase Rules Playground/emulator. | Row-level security, confirmed not assumed | All 4 test cases pass, results checked off in PROGRESS.md |
| A.5 | Migrate/handle existing profiles+households created under the old system, so nothing is lost. **Does not start until A.4a passes.** | — | Your existing linked household still works after the change |
| A.6 | Secure on-device token storage using `expo-secure-store` instead of plain device storage; confirm no secrets sit in plain storage | Don't store secrets on-device (mobile equivalent of "secure cookies") | Tokens stored securely, confirmed |
| A.7 | Review the receipt/attachment upload path — validate file type and size before anything is written to Firestore | File upload security | Bad file types/oversized files rejected before upload |
| A.8 | Run `npm outdated` in Codespaces, review flagged packages for known security issues | Keep dependencies updated | Report given; updates applied or explicitly deferred with a reason |

**Checklist items that don't apply to this app, and why:**
- *CSRF protection* — mobile apps don't use browser cookies/sessions, so there's no CSRF to protect against
- *SQL injection prevention* — Firestore isn't a SQL database, so this specific attack doesn't exist here
- *Security headers (X-Frame-Options, etc.)* — those protect HTML pages rendered in a browser; a native app has no HTML pages
- *DDoS protection* — Firebase has built-in abuse protection; Firebase App Check can be added later as an optional extra layer if wanted

**Estimated sessions:** 4–6 (expanded from the original 3–5 to fit the security checklist pass)

---

## Phase B — UI/UX Polish

**Goal:** Improve the look, feel, and consistency of the app now that all functionality is in place.

| Checkpoint | What happens | Done when |
|---|---|---|
| B.1 | An "audit" pass — Claude and you go screen-by-screen noting what feels clunky, inconsistent, or dated. | A written list of specific issues/opportunities exists in PROGRESS.md. |
| B.2+ | Phased fixes based on the B.1 list — spacing/consistency, theming refinements, specific screen redesigns, etc. Each checkpoint sized to fit one session. | Each item from the B.1 list is either fixed or explicitly deferred. |

**Estimated sessions:** varies — depends on scope decided in B.1

---

## Phase C — Publishing

**Goal:** Get a real installable version of the app onto your phone, and optionally into app stores.

| Checkpoint | What happens | Done when |
|---|---|---|
| C.1 | Use Expo's EAS Build service to create a real installable `.apk` (Android) or TestFlight link (iPhone). | You have an installable file/link. |
| C.2 (optional, has real costs) | Publish to Google Play / Apple App Store. | Explained as optional — Google ~$25 one-time, Apple ~$99/year. Entirely your call. |

**Estimated sessions:** 1–2 for C.1; C.2 optional and separate.

---

## Using this roadmap

Same as before: run the sync check in Codespaces, paste the output, say "go." Claude re-checks PROGRESS.md, figures out the next unfinished checkpoint **from this file**, and walks you through it.
