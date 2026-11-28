import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { makeHandler } from '../src/index.js';
import { checkEntry, todayIn } from '../src/mcp.js';
import { signJwt, fromFields, toFields } from '../src/firestore.js';

const SECRET = 'a'.repeat(40);
const env = { CONNECTOR_SECRET: SECRET, FINANCE_FLOW_UID: 'uid1' };

function fakeStore(docs = {}) {
  let n = 0;
  return {
    docs,
    async get(p) { return docs[p] ? { id: p.split('/').pop(), ...docs[p] } : null; },
    async list(p) { return Object.entries(docs).filter(([k]) => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(([k, v]) => ({ id: k.split('/').pop(), ...v })); },
    async create(p, data) { const id = 'q' + ++n; docs[`${p}/${id}`] = data; return id; },
    async remove(p) { delete docs[p]; },
  };
}
const linked = () => fakeStore({ 'claudeLinks/uid1': { summary: { totalBalance: 1234 }, updatedAt: Date.now() - 120000, v: 1 } });

async function rpc(store, msg, path = `/mcp/${SECRET}`, fetchImpl) {
  const h = makeHandler({ store, fetchImpl });
  const res = await h(new Request('https://x.workers.dev' + path, { method: 'POST', body: JSON.stringify(msg) }), { ...env, SENTRY_TOKEN: fetchImpl ? 't' : undefined, SENTRY_ORG: 'o', SENTRY_PROJECT: 'p' });
  return { status: res.status, body: res.status === 200 ? await res.json() : null };
}
const call = (store, name, args = {}, fetchImpl) => rpc(store, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, undefined, fetchImpl);

test('a wrong or missing secret gets "not found"', async () => {
  assert.equal((await rpc(linked(), { jsonrpc: '2.0', id: 1, method: 'ping' }, '/mcp/' + 'b'.repeat(40))).status, 404);
  assert.equal((await rpc(linked(), { jsonrpc: '2.0', id: 1, method: 'ping' }, '/')).status, 404);
  const h = makeHandler({ store: linked() });
  const res = await h(new Request(`https://x/mcp/short`, { method: 'POST', body: '{}' }), { ...env, CONNECTOR_SECRET: 'short' });
  assert.equal(res.status, 404, 'a short secret is never accepted');
});

test('initialize, tools/list, and a notification gets 202 with no body', async () => {
  const init = await rpc(linked(), { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.body.result.serverInfo.name, 'finance-flow');
  const list = await rpc(linked(), { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.deepEqual(list.body.result.tools.map((t) => t.name), ['get_finance_summary', 'add_transaction', 'list_pending_transactions', 'cancel_pending_transaction', 'get_app_issues']);
  assert.equal((await rpc(linked(), { jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);
});

test('the summary is read, with how old it is', async () => {
  const r = await call(linked(), 'get_finance_summary');
  const s = JSON.parse(r.body.result.content[0].text);
  assert.equal(s.totalBalance, 1234);
  assert.equal(s.sharedMinutesAgo, 2);
  const off = await call(fakeStore(), 'get_finance_summary');
  assert.equal(off.body.result.isError, true);
});

test('add_transaction queues a checked entry; list and cancel work', async () => {
  const store = linked();
  const r = await call(store, 'add_transaction', { label: ' Lunch ', amount: 250.456, account: 'Wallet' });
  const out = JSON.parse(r.body.result.content[0].text);
  assert.equal(out.queued, true);
  const saved = store.docs['claudeLinks/uid1/queue/q1'];
  assert.equal(saved.label, 'Lunch');
  assert.equal(saved.amount, 250.46);
  assert.equal(saved.direction, 'out');
  const pending = JSON.parse((await call(store, 'list_pending_transactions')).body.result.content[0].text);
  assert.equal(pending.length, 1);
  await call(store, 'cancel_pending_transaction', { id: 'q1' });
  assert.equal(store.docs['claudeLinks/uid1/queue/q1'], undefined);
  const bad = await call(store, 'cancel_pending_transaction', { id: '../x' });
  assert.equal(bad.body.result.isError, true);
});

test('add_transaction refuses bad entries, and when Connect to Claude is off', async () => {
  for (const args of [{ amount: 5 }, { label: 'x', amount: 0 }, { label: 'x', amount: '5' }, { label: 'x', amount: 5, direction: 'saving' }, { label: 'x', amount: 5, date: '2999-01-01' }]) {
    const r = await call(linked(), 'add_transaction', args);
    assert.equal(r.body.result.isError, true, JSON.stringify(args));
  }
  const off = await call(fakeStore(), 'add_transaction', { label: 'x', amount: 5 });
  assert.match(off.body.result.content[0].text, /Connect to Claude is off/);
});

test('get_app_issues reads unresolved Sentry issues', async () => {
  let asked = '';
  const fetchImpl = async (url, init) => {
    asked = url;
    assert.equal(init.headers.authorization, 'Bearer t');
    return new Response(JSON.stringify([{ title: 'TypeError: x is undefined', culprit: 'HomeScreen', level: 'error', count: '3', userCount: 1, firstSeen: 'a', lastSeen: 'b', permalink: 'l' }]));
  };
  const r = await call(linked(), 'get_app_issues', { limit: 5 }, fetchImpl);
  assert.match(asked, /projects\/o\/p\/issues\/\?query=is:unresolved/);
  assert.equal(JSON.parse(r.body.result.content[0].text)[0].times, 3);
  const none = await call(linked(), 'get_app_issues');
  assert.equal(none.body.result.isError, true);
});

test('checkEntry: today is Philippine time', () => {
  assert.equal(todayIn(8, new Date('2026-11-28T17:00:00Z')), '2026-11-29');
  assert.equal(checkEntry({ label: 'x', amount: 1 }, '2026-11-29').entry.date, '2026-11-29');
});

test('the Google sign-in note is signed with the server key (RS256)', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { client_email: 'c@p.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const jwt = await signJwt(sa, 1000);
  const [h, p, s] = jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(p, 'base64url')).scope, 'https://www.googleapis.com/auth/datastore');
  const v = createVerify('RSA-SHA256');
  v.update(`${h}.${p}`);
  assert.ok(v.verify(publicKey, Buffer.from(s, 'base64url')));
});

test('Firestore values go both ways', () => {
  const x = { a: 1, b: 2.5, c: 'x', d: [true, null], e: { f: 'g' } };
  assert.deepEqual(fromFields(toFields(x)), x);
});
