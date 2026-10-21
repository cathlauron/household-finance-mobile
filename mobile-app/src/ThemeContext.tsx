import React, { createContext, useContext, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Animated, Appearance, Easing, StyleSheet, View } from 'react-native';
import { reduceMotionNow } from './reduceMotion';
import { captureScreen } from 'react-native-view-shot';
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

  // Version 2.2 (Cath: the switch lagged; then the fade went fully black/white): a real
  // cross-fade. The screen as it looks now is photographed and laid on top, the app
  // recolours underneath (unseen), then the photo fades away to show the new look. So
  // it goes smoothly from the old look straight to the new one. With the phone set to
  // remove animations (or if the photo can't be taken) it just switches.
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const fade = useRef(new Animated.Value(0)).current;
  const [shot, setShot] = useState<string | null>(null);
  const pendingRef = useRef<{ m: ColorMode; toDark: boolean } | null>(null);
  const revealRef = useRef(false);
  const switchNow = (m: ColorMode, toDark: boolean) => {
    setModeState(m);
    startTransition(() => {
      setIsDark(toDark);
    });
  };
  const switchUnderShot = () => {
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    revealRef.current = true;
    setModeState(p.m);
    setIsDark(p.toDark);
  };
  const setMode = (m: ColorMode) => {
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
    const toDark = resolveIsDark(m);
    if (toDark === isDarkRef.current || reduceMotionNow() || pendingRef.current) {
      switchNow(m, toDark);
      return;
    }
    pendingRef.current = { m, toDark };
    captureScreen({ format: 'jpg', quality: 0.85, result: 'tmpfile' })
      .then((uri) => {
        fade.setValue(1);
        setShot(uri);
        // If the photo is slow to show, switch anyway.
        setTimeout(switchUnderShot, 700);
      })
      .catch(() => {
        pendingRef.current = null;
        switchNow(m, toDark);
      });
  };
  // Once the new colours are on screen, the photo of the old look fades away.
  useEffect(() => {
    if (!revealRef.current) return;
    revealRef.current = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        Animated.timing(fade, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => setShot(null))
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
        {/* Taps go through to the app underneath while it fades. */}
        {shot && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.Image
              source={{ uri: shot }}
              onLoad={() => switchUnderShot()}
              fadeDuration={0}
              resizeMode="stretch"
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: fade }]}
            />
          </View>
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
