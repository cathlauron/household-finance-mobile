// The MCP part: what Claude sees (tools) and what each one does. Kept apart from the Worker so
// the tests can run it with a pretend Firestore.

export const PROTOCOL_VERSION = '2025-06-18';
const MAX_PENDING = 50;

const entrySchema = {
  type: 'object',
  properties: {
    label: { type: 'string', description: 'What it was, e.g. "Lunch at Jollibee". Up to 80 characters.' },
    amount: { type: 'number', description: 'Amount in pesos, more than 0 (e.g. 250.5).' },
    direction: { type: 'string', enum: ['out', 'in'], description: '"out" for spending (default), "in" for money received.' },
    category: { type: 'string', description: 'Category name as in the app, e.g. "Groceries". Optional.' },
    account: { type: 'string', description: 'Account name exactly as in the summary, e.g. "Wallet". Optional; without it no balance changes until reviewed.' },
    date: { type: 'string', description: 'YYYY-MM-DD, today or earlier. Optional (default today).' },
    note: { type: 'string', description: 'Optional note, up to 300 characters.' },
  },
  required: ['label', 'amount'],
  additionalProperties: false,
};

export const TOOLS = [
  {
    name: 'get_finance_summary',
    description:
      'Read Finance Flow totals: account balances, total balance, Left to Spend until payday, this month in/out/saved, spending per category against its budget, and bills/debts/loans due before payday. Amounts are in the summary currency (usually PHP). Transactions themselves are not shared.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'add_transaction',
    description:
      'Queue a transaction for Finance Flow. The phone adds it next time the app opens, marked "To review" so the owner checks it. Use account names from get_finance_summary.',
    inputSchema: entrySchema,
  },
  {
    name: 'list_pending_transactions',
    description: 'List transactions queued with add_transaction that the phone has not picked up yet.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'cancel_pending_transaction',
    description: 'Remove a queued transaction before the phone picks it up. Cannot touch anything already in the app.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
  },
  {
    name: 'get_app_issues',
    description:
      'Finance Flow crash and error reports from Sentry: the newest unresolved problems, how often each happened and when last seen. Use it to look for bugs, crashes and slow screens.',
    inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'How many (1-25, default 10).' } }, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
];

const pad = (n) => String(n).padStart(2, '0');
// Philippine time (UTC+8) unless told otherwise, so "today" matches the phone.
export function todayIn(offsetHours = 8, now = new Date()) {
  const d = new Date(now.getTime() + offsetHours * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function checkEntry(a, today) {
  const errors = [];
  const label = typeof a.label === 'string' ? a.label.trim() : '';
  if (!label) errors.push('label is required');
  if (label.length > 80) errors.push('label is longer than 80 characters');
  if (typeof a.amount !== 'number' || !Number.isFinite(a.amount) || a.amount <= 0 || a.amount > 100_000_000) errors.push('amount must be a number above 0');
  const direction = a.direction ?? 'out';
  if (direction !== 'out' && direction !== 'in') errors.push('direction must be "out" or "in"');
  if (a.date !== undefined && (typeof a.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.date) || a.date > today)) errors.push('date must be YYYY-MM-DD, today or earlier');
  for (const [k, max] of [['category', 40], ['account', 60], ['note', 300]]) {
    if (a[k] !== undefined && (typeof a[k] !== 'string' || a[k].length > max)) errors.push(`${k} must be text up to ${max} characters`);
  }
  if (errors.length) return { errors };
  const entry = { label, amount: Math.round(a.amount * 100) / 100, direction, date: a.date || today, createdAt: Date.now() };
  for (const k of ['category', 'account', 'note']) if (a[k] && a[k].trim()) entry[k] = a[k].trim();
  return { entry };
}

const textResult = (value, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

export function makeTools({ store, uid, sentry, fetchImpl = fetch, now = () => new Date() }) {
  const linkPath = `claudeLinks/${uid}`;
  const queuePath = `${linkPath}/queue`;
  return {
    async get_finance_summary() {
      const doc = await store.get(linkPath);
      if (!doc || !doc.summary) return textResult('No summary yet. In the app: Settings › Backup & Data › Connect to Claude, then open the app once while online.', true);
      const ageMin = doc.updatedAt ? Math.round((now().getTime() - doc.updatedAt) / 60000) : null;
      return textResult({ ...doc.summary, sharedMinutesAgo: ageMin });
    },
    async add_transaction(args) {
      const { entry, errors } = checkEntry(args || {}, todayIn(8, now()));
      if (errors) return textResult(`Not added: ${errors.join('; ')}.`, true);
      const link = await store.get(linkPath);
      if (!link) return textResult('Not added: Connect to Claude is off in the app (Settings › Backup & Data).', true);
      const pending = await store.list(queuePath, MAX_PENDING + 1);
      if (pending.length >= MAX_PENDING) return textResult(`Not added: ${MAX_PENDING} entries are already waiting. Open the app so it picks them up.`, true);
      const id = await store.create(queuePath, entry);
      return textResult({ queued: true, id, entry, note: 'It appears in the app under To review next time the app opens.' });
    },
    async list_pending_transactions() {
      const pending = await store.list(queuePath, MAX_PENDING);
      return textResult(pending.map(({ _createTime, ...e }) => e));
    },
    async cancel_pending_transaction(args) {
      const id = args && typeof args.id === 'string' ? args.id : '';
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return textResult('Not removed: id is not valid.', true);
      const doc = await store.get(`${queuePath}/${id}`);
      if (!doc) return textResult('Not found: it was already picked up by the app, or never queued.', true);
      await store.remove(`${queuePath}/${id}`);
      return textResult({ removed: id });
    },
    async get_app_issues(args) {
      if (!sentry || !sentry.token || !sentry.org || !sentry.project) return textResult('Sentry is not set up for this connector yet (SENTRY_TOKEN, SENTRY_ORG, SENTRY_PROJECT).', true);
      const limit = Math.max(1, Math.min(25, Math.round((args && args.limit) || 10)));
      const url = `https://${sentry.host || 'sentry.io'}/api/0/projects/${encodeURIComponent(sentry.org)}/${encodeURIComponent(sentry.project)}/issues/?query=is:unresolved&sort=date&limit=${limit}`;
      const res = await fetchImpl(url, { headers: { authorization: `Bearer ${sentry.token}` } });
      if (!res.ok) return textResult(`Sentry answered ${res.status}.`, true);
      const issues = await res.json();
      return textResult(
        issues.slice(0, limit).map((i) => ({ title: i.title, where: i.culprit, level: i.level, times: Number(i.count), users: i.userCount, firstSeen: i.firstSeen, lastSeen: i.lastSeen, link: i.permalink }))
      );
    },
  };
}

// One JSON-RPC message in, the answer out (null for a notification, which gets no answer).
export async function handleRpc(msg, tools) {
  const id = msg && 'id' in msg ? msg.id : undefined;
  const reply = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(-32600, 'Invalid request');
  if (id === undefined) return null; // notifications/initialized and friends
  switch (msg.method) {
    case 'initialize':
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'finance-flow', version: '1.0.0' },
        instructions: 'Finance Flow household budget. Read totals with get_finance_summary; add spending with add_transaction (the owner reviews it in the app). Check crashes with get_app_issues.',
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const name = msg.params && msg.params.name;
      const fn = tools[name];
      if (!fn) return fail(-32602, `Unknown tool: ${name}`);
      try {
        return reply(await fn((msg.params && msg.params.arguments) || {}));
      } catch (e) {
        return reply(textResult(`Something went wrong: ${e && e.message ? e.message : 'unknown error'}`, true));
      }
    }
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}
