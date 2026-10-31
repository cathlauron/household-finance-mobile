import React, { createContext, useContext, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { Animated, AppState, Appearance, Easing, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ThemeColors } from './theme';
import { ColorMode, isNightAt, resolveDark, startingMode } from './dayNight';
import { skyPlaceNow } from './sky';
import { AUTO_THEME_MS, CURVE, CURVE_OUT } from './motion';
import { reduceMotionNow } from './reduceMotion';
import { showSaved } from './components/SavedToast';
import { useLookPreview } from './lookPreview';

export type { ColorMode };
const STORAGE_KEY = 'colorModePreference';

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(mode: ColorMode): boolean {
  const p = skyPlaceNow();
  return resolveDark(mode, new Date(), Appearance.getColorScheme() === 'dark', p?.lat, p?.lon);
}
const nightNow = () => {
  const p = skyPlaceNow();
  return isNightAt(new Date(), p?.lat, p?.lon);
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Day & night (Cath, 2026-10-31): new people start on it; a saved choice is kept.
  // Until the saved choice is read (a moment, under the green opening screen) it's light, as
  // before, so someone who chose Light never sees a flash of dark at night.
  const [mode, setModeState] = useState<ColorMode>('light');
  const [isDark, setIsDark] = useState<boolean>(false);
  const dip = useRef(new Animated.Value(0)).current;
  const [dipColor, setDipColor] = useState<string | null>(null);
  const darkRef = useRef(isDark);
  darkRef.current = isDark;
  const fading = useRef(false);
  // The welcome's night moment (lookPreview.dark) shows dark without saving it.
  const preview = useLookPreview();
  const [previewShown, setPreviewShown] = useState<boolean | undefined>(undefined);
  const shownDark = previewShown ?? isDark;

  // A 1-second soft fade to the other look (Cath, 2026-10-31): a veil in the new page colour
  // rises most of the way, the look changes under it, and it settles away. Reduce Motion: instant.
  function softFade(toDark: boolean, apply: () => void) {
    if (reduceMotionNow() || fading.current) {
      apply();
      return;
    }
    fading.current = true;
    setDipColor((toDark ? darkTheme : lightTheme).navy2);
    dip.setValue(0);
    Animated.timing(dip, { toValue: 0.85, duration: AUTO_THEME_MS, easing: Easing.bezier(...CURVE_OUT), useNativeDriver: true }).start(() => {
      apply();
      Animated.timing(dip, { toValue: 0, duration: AUTO_THEME_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start(() => {
        fading.current = false;
        setDipColor(null);
      });
    });
  }

  useEffect(() => {
    if (preview.dark === previewShown) return;
    const toDark = preview.dark ?? isDark;
    if (toDark === shownDark) setPreviewShown(preview.dark);
    else softFade(toDark, () => setPreviewShown(preview.dark));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview.dark]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      // FF_CHECK_START_LOOK: only the screen checks set it (they run at any time of day).
      const initial = startingMode(saved ?? process.env.FF_CHECK_START_LOOK ?? null);
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

  // Day & night: checked every minute and whenever the app comes back. Coming back it just
  // shows the right look; at sunset or sunrise while the app is open, a 1-second soft fade
  // (Cath, 2026-10-31) and a short note. Reduce Motion: instant.
  useEffect(() => {
    if (mode !== 'auto') return;
    const check = (open: boolean) => {
      const night = nightNow();
      if (darkRef.current === night || fading.current) return;
      if (!open) {
        setIsDark(night);
        return;
      }
      showSaved(night ? 'Sunset: dark until sunrise' : 'Sunrise: back to light', night ? 'moon-outline' : 'sunny-outline');
      softFade(night, () => setIsDark(night));
    };
    check(false);
    const tick = setInterval(() => check(true), 60000);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') check(false);
    });
    return () => {
      clearInterval(tick);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Version 2.2 (Cath: "I prefer the light/dark in 2.1, it's more responsive and smooth"):
  // back to how 2.1 did it. The tap switches the mode straight away, in the same moment,
  // with no photo, no fade and no waiting. (Tabs you're not looking at still catch up a
  // moment later where you can't see, so the page you're on switches as quickly as it can.)
  const setMode = (m: ColorMode) => {
    setModeState(m);
    setIsDark(resolveIsDark(m));
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const colors = useMemo(() => (shownDark ? darkTheme : lightTheme), [shownDark]);
  // 2.2 speed sweep: the same theme object until the colours really change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ colors, isDark: shownDark, mode, setMode }), [colors, shownDark, mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {dipColor && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dipColor, opacity: dip }]} />}
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
