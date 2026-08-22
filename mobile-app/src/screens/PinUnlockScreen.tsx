import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { verifyPin } from '../pin';

type Props = {
  username: string;
  onUnlocked: () => void;
  onUsePassphraseInstead: () => void;
};

export default function PinUnlockScreen({ username, onUnlocked, onUsePassphraseInstead }: Props) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleUnlock() {
    setError('');
    setBusy(true);
    const ok = await verifyPin(username, pin);
    setBusy(false);
    if (!ok) {
      setError('Incorrect PIN — try again.');
      setPin('');
      return;
    }
    onUnlocked();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>LOCKED</Text>
      <Text style={styles.title}>Welcome back, {username}</Text>
      <Text style={styles.sub}>Enter your PIN to keep going, right where you left off.</Text>

      <Text style={styles.label}>PIN</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="••••"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleUnlock} disabled={busy || pin.length < 4}>
        <Text style={styles.primaryBtnText}>{busy ? 'Checking…' : 'Unlock'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={onUsePassphraseInstead}>
        <Text style={styles.ghostBtnText}>Use passphrase instead</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 80 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#78716C', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', color: '#1C1917', marginBottom: 8 },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#57534E', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917', textAlign: 'center', letterSpacing: 6,
  },
  error: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginTop: 16 },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
});
