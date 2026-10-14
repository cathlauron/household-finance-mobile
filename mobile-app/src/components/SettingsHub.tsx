import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children);
  return (
    <View style={{ marginBottom: 24 }}>
      {/* Redesign: iPhone Settings-style grouped list */}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: colors.inkDim,
          marginBottom: 6,
          marginLeft: 16,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: colors.navy3,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.navy4, marginLeft: 60 }} />}
            {child}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  value,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  value?: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.7}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 10, paddingHorizontal: 16 }}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: colors.accentTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: colors.ink }}>{title}</Text>
      {!!value && <Text numberOfLines={1} style={{ fontSize: 17, color: colors.inkDim, marginRight: 6, flexShrink: 1 }}>{value}</Text>}
      <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
    </TouchableOpacity>
  );
}
