import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, PAGE_BACK_MS, PAGE_OPEN_MS, PEEL_TAP_MS } from '../motion';
import { pathOf, stickerCorner, stickerFar, stickerPeel, type Pt } from '../peelGeometry';
import type { StickerValues } from '../screenPeel';

// Peel-off switch (mockup K2e, approved by Cath 2026-10-29). A sticker that peels from its
// top-right corner and follows your finger; let go past halfway and it comes off (the
// setting flips), before halfway it settles back. A tap is one steady peel. When the
// setting is on, the green "On" sticker peels off the same way to turn it off.
// The current face and the one underneath swap on the animation thread in the same frame
// the peel ends, so the sticker never flashes its old face.
// `screenK` (Dark mode): how far the sticker has come off, 0 to 1, for the screen peel.

const APath = Animated.createAnimatedComponent(Path);
// One layer of the sticker: its own drawing inside an ordinary view that can fade.
function Layer({ style, w, children }: { style: any; w: number; children: React.ReactNode }) {
  return (
    <Animated.View style={[{ position: 'absolute', left: -PAD, top: -PAD, width: w + PAD * 2, height: H + PAD * 2 }, style]} pointerEvents="none">
      <Svg width={w + PAD * 2} height={H + PAD * 2}>{children}</Svg>
    </Animated.View>
  );
}
const PAD = 60;
const H = 34;
const R = 10;
const PAPER = { bg: '#FFF6ED', edge: '#EBCFB2', ink: '#3B2A1C' };

