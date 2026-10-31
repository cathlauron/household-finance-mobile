import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { LinearGradient as ShadeGradient } from 'expo-linear-gradient';
import Animated, { Easing, makeMutable, runOnJS, useAnimatedProps, useAnimatedStyle, withTiming, type SharedValue } from 'react-native-reanimated';
import { ThemeContext, useTheme } from './ThemeContext';
import { MoodThemeProvider } from './mood';
import { darkTheme, lightTheme } from './theme';
import { useReduceMotion } from './reduceMotion';
import { CURVE_OUT, FADE_OUT_MS } from './motion';
import { pathOf, screenPeel } from './peelGeometry';

// Dark mode peel (mockup K2e, approved by Cath 2026-10-29): while the Dark mode sticker is
// peeled, the whole screen peels from its top-right corner at 45 degrees and the page shows
// underneath in the other look; the lifted corner curls over with a soft shadow. Letting go
// past halfway turns the look over; before halfway the screen settles back.
// This host sits above the whole app (App.tsx). The Appearance page hands it a copy of
// itself drawn in the other look (showScreenPeel) and the sticker drives `screenPeelK`.

export const screenPeelK = makeMutable(0);
// The Dark mode sticker's own finger position and face, lent to its copy in the peel so the
// sticker you're holding stays visible on top of the other look. B-068 (Cath's video,
// 2026-10-30): these used to be made here, when the app loaded, starting at -1; on her phone
// the sticker never received its real starting corner, so it sat half peeled ("☀ Lark").
// Now the sticker makes its own (starting at its corner) and only lends them here.
export type StickerValues = { px: SharedValue<number>; py: SharedValue<number>; topOn: SharedValue<number>; busy: SharedValue<number> };
export const darkSticker: { current: StickerValues | null } = { current: null };

