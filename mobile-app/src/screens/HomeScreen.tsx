import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SetPinScreen from './SetPinScreen';
import { hasPinSetUp } from '../pin';

type Props = {
  username: string;
  onSignOut: () => void;
  onLock: () => void;
};

export default function HomeScreen({ username, onSignOut, onLock }: Props) {
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
    <View style={styles.container}>
      <Text style={styles.title}>You're signed in, {username}!</Text>
      <Text style={styles.sub}>
        This is a placeholder home screen. The real tabs (Calendar, Bills, etc.) get built in
        later checkpoints.
      </Text>

      <TouchableOpacity style={styles.pinBtn} onPress={() => setShowSetPin(true)}>
        <Text style={styles.pinBtnText}>{pinIsSet ? 'Change my PIN' : 'Set a Quick PIN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.lockBtn} onPress={pinIsSet ? onLock : onSignOut}>
        <Text style={styles.lockBtnText}>{pinIsSet ? 'Lock' : 'Sign out'}</Text>
      </TouchableOpacity>

      {pinIsSet && (
        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign out completely</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 100, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#1C1917', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  pinBtn: { backgroundColor: '#1C1917', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 14 },
  pinBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  lockBtn: { backgroundColor: '#E7E5E4', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginBottom: 6 },
  lockBtnText: { color: '#1C1917', fontWeight: '600', fontSize: 14 },
  signOutBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  signOutText: { color: '#57534E', fontSize: 13 },
});
