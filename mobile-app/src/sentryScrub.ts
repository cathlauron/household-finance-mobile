// Crash reports (Cath, 2026-11-28): before anything is sent to Sentry, every amount, name and
// typed text is taken out. What's left is what broke and where: the error type, the code file
// and line, the screen names visited, the phone model and the app version.
//
// Kept: exception type, code frames (file, function, line), navigation and app lifecycle
// breadcrumbs (screen names only), device / os / app contexts, tags, release.
// Removed: user, request, extra, any other context, console / touch / http breadcrumbs,
// source lines around frames, frame variables, and every number in the remaining text.

type Any = Record<string, any>;

const KEEP_CONTEXTS = ['app', 'device', 'os', 'runtime', 'culture', 'react_native_context', 'trace'];
const KEEP_CRUMBS = ['navigation', 'app.lifecycle', 'device.orientation', 'sentry.transaction'];

// Every number (₱1,234.56, 2500, 12.5%) and anything that looks like an email.
export function scrubText(s: unknown): string | undefined {
  if (typeof s !== 'string') return undefined;
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(₱|PHP\s?|\$)?-?\d[\d,]*(\.\d+)?%?/g, '#')
    .slice(0, 500);
}

// A web address without its path or query (paths can hold usernames or ids).
export function scrubUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined;
  const m = u.match(/^(\w+:\/\/[^/?#]+)/);
  return m ? m[1] : '[url]';
}

function scrubFrames(st: Any | undefined) {
  if (!st || !Array.isArray(st.frames)) return st;
  return {
    frames: st.frames.map((f: Any) => ({
      filename: f.filename,
      abs_path: f.abs_path,
      function: f.function,
      module: f.module,
      lineno: f.lineno,
      colno: f.colno,
      in_app: f.in_app,
      platform: f.platform,
      instruction_addr: f.instruction_addr,
      package: f.package,
    })),
  };
}

function scrubCrumb(b: Any): Any | null {
  if (!KEEP_CRUMBS.includes(b.category)) return null;
  const data: Any = {};
  if (b.category === 'navigation') {
    // Screen names only (route params can hold ids and amounts).
    for (const k of ['from', 'to']) if (typeof b.data?.[k] === 'string') data[k] = b.data[k].split('?')[0].replace(/\d+/g, '#');
  }
  if (b.category === 'app.lifecycle' && typeof b.data?.state === 'string') data.state = b.data.state;
  return { type: b.type, category: b.category, level: b.level, timestamp: b.timestamp, message: scrubText(b.message), data };
}

function scrubContexts(c: Any | undefined) {
  const out: Any = {};
  for (const k of KEEP_CONTEXTS) if (c && c[k]) out[k] = c[k];
  if (out.device) {
    delete out.device.name; // the phone's name can be a person's name
  }
  return out;
}

export function scrubEvent<T extends Any>(event: T): T {
  const e: Any = { ...event };
  delete e.user;
  delete e.request;
  delete e.extra;
  delete e.server_name;
  e.message = scrubText(typeof e.message === 'string' ? e.message : e.message?.formatted ?? e.message?.message);
  if (e.logentry) e.logentry = { message: scrubText(e.logentry.message) };
  if (e.exception?.values) {
    e.exception = {
      values: e.exception.values.map((v: Any) => ({ type: v.type, value: scrubText(v.value), module: v.module, mechanism: v.mechanism, stacktrace: scrubFrames(v.stacktrace) })),
    };
  }
  if (Array.isArray(e.threads?.values)) {
    e.threads = { values: e.threads.values.map((t: Any) => ({ id: t.id, crashed: t.crashed, current: t.current, name: t.name, stacktrace: scrubFrames(t.stacktrace) })) };
  }
  e.breadcrumbs = Array.isArray(e.breadcrumbs) ? e.breadcrumbs.map(scrubCrumb).filter(Boolean) : [];
  e.contexts = scrubContexts(e.contexts);
  if (Array.isArray(e.spans)) {
    // Speed reports: keep what kind of step and how long; no addresses or text.
    e.spans = e.spans.map((s: Any) => ({ ...s, description: s.op?.startsWith('http') ? scrubUrl(String(s.description || '').split(' ').pop()) : scrubText(s.description), data: {} }));
  }
  if (typeof e.transaction === 'string') e.transaction = e.transaction.replace(/\d+/g, '#');
  if (e.tags) {
    const tags: Any = {};
    for (const [k, v] of Object.entries(e.tags)) tags[k] = typeof v === 'string' ? scrubText(v) : v;
    e.tags = tags;
  }
  return e as T;
}
