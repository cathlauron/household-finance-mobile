import React, { createContext, useContext, useEffect, useMemo, useState, startTransition } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ThemeColors } from './theme';

type ColorMode = 'light' | 'dark' | 'device';
const STORAGE_KEY = 'colorModePreference';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(mode: ColorMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return Appearance.getColorScheme() === 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>('light');
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      const initial = (saved === 'light' || saved === 'dark' || saved === 'device') ? saved : 'light';
      setModeState(initial);
      setIsDark(resolveIsDark(initial));
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      setIsDark((prev) => (mode === 'device' ? resolveIsDark('device') : prev));
    });
    return () => sub.remove();
  }, [mode]);

  // 2.2 speed fix (Cath: the light/dark button lagged): recolouring every screen is big
  // work, so it runs as a background update; the button you tapped reacts at once.
  const setMode = (m: ColorMode) => {
    // Code review fix: the Light / Dark / Device choice itself moves at once (Settings,
    // set-up); only the recolouring runs in the background.
    setModeState(m);
    startTransition(() => {
      setIsDark(resolveIsDark(m));
    });
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
  // 2.2 speed sweep: the same theme object until the colours really change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ colors, isDark, mode, setMode }), [colors, isDark, mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}

// Version 2.2 (Cath: the light/dark switch still took a moment): a tab you're not looking
// at recolours a moment later, as background work, so the switch only has to wait for the
// page you're on. It is recoloured long before you can get to it, and at once if you do.
export function QuietThemeWhenHidden({ active, children }: { active: boolean; children: React.ReactNode }) {
  const live = useContext(ThemeContext);
  const [shown, setShown] = useState(live);
  useEffect(() => {
    if (shown === live) return;
    if (active) setShown(live);
    else startTransition(() => setShown(live));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, active]);
  return <ThemeContext.Provider value={active ? live : shown}>{children}</ThemeContext.Provider>;
}
