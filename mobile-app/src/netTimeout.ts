// Gives up on an online step after `ms` with a clear "slow connection" error
// (code 'net-timeout'). Wrap ONLY the network call itself: slow work on the phone
// (key scrambling, decrypting) blocks the timer and would make a good connection
// look slow. That is what broke joining a household in 2.1 (Cath, 2026-10-19).
export function withNetTimeout<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'net-timeout' })), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
