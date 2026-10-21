import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/AppText';
import LogoMark from '../components/LogoMark';
import SkyGlow from '../components/SkyGlow';
import GradientFill from '../components/GradientFill';
import { useTheme } from '../ThemeContext';

// Version 3 (approved Option B, canvas B1 / B1b / B1c): three welcome screens you can
// swipe through. Logo top-left, Skip top-right (lined up with Back on the next screens),
// a small picture of what each screen promises, then Next / Get started.

type Props = {
  onStart: () => void;
  onSignIn: () => void;
};

const SLIDES = [
  { title: "Know what's left to spend", body: 'See at a glance how much you can still spend until payday.' },
  { title: 'Never miss a bill', body: 'Friendly reminders before each bill is due, so nothing slips.' },
  { title: 'Private by design', body: "Your money details are locked on your phone before they're saved." },
];

export default function WelcomeScreen({ onStart, onSignIn }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const s = makeStyles(colors);
  const last = index === SLIDES.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }
  function next() {
    if (last) return onStart();
    scroller.current?.scrollTo({ x: width * (index + 1), animated: true });
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <SkyGlow />
      <View style={s.topRow}>
        <View style={s.brand} accessibilityRole="image" accessibilityLabel="Finance Flow">
          <LogoMark width={40} wordmark={false} />
          <Text style={[s.wordmark, { color: colors.gold }]}>FINANCE FLOW</Text>
        </View>
        <TouchableOpacity onPress={onStart} accessibilityRole="button" hitSlop={10} testID="welcome-skip">
          <Text style={[s.link, { color: colors.gold }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={{ width, paddingHorizontal: 28 }}>
            <View style={s.pictureArea}>{i === 0 ? <LeftCard /> : i === 1 ? <BillsCard /> : <PrivateCard />}</View>
            <Text style={[s.title, { color: colors.ink }]}>{slide.title}</Text>
            <Text style={[s.body, { color: colors.inkDim }]}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 28 }}>
        <View style={s.dots} accessibilityLabel={`Screen ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[s.dot, { width: i === index ? 24 : 8, backgroundColor: i === index ? colors.gold : colors.accentTint }]} />
          ))}
        </View>
        <TouchableOpacity onPress={next} style={[s.primary, { backgroundColor: colors.buttonFill }]} accessibilityRole="button" testID="welcome-next">
          <Text style={[s.primaryText, { color: colors.onButton }]}>{last ? 'Get started' : 'Next'}</Text>
        </TouchableOpacity>
        <Text style={[s.signInLine, { color: colors.inkDim }]}>
          Already using Finance Flow?{' '}
          <Text onPress={onSignIn} style={{ color: colors.gold, fontWeight: '700' }} accessibilityRole="link">
            Sign in
          </Text>
        </Text>
      </View>
    </View>
  );
}

// ---- The three small pictures ----
const DARK_GREEN = ['#557165', '#1c4130', '#123024'] as const;

function LeftCard() {
  return (
    <LinearGradient colors={DARK_GREEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.55, 1]} style={pic.leftCard}>
      <Text style={pic.leftLabel}>Left to spend</Text>
      <Text style={pic.leftAmount}>₱8,420</Text>
      <View style={pic.track}>
        <View style={pic.fill} />
      </View>
      <View style={pic.leftFoot}>
        <Text style={pic.leftFootText}>12 days to payday</Text>
        <Text style={pic.leftFootText}>₱700 a day</Text>
      </View>
    </LinearGradient>
  );
}

function BillsCard() {
  const { colors } = useTheme();
  const rows = [
    { name: 'Meralco', sub: 'Due in 2 days', amount: '₱2,350', dot: '#e0a33a' },
    { name: 'Internet', sub: 'Due Friday', amount: '₱1,699', dot: '#9fb8a8' },
    { name: 'Rent', sub: 'Due on the 1st', amount: 'Paid', dot: '#9fb8a8', paid: true },
  ];
  return (
    <View style={{ width: 310, gap: 12 }}>
      <View style={[pic.reminder, { backgroundColor: colors.navy3 }]}>
        <Ionicons name="notifications-outline" size={18} color={colors.gold} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>Meralco is due in 2 days</Text>
      </View>
      <View style={pic.listCard}>
        <GradientFill match={pic.listCard} />
        <Text style={[pic.listHead, { color: colors.inkDim }]}>DUE SOON</Text>
        {rows.map((r, i) => (
          <View key={r.name} style={[pic.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.navy4 }]}>
            <View style={[pic.rowDot, { backgroundColor: r.dot }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{r.name}</Text>
              <Text style={{ fontSize: 13, color: colors.inkDim }}>{r.sub}</Text>
            </View>
            {r.paid ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark" size={16} color={colors.gold} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.gold }}>Paid</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{r.amount}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function PrivateCard() {
  const { colors } = useTheme();
  const ticks = ['Locked with your password', 'Only your household can read it', 'No ads, nothing sold'];
  return (
    <View style={{ width: 300, alignItems: 'center', gap: 22 }}>
      <View>
        <LinearGradient colors={DARK_GREEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.55, 1]} style={pic.logoTile}>
          <LogoMark width={58} color="#FFFFFF" wordmark={false} />
        </LinearGradient>
        <View style={[pic.lockBadge, { backgroundColor: colors.navy3 }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.gold} />
        </View>
      </View>
      <View style={[pic.listCard, { width: '100%' }]}>
        <GradientFill match={pic.listCard} />
        {ticks.map((t, i) => (
          <View key={t} style={[pic.row, i < ticks.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.navy4 }]}>
            <View style={[pic.tick, { backgroundColor: colors.accentTint }]}>
              <Ionicons name="checkmark" size={15} color={colors.gold} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pic = StyleSheet.create({
  leftCard: { width: 300, borderRadius: 26, padding: 22, transform: [{ rotate: '-2deg' }] },
  leftLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  leftAmount: { fontSize: 40, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 16, overflow: 'hidden' },
  fill: { width: '62%', height: '100%', borderRadius: 4, backgroundColor: '#34d399' },
  leftFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  leftFootText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  reminder: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 14, transform: [{ rotate: '1.5deg' }] },
  listCard: { borderRadius: 22, overflow: 'hidden' },
  listHead: { fontSize: 13, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
  logoTile: { width: 112, height: 112, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { position: 'absolute', right: -10, bottom: -10, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  tick: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 28 },
    brand: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: -7 },
    wordmark: { fontSize: 13, lineHeight: 13, fontWeight: '700', letterSpacing: 3, marginBottom: -1 },
    link: { fontSize: 17, fontWeight: '600', paddingVertical: 8 },
    pictureArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
    title: { fontSize: 32, lineHeight: 38, fontWeight: '600', letterSpacing: -0.3 },
    body: { fontSize: 18, lineHeight: 26, marginTop: 12, marginBottom: 8 },
    dots: { flexDirection: 'row', gap: 8, marginVertical: 24 },
    dot: { height: 8, borderRadius: 4 },
    primary: { borderRadius: 28, paddingVertical: 17, alignItems: 'center' },
    primaryText: { fontSize: 17, fontWeight: '700' },
    signInLine: { fontSize: 15, textAlign: 'center', marginTop: 16 },
  });
}
