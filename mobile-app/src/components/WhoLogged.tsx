// Version 2.2 (canvas W1 B + W2, Cath 2026-10-21: on every applicable screen): in a shared
// household, who logged an entry. Same look as Transactions:
//  - WhoBadge: a small letter on the entry's icon, only when someone ELSE logged it.
//  - WhoFootnote: "Added by Ana · Oct 20, 3:41 PM" / "Changed by you · today, 9:02 AM"
//    at the bottom of the entry's own page.
//  - useWho().by(name): " · by Ana" for entries inside a list (payments, paydays, savings
//    moves, trip items), again only when someone else logged it.
// Nothing shows outside a shared household. Entries made before 2.2 have no name.
import React from 'react';
import { dateText } from '../dateUtils';
import { View, Text, StyleSheet } from 'react-native';
import { useData } from '../DataContext';
import { useTheme } from '../ThemeContext';

export function useWho() {
  const { isLinked, username } = useData();
  const others = (name?: string): name is string => !!isLinked && !!name && name !== username;
  const nameOf = (u: string) => (u === username ? 'you' : u.charAt(0).toUpperCase() + u.slice(1));
  const by = (name?: string) => (others(name) ? ` · by ${nameOf(name)}` : '');
  return { shown: !!isLinked, others, nameOf, by };
}

function when(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString()
    ? ` · today, ${time}`
    : ` · ${dateText(d)}, ${time}`;
}

// Put inside the icon's own View (that View must not clip: no overflow 'hidden').
export function WhoBadge({ by }: { by?: string }) {
  const { colors } = useTheme();
  const { others } = useWho();
  if (!others(by)) return null;
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.navy3, borderColor: colors.navy3 }]}
      accessibilityLabel={`Logged by ${by}`}
    >
      <Text style={[styles.letter, { color: (colors as any).indigo ?? colors.inkDim }]}>{by.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

export function WhoFootnote({ addedBy, createdAt, changedBy, changedAt, style }: { addedBy?: string; createdAt?: number; changedBy?: string; changedAt?: number; style?: object }) {
  const { colors } = useTheme();
  const { shown, nameOf } = useWho();
  if (!shown || (!addedBy && !changedBy)) return null;
  const line = { fontSize: 13, color: (colors as any).inkFaint ?? colors.inkDim, marginTop: 2 };
  return (
    <View style={[{ marginTop: 16, alignItems: 'center' }, style]}>
      {!!addedBy && <Text style={line}>{`Added by ${nameOf(addedBy)}${when(createdAt)}`}</Text>}
      {!!changedBy && <Text style={line}>{`Changed by ${nameOf(changedBy)}${when(changedAt)}`}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  // 2.2 (approved P2): 18-point circle with an 11-point letter (was 15 / 9), easier to read.
  badge: { position: 'absolute', right: -5, bottom: -5, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, elevation: 1 },
  letter: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
});
