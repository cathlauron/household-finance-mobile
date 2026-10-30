import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Linking, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from '../components/Tap';
import { Text, TextInput } from '../components/AppText';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { SettingsGroup, PlainRow } from '../components/SettingsHub';
import { useTheme } from '../ThemeContext';
import { animateNextLayout } from '../animateLayout';
import { hapticSelection } from '../haptics';
import { FAQ, searchFaq } from '../helpFaq';
import { SUPPORT_EMAIL, supportMailto } from '../support';
import { APP_VERSION } from '../appVersion';
import type { ThemeColors } from '../theme';

// Mockup H1 (Cath, 2026-10-29): Help & FAQ. Grouped questions that open in place (the rows
// below glide, the answer fades in), a search box on top, "Still stuck?" at the bottom.
// The same list is the support web page the app stores link to (src/helpFaq.ts).

export default function HelpFaqScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => searchFaq(FAQ, search), [search]);

  function toggle(q: string) {
    hapticSelection();
    animateNextLayout();
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }

  function changeSearch(v: string) {
    animateNextLayout();
    setSearch(v);
  }

  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.field}>
        <Ionicons name="search" size={18} color={colors.inkDim} />
        <TextInput
          testID="help-search"
          style={s.input}
          placeholder="Search help"
          placeholderTextColor={colors.inkFaint}
          value={search}
          onChangeText={changeSearch}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search help"
        />
        {!!search && (
          <TouchableOpacity onPress={() => changeSearch('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        )}
      </View>

      {groups.map((g) => (
        <SettingsGroup key={g.title} label={g.title} plain>
          {g.items.map((item) => {
            const isOpen = open.has(item.q);
            return (
              <View key={item.q}>
                <TouchableOpacity
                  testID={`help-q-${item.q}`}
                  activeOpacity={0.7}
                  onPress={() => toggle(item.q)}
                  style={s.qRow}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text style={s.q}>{item.q}</Text>
                  <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={17} color={colors.inkFaint} />
                </TouchableOpacity>
                {isOpen && <Text testID={`help-a-${item.q}`} style={s.a}>{item.a}</Text>}
              </View>
            );
          })}
        </SettingsGroup>
      ))}

      {groups.length === 0 && (
        <Text testID="help-none" style={s.none}>No answers match that. Try another word, or write to us below.</Text>
      )}

      <SettingsGroup label="Still stuck?" plain footer="We usually reply within 2 days. Never send your password or your Recovery Key, not even to us.">
        <PlainRow
          testID="help-contact"
          title="Contact support"
          sub={SUPPORT_EMAIL}
          onPress={() => {
            Linking.openURL(supportMailto(APP_VERSION, Platform.OS)).catch(() =>
              Alert.alert('No email app found', `Write to ${SUPPORT_EMAIL}.`)
            );
          }}
        />
      </SettingsGroup>
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    field: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, marginBottom: 20 },
    input: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 8 },
    qRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 12, paddingHorizontal: 16 },
    q: { flex: 1, fontSize: 17, color: colors.ink },
    a: { fontSize: 15, lineHeight: 21, color: colors.inkDim, paddingHorizontal: 16, paddingBottom: 14, marginTop: -4 },
    none: { fontSize: 15, color: colors.inkDim, textAlign: 'center', marginHorizontal: 24, marginBottom: 24 },
  });
}
