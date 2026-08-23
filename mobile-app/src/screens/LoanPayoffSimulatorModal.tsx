// ============================================================
// Loan Payoff Simulator (Checkpoint 5.3c)
// ============================================================
// A month-by-month projection comparing two payoff strategies across every
// currently-open "borrowed" loan (loans marked "lent" — money owed TO you —
// are excluded, since paying those down isn't a cost to you):
//
//   Snowball  — pay off the smallest balance first (fastest early wins)
//   Avalanche — pay off the highest interest rate first (least total interest)
//
// Any extra monthly amount typed in gets funneled entirely at whichever loan
// is "first" under the selected strategy, once every loan's own minimum
// payment has been covered — the standard snowball/avalanche method.
//
// This is a lightweight, text/stat-card based simulator (no chart library),
// matching the rest of the app's current level of polish. A visual chart is
// a reasonable follow-up later, not required for this to be useful now.
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

export type SimLoanInput = {
  id: string;
  name: string;
  balance: number;
  rate: number; // annual percentage, e.g. 12 means 12%
  hasRate: boolean;
  minPayment: number;
  hasMinPayment: boolean;
};

type Strategy = 'snowball' | 'avalanche';

type SimResult = {
  months: number;
  totalInterest: number;
  hitCap: boolean;
  order: string[]; // loan ids, in payoff order for this strategy
  payoffMonth: Record<string, number>;
};

const MAX_MONTHS = 600; // 50 years — a safety cap so a pathological input can't loop forever

function simulate(loans: SimLoanInput[], strategy: Strategy, extraMonthly: number): SimResult | null {
  if (!loans.length) return null;

  const working = loans.map((l) => ({
    id: l.id,
    balance: l.balance,
    rate: l.rate,
    // Same fallback the web app's own simulator uses: 2% of balance (min 1) when no
    // minimum payment is set, so the simulation can still run.
    minPayment: l.hasMinPayment && l.minPayment > 0 ? l.minPayment : Math.max(l.balance * 0.02, 1),
  }));

  const order =
    strategy === 'snowball'
      ? [...working].sort((a, b) => a.balance - b.balance)
      : [...working].sort((a, b) => b.rate - a.rate || a.balance - b.balance);

  const extra = Math.max(0, extraMonthly);
  let months = 0;
  let totalInterest = 0;
  const payoffMonth: Record<string, number> = {};

  while (working.some((l) => l.balance > 0.01) && months < MAX_MONTHS) {
    months++;
    order.forEach((od) => {
      const l = working.find((x) => x.id === od.id)!;
      if (l.balance <= 0) return;
      const interest = l.balance * (l.rate / 100 / 12);
      totalInterest += interest;
      l.balance += interest;
      const pay = Math.min(l.minPayment, l.balance);
      l.balance -= pay;
    });
    let leftover = extra;
    for (const od of order) {
      if (leftover <= 0) break;
      const l = working.find((x) => x.id === od.id)!;
      if (l.balance <= 0) continue;
      const pay = Math.min(leftover, l.balance);
      l.balance -= pay;
      leftover -= pay;
    }
    order.forEach((od) => {
      const l = working.find((x) => x.id === od.id)!;
      if (l.balance <= 0.01 && payoffMonth[od.id] === undefined) payoffMonth[od.id] = months;
    });
  }

  return {
    months,
    totalInterest,
    hitCap: months >= MAX_MONTHS,
    order: order.map((o) => o.id),
    payoffMonth,
  };
}

function monthsLabel(months: number): string {
  if (months <= 0) return '0 months';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(y + 'yr');
  if (m > 0 || !y) parts.push(m + 'mo');
  return parts.join(' ');
}

type Props = {
  visible: boolean;
  onClose: () => void;
  loans: SimLoanInput[];
  colors: any;
};

