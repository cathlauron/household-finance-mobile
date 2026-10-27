// H-19 (2026-10-22, Cath agreed): signing in on a NEW phone to a shared household unwraps
// the household key, then reads the household. If the READ failed because the connection
// dropped, the app treated it like a wrong password and asked for the recovery key. Now:
//  - the key doesn't unwrap, or the household doesn't open with it -> recovery (as before)
//  - the household can't be read because of the connection -> "check your connection"
// No Firebase imports here (the checks run this file directly): the caller passes the steps.
export type RestoreOutcome<M, K> =
  | { status: 'ok'; model: M; householdKey: K }
  | { status: 'recovery' }
  | { status: 'offline' };

export function looksOffline(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown } | null;
  const code = typeof err?.code === 'string' ? err.code : '';
  const msg = typeof err?.message === 'string' ? err.message : '';
  return ['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(code) || /offline|network|timed out|timeout/i.test(msg);
}

export async function restoreLinkedHousehold<M, K>(steps: {
  unwrap: () => K;
  load: () => Promise<string | null>;
  decrypt: (key: K, text: string) => M;
}): Promise<RestoreOutcome<M, K>> {
  let householdKey: K;
  try {
    householdKey = steps.unwrap();
  } catch {
    return { status: 'recovery' };
  }
  let text: string | null;
  try {
    text = await steps.load();
  } catch (e) {
    return looksOffline(e) ? { status: 'offline' } : { status: 'recovery' };
  }
  if (!text) return { status: 'recovery' };
  try {
    return { status: 'ok', model: steps.decrypt(householdKey, text), householdKey };
  } catch {
    return { status: 'recovery' };
  }
}
