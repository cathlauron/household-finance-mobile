// Version 2.2 (canvas K2-K3, approved): High / Medium / Low on bills, debts and loans.
// High = pay this first when money is tight. On the same due day, High comes first.
export type Priority = 'high' | 'medium' | 'low' | '';
export const PRIORITIES: Array<Exclude<Priority, ''>> = ['high', 'medium', 'low'];

export function priorityRank(p: Priority | undefined | null): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : p === 'low' ? 2 : 3;
}
export function priorityLabel(p: Exclude<Priority, ''>): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}
