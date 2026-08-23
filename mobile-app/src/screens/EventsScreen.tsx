import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import type { EventItem, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

const EVENT_TYPES: { id: EventItem['type']; label: string }[] = [
  { id: 'birthday', label: 'Birthday' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'other', label: 'Other' },
];

function isValidDateOrEmpty(s: string): boolean {
  if (s.trim() === '') return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

function eventDateLabel(ev: EventItem): string {
  if (ev.recurrence === 'onetime') {
    return ev.onetimeDate ? ev.onetimeDate : 'No date set';
  }
  if (typeof ev.month === 'number' && typeof ev.day === 'number') {
    return 'Every ' + String(ev.month).padStart(2, '0') + '/' + String(ev.day).padStart(2, '0');
  }
  return 'No date set';
}

function typeLabel(t: EventItem['type']): string {
  const found = EVENT_TYPES.find((x) => x.id === t);
  return found ? found.label : 'Event';
}

export default function EventsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [typeInput, setTypeInput] = useState<EventItem['type']>('birthday');
  const [recurrenceInput, setRecurrenceInput] = useState<EventItem['recurrence']>('annual');
  const [monthInput, setMonthInput] = useState('');
  const [dayInput, setDayInput] = useState('');
  const [onetimeDateInput, setOnetimeDateInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [completedInput, setCompletedInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!model) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent ?? colors.gold} />
      </View>
    );
  }

  const events: EventItem[] = model.events ?? [];

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setTypeInput('birthday');
    setRecurrenceInput('annual');
    setMonthInput('');
    setDayInput('');
    setOnetimeDateInput('');
    setBudgetInput('');
    setCompletedInput(false);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(ev: EventItem) {
    setEditingId(ev.id);
    setNameInput(ev.name);
    setTypeInput(ev.type);
    setRecurrenceInput(ev.recurrence);
    setMonthInput(typeof ev.month === 'number' ? String(ev.month) : '');
    setDayInput(typeof ev.day === 'number' ? String(ev.day) : '');
    setOnetimeDateInput(ev.onetimeDate ?? '');
    setBudgetInput(typeof ev.budget === 'number' ? String(ev.budget) : '');
    setCompletedInput(!!ev.completed);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSaveEvent() {
    if (!model) return;
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setErrorMsg('Enter an event name.');
      return;
    }

    let month: number | '' = '';
    let day: number | '' = '';
    let onetimeDate = '';

    if (recurrenceInput === 'annual') {
      if (monthInput.trim() !== '') {
        const m = parseInt(monthInput, 10);
        if (isNaN(m) || m < 1 || m > 12) {
          setErrorMsg('Month must be a number from 1 to 12.');
          return;
        }
        month = m;
      }
      if (dayInput.trim() !== '') {
        const d = parseInt(dayInput, 10);
        if (isNaN(d) || d < 1 || d > 31) {
          setErrorMsg('Day must be a number from 1 to 31.');
          return;
        }
        day = d;
      }
    } else {
      if (!isValidDateOrEmpty(onetimeDateInput)) {
        setErrorMsg('Date must be in YYYY-MM-DD format, or left blank.');
        return;
      }
      onetimeDate = onetimeDateInput.trim();
    }

    let budget: number | '' = '';
    if (budgetInput.trim() !== '') {
      const n = parseFloat(budgetInput);
      if (isNaN(n)) {
        setErrorMsg('Enter a valid budget, or leave it blank.');
        return;
      }
      budget = n;
    }

    const currentList = model.events ?? [];
    let updatedList: EventItem[];
    if (editingId) {
      updatedList = currentList.map((ev) =>
        ev.id === editingId
          ? {
              ...ev,
              name: trimmedName,
              type: typeInput,
              recurrence: recurrenceInput,
              month,
              day,
              onetimeDate,
              budget,
              completed: completedInput,
              completedDate: completedInput
                ? ev.completedDate ?? new Date().toISOString().slice(0, 10)
                : undefined,
            }
          : ev
      );
    } else {
      const newEvent: EventItem = {
        id: makeId('event'),
        name: trimmedName,
        type: typeInput,
        recurrence: recurrenceInput,
        month,
        day,
        onetimeDate,
        budget,
        completed: completedInput,
        completedDate: completedInput ? new Date().toISOString().slice(0, 10) : undefined,
        createdAt: Date.now(),
      };
      updatedList = [...currentList, newEvent];
    }

    const updated: HouseholdModel = { ...model, events: updatedList };
    await saveModel(updated);
    closeModal();
  }

  async function handleDeleteEvent() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      events: (model.events ?? []).filter((ev) => ev.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionIntro}>
          Birthdays, anniversaries, whatever's worth planning for — each year, or a one-time date.
        </Text>

        {events.length === 0 && (
          <Text style={styles.emptyText}>No events yet. Add your first one below.</Text>
        )}

        {events.map((ev) => (
          <TouchableOpacity
            key={ev.id}
            style={styles.eventRow}
            activeOpacity={0.7}
            onPress={() => openEditModal(ev)}
          >
            <View style={styles.eventRowMain}>
              <Text style={styles.eventName} numberOfLines={1}>
                {ev.name || 'Untitled event'}
                {ev.completed ? '  ✓' : ''}
              </Text>
              <Text style={styles.eventSub}>
                {typeLabel(ev.type)} · {eventDateLabel(ev)}
              </Text>
            </View>
            {typeof ev.budget === 'number' && (
              <Text style={styles.eventAmount}>{formatPeso(ev.budget)}</Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add event</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{editingId ? 'Edit event' : 'New event'}</Text>

                <Text style={styles.inputLabel}>Event name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mom's birthday, Wedding anniversary"
                  placeholderTextColor={colors.inkFaint}
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pillRow}>
                  {EVENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.smallPill, typeInput === t.id && styles.smallPillActive]}
                      onPress={() => setTypeInput(t.id)}
                    >
                      <Text style={[styles.smallPillText, typeInput === t.id && styles.smallPillTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Recurs</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[styles.smallPill, recurrenceInput === 'annual' && styles.smallPillActive]}
                    onPress={() => setRecurrenceInput('annual')}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        recurrenceInput === 'annual' && styles.smallPillTextActive,
                      ]}
                    >
                      Annual
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPill, recurrenceInput === 'onetime' && styles.smallPillActive]}
                    onPress={() => setRecurrenceInput('onetime')}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        recurrenceInput === 'onetime' && styles.smallPillTextActive,
                      ]}
                    >
                      One-time
                    </Text>
                  </TouchableOpacity>
                </View>

                {recurrenceInput === 'annual' ? (
                  <View style={styles.rowTwoCol}>
                    <View style={styles.rowTwoColItem}>
                      <Text style={styles.inputLabel}>Month (1–12)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 6"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={monthInput}
                        onChangeText={setMonthInput}
                      />
                    </View>
                    <View style={styles.rowTwoColItem}>
                      <Text style={styles.inputLabel}>Day (1–31)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 15"
                        placeholderTextColor={colors.inkFaint}
                        keyboardType="number-pad"
                        value={dayInput}
                        onChangeText={setDayInput}
                      />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="2026-06-15"
                      placeholderTextColor={colors.inkFaint}
                      value={onetimeDateInput}
                      onChangeText={setOnetimeDateInput}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Budget (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                />

                <TouchableOpacity
                  style={[styles.completedToggle, completedInput && styles.completedToggleActive]}
                  onPress={() => setCompletedInput((v) => !v)}
                >
                  <Text
                    style={[
                      styles.completedToggleText,
                      completedInput && styles.completedToggleTextActive,
                    ]}
                  >
                    {completedInput ? '✓ Completed' : 'Not yet'}
                  </Text>
                </TouchableOpacity>

                {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEvent}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>

                {editingId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteEvent}>
                    <Text style={styles.deleteButtonText}>Delete this event</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    sectionIntro: { fontSize: 12.5, color: colors.inkDim, lineHeight: 18, marginBottom: 16 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    eventRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventRowMain: { flex: 1, marginRight: 10 },
    eventName: { fontSize: 14, fontWeight: '600', color: colors.ink },
    eventSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    eventAmount: { fontSize: 13.5, fontWeight: '700', color: colors.ink },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    rowTwoCol: { flexDirection: 'row', gap: 10 },
    rowTwoColItem: { flex: 1 },
    pillRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    smallPill: {
      flex: 1,
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
    },
    smallPillActive: { backgroundColor: colors.gold },
    smallPillText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    smallPillTextActive: { color: colors.navy2 },
    completedToggle: {
      backgroundColor: colors.navy2,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginBottom: 14,
    },
    completedToggleActive: { backgroundColor: 'rgba(16,185,129,0.15)' },
    completedToggleText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    completedToggleTextActive: { color: '#10b981' },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonText: { fontSize: 14, fontWeight: '700', color: colors.navy2 },
    deleteButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
    deleteButtonText: { fontSize: 13, color: '#e5484d', fontWeight: '600' },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalKeyboardWrap: { width: '100%', alignItems: 'center', maxHeight: '88%' },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      maxHeight: '100%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  });
}
