// Voice entry (mockup V, approved by Cath 2026-10-30): turns what was said ("Spent 250 on
// groceries yesterday") into form fields. Our own rules only: no AI service, nothing leaves
// the phone. Anything unclear is left out, so the form shows it empty for the person to fill.
// Nothing here saves: the form is filled and the person checks it and taps Save.
// No Firebase or phone modules: the checks run this file directly.

export type Heard = {
  text: string;
  amount?: number;
  date?: string; // YYYY-MM-DD
  direction?: 'out' | 'in';
  category?: string; // one of the person's own categories
  name?: string; // what it is ("Electric", "Groceries", "Ana")
  repeat?: 'monthly' | 'weekly' | 'biweekly' | 'yearly';
  dueDay?: number; // 1-31
  person?: string;
  loanDirection?: 'lent' | 'borrowed';
  minimum?: number;
  ratePercent?: number;
  items?: string[]; // lists: "milk, eggs and bread"
  paid?: boolean; // "paid the internet bill"
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE: Record<string, number> = { hundred: 100, thousand: 1000, k: 1000, million: 1_000_000 };
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, 'twenty-first': 21, 'twenty-second': 22, 'twenty-third': 23,
  'twenty-fourth': 24, 'twenty-fifth': 25, 'twenty-sixth': 26, 'twenty-seventh': 27, 'twenty-eighth': 28,
  'twenty-ninth': 29, thirtieth: 30, 'thirty-first': 31,
};
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// "two thousand five hundred" -> 2500; "2.5k" -> 2500; "1,500" -> 1500. Returns the amount
// and where it was in the text, or null.
function findAmount(t: string): { value: number; start: number; end: number } | null {
  // (?<!…): a number glued to letters ("MP2") is part of a name, not an amount (2026-10-31).
  const digits = /(?<![A-Za-z0-9])(?:₱|php|p|\$)?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s?(k|thousand|million)?(?!\s?(?:st|nd|rd|th)\b)(?!\s?%)/i;
  const re = new RegExp(digits.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    // Skip day numbers right after "on the" / "every" ("due on the 15th" is handled by ordinals).
    const before = t.slice(Math.max(0, m.index - 8), m.index).toLowerCase();
    if (/(?:on the|every|the)\s?$/.test(before) && !m[3]) continue;
    let v = Number(m[1].replace(/,/g, '')) + (m[2] ? Number(`0.${m[2]}`) : 0);
    if (m[3]) v *= SCALE[m[3].toLowerCase()] ?? 1;
    return { value: Math.round(v * 100) / 100, start: m.index, end: m.index + m[0].length };
  }
  // Number words.
  const words = t.toLowerCase().split(/(\s+|-)/);
  let pos = 0;
  let total = 0, cur = 0, started = -1, end = -1;
  for (const w of words) {
    const clean = w.trim();
    if (clean && (clean in NUMBER_WORDS || clean in SCALE || (clean === 'and' && started >= 0))) {
      if (started < 0) started = pos;
      if (clean in NUMBER_WORDS) cur += NUMBER_WORDS[clean];
      else if (clean === 'hundred') cur = (cur || 1) * 100;
      else if (clean in SCALE) {
        total += (cur || 1) * SCALE[clean];
        cur = 0;
      }
      end = pos + w.length;
    } else if (clean && started >= 0) break;
    pos += w.length;
  }
  if (started >= 0 && total + cur > 0) return { value: total + cur, start: started, end };
  return null;
}

