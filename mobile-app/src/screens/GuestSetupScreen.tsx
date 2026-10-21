import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { CARD as HERO_CARD } from '../components/HomeHero';
import type { LeftToSpendMood } from '../balanceProjection';
import { setLookPreview } from '../lookPreview';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../components/AppText';
import SkyGlow from '../components/SkyGlow';
import GradientFill from '../components/GradientFill';
import AppSwitch from '../components/AppSwitch';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import type { GuestSetup, HelpWith } from '../guest';

// Version 3 (approved Option B, canvas B2-B5): four short questions before Home, all
// before any account exists. Only these answers are kept on the phone.

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
  function next() {
    if (step < 4) setStep((n) => (n + 1) as 1 | 2 | 3 | 4);
    else onDone(setup);
  }
  const canContinue = step === 1 ? setup.name.trim().length > 0 : step === 4 ? setup.othersUsePhone !== null : true;

  return (
    <View style={[s.container, { paddingTop: insets.top + 16 }]}>
      <SkyGlow />
      <View style={s.topRow}>
        <TouchableOpacity onPress={back} accessibilityRole="button" hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={colors.gold} style={{ marginLeft: -6 }} />
          <Text style={[s.link, { color: colors.gold }]}>Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 13, color: colors.inkDim }}>{step} of 4</Text>
      </View>

      <KeyboardAwareScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
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
          </>
        )}

        {step === 3 && (
          <>
            <Text style={[s.title, { color: colors.ink }]}>Make it feel like yours</Text>
            <View style={[s.segment, { backgroundColor: colors.navy4 }]}>
              {(
                [
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                  ['device', 'Device'],
                ] as const
              ).map(([id, label]) => (
                <TouchableOpacity
                  key={id}
                  onPress={() => setMode(id)}
                  style={[s.segmentItem, mode === id && { backgroundColor: colors.navy3 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === id }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: mode === id ? colors.ink : colors.inkDim }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
                  onPress={() => onChange({ ...setup, othersUsePhone: value })}
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
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
    link: { fontSize: 17, fontWeight: '600', paddingVertical: 8 },
    scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 14 },
    title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.3 },
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
  });
}
