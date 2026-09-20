import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import Avatar from './Avatar';
import { useTheme } from '../ThemeContext';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { AVATAR_PRESETS, makeAvatarDataUri } from '../avatars';
import type { AvatarConfig } from '../types';

// onSave(null) means "go back to plain initials".
type Props = {
  visible: boolean;
  onClose: () => void;
  initials: string;
  current?: AvatarConfig;
  onSave: (config: AvatarConfig | null) => Promise<void>;
};

export default function AvatarPickerSheet({ visible, onClose, initials, current, onSave }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(config: AvatarConfig | null) {
    setBusy(true);
    setError('');
    try {
      await onSave(config);
      onClose();
    } catch (e) {
      setError('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePickPhoto() {
    setError('');
    setAutoLockSuppressed(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Allow photo library access in your phone settings.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      setBusy(true);
      const dataUri = await makeAvatarDataUri(result.assets[0].uri);
      await onSave({ type: 'photo', photoDataUri: dataUri });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Couldn't use that photo. Try a different one.");
    } finally {
      setBusy(false);
      setAutoLockSuppressed(false);
    }
  }

  const showUseInitials = !!current && current.type !== 'initials';

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Profile picture" testID="avatar-picker-sheet">
      <View style={styles.previewWrap}>
        <Avatar initials={initials} config={current} size={96} />
      </View>

      <Text style={styles.label}>Pick an icon</Text>
      <View style={styles.presetGrid}>
        {AVATAR_PRESETS.map((p) => {
          const selected = current?.type === 'preset' && current.presetId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              disabled={busy}
              activeOpacity={0.7}
              onPress={() => save({ type: 'preset', presetId: p.id })}
              accessibilityLabel={`Use the ${p.id} icon`}
              style={[styles.presetRing, { borderColor: selected ? colors.gold : 'transparent' }]}
            >
              <View style={[styles.presetInner, { backgroundColor: p.bg }]}>
                <Ionicons name={p.icon} size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        testID="avatar-choose-photo"
        style={styles.button}
        disabled={busy}
        activeOpacity={0.7}
        onPress={handlePickPhoto}
      >
        {busy ? (
          <ActivityIndicator color={colors.gold} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="image-outline" size={18} color={colors.gold} />
            <Text style={styles.buttonText}>Choose a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {showUseInitials && (
        <TouchableOpacity
          style={styles.ghostButton}
          disabled={busy}
          activeOpacity={0.7}
          onPress={() => save(null)}
        >
          <Text style={styles.ghostButtonText}>Use my initials</Text>
        </TouchableOpacity>
      )}

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </BottomSheet>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    previewWrap: { alignItems: 'center', marginBottom: 16 },
    label: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 8,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 16,
    },
    presetRing: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      backgroundColor: colors.navy2,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    buttonText: { fontSize: 14, fontWeight: '600', color: colors.gold },
    ghostButton: { alignItems: 'center', paddingVertical: 10 },
    ghostButtonText: { fontSize: 13, color: colors.inkDim },
    errorText: { fontSize: 12, color: '#e5484d', textAlign: 'center', marginTop: 6 },
  });
}
