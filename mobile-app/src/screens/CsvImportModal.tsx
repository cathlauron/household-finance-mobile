import React, { useState } from 'react';
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
import { parseTransactionsCsv, CsvParseResult } from '../csvImport';
import type { ManualTransaction, HouseholdModel } from '../types';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CsvImportModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { model, saveModel } = useData();
  const styles = makeStyles(colors);

  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  function resetState() {
    setFileName(null);
    setResult(null);
    setErrorMsg('');
    setDoneMsg('');
  }

  function handleClose() {
    resetState();
    onClose();
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
    } catch (e) {
      setErrorMsg("Couldn't read that file. Make sure it's a plain CSV file, then try again.");
    } finally {
      setLoading(false);
      setAutoLockSuppressed(false);
    }
  }

  async function handleConfirmImport() {
    if (!model || !result || result.validRows.length === 0) return;
    setImporting(true);
    try {
      const newTxns: ManualTransaction[] = result.validRows.map((r) => ({
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
                <Text style={styles.summaryText}>
                  Found {result.rows.length} row{result.rows.length === 1 ? '' : 's'}:{' '}
                  {result.validRows.length} ready to import
                  {result.invalidRows.length > 0
                    ? `, ${result.invalidRows.length} skipped (see below)`
                    : ''}
                  .
                </Text>

                {result.validRows.slice(0, 8).map((r) => (
                  <View key={r.rowNumber} style={styles.previewRow}>
                    <View style={styles.previewMain}>
                      <Text style={styles.previewLabel} numberOfLines={1}>{r.label}</Text>
                      <Text style={styles.previewSub}>{r.date} · {r.direction}</Text>
                    </View>
                    <Text style={styles.previewAmount}>{formatPeso(r.amount)}</Text>
                  </View>
                ))}
                {result.validRows.length > 8 && (
                  <Text style={styles.moreText}>
                    + {result.validRows.length - 8} more row{result.validRows.length - 8 === 1 ? '' : 's'}
                  </Text>
                )}

                {result.invalidRows.length > 0 && (
                  <View style={styles.invalidBox}>
                    <Text style={styles.invalidTitle}>Skipped rows</Text>
                    {result.invalidRows.slice(0, 6).map((r) => (
                      <Text key={r.rowNumber} style={styles.invalidLine}>
                        Row {r.rowNumber}: {r.error}
                      </Text>
                    ))}
                    {result.invalidRows.length > 6 && (
                      <Text style={styles.invalidLine}>
                        + {result.invalidRows.length - 6} more
                      </Text>
                    )}
                  </View>
                )}

                {result.validRows.length > 0 && (
                  <TouchableOpacity
                    style={styles.importConfirmButton}
                    onPress={handleConfirmImport}
                    disabled={importing}
                  >
                    {importing ? (
                      <ActivityIndicator color={colors.navy2} />
                    ) : (
                      <Text style={styles.importConfirmButtonText}>
                        Import {result.validRows.length} transaction{result.validRows.length === 1 ? '' : 's'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>{doneMsg ? 'Done' : 'Cancel'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
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
    previewMain: { flex: 1, marginRight: 8 },
    previewLabel: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
    previewSub: { fontSize: 10.5, color: colors.inkFaint, marginTop: 1 },
    previewAmount: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
    moreText: { fontSize: 11.5, color: colors.inkFaint, marginBottom: 10 },
    invalidBox: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      padding: 10,
      marginTop: 4,
      marginBottom: 14,
    },
    invalidTitle: { fontSize: 11, fontWeight: '700', color: colors.inkDim, marginBottom: 6 },
    invalidLine: { fontSize: 11, color: colors.inkFaint, marginBottom: 3 },
    importConfirmButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 12,
    },
    importConfirmButtonText: { fontSize: 14, fontWeight: '700', color: colors.navy2 },
    closeButton: { alignItems: 'center', paddingVertical: 8 },
    closeButtonText: { fontSize: 13, color: colors.inkDim },
  });
}
