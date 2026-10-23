import React from 'react';
import SkyGlow from './SkyGlow';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Modal, View, Pressable, KeyboardAvoidingView, StyleSheet, Platform, useWindowDimensions, Keyboard, Dimensions, Animated, Easing } from 'react-native';
import { useReduceMotion } from '../reduceMotion';
import { CURVE, DIM_MS, ROW_MS, SHEET_CLOSE_MS, SHEET_OPEN_MS } from '../motion';
import { formSwitching } from './FormSwapFade';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { spacing } from '../tokens';
import { noteActivity } from '../activity';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
  // Redesign: a custom top bar (e.g. Cancel / title / Add) instead of a plain title,
  // and a grey "grouped" background so white form groups stand out, iPhone style.
  header?: React.ReactNode;
  grouped?: boolean;
  // Version 2.2 (Cath: Bill / Debt / Loan should switch inside ONE sheet): sheets with
  // the same `shared` name are all shown in a single sheet (SharedSheetHost). Switching
  // from one to another just changes what's inside it, with no closing and reopening.
  shared?: string;
};

// ---- shared sheets ----
type SharedEntry = { props: BottomSheetProps; openedAt: number };
const sharedStores = new Map<string, { entries: Map<number, SharedEntry>; listeners: Set<() => void>; hosts: number }>();
function sharedStore(name: string) {
  let st = sharedStores.get(name);
  if (!st) {
    st = { entries: new Map(), listeners: new Set(), hosts: 0 };
    sharedStores.set(name, st);
  }
  return st;
}
let nextSharedId = 1;

