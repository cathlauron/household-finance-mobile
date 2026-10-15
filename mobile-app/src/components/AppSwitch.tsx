import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { useTheme } from '../ThemeContext';

// Every on/off switch in the app: the knob is always white; only the track changes,
// filled with the current mood colour when on (green, orange when running low, red when
// overspent) and light grey when off.
export default function AppSwitch(props: SwitchProps) {
  const { colors, isDark } = useTheme();
  const off = isDark ? colors.navy4 : '#DCDCE1';
  return (
    <Switch
      {...props}
      trackColor={{ true: colors.buttonFill, false: off }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={off}
    />
  );
}
