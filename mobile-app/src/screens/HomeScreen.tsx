import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SetPinScreen from './SetPinScreen';
import { hasPinSetUp } from '../pin';
import { useTheme } from '../ThemeContext';

type Props = {
  username: string;
  onSignOut: () => void;
  onLock: () => void;
};

export default function HomeScreen({ username, onSignOut, onLock }: Props) {
  const { colors } = useTheme();
  const [showSetPin, setShowSetPin] = useState(false);
  const [pinIsSet, setPinIsSet] = useState(false);

  useEffect(() => {
    (async () => {
      setPinIsSet(await hasPinSetUp(username));
    })();
  }, [username]);

  if (showSetPin) {
    return (
      <SetPinScreen
        username={username}
        onDone={() => {
          setShowSetPin(false);
          setPinIsSet(true);
        }}
        onCancel={() => setShowSetPin(false)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.navy2 }]}>
      <Text style={[styles.title, { color: colors.ink }]}>You're signed in, {username}!</Text>
      <Text style={[styles.sub, { color: colors.inkDim }]}>
        This is a placeholder home screen. The real tabs (Calendar, Bills, etc.) get built in
        later checkpoints.
      </Text>

      <TouchableOpacity
        testID="set-pin-button"
        style={[styles.pinBtn, { backgroundColor: colors.gold }]}
        onPress={() => setShowSetPin(true)}
      >
        <Text style={styles.pinBtnText}>{pinIsSet ? 'Change my PIN' : 'Set a Quick PIN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID={pinIsSet ? 'lock-button' : 'sign-out-button'}
        style={[styles.lockBtn, { backgroundColor: colors.navy1 }]}
        onPress={pinIsSet ? onLock : onSignOut}
      >
        <Text style={[styles.lockBtnText, { color: colors.ink }]}>{pinIsSet ? 'Lock' : 'Sign out'}</Text>
      </TouchableOpacity>

      {pinIsSet && (
        <TouchableOpacity testID="sign-out-button" style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={[styles.signOutText, { color: colors.inkDim }]}>Sign out completely</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 100, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  pinBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 14 },
  pinBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  lockBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 6 },
  lockBtnText: { fontWeight: '600', fontSize: 14 },
  signOutBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  signOutText: { fontSize: 13 },
});
