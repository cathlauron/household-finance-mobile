// Cath, 2026-10-27: the app's help and support email (Settings > About & Help).
export const SUPPORT_EMAIL = 'support.financeflow00@gmail.com';

// The email Contact support opens: the address filled in, and a subject that says which
// version and phone the person has. Nothing from their money data goes in it.
export function supportMailto(version: string, os: string): string {
  const subject = `Finance Flow ${version} (${os === 'ios' ? 'iPhone' : os === 'android' ? 'Android' : os})`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
