import React from 'react';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// Cath, 2026-10-23 ("both"): every field in every form says what it is. A red * after the
// label = the form can't be saved without it (also when it's filled in for you, like
// today's date or Repeats: Once); a grey "(optional)" = it can be left empty. On/off
// switches carry neither.
export type FieldMark = 'required' | 'optional';
export function MarkedLabel({ text, mark, style }: { text: string; mark?: FieldMark; style?: any }) {
  const { colors } = useTheme();
  return (
    <Text style={style} accessibilityLabel={mark === 'required' ? `${text}, required` : mark === 'optional' ? `${text}, optional` : undefined}>
      {text}
      {mark === 'required' && <Text style={{ color: colors.error, fontWeight: '700' }}> *</Text>}
      {mark === 'optional' && <Text style={{ color: colors.inkFaint, fontWeight: '400' }}> (optional)</Text>}
    </Text>
  );
}

