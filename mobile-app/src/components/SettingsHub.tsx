import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children);
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: colors.inkDim,
          marginBottom: 6,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          backgroundColor: colors.navy3,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.navy4,
          overflow: 'hidden',
        }}
      >
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ height: 1, backgroundColor: colors.navy4, marginLeft: 62 }} />}
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
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.navy2,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.ink }}>{title}</Text>
      {!!value && <Text style={{ fontSize: 13, color: colors.inkDim, marginRight: 6 }}>{value}</Text>}
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </TouchableOpacity>
  );
}
