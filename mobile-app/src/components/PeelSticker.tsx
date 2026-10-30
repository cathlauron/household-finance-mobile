import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, PAGE_BACK_MS, PAGE_OPEN_MS, PEEL_TAP_MS } from '../motion';
import { pathOf, stickerCorner, stickerFar, stickerPeel, type Pt } from '../peelGeometry';

// Peel-off switch (mockup K2e, approved by Cath 2026-10-29). A sticker that peels from its
// top-right corner and follows your finger; let go past halfway and it comes off (the
// setting flips), before halfway it settles back. A tap is one steady peel. When the
// setting is on, the green "On" sticker peels off the same way to turn it off.
// The current face and the one underneath swap on the animation thread in the same frame
// the peel ends, so the sticker never flashes its old face.
// `screenK` (Dark mode): how far the sticker has come off, 0 to 1, for the screen peel.

const APath = Animated.createAnimatedComponent(Path);
const AG = Animated.createAnimatedComponent(G);
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
  shared,
  still,
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
  // Dark mode: the finger position and face live outside, so a copy of this sticker (drawn
  // on the screen peel, `still`) moves with it.
  shared?: { px: SharedValue<number>; py: SharedValue<number>; topOn: SharedValue<number>; busy: SharedValue<number> };
  still?: boolean;
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
  const px = shared?.px ?? ownPx;
  const py = shared?.py ?? ownPy;
  const busy = shared?.busy ?? ownBusy;
  const topOn = shared?.topOn ?? ownTopOn;
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
  const topOnProps = useAnimatedProps(() => ({ opacity: topOn.value }));
  const topOffProps = useAnimatedProps(() => ({ opacity: 1 - topOn.value }));

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
    .enabled(!disabled)
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
    .enabled(!disabled)
    .onEnd((_e, ok) => {
      if (!ok || busy.value) return;
      busy.value = 2;
      runOnJS(started)(topOn.value === 1);
      settle(FAR, reduce ? 0 : PEEL_TAP_MS, true, true);
    });
  return Gesture.Exclusive(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, reduce, W, testID]);

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
        <Svg width={W + PAD * 2} height={H + PAD * 2} style={{ position: 'absolute', left: -PAD, top: -PAD }} pointerEvents="none">
          <Defs>
            <ClipPath id={`r${ids}`}>
              <Rect x={PAD} y={PAD} width={W} height={H} rx={R} />
            </ClipPath>
            <ClipPath id={`k${ids}`}>
              <APath animatedProps={keepProps} />
            </ClipPath>
            <LinearGradient id={`g${ids}`} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.15} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.22} />
            </LinearGradient>
          </Defs>
          {/* Underneath: what you get when it comes off. */}
          <G clipPath={`url(#r${ids})`}>
            <AG animatedProps={topOffProps}>{face(on, onLabel, false)}</AG>
            <AG animatedProps={topOnProps}>{face(PAPER, offLabel, true)}</AG>
          </G>
          {/* On top: the setting as it is now, minus the lifted corner. */}
          <G clipPath={`url(#k${ids})`}>
            <AG animatedProps={topOnProps}>{face(on, onLabel, false)}</AG>
            <AG animatedProps={topOffProps}>{face(PAPER, offLabel, true)}</AG>
          </G>
          {/* The lifted corner: its back, with a soft shadow under it. */}
          <APath animatedProps={shadowProps} fill="rgba(0,0,0,0.18)" />
          <AG animatedProps={topOnProps}>
            <APath animatedProps={flapProps} fill={on.bg} />
          </AG>
          <AG animatedProps={topOffProps}>
            <APath animatedProps={flapProps} fill="#F7E7D6" />
          </AG>
          <APath animatedProps={flapProps} fill={`url(#g${ids})`} />
        </Svg>
      </View>
  );
  if (still) return body;
  return <GestureDetector gesture={gesture}>{body}</GestureDetector>;
}
