import type { HouseholdModel } from './types';
import { computeAutoCategory } from './categorization';

// H-46 (Cath, 2026-10-29): "if it is possible for it to somehow identify what the category
// would be and have it preselected where I just need to change it if it's not right."
// First your own rules and saved payees (as before); otherwise the category of your most
// recent entry with the same name ("Jollibee" also matches "Jollibee Ayala", and the other
// way round). null = no guess.
const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

export function guessCategory(model: HouseholdModel, label: string, amount: number): { category: string; from: 'rule' | 'past' } | null {
  const l = norm(label);
  if (!l) return null;
  const rule = computeAutoCategory(model, label, amount);
  if (rule) return { category: rule, from: 'rule' };
  let best: { category: string; at: string } | null = null;
  for (const t of model.manualTransactions || []) {
    const c = (t.category || '').trim();
    if (!c) continue;
    const p = norm(t.label || '');
    if (!p) continue;
    if (p === l || p.startsWith(l + ' ') || l.startsWith(p + ' ')) {
      const at = `${t.date || ''}|${String(t.createdAt ?? 0).padStart(15, '0')}`;
      if (!best || at > best.at) best = { category: c, at };
    }
  }
  return best ? { category: best.category, from: 'past' } : null;
}

// The categories to choose from: your categories, then any others you've used, A to Z.
export function categoryOptions(model: HouseholdModel): string[] {
  const names = new Set<string>();
  for (const c of model.categories || []) if (c.name?.trim() && !c.parentId) names.add(c.name.trim());
  for (const t of model.manualTransactions || []) if (t.category?.trim()) names.add(t.category.trim());
  return [...names].sort((a, b) => a.localeCompare(b));
}
