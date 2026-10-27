// Version 2.2 (approved LK1-LK2, Cath 2026-10-21): linking with someone. Both people, what
// each has, two clear choices with the app's own line icons, then a check sheet before
// anything happens. The actual linking is still done by the caller (onChoose), unchanged.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';
import BottomSheet from './BottomSheet';
import type { HouseholdModel } from '../types';

type Choice = 'merge' | 'theirs';

type Counts = { bills: number; debts: number; loans: number; pots: number; accounts: number; trips: number };

function countsOf(m: HouseholdModel | null | undefined): Counts {
  const a = m?.balanceAccounts;
  return {
    bills: m?.bills?.length ?? 0,
    debts: m?.debts?.length ?? 0,
    loans: m?.loans?.length ?? 0,
    pots: m?.savingsGoals?.length ?? 0,
    accounts: (a?.cash?.length ?? 0) + (a?.debit?.length ?? 0) + (a?.credit?.length ?? 0) + (a?.investment?.length ?? 0) + (a?.property?.length ?? 0) + (a?.vehicle?.length ?? 0),
    trips: m?.travel?.length ?? 0,
  };
}

function words(c: Counts): string[] {
  const one = (n: number, w: string, many = `${w}s`) => (n > 0 ? `${n} ${n === 1 ? w : many}` : '');
  return [one(c.bills, 'bill'), one(c.debts, 'debt'), one(c.loans, 'loan'), one(c.pots, 'savings pot'), one(c.accounts, 'account'), one(c.trips, 'trip')].filter(Boolean);
}

const cap = (u: string) => (u ? u.charAt(0).toUpperCase() + u.slice(1) : '');

type Props = {
  me: string;
  them: string;
  myModel: HouseholdModel;
  theirModel: HouseholdModel;
  isInvite: boolean;
  busy: boolean;
  message: string;
  onChoose: (choice: Choice) => void;
};

