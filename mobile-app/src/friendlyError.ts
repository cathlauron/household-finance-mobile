// H-12 (2026-10-22): some screens showed whatever an error said, which for Firebase or the
// phone is technical ("Missing or insufficient permissions.", "Failed to get document
// because the client is offline.", "FirebaseError: [code=unavailable]"). The app's own
// messages (written for people, e.g. "That photo is too large. Try a different one.") are
// still shown; technical ones are replaced with the screen's friendly fallback, or an
// "offline" line when that's the cause.
const OFFLINE_CODES = ['unavailable', 'deadline-exceeded', 'auth/network-request-failed'];
const TECHNICAL = /firebase|firestore|permission|insufficient|client is offline|network request|internal|unavailable|deadline|exception|undefined|null|\[code=|TypeError|ReferenceError|JSON|fetch/i;

export const OFFLINE_LINE = "You seem to be offline. Check your connection and try again.";

export function friendlyError(e: unknown, fallback: string): string {
  const err = e as { code?: unknown; message?: unknown; name?: unknown } | null | undefined;
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message.trim() : '';
  if (OFFLINE_CODES.includes(code) || /offline|network request failed/i.test(message)) return OFFLINE_LINE;
  if (!message || code || err?.name === 'FirebaseError' || TECHNICAL.test(message)) return fallback;
  return message;
}