export default function LoanPayoffSimulatorModal({ visible, onClose, loans, colors }: Props) {
  const [strategy, setStrategy] = useState<Strategy>('avalanche');
  const [extraInput, setExtraInput] = useState('');
  const styles = makeStyles(colors);

  const extraMonthly = useMemo(() => {
    const n = parseFloat(extraInput);
    return isNaN(n) ? 0 : n;
  }, [extraInput]);

  const snowball = useMemo(() => simulate(loans, 'snowball', extraMonthly), [loans, extraMonthly]);
  const avalanche = useMemo(() => simulate(loans, 'avalanche', extraMonthly), [loans, extraMonthly]);
  const active = strategy === 'snowball' ? snowball : avalanche;

  const namesById = useMemo(() => {
    const map: Record<string, string> = {};
    loans.forEach((l) => (map[l.id] = l.name));
    return map;
  }, [loans]);

  const usedFallback = loans.some((l) => !l.hasRate || !l.hasMinPayment);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Loan Payoff Simulator</Text>

            {loans.length === 0 ? (
              <Text style={styles.emptyText}>
                No outstanding borrowed loans to simulate — add a loan or check back once one has a
                balance remaining.
              </Text>
            ) : (
              <>
                <Text style={styles.sub}>
                  Compares paying smallest-balance-first (Snowball) against highest-interest-first
                  (Avalanche), with any extra you can put toward it each month.
                </Text>

                <Text style={styles.inputLabel}>Extra payment per month (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkFaint}
                  keyboardType="decimal-pad"
                  value={extraInput}
                  onChangeText={setExtraInput}
                />

                {usedFallback && (
                  <Text style={styles.hintText}>
                    Some loans are missing an interest rate or expected payment — this estimate
                    assumes 0% and a small default payment for those, so treat it as rough. Add the
                    missing details on those loans for a more accurate result.
                  </Text>
                )}

                <View style={styles.statRow}>
                  <TouchableOpacity
                    style={[styles.statCard, strategy === 'snowball' && styles.statCardActive]}
                    onPress={() => setStrategy('snowball')}
                  >
                    <Text style={styles.statLabel}>Snowball</Text>
                    <Text style={styles.statValue}>{snowball ? monthsLabel(snowball.months) : '—'}</Text>
                    <Text style={styles.statNote}>
                      {snowball
                        ? formatPeso(snowball.totalInterest) +
                          ' interest' +
                          (snowball.hitCap ? ' (50yr+ cap)' : '')
                        : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statCard, strategy === 'avalanche' && styles.statCardActive]}
                    onPress={() => setStrategy('avalanche')}
                  >
                    <Text style={styles.statLabel}>Avalanche</Text>
                    <Text style={styles.statValue}>{avalanche ? monthsLabel(avalanche.months) : '—'}</Text>
                    <Text style={styles.statNote}>
                      {avalanche
                        ? formatPeso(avalanche.totalInterest) +
                          ' interest' +
                          (avalanche.hitCap ? ' (50yr+ cap)' : '')
                        : ''}
                    </Text>
                  </TouchableOpacity>
                </View>

                {snowball && avalanche && Math.abs(snowball.totalInterest - avalanche.totalInterest) > 1 && (
                  <Text style={styles.hintText}>
                    Avalanche saves {formatPeso(Math.abs(snowball.totalInterest - avalanche.totalInterest))}{' '}
                    in interest compared to Snowball here.
                  </Text>
                )}

                <Text style={styles.orderTitle}>
                  Payoff order — {strategy === 'snowball' ? 'Snowball' : 'Avalanche'}
                </Text>
                {active &&
                  active.order.map((id, i) => (
                    <View key={id} style={styles.orderRow}>
                      <Text style={styles.orderRowText} numberOfLines={1}>
                        {i + 1}. {namesById[id] || 'Loan'}
                      </Text>
                      <Text style={styles.orderRowMonths}>
                        {active.payoffMonth[id] !== undefined ? monthsLabel(active.payoffMonth[id]) : '—'}
                      </Text>
                    </View>
                  ))}
              </>
            )}

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
    emptyText: { fontSize: 13, color: colors.inkFaint, fontStyle: 'italic', marginBottom: 16 },
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
      marginBottom: 10,
    },
    hintText: { fontSize: 11.5, color: colors.inkFaint, marginBottom: 14, lineHeight: 16 },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
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
    orderTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 16, marginBottom: 8 },
    orderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.navy2,
    },
    orderRowText: { fontSize: 12.5, color: colors.inkDim, flex: 1, marginRight: 10 },
    orderRowMonths: { fontSize: 12.5, color: colors.ink, fontWeight: '600' },
    closeButton: { alignItems: 'center', paddingVertical: 12, marginTop: 16 },
    closeButtonText: { fontSize: 13, color: colors.inkDim, fontWeight: '600' },
  });
}
