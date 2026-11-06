import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import Button from './Button';
import { askToRemove } from '../askToRemove';
import DateField from './DateField';
import Guided, { useFieldErrors } from './Guided';
import { InlineAmount, InlineField } from './SimpleForm';

// Cath, 2026-11-06 (mockup scenes 3 and 4): tapping an item on a trip's Budget or To-do list,
// or "Add", opens this right there in the list: item, cost, note and date. One piece for both
// lists, so they stay the same.
export type TripDraft = { title: string; cost: number | ''; note: string; date: string };

type Props = {
  kind: 'item' | 'todo';
  initial?: Partial<TripDraft>;
  isNew?: boolean;
  paid?: boolean;
  onSave: (draft: TripDraft) => void;
  onCancel: () => void;
  // Remove always asks first: "remove" is the question and its note.
  remove?: { title: string; note: string; onYes: () => void };
};

export default function TripItemDrop({ kind, initial, isNew, paid, onSave, onCancel, remove }: Props) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [cost, setCost] = useState<number | ''>(initial?.cost ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const errors = useFieldErrors<'title'>();

  function save() {
    const name = title.trim();
    if (!name) {
      errors.show('title', kind === 'item' ? 'What is this item?' : 'What is this to-do?');
      return;
    }
    onSave({ title: name, cost, note: note.trim(), date });
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }} testID="trip-drop">
      <Guided {...errors.props('title')} inset={false}>
        <InlineField
          mark="required"
          label="Item"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            errors.clear();
          }}
          placeholder={kind === 'item' ? 'e.g. Bus tickets, Hotel' : 'e.g. Pack jackets'}
          testID="trip-drop-title"
          autoFocus={isNew}
        />
      </Guided>
      <InlineAmount mark="optional" label="Cost" value={cost} onChange={setCost} testID="trip-drop-cost" />
      <InlineField mark="optional" label="Note" value={note} onChangeText={setNote} placeholder="e.g. Booked on Agoda, check-in 2 PM" testID="trip-drop-note" />
      <DateField mark="optional" label={kind === 'item' ? 'Due date' : 'Date'} value={date} onChange={setDate} placeholder="Pick a date" clearable testID="trip-drop-date" />
      {paid && <Text style={{ fontSize: 13, color: colors.inkDim, marginTop: 8 }}>Already paid. Changing the cost updates its payment.</Text>}
      {kind === 'todo' && <Text style={{ fontSize: 13, color: colors.inkDim, marginTop: 8 }}>A cost here is only a reminder. It isn't added to the budget.</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        {!!remove && <Button label="Remove" variant="destructive" size="compact" onPress={() => askToRemove(remove.title, remove.note, remove.onYes)} testID="trip-drop-remove" />}
        <View style={{ flex: 1 }} />
        <Button label="Cancel" variant="quiet" size="compact" onPress={onCancel} testID="trip-drop-cancel" />
        <Button label={isNew ? 'Add' : 'Save'} size="compact" onPress={save} testID="trip-drop-save" />
      </View>
    </View>
  );
}
