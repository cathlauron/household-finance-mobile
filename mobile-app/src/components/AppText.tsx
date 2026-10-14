import React, { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { TextProps, TextInputProps, TextStyle } from 'react-native';

// Redesign: the app's rounded font (Nunito, the Finance Flow design system font).
//
// Every screen imports `Text` and `TextInput` from this file instead of from
// 'react-native'. These are the normal React Native components with one change: they
// pick the matching Nunito file for the text's fontWeight, because custom fonts can't
// be made bold just by setting fontWeight (Android ignores it or fakes it).
//
// - A style that already names its own fontFamily (monospace codes, serif headings) is
//   left exactly as it was.
// - Nested text without its own fontWeight keeps its parent's weight, so
//   <Text style={{ fontWeight: '700' }}>Total <Text style={{ color }}>₱500</Text></Text>
//   stays bold all the way through, same as before.
// - The font files are loaded in App.tsx (useFonts). Until they finish loading the app
//   shows its loading spinner, so nothing ever draws in a missing font.

export const NUNITO_FAMILIES = {
  light: 'Nunito_300Light',
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

type Weight = NonNullable<TextStyle['fontWeight']>;

export function nunitoFor(weight: Weight | undefined): string {
  switch (String(weight ?? '400')) {
    case '100':
    case '200':
    case '300':
    case 'ultralight':
    case 'thin':
    case 'light':
      return NUNITO_FAMILIES.light;
    case '500':
    case 'medium':
      return NUNITO_FAMILIES.medium;
    case '600':
    case 'semibold':
      return NUNITO_FAMILIES.semibold;
    case '700':
    case 'bold':
      return NUNITO_FAMILIES.bold;
    case '800':
    case 'heavy':
      return NUNITO_FAMILIES.extrabold;
    case '900':
    case 'black':
      return NUNITO_FAMILIES.black;
    default:
      return NUNITO_FAMILIES.regular;
  }
}

// Set to true by App.tsx once the Nunito files are loaded. If they fail to load, this
// stays false and text simply uses the phone's normal font.
let fontsReady = false;
export function setFontsReady(ready: boolean) {
  fontsReady = ready;
}

// The weight the surrounding <Text> is using, so nested text can inherit it.
const ParentWeight = createContext<Weight | null>(null);

function fontStyleFor(style: TextProps['style'], inherited: Weight | null) {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  if (!fontsReady || flat.fontFamily) return { font: null, weight: flat.fontWeight ?? inherited };
  const weight = flat.fontWeight ?? inherited ?? undefined;
  // Nested text with no weight of its own: inherit the parent's font (no override).
  if (inherited !== null && flat.fontWeight === undefined) return { font: null, weight };
  return {
    font: { fontFamily: nunitoFor(weight), fontWeight: 'normal' as const },
    weight: weight ?? '400',
  };
}

export const Text = forwardRef<RNText, TextProps>(function AppText({ style, ...rest }, ref) {
  const inherited = useContext(ParentWeight);
  const { font, weight } = fontStyleFor(style, inherited);
  return (
    <ParentWeight.Provider value={(weight ?? '400') as Weight}>
      <RNText ref={ref} {...rest} style={font ? [style, font] : style} />
    </ParentWeight.Provider>
  );
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const font = !fontsReady || flat.fontFamily ? null : { fontFamily: nunitoFor(flat.fontWeight), fontWeight: 'normal' as const };
  return <RNTextInput ref={ref} {...rest} style={font ? [style, font] : style} />;
});
