import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { hapticMedium } from '../haptics';
import { ScrollIntoViewContext } from './KeyboardAwareScrollView';

// Version 2.1: when a form can't be saved yet, take the person straight to what's missing.
// Wrap a field in <Guided {...errors.props('name')}>. When the form calls
// errors.show('name', 'Enter a name for this bill.'), that field scrolls into view, the
// message appears right under it in red, the phone gives a small buzz, and (if a
// focusRef is given) the cursor goes into the field. The message clears as soon as the
// form calls errors.clear() (forms do that when the person changes something).

export function useFieldErrors<F extends string>() {
  const [state, setState] = useState<{ field: F | null; msg: string; key: number }>({ field: null, msg: '', key: 0 });
  const show = useCallback((field: F, msg: string) => setState((s) => ({ field, msg, key: s.key + 1 })), []);
  const clear = useCallback(() => setState((s) => (s.field ? { field: null, msg: '', key: s.key } : s)), []);
  const props = (field: F): { error?: string; errorKey: number } =>
    state.field === field ? { error: state.msg, errorKey: state.key } : { error: undefined, errorKey: 0 };
  return { show, clear, props, field: state.field };
}

export default function Guided({
  error,
  errorKey,
  focusRef,
  onShow,
  inset = true,
  radius = 0,
  children,
}: {
  error?: string;
  errorKey: number;
  focusRef?: React.RefObject<{ focus: () => void } | null>;
  // Called when the field is pointed at, e.g. to open a picker row.
  onShow?: () => void;
  // true inside a white form group (message lines up with the row's text).
  inset?: boolean;
  // Rounds the soft red background (e.g. 22 for the big amount on its own).
  radius?: number;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const ctx = useContext(ScrollIntoViewContext);
  const ref = useRef<View>(null);
  useEffect(() => {
    if (!error || !errorKey) return;
    hapticMedium();
    onShow?.();
    const t1 = setTimeout(() => ctx?.scrollIntoView(ref.current), 60);
    const t2 = setTimeout(() => focusRef?.current?.focus(), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // Runs once per attempt: errorKey goes up every time the form asks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorKey]);
  return (
    // Approved Option B look: a soft red background behind the field while it needs fixing.
    <View ref={ref} collapsable={false} style={error ? { backgroundColor: colors.errorBg, borderRadius: radius } : undefined}>
      {children}
      {!!error && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: inset ? 16 : 0, justifyContent: inset ? 'flex-start' : 'center', paddingTop: 2, paddingBottom: 10 }}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={{ flexShrink: 1, color: colors.error, fontSize: 14, fontWeight: '700' }}>{error}</Text>
        </View>
      )}
    </View>
  );
}
