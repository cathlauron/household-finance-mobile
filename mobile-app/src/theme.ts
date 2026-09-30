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
  inkDim: '#626A5B',
  inkFaint: '#A0A597',
  navy1: '#EEE9DE',
  navy2: '#F6F1E6',
  navy3: '#FFFFFF',
  navy4: '#E5E0CF',
  gold: '#2E5D3A',
  goldDim: '#234A2E',
  accent: '#3F7A50',
  error: '#E11D48',
  errorBg: '#FFF1F2',
  ok: '#059669',
  okBg: '#ECFDF5',
  orange: '#EA580C',
  warnBg: '#FFF7ED',
  premium: '#E08A2C',
  indigo: '#4F46E5',
  indigoBg: '#EEF2FF',
  cardTealStart: '#134E48',
  cardTealEnd: '#082F2C',
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
  okBg: '#0F2A20',
  orange: '#FB923C',
  warnBg: '#3A2412',
  premium: '#E08A2C',
  indigo: '#818CF8',
  indigoBg: '#1E1B4B',
  cardTealStart: '#164E44',
  cardTealEnd: '#0D332D',
  cardTealText: '#F1F0EF',
  cardTealTextDim: '#A7F3D0',
  mintAccent: '#34D399',
  pageGradStart: '#0E1B15',
  pageGradEnd: '#161412',
  peachCard: '#281D17',
  peachBubble: '#3E271B',
};
