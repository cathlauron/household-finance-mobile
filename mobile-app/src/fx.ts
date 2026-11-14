import type { BalanceAccountEntry, HouseholdModel, ManualTransaction, Transfer } from './types';
import { accountCurrentBalance, formatPeso } from './balanceProjection';
import { makeId } from './utils';
import { trace } from './trace';

// Cath, 2026-11-13 (mockups money-batch-4 and 5, change 4): cash taken out abroad. A cash wallet
// in another currency keeps its balance in PESOS, like every account, so every total, Left to
// Spend and report still adds up with no change. Its own rate (pesos for one unit) turns that into
// baht, dollars... for showing and typing. The rate is the average of what the bank really gave.
export const HOME = 'PHP';

export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'THB', name: 'Thai baht', symbol: '฿' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥' },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong dollar', symbol: 'HK$' },
  { code: 'KRW', name: 'Korean won', symbol: '₩' },
  { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM' },
  { code: 'VND', name: 'Vietnamese dong', symbol: '₫' },
  { code: 'IDR', name: 'Indonesian rupiah', symbol: 'Rp' },
  { code: 'TWD', name: 'Taiwan dollar', symbol: 'NT$' },
  { code: 'CNY', name: 'Chinese yuan', symbol: 'CN¥' },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand dollar', symbol: 'NZ$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British pound', symbol: '£' },
  { code: 'CHF', name: 'Swiss franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'C$' },
  { code: 'AED', name: 'UAE dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'SAR' },
  { code: 'QAR', name: 'Qatari riyal', symbol: 'QAR' },
  { code: 'INR', name: 'Indian rupee', symbol: '₹' },
  { code: 'KHR', name: 'Cambodian riel', symbol: '៛' },
  { code: 'LAK', name: 'Lao kip', symbol: '₭' },
  { code: 'MOP', name: 'Macanese pataca', symbol: 'MOP' },
];

const cents = (n: number) => Math.round(n * 100) / 100;
const rate4 = (n: number) => Math.round(n * 10000) / 10000;

export function currencySymbol(code: string | undefined): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? (code || '');
}

export function isForeign(account: BalanceAccountEntry | undefined): boolean {
  return !!account && !!account.currency && account.currency !== HOME && typeof account.fxRate === 'number' && account.fxRate > 0;
}

// Pesos for one unit, from what you got and what the bank took.
export function rateFromAmounts(foreignAmount: number, pesoAmount: number): number | null {
  return foreignAmount > 0 && pesoAmount > 0 ? rate4(pesoAmount / foreignAmount) : null;
}
export function pesoFor(foreignAmount: number, rate: number): number {
  return cents(foreignAmount * rate);
}
export function foreignBalance(account: BalanceAccountEntry, pesoBalance: number): number {
  return isForeign(account) ? cents(pesoBalance / (account.fxRate as number)) : pesoBalance;
}

// "฿1,850" for a wallet in another currency, the usual peso text for the rest.
export function showMoney(account: BalanceAccountEntry | undefined, pesoBalance: number): string {
  if (!account || !isForeign(account)) return formatPeso(pesoBalance);
  return formatPeso(foreignBalance(account, pesoBalance), currencySymbol(account.currency)).replace(/\.00$/, '');
}

export type WithdrawInput = {
  from: string; // "debit:<id>"
  currency: string;
  foreignAmount: number;
  pesoAmount: number;
  fee?: number;
  note?: string;
  date: string;
  now?: number;
};

export function withdrawCash(model: HouseholdModel, input: WithdrawInput): { model: HouseholdModel; walletId: string; transferId: string } {
  const now = input.now ?? Date.now();
  const [fromGroup, fromId] = [input.from.slice(0, input.from.indexOf(':')), input.from.slice(input.from.indexOf(':') + 1)] as ['cash' | 'debit', string];
  const fromAcct = (model.balanceAccounts[fromGroup] || []).find((a) => a.id === fromId);
  if (!fromAcct || (fromGroup !== 'cash' && fromGroup !== 'debit')) throw new Error('Pick the account the cash came from.');
  if (input.currency === HOME || !CURRENCIES.some((c) => c.code === input.currency)) throw new Error('Pick a currency.');
  const rate = rateFromAmounts(input.foreignAmount, input.pesoAmount);
  if (!rate) throw new Error('Enter how much cash you got and what your bank took.');

  const existing = model.balanceAccounts.cash.find((a) => a.currency === input.currency && isForeign(a));
  const walletId = existing?.id ?? makeId('acct');
  let cash = model.balanceAccounts.cash;
  if (existing) {
    // The average of every withdrawal still in the wallet.
    const pesoNow = Math.max(0, accountCurrentBalance(model, 'cash', existing));
    const foreignNow = pesoNow / (existing.fxRate as number);
    const blended = rateFromAmounts(foreignNow + input.foreignAmount, pesoNow + input.pesoAmount) as number;
    cash = cash.map((a) => (a.id === walletId ? { ...a, amount: (typeof a.amount === 'number' ? a.amount : 0) + input.pesoAmount, fxRate: blended } : a));
  } else {
    cash = [...cash, { id: walletId, name: `Cash (${input.currency})`, amount: input.pesoAmount, currency: input.currency, fxRate: rate, createdAt: now }];
  }
  const fee = input.fee && input.fee > 0 ? input.fee : 0;
  const asOf = model.balanceAccounts.asOfDate;
  const feeOffSaved = fee > 0 && !!asOf && input.date < asOf;
  const takeOff = (list: BalanceAccountEntry[]) => list.map((a) => (a.id === fromId ? { ...a, amount: (typeof a.amount === 'number' ? a.amount : 0) - input.pesoAmount - (feeOffSaved ? fee : 0) } : a));
  const balanceAccounts = { ...model.balanceAccounts, cash, [fromGroup]: takeOff(fromGroup === 'cash' ? cash : model.balanceAccounts[fromGroup]) };

  const feeTxnId = fee > 0 ? makeId('txn') : undefined;
  const record: Transfer = {
    id: makeId('xfer'),
    date: input.date,
    from: input.from,
    to: `cash:${walletId}`,
    amount: input.pesoAmount,
    foreignAmount: input.foreignAmount,
    currency: input.currency,
    rate,
    createdAt: now,
    ...(fee ? { fee, feeTxnId, ...(feeOffSaved ? { feeOffSaved: true } : {}) } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
  };
  let next: HouseholdModel = { ...model, balanceAccounts, transfers: [...(model.transfers || []), record] };
  if (fee > 0) {
    const feeTxn: ManualTransaction = { id: feeTxnId as string, date: input.date, label: `Fee: ${fromAcct.name || 'Account'} cash withdrawal`, amount: fee, direction: 'out', owner: 'shared', category: 'Fees', notes: input.note?.trim() || '', paymentMethod: { type: fromGroup, accountId: fromId }, createdAt: now };
    next = { ...next, manualTransactions: [...(next.manualTransactions || []), feeTxn] };
  }
  trace('withdraw', 'built', { currency: input.currency, rate, newWallet: !existing, hasFee: fee > 0 });
  return { model: next, walletId, transferId: record.id };
}

// The rate to suggest: today's from the internet (only the currency codes are sent), else the one
// you used last, else nothing.
type Fetch = (url: string) => Promise<{ ok: boolean; json: () => Promise<any> }>;
export async function suggestedRate(code: string, last: number | undefined, fetcher: Fetch): Promise<{ rate: number | null; from: 'today' | 'last' | 'none' }> {
  try {
    const res = await fetcher(`https://open.er-api.com/v6/latest/${encodeURIComponent(code)}`);
    const value = res.ok ? (await res.json())?.rates?.[HOME] : undefined;
    if (typeof value === 'number' && value > 0) {
      trace('fx', 'rate from today', { code });
      return { rate: rate4(value), from: 'today' };
    }
  } catch { /* offline, or the service is down */ }
  trace('fx', last ? 'rate from last time' : 'no rate', { code });
  return last && last > 0 ? { rate: last, from: 'last' } : { rate: null, from: 'none' };
}

// The rate you used last for a currency: its wallet's, or your latest withdrawal's.
export function lastRate(model: HouseholdModel, code: string): number | undefined {
  const wallet = model.balanceAccounts.cash.find((a) => a.currency === code && isForeign(a));
  if (wallet) return wallet.fxRate;
  return [...(model.transfers || [])].reverse().find((t) => t.currency === code && typeof t.rate === 'number')?.rate;
}

// Cath, 2026-11-14: leftover foreign cash changed back to pesos. The wallet goes down by what that
// cash cost (its own rate); the peso account goes up by what you really got. A worse or better
// rate than you paid is written down as a small fee or as money in (never income), on no account,
// so your totals and your spending still add up.
export type ChangeBackInput = { wallet: string; to: string; foreignAmount: number; pesoAmount: number; note?: string; date: string; now?: number };

export function changeBack(model: HouseholdModel, input: ChangeBackInput): { model: HouseholdModel; difference: number; transferId: string } {
  const now = input.now ?? Date.now();
  const split = (key: string) => [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)] as ['cash' | 'debit' | 'credit', string];
  const [wGroup, wId] = split(input.wallet);
  const [tGroup, tId] = split(input.to);
  const wallet = wGroup === 'cash' ? model.balanceAccounts.cash.find((a) => a.id === wId) : undefined;
  const target = tGroup === 'cash' || tGroup === 'debit' ? model.balanceAccounts[tGroup].find((a) => a.id === tId) : undefined;
  if (!wallet || !isForeign(wallet)) throw new Error('Pick the wallet the cash is in.');
  if (!target || isForeign(target)) throw new Error('Pick the peso account it goes into.');
  if (!(input.foreignAmount > 0) || !(input.pesoAmount > 0)) throw new Error('Enter how much you changed and the pesos you got.');
  const cost = pesoFor(input.foreignAmount, wallet.fxRate as number);
  const difference = cents(input.pesoAmount - cost);
  const bump = (list: BalanceAccountEntry[], id: string, delta: number) => list.map((a) => (a.id === id ? { ...a, amount: (typeof a.amount === 'number' ? a.amount : 0) + delta } : a));
  let balanceAccounts = { ...model.balanceAccounts, cash: bump(model.balanceAccounts.cash, wId, -cost) };
  balanceAccounts = { ...balanceAccounts, [tGroup]: bump(balanceAccounts[tGroup], tId, input.pesoAmount) };
  const record: Transfer = { id: makeId('xfer'), date: input.date, from: input.wallet, to: input.to, amount: input.pesoAmount, foreignAmount: input.foreignAmount, currency: wallet.currency, rate: rateFromAmounts(input.foreignAmount, input.pesoAmount) as number, cost, createdAt: now, ...(input.note?.trim() ? { note: input.note.trim() } : {}) };
  let next: HouseholdModel = { ...model, balanceAccounts, transfers: [...(model.transfers || []), record] };
  if (difference !== 0) {
    const txn: ManualTransaction = { id: makeId('txn'), date: input.date, label: difference < 0 ? `Exchange loss: ${wallet.currency} to pesos` : `Exchange gain: ${wallet.currency} to pesos`, amount: Math.abs(difference), direction: difference < 0 ? 'out' : 'in', owner: 'shared', category: difference < 0 ? 'Fees' : '', notes: '', createdAt: now };
    record.diffTxnId = txn.id;
    next = { ...next, manualTransactions: [...(next.manualTransactions || []), txn] };
  }
  trace('withdraw', 'change back built', { currency: wallet.currency, difference: difference === 0 ? 'none' : difference < 0 ? 'loss' : 'gain' });
  return { model: next, difference, transferId: record.id };
}