function findDate(t: string, now: Date): string | undefined {
  const s = t.toLowerCase();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/\b(day before yesterday)\b/.test(s)) return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 2));
  if (/\byesterday\b/.test(s)) return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  if (/\btoday\b|\bthis morning\b|\btonight\b/.test(s)) return iso(d);
  if (/\btomorrow\b/.test(s)) return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const ago = /\b(\d+|one|two|three|four|five|six|seven)\s+days?\s+ago\b/.exec(s);
  if (ago) {
    const n = /\d/.test(ago[1]) ? Number(ago[1]) : NUMBER_WORDS[ago[1]];
    return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
  }
  const wd = /\b(last|this|on)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.exec(s);
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[2]);
    let back = (d.getDay() - target + 7) % 7;
    if (back === 0 && wd[1] === 'last') back = 7;
    return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back));
  }
  const md = new RegExp(`\\b(${MONTHS.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(s);
  if (md) {
    const m = MONTHS.indexOf(md[1]);
    let y = d.getFullYear();
    const cand = new Date(y, m, Number(md[2]));
    if (cand.getTime() - d.getTime() > 60 * 86400000) y -= 1; // a date well ahead = last year
    return iso(new Date(y, m, Number(md[2])));
  }
  return undefined;
}

function findDueDay(s: string): number | undefined {
  const num = /\b(?:on the|every|due(?: on)?(?: the)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(s);
  if (num && Number(num[1]) >= 1 && Number(num[1]) <= 31) return Number(num[1]);
  const ord = /\b(\d{1,2})(?:st|nd|rd|th)\b/.exec(s);
  if (ord && Number(ord[1]) >= 1 && Number(ord[1]) <= 31) return Number(ord[1]);
  for (const [w, n] of Object.entries(ORDINALS).sort((a, b) => b[0].length - a[0].length)) {
    if (new RegExp(`\\b${w}\\b`).test(s)) return n;
  }
  return undefined;
}

const titleCase = (w: string) => w.replace(/\b\w/g, (c) => c.toUpperCase());

// Best match among the person's own names (categories, bills, pots, people): the longest
// name that appears in what was said, ignoring small differences in case and plurals.
export function matchName(text: string, names: string[]): string | undefined {
  const s = ` ${text.toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ')} `;
  let best: string | undefined;
  for (const n of names) {
    const k = n.toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!k) continue;
    const forms = [k, k.endsWith('s') ? k.slice(0, -1) : `${k}s`, k.replace(/ies$/, 'y'), k.endsWith('y') ? `${k.slice(0, -1)}ies` : ''];
    if (forms.some((f) => f && s.includes(` ${f} `)) && (!best || k.length > best.length)) best = n;
  }
  return best;
}

// A list said in one go: "milk, eggs and two loaves of bread" -> ["Milk", "Eggs", "Two loaves of bread"].
export function splitItems(text: string): string[] {
  const body = text
    .replace(/^\s*(?:add|put|buy|get|need(?: to buy)?|remind me to|to do|todo)\s+/i, '')
    .replace(/\s+(?:to|on|in)\s+(?:the|my)\s+(?:grocery|groceries|shopping|to-?do)\s+list\s*$/i, '')
    .replace(/\s+(?:to|on|in)\s+(?:the|my)\s+list\s*$/i, '');
  return body
    .split(/\s*,\s*|\s+and\s+|\s+then\s+/i)
    .map((x) => x.trim().replace(/[.!?]+$/, ''))
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
}

