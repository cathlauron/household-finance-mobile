// Cath, 2026-11-13: console logs that trace a money flow step by step ("[flow:borrowed] saved").
// Only in test builds (Expo Go, the hidden browser): an installed app writes nothing, so amounts
// never sit in the phone's logs.
declare const __DEV__: boolean | undefined;
const on = (typeof __DEV__ !== 'undefined' && !!__DEV__) || process.env.EXPO_PUBLIC_WALK_FIXTURE === '1';

export type Flow = 'borrowed' | 'draft' | 'move' | 'withdraw' | 'fx' | 'claude';

export function trace(flow: Flow, step: string, data?: Record<string, unknown>): void {
  if (!on) return;
  // eslint-disable-next-line no-console
  console.log(`[flow:${flow}] ${step}`, data ? JSON.stringify(data) : '');
}
