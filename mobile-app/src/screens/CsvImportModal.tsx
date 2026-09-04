import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { setAutoLockSuppressed } from '../autoLockSuppress';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso } from '../balanceProjection';
import {
  parseTransactionsCsv,
  CsvParseResult,
  CsvColumnMapping,
  CsvTargetField,
  CSV_TARGET_FIELDS,
  applyCsvMapping,
  flagDuplicateRows,
} from '../csvImport';
import type { ManualTransaction, HouseholdModel } from '../types';
import { makeId } from '../utils';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const TARGET_LABELS: Record<CsvTargetField, string> = {
  date: 'Date',
  label: 'Label',
  amount: 'Amount',
  direction: 'Direction',
};

function defaultAssignments(headers: string[], detectedMapping: CsvColumnMapping): Record<string, CsvTargetField | null> {
  const assignments: Record<string, CsvTargetField | null> = {};
  headers.forEach((header) => {
    const field = (Object.keys(detectedMapping) as CsvTargetField[]).find(
      (key) => detectedMapping[key] === header
    ) ?? null;
    assignments[header] = field;
  });
  return assignments;
}

function mappingFromAssignments(
  assignments: Record<string, CsvTargetField | null>,
  headers: string[]
): CsvColumnMapping {
  const next: CsvColumnMapping = { date: null, label: null, amount: null, direction: null };
  headers.forEach((header) => {
    const field = assignments[header];
    if (field) next[field] = header;
  });
  return next;
}

