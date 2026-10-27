import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { TextProps, TextInputProps, TextStyle } from 'react-native';
import { useTextScale } from '../textSize';

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
    // Version 2.2 (Impeccable/taste polish, Cath approved P1): no extra-bold or black
    // anywhere; those weights draw as bold, so the app reads calmer.
    case '800':
    case 'heavy':
    case '900':
    case 'black':
      return NUNITO_FAMILIES.bold;
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

// Text size setting (Settings › Appearance, see textSize.ts): scales the font size and
// line height. Text with no size of its own is React Native's default 14. Nested text
// with no size of its own already inherits its parent's scaled size, so it is left alone.
const RN_DEFAULT_SIZE = 14;

// Version 2.2 (approved P1): every number lines up digit by digit (tabular figures), so
// amounts in a list sit in neat columns. A style with its own fontVariant keeps it.
const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };
function sizeStyleFor(style: TextProps['style'], scale: number, nested: boolean) {
  if (scale === 1) return null;
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const size = typeof flat.fontSize === 'number' ? flat.fontSize : nested ? null : RN_DEFAULT_SIZE;
  if (size === null) return null;
  const out: TextStyle = { fontSize: Math.round(size * scale * 10) / 10 };
  if (typeof flat.lineHeight === 'number') out.lineHeight = Math.round(flat.lineHeight * scale * 10) / 10;
  return out;
}

// 2.2 speed fix: lined-up digits only on text that has a number in it (amounts, dates),
// not on every word in the app.
const HAS_DIGIT = /[0-9]/;
function hasDigits(children: React.ReactNode): boolean {
  if (typeof children === 'string') return HAS_DIGIT.test(children);
  if (typeof children === 'number') return true;
  if (Array.isArray(children)) return children.some((c) => typeof c === 'number' || (typeof c === 'string' && HAS_DIGIT.test(c)));
  return false;
}

function isPlain(children: React.ReactNode): boolean {
  if (children == null || typeof children === 'string' || typeof children === 'number' || typeof children === 'boolean') return true;
  if (Array.isArray(children)) return children.every((c) => c == null || typeof c === 'string' || typeof c === 'number' || typeof c === 'boolean');
  return false;
}

export const Text = forwardRef<RNText, TextProps>(function AppText({ style, ...rest }, ref) {
  const inherited = useContext(ParentWeight);
  const scale = useTextScale();
  const { font, weight } = fontStyleFor(style, inherited);
  const size = sizeStyleFor(style, scale, inherited !== null);
  const extra = hasDigits(rest.children) ? [TABULAR, style, font, size] : font || size ? [style, font, size] : style;
  // 2.2 speed sweep: plain words or numbers (most text in the app) have no text inside
  // them to pass the weight on to, so they skip the extra wrapper. That's about half the
  // pieces the phone has to redraw on every screen.
  if (isPlain(rest.children)) return <RNText ref={ref} {...rest} style={extra} />;
  return (
    <ParentWeight.Provider value={(weight ?? '400') as Weight}>
      <RNText ref={ref} {...rest} style={extra} />
    </ParentWeight.Provider>
  );
});

// autoFocus: puts the cursor in this field (and opens the keyboard) when it appears.
// React Native's own autoFocus often does nothing inside a sheet that is still sliding
// up (especially on Android), so the field is focused a moment after it appears instead.
const AUTO_FOCUS_DELAY_MS = 350;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput({ style, autoFocus, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) || {}) as TextStyle;
  const scale = useTextScale();
  const innerRef = useRef<RNTextInput>(null);
  useImperativeHandle(ref, () => innerRef.current as RNTextInput);
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => innerRef.current?.focus(), AUTO_FOCUS_DELAY_MS);
    return () => clearTimeout(t);
    // Only when the field first appears (or autoFocus is switched on).
  }, [autoFocus]);
  const font = !fontsReady || flat.fontFamily ? null : { fontFamily: nunitoFor(flat.fontWeight), fontWeight: 'normal' as const };
  const size = sizeStyleFor(style, scale, false);
  // 2.2 speed fix: no lined-up-digits setting on text boxes (changing it while typing can
  // make typing lag on Android).
  return <RNTextInput ref={innerRef} {...rest} style={font || size ? [style, font, size] : style} />;
});
