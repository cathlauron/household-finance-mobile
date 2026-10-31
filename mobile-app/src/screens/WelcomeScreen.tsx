import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import DrawingLogo from '../components/DrawingLogo';
import SkyFade from '../components/SkyFade';
import SunArc, { SunLook } from '../components/SunArc';
import { useTheme } from '../ThemeContext';
import { setLookPreview } from '../lookPreview';
import type { SkyPhase } from '../sky';
import { CURVE, PAGE_OPEN_MS, VOICE_PULSE_MS, VOICE_WAVE_MS, WELCOME_HOLD_MS, WELCOME_MOMENT_MS } from '../motion';
import { useReduceMotion } from '../reduceMotion';

// Version 3.3 welcome (Cath, mockup O3a, approved 2026-10-31): a day with Finance Flow.
// It plays by itself through five moments (morning widgets, Say it at lunch, a bill nudge,
// the household's changes, a calm night), with the sky and the sun on its arc following
// the time, and the screen turning dark at night (shown only, nothing is saved).
// Tapping a time holds it there; it carries on after a while untouched. With Reduce Motion
// nothing moves by itself: tap the times.

type Props = {
  onStart: () => void;
  onSignIn: () => void;
};

const MOMENTS: { time: string; label: string; h: number; sky: SkyPhase; sun: SunLook; title: string }[] = [
  { time: '7:30 AM', label: 'Morning', h: 7.5, sky: 'morning', sun: 'sunrise', title: 'One glance from your home screen' },
  { time: '12:40 PM', label: 'Midday', h: 12.67, sky: 'afternoon', sun: 'midday', title: 'Say it at the till. Done.' },
  { time: '5:00 PM', label: 'Afternoon', h: 17, sky: 'afternoon', sun: 'afternoon', title: 'A nudge before a bill is due' },
  { time: '7:45 PM', label: 'Evening', h: 19.75, sky: 'evening', sun: 'sunset', title: 'See what your home added' },
  { time: '10:00 PM', label: 'Night', h: 22, sky: 'night', sun: 'moon', title: 'Sleep knowing where you stand' },
];
const NIGHT = 4;
const HERO = ['#2C5E48', '#1B3F30', '#122B21'] as const;

export default function WelcomeScreen({ onStart, onSignIn }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const [k, setK] = useState(0);
  const touched = useRef(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => {
      if (Date.now() - touched.current < WELCOME_HOLD_MS) return;
      setK((n) => (n + 1) % MOMENTS.length);
    }, WELCOME_MOMENT_MS);
    return () => clearInterval(t);
  }, [reduce]);

  // Night shows the app dark (a preview, not a saved choice); daytime shows it light.
  useEffect(() => {
    setLookPreview({ dark: k === NIGHT });
  }, [k]);
  useEffect(() => () => setLookPreview({}), []);

  const m = MOMENTS[k];
  const arcW = Math.min(342, width - 48);
  const s = makeStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <SkyFade phase={m.sky} />
      <View style={{ alignItems: 'center' }}>
        <DrawingLogo width={64} drawing={false} once />
      </View>

      <Rise key={`t${k}`} style={{ paddingHorizontal: 8, marginTop: 18 }}>
        <Text style={[s.when, { color: colors.inkDim }]}>{m.time} · {m.label}</Text>
        <Text style={[s.title, { color: colors.ink }]} accessibilityRole="header">{m.title}</Text>
      </Rise>

      <View style={{ flex: 1, justifyContent: 'center', overflow: 'hidden', paddingVertical: 8 }}>
        {k === 0 && <Widgets />}
        {k === 1 && <SayItMoment />}
        {k === 2 && <BillMoment onTouch={() => (touched.current = Date.now())} />}
        {k === 3 && <HouseholdMoment />}
        {k === 4 && <NightMoment />}
      </View>

      <View style={{ alignItems: 'center' }}>
        <SunArc
          width={arcW}
          radius={Math.min(140, arcW / 2 - 24)}
          sweep={90}
          at={(m.h - 6) / 16}
          look={m.sun}
          current={k}
          stops={MOMENTS.map((x, i) => ({
            at: (x.h - 6) / 16,
            label: `Show ${x.label.toLowerCase()}, ${x.time}`,
            onPress: () => {
              touched.current = Date.now();
              setK(i);
            },
          }))}
        >
          <View style={{ alignItems: 'center', marginBottom: 4 }} pointerEvents="none">
            <Text style={[s.clock, { color: colors.ink }]}>{m.time}</Text>
            <Text style={[s.phase, { color: colors.inkDim }]}>{m.label.toUpperCase()}</Text>
          </View>
        </SunArc>
      </View>

      <View style={{ paddingHorizontal: 8, gap: 2, marginTop: 14 }}>
        <TouchableOpacity onPress={onStart} style={[s.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button" testID="welcome-next">
          <Text style={[s.primaryText, { color: colors.onButton }]}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignIn} style={s.link} accessibilityRole="button" testID="welcome-signin">
          <Text style={{ fontSize: 17, color: colors.gold }}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Each moment's pieces arrive with a soft rise, one after another.
function Rise({ delay = 0, style, children }: { delay?: number; style?: object; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return v.setValue(1);
    const a = Animated.timing(v, { toValue: 1, duration: PAGE_OPEN_MS, delay, easing: Easing.bezier(...CURVE), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v, delay, reduce]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function Mic({ size, color, bg }: { size: number; color: string; bg?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {bg ? <Circle cx={12} cy={12} r={12} fill={bg} /> : null}
      <Rect x={9} y={3} width={6} height={11} rx={3} stroke={color} strokeWidth={2.2} />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

// Morning: the home screen widgets, green like the Left to Spend card.
function Widgets() {
  const { colors } = useTheme();
  const pulse = useLoop(VOICE_PULSE_MS);
  return (
    <View style={{ gap: 10 }}>
      <Rise delay={100}>
        <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={w.wide}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={w.label}>LEFT TO SPEND</Text>
              <Text style={w.big}>₱9,860.00</Text>
              <Text style={w.small}>₱1,095 a day · 9 days to payday</Text>
            </View>
            <Svg width={92} height={40} viewBox="0 0 96 40">
              <Path d="M2 30 L16 24 L30 28 L44 14 L58 20 L72 9 L94 16" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[w.btn, { backgroundColor: '#FFFFFF' }]}>
              <Mic size={14} color="#2E6B47" />
              <Text style={[w.btnText, { color: '#2E6B47' }]}>Say it</Text>
            </View>
            <View style={[w.btn, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Text style={[w.btnText, { color: '#FFFFFF' }]}>+ Add</Text>
            </View>
          </View>
        </LinearGradient>
      </Rise>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Rise delay={260} style={{ flex: 1 }}>
          <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={w.square}>
            <View>
              <Text style={w.label}>LEFT TO SPEND</Text>
              <Text style={[w.big, { fontSize: 18, lineHeight: 24 }]}>₱9,860.00</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Svg width={42} height={42} viewBox="0 0 60 60">
                <Circle cx={30} cy={30} r={24} stroke="rgba(255,255,255,0.25)" strokeWidth={7} fill="none" />
                <Circle cx={30} cy={30} r={24} stroke="#FFFFFF" strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray="150.8" strokeDashoffset={60} transform="rotate(-90 30 30)" />
              </Svg>
              <Text style={[w.small, { textAlign: 'right' }]}>{'9 days to\npayday'}</Text>
            </View>
          </LinearGradient>
        </Rise>
        <Rise delay={420} style={{ flex: 1 }}>
          <View style={[w.square, { backgroundColor: colors.navy3, alignItems: 'center', justifyContent: 'center' }]}>
            <Animated.View style={{ borderRadius: 24, transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
              <Mic size={46} color="#FFFFFF" bg="#2E6B47" />
            </Animated.View>
            <Text style={[w.btnText, { color: colors.gold, marginTop: 6 }]}>Say it</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.inkDim }}>“Spent 250 on…”</Text>
          </View>
        </Rise>
      </View>
      <Rise delay={560}>
        <Text style={{ textAlign: 'center', fontSize: 13, color: colors.inkDim }}>Plus Due soon, Month at a glance and Trip</Text>
      </Rise>
    </View>
  );
}

// A 0 → 1 → 0 loop for soft pulses; still with Reduce Motion.
function useLoop(ms: number) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: ms / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms, reduce]);
  return v;
}

function Row({ title, sub, amount, first, tint }: { title: string; sub: string; amount: string; first?: boolean; tint?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[r.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }, tint && { backgroundColor: colors.accentTint }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: tint ? '600' : '400', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.inkDim }}>{sub}</Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.negative }}>{amount}</Text>
    </View>
  );
}

function Bars() {
  const { colors } = useTheme();
  const v = useLoop(VOICE_WAVE_MS);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', height: 24, alignSelf: 'flex-end', paddingRight: 12 }}>
      {[0.5, 1, 0.7, 0.9].map((h, i) => (
        <Animated.View key={i} style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: colors.gold, transform: [{ scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.3 * h, h] }) }] }} />
      ))}
    </View>
  );
}

function SayItMoment() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Rise style={{ alignSelf: 'flex-end' }}>
        <View style={[r.bubble, { backgroundColor: colors.buttonFill }]}>
          <Mic size={20} color={colors.onButton} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: colors.onButton }}>“Lunch, 180”</Text>
        </View>
      </Rise>
      <Rise delay={200}>
        <Bars />
      </Rise>
      <Rise delay={500}>
        <View style={[r.group, { backgroundColor: colors.navy3 }]}>
          <Row first tint title="Lunch" sub="Food · just now · You" amount="−₱180.00" />
          <Row title="Coffee" sub="Food · 8:10 AM · Ana" amount="−₱140.00" />
        </View>
      </Rise>
      <Rise delay={800}>
        <Text style={{ textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.ink }}>Left to spend now ₱9,680.00</Text>
      </Rise>
    </View>
  );
}

function BillMoment({ onTouch }: { onTouch: () => void }) {
  const { colors } = useTheme();
  const [paid, setPaid] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Rise>
        <View style={[r.card, { backgroundColor: colors.navy3 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: '#1B3F30' }} />
            <Text style={{ fontSize: 13, color: colors.inkDim }}>Finance Flow · now</Text>
          </View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, marginTop: 6 }}>Electricity is due tomorrow</Text>
          <Text style={{ fontSize: 15, color: colors.inkDim }}>₱2,400.00 · already counted in Left to spend</Text>
        </View>
      </Rise>
      <Rise delay={150}>
        <TouchableOpacity
          onPress={() => {
            onTouch();
            setPaid(true);
          }}
          accessibilityRole="button"
          style={[s0.primary, { backgroundColor: paid ? colors.accentTint : colors.buttonFill }]}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: paid ? colors.positive : colors.onButton }}>{paid ? 'Paid' : 'Pay now'}</Text>
        </TouchableOpacity>
      </Rise>
      <Rise delay={250}>
        <Text style={{ textAlign: 'center', fontSize: 15, color: colors.inkDim }}>{paid ? 'Logged from BPI Savings. Nothing else to do.' : 'One tap logs it from the right account.'}</Text>
      </Rise>
    </View>
  );
}

function HouseholdMoment() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <Rise>
        <View style={[r.card, { backgroundColor: colors.navy3, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
          <View style={r.avatar}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Ana changed 2 things</Text>
            <Text style={{ fontSize: 15, color: colors.inkDim }}>Groceries and the water bill</Text>
          </View>
        </View>
      </Rise>
      <Rise delay={350}>
        <View style={[r.group, { backgroundColor: colors.navy3 }]}>
          <Row first title="Groceries" sub="Added by Ana" amount="−₱850.00" />
          <Row title="Water bill paid" sub="By Ana" amount="₱600.00" />
        </View>
      </Rise>
    </View>
  );
}

function NightMoment() {
  const { colors } = useTheme();
  const fill = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return fill.setValue(1);
    Animated.timing(fill, { toValue: 1, duration: PAGE_OPEN_MS * 3, delay: 300, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [fill, reduce]);
  return (
    <View style={{ gap: 12 }}>
      <Rise>
        <LinearGradient colors={HERO} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={r.hero}>
          <Text style={{ fontSize: 15, color: '#BFD3C8' }}>Left to spend</Text>
          <Text style={{ fontSize: 40, lineHeight: 46, fontWeight: '700', color: '#FFFFFF' }}>₱8,830.00</Text>
          <Text style={{ fontSize: 15, color: '#BFD3C8' }}>Looking good · 9 days to payday</Text>
        </LinearGradient>
      </Rise>
      <Rise delay={300}>
        <View style={[r.card, { backgroundColor: colors.navy3 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>Baguio trip</Text>
            <Text style={{ fontSize: 17, fontWeight: '600', color: colors.saving }}>₱6,200 of ₱10,000</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.navy1, marginTop: 10, overflow: 'hidden' }}>
            <Animated.View style={{ height: 8, width: '62%', borderRadius: 4, backgroundColor: colors.saving, transformOrigin: 'left', transform: [{ scaleX: fill }] }} />
          </View>
        </View>
      </Rise>
    </View>
  );
}

const s0 = StyleSheet.create({
  primary: { minHeight: 53, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

const w = StyleSheet.create({
  wide: { height: 112, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between', overflow: 'hidden' },
  square: { height: 108, borderRadius: 22, padding: 12, justifyContent: 'space-between', overflow: 'hidden' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, color: '#FFFFFF' },
  big: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: '#FFFFFF' },
  small: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  btn: { flex: 1, height: 32, borderRadius: 14, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 13, fontWeight: '800' },
});

const r = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 6 },
  group: { borderRadius: 16, overflow: 'hidden' },
  card: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4B2E5C', alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, padding: 20 },
});

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 16, backgroundColor: 'transparent' },
    when: { fontSize: 15, fontWeight: '600' },
    title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3, marginTop: 4 },
    clock: { fontSize: 30, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
    phase: { fontSize: 13, letterSpacing: 1.5, marginTop: 2 },
    primary: { minHeight: 53, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderColor: colors.navy4 },
    primaryText: { fontSize: 17, fontWeight: '600' },
    link: { alignSelf: 'center', paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  });
}
