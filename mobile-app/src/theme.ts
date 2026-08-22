// Color palette ported from the web app's "Ink & Emerald" (Classic) theme.
// See household-finance-app-spec-and-scale.md section 4 for the full theming system this is based on.

export type ThemeColors = {
  ink: string;
  inkDim: string;
  inkFaint: string;
  navy1: string;
  navy2: string;
  navy3: string;
  navy4: string;
  gold: string;
  goldDim: string;
  accent: string;
  error: string;
  errorBg: string;
  ok: string;
  orange: string;
};

export const lightTheme: ThemeColors = {
  ink: '#1C1917',
  inkDim: '#57534E',
  inkFaint: '#A8A29E',
  navy1: '#EFEAE0',
  navy2: '#F7F2E9',
  navy3: '#FFFDF8',
  navy4: '#DCD3C1',
  gold: '#1C1917',
  goldDim: '#44403C',
  accent: '#059669',
  error: '#E11D48',
  errorBg: '#FFF1F2',
  ok: '#059669',
  orange: '#EA580C',
};

export const darkTheme: ThemeColors = {
  ink: '#F1F0EF',
  inkDim: '#C7C2BE',
  inkFaint: '#8C857F',
  navy1: '#161412',
  navy2: '#1C1917',
  navy3: '#242020',
  navy4: '#3A3532',
  gold: '#10B981',
  goldDim: '#059669',
  accent: '#34D399',
  error: '#FB7185',
  errorBg: '#3F1725',
  ok: '#34D399',
  orange: '#FB923C',
};