export function parseVoice(
  raw: string,
  opts: { now?: Date; categories?: string[]; names?: string[]; people?: string[] } = {}
): Heard {
  const text = (raw || '').trim();
  const s = text.toLowerCase();
  const now = opts.now ?? new Date();
  const out: Heard = { text };
  if (!text) return out;

  // Percent first (so "3%" isn't read as an amount), then the minimum payment.
  const pct = /(\d+(?:\.\d+)?)\s?(?:%|percent)/.exec(s);
  if (pct) out.ratePercent = Number(pct[1]);
  let work = text.replace(/(\d+(?:\.\d+)?)\s?(?:%|percent)(?:\s+(?:a|per)\s+(?:month|year))?/gi, ' ');
  const min = /\bminimum(?: payment)?(?: of)?\s+(?:₱|php|p|\$)?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/i.exec(work);
  if (min) {
    out.minimum = Number(min[1].replace(/,/g, ''));
    work = work.replace(min[0], ' ');
  }
  const dueDay = /\b(due|every|on the|monthly|each month)\b/.test(s) ? findDueDay(s) : undefined;
  if (dueDay) out.dueDay = dueDay;
  const amt = findAmount(work);
  if (amt) out.amount = amt.value;

  if (/\b(every month|monthly|each month|a month)\b/.test(s) || (dueDay && /\bevery\b/.test(s))) out.repeat = 'monthly';
  if (/\b(every week|weekly|each week)\b/.test(s)) out.repeat = 'weekly';
  if (/\b(every two weeks|every other week|biweekly|bi-weekly|twice a month)\b/.test(s)) out.repeat = 'biweekly';
  if (/\b(every year|yearly|annually|each year)\b/.test(s)) out.repeat = 'yearly';

  if (/\b(got|received|earned|salary|income|paid me|sold|refund(?:ed)?|bonus|allowance)\b/.test(s) && !/\b(paid for|spent|bought)\b/.test(s)) out.direction = 'in';
  else if (/\b(spent|paid|bought|cost|for|on)\b/.test(s)) out.direction = 'out';
  if (/\bpaid\b/.test(s) && /\bbill\b/.test(s) && !amt) out.paid = true;

  if (/\b(i lent|lent|loaned)\b/.test(s)) out.loanDirection = 'lent';
  if (/\b(i borrowed|borrowed|owe)\b/.test(s)) out.loanDirection = 'borrowed';

  const date = findDate(s, now);
  if (date) out.date = date;

  const people = opts.people ?? [];
  const person = matchName(text, people) ?? (/\b(?:lent|borrowed from|owe|from|to)\s+([A-Z][a-zñ]+)/.exec(text)?.[1]);
  if (person && out.loanDirection) out.person = person;

  const cat = opts.categories ? matchName(text, opts.categories) : undefined;
  if (cat) out.category = cat;

  const known = opts.names ? matchName(text, opts.names) : undefined;
  if (known) out.name = known;
  else {
    // "Electric bill 2,400 ..." -> "Electric"; "spent 250 on groceries" -> "Groceries".
    const bill = /^(?:my |the |a )?([a-zñ][a-zñ ]{1,30}?)\s+(?:bill|subscription|plan|loan|debt|card)\b/i.exec(text);
    const onWhat = /\b(?:on|for)\s+(?:the |my |a |some )?([a-zñ][a-zñ ]{1,30}?)(?=\s+(?:yesterday|today|tomorrow|last|this|on|for|at|every|due|\d)|[.,!?]?$)/i.exec(text);
    const lead = /^([a-zñ][a-zñ ]{1,30}?)\s+(?:₱|php|p|\$)?\d/i.exec(text);
    const pick = bill?.[1] ?? onWhat?.[1] ?? (lead && !/\b(spent|paid|got|received|i|put|add)\b/i.test(lead[1]) ? lead[1] : undefined);
    if (pick && !/^(spent|paid|got|received|i|put|add|bought)$/i.test(pick.trim())) out.name = titleCase(pick.trim());
  }
  if (out.loanDirection && out.person && !known) out.name = out.person;

  if (!/\d/.test(s) && !amt && !out.date) {
    const items = splitItems(text);
    if (items.length) out.items = items;
  } else if (/,|\band\b/.test(s) && /\b(add|buy|get|need|list|to do|todo|remind)\b/.test(s) && !amt) {
    out.items = splitItems(text);
  }
  return out;
}

// The next date on or after today that falls on this day of the month (short months use
// their last day): what a "due on the 15th" bill's first due date is.
export function nextDueDate(day: number, now: Date = new Date()): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let add = 0; add < 3; add++) {
    const y = today.getFullYear();
    const m = today.getMonth() + add;
    const last = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(day, last));
    if (d >= today) return iso(d);
  }
  return iso(today);
}

// ---- 2026-10-31 (Cath: voice on every form that didn't have it) ----

const FILLER = /\b(?:about|around|roughly|maybe|add|added|put|move|moved|in|into|money|pesos?|php|for|the|a|an|of|on|yesterday|today|tomorrow|this|last)\b/gi;
const AMOUNT_TEXT = /(?<![A-Za-z0-9])(?:₱|php|p|\$)?\s?\d[\d,]*(?:\.\d+)?\s?(?:k|thousand|million)?/gi;
const capFirst = (x: string) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);

function leftoverName(text: string): string {
  return capFirst(
    text
      .replace(AMOUNT_TEXT, ' ')
      .replace(new RegExp(String.raw`\b(?:${Object.keys(NUMBER_WORDS).join('|')}|hundred|thousand|million)\b`, 'gi'), ' ')
      .replace(FILLER, ' ')
      .replace(/[,.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

// A name and an amount (and a date if one was said): new account ("BPI savings 24,300"),
// new investment, Log payday, Add money, Home's estimate. Only what was heard is returned.
export function voiceThing(text: string, opts: { now?: Date } = {}): { name?: string; amount?: number; date?: string } {
  const h = parseVoice(text, { now: opts.now });
  const out: { name?: string; amount?: number; date?: string } = {};
  const name = leftoverName(h.name ?? text); // ("two thousand" alone is an amount, not a name)
  if (name) out.name = name;
  if (h.amount !== undefined) out.amount = h.amount;
  if (h.date) out.date = h.date;
  return out;
}

// Several things with their costs in one go: "Cake 1,500, gift 2,000 and balloons 500"
// (the comma inside 1,500 stays part of the amount).
export function voiceItems(text: string): { name: string; amount?: number }[] {
  return text
    .replace(/^\s*(?:add|put|buy|get)\s+/i, '')
    .split(/\s*,\s*(?!\d{3}(?!\d))|\s+and\s+|\s+then\s+/i)
    .map((part) => part.trim().replace(/[.!?]+$/, ''))
    .filter(Boolean)
    .map((part) => {
      const a = findAmount(part);
      const name = capFirst((a ? part.slice(0, a.start) + part.slice(a.end) : part).replace(/\s+/g, ' ').trim());
      return a ? { name, amount: a.value } : { name };
    })
    .filter((x) => x.name);
}

// A trip: "Baguio weekend November 14 to 16", "Cebu trip from December 28 to January 2".
// Trips are ahead, so a date already past means next year.
export function voiceTrip(text: string, now: Date = new Date()): { name?: string; start?: string; end?: string } {
  const out: { name?: string; start?: string; end?: string } = {};
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthRe = MONTHS.join('|');
  const startM = new RegExp(String.raw`\b(${monthRe})\s+(\d{1,2})(?:st|nd|rd|th)?\b`, 'i').exec(text);
  const nameEnd = startM ? startM.index : text.length;
  const name = text.slice(0, nameEnd).replace(/\s+(?:from|on|for)\s*$/i, '').replace(/[,\s]+$/, '').trim();
  if (name) out.name = capFirst(name);
  if (!startM) return out;
  const sm = MONTHS.indexOf(startM[1].toLowerCase());
  let start = new Date(today.getFullYear(), sm, Number(startM[2]));
  if (start < today) start = new Date(today.getFullYear() + 1, sm, Number(startM[2]));
  out.start = iso(start);
  const rest = text.slice(startM.index + startM[0].length);
  const endM = new RegExp(String.raw`^\s*(?:to|until|till|through|-)\s*(?:(${monthRe})\s+)?(\d{1,2})(?:st|nd|rd|th)?\b`, 'i').exec(rest);
  if (endM) {
    const em = endM[1] ? MONTHS.indexOf(endM[1].toLowerCase()) : sm;
    let end = new Date(start.getFullYear(), em, Number(endM[2]));
    if (end < start) end = endM[1] ? new Date(start.getFullYear() + 1, em, Number(endM[2])) : new Date(start.getFullYear(), sm + 1, Number(endM[2]));
    out.end = iso(end);
  }
  return out;
}

// A transfer between your own accounts: "Move 2,000 from BPI savings to GCash today".
export function voiceTransfer(text: string, accountNames: string[], now: Date = new Date()): { amount?: number; from?: string; to?: string; date?: string } {
  const out: { amount?: number; from?: string; to?: string; date?: string } = {};
  const a = findAmount(text);
  if (a) out.amount = a.value;
  const stop = String.raw`(?=\s+(?:to|from|today|yesterday|tomorrow|on|last)\b|[.,]|$)`;
  const from = new RegExp(String.raw`\bfrom\s+(.+?)${stop}`, 'i').exec(text);
  const to = new RegExp(String.raw`\bto\s+(.+?)${stop}`, 'i').exec(text);
  const f = from ? matchName(from[1], accountNames) : undefined;
  const t = to ? matchName(to[1], accountNames) : undefined;
  if (f) out.from = f;
  if (t) out.to = t;
  const d = findDate(text, now);
  if (d) out.date = d;
  return out;
}
