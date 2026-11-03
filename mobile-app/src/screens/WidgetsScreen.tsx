import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from '../components/Tap';
import { Text } from '../components/AppText';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { SettingsGroup } from '../components/SettingsHub';
import { useTheme } from '../ThemeContext';
import { hapticSelection } from '../haptics';
import { showSaved } from '../components/SavedToast';
// Only the type from the drawings file: loading it would load the widget library (not in Expo Go).
import type { WidgetName } from '../widgets/FFWidgets';
import { pinWidget, widgetsOnHomeScreen } from '../widgets/pinWidget';

// Settings › Widgets (Cath, 2026-11-03, mockup W1): "I find it hard to locate the widgets from my
// phone". Each widget has an Add button that asks the phone to put it on the home screen (the
// phone shows its own "Add to home screen?" box). Coming back to the app, widgets that are really
// on the home screen say so.

const WIDGET_NAMES: readonly WidgetName[] = ['LeftToSpend', 'SayIt', 'SpendSay', 'DueSoon', 'Month', 'Trip'];
const HERO = { from: '#2C5E48', to: '#122B21' }; // the widgets' green (FFWidgets widgetColours('good'))

const INFO: Record<WidgetName, { title: string; sub: string; short: string; look: 'hero' | 'paper' | 'trip' }> = {
  LeftToSpend: { title: 'Left to spend', sub: 'Small · your number and days to payday', short: 'LTS', look: 'hero' },
  SayIt: { title: 'Say it', sub: 'Small · one tap to speak', short: 'MIC', look: 'paper' },
  SpendSay: { title: 'Spend & say', sub: 'Medium · number, week line, Say it, Add', short: 'S&S', look: 'hero' },
  DueSoon: { title: 'Due soon', sub: 'Medium · your next bills', short: 'DUE', look: 'paper' },
  Month: { title: 'Month at a glance', sub: 'Large · budgets and bills', short: 'MON', look: 'paper' },
  Trip: { title: 'Trip', sub: 'Medium · while a trip is on', short: 'TRIP', look: 'trip' },
};

export default function WidgetsScreen() {
  const { colors } = useTheme();
  const [placed, setPlaced] = useState<Set<WidgetName>>(new Set());
  const refresh = useCallback(() => {
    widgetsOnHomeScreen(WIDGET_NAMES).then(setPlaced).catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  async function add(name: WidgetName) {
    hapticSelection();
    const asked = await pinWidget(name);
    if (!asked) showSaved("This phone can't add it from here. Hold your home screen › Widgets › Finance Flow.", 'information-circle-outline');
    // The phone's box takes over; when you come back, the list is checked again.
    setTimeout(refresh, 1500);
  }

  const hero = HERO;
  const s = makeStyles(colors);
  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={s.content}>
      <Text style={[s.intro, { color: colors.inkDim }]}>Tap Add and your phone puts it on your home screen.</Text>
      <SettingsGroup footer="Some phones ask you to hold and drag it into place. You can also add them the usual way: hold an empty spot on your home screen › Widgets › Finance Flow.">
        {WIDGET_NAMES.map((name) => {
          const w = INFO[name];
          const on = placed.has(name);
          return (
            <View key={name} style={s.row}>
              {w.look === 'paper' ? (
                <View style={[s.thumb, { backgroundColor: '#F1F7F3', borderWidth: 1, borderColor: '#E6F0EA' }]}>
                  <Text style={[s.thumbText, { color: '#2E6B47' }]}>{w.short}</Text>
                </View>
              ) : (
                <LinearGradient colors={w.look === 'trip' ? ['#5C8DE8', '#1D3C86'] : [hero.from, hero.to]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={s.thumb}>
                  <Text style={[s.thumbText, { color: '#FFFFFF' }]}>{w.short}</Text>
                </LinearGradient>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: colors.ink }}>{w.title}</Text>
                <Text style={{ fontSize: 13, color: colors.inkDim }}>{on ? 'On your home screen' : w.sub}</Text>
              </View>
              <TouchableOpacity
                onPress={() => add(name)}
                accessibilityRole="button"
                accessibilityLabel={on ? `Add another ${w.title} to your home screen` : `Add ${w.title} to your home screen`}
                testID={`widget-add-${name}`}
                style={[s.add, { backgroundColor: colors.accentTint }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gold }}>{on ? 'Add again' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </SettingsGroup>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(_colors: any) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    intro: { fontSize: 15, marginHorizontal: 4, marginBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 8 },
    thumb: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    thumbText: { fontSize: 9, fontWeight: '800' },
    add: { minHeight: 36, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  });
}
