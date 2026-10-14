// Color palette. Originally ported from the web app's "Ink & Emerald" (Classic) theme;
// retuned in the 2026 redesign to match the Finance Flow design system (iPhone-style
// greys, forest green accent). Key names are unchanged so every screen picks this up.
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
  // Redesign: money colours. positive = money in, negative = money out,
  // saving = money set aside, planned = amounts not spent yet (Plan tab).
  positive: string;
  negative: string;
  saving: string;
  planned: string;
  // Text or icon colour that sits on top of a filled accent (green) button.
  onAccent: string;
};

export const lightTheme: ThemeColors = {
  ink: '#111111',
  inkDim: '#636366',
  inkFaint: '#6C6C70',
  decor: '#C7C7CC',
  navy1: '#E5E5EA',
  navy2: '#F2F2F7',
  navy3: '#FFFFFF',
  navy4: '#D1D1D6',
  gold: '#2E6B47',
  goldDim: '#1B3F30',
  accent: '#2E6B47',
  error: '#D70015',
  errorBg: '#FFF1F2',
  ok: '#1E7B3E',
  okBg: '#E6F0EA',
  orange: '#B83200',
  warnBg: '#FFF7ED',
  premium: '#E08A2C',
  indigo: '#4F46E5',
  indigoBg: '#EEF2FF',
  cardTealStart: '#24563D',
  cardTealEnd: '#1B3F30',
  cardTealText: '#FFFFFF',
  cardTealTextDim: '#BFD3C8',
  mintAccent: '#34D399',
  pageGradStart: '#F2F2F7',
  pageGradEnd: '#F2F2F7',
  peachCard: '#FFF6ED',
  peachBubble: '#FFEDD5',
  // Redesign (Finance Flow design system): money colours.
  positive: '#1E7B3E',
  negative: '#D70015',
  saving: '#C2510A',
  planned: '#1D63B8',
  onAccent: '#FFFFFF',
};

export const darkTheme: ThemeColors = {
  ink: '#FFFFFF',
  inkDim: '#AEAEB2',
  inkFaint: '#98989D',
  decor: '#636366',
  navy1: '#2C2C2E',
  navy2: '#000000',
  navy3: '#1C1C1E',
  navy4: '#38383A',
  gold: '#5FC48A',
  goldDim: '#4CAF78',
  accent: '#5FC48A',
  error: '#FF6961',
  errorBg: '#3F1725',
  ok: '#4CD07D',
  okBg: '#15291D',
  orange: '#FFB340',
  warnBg: '#3A2412',
  premium: '#E08A2C',
  indigo: '#818CF8',
  indigoBg: '#1E1B4B',
  cardTealStart: '#24553F',
  cardTealEnd: '#1E4A37',
  cardTealText: '#F1F0EF',
  cardTealTextDim: '#BFD3C8',
  mintAccent: '#34D399',
  pageGradStart: '#000000',
  pageGradEnd: '#000000',
  peachCard: '#281D17',
  peachBubble: '#3E271B',
  // Redesign (Finance Flow design system): money colours.
  positive: '#4CD07D',
  negative: '#FF6961',
  saving: '#FFB27A',
  planned: '#6FA8FF',
  onAccent: '#0B1F14',
};