export default function PeelSticker({
  value,
  onChange,
  offLabel = 'Off',
  onLabel = 'On',
  wide,
  disabled,
  testID,
  accessibilityLabel,
  screenK,
  onPeelStart,
  onPeelEnd,
  lendTo,
  borrow,
  still,
  paused,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
  offLabel?: string;
  onLabel?: string;
  wide?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel: string;
  screenK?: SharedValue<number>;
  onPeelStart?: (toOn: boolean) => void;
  onPeelEnd?: (flipped: boolean) => void;
  // Dark mode: `lendTo` lends this sticker's own finger position and face to its copy on the
  // screen peel; the copy (`still`) draws from `borrow`, so it moves with the real one.
  lendTo?: { current: StickerValues | null };
  borrow?: StickerValues | null;
  still?: boolean;
  // Not peelable for a moment, without looking greyed out (Dark mode, while the screen is
  // still turning over from the last peel: Cath's phone closed the app on a quick 2nd tap).
  paused?: boolean;
}) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const W = wide ? 112 : 84;
  const C = stickerCorner(W);
  const FAR = stickerFar(W, H);
  const ownPx = useSharedValue(C[0]);
  const ownPy = useSharedValue(C[1]);
  const ownBusy = useSharedValue(0);
  const ownTopOn = useSharedValue(value ? 1 : 0);
  const px = borrow?.px ?? ownPx;
  const py = borrow?.py ?? ownPy;
  const busy = borrow?.busy ?? ownBusy;
  const topOn = borrow?.topOn ?? ownTopOn;
  useEffect(() => {
    if (!lendTo) return;
    lendTo.current = { px: ownPx, py: ownPy, topOn: ownTopOn, busy: ownBusy };
    return () => {
      if (lendTo.current?.px === ownPx) lendTo.current = null;
    };
  }, [lendTo, ownPx, ownPy, ownTopOn, ownBusy]);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const ids = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  // The setting changed from outside (another phone, Match my phone, a reset): show it.
  useEffect(() => {
    if (still) return;
    if (busy.value === 0) {
      topOn.value = value ? 1 : 0;
      px.value = C[0];
      py.value = C[1];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, still]);

  const on = { bg: colors.buttonFill, edge: colors.buttonFill, ink: colors.onButton };

  // The latest callbacks, read when a peel starts or ends: the gestures below are made once
  // (re-made gestures while a finger is down would cancel the peel).
  const cb = useRef({ onChange, onPeelStart, onPeelEnd });
  cb.current = { onChange, onPeelStart, onPeelEnd };
  const finished = useCallback((flipped: boolean, wasOn: boolean) => {
    if (flipped) {
      hapticSelection();
      cb.current.onChange(!wasOn);
    }
    cb.current.onPeelEnd?.(flipped);
  }, []);
  const started = useCallback((wasOn: boolean) => {
    cb.current.onPeelStart?.(!wasOn);
  }, []);

  // The shapes for the finger's place, on the animation thread.
  const keepProps = useAnimatedProps(() => ({ d: pathOf(stickerPeel(W, H, [px.value, py.value]).keep, PAD, PAD) }));
  // Dark mode: the screen peels as far as the sticker has (only while a peel is going on).
  useAnimatedReaction(
    () => (busy.value ? stickerPeel(W, H, [px.value, py.value]).k : -1),
    (k) => {
      if (screenK && k >= 0) screenK.value = k;
    },
  );
  const flapProps = useAnimatedProps(() => ({ d: pathOf(stickerPeel(W, H, [px.value, py.value]).flap, PAD, PAD) }));
  const shadowProps = useAnimatedProps(() => {
    const r = stickerPeel(W, H, [px.value, py.value]);
    return { d: pathOf(r.flap, PAD + 1.5, PAD + 3) };
  });
  // Which layers show (ordinary views fading, never groups inside a drawing: B-081).
  // Cath's video 2026-10-30 ("Daght", a pink corner on "☀ Light"): the face underneath and the
  // lifted corner only show while a peel is going on.
  const topOnStyle = useAnimatedStyle(() => ({ opacity: topOn.value }));
  const topPaperStyle = useAnimatedStyle(() => ({ opacity: 1 - topOn.value }));
  const underOnStyle = useAnimatedStyle(() => ({ opacity: busy.value ? 1 - topOn.value : 0 }));
  const underPaperStyle = useAnimatedStyle(() => ({ opacity: busy.value ? topOn.value : 0 }));
  const flapStyle = useAnimatedStyle(() => ({ opacity: busy.value ? 1 : 0 }));
  const onBg = on.bg;
  const flapFillProps = useAnimatedProps(() => ({
    d: pathOf(stickerPeel(W, H, [px.value, py.value]).flap, PAD, PAD),
    fill: topOn.value === 1 ? onBg : '#F7E7D6',
  }));

  // Ends a peel on the animation thread: swap the faces and lay the new one flat at once.
  function settle(to: Pt, ms: number, linear: boolean, flip: boolean) {
    'worklet';
    const wasOn = topOn.value === 1;
    const done = () => {
      'worklet';
      if (flip) topOn.value = wasOn ? 0 : 1;
      busy.value = 0;
      // A flipped screen stays fully peeled until the new look is drawn (no flash back).
      if (screenK) screenK.value = flip ? 1 : 0;
      px.value = C[0];
      py.value = C[1];
      runOnJS(finished)(flip, wasOn);
    };
    if (ms === 0) {
      px.value = to[0];
      py.value = to[1];
      done();
      return;
    }
    const easing = linear ? Easing.linear : Easing.bezier(CURVE[0], CURVE[1], CURVE[2], CURVE[3]);
    py.value = withTiming(to[1], { duration: ms, easing });
    px.value = withTiming(to[0], { duration: ms, easing }, (ok) => {
      if (ok) done();
    });
  }

  const gesture = useMemo(() => {
  const pan = Gesture.Pan()
    .withTestId(`${testID ?? 'peel'}-pan`)
    .enabled(!disabled && !paused)
    .activeOffsetX([-6, 6])
    .onBegin(() => {
      if (busy.value) return;
      startX.value = px.value;
      startY.value = py.value;
    })
    .onStart(() => {
      if (busy.value) return;
      busy.value = 1;
      runOnJS(started)(topOn.value === 1);
    })
    .onUpdate((e) => {
      if (busy.value !== 1) return;
      px.value = startX.value + e.translationX;
      py.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      if (busy.value !== 1) return;
      busy.value = 2;
      const past = stickerPeel(W, H, [px.value, py.value]).past;
      if (past) settle(FAR, reduce ? 0 : PAGE_OPEN_MS, false, true);
      else settle(C, reduce ? 0 : PAGE_BACK_MS, false, false);
    })
    .onFinalize(() => {
      // A cancelled drag (the page scrolled instead) settles back.
      if (busy.value === 1) {
        busy.value = 2;
        settle(C, reduce ? 0 : PAGE_BACK_MS, false, false);
      }
    });

  const tap = Gesture.Tap()
    .withTestId(`${testID ?? 'peel'}-tap`)
    .enabled(!disabled && !paused)
    .onEnd((_e, ok) => {
      if (!ok || busy.value) return;
      busy.value = 2;
      runOnJS(started)(topOn.value === 1);
      settle(FAR, reduce ? 0 : PEEL_TAP_MS, true, true);
    });
  return Gesture.Exclusive(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, paused, reduce, W, testID]);

  const face = (f: { bg: string; edge: string; ink: string }, label: string, stroke: boolean) => (
    <>
      <Rect x={PAD} y={PAD} width={W} height={H} rx={R} fill={f.bg} stroke={stroke ? f.edge : 'none'} strokeWidth={1} />
      <SvgText x={PAD + W / 2} y={PAD + H / 2 + 5} textAnchor="middle" fontSize={15} fontWeight="700" fontFamily="Nunito_700Bold" fill={f.ink}>
        {label}
      </SvgText>
    </>
  );

  const body = (
      <View
        testID={testID}
        style={{ width: W, height: H, opacity: disabled ? 0.4 : 1 }}
        accessible={!still}
        accessibilityRole="switch"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={() => {
          if (!disabled) {
            hapticSelection();
            onChange(!value);
          }
        }}
        hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
      >
        {/* B-081 (Cath's phone crash log, 2026-10-30): the drawing library crashed the app
            ("Underflow in restore") when groups inside one drawing faded to see-through and
            back. Now nothing inside a drawing fades: each layer is its own drawing, and only
            the layers themselves (ordinary views) fade. */}
        {/* Underneath: what you get when it comes off (only while peeling). */}
        <Layer style={underOnStyle} w={W}>
          <Defs><ClipPath id={`ru${ids}`}><Rect x={PAD} y={PAD} width={W} height={H} rx={R} /></ClipPath></Defs>
          <G clipPath={`url(#ru${ids})`}>{face(on, onLabel, false)}</G>
        </Layer>
        <Layer style={underPaperStyle} w={W}>
          <Defs><ClipPath id={`rp${ids}`}><Rect x={PAD} y={PAD} width={W} height={H} rx={R} /></ClipPath></Defs>
          <G clipPath={`url(#rp${ids})`}>{face(PAPER, offLabel, true)}</G>
        </Layer>
        {/* On top: the setting as it is now, minus the lifted corner. */}
        <Layer style={topOnStyle} w={W}>
          <Defs><ClipPath id={`ko${ids}`}><APath animatedProps={keepProps} /></ClipPath></Defs>
          <G clipPath={`url(#ko${ids})`}>{face(on, onLabel, false)}</G>
        </Layer>
        <Layer style={topPaperStyle} w={W}>
          <Defs><ClipPath id={`kp${ids}`}><APath animatedProps={keepProps} /></ClipPath></Defs>
          <G clipPath={`url(#kp${ids})`}>{face(PAPER, offLabel, true)}</G>
        </Layer>
        {/* The lifted corner: its back, with a soft shadow under it (only while peeling). */}
        <Layer style={flapStyle} w={W}>
          <Defs>
            <LinearGradient id={`g${ids}`} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.15} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          <APath animatedProps={shadowProps} fill="rgba(0,0,0,0.18)" />
          <APath animatedProps={flapFillProps} />
          <APath animatedProps={flapProps} fill={`url(#g${ids})`} />
        </Layer>
      </View>
  );
  if (still) return body;
  return <GestureDetector gesture={gesture}>{body}</GestureDetector>;
}
