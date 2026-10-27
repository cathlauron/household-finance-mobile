import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import Button from './Button';
import { SettingsGroup, PlainRow } from './SettingsHub';
import { useTheme } from '../ThemeContext';
import type { ThemeColors } from '../theme';

// Settings > Backup & Data > "Clear all data & start fresh".
//
// H-01 (2026-10-22, Cath's rule): in a shared household this used to wipe the household for
// everyone while the warning only said "this profile". Now:
// - just you (not linked): asks once, then clears, as before.
// - household owner: the warning names the others and says it clears it for everyone.
// - household member: can't clear. Told only the owner can (it affects the whole
//   household) and offered to leave the household to start fresh on their own.
// - still checking who the owner is, or couldn't check (offline): nothing can be cleared.
export type ClearAllRole = 'solo' | 'owner' | 'member' | 'checking' | 'unknown';

export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// Works out this person's role from the household's member list (getHouseholdMembers).
export function roleFromMembers(
  members: { uid: string; username: string; isOwner: boolean }[],
  myUid: string | null | undefined,
): { role: ClearAllRole; others: string[]; owner: string | null } {
  const me = members.find((m) => m.uid === myUid);
  if (!myUid || !me) return { role: 'unknown', others: [], owner: null };
  const others = members.filter((m) => m.uid !== myUid).map((m) => m.username);
  const owner = members.find((m) => m.isOwner)?.username ?? null;
  return { role: me.isOwner ? 'owner' : 'member', others, owner };
}

type Props = {
  role: ClearAllRole;
  // The other members' names (owner's warning) and the owner's name (member's message).
  partnerNames: string[];
  ownerName: string | null;
  busy: boolean;
  // Return false when clearing failed (the box stays open); anything else closes it.
  onClear: () => Promise<boolean | void> | boolean | void;
  onLeave: () => void;
};

export default function ClearAllData({ role, partnerNames, ownerName, busy, onClear, onLeave }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <SettingsGroup plain footer={role === 'solo' ? "This can't be undone. You'll be asked to confirm first." : 'Clears the whole household. Only its owner can.'}>
        <PlainRow title="Clear all data & start fresh" danger onPress={() => setOpen(true)} />
      </SettingsGroup>
    );
  }

  const cancel = <Button variant="secondary" label="Cancel" onPress={() => setOpen(false)} style={{ flex: 1 }} />;

  if (role === 'solo' || role === 'owner') {
    const others = joinNames(partnerNames);
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          {role === 'solo'
            ? "This clears every entry for this profile — bills, debts, loans, income, savings, accounts, everything. Your username and password stay the same. This can't be undone."
            : `This clears your whole shared household for you and ${others || 'everyone in it'} — bills, debts, loans, income, savings, accounts, everything. It disappears from their phones too. This can't be undone.`}
        </Text>
        <View style={styles.row}>
          <Button
            variant="solidDanger"
            label={role === 'solo' ? 'Yes, clear everything' : 'Yes, clear it for everyone'}
            onPress={async () => {
              if ((await onClear()) !== false) setOpen(false);
            }}
            loading={busy}
            disabled={busy}
            style={{ flex: 1 }}
          />
          {cancel}
        </View>
      </View>
    );
  }

  if (role === 'member') {
    const owner = ownerName ? `${ownerName}, the household's owner,` : "the household's owner";
    return (
      <View style={styles.box}>
        <Text style={styles.text}>
          {`Only ${owner} can clear all data, because it clears it for everyone in the household.\n\nTo start fresh on your own, leave the household first. This phone keeps its own copy, which you can then clear.`}
        </Text>
        <View style={styles.row}>
          <Button
            variant="outlineDanger"
            label="Leave household"
            onPress={() => {
              setOpen(false);
              onLeave();
            }}
            style={{ flex: 1 }}
          />
          {cancel}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {role === 'checking'
          ? 'Checking who owns this household…'
          : "Connect to the internet to check who can clear this household's data, then try again."}
      </Text>
      <View style={styles.row}>{cancel}</View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Same look as the other danger boxes in Settings.
    box: { backgroundColor: 'rgba(229,72,77,0.08)', borderRadius: 10, padding: 14, marginBottom: 8 },
    text: { fontSize: 12.5, color: colors.error, lineHeight: 17, marginBottom: 12 },
    row: { flexDirection: 'row', gap: 8 },
  });
}
