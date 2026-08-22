import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const ThemeContext = createContext<ThemeContextValue | null>(null);

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

  const setMode = (m: ColorMode) => {
    setModeState(m);
    setIsDark(resolveIsDark(m));
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside a ThemeProvider');
  return ctx;
}
