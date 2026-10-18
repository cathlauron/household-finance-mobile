import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Text, TextInput } from './AppText';
import { useTheme } from '../ThemeContext';

// The big amount at the top of New transaction / bill / debt / loan / income.
// The app draws "₱ 1,250" itself so it is always centred; a hidden text box underneath
// takes the keypad input. Its own cursor blinks in the middle of the grey ₱0.00 before
// anything is typed, then sits right after the digits.

type Props = {
  value: number | '' | undefined;
  onChangeAmount: (value: number | '') => void;
  onBlur?: () => void;
  placeholder?: string;
  allowDecimals?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  autoFocus?: boolean;
  // Lets a form put the cursor here (e.g. when the amount is missing).
  focusRef?: React.Ref<{ focus: () => void }>;
};

function withCommas(raw: string): string {
  const [whole, dec] = raw.split('.');
  const w = (whole || '0').replace(/^0+(?=\d)/, '');
  const grouped = w.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

function fromValue(value: number | '' | undefined): string {
  return typeof value === 'number' && !isNaN(value) ? String(Math.round(value * 100) / 100) : '';
}

export default function CenteredAmount({ value, onChangeAmount, onBlur, placeholder = '0.00', allowDecimals = true, style, inputStyle, autoFocus, focusRef }: Props) {
  const { colors } = useTheme();
  const flat = StyleSheet.flatten(inputStyle) || {};
  const size = (flat.fontSize as number) || 40;
  const color = (flat.color as string) || colors.ink;
  const [focused, setFocused] = useState(false);
  const [buffer, setBuffer] = useState(fromValue(value));
  const inputRef = useRef<any>(null);
  useImperativeHandle(focusRef, () => ({ focus: () => inputRef.current?.focus() }), []);

  // Follow the parent's value while not typing (e.g. opening an existing bill).
  useEffect(() => {
    if (!focused) setBuffer(fromValue(value));
  }, [value, focused]);

  function handleChangeText(text: string) {
    let cleaned = text.replace(/[^0-9.]/g, '');
    if (!allowDecimals) cleaned = cleaned.replace(/\./g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
    const p2 = cleaned.split('.');
    if (p2[1] && p2[1].length > 2) cleaned = p2[0] + '.' + p2[1].slice(0, 2);
    if (cleaned.length > 13) return; // keeps it to a sensible size
    setBuffer(cleaned);
    if (cleaned === '' || cleaned === '.') onChangeAmount('');
    else {
      const n = parseFloat(cleaned);
      onChangeAmount(isNaN(n) ? '' : n);
    }
  }

  // Blinking cursor while typing.
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!focused) return;
    blink.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(blink, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(500),
        Animated.timing(blink, { toValue: 1, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [focused, buffer, blink]);

  const empty = buffer === '';
  const shown = empty ? placeholder : withCommas(buffer);
  const tint = empty ? colors.inkFaint : color;
  const caretH = Math.round(size * 1.05);
  const caret = (extra: any) => (
    <Animated.View
      pointerEvents="none"
      style={[{ width: 3, height: caretH, borderRadius: 2, backgroundColor: colors.gold, opacity: blink }, extra]}
    />
  );

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      style={[styles.wrap, { minHeight: Math.round(size * 1.6) }, style]}
    >
      <View style={styles.row} pointerEvents="none">
        <Text style={{ fontSize: Math.round(size * 0.58), fontWeight: '700', color: tint, marginRight: 2, alignSelf: 'flex-start', marginTop: Math.round(size * 0.14) }}>₱</Text>
        <Text style={{ fontSize: size, fontWeight: '800', letterSpacing: -0.5, color: tint }} numberOfLines={1} adjustsFontSizeToFit>
          {shown}
        </Text>
        {focused && !empty && caret({ marginLeft: 3 })}
      </View>
      {/* Before anything is typed, the cursor sits in the middle of the grey ₱0.00. */}
      {focused && empty && caret({ position: 'absolute', alignSelf: 'center' })}
      <TextInput
        ref={inputRef}
        value={buffer}
        onChangeText={handleChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        autoFocus={autoFocus}
        keyboardType={allowDecimals ? 'decimal-pad' : 'number-pad'}
        caretHidden
        contextMenuHidden
        accessibilityLabel="Amount"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, color: 'transparent' },
});
