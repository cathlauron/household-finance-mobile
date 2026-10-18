import React, { useEffect, useState } from 'react';
import { Text } from '../components/AppText';
import BottomSheet from '../components/BottomSheet';
import BusyOverlay, { paintBusy } from '../components/BusyOverlay';
import { SheetBar, SheetHero, FormGroup, PasswordRow, PinRow } from '../components/SimpleForm';
import { isValidPinFormat, savePin } from '../pin';
import { useData } from '../DataContext';
import { savePinCopy } from '../quickUnlock';
import { updateRecentAccountIfPresent } from '../recentAccounts';
import { hapticLight } from '../haptics';
import { useTheme } from '../ThemeContext';

// Settings › Quick unlock: set or change the PIN.
// Version 2.1 (Cath): the same bottom sheet as the rest of the app (it used to be a full
// page), and the breathing logo while the password is checked and the PIN saved.

type Props = {
  visible: boolean;
  username: string;
  // The account's email. Used only to save the PIN copy for quick unlock after a full app close.
  email?: string;
  onDone: () => void;
  onCancel: () => void;
};

export default function SetPinSheet({ visible, username, email, onDone, onCancel }: Props) {
  const { verifyPassword } = useData();
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setPin1('');
    setPin2('');
    setError('');
    setBusy(false);
  }, [visible]);

  async function handleSave() {
    setError('');
    if (!password) return setError('Enter your account password.');
    if (!isValidPinFormat(pin1)) return setError('The PIN needs 4 to 6 digits.');
    if (pin1 !== pin2) return setError("The two PINs don't match.");
    hapticLight();
    setBusy(true);
    await paintBusy();
    try {
      const passwordOk = await verifyPassword(password);
      if (!passwordOk) {
        setBusy(false);
        setError('That password is not right.');
        return;
      }
      await savePin(username, pin1);
      updateRecentAccountIfPresent(username, { hasPin: true }).catch(() => {});
      if (email) await savePinCopy({ email, username, password }, pin1);
      setBusy(false);
      onDone();
    } catch {
      setBusy(false);
      setError("Couldn't save the PIN. Please try again.");
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => !busy && onCancel()}
      grouped
      header={<SheetBar title="Quick unlock" onCancel={onCancel} onDone={handleSave} doneLabel="Save" busy={busy} doneDisabled={!password || !pin1 || !pin2} />}
    >
      <SheetHero icon="keypad-outline" title="Set a PIN" sub="A short PIN to open the app quickly. Your password stays your backup." />
      <FormGroup>
        <PasswordRow label="Password" value={password} onChangeText={setPassword} placeholder="Your password" autoFocus testID="set-pin-password-input" />
        <PinRow label="New PIN" value={pin1} onChangeText={setPin1} testID="pin-input" />
        <PinRow label="Confirm PIN" value={pin2} onChangeText={setPin2} testID="confirm-pin-input" />
      </FormGroup>
      <Text style={{ fontSize: 13, lineHeight: 18, marginHorizontal: 16, marginTop: 8, marginBottom: 16, color: error ? colors.error : colors.inkDim, fontWeight: error ? '700' : '400' }}>
        {error || 'This can take a few seconds on some phones.'}
      </Text>
      <BusyOverlay visible={busy} messages={['Checking your password…', 'Saving your PIN…', 'Setting up Quick unlock…']} />
    </BottomSheet>
  );
}
