import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// `plain`: rows without icons (PlainRow), so the dividers start at the text.
// `footer`: a small grey note under the group.
export function SettingsGroup({
  label,
  footer,
  plain,
  children,
}: {
  label?: string;
  footer?: string;
  plain?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ marginBottom: 24 }}>
      {/* Redesign: iPhone Settings-style grouped list */}
      {!!label && <Text
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
      </Text>}
      <View
        style={{
          backgroundColor: colors.navy3,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <GradientFill match={{
          backgroundColor: colors.navy3,
          borderRadius: 12,
          overflow: 'hidden',
        }} />
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.navy4, marginLeft: plain ? 16 : 60 }} />}
            {child}
          </React.Fragment>
        ))}
      </View>
      {!!footer && (
        <Text style={{ fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 }}>{footer}</Text>
      )}
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
        <GradientFill match={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: colors.accentTint,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }} />
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, color: colors.ink }}>{title}</Text>
      {!!value && <Text numberOfLines={1} style={{ fontSize: 17, color: colors.inkDim, marginRight: 6, flexShrink: 1 }}>{value}</Text>}
      <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
    </TouchableOpacity>
  );
}

// A row with no icon: a title, an optional grey value, and either a chevron (when it
// opens something), a control on the right (like a Switch), or nothing.
export function PlainRow({
  title,
  sub,
  value,
  onPress,
  right,
  danger,
  accent,
  dot,
  testID,
}: {
  title: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  accent?: boolean;
  dot?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const titleColor = danger ? colors.negative : accent ? colors.gold : colors.ink;
  const content = (
    <>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text numberOfLines={1} style={{ fontSize: 17, color: titleColor }}>{title}</Text>
        {!!sub && <Text style={{ fontSize: 13, color: colors.inkDim, marginTop: 1 }}>{sub}</Text>}
      </View>
      {!!dot && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot, marginRight: 8 }} />}
      {!!value && <Text numberOfLines={1} style={{ fontSize: 17, color: colors.inkDim, marginRight: onPress && !right ? 6 : 0, flexShrink: 1 }}>{value}</Text>}
      {right}
      {!!onPress && !right && !danger && !accent && <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, minHeight: 52, paddingVertical: 8, paddingHorizontal: 16 };
  if (!onPress) return <View testID={testID} style={style}>{content}</View>;
  return (
    <TouchableOpacity testID={testID} activeOpacity={0.7} onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title}>
      {content}
    </TouchableOpacity>
  );
}

// A row with a title and a small segmented picker under it (Light / Dark / Auto, ...).
export function SegmentRow<T extends string | number>({
  title,
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  title: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      <Text style={{ fontSize: 17, color: colors.ink }}>{title}</Text>
      <View style={{ flexDirection: 'row', backgroundColor: colors.navy2, borderRadius: 11, padding: 3, gap: 3 }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <TouchableOpacity
              key={String(o.id)}
              testID={testIDPrefix ? `${testIDPrefix}-${o.id}` : undefined}
              activeOpacity={0.7}
              onPress={() => onChange(o.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.navy3 : 'transparent',
                elevation: on ? 1 : 0,
                shadowColor: '#000',
                shadowOpacity: on ? 0.12 : 0,
                shadowRadius: 2,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: on ? '700' : '600', color: on ? colors.ink : colors.inkDim }}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
