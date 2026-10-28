// K5 (Cath, 2026-10-27): "Check sign-in speed" times the password step at 100,000, 310,000
// and 600,000 rounds on this phone, with a made-up password.
const mockCalls: number[] = [];
jest.mock('../src/fastCrypto', () => ({ keyDeriver: { derive: (_p: string, _s: any, n: number) => { mockCalls.push(n); return null; }, usingNative: () => true } }));

test('times the three strengths and explains what it affects', () => {
  const { measureSignInSpeed, speedText } = require('../src/signInSpeed');
  const r = measureSignInSpeed();
  expect(mockCalls).toEqual([1000, 100000, 310000, 600000]);
  expect(r.results.map((x: any) => x.rounds)).toEqual([100000, 310000, 600000]);
  const text = speedText({ results: [{ rounds: 100000, ms: 210 }, { rounds: 310000, ms: 640 }, { rounds: 600000, ms: 1230 }], fast: true });
  expect(text).toMatch(/Today \(100,000\): 0\.21 s/);
  expect(text).toMatch(/600,000: 1\.23 s/);
  expect(text).toMatch(/fingerprint and PIN don't change/);
});