export default function LinkChoice({ me, them, myModel, theirModel, isInvite, busy, message, onChoose }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [picked, setPicked] = useState<Choice>('merge');
  const [checking, setChecking] = useState(false);
  const theirName = isInvite ? 'the household' : cap(them);
  const mine = countsOf(myModel);
  const theirs = countsOf(theirModel);
  const result: Counts =
    picked === 'merge'
      ? { bills: mine.bills + theirs.bills, debts: mine.debts + theirs.debts, loans: mine.loans + theirs.loans, pots: mine.pots + theirs.pots, accounts: mine.accounts + theirs.accounts, trips: mine.trips + theirs.trips }
      : theirs;
  const resultWords = words(result);

  const options: { id: Choice; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'merge', title: isInvite ? 'Merge mine in' : 'Merge both', sub: 'Everything from both of you, in one place. Nothing is lost.', icon: 'people-outline' },
    {
      id: 'theirs',
      title: isInvite ? 'Keep household data' : `Keep ${cap(them)}'s`,
      sub: `Start from ${isInvite ? "the household's" : `${cap(them)}'s`} money only. What's on your phone now won't be in the shared household.`,
      icon: 'person-outline',
    },
  ];
  const pickedOption = options.find((o) => o.id === picked)!;

  const person = (c: Counts, label: string) => (
    <View style={s.personCard}>
      <GradientFill match={s.personCard} />
      <Text style={s.personName}>{label}</Text>
      <Text style={s.personCounts}>{words(c).join(' · ') || 'Nothing yet'}</Text>
    </View>
  );

  return (
    <View testID="link-choice">
      <View style={s.pair}>
        <View style={[s.avatar, { backgroundColor: colors.gold }]}><Text style={s.avatarText}>{(me || '?').charAt(0).toUpperCase()}</Text></View>
        <Ionicons name="swap-horizontal" size={20} color={colors.gold} />
        <View style={[s.avatar, { backgroundColor: colors.indigo }]}><Text style={s.avatarText}>{(them || '?').charAt(0).toUpperCase()}</Text></View>
      </View>
      <Text style={s.title}>{isInvite ? "You're almost in" : `You and ${cap(them)} are almost linked`}</Text>
      <Text style={s.sub}>Choose what your shared household starts with.</Text>

      <View style={s.people}>
        {person(mine, 'You')}
        {person(theirs, isInvite ? 'Household' : cap(them))}
      </View>

      {options.map((o) => {
        const on = picked === o.id;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => setPicked(o.id)}
            style={[s.option, { borderColor: on ? colors.gold : 'transparent' }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            testID={`link-choice-${o.id}`}
            disabled={busy}
          >
            <GradientFill match={s.option} />
            <View style={[s.icon, { backgroundColor: colors.accentTint }]}>
              <Ionicons name={o.icon} size={21} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.optTitle}>{o.title}</Text>
                {o.id === 'merge' && <Text style={[s.tag, { color: colors.gold, backgroundColor: colors.accentTint }]}>Suggested</Text>}
              </View>
              <Text style={s.optSub}>{o.sub}</Text>
            </View>
            <View style={[s.radio, { borderColor: on ? colors.gold : colors.inkFaint }]}>
              {on && <View style={[s.radioDot, { backgroundColor: colors.gold }]} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[s.primary, { backgroundColor: colors.buttonFill, opacity: busy ? 0.6 : 1 }]}
        onPress={() => setChecking(true)}
        disabled={busy}
        accessibilityRole="button"
        testID="link-choice-continue"
      >
        <Text style={[s.primaryText, { color: colors.onButton }]}>{busy ? 'Linking…' : 'Continue'}</Text>
      </TouchableOpacity>
      <Text style={s.foot}>This can't be undone, so check with {isInvite ? 'the household' : theirName} first.</Text>
      {!!message && <Text style={[s.foot, { color: message.startsWith('Linked') ? colors.positive : colors.error, fontWeight: '600' }]}>{message}</Text>}

      <BottomSheet visible={checking} onClose={() => setChecking(false)}>
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
          <View style={[s.bigIcon, { backgroundColor: colors.accentTint }]}>
            <Ionicons name={pickedOption.icon} size={30} color={colors.gold} />
          </View>
          <Text style={[s.title, { marginTop: 12 }]}>{picked === 'merge' ? `${pickedOption.title}${isInvite ? '' : ` with ${cap(them)}`}?` : `${pickedOption.title}?`}</Text>
          <Text style={s.sub}>Your shared household will have:</Text>
          <View style={s.resultBox}>
            <GradientFill match={s.resultBox} />
            <Text style={s.resultText}>{resultWords.length ? resultWords.join(' · ') : 'Nothing yet: a fresh start'}</Text>
          </View>
          <TouchableOpacity
            style={[s.primary, { alignSelf: 'stretch', backgroundColor: colors.buttonFill }]}
            onPress={() => {
              setChecking(false);
              onChoose(picked);
            }}
            accessibilityRole="button"
            testID="link-choice-confirm"
          >
            <Text style={[s.primaryText, { color: colors.onButton }]}>{picked === 'merge' ? 'Merge and link' : 'Keep and link'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setChecking(false)} hitSlop={10} style={{ marginTop: 14, marginBottom: 6 }} accessibilityRole="button">
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gold }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    pair: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 4 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    title: { textAlign: 'center', fontSize: 21, fontWeight: '700', color: colors.ink, marginTop: 10 },
    sub: { textAlign: 'center', fontSize: 14, color: colors.inkDim, marginTop: 2 },
    people: { flexDirection: 'row', gap: 10, marginTop: 16 },
    personCard: { flex: 1, backgroundColor: colors.navy3, borderRadius: 16, padding: 12, alignItems: 'center' },
    personName: { fontSize: 15, fontWeight: '700', color: colors.ink },
    personCounts: { fontSize: 12, color: colors.inkDim, textAlign: 'center', marginTop: 4, lineHeight: 17 },
    option: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.navy3, borderRadius: 16, borderWidth: 2, padding: 14, marginTop: 10 },
    icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    optTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
    optSub: { fontSize: 14, color: colors.inkDim, marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 10, height: 10, borderRadius: 5 },
    primary: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    primaryText: { fontSize: 17, fontWeight: '700' },
    foot: { textAlign: 'center', fontSize: 13, color: colors.inkDim, marginTop: 8 },
    bigIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resultBox: { alignSelf: 'stretch', backgroundColor: colors.navy3, borderRadius: 14, padding: 14, marginTop: 14 },
    resultText: { fontSize: 15, color: colors.ink, lineHeight: 22, textAlign: 'center' },
  });
}
