import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type Props = {
  style?: any;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  centered?: boolean;
  testID?: string;
};

// One shared 4-6 digit numeric PIN input with a show/hide eye icon — used on
// SetPinScreen, PinUnlockScreen, and Onboarding Quick Unlock setup.
export default function PinField({
  style,
  value,
  onChangeText,
  placeholder = '••••',
  autoFocus = false,
  centered = false,
  testID,
}: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const styles = makeStyles();

  return (
    <View style={styles.wrap}>
      <TextInput
        testID={testID}
        style={[
          style,
          styles.input,
          centered ? styles.centeredInput : styles.leftInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        secureTextEntry={hidden}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus={autoFocus}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setHidden((h) => !h)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={hidden ? 'eye-outline' : 'eye-off-outline'}
          size={20}
          color={colors.inkFaint}
        />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {},
    leftInput: {
      paddingRight: 44,
    },
    centeredInput: {
      paddingLeft: 44,
      paddingRight: 44,
      textAlign: 'center',
      letterSpacing: 6,
    },
    iconBtn: {
      position: 'absolute',
      right: 12,
      height: '100%',
      justifyContent: 'center',
    },
  });
}
