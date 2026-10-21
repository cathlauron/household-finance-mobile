import React, { useContext, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';
import { useData } from './DataContext';
import { computeLeftToSpend, getLeftToSpendStatus, LeftToSpendMood } from './balanceProjection';
import type { ThemeColors } from './theme';
import type { HouseholdModel } from './types';
import { useLookPreview } from './lookPreview';

// Redesign: mood colours. When Left to Spend is Running low or Overspent, the app's
// accent colour (buttons, links, selected tabs, icon tiles, the + button and the
// background leaves) turns burnt orange or red, like the Finance Flow mockups.
// Money colours (green in, red out, orange saved, blue planned) never change.
// Turned off in Settings > Appearance > Mood colours.

const MOOD_ACCENTS: Record<Exclude<LeftToSpendMood, 'good'>, { light: Partial<ThemeColors>; dark: Partial<ThemeColors> }> = {
  low: {
    light: { gold: '#A04208', goldDim: '#7E3406', accent: '#A04208', accentTint: '#FCE6D6', buttonFill: '#A04208', onButton: '#FFFFFF' },
    dark: { gold: '#F59055', goldDim: '#E07A3E', accent: '#F59055', accentTint: '#3A2014', buttonFill: '#F59055', onButton: '#2A1206' },
  },
  over: {
    // Overspent buttons are a soft pastel pink with dark rose text, to stay calm.
    light: { gold: '#B4234A', goldDim: '#8E1B3A', accent: '#B4234A', accentTint: '#FBDDE3', buttonFill: '#F8C8D2', onButton: '#7A1030' },
    dark: { gold: '#F28CA6', goldDim: '#E06F8C', accent: '#F28CA6', accentTint: '#3A1620', buttonFill: '#F28CA6', onButton: '#3A0A18' },
  },
};

// Dark mode page colour per mood: almost black, tinted to match the mood so the leaves never
// clash with the page (deep green, deep brown, deep wine). Light mode keeps its page colour.
const DARK_PAGE: Record<LeftToSpendMood, string> = {
  good: '#06120C',
  low: '#140A04',
  over: '#16060A',
};

// 2.2 speed sweep: working out Left to Spend goes through all your bills and spending.
// Several parts of the app ask for the mood at once, so it's worked out once per change
// of your data and remembered (the mood itself doesn't depend on the colours).
let moodCache: { model: HouseholdModel; mood: LeftToSpendMood } | null = null;
function moodFor(model: HouseholdModel, colors: ThemeColors): LeftToSpendMood {
  if (moodCache && moodCache.model === model) return moodCache.mood;
  const lts = computeLeftToSpend(model);
  const mood = getLeftToSpendStatus(lts.amount, model, colors).mood;
  moodCache = { model, mood };
  return mood;
}

export function useMood(): LeftToSpendMood {
  const { model } = useData();
  const theme = useContext(ThemeContext);
  const preview = useLookPreview();
  return useMemo(() => {
    // Set-up screen (approved L2): the sample being looked at wins.
    if (preview.mood) return preview.mood;
    if (!model || !theme) return 'good';
    if (model.settings?.moodColorsEnabled === false) return 'good';
    try {
      return moodFor(model, theme.colors);
    } catch {
      return 'good';
    }
  }, [model, theme, preview.mood]);
}

// Re-provides the theme with the mood's accent colours swapped in. Wraps the app
// inside DataProvider (it needs the household data to know the mood).
export function MoodThemeProvider({ children }: { children: React.ReactNode }) {
  const base = useContext(ThemeContext);
  const mood = useMood();
  const value = useMemo(() => {
    if (!base) return base;
    if (mood === 'good' && !base.isDark) return base;
    const swap = mood === 'good' ? {} : MOOD_ACCENTS[mood][base.isDark ? 'dark' : 'light'];
    const page = base.isDark ? { navy2: DARK_PAGE[mood] } : {};
    return { ...base, colors: { ...base.colors, ...swap, ...page } };
  }, [base, mood]);
  if (!value) return <>{children}</>;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
