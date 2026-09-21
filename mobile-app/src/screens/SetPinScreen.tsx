import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { isValidPinFormat, savePin } from '../pin';
import PinField from '../components/PinField';
import PasswordField from '../components/PasswordField';
import { useData } from '../DataContext';
import { savePinCopy, attemptPinUnlock, resetPinFailures } from '../quickUnlock';
import { updateRecentAccountIfPresent } from '../recentAccounts';

type Props = {
  username: string;
  // The account's email. Used only to save the PIN copy for quick unlock after a full app close.
  email?: string;
  onDone: () => void;
  onCancel: () => void;
};

export default function SetPinScreen({ username, email, onDone, onCancel }: Props) {
  const { verifyPassword } = useData();
  const [password, setPassword] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError('');
    if (!password) {
      setError('Enter your account password.');
      return;
    }
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
      const passwordOk = await verifyPassword(password);
      if (!passwordOk) {
        setBusy(false);
        setError('Incorrect password.');
        return;
      }
      await savePin(username, pin1);
      updateRecentAccountIfPresent(username, { hasPin: true }).catch(() => {});
      if (email) {
        const copied = await savePinCopy({ email, username, password }, pin1);
        // TEMP checks (remove in Step 4/5): the PIN copy reads back, and a wrong PIN is rejected and counted.
        const okCheck = await attemptPinUnlock(username, pin1);
        const wrongCheck = await attemptPinUnlock(username, pin1 === '000000' ? '111111' : '000000');
        await resetPinFailures(username);
        console.log(
          '[quick unlock] TEMP PIN copy saved:',
          copied,
          '| right PIN ->',
          okCheck.status,
          '| wrong PIN ->',
          wrongCheck.status,
          wrongCheck.status === 'wrong' ? wrongCheck.attemptsLeft + ' left' : ''
        );
      }
      setBusy(false);
      onDone();
    } catch (e) {
      setBusy(false);
      setError('Could not save PIN. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>QUICK UNLOCK</Text>
        <Text style={styles.title}>Set a PIN</Text>
        <Text style={styles.sub}>
          A short PIN for quick unlock. Your password remains your backup.
        </Text>

        <Text style={styles.label}>Account password</Text>
        <PasswordField
          testID="set-pin-password-input"
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
        />

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAF9' },
  container: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 120 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#78716C', textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center', color: '#1C1917', marginBottom: 8 },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#57534E', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917', textAlign: 'center', letterSpacing: 6,
  },
  passwordInput: {
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E7E5E4',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1917',
  },
  error: { color: '#E11D48', fontSize: 13, textAlign: 'center', marginTop: 16 },
  primaryBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 14, marginTop: 24 },
  primaryBtnText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600', fontSize: 15 },
  ghostBtn: { paddingVertical: 14, marginTop: 4 },
  ghostBtnText: { color: '#57534E', textAlign: 'center', fontSize: 13 },
});
