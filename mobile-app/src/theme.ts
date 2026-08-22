// Colors and fonts ported from the web app's default "Classic" (Ink & Emerald) theme.
// See household-finance-app-spec-and-scale.md §4 for the full theming system this
// is a simplified starting point for.

export type AppTheme = {
  mode: 'light' | 'dark';
  colors: {
    ink: string;
    inkDim: string;
    inkFaint: string;
    background: string;   // page background (--navy-2 equivalent)
    surface: string;      // card/input background (--navy-3 equivalent)
    surfaceAlt: string;   // subtle fill (--navy-1 equivalent)
    border: string;
    gold: string;         // primary accent / buttons
    goldDim: string;
    error: string;
    errorBg: string;
    ok: string;
  };
  fonts: {
    serif: string;  // headings
    sans: string;   // body text
    mono: string;   // amounts, codes
  };
};

const lightColors: AppTheme['colors'] = {
  ink: '#1C1917',
  inkDim: '#57534E',
  inkFaint: '#A8A29E',
  background: '#F7F2E9',
  surface: '#FFFDF8',
  surfaceAlt: '#EFEAE0',
  border: 'rgba(28,25,23,0.08)',
  gold: '#1C1917',
  goldDim: '#44403C',
  error: '#E11D48',
  errorBg: '#FFF1F2',
  ok: '#059669',
};

const darkColors: AppTheme['colors'] = {
  ink: '#F1F0EF',
  inkDim: '#C7C2BE',
  inkFaint: '#8C857F',
  background: '#1C1917',
  surface: '#242020',
  surfaceAlt: '#161412',
  border: 'rgba(255,255,255,0.08)',
  gold: '#10B981',
  goldDim: '#059669',
  error: '#FB7185',
  errorBg: '#3F1725',
  ok: '#34D399',
};

// The web app pairs a serif font for headings with a plain sans font for body text.
// React Native ships with system fonts only, so for this pass we use the closest
// built-in system equivalents (serif/sans-serif) rather than loading custom web fonts.
// Swapping in real custom fonts (e.g. via expo-font) can be a later checkpoint.
const fonts: AppTheme['fonts'] = {
  serif: 'serif',
  sans: 'System',
  mono: 'monospace',
};

export const lightTheme: AppTheme = { mode: 'light', colors: lightColors, fonts };
export const darkTheme: AppTheme = { mode: 'dark', colors: darkColors, fonts };
