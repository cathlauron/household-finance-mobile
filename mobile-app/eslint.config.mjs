// Hook check (2026-10-22, bug-check work): `npm run test:hooks`. Only the "rules of hooks"
// rule, as an error: a hook (useState, useEffect, ...) placed after an early return or
// inside an if can crash a screen ("Rendered fewer hooks than expected"). This found three
// such places on 2026-10-22 (IncomeScreen x2, SettingsScreen x1).
import hooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'App.tsx'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': hooks },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: { 'react-hooks/rules-of-hooks': 'error' },
  },
];
