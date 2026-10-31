import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { canSaveToPasswordManager, saveRecoveryKey } from '../keySave';

// Mockup R1 (Cath 2026-10-30): "Save to password manager" under the Secret Recovery Key, so
// it's simply there if the password is ever forgotten. Not shown where the phone can't do it.
export default function SaveKeyButton({ username, recoveryKey, onSaved }: { username: string; recoveryKey: string; onSaved?: () => void }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'ready' | 'busy' | 'saved' | 'failed'>('ready');
  if (!canSaveToPasswordManager() || !username || !recoveryKey) return null;

  async function save() {
    setState('busy');
    try {
      const r = await saveRecoveryKey(username, recoveryKey);
      if (r === 'saved') {
        setState('saved');
        onSaved?.();
      } else setState('ready');
    } catch {
      setState('failed');
    }
  }

  if (state === 'saved') {
    return (
      <View testID="save-key-done" style={[s.done, { backgroundColor: colors.accentTint }]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
        <Text style={[s.doneText, { color: colors.ink }]}>Saved in your password manager</Text>
      </View>
    );
  }
  return (
    <View>
      <TouchableOpacity
        testID="save-key"
        onPress={save}
        disabled={state === 'busy'}
        accessibilityRole="button"
        style={[s.btn, { backgroundColor: colors.buttonFill }]}
      >
        {state === 'busy' ? (
          <ActivityIndicator size="small" color={colors.onButton} />
        ) : (
          <>
            <Ionicons name="key-outline" size={18} color={colors.onButton} />
            <Text style={[s.btnText, { color: colors.onButton }]}>Save to password manager</Text>
          </>
        )}
      </TouchableOpacity>
      {state === 'failed' && <Text style={[s.note, { color: colors.negative }]}>Couldn't save it there. Use Copy key and keep it somewhere safe.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 24, minHeight: 48, paddingHorizontal: 16, marginVertical: 8 },
  btnText: { fontSize: 16, fontWeight: '800' },
  done: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 14, padding: 12, marginVertical: 8 },
  doneText: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 13.5, marginTop: 2, textAlign: 'center' },
});
