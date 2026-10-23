import React from 'react';
import { View } from 'react-native';
import DateField from './DateField';
import { Choices, InlineField } from './SimpleForm';

// Version 2.2 (Cath: Custom for bills and debts, same as loans): how often, when it
// starts, and (optionally) how many times.
export const CUSTOM_FREQS = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

export function customFreqLabel(f: string): string {
  return f === 'biweekly' ? 'Every 2 weeks' : f.charAt(0).toUpperCase() + f.slice(1);
}

export default function CustomScheduleFields({
  freq,
  onFreq,
  start,
  onStart,
  count,
  onCount,
  testID,
}: {
  freq: string;
  onFreq: (f: string) => void;
  start: string;
  onStart: (d: string) => void;
  count: string;
  onCount: (c: string) => void;
  testID?: string;
}) {
  return (
    <View>
      <Choices options={CUSTOM_FREQS.map((f) => ({ id: f, label: customFreqLabel(f) }))} value={freq} onChange={onFreq} />
      <View style={{ height: 10 }} />
      <DateField label="Starts on" value={start} onChange={onStart} placeholder="Pick a date" testID={testID} />
      <InlineField label="How many times (optional)" value={count} onChangeText={onCount} placeholder="e.g. 12" keyboardType="number-pad" />
    </View>
  );
}

// Checks the custom fields; returns an error message, or the parsed count.
export function parseCustom(start: string, count: string): { error: string } | { count: number | '' } {
  const s = start.trim();
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return { error: 'Pick the date it starts.' };
  if (!count.trim()) return { count: '' };
  const n = parseInt(count, 10);
  if (isNaN(n) || n <= 0) return { error: 'How many times? Type a number above 0.' };
  return { count: n };
}
