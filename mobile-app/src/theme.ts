// Color palette ported from the web app's "Ink & Emerald" (Classic) theme.
// See household-finance-app-spec-and-scale.md section 4 for the full theming system this is based on.

export type ThemeColors = {
  ink: string;
  inkDim: string;
  inkFaint: string;
  decor: string;
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
  okBg: string;
  orange: string;
  warnBg: string;
  premium: string;
  indigo: string;
  indigoBg: string;
  cardTealStart: string;
  cardTealEnd: string;
  cardTealText: string;
  cardTealTextDim: string;
  mintAccent: string;
  pageGradStart: string;
  pageGradEnd: string;
  peachCard: string;
  peachBubble: string;
};

export const lightTheme: ThemeColors = {
  ink: '#22281F',
  inkDim: '#586152',
  inkFaint: '#5F6657',
  decor: '#A0A597',
  navy1: '#DDEDE3',
  navy2: '#EAF5EE',
  navy3: '#FFFFFF',
  navy4: '#DCE8E0',
  gold: '#2E5D3A',
  goldDim: '#234A2E',
  accent: '#3F7A50',
  error: '#C81E43',
  errorBg: '#FFF1F2',
  ok: '#0B7A4B',
  okBg: '#ECFDF5',
  orange: '#C2410C',
  warnBg: '#FFF7ED',
  premium: '#E08A2C',
  indigo: '#4F46E5',
  indigoBg: '#EEF2FF',
  cardTealStart: '#2E5D3A',
  cardTealEnd: '#173D2B',
  cardTealText: '#FFFFFF',
  cardTealTextDim: '#A7F3D0',
  mintAccent: '#34D399',
  pageGradStart: '#EAF5EE',
  pageGradEnd: '#FFFFFF',
  peachCard: '#FFF6ED',
  peachBubble: '#FFEDD5',
};

export const darkTheme: ThemeColors = {
  ink: '#F1F0EF',
  inkDim: '#C7C2BE',
  inkFaint: '#9E9892',
  decor: '#8C857F',
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
  okBg: '#0F2A20',
  orange: '#FB923C',
  warnBg: '#3A2412',
  premium: '#E08A2C',
  indigo: '#818CF8',
  indigoBg: '#1E1B4B',
  cardTealStart: '#1A3B2B',
  cardTealEnd: '#0F261B',
  cardTealText: '#F1F0EF',
  cardTealTextDim: '#A7F3D0',
  mintAccent: '#34D399',
  pageGradStart: '#0E1B15',
  pageGradEnd: '#161412',
  peachCard: '#281D17',
  peachBubble: '#3E271B',
};
