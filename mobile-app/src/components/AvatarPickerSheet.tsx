import React, { useState } from 'react';
import { friendlyError } from '../friendlyError';
import { View, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import Avatar from './Avatar';
import { useTheme } from '../ThemeContext';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { AVATAR_PRESETS, makeAvatarDataUri } from '../avatars';
import { MAX_SAVED_AVATAR_PHOTOS } from '../types';
import type { AvatarConfig, SavedAvatarPhoto } from '../types';
import GradientFill from './GradientFill';

// onSave(null) means "go back to plain initials". When `photos` is passed, it replaces
// this person's saved photos ("Your photos"); otherwise they stay as they are.
type Props = {
  visible: boolean;
  onClose: () => void;
  initials: string;
  current?: AvatarConfig;
  photos?: SavedAvatarPhoto[];
  onSave: (config: AvatarConfig | null, photos?: SavedAvatarPhoto[]) => Promise<void>;
};

export default function AvatarPickerSheet({ visible, onClose, initials, current, photos, onSave }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  // The saved photos, plus the photo in use if it was uploaded before photos were kept.
  const currentPhoto = current?.type === 'photo' ? current.photoDataUri : undefined;
  const saved: SavedAvatarPhoto[] = [...(photos ?? [])];
  if (currentPhoto && !saved.some((p) => p.dataUri === currentPhoto)) {
    saved.unshift({ id: `avp-${current?.updatedAt ?? 0}`, dataUri: currentPhoto, addedAt: current?.updatedAt ?? 0 });
  }
  const isFull = saved.length >= MAX_SAVED_AVATAR_PHOTOS;

  function close() {
    setEditing(false);
    setError('');
    onClose();
  }

  async function save(config: AvatarConfig | null) {
    setBusy(true);
    setError('');
    try {
      await onSave(config);
      close();
    } catch (e) {
      setError('Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(photo: SavedAvatarPhoto) {
    const inUse = photo.dataUri === currentPhoto;
    Alert.alert(
      'Delete this photo?',
      inUse ? "You're using this one, so your picture goes back to your initials." : 'It will be removed from your photos.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setError('');
            try {
              const rest = saved.filter((p) => p.id !== photo.id);
              await onSave(inUse ? null : current ?? null, rest);
              if (rest.length === 0) setEditing(false);
            } catch (e) {
              setError('Could not delete. Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  async function handlePickPhoto() {
    setError('');
    if (isFull) {
      setError(`You can keep up to ${MAX_SAVED_AVATAR_PHOTOS} photos. Tap Edit and delete one first.`);
      return;
    }
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
      const now = Date.now();
      const added: SavedAvatarPhoto = { id: `avp-${now.toString(36)}`, dataUri, addedAt: now };
      await onSave({ type: 'photo', photoDataUri: dataUri }, [added, ...saved]);
      close();
    } catch (e: any) {
      setError(friendlyError(e, "Couldn't use that photo. Try a different one."));
    } finally {
      setBusy(false);
      setAutoLockSuppressed(false);
    }
  }

  const showUseInitials = !!current && current.type !== 'initials';

  return (
    <BottomSheet visible={visible} onClose={close} title="Profile picture" testID="avatar-picker-sheet">
      <View style={styles.previewWrap}>
        <Avatar initials={initials} config={current} size={96} />
      </View>

      <View style={styles.labelRow}>
        <Text style={[styles.label, { marginBottom: 0 }]}>Your photos</Text>
        {saved.length > 0 && (
          <TouchableOpacity onPress={() => setEditing((e) => !e)} hitSlop={10} disabled={busy}>
            <Text style={styles.editText}>{editing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.photoRow}>
        {saved.map((p) => {
          const selected = !editing && p.dataUri === currentPhoto;
          return (
            <TouchableOpacity
              key={p.id}
              disabled={busy}
              activeOpacity={0.7}
              onPress={() => (editing ? confirmDelete(p) : save({ type: 'photo', photoDataUri: p.dataUri }))}
              accessibilityLabel={editing ? 'Delete this photo' : 'Use this photo'}
              style={[styles.presetRing, { borderColor: selected ? colors.gold : 'transparent' }]}
            >
              <Image source={{ uri: p.dataUri }} style={styles.photo} />
              {editing && (
                <View style={styles.deleteBadge}>
                  <Ionicons name="close" size={13} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        {!editing && !isFull && (
          <TouchableOpacity
            disabled={busy}
            activeOpacity={0.7}
            onPress={handlePickPhoto}
            accessibilityLabel="Add a photo"
            style={styles.presetRing}
          >
            <View style={[styles.addTile, { borderColor: colors.inkFaint }]}>
              <Ionicons name="add" size={24} color={colors.gold} />
            </View>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.hint}>
        {editing
          ? "Tap a photo to delete it. If it's the one you use, you go back to your initials."
          : `Photos you upload stay here so you can switch back. Up to ${MAX_SAVED_AVATAR_PHOTOS}.`}
      </Text>

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
              <GradientFill match={[styles.presetRing, { borderColor: selected ? colors.gold : 'transparent' }]} />
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
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    editText: { fontSize: 14, fontWeight: '700', color: colors.gold },
    photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
    photo: { width: 48, height: 48, borderRadius: 24 },
    addTile: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    deleteBadge: { position: 'absolute', top: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.navy3, alignItems: 'center', justifyContent: 'center' },
    hint: { fontSize: 12, lineHeight: 16, color: colors.inkDim, marginBottom: 16 },
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
    errorText: { fontSize: 12, color: colors.error, textAlign: 'center', marginTop: 6 },
  });
}