// Put this once, where it stays on screen (it shows the one sheet for every form named
// `name`). Screens' own <BottomSheet shared={name}> then draw into it.
export function SharedSheetHost({ name }: { name: string }) {
  const st = sharedStore(name);
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  React.useLayoutEffect(() => {
    st.hosts += 1;
    st.listeners.add(bump);
    bump();
    return () => {
      st.hosts -= 1;
      st.listeners.delete(bump);
    };
  }, [st]);
  // The newest open form wins; when none is open, the last one stays drawn while the
  // sheet slides away.
  const lastRef = React.useRef<BottomSheetProps | null>(null);
  let active: SharedEntry | null = null;
  st.entries.forEach((e) => {
    if (e.props.visible && (!active || e.openedAt > active.openedAt)) active = e;
  });
  const openCount = Array.from(st.entries.values()).filter((e) => e.props.visible).length;
  // A second form opened while one was showing: that's a switch. The first one closes
  // underneath (unseen), the sheet itself stays up.
  React.useEffect(() => {
    if (openCount <= 1) return;
    const handoff = takeHandoff();
    if (handoff) {
      handoff();
      return;
    }
    // Sweep fix: no handoff waiting (it timed out) - close the older forms anyway, so an
    // old one can never come back when the newest closes.
    const newest = active as SharedEntry | null;
    st.entries.forEach((e) => {
      if (e !== newest && e.props.visible) e.props.onClose();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCount]);
  if (active) lastRef.current = (active as SharedEntry).props;
  const props = lastRef.current;
  if (!props) return null;
  return <BottomSheet {...props} shared={undefined} visible={!!active} />;
}

function useSharedSheet(name: string | undefined, props: BottomSheetProps): boolean {
  const id = React.useRef(0);
  if (!id.current) id.current = nextSharedId++;
  const st = name ? sharedStore(name) : null;
  const useHost = !!st && st.hosts > 0;
  const wasVisible = React.useRef(false);
  React.useLayoutEffect(() => {
    if (!st || !useHost) return;
    // Speed sweep: a closed form tells the sheet nothing (its screen redraws for other
    // reasons all the time); only an open one, or one that just closed, does.
    if (!props.visible && !wasVisible.current) return;
    const prev = st.entries.get(id.current);
    const openedAt = props.visible && !wasVisible.current ? Date.now() : prev?.openedAt ?? 0;
    wasVisible.current = props.visible;
    st.entries.set(id.current, { props, openedAt });
    st.listeners.forEach((l) => l());
  });
  React.useEffect(
    () => () => {
      if (!st) return;
      st.entries.delete(id.current);
      st.listeners.forEach((l) => l());
    },
    [st]
  );
  return useHost;
}

// Version 2.2 (approved P1, Emil Kowalski's drawer curve): the sheet leaps up the moment
// it's asked for and settles gently (300 ms), the dim behind it fades, and it can be
// dragged down by its top bar to close. With the phone set to remove animations it just
// appears and disappears.
const DRAWER = Easing.bezier(...CURVE);
const OPEN_MS = SHEET_OPEN_MS;
const CLOSE_MS = SHEET_CLOSE_MS;
// How long to wait for a sheet to finish sliding away before moving to another screen.
export const SHEET_CLOSE_WAIT = CLOSE_MS + 40;

// Version 2.2 (Cath: switching Bill / Debt / Loan closed the sheet and opened it again):
// a "handoff" from one sheet to the next. The next sheet appears already up (no slide),
// and the one before it goes away underneath at that same moment (no slide down), so it
// looks like one sheet whose form changed.
let handoffClose: (() => void) | null = null;
let handoffUntil = 0;
let instantCloseUntil = 0;
export function startSheetHandoff(closePrevious: () => void) {
  handoffClose = closePrevious;
  handoffUntil = Date.now() + 1500;
  // If the next sheet never shows, the old one still closes (normally).
  setTimeout(() => {
    if (handoffClose === closePrevious) {
      handoffClose = null;
      closePrevious();
    }
  }, 1500);
}
// A sheet that was waiting to hand over to a form, when no form follows after all (e.g.
// the app goes to Accounts first): it closes now instead of after the 1.5 s fallback.
export function finishSheetHandoff() {
  const f = takeHandoff();
  if (f) f();
}
function takeHandoff(): (() => void) | null {
  if (!handoffClose || Date.now() > handoffUntil) return null;
  const f = handoffClose;
  handoffClose = null;
  return f;
}

export default function BottomSheet(allProps: BottomSheetProps) {
  const inHost = useSharedSheet(allProps.shared, allProps);
  if (inHost) return null;
  return <OwnSheet {...allProps} />;
}

function OwnSheet({
  visible,
  onClose,
  title,
  children,
  testID,
  header,
  grouped = false,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const styles = React.useMemo(() => makeStyles(colors, screenHeight), [colors, screenHeight]);
  // The app draws edge to edge, so the sheet runs under the phone's navigation bar too
  // (no strip of the screen behind showing below it) and pads its content above the bar.
  const insets = useSafeAreaInsets();
  // Android: because the sheet runs edge to edge, the system no longer pushes it up when
  // the keyboard opens. So we measure the keyboard ourselves and lift the sheet above it.
  // (iPhone keeps using KeyboardAvoidingView below.)
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  React.useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    // How much of the screen the keyboard covers, from where its top edge actually is
    // (its reported height leaves out the navigation bar on some phones).
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const screenH = Dimensions.get('screen').height;
      const { screenY, height } = e.endCoordinates ?? { screenY: 0, height: 0 };
      const fromTop = typeof screenY === 'number' && screenY > 0 ? screenH - screenY : 0;
      setKeyboardHeight(Math.max(height ?? 0, fromTop));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);
  // Android reports the keyboard's height WITHOUT the navigation bar under it, and the
  // sheet runs right to the bottom edge, so the room kept at the bottom is keyboard +
  // navigation bar. The content above shrinks (and scrolls) to make room; the sheet never
  // grows past the top of the screen.
  const bottomSpace = keyboardHeight > 0 ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0) : insets.bottom;

  // Opening and closing. The window shows as soon as it's asked for (no extra redraw
  // first, 2.2 speed fix); the slide starts the moment the phone has shown it. It stays
  // shown while the sheet slides away.
  const reduce = useReduceMotion();
  const [closing, setClosingState] = React.useState(false);
  const closingRef = React.useRef(false);
  const setClosing = (v: boolean) => {
    closingRef.current = v;
    setClosingState(v);
  };
  const offY = screenHeight;
  const y = React.useRef(new Animated.Value(offY)).current;
  const dim = React.useRef(new Animated.Value(0)).current;
  const wasVisible = React.useRef(visible);
  // Code review fix (Android): in the very redraw where the sheet is asked to close, keep the
  // window up. Before, Android took the window down at once (no slide), then put it back for
  // a moment and took it down again: a flicker instead of the slide.
  const justClosed = !visible && wasVisible.current;
  const [, redraw] = React.useReducer((n: number) => n + 1, 0);
  // Smoothness 2026-10-23: the sheet is "resting" when it's fully up and not being dragged.
  const resting = React.useRef(false);
  const openNow = React.useCallback(() => {
    const prev = takeHandoff();
    if (prev) {
      y.setValue(0);
      dim.setValue(1);
      instantCloseUntil = Date.now() + 400;
      resting.current = true;
      prev();
      return;
    }
    if (reduce) {
      y.setValue(0);
      dim.setValue(1);
      resting.current = true;
      return;
    }
    resting.current = false;
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: OPEN_MS, easing: DRAWER, useNativeDriver: true }),
      Animated.timing(dim, { toValue: 1, duration: DIM_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) resting.current = true;
    });
  }, [reduce, y, dim]);

  // Smoothness 2026-10-23 (Cath: nothing may jump): when Bill / Debt / Loan (or I borrowed /
  // I lent) changes the form, the new form is taller or shorter. Its top edge used to jump
  // there in one frame; now it glides. Measured before the screen draws (new
  // architecture), only during a form switch (rows opening inside a form animate
  // themselves).
  const sheetRef = React.useRef<View>(null);
  const lastHeight = React.useRef(0);
  React.useLayoutEffect(() => {
    if (!visible) {
      lastHeight.current = 0;
      return;
    }
    sheetRef.current?.measure((_x, _y, _w, h) => {
      const before = lastHeight.current;
      lastHeight.current = h;
      if (!before || Math.abs(h - before) < 2 || !resting.current || reduce || !formSwitching()) return;
      // Taller: it starts lower by the difference and rises; shorter: it starts higher
      // (the strip below it is covered by the filler under the sheet) and settles.
      y.stopAnimation();
      y.setValue(h - before);
      Animated.timing(y, { toValue: 0, duration: ROW_MS, easing: DRAWER, useNativeDriver: true }).start();
    });
  });
  React.useEffect(() => {
    const was = wasVisible.current;
    wasVisible.current = visible;
    if (visible && !was) {
      const stillShown = closingRef.current;
      setClosing(false);
      y.stopAnimation();
      dim.stopAnimation();
      // Reopened while it was still sliding away: the window never hid, so slide it back
      // up from where it is (the phone won't say "shown" again).
      if (stillShown) {
        openNow();
        return;
      }
      y.setValue(offY);
      dim.setValue(0);
    } else if (!visible && was) {
      if (reduce || Date.now() < instantCloseUntil) {
        // No slide: take the window down straight away.
        y.setValue(offY);
        dim.setValue(0);
        redraw();
        return;
      }
      setClosing(true);
      resting.current = false;
      Animated.parallel([
        Animated.timing(y, { toValue: offY, duration: CLOSE_MS, easing: DRAWER, useNativeDriver: true }),
        Animated.timing(dim, { toValue: 0, duration: CLOSE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => setClosing(false));
    }
    // Only when it is asked to open or close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Drag down by the handle or the top bar to close; let go early and it springs back.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const drag = React.useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY(12)
        .failOffsetX([-24, 24])
        .onUpdate((e) => {
          resting.current = false;
          y.setValue(Math.max(0, e.translationY));
        })
        .onEnd((e) => {
          if (e.translationY > 120 || e.velocityY > 900) onCloseRef.current();
          else
            Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start(({ finished }) => {
              if (finished) resting.current = true;
            });
        }),
    [y]
  );

  return (
    <Modal
      visible={visible || closing || justClosed}
      onShow={openNow}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Version 2.1: a pop-up window needs its own gesture root for swipes to work on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }} onTouchStart={noteActivity}>
      <View style={styles.backdropWrap}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.4)', opacity: dim }]} />
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close bottom sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            ref={sheetRef}
            style={[
              styles.sheet,
              grouped && { backgroundColor: colors.navy2 },
              keyboardHeight > 0 && { maxHeight: Math.max(200, screenHeight - insets.top - 24) },
              { transform: [{ translateY: y }] },
            ]}
          >
            {/* Version 2.1: the same time-of-day glow as Home, without rays/rain/stars. */}
            <SkyGlow plain />
            <GestureDetector gesture={drag}>
              <View>
                <View style={styles.handleWrap}>
                  <View style={styles.handle} />
                </View>

                {header}
                {!header && !!title && (
                  <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                  </View>
                )}
              </View>
            </GestureDetector>

            <KeyboardAwareScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </KeyboardAwareScrollView>

            <View style={{ height: bottomSpace }} />
          </Animated.View>
          {/* Below the bottom edge of the screen, moving with the sheet: when a shorter form
              settles from higher up, this covers the strip under the sheet. */}
          <Animated.View
            pointerEvents="none"
            style={[styles.filler, { backgroundColor: grouped ? colors.navy2 : colors.navy3, transform: [{ translateY: y }] }]}
          />
        </KeyboardAvoidingView>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(colors: any, screenHeight: number) {
  return StyleSheet.create({
    backdropWrap: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    keyboardWrap: {
      width: '100%',
      justifyContent: 'flex-end',
    },
    filler: { position: 'absolute', left: 0, right: 0, top: '100%', height: Math.round(screenHeight * 0.5) },
    sheet: {
      backgroundColor: colors.navy3,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      overflow: 'hidden', // keeps the glow inside the rounded corners
      borderBottomRightRadius: 0,
      maxHeight: Math.round(screenHeight * 0.85),
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.navy4 || 'rgba(255,255,255,0.06)',
      borderBottomWidth: 0,
    },
    handleWrap: {
      alignItems: 'center',
      paddingTop: spacing[10],
      paddingBottom: spacing[6],
    },
    handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.inkFaint, opacity: 0.4 },
    header: {
      paddingHorizontal: spacing[20],
      paddingTop: spacing[4],
      paddingBottom: spacing[12],
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing[20],
      paddingBottom: Platform.OS === 'ios' ? spacing[12] : spacing[20],
    },
  });
}