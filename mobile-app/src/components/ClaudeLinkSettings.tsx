import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AppSwitch from './AppSwitch';
import { SettingsGroup, PlainRow } from './SettingsHub';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { hapticSelection } from '../haptics';
import { claudeLinkOn, onClaudeLinkChange, setClaudeLinkOn } from '../claudeLink';

// Claude connector (Cath, 2026-11-28), Settings › Backup & Data. Off until she turns it on.
export default function ClaudeLinkSettings() {
  const { colors } = useTheme();
  const { username, guest } = useData();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!username) return;
    let alive = true;
    const read = () => claudeLinkOn(username).then((v) => alive && setOn(v));
    read();
    const off = onClaudeLinkChange(read);
    return () => {
      alive = false;
      off();
    };
  }, [username]);

  if (!username || guest) return null;

  async function change(next: boolean) {
    if (!username || busy) return;
    setBusy(true);
    setMsg('');
    try {
      await setClaudeLinkOn(username, next);
      setOn(next);
    } catch {
      setMsg(next ? "Couldn't turn it on. Check your internet and try again." : "Couldn't remove the summary. Check your internet and try again.");
    } finally {
      setBusy(false);
    }
  }

  function ask(next: boolean) {
    hapticSelection();
    if (!next) {
      Alert.alert('Turn off Claude?', 'The summary is removed from online storage. Claude can no longer see your totals or add entries.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn off', style: 'destructive', onPress: () => change(false) },
      ]);
      return;
    }
    Alert.alert(
      'Share totals with Claude?',
      'Your account balances, this month\'s totals, category budgets, Left to Spend and what is due before payday are saved online WITHOUT the password lock, so Claude can read them. Transactions, notes and photos stay locked. Claude can add entries; you check each one under To review.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => change(true) },
      ]
    );
  }

  return (
    <SettingsGroup
      label="Claude"
      plain
      footer={msg || (on ? 'Claude sees your totals and can add entries. Anything it adds shows under To review.' : 'Let Claude see your totals to help with budgeting, and add entries for you.')}
    >
      <PlainRow
        title="Connect to Claude"
        right={
          <AppSwitch
            testID="settings-claude-link"
            value={on}
            disabled={busy}
            onValueChange={ask}
            trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
          />
        }
      />
    </SettingsGroup>
  );
}
