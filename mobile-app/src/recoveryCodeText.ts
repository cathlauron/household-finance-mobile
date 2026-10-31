// How a household approval code is read and shown: small or capital letters count the same,
// dashes and spaces are ignored; shown as XXXXX-XXXXX.
export function normalizePeerCode(typed: string): string {
  return (typed || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
export function formatPeerCode(code: string): string {
  return code.length > 5 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}
