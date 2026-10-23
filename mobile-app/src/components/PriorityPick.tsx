import React from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { Choices } from './SimpleForm';
import { PRIORITIES, Priority, priorityLabel } from '../priority';

// Version 2.2 (canvas K2): the Priority choice used in the bill, debt and loan forms.
// Tapping the chosen one again clears it.
export default function PriorityPick({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.inkDim, marginBottom: 6 }}>Priority</Text>
      <Choices
        options={PRIORITIES.map((p) => ({ id: p, label: priorityLabel(p) }))}
        value={value || ''}
        onChange={(p) => onChange(value === p ? '' : p)}
      />
      <Text style={{ fontSize: 12, lineHeight: 17, color: colors.inkDim, marginTop: 6 }}>
        High = pay this first when money is tight (e.g. big interest or late fees).
      </Text>
    </View>
  );
}
