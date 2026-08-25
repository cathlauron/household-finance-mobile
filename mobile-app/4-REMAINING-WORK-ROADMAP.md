# Remaining Work Roadmap (Auth → UI/UX → Publish)

This picks up where 3-ROADMAP.md (now closed) left off. All core features are built — this covers the three things left: real login, visual polish, and getting the app installed on your phone (and optionally into app stores).

Order matters here by decision: **Firebase Auth first, then UI/UX, then Publish.**

---

## Phase A — Firebase Auth

**Goal:** Replace the current username+passphrase-in-storage model with real Firebase Authentication, closing the gap where anyone who knows a household's link code/ID could read or write to it.

| Checkpoint | What happens | Done when |
|---|---|---|
| A.1 | Claude explains, in plain terms, what changes for you as a user (do you still use a passphrase? what happens to existing profiles?) and confirms the approach before touching code. | A written decision exists in PROGRESS.md. |
| A.2 | Add Firebase Auth to the project (email/password, or another method you pick in A.1). | You can create a real Firebase-authenticated account. |
| A.3 | Wire Sign In / Create Profile screens to use real Auth instead of local-only passphrase checks. | You can sign in/out using real Firebase Auth on your phone. |
| A.4 | Update Firestore security rules to require a matching authenticated user, closing the "knowing the ID is enough" gap. | Rules confirmed tightened; existing household linking still works. |
| A.5 | Migrate/handle existing profiles+households created under the old system, so nothing is lost. | Your existing linked household still works after the change. |

**Estimated sessions:** 3–5 (this is the most technically involved of the three phases)

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
