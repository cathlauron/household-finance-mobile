import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';

export default function PlaceholderScreen() {
  const route = useRoute();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.navy2 }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{route.name}</Text>
      <Text style={[styles.sub, { color: colors.inkDim }]}>This section is coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  sub: { fontSize: 14 },
});
