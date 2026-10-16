import React from 'react';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';
import { DEFAULT_GROUP_COLORS, AccountGroup } from './AccountCard';
import type { BalanceAccountEntry, HouseholdModel, PaymentMethod } from '../types';

// Redesign: one look for an account card everywhere it appears (Home's Wallet, the
// Card page, the Accounts list, Move money, account pickers), so each card keeps its
// own colour across screens. The colour is a soft wash with a faint border in the
// same colour; text stays the normal ink colours so it is always readable.

// Blends a colour into a background colour (amount 0..1 of the colour), giving a solid
// result so anything underneath never shows through.
export function mixHex(hex: string, base: string, amount: number): string {
  const p = (h: string) => {
    const v = h.replace('#', '');
    const full = v.length === 3 ? v.split('').map((x) => x + x).join('') : v.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const a = p(hex);
  const b = p(base);
  if (a.some(isNaN) || b.some(isNaN)) return base;
  return '#' + a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount)).toString(16).padStart(2, '0')).join('');
}

export function cardColor(account: Pick<BalanceAccountEntry, 'color'> | undefined, group: AccountGroup): string {
  return account?.color || DEFAULT_GROUP_COLORS[group];
}

// The colour of the account a transaction was paid from or into.
export function paymentMethodColor(model: HouseholdModel, pm: PaymentMethod | undefined): string | null {
  if (!pm) return null;
  const list = model.balanceAccounts[pm.type] || [];
  const acct = pm.accountId ? list.find((a) => a.id === pm.accountId) : list[0];
  return cardColor(acct, pm.type);
}

// Background and border for a card face (the same shade as Home's Wallet cards).
export function cardFaceColors(hex: string, isDark: boolean) {
  return {
    backgroundColor: mixHex(hex, isDark ? '#1C1C1E' : '#FFFFFF', isDark ? 0.2 : 0.11),
    borderColor: `${hex}4D`,
  };
}

// A lighter wash for small things like chips and rows in a list.
export function cardChipColors(hex: string, isDark: boolean, selected = false) {
  return {
    backgroundColor: mixHex(hex, isDark ? '#1C1C1E' : '#FFFFFF', isDark ? (selected ? 0.3 : 0.16) : selected ? 0.18 : 0.08),
    borderColor: selected ? hex : `${hex}40`,
  };
}

// The soft gradient that sits inside a card face. Place it as the card's first child.
export function CardFaceFill({ color, radius }: { color: string; radius?: number }) {
  const { isDark } = useTheme();
  return <GradientFill kind="card" color={color} surface={isDark ? '#1C1C1E' : '#FFFFFF'} isDark={isDark} radius={radius} />;
}
