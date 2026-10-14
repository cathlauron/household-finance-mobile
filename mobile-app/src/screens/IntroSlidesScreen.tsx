import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/AppText';
import LogoMark from '../components/LogoMark';
import GradientFill from '../components/GradientFill';
import { useTheme } from '../ThemeContext';

// Redesign: the Welcome screen from the Finance Flow mockups (it replaces the three
// intro slides). Get started creates a profile; "I already have an account" signs in.

type Props = {
  onDone: () => void;
  onBack?: () => void;
  onSignIn?: () => void;
};

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'speedometer-outline', title: "Know what's left to spend", body: 'One number that updates as you go.' },
  { icon: 'receipt-outline', title: 'Never miss a bill', body: 'Reminders before anything is due.' },
  { icon: 'shield-checkmark-outline', title: 'Private by design', body: 'Encrypted, and shared only with your household.' },
];

export default function IntroSlidesScreen({ onDone, onBack, onSignIn }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const signIn = onSignIn ?? onBack;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }} bounces={false}>
        <View style={{ alignItems: 'center' }}>
          <LogoMark width={112} />
          <Text style={styles.tagline}>Your household's money, in one calm place.</Text>
        </View>
        <View style={{ marginTop: 44, gap: 22 }}>
          {POINTS.map((p) => (
            <View key={p.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={styles.tile}>
                <GradientFill kind="tint" color={colors.accentTint} radius={8} />
                <Ionicons name={p.icon} size={20} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headline}>{p.title}</Text>
                <Text style={styles.sub}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, gap: 8 }}>
        <TouchableOpacity testID="intro-next-button" style={[styles.primary, { backgroundColor: colors.buttonFill }]} onPress={onDone} accessibilityRole="button">
          <GradientFill color={colors.buttonFill} strength={0.18} />
          <Text style={[styles.primaryText, { color: colors.onButton }]}>Get started</Text>
        </TouchableOpacity>
        {!!signIn && (
          <TouchableOpacity testID="intro-back-button" onPress={signIn} style={{ alignSelf: 'center', paddingVertical: 10 }} accessibilityRole="button">
            <Text style={{ fontSize: 17, color: colors.gold }}>I already have an account</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    tagline: { fontSize: 17, color: colors.inkDim, textAlign: 'center', marginTop: 18 },
    tile: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink },
    sub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    primary: { minHeight: 53, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    primaryText: { fontSize: 17, fontWeight: '600' },
  });
}
