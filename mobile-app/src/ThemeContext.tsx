import React, { createContext, useContext, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Animated, Appearance, Easing, StyleSheet, View } from 'react-native';
import { reduceMotionNow } from './reduceMotion';
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

  // Version 2.2 (Cath: the light/dark switch still lagged after the buzz): the switch is a
  // quick soft fade. The screen fades to the new page colour (about a seventh of a
  // second, drawn by the phone's graphics side so it never stutters), the app recolours
  // behind it, then the new look fades in. The recolouring can't be seen, so it no longer
  // feels like a pause. With the phone set to remove animations it just switches.
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const fade = useRef(new Animated.Value(0)).current;
  const [fadeColor, setFadeColor] = useState<string | null>(null);
  const revealRef = useRef(false);
  const setMode = (m: ColorMode) => {
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    const toDark = resolveIsDark(m);
    if (toDark === isDarkRef.current || reduceMotionNow()) {
      setModeState(m);
      startTransition(() => {
        setIsDark(toDark);
      });
      return;
    }
    setFadeColor((toDark ? darkTheme : lightTheme).navy2);
    fade.stopAnimation();
    Animated.timing(fade, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      revealRef.current = true;
      setModeState(m);
      setIsDark(toDark);
    });
  };
  // Once the new colours are on screen, fade the cover away.
  useEffect(() => {
    if (!revealRef.current) return;
    revealRef.current = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        Animated.timing(fade, { toValue: 0, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
          if (finished) setFadeColor(null);
        })
      )
    );
  }, [isDark, fade]);

  const colors = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);
  // 2.2 speed sweep: the same theme object until the colours really change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ colors, isDark, mode, setMode }), [colors, isDark, mode]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {fadeColor && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fadeColor, opacity: fade }]} />
        )}
      </View>
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
