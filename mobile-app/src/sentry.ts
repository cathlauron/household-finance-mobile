// Crash and speed reports (Cath, 2026-11-28), sent to Sentry's free plan with every amount and
// name removed first (sentryScrub.ts). Off until SENTRY_DSN is filled in (see SENTRY.md), and
// never in the background tester. Works in Expo Go (app errors) and the installed app (app
// errors, native crashes, slow and frozen screens).
import type React from 'react';
import * as Sentry from '@sentry/react-native';
import { scrubEvent } from './sentryScrub';
import { APP_VERSION } from './appVersion';

// Sentry › Project settings › Client Keys (DSN). It only lets the app SEND reports.
export const SENTRY_DSN = '';

const dsn = SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN || '';
export const sentryOn = !!dsn && process.env.EXPO_PUBLIC_WALK_FIXTURE !== '1';

if (sentryOn) {
  Sentry.init({
    dsn,
    release: `finance-flow@${APP_VERSION}`,
    environment: __DEV__ ? 'expo-go' : 'build',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // A fifth of sessions report how long screens and app start take (slow / frozen frames).
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    maxBreadcrumbs: 50,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => (['console', 'touch', 'ui.input', 'xhr', 'fetch', 'http'].includes(crumb.category || '') ? null : crumb),
  });
}

export function wrapApp<P extends object>(App: React.ComponentType<P>): React.ComponentType<P> {
  return sentryOn ? (Sentry.wrap(App as any) as any) : App;
}
