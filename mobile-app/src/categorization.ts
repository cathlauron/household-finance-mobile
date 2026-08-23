// ============================================================
// Categorization rules — auto-filling a transaction's category
// ============================================================
// A saved payee's own default category (Settings → Merchants & Payees) wins first, since
// it's the more specific signal — a whole payee name matching exactly. Otherwise, the
// first categorization rule whose "contains" text matches the label — and whose optional
// amount range (if any) fits — wins. Rules are checked in array order, so reordering them
// in Settings genuinely changes which one applies when more than one could match.
// Callers should only use the result to fill in a category field that's still empty —
// this never overwrites something the person already typed by hand.
// ============================================================

import type { HouseholdModel, CategorizationRule, Payee } from './types';

function findPayeeByName(payees: Payee[], name: string): Payee | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return payees.find((p) => p.name.trim().toLowerCase() === q);
}

export function findMatchingRuleCategory(
  rules: CategorizationRule[],
  label: string,
  amount: number
): string | null {
  const text = label.trim().toLowerCase();
  if (!text) return null;
  for (const rule of rules) {
    const cond = (rule.labelContains || '').trim().toLowerCase();
    if (!cond || text.indexOf(cond) === -1) continue;
    if (!(rule.category || '').trim()) continue;
    const min = rule.amountMin === '' || rule.amountMin === undefined ? null : Number(rule.amountMin);
    const max = rule.amountMax === '' || rule.amountMax === undefined ? null : Number(rule.amountMax);
    if (min !== null && (isNaN(amount) || amount < min)) continue;
    if (max !== null && (isNaN(amount) || amount > max)) continue;
    return rule.category;
  }
  return null;
}

export function computeAutoCategory(
  model: HouseholdModel,
  label: string,
  amount: number
): string | null {
  const payee = findPayeeByName(model.payees ?? [], label);
  if (payee && (payee.defaultCategory || '').trim()) return payee.defaultCategory;
  return findMatchingRuleCategory(model.categorizationRules ?? [], label, amount);
}