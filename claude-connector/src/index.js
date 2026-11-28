// Finance Flow connector for Claude (Cloudflare Worker, free plan). Claude's custom connector
// URL is https://<worker>.workers.dev/mcp/<CONNECTOR_SECRET>. Anyone without the secret gets 404.
import { makeFirestore } from './firestore.js';
import { handleRpc, makeTools } from './mcp.js';

function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export function makeHandler(deps = {}) {
  return async function fetchHandler(request, env) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/mcp\/([^/]+)\/?$/);
    if (!m || !env.CONNECTOR_SECRET || env.CONNECTOR_SECRET.length < 32 || !same(m[1], env.CONNECTOR_SECRET)) return new Response('Not found', { status: 404 });
    if (request.method === 'GET' || request.method === 'DELETE') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } });
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
    }
    const store =
      deps.store ||
      makeFirestore({ projectId: env.FIREBASE_PROJECT_ID, serviceAccount: JSON.parse(env.FIREBASE_SERVICE_ACCOUNT), fetchImpl: deps.fetchImpl });
    const tools = makeTools({
      store,
      uid: env.FINANCE_FLOW_UID,
      sentry: { token: env.SENTRY_TOKEN, org: env.SENTRY_ORG, project: env.SENTRY_PROJECT, host: env.SENTRY_HOST },
      fetchImpl: deps.fetchImpl,
    });
    const batch = Array.isArray(body) ? body : [body];
    const answers = (await Promise.all(batch.map((msg) => handleRpc(msg, tools)))).filter(Boolean);
    if (!answers.length) return new Response(null, { status: 202 });
    return json(Array.isArray(body) ? answers : answers[0]);
  };
}

export default { fetch: makeHandler() };
