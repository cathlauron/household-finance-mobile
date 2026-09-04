import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { isValidPinFormat, savePin } from '../pin';
import PinField from '../components/PinField';

type Props = {
  username: string;
  onDone: () => void;
  onCancel: () => void;
};

export default function SetPinScreen({ username, onDone, onCancel }: Props) {
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError('');
    if (!isValidPinFormat(pin1)) {
      setError('PIN must be 4 to 6 digits.');
      return;
    }
    if (pin1 !== pin2) {
      setError("PINs don't match.");
      return;
    }
    setBusy(true);
    try {
      await savePin(username, pin1);
      setBusy(false);
      onDone();
    } catch (e) {
      setBusy(false);
      setError('Something went wrong saving your PIN. Please try again.');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>QUICK UNLOCK</Text>
      <Text style={styles.title}>Set a PIN</Text>
      <Text style={styles.sub}>
        A short PIN just for re-opening the app quickly — your real password is always the
        backup if you ever need it.
      </Text>

      <Text style={styles.label}>Choose a PIN (4–6 digits)</Text>
      <PinField
        testID="pin-input"
        style={styles.input}
        value={pin1}
        onChangeText={setPin1}
      />

      <Text style={styles.label}>Confirm PIN</Text>
      <PinField
        testID="confirm-pin-input"
        style={styles.input}
        value={pin2}
        onChangeText={setPin2}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity testID="save-pin-button" style={styles.primaryBtn} onPress={handleSave} disabled={busy}>
        <Text style={styles.primaryBtnText}>{busy ? 'Saving…' : 'Save PIN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.ghostBtn} onPress={onCancel}>
        <Text style={styles.ghostBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 80 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#78716C', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '600', textAlign: 'center', color: '#1C1917', marginBottom: 8 },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#57534E', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917',
  },
  error: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginTop: 16 },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
});
