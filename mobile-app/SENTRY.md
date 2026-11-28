# Crash and speed reports (Sentry, free plan)

Sentry tells us when the app crashes, shows an error, or a screen is slow or freezes, on any
phone, without waiting for someone to notice. Before a report leaves the phone, every amount,
name, email and typed text is taken out (`src/sentryScrub.ts`, checked by
`tests/sentryScrub.test.mjs`). What's left: the kind of error, the code file and line, the
screens visited, the phone model and the app version.

It is OFF until step 3.

1. Make a free account at sentry.io (Developer plan: 5,000 errors a month, no card).
2. Create a project: platform **React Native**, name `finance-flow`. Sentry shows a **DSN**
   (an address starting `https://` and ending in numbers). It only lets the app send reports.
3. Paste the DSN into `SENTRY_DSN` in `src/sentry.ts` (or ask Claude to).
4. Expo Go reports app errors at once. Native crashes and slow / frozen screens need the next
   EAS build (the Sentry add-on is part of the build).
5. To let Claude read the reports, see `claude-connector/README.md` › Crash reports in Claude,
   or add Sentry's own connector in Claude (Settings › Connectors › Sentry).

Code lines in reports from an installed build show as `index.android.bundle` until source maps
are uploaded (a later step with a Sentry auth token in EAS). Expo Go reports show real lines.
