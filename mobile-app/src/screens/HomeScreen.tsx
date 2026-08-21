import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  username: string;
  onSignOut: () => void;
};

export default function HomeScreen({ username, onSignOut }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>You're signed in, {username}!</Text>
      <Text style={styles.sub}>
        This is a placeholder home screen. The real tabs (Calendar, Bills, etc.) get built in
        later checkpoints.
      </Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9', padding: 24, paddingTop: 100, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#1C1917', marginBottom: 12, textAlign: 'center' },
  sub: { fontSize: 14, color: '#57534E', textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  signOutBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  signOutText: { color: '#57534E', fontSize: 13 },
});
