// ============================================================
// FI Scenario Comparison (Checkpoint B.12b-3)
// ============================================================
// Compares the FI Calculator's current "Base Plan" (whatever's saved on
// the Savings screen right now) against a hypothetical "What-If Plan" —
// change any field below and see how the FI number/timeline shift,
// without touching what's actually saved. Mirrors the structure of
// LoanPayoffSimulatorModal.tsx (Snowball vs. Avalanche) for visual/
// interaction consistency. Reuses computeFiScenario for 100% of the
// math, so this can never drift from what the FI Calculator itself shows.
// ============================================================

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { formatPeso } from '../balanceProjection';
import { computeFiScenario, FiScenarioInputs } from '../fiScenario';

type Props = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  baseInputs: FiScenarioInputs;
};

export default function SavingsFiComparisonModal({ visible, onClose, colors, baseInputs }: Props) {
  const [expensesInput, setExpensesInput] = useState('');
  const [guaranteedIncomeInput, setGuaranteedIncomeInput] = useState('');
  const [savingsInput, setSavingsInput] = useState('');
  const [swrInput, setSwrInput] = useState('');
  const [returnInput, setReturnInput] = useState('');
  const [monthlySavingsInput, setMonthlySavingsInput] = useState('');
  const styles = makeStyles(colors);

  const whatIfInputs: FiScenarioInputs = useMemo(() => {
    const parsed = (raw: string, fallback: number) => {
      if (raw.trim() === '') return fallback;
      const n = parseFloat(raw);
      return isNaN(n) ? fallback : n;
    };
    return {
      annualExpenses: parsed(expensesInput, baseInputs.annualExpenses),
      guaranteedAnnualIncome: parsed(guaranteedIncomeInput, baseInputs.guaranteedAnnualIncome),
      currentSavings: parsed(savingsInput, baseInputs.currentSavings),
      swrPct: parsed(swrInput, baseInputs.swrPct),
      expectedReturnPct: parsed(returnInput, baseInputs.expectedReturnPct),
      monthlySavings: parsed(monthlySavingsInput, baseInputs.monthlySavings),
    };
  }, [expensesInput, guaranteedIncomeInput, savingsInput, swrInput, returnInput, monthlySavingsInput, baseInputs]);

  const base = useMemo(() => computeFiScenario(baseInputs), [baseInputs]);
  const whatIf = useMemo(() => computeFiScenario(whatIfInputs), [whatIfInputs]);

  const fiNumberDiff =
    base.fiNumber !== null && whatIf.fiNumber !== null ? whatIf.fiNumber - base.fiNumber : null;
  const monthsDiff =
    base.monthsUntilFi !== null && whatIf.monthsUntilFi !== null
      ? whatIf.monthsUntilFi - base.monthsUntilFi
      : null;

  function resetWhatIf() {
    setExpensesInput('');
    setGuaranteedIncomeInput('');
    setSavingsInput('');
    setSwrInput('');
    setReturnInput('');
    setMonthlySavingsInput('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Compare Scenarios</Text>
            <Text style={styles.sub}>
              Base Plan is whatever's currently saved on this screen. Change any field below to see a
              What-If Plan next to it — nothing here changes what's actually saved.
            </Text>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Base Plan</Text>
                <Text style={styles.statValue}>{base.fiNumber !== null ? formatPeso(base.fiNumber) : '—'}</Text>
                <Text style={styles.statNote}>
                  {base.timelineLabel !== null ? base.timelineLabel + ' until FI' : 'Not enough info yet'}
                </Text>
              </View>
              <View style={[styles.statCard, styles.statCardActive]}>
                <Text style={styles.statLabel}>What-If Plan</Text>
                <Text style={styles.statValue}>
                  {whatIf.fiNumber !== null ? formatPeso(whatIf.fiNumber) : '—'}
                </Text>
                <Text style={styles.statNote}>
                  {whatIf.timelineLabel !== null ? whatIf.timelineLabel + ' until FI' : 'Not enough info yet'}
                </Text>
              </View>
            </View>

            {fiNumberDiff !== null && Math.abs(fiNumberDiff) > 1 && (
              <Text style={styles.hintText}>
                What-If changes your FI number by {fiNumberDiff > 0 ? '+' : '-'}
                {formatPeso(Math.abs(fiNumberDiff))}
                {monthsDiff !== null && monthsDiff !== 0
                  ? monthsDiff < 0
                    ? ' and gets you there sooner.'
                    : ' and pushes your timeline out.'
                  : ''}
              </Text>
            )}

            <Text style={styles.sectionTitle}>What-If Plan inputs</Text>

            <Text style={styles.inputLabel}>Annual expenses</Text>
            <TextInput
              style={styles.input}
              placeholder={!isNaN(baseInputs.annualExpenses) ? String(baseInputs.annualExpenses) : 'e.g. 600000'}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={expensesInput}
              onChangeText={setExpensesInput}
            />

            <Text style={styles.inputLabel}>Pension / Social Security (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder={String(baseInputs.guaranteedAnnualIncome || 0)}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={guaranteedIncomeInput}
              onChangeText={setGuaranteedIncomeInput}
            />

            <Text style={styles.inputLabel}>Current savings / investments</Text>
            <TextInput
              style={styles.input}
              placeholder={String(baseInputs.currentSavings || 0)}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={savingsInput}
              onChangeText={setSavingsInput}
            />

            <Text style={styles.inputLabel}>Safe withdrawal rate (%)</Text>
            <TextInput
              style={styles.input}
              placeholder={String(baseInputs.swrPct || 4.0)}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={swrInput}
              onChangeText={setSwrInput}
            />

            <Text style={styles.inputLabel}>Expected annual return (%)</Text>
            <TextInput
              style={styles.input}
              placeholder={!isNaN(baseInputs.expectedReturnPct) ? String(baseInputs.expectedReturnPct) : 'e.g. 6'}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={returnInput}
              onChangeText={setReturnInput}
            />

            <Text style={styles.inputLabel}>Monthly savings toward FI</Text>
            <TextInput
              style={styles.input}
              placeholder={!isNaN(baseInputs.monthlySavings) ? String(baseInputs.monthlySavings) : '0.00'}
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={monthlySavingsInput}
              onChangeText={setMonthlySavingsInput}
            />

            <TouchableOpacity style={styles.resetButton} onPress={resetWhatIf}>
              <Text style={styles.resetButtonText}>Reset What-If to Base Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
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
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '88%',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    title: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 8 },
    sub: { fontSize: 12.5, color: colors.inkDim, marginBottom: 16, lineHeight: 18 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.navy2,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    statCardActive: { borderColor: colors.gold },
    statLabel: { fontSize: 10, letterSpacing: 0.5, color: colors.inkDim, marginBottom: 4 },
    statValue: { fontSize: 17, fontWeight: '700', color: colors.ink },
    statNote: { fontSize: 10.5, color: colors.inkFaint, marginTop: 3 },
    hintText: { fontSize: 11.5, color: colors.inkFaint, marginBottom: 14, lineHeight: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 6, marginBottom: 10 },
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
      marginBottom: 12,
    },
    resetButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
    resetButtonText: { fontSize: 12.5, color: colors.gold, fontWeight: '600' },
    closeButton: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
    closeButtonText: { fontSize: 13, color: colors.inkDim, fontWeight: '600' },
  });
}