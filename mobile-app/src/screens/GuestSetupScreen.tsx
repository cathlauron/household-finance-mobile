import StepSlide from '../components/StepSlide';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { CARD as HERO_CARD } from '../components/HomeHero';
import type { LeftToSpendMood } from '../balanceProjection';
import { setLookPreview } from '../lookPreview';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import SkyFade from '../components/SkyFade';
import SegmentedControl from '../components/SegmentedControl';
import DrawingLogo from '../components/DrawingLogo';
import SunArc, { SunLook } from '../components/SunArc';
import type { SkyPhase } from '../sky';
import { Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CURVE, FINALE_MS, PAGE_OPEN_MS, VOICE_PULSE_MS } from '../motion';
import { useReduceMotion } from '../reduceMotion';
import GradientFill from '../components/GradientFill';
import AppSwitch from '../components/AppSwitch';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import type { GuestSetup, HelpWith } from '../guest';

// Version 3 (approved Option B, canvas B2-B5): four short questions before Home, all
// before any account exists. Only these answers are kept on the phone.
// Version 3.3 (Cath, mockup S1-S4, 2026-10-31): the welcome's look and a few live touches:
// a "Good morning" preview of your name, chips for what Home shows first, Day & night as a
// fourth look, a lock that closes or opens, and "You're all set" before Home.

const STEP_SKY: SkyPhase[] = ['morning', 'afternoon', 'afternoon', 'evening'];
const STEP_SUN: SunLook[] = ['sunrise', 'midday', 'afternoon', 'sunset'];
const STEP_NAME = ['Morning', 'Midday', 'Afternoon', 'Evening'];
const HOME_FIRST: Record<HelpWith, string> = {
  calm: "What's coming up",
  debt: 'Your debt-free date',
  save: 'Savings goals',
  spending: 'Where it went',
};

type Props = {
  setup: GuestSetup;
  onChange: (next: GuestSetup) => void;
  onBackToWelcome: () => void;
  onDone: (setup: GuestSetup) => void;
};

const HELP: { id: HelpWith; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'calm', title: 'Worry less about money', sub: "A calm view of what's coming", icon: 'leaf-outline' },
  { id: 'debt', title: 'Pay off debt', sub: 'A plan and a debt-free date', icon: 'trending-down-outline' },
  { id: 'save', title: 'Save for something', sub: 'A trip, a gadget, an emergency fund', icon: 'wallet-outline' },
  { id: 'spending', title: 'See where my money goes', sub: 'Spending by category', icon: 'pie-chart-outline' },
];

// Version 2.2 (approved L2, Cath 2026-10-21): "Swipe to see how Home changes". The same
// Left to spend card as Home, three ways; swiping to one tints this whole screen in it.
const SAMPLES: { mood: LeftToSpendMood; amount: string; left: number; perDay: string; title: string; sub: string }[] = [
  { mood: 'good', amount: '₱8,420', left: 0.6, perDay: '₱700 a day', title: 'Plenty left', sub: 'Green, as usual' },
  { mood: 'low', amount: '₱1,200', left: 0.18, perDay: '₱100 a day', title: 'Running low', sub: 'Turns warm orange' },
  { mood: 'over', amount: '−₱650', left: 0, perDay: '', title: 'Over budget', sub: 'Soft rose' },
];

function MoodSamples({ index, onIndex, isDark }: { index: number; onIndex: (i: number) => void; isDark: boolean }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const gap = 12;
  const cardW = Math.max(0, width - 28); // the next card peeks in
  const step = cardW + gap;
  const cur = SAMPLES[index];
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: colors.inkDim, marginBottom: 8, marginLeft: 4 }}>SWIPE TO SEE HOW HOME CHANGES</Text>
      {width > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={step}
          decelerationRate="fast"
          disableIntervalMomentum
          onScroll={(e) => {
            const i = Math.max(0, Math.min(SAMPLES.length - 1, Math.round(e.nativeEvent.contentOffset.x / step)));
            if (i !== index) {
              hapticSelection();
              onIndex(i);
            }
          }}
          scrollEventThrottle={32}
          contentContainerStyle={{ gap, paddingRight: 28 - gap }}
          testID="guest-mood-samples"
        >
          {SAMPLES.map((m) => {
            const bg = m.mood === 'good' ? colors.cardTealEnd : HERO_CARD[m.mood][isDark ? 'dark' : 'light'];
            const dim = m.mood === 'good' ? colors.cardTealTextDim : 'rgba(255,255,255,0.92)';
            const fill = m.mood === 'good' ? colors.mintAccent : '#FFFFFF';
            return (
              <View key={m.mood} style={{ width: cardW, borderRadius: 20, padding: 18, backgroundColor: bg }} accessibilityLabel={`${m.title}: left to spend ${m.amount}`}>
                <GradientFill kind="solid" color={bg} strength={0.26} radius={20} />
                <Text style={{ fontSize: 15, color: dim }}>Left to spend</Text>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>{m.amount}</Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 12, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.round(m.left * 100)}%`, height: '100%', backgroundColor: fill, borderRadius: 3 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  <Text style={{ fontSize: 14, color: dim }}>12 days to payday</Text>
                  {!!m.perDay && <Text style={{ fontSize: 14, color: dim }}>{m.perDay}</Text>}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, marginHorizontal: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{cur.title}</Text>
        <Text style={{ fontSize: 14, color: colors.inkDim }}>{cur.sub}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {SAMPLES.map((m, i) => (
          <View key={m.mood} style={{ height: 6, width: i === index ? 18 : 6, borderRadius: 3, backgroundColor: i === index ? colors.gold : colors.navy4 }} />
        ))}
      </View>
    </View>
  );
}

export default function GuestSetupScreen({ setup, onChange, onBackToWelcome, onDone }: Props) {
  const { colors, mode, setMode, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const s = makeStyles(colors);
  const first = setup.name.trim().split(' ')[0];
  // The background follows the Falling leaves switch straight away (before anything is saved),
  // and (2.2, approved L2) the whole screen takes the colours of the mood sample on show.
  const [sample, setSample] = useState(0);
  const sampleMood: LeftToSpendMood = step === 3 && setup.moodColors ? SAMPLES[sample].mood : 'good';
  useEffect(() => {
    setLookPreview({ fallingLeaves: setup.fallingLeaves, mood: sampleMood });
  }, [setup.fallingLeaves, sampleMood]);
  useEffect(() => () => setLookPreview({}), []);

  function back() {
    if (step === 1) onBackToWelcome();
    else setStep((n) => (n - 1) as 1 | 2 | 3 | 4);
  }
  // See my Home: a moment of "You're all set" (FINALE_MS), then Home.
  const [finishing, setFinishing] = useState(false);
  const reduceAll = useReduceMotion();
  function next() {
    if (step < 4) setStep((n) => (n + 1) as 1 | 2 | 3 | 4);
    else if (!finishing) {
      setFinishing(true);
      setTimeout(() => onDone(setup), reduceAll ? FINALE_MS / 2 : FINALE_MS);
    }
  }
  const canContinue = step === 1 ? setup.name.trim().length > 0 : step === 4 ? setup.othersUsePhone !== null : true;

  return (
    <View style={[s.container, { paddingTop: insets.top + 8 }]}>
      {/* 2026-10-31 (Cath, mockup O3a + S1-S4): the welcome's look. Home's sky moves through
          the day as you go, the logo draws itself, and the sun on its arc shows the step. */}
      <SkyFade phase={STEP_SKY[step - 1]} />
      <View style={s.header}>
        <TouchableOpacity onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6} style={s.backBtn} testID="guest-back">
          <Ionicons name="chevron-back" size={26} color={colors.gold} />
        </TouchableOpacity>
        <DrawingLogo width={52} drawing={false} once />
        <SunArc
          width={300}
          radius={200}
          sweep={38}
          orb={28}
          at={(step - 1) / 3}
          look={STEP_SUN[step - 1]}
          current={step - 1}
          stops={[0, 1, 2, 3].map((i) => ({ at: i / 3, label: `Step ${i + 1} of 4` }))}
        />
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkDim }}>{step} of 4 · {STEP_NAME[step - 1]}</Text>
      </View>

      {/* Smoothness 2026-10-23 (Cath): each step slides like opening a page. */}
      <StepSlide stepKey={String(step)} order={step}>
      <KeyboardAwareScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <View style={[s.card, s.greetCard]} accessibilityLabel={`Home will greet you: Good morning, ${first || 'your name'}`}>
              <LinearGradient
                colors={isDark ? ['rgba(94,85,48,0.9)', 'rgba(58,52,36,0.35)', 'rgba(58,52,36,0)'] : ['rgba(246,226,174,0.95)', 'rgba(243,217,210,0.45)', 'rgba(243,217,210,0)']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[s.datePill, { color: colors.inkDim, backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)' }]}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View style={s.initial}>
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{first ? first[0].toUpperCase() : '?'}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 15, color: colors.inkDim, marginTop: 16 }}>Good morning,</Text>
              <Text style={{ fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{first || '…'}</Text>
              <Text style={{ fontSize: 13, color: colors.inkDim, marginTop: 2 }}>This is how Home will greet you</Text>
            </View>
            <Text style={[s.title, { color: colors.ink }]}>What should we call you?</Text>
            <View style={s.card}>
              <GradientFill match={s.card} />
              <View style={s.row}>
                <Text style={[s.rowLabel, { color: colors.ink }]}>Name</Text>
                <TextInput
                  autoFocus
                  value={setup.name}
                  onChangeText={(name) => onChange({ ...setup, name: name.slice(0, 30) })}
                  placeholder="e.g. Cath"
                  placeholderTextColor={colors.inkFaint}
                  style={[s.input, { color: colors.ink }]}
                  returnKeyType="next"
                  onSubmitEditing={() => canContinue && next()}
                  testID="guest-name"
                />
              </View>
            </View>
            <Text style={[s.footnote, { color: colors.inkDim }]}>Home greets you with this. You can change it anytime.</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[s.title, { color: colors.ink }]}>What do you want help with?</Text>
            <Text style={[s.sub, { color: colors.inkDim }]}>Pick any{first ? `, ${first}` : ''}. Home shows these first.</Text>
            <View style={s.card}>
              <GradientFill match={s.card} />
              {HELP.map((h, i) => {
                const on = setup.helpWith.includes(h.id);
                return (
                  <TouchableOpacity
                    key={h.id}
                    onPress={() => {
                      hapticSelection();
                      onChange({ ...setup, helpWith: on ? setup.helpWith.filter((x) => x !== h.id) : [...setup.helpWith, h.id] });
                    }}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[s.choice, i > 0 && { borderTopWidth: 1, borderTopColor: colors.navy4 }]}
                  >
                    <View style={[s.choiceIcon, { backgroundColor: colors.accentTint }]}>
                      <Ionicons name={h.icon} size={20} color={colors.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{h.title}</Text>
                      <Text style={{ fontSize: 14, color: colors.inkDim }}>{h.sub}</Text>
                    </View>
                    <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.gold : colors.inkFaint} />
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.groupHead, { color: colors.inkDim }]}>{setup.helpWith.length ? 'HOME WILL SHOW FIRST' : 'PICK ONE TO SEE WHAT HOME SHOWS'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, minHeight: 36 }}>
              {setup.helpWith.map((id) => (
                <Pop key={id}>
                  <Text style={[s.chip, { color: colors.ink, backgroundColor: colors.navy3 }]}>{HOME_FIRST[id]}</Text>
                </Pop>
              ))}
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[s.title, { color: colors.ink }]}>Make it feel like yours</Text>
            {/* Smoothness rule (10-23): the highlight glides (shared SegmentedControl, haptic tick). */}
            <SegmentedControl<'light' | 'dark' | 'auto' | 'device'>
              accessibilityLabel="Look"
              options={[
                { id: 'light', label: 'Light', testID: 'guest-look-light' },
                { id: 'dark', label: 'Dark', testID: 'guest-look-dark' },
                { id: 'auto', label: 'Day & night', testID: 'guest-look-auto' },
                { id: 'device', label: 'Device', testID: 'guest-look-device' },
              ]}
              value={mode}
              onChange={(v) => setMode(v)}
            />
            {mode === 'auto' && <Text style={[s.footnote, { color: colors.inkDim, marginTop: -6 }]}>Light by day, dark from sunset to sunrise.</Text>}
            <View style={s.card}>
              <GradientFill match={s.card} />
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, color: colors.ink }}>Falling leaves</Text>
                  <Text style={{ fontSize: 14, color: colors.inkDim }}>A gentle touch in the background</Text>
                </View>
                <AppSwitch value={setup.fallingLeaves} onValueChange={(v) => onChange({ ...setup, fallingLeaves: v })} trackColor={{ true: colors.buttonFill, false: colors.navy4 }} />
              </View>
              <View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.navy4 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, color: colors.ink }}>Mood colours</Text>
                  <Text style={{ fontSize: 14, color: colors.inkDim }}>Colours follow how much is left to spend</Text>
                </View>
                <AppSwitch value={setup.moodColors} onValueChange={(v) => onChange({ ...setup, moodColors: v })} trackColor={{ true: colors.buttonFill, false: colors.navy4 }} />
              </View>
            </View>
            {setup.moodColors && <MoodSamples index={sample} onIndex={setSample} isDark={isDark} />}
            <Text style={[s.footnote, { color: colors.inkDim }]}>You can change these anytime in Settings.</Text>
          </>
        )}

        {step === 4 && (
          <>
            <LockPicture locked={setup.othersUsePhone} />
            <Text style={[s.title, { color: colors.ink }]}>Does anyone else use your phone?</Text>
            <Text style={[s.sub, { color: colors.inkDim }]}>Family, kids playing games, a partner borrowing it.</Text>
            {(
              [
                [true, 'Yes, sometimes', 'Lock when I leave the app. Open with fingerprint or PIN.', 'lock-closed-outline'],
                [false, 'No, just me', 'Open straight away. A lock can be added later.', 'lock-open-outline'],
              ] as const
            ).map(([value, title, sub, icon]) => {
              const on = setup.othersUsePhone === value;
              return (
                <TouchableOpacity
                  key={title}
                  testID={value ? 'guest-phone-yes' : 'guest-phone-no'}
                  onPress={() => {
                    hapticSelection();
                    onChange({ ...setup, othersUsePhone: value });
                  }}
                  style={[s.option, { borderColor: on ? colors.gold : 'transparent' }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <GradientFill match={s.option} />
                  <View style={[s.choiceIcon, { backgroundColor: colors.accentTint }]}>
                    <Ionicons name={icon} size={20} color={colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{title}</Text>
                    <Text style={{ fontSize: 14, color: colors.inkDim }}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </KeyboardAwareScrollView>
      </StepSlide>

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
        <TouchableOpacity
          onPress={next}
          disabled={!canContinue}
          style={[s.primary, { backgroundColor: colors.buttonFill, opacity: canContinue ? 1 : 0.4 }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          testID="guest-continue"
        >
          <Text style={[s.primaryText, { color: colors.onButton }]}>{step === 4 ? 'See my Home' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
      {finishing && <AllSet name={first} />}
    </View>
  );
}

// A chip or row that pops in when it appears.
function Pop({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return v.setValue(1);
    Animated.timing(v, { toValue: 1, duration: PAGE_OPEN_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [v, reduce]);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>{children}</Animated.View>;
}

// S4: a lock that closes (Yes, with a soft pulse, like it's guarding) or swings open (No).
function LockPicture({ locked }: { locked: boolean | null }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const open = useRef(new Animated.Value(locked === false ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const to = locked === false ? 1 : 0;
    if (reduce) return open.setValue(to);
    Animated.spring(open, { toValue: to, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
  }, [locked, open, reduce]);
  useEffect(() => {
    if (reduce || locked !== true) return pulse.setValue(0);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: VOICE_PULSE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [locked, pulse, reduce]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 104 }} accessible accessibilityLabel={locked === true ? 'Locked' : locked === false ? 'Open' : 'A lock'}>
      <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: colors.gold, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.35] }) }] }}
        />
        <View style={{ width: 40, height: 46, alignItems: 'center' }}>
          <Animated.View
            style={{
              width: 24,
              height: 22,
              borderWidth: 3.5,
              borderBottomWidth: 0,
              borderColor: colors.gold,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              transform: [
                { translateX: open.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
                { translateY: open.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
                { rotate: open.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-28deg'] }) },
              ],
            }}
          />
          <View style={{ width: 36, height: 26, borderRadius: 7, borderWidth: 3.5, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 3.5, height: 8, borderRadius: 2, backgroundColor: colors.gold }} />
          </View>
        </View>
      </View>
    </View>
  );
}

// "You're all set": the green opening screen, the logo drawing itself, then Home.
function AllSet({ name }: { name: string }) {
  const words = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return words.setValue(1);
    Animated.timing(words, { toValue: 1, duration: PAGE_OPEN_MS, delay: 1200, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
  }, [words, reduce]);
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <LinearGradient colors={['#21503B', '#0E2419']} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <DrawingLogo width={120} drawing={false} once color="#F3EBD8" />
        <Animated.View style={{ alignItems: 'center', marginTop: 32, opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF' }} accessibilityRole="header">{`You're all set${name ? `, ${name}` : ''}!`}</Text>
          <Text style={{ fontSize: 17, color: '#BFD3C8', marginTop: 6 }}>Small steps. Bigger dreams.</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    header: { alignItems: 'center', paddingHorizontal: 24 },
    backBtn: { position: 'absolute', left: 12, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    link: { fontSize: 17, fontWeight: '600', paddingVertical: 8 },
    scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 14 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.2 },
    sub: { fontSize: 17, lineHeight: 24, marginTop: -4 },
    footnote: { fontSize: 14, lineHeight: 19, marginHorizontal: 6 },
    card: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.navy3 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
    rowLabel: { fontSize: 17, width: 70 },
    input: { flex: 1, fontSize: 17, textAlign: 'right', paddingVertical: 2 },
    choice: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
    choiceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    segment: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: 2, overflow: 'hidden', backgroundColor: colors.navy3 },
    primary: { borderRadius: 28, paddingVertical: 17, alignItems: 'center' },
    primaryText: { fontSize: 17, fontWeight: '700' },
    greetCard: { padding: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    datePill: { fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
    initial: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1B3F30', alignItems: 'center', justifyContent: 'center' },
    groupHead: { fontSize: 13, letterSpacing: 0.3, marginTop: 8, marginLeft: 6 },
    chip: { fontSize: 15, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: 'hidden' },
  });
}
