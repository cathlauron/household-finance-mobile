import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type Props = {
  style?: any;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
};

// One shared password/passphrase input with a show/hide eye icon — used everywhere a
// real password is typed (sign-in, create-profile, change-password). Deliberately NOT
// used on the 4-digit PIN screens, which have their own numeric-only UX.
export default function PasswordField({ style, value, onChangeText, placeholder, editable = true }: Props) {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const styles = makeStyles(colors);

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[style, styles.input]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        secureTextEntry={hidden}
        autoCapitalize="none"
        editable={editable}
      />
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => setHidden((h) => !h)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.inkFaint} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    wrap: { position: 'relative', justifyContent: 'center' },
    input: { paddingRight: 44 },
    iconBtn: { position: 'absolute', right: 12, height: '100%', justifyContent: 'center' },
  });
}