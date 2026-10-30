import React from 'react';
import { Modal, View, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// H-46 (Cath, 2026-10-29, canvas E2): every choice in a form is a real dropdown: tapping the
// row raises a list from the bottom (over the form, which dims). Picking one closes it.
// Tapping outside closes it too. Used by SimpleForm's PickerRow.
export default function ChoiceSheet({ visible, title, onClose, children, testID }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; testID?: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the list" />
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View style={[s.sheet, { backgroundColor: colors.navy3, paddingBottom: Math.max(16, insets.bottom + 8) }]} testID={testID}>
          <View style={[s.handle, { backgroundColor: colors.navy4 }]} />
          <Text style={[s.title, { color: colors.ink }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 10 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
});
