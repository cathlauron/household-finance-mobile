import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../src/ThemeContext';

// Draws a piece of the app the way the app does (with its colours), for a check.
export function renderInApp(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
