import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import GradientFill from '../components/GradientFill';
import { formatPeso } from '../balanceProjection';
import { getMyPersonId, setMyPersonId, subscribeToMyPersonId } from '../myPerson';
import { sharedMembers, pairBalances, myNet, personLabel, personIsUsed } from '../sharedExpenses';
import { makeId } from '../utils';
import { hapticLight, hapticSelection } from '../haptics';
import type { ThemeColors } from '../theme';

// Redesign: Shared Expenses (Plan › Shared Expenses), from the Finance Flow mockup.
// Step 1: the people you share costs with (and which one is you), plus the overall
// balance card. Adding expenses, balances, Settle up and the activity list come next.

export default function SharedExpensesScreen() {
  const { colors } = useTheme();
  const { model, saveModel, username } = useData();
  const styles = makeStyles(colors);
  const [myId, setMyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (!username) return;
    getMyPersonId(username).then(setMyId);
    return subscribeToMyPersonId(setMyId);
  }, [username]);

  const members = useMemo(() => (model ? sharedMembers(model) : []), [model]);
  const balances = useMemo(() => (model ? pairBalances(model) : []), [model]);

  if (!model) return null;

  const net = myNet(balances, myId);
  const others = members.filter((p) => p.id !== myId);
  const notYetMembers = model.people.filter((p) => !(model.sharedMembers ?? []).includes(p.id));

  async function addMember(personId: string, peopleNext = model!.people) {
    const ids = [...new Set([...(model!.sharedMembers ?? []), personId])];
    await saveModel({ ...model!, people: peopleNext, sharedMembers: ids });
    hapticLight();
  }

  async function addNewPerson() {
    const name = newName.trim();
    if (!name) return;
    const existing = model!.people.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      await addMember(existing.id);
    } else {
      const person = { id: makeId('person'), name };
      await addMember(person.id, [...model!.people, person]);
    }
    setNewName('');
    setAdding(false);
  }

  function removeMember(personId: string) {
    if (personIsUsed(model!, personId)) {
      Alert.alert("Can't remove yet", 'This person is part of a shared expense or payment. Settle up and remove those first.');
      return;
    }
    Alert.alert(`Remove ${personLabel(model!, personId, null)}?`, 'They will no longer show in Shared Expenses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => saveModel({ ...model!, sharedMembers: (model!.sharedMembers ?? []).filter((id) => id !== personId) }),
      },
    ]);
  }

  async function markMe(personId: string) {
    if (!username) return;
    hapticSelection();
    await setMyPersonId(username, personId);
    if (!(model!.sharedMembers ?? []).includes(personId)) await addMember(personId);
  }

  const netText = !myId ? 'Pick which person is you' : net > 0 ? `You're owed ${formatPeso(net)}` : net < 0 ? `You owe ${formatPeso(-net)}` : "You're all settled up";
  const netColor = net > 0 ? colors.positive : net < 0 ? colors.negative : colors.ink;
  const withText = others.length ? `With ${others.map((p) => p.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}` : 'Add the people you share costs with';

  return (
    <PullToRefreshScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={[styles.group, { padding: 16 }]} />
        <Text style={styles.meta}>Overall</Text>
        <Text style={[styles.net, { color: netColor }]}>{netText}</Text>
        <Text style={styles.meta}>{withText}</Text>
      </View>

      <Text style={styles.header}>People</Text>
      <View style={styles.group}>
        <GradientFill match={styles.group} />
        {members.map((p, i) => {
          const isMe = p.id === myId;
          return (
            <View key={p.id} style={[styles.row, i > 0 && styles.line]}>
              <View style={[styles.avatar, { backgroundColor: isMe ? colors.accentTint : colors.navy2 }]}>
                <Text style={[styles.avatarText, { color: isMe ? colors.gold : colors.inkDim }]}>{p.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.rowTitle} numberOfLines={1}>{p.name}</Text>
              {isMe ? (
                <Text style={[styles.youTag, { color: colors.gold, backgroundColor: colors.accentTint }]}>You</Text>
              ) : (
                <>
                  {!myId && (
                    <TouchableOpacity onPress={() => markMe(p.id)} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.link}>This is me</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeMember(p.id)} accessibilityRole="button" accessibilityLabel={`Remove ${p.name}`} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 12 }}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.inkFaint} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })}
        {adding ? (
          <View style={[styles.addBox, members.length > 0 && styles.line]}>
            {notYetMembers.length > 0 && (
              <View style={styles.chips}>
                {notYetMembers.map((p) => (
                  <TouchableOpacity key={p.id} style={[styles.chip, { backgroundColor: colors.navy2 }]} onPress={() => addMember(p.id)} accessibilityRole="button">
                    <Text style={styles.chipText}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                autoFocus
                style={styles.input}
                placeholder="New person's name"
                placeholderTextColor={colors.inkFaint}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={addNewPerson}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={addNewPerson} accessibilityRole="button" style={[styles.addBtn, { backgroundColor: colors.buttonFill }]}>
                <Text style={{ color: colors.onButton, fontWeight: '700', fontSize: 15 }}>Add</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { setAdding(false); setNewName(''); }} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 10 }}>
              <Text style={[styles.link, { color: colors.inkDim }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.row, members.length > 0 && styles.line]} onPress={() => setAdding(true)} accessibilityRole="button" testID="shared-add-person">
            <Ionicons name="person-add-outline" size={20} color={colors.gold} style={{ marginRight: 12 }} />
            <Text style={[styles.rowTitle, { color: colors.gold }]}>Add a person</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.footer}>
        {myId ? 'Everyone here can be part of a shared expense.' : 'Add yourself too, then tap "This is me" on your name.'}
      </Text>

      <Text style={styles.header}>Balances</Text>
      <View style={[styles.group, { padding: 16 }]}>
        <GradientFill match={[styles.group, { padding: 16 }]} />
        <Text style={styles.meta}>No shared expenses yet. Adding them comes in the next step.</Text>
      </View>
    </PullToRefreshScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    group: { backgroundColor: colors.navy3, borderRadius: 16, overflow: 'hidden' },
    meta: { fontSize: 15, color: colors.inkDim },
    net: { fontSize: 22, fontWeight: '700', marginVertical: 2 },
    header: { fontSize: 13, color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { fontSize: 14, fontWeight: '700' },
    rowTitle: { flex: 1, fontSize: 17, color: colors.ink },
    youTag: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
    link: { fontSize: 15, fontWeight: '600', color: colors.gold },
    addBox: { padding: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    chipText: { fontSize: 15, fontWeight: '600', color: colors.ink },
    input: { flex: 1, backgroundColor: colors.navy2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink },
    addBtn: { paddingHorizontal: 16, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
}
