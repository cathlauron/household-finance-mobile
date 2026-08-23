import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import type { Category, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// A small fixed palette to pick from — mirrors the set of colors the original web app
// auto-assigns to new categories, just offered as tappable swatches here instead of a
// native color picker (React Native has no built-in one).
const COLOR_PALETTE = [
  '#E76F51', '#2A9D8F', '#264653', '#E9C46A', '#F4A261',
  '#6D28D9', '#2563EB', '#EA580C', '#059669', '#DC2626',
  '#9333EA', '#0891B2', '#D97706', '#DB2777', '#78716C',
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState(COLOR_PALETTE[0]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const categories = [...model.categories].sort((a, b) => a.name.localeCompare(b.name));

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setColorInput(COLOR_PALETTE[model!.categories.length % COLOR_PALETTE.length]);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(cat: Category) {
    setEditingId(cat.id);
    setNameInput(cat.name);
    setColorInput(cat.color);
    setErrorMsg('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (!model) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMsg('Give the category a name.');
      return;
    }
    const duplicate = model.categories.find(
      (c) => c.id !== editingId && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('You already have a category with that name.');
      return;
    }

    let updatedCategories: Category[];
    if (editingId) {
      updatedCategories = model.categories.map((c) =>
        c.id === editingId ? { ...c, name: trimmed, color: colorInput } : c
      );
    } else {
      const newCat: Category = {
        id: makeId('cat'),
        name: trimmed,
        color: colorInput,
        parentId: null,
      };
      updatedCategories = [...model.categories, newCat];
    }

    const updated: HouseholdModel = { ...model, categories: updatedCategories };
    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categories: model.categories.filter((c) => c.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionSub}>
          Manage the category names and colors used across Bills, Debts, and Transactions.
        </Text>

        {categories.length === 0 && (
          <Text style={styles.emptyText}>No categories yet. Add your first one below.</Text>
        )}

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => openEditModal(cat)}
          >
            <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
            <Text style={styles.rowName} numberOfLines={1}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add category</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit category' : 'New category'}</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.swatchRow}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    colorInput === c && styles.swatchActive,
                  ]}
                  onPress={() => setColorInput(c)}
                />
              ))}
            </View>

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete this category</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    sectionSub: { fontSize: 12.5, color: colors.inkDim, marginBottom: 16, lineHeight: 17 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    row: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
    rowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
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
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    swatchActive: { borderWidth: 3, borderColor: colors.ink },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
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
  });
}