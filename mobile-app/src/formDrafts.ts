import { trace } from './trace';

// Cath, 2026-11-13 (mockup money-batch-4, change 2): a form closed without Add (a tap outside it,
// or a swipe down) keeps what was typed, and opens with it next time. Cancel throws it away.
// Kept on this phone only, never in the household's data. Photos are never kept.
export type DraftStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
  getAllKeys?: () => Promise<readonly string[]>;
  multiRemove?: (keys: string[]) => Promise<unknown>;
};
export type Draft = Record<string, unknown>;

const PREFIX = 'formDraft:';
const NEVER_KEPT = ['receiptPhoto'];

function worthKeeping(d: Draft): boolean {
  return Object.values(d).some((v) => (typeof v === 'string' ? v.trim() !== '' : typeof v === 'number' ? true : false));
}

export function createDraftStore(storage: DraftStorage) {
  const memory = new Map<string, Draft>();
  return {
    async save(form: string, values: Draft): Promise<void> {
      const d: Draft = {};
      Object.keys(values).forEach((k) => { if (!NEVER_KEPT.includes(k) && values[k] !== undefined) d[k] = values[k]; });
      if (!worthKeeping(d)) return this.clear(form);
      memory.set(form, d);
      trace('draft', 'kept', { form, fields: Object.keys(d).length });
      try { await storage.setItem(PREFIX + form, JSON.stringify(d)); } catch { /* still kept for this session */ }
    },
    async load(form: string): Promise<Draft | null> {
      if (memory.has(form)) return memory.get(form) as Draft;
      try {
        const raw = await storage.getItem(PREFIX + form);
        const d = raw ? JSON.parse(raw) : null;
        if (d && typeof d === 'object') {
          memory.set(form, d);
          return d;
        }
      } catch { /* nothing usable saved */ }
      return null;
    },
    // Signing out: nothing typed by one person is left for the next one on this phone.
    async clearAll(): Promise<void> {
      const inMemory = [...memory.keys()].map((f) => PREFIX + f);
      memory.clear();
      try {
        const stored = storage.getAllKeys ? (await storage.getAllKeys()).filter((k) => k.startsWith(PREFIX)) : [];
        const keys = [...new Set([...inMemory, ...stored])];
        if (storage.multiRemove) await storage.multiRemove(keys);
        else await Promise.all(keys.map((k) => storage.removeItem(k)));
      } catch { /* nothing to remove */ }
      trace('draft', 'all cleared');
    },
    async clear(form: string): Promise<void> {
      if (memory.delete(form)) trace('draft', 'cleared', { form });
      try { await storage.removeItem(PREFIX + form); } catch { /* nothing to remove */ }
    },
  };
}
