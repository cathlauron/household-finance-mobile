// Firestore over its web address (REST), signed in with the project's own server key (a
// Google service account). Works on Cloudflare Workers' free plan; no Firebase Blaze plan.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

const b64url = (bytes) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64urlText = (text) => b64url(new TextEncoder().encode(text));

function pemToBytes(pem) {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function signJwt(serviceAccount, nowSec = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = { iss: serviceAccount.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 };
  const unsigned = `${b64urlText(JSON.stringify(header))}.${b64urlText(JSON.stringify(claims))}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToBytes(serviceAccount.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

let cached = null; // { token, until }
export async function accessToken(serviceAccount, fetchImpl = fetch) {
  const now = Date.now();
  if (cached && cached.until > now + 60_000 && cached.email === serviceAccount.client_email) return cached.token;
  const assertion = await signJwt(serviceAccount);
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status})`);
  const data = await res.json();
  cached = { token: data.access_token, until: now + (data.expires_in || 3600) * 1000, email: serviceAccount.client_email };
  return cached.token;
}
export function forgetToken() {
  cached = null;
}

// ---- Firestore values <-> plain values ----
export function fromValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
}
export function fromFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromValue(v);
  return out;
}
export function toValue(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(toValue) } };
  return { mapValue: { fields: toFields(x) } };
}
export function toFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = toValue(v);
  return out;
}

export function makeFirestore({ projectId, serviceAccount, fetchImpl = fetch }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  async function call(path, init = {}) {
    const token = await accessToken(serviceAccount, fetchImpl);
    const res = await fetchImpl(`${base}/${path}`, { ...init, headers: { ...(init.headers || {}), authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore ${init.method || 'GET'} failed (${res.status})`);
    return res.status === 204 ? {} : res.json();
  }
  const idOf = (name) => name.split('/').pop();
  return {
    async get(path) {
      const d = await call(path);
      return d ? { id: idOf(d.name), ...fromFields(d.fields), _updateTime: d.updateTime } : null;
    },
    async list(path, pageSize = 50) {
      const d = await call(`${path}?pageSize=${pageSize}`);
      return ((d && d.documents) || []).map((x) => ({ id: idOf(x.name), ...fromFields(x.fields), _createTime: x.createTime }));
    },
    async create(collectionPath, data) {
      const d = await call(collectionPath, { method: 'POST', body: JSON.stringify({ fields: toFields(data) }) });
      return idOf(d.name);
    },
    async remove(path) {
      await call(path, { method: 'DELETE' });
    },
  };
}
