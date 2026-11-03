import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/ThemeContext';
import PasswordStrengthBar from '../src/components/PasswordStrengthBar';

// Cath, 2026-11-03 (mockup PW1): a 4-part bar and a word under a new password.
test('nothing typed: nothing shows; then the word and tip follow the password', () => {
  const view = render(<ThemeProvider><PasswordStrengthBar password="" testID="bar" /></ThemeProvider>);
  expect(screen.queryByTestId('bar')).toBeNull();
  view.rerender(<ThemeProvider><PasswordStrengthBar password="mangos" testID="bar" /></ThemeProvider>);
  expect(screen.getByText('Weak')).toBeTruthy();
  expect(screen.getByText('Make it longer')).toBeTruthy();
  view.rerender(<ThemeProvider><PasswordStrengthBar password="Mango-Tree-2026" testID="bar" /></ThemeProvider>);
  expect(screen.getByText('Strong')).toBeTruthy();
});

test('it sits under the new password in Create account and in Change password', () => {
  const fs = require('fs');
  expect(fs.readFileSync('src/screens/CreateProfileScreen.tsx', 'utf8')).toMatch(/<PasswordStrengthBar password=\{password1\}/);
  expect(fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8')).toMatch(/<PasswordStrengthBar password=\{newPass1Input\}/);
});
