// Screen checks (version 2.2 bug-check work, 2026-10-22). Run with: npm run test:screens
// Only files in __tests__ ending in .test.tsx are checks. The older logic checks in
// tests/*.test.mjs run separately with: npm test
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.tsx'],
  setupFiles: ['<rootDir>/__tests__/helpers/setup.js'],
  // 2026-10-31: the big screens (Transactions, Savings) took longer than jest's 5 s on a busy
  // computer and failed only by time, never by what they check. Time limit only; checks unchanged.
  testTimeout: 30000,
};
