// Screen checks (version 2.2 bug-check work, 2026-10-22). Run with: npm run test:screens
// Only files in __tests__ ending in .test.tsx are checks. The older logic checks in
// tests/*.test.mjs run separately with: npm test
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/__tests__/**/*.test.tsx'],
  setupFiles: ['<rootDir>/__tests__/helpers/setup.js'],
};
