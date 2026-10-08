import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';

type Props = {
  value: number | '' | undefined;
  onChangeAmount: (value: number | '') => void;
  onBlur?: () => void;
  placeholder?: string;
  allowDecimals?: boolean;
  // true = shows a +/- button so the amount can be negative (e.g. credit card balance, overdraft)
  allowNegative?: boolean;
  prefix?: string | null;
  suffix?: string | null;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

function formatWithCommas(num: number, allowDecimals: boolean): string {
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: allowDecimals ? 2 : 0,
  });
}

export default function AmountInput({
  value,
  onChangeAmount,
  onBlur,
  placeholder = '0.00',
  allowDecimals = true,
  allowNegative = false,
  prefix = '₱',
  suffix = null,
  style,
  inputStyle,
}: Props) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [textBuffer, setTextBuffer] = useState('');

  // While not focused, always show the formatted value from the parent.
  useEffect(() => {
    if (!isFocused) {
      if (typeof value === 'number' && !isNaN(value)) {
        setTextBuffer(formatWithCommas(value, allowDecimals));
      } else {
        setTextBuffer('');
      }
    }
  }, [value, isFocused, allowDecimals]);

  function handleChangeText(text: string) {
    const neg = allowNegative && /^\s*-/.test(text);
    let cleaned = text.replace(/[^0-9.]/g, '');
    if (!allowDecimals) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      const parts = cleaned.split('.');
      if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
      const p2 = cleaned.split('.');
      if (p2[1] && p2[1].length > 2) cleaned = p2[0] + '.' + p2[1].slice(0, 2);
    }
    const signed = neg ? '-' + cleaned : cleaned;
    setTextBuffer(signed);
    if (cleaned === '' || cleaned === '.') {
      onChangeAmount('');
    } else {
      const parsed = parseFloat(signed);
      onChangeAmount(isNaN(parsed) ? '' : parsed);
    }
  }

  function toggleSign() {
    const isNeg = textBuffer.trim().startsWith('-');
    handleChangeText(isNeg ? textBuffer.replace('-', '') : '-' + textBuffer);
  }

  function handleFocus() {
    setIsFocused(true);
    // Raw digits while editing so the cursor never jumps.
    if (typeof value === 'number' && !isNaN(value)) {
      setTextBuffer(String(value));
    } else {
      setTextBuffer('');
    }
  }

  function handleBlur() {
    setIsFocused(false);
    onBlur?.();
  }

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, style]}>
      {allowNegative ? (
        <TouchableOpacity
          onPress={toggleSign}
          accessibilityLabel="Switch between positive and negative"
          style={styles.signToggle}
        >
          <Text style={styles.signToggleText}>±</Text>
        </TouchableOpacity>
      ) : null}
      {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
      <TextInput
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={allowDecimals ? 'decimal-pad' : 'number-pad'}
        value={textBuffer}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: radii[8],
      paddingHorizontal: spacing[12],
      paddingVertical: spacing[10],
      marginBottom: spacing[14],
    },
    affix: {
      fontSize: 15,
      color: colors.inkDim,
      marginHorizontal: spacing[4],
    },
    signToggle: {
      paddingHorizontal: spacing[8],
      paddingVertical: spacing[4],
      borderRadius: radii[8],
      backgroundColor: colors.navy4,
      marginRight: spacing[4],
    },
    signToggleText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.ink,
      padding: 0,
    },
  });
}
