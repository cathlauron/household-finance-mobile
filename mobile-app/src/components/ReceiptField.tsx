// Cath, 2026-10-27 (canvas R1-R4, "add receipt in Shared expenses and other applicable
// places"): one receipt photo row used by shared expenses, the payment sheet (bills, debts,
// loans) and trip items. Empty: "Receipt photo (optional)" with an "Add photo" pill.
// With a photo: a small picture (tap to see it full size), "Change photo" and "Remove".
// Photos are shrunk before they're kept, exactly like a transaction's receipt.
import React, { useState } from 'react';
import { View, StyleSheet, Image, Alert, Modal, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { TouchableOpacity } from './Tap';
import { MarkedLabel } from './MarkedLabel';
import { useTheme } from '../ThemeContext';
import { makeReceiptDataUri } from '../avatars';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { friendlyError } from '../friendlyError';

// Opens the photo library and returns the shrunk photo, or null (cancelled / not allowed).
export async function pickReceiptPhoto(): Promise<string | null> {
  setAutoLockSuppressed(true);
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access in your phone settings to attach a receipt.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (result.canceled || !result.assets || !result.assets[0]) return null;
    const asset = result.assets[0];
    try {
      return await makeReceiptDataUri(asset.uri, asset.width);
    } catch (e: any) {
      Alert.alert("Couldn't add that photo", friendlyError(e, 'Try picking a different one.'));
      return null;
    }
  } finally {
    setAutoLockSuppressed(false);
  }
}

// The full-size view of a receipt. Tap anywhere (or back) to close.
export function ReceiptViewer({ photo, onClose }: { photo: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={viewer.back} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the receipt" testID="receipt-viewer">
        {photo ? <Image source={{ uri: photo }} style={viewer.image} resizeMode="contain" /> : null}
        <Text style={viewer.hint}>Tap to close</Text>
      </Pressable>
    </Modal>
  );
}
const viewer = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  image: { width: '100%', height: '82%' },
  hint: { color: '#F2F2F7', fontSize: 14, marginTop: 14, opacity: 0.8 },
});

// The small paperclip shown next to a name in a list when it has a receipt.
export function ReceiptMark({ size = 14 }: { size?: number }) {
  const { colors } = useTheme();
  return <Ionicons name="attach" size={size} color={colors.inkDim} accessibilityLabel="Has a receipt" style={{ marginLeft: 4 }} />;
}

export default function ReceiptField({
  photo,
  onChange,
  testID = 'receipt',
  style,
}: {
  photo: string | null | undefined;
  onChange: (next: string | null) => void;
  testID?: string;
  style?: any;
}) {
  const { colors } = useTheme();
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const s = styles(colors);

  async function pick() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await pickReceiptPhoto();
      if (next) onChange(next);
    } finally {
      setBusy(false);
    }
  }

  if (!photo) {
    return (
      <View style={[s.card, s.emptyRow, style]}>
        <MarkedLabel text="Receipt photo" mark="optional" style={s.label} />
        <TouchableOpacity onPress={pick} style={s.pill} testID={`${testID}-add`} accessibilityRole="button" accessibilityLabel="Add a receipt photo">
          <Text style={s.pillText}>{busy ? 'Adding…' : 'Add photo'}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={[s.card, s.fullCard, style]}>
      <MarkedLabel text="Receipt photo" mark="optional" style={s.label} />
      <View style={s.photoRow}>
        <TouchableOpacity onPress={() => setViewing(true)} testID={`${testID}-thumb`} accessibilityRole="imagebutton" accessibilityLabel="Receipt photo. Tap to see it full size">
          <Image source={{ uri: photo }} style={s.thumb} resizeMode="cover" />
        </TouchableOpacity>
        <View style={s.actions}>
          <TouchableOpacity onPress={pick} style={s.pill} testID={`${testID}-change`} accessibilityRole="button">
            <Text style={s.pillText}>{busy ? 'Adding…' : 'Change photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onChange(null)} testID={`${testID}-remove`} accessibilityRole="button" hitSlop={8}>
            <Text style={s.remove}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ReceiptViewer photo={viewing ? photo : null} onClose={() => setViewing(false)} />
    </View>
  );
}

const styles = (c: any) =>
  StyleSheet.create({
    card: { backgroundColor: c.navy3, borderRadius: 12 },
    emptyRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, gap: 12 },
    fullCard: { paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    label: { flex: 1, fontSize: 16, color: c.ink },
    pill: { backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
    pillText: { fontSize: 14, fontWeight: '600', color: c.gold },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    thumb: { width: 64, height: 84, borderRadius: 8, backgroundColor: c.navy2, borderWidth: StyleSheet.hairlineWidth, borderColor: c.navy4 },
    actions: { gap: 8 },
    remove: { fontSize: 14, color: c.error, paddingHorizontal: 2 },
  });
