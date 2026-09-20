import React from 'react';
import { View, Text, Image, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import type { AvatarConfig } from '../types';
import { findAvatarPreset } from '../avatars';

// One avatar for the whole app. The caller passes the initials (from
// getInitials) so this file never imports a screen.
// variant 'filled'   = gold circle, white initials (Home header)
// variant 'outlined' = light circle, gold ring + initials (Profile, Settings)
type Props = {
  initials: string;
  config?: AvatarConfig;
  size: number;
  variant?: 'filled' | 'outlined';
};

export default function Avatar({ initials, config, size, variant = 'outlined' }: Props) {
  const { colors } = useTheme();
  const borderWidth = variant === 'outlined' ? (size >= 60 ? 2 : 1.5) : 0;
  const base: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth,
    borderColor: colors.gold,
  };

  if (config && config.type === 'photo' && config.photoDataUri) {
    return (
      <View style={[base, { backgroundColor: colors.navy2 }]}>
        <Image source={{ uri: config.photoDataUri }} style={{ width: '100%', height: '100%' }} />
      </View>
    );
  }

  const preset = config && config.type === 'preset' ? findAvatarPreset(config.presetId) : undefined;
  if (preset) {
    return (
      <View style={[base, { backgroundColor: preset.bg }]}>
        <Ionicons name={preset.icon} size={Math.round(size * 0.5)} color="#FFFFFF" />
      </View>
    );
  }

  const filled = variant === 'filled';
  return (
    <View style={[base, { backgroundColor: filled ? colors.gold : colors.navy2 }]}>
      <Text
        style={{
          fontSize: Math.round(size * 0.36),
          fontWeight: '700',
          letterSpacing: size >= 60 ? 1 : 0,
          color: filled ? '#FFFFFF' : colors.gold,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