// Cath's video 2026-10-30 (S-?? smoothness): the copy used to be drawn only once the peel
// had started, which on her phone took long enough that the sticker froze half peeled and the
// screen then jumped in at the end; and it was placed by the page's window position, which
// on Android is off by the status bar, so the copy sat higher than the page and the page
// "jumped" when it faded away. Now:
//   - the copy is PREPARED (drawn, hidden) when the Appearance page opens, in the other look,
//     so a peel starts at once;
//   - it is placed relative to this host (both measured the same way, so offsets cancel),
//     and follows the page's scroll through shared values (no redraw).
// toDark: null while only prepared (the copy shows the other look, hidden behind k = 0).
type Peel = { content: React.ReactNode; toDark: boolean | null; flipped: boolean };
let current: Peel | null = null;
const listeners = new Set<(p: Peel | null) => void>();
function emit() {
  listeners.forEach((l) => l(current));
}
// Where the page's scrolling part sits inside the host, and how far it is scrolled. Plain
// values (Cath's 2nd video, 2026-10-30: the app still closed; animating the copy's top and
// height on the animation thread is the likeliest cause, so the copy is laid out normally).
export type CopyFrame = { top: number; height: number; scroll: number };
let copyFrame: CopyFrame = { top: 0, height: 0, scroll: 0 };
const frameListeners = new Set<(f: CopyFrame) => void>();
export function setCopyFrame(f: CopyFrame) {
  copyFrame = f;
  frameListeners.forEach((l) => l(f));
}
export function useCopyFrame(): CopyFrame {
  const [f, setF] = useState(copyFrame);
  useEffect(() => {
    frameListeners.add(setF);
    setF(copyFrame);
    return () => {
      frameListeners.delete(setF);
    };
  }, []);
  return f;
}
let hostRef: View | null = null;
export function measurePeelHost(): Promise<number> {
  return new Promise((resolve) => {
    if (!hostRef || typeof (hostRef as any).measureInWindow !== 'function') return resolve(0);
    (hostRef as any).measureInWindow((_x: number, y: number) => resolve(typeof y === 'number' ? y : 0));
  });
}
// True from the moment a peel turns the look over until the copy has faded away: the Dark
// mode sticker waits (a 2nd tap in that moment closed the app on Cath's phone, 2026-10-30).
export function useScreenPeelSettling(): boolean {
  const [settling, setSettling] = useState(!!current?.flipped);
  useEffect(() => {
    const l = (p: Peel | null) => setSettling(!!p?.flipped);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return settling;
}
export function prepareScreenPeel(content: React.ReactNode) {
  current = { content, toDark: null, flipped: false };
  emit();
}
export function releaseScreenPeel() {
  current = null;
  screenPeelK.value = 0;
  emit();
}
export function showScreenPeel(content: React.ReactNode, toDark: boolean) {
  current = { content: current?.content ?? content, toDark, flipped: false };
  emit();
}
// The peel ended: flipped = the look is turning over (wait for it, then fade away).
export function endScreenPeel(flipped: boolean) {
  if (!current) return;
  if (!flipped) {
    current = { ...current, toDark: null, flipped: false };
    screenPeelK.value = 0;
  } else current = { ...current, flipped: true };
  emit();
}

// A copy of a page drawn in the other look (with the mood colours on top, like the app).
export const OtherLook = React.memo(function OtherLook({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  const base = React.useContext(ThemeContext);
  const value = React.useMemo(() => (base ? { ...base, isDark: dark, colors: dark ? darkTheme : lightTheme } : base), [base, dark]);
  if (!value) return <>{children}</>;
  return (
    <ThemeContext.Provider value={value}>
      <MoodThemeProvider>{children}</MoodThemeProvider>
    </ThemeContext.Provider>
  );
});

const AView = Animated.View;
const APath = Animated.createAnimatedComponent(Path);

export function ScreenPeelHost() {
  const [peel, setPeel] = useState<Peel | null>(current);
  const { width: W, height: H } = useWindowDimensions();
  const { isDark } = useTheme();
  const reduce = useReduceMotion();
  const fade = React.useMemo(() => makeMutable(1), []);

  useEffect(() => {
    listeners.add(setPeel);
    return () => {
      listeners.delete(setPeel);
    };
  }, []);

  // Turned over: once the app is drawn in the new look, the copy fades away.
  useEffect(() => {
    if (!peel?.flipped || isDark !== peel.toDark) return;
    const clear = () => {
      // The copy goes; the Appearance page draws a fresh one (hidden) for the next peel, in
      // the other look (a copy re-drawn in place closed the app on Cath's phone).
      current = null;
      screenPeelK.value = 0;
      fade.value = 1;
      emit();
    };
    if (reduce) {
      clear();
      return;
    }
    fade.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.bezier(CURVE_OUT[0], CURVE_OUT[1], CURVE_OUT[2], CURVE_OUT[3]) }, (ok) => {
      if (ok) runOnJS(clear)();
    });
  }, [peel, isDark, reduce, fade]);

  const D = W + H;
  const outer = useAnimatedStyle(() => {
    const fold = screenPeel(W, H, screenPeelK.value).fold;
    return { transform: [{ rotate: '45deg' as const }, { translateY: fold - D }] as const };
  });
  const inner = useAnimatedStyle(() => {
    const fold = screenPeel(W, H, screenPeelK.value).fold;
    return { transform: [{ translateY: D - fold }, { rotate: '-45deg' as const }] as const };
  });
  const shade = useAnimatedStyle(() => ({ opacity: screenPeelK.value > 0 && screenPeelK.value < 1 ? 1 : 0 }));
  const whole = useAnimatedStyle(() => ({ opacity: fade.value }));
  const flapProps = useAnimatedProps(() => ({ d: pathOf(screenPeel(W, H, screenPeelK.value).flap) }));
  const flapShadowProps = useAnimatedProps(() => ({ d: pathOf(screenPeel(W, H, screenPeelK.value).flap, -6, 8) }));

  if (!peel) return null;
  const toDark = peel.toDark ?? !isDark;
  // The back of the screen being peeled: light paper when going dark, dark when going light.
  const back = toDark ? ['#FFFFFF', '#F2F2F7', '#C9C9D0'] : ['#3A3A3C', '#1C1C1E', '#000000'];
  return (
    <AView
      // Only prepared (no peel yet): drawn but fully see-through, so nothing can show early.
      style={[StyleSheet.absoluteFill, whole, peel.toDark === null ? { opacity: 0 } : null]}
      pointerEvents="none"
      testID={peel.toDark === null ? 'screen-peel-ready' : 'screen-peel'}
    >
      <View
        ref={(r) => {
          hostRef = r;
        }}
        collapsable={false}
        style={StyleSheet.absoluteFill}
      />
      <AView style={[{ position: 'absolute', left: W - D, top: -D, width: 2 * D, height: 2 * D, overflow: 'hidden' }, outer]}>
        <AView style={[{ position: 'absolute', left: 0, top: 0, width: 2 * D, height: 2 * D }, inner]}>
          <View style={{ position: 'absolute', left: D - W, top: D, width: W, height: H, overflow: 'hidden' }}>
            <OtherLook dark={toDark}>{peel.content}</OtherLook>
          </View>
        </AView>
        {/* A soft shadow on the new look, just inside the fold. */}
        <AView style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 26 }, shade]}>
          <ShadeGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.28)']} style={StyleSheet.absoluteFill} />
        </AView>
      </AView>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="peelBack" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={back[1]} />
            <Stop offset="0.12" stopColor={back[0]} />
            <Stop offset="0.55" stopColor={back[1]} />
            <Stop offset="1" stopColor={back[2]} />
          </LinearGradient>
        </Defs>
        <APath animatedProps={flapShadowProps} fill="rgba(0,0,0,0.22)" />
        <APath animatedProps={flapProps} fill="url(#peelBack)" />
      </Svg>
    </AView>
  );
}