export default function CsvImportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [columnAssignments, setColumnAssignments] = useState<Record<string, CsvTargetField | null>>({});
  const [mappingMenuOpen, setMappingMenuOpen] = useState(false);
  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const [excludedDuplicateRows, setExcludedDuplicateRows] = useState<Set<number>>(new Set());

  const previewRows = useMemo(() => {
    if (!result || result.headerError || !model || Object.keys(columnAssignments).length === 0) {
      return null;
    }
    const mapping = mappingFromAssignments(columnAssignments, result.headers);
    const mapped = applyCsvMapping(result, mapping);
    const flagged = flagDuplicateRows(mapped.validRows, model.manualTransactions || []);
    return { ...mapped, validRows: flagged };
  }, [result, columnAssignments, model]);

  useEffect(() => {
    if (!previewRows) return;
    const duplicateRows = previewRows.validRows
      .filter((row) => row.isPossibleDuplicate)
      .map((row) => row.rowNumber);
    setExcludedDuplicateRows(new Set(duplicateRows));
  }, [previewRows]);

  function resetState() {
    setFileName(null);
    setResult(null);
    setColumnAssignments({});
    setSelectedHeader(null);
    setErrorMsg('');
    setDoneMsg('');
    setExcludedDuplicateRows(new Set());
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function openMappingMenu(header: string) {
    setSelectedHeader(header);
    setMappingMenuOpen(true);
  }

  function setHeaderTarget(field: CsvTargetField | null) {
    if (!selectedHeader) return;
    const next: Record<string, CsvTargetField | null> = { ...columnAssignments };
    Object.keys(next).forEach((header) => {
      if (next[header] === field) delete next[header];
    });
    if (field) next[selectedHeader] = field;
    setColumnAssignments(next);
    setMappingMenuOpen(false);
    setSelectedHeader(null);
  }

  async function handlePickFile() {
    setErrorMsg('');
    setDoneMsg('');
    setAutoLockSuppressed(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const nameLower = (asset.name || '').toLowerCase();
      if (!nameLower.endsWith('.csv') && !nameLower.endsWith('.txt')) {
        setErrorMsg("That doesn't look like a CSV file (it should end in .csv). If you exported from a spreadsheet app, make sure you chose \"CSV\" as the export format, not Excel (.xlsx).");
        return;
      }
      setLoading(true);
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = parseTransactionsCsv(text);
      setFileName(asset.name || 'CSV file');
      setResult(parsed);
      if (!parsed.headerError) {
        setColumnAssignments(defaultAssignments(parsed.headers, parsed.detectedMapping));
      }
    } catch (e) {
      setErrorMsg("Couldn't read that file. Make sure it's a plain CSV file, then try again.");
    } finally {
      setLoading(false);
      setAutoLockSuppressed(false);
    }
  }

  const importableRows = previewRows?.validRows.filter((row) => {
    if (!row.isPossibleDuplicate) return true;
    return !excludedDuplicateRows.has(row.rowNumber);
  }) ?? [];

  async function handleConfirmImport() {
    if (!model || !previewRows || importableRows.length === 0) {
      setErrorMsg('There are no rows ready to import after your review.');
      return;
    }
    setImporting(true);
    try {
      const newTxns: ManualTransaction[] = importableRows.map((r) => ({
        id: makeId('txn'),
        date: r.date,
        label: r.label,
        amount: r.amount,
        direction: r.direction,
        owner: 'shared',
        category: 'Imported',
      }));
      const updated: HouseholdModel = {
        ...model,
        manualTransactions: [...(model.manualTransactions || []), ...newTxns],
      };
      await saveModel(updated);
      setDoneMsg(`Imported ${newTxns.length} transaction${newTxns.length === 1 ? '' : 's'}.`);
      setResult(null);
      setFileName(null);
      setColumnAssignments({});
      setExcludedDuplicateRows(new Set());
    } catch (e) {
      setErrorMsg("Something went wrong saving these — please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Import from CSV</Text>
            <Text style={styles.helpText}>
              Pick a CSV file with a header row containing date, label, amount, and
              (optionally) direction columns. Dates can be YYYY-MM-DD or MM/DD/YYYY.
              Direction can be in, out, or saving — left blank, a row is treated as
              money out.
            </Text>

            {!doneMsg && (
              <TouchableOpacity style={styles.pickButton} onPress={handlePickFile} disabled={loading}>
                <Text style={styles.pickButtonText}>
                  {fileName ? `Change file (${fileName})` : '📄 Choose a CSV file'}
                </Text>
              </TouchableOpacity>
            )}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loadingText}>Reading file…</Text>
              </View>
            )}

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            {!!doneMsg && <Text style={styles.doneText}>{doneMsg}</Text>}

            {result && result.headerError && (
              <Text style={styles.errorText}>{result.headerError}</Text>
            )}

            {result && !result.headerError && (
              <View>
                <Text style={styles.summaryText}>Map each column before previewing rows.</Text>
                {result.headers.map((header, idx) => {
                  const mappedField = columnAssignments[header] ?? null;
                  const display = mappedField ? TARGET_LABELS[mappedField] : 'Choose field';
                  return (
                    <View key={`${header}-${idx}`} style={styles.mappingRow}>
                      <View style={styles.mappingHeaderWrap}>
                        <Text style={styles.mappingHeaderText} numberOfLines={1}>{header || `Column ${idx + 1}`}</Text>
                      </View>
                      <TouchableOpacity style={styles.mappingSelect} onPress={() => openMappingMenu(header)}>
                        <Text style={styles.mappingSelectText}>{display}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {previewRows && (
                  <>
                    <Text style={styles.summaryText}>
                      Found {previewRows.rows.length} row{previewRows.rows.length === 1 ? '' : 's'}:{' '}
                      {previewRows.validRows.length} ready to import
                      {previewRows.invalidRows.length > 0 ? `, ${previewRows.invalidRows.length} skipped` : ''}
                      .
                    </Text>

                    {previewRows.validRows.slice(0, 8).map((r) => {
                      const isDuplicate = !!r.isPossibleDuplicate;
                      const excluded = isDuplicate && excludedDuplicateRows.has(r.rowNumber);
                      return (
                        <View key={r.rowNumber} style={[styles.previewRow, isDuplicate && styles.previewRowDuplicate]}>
                          <View style={styles.previewMain}>
                            <View style={styles.previewTopLine}>
                              <Text style={styles.previewLabel} numberOfLines={1}>{r.label}</Text>
                              {isDuplicate && (
                                <Text style={[styles.badge, excluded ? styles.badgeMuted : styles.badgeWarning]}>
                                  {excluded ? 'Possible duplicate — excluded' : 'Possible duplicate'}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.previewSub}>{r.date} · {r.direction}</Text>
                            {isDuplicate && (
                              <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() =>
                                  setExcludedDuplicateRows((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(r.rowNumber)) next.delete(r.rowNumber);
                                    else next.add(r.rowNumber);
                                    return next;
                                  })
                                }
                              >
                                <View style={[styles.checkbox, !excluded && styles.checkboxChecked]}>
                                  {!excluded && <Text style={styles.checkboxMark}>✓</Text>}
                                </View>
                                <Text style={styles.checkboxText}>{excluded ? 'Include in import' : 'Exclude from import'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={styles.previewAmount}>{formatPeso(r.amount)}</Text>
                        </View>
                      );
                    })}
                    {previewRows.validRows.length > 8 && (
                      <Text style={styles.moreText}>
                        + {previewRows.validRows.length - 8} more row{previewRows.validRows.length - 8 === 1 ? '' : 's'}
                      </Text>
                    )}

                    {previewRows.invalidRows.length > 0 && (
                      <View style={styles.invalidBox}>
                        <Text style={styles.invalidTitle}>Skipped rows</Text>
                        {previewRows.invalidRows.slice(0, 6).map((r) => (
                          <Text key={r.rowNumber} style={styles.invalidLine}>
                            Row {r.rowNumber}: {r.error}
                          </Text>
                        ))}
                        {previewRows.invalidRows.length > 6 && (
                          <Text style={styles.invalidLine}>
                            + {previewRows.invalidRows.length - 6} more
                          </Text>
                        )}
                      </View>
                    )}

                    {importableRows.length > 0 && (
                      <TouchableOpacity
                        style={styles.importConfirmButton}
                        onPress={handleConfirmImport}
                        disabled={importing}
                      >
                        {importing ? (
                          <ActivityIndicator color={colors.navy2} />
                        ) : (
                          <Text style={styles.importConfirmButtonText}>
                            Import {importableRows.length} transaction{importableRows.length === 1 ? '' : 's'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>{doneMsg ? 'Done' : 'Cancel'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>

      <Modal visible={mappingMenuOpen} transparent animationType="fade" onRequestClose={() => setMappingMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMappingMenuOpen(false)}>
          <Pressable style={styles.mappingModalCard} onPress={() => {}}>
            <Text style={styles.title}>Choose field</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => setHeaderTarget(null)}>
              <Text style={styles.optionText}>Unmapped</Text>
            </TouchableOpacity>
            {CSV_TARGET_FIELDS.map((field) => (
              <TouchableOpacity key={field} style={styles.optionButton} onPress={() => setHeaderTarget(field)}>
                <Text style={styles.optionText}>{TARGET_LABELS[field]}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      maxHeight: '85%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    helpText: { fontSize: 12, color: colors.inkDim, lineHeight: 17, marginBottom: 16 },
    pickButton: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    pickButtonText: { fontSize: 13.5, fontWeight: '600', color: colors.gold },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    loadingText: { fontSize: 12.5, color: colors.inkDim },
    errorText: { fontSize: 12.5, color: '#e5484d', marginBottom: 12, lineHeight: 17 },
    doneText: { fontSize: 13.5, color: '#2f9e44', fontWeight: '600', marginBottom: 12 },
    summaryText: { fontSize: 12.5, color: colors.inkDim, marginBottom: 10, lineHeight: 17 },
    mappingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 8,
    },
    mappingHeaderWrap: { flex: 1, overflow: 'hidden' },
    mappingHeaderText: { fontSize: 12.5, color: colors.ink, fontWeight: '600' },
    mappingSelect: {
      minWidth: 120,
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    mappingSelectText: { fontSize: 12.5, color: colors.gold, fontWeight: '600' },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      marginBottom: 6,
    },
    previewRowDuplicate: { borderWidth: 1, borderColor: '#f59e0b' },
    previewMain: { flex: 1, marginRight: 8 },
    previewTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    previewLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },
    previewSub: { fontSize: 11.5, color: colors.inkDim, marginTop: 2 },
    previewAmount: { fontSize: 13, fontWeight: '700', color: colors.ink },
    badge: { fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999 },
    badgeWarning: { backgroundColor: '#fef3c7', color: '#92400e' },
    badgeMuted: { backgroundColor: colors.navy1, color: colors.inkDim },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.inkDim,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    checkboxChecked: { backgroundColor: colors.gold, borderColor: colors.gold },
    checkboxMark: { fontSize: 10, color: colors.navy2, fontWeight: '700' },
    checkboxText: { fontSize: 11.5, color: colors.inkDim },
    moreText: { fontSize: 11.5, color: colors.inkFaint, marginTop: 6, marginBottom: 10 },
    invalidBox: {
      marginTop: 12,
      backgroundColor: colors.navy2,
      borderRadius: 8,
      padding: 10,
    },
    invalidTitle: { fontSize: 11.5, color: colors.inkDim, fontWeight: '700', marginBottom: 4 },
    invalidLine: { fontSize: 11.5, color: '#e5484d', marginTop: 2 },
    importConfirmButton: {
      backgroundColor: colors.gold,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    importConfirmButtonText: { fontSize: 13.5, fontWeight: '700', color: colors.navy2 },
    closeButton: { marginTop: 12, alignItems: 'center' },
    closeButtonText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    mappingModalCard: {
      width: '100%',
      maxWidth: 280,
      backgroundColor: colors.navy3,
      borderRadius: 12,
      padding: 18,
    },
    optionButton: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    optionText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  });
}
