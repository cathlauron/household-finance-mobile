import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';
import LoansScreen from './LoansScreen';
import { subscribeToOpenBillRequest, OpenBillRequest } from '../openBillRequest';
import { subscribeToOpenDebtRequest, OpenDebtRequest } from '../openDebtRequest';
import { subscribeToOpenLoanRequest, OpenLoanRequest } from '../openLoanRequest';

import { Ionicons } from '@expo/vector-icons';

type SubTab = 'bills' | 'debts' | 'loans';

const TOPAY_TABS: { id: SubTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'bills', label: 'Bills', icon: 'receipt-outline' },
  { id: 'debts', label: 'Debts', icon: 'card-outline' },
  { id: 'loans', label: 'Loans', icon: 'business-outline' },
];

interface ToPayScreenProps {
  initialOpenBillId?: string;
}

export default function ToPayScreen({ initialOpenBillId }: ToPayScreenProps) {
  const { colors } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('bills');
  const [swipeOpenRequest, setSwipeOpenRequest] = useState<OpenBillRequest | null>(null);
  const [swipeOpenDebtRequest, setSwipeOpenDebtRequest] = useState<OpenDebtRequest | null>(null);
  const [swipeOpenLoanRequest, setSwipeOpenLoanRequest] = useState<OpenLoanRequest | null>(null);

  // B.14: a subscription-reminder deep-link always means "open the Bills
  // sub-tab", regardless of whichever sub-tab was last active.
  useEffect(() => {
    if (initialOpenBillId) {
      setActiveSubTab('bills');
    }
  }, [initialOpenBillId]);

  // Swiping a Bill-sourced transaction on TransactionsScreen fires this —
  // same "always land on Bills" behavior as the notification deep-link,
  // but via a fresh in-memory request instead of a navigation param, so it
  // works without remounting the tab bar and works on repeat swipes too.
  useEffect(() => {
    return subscribeToOpenBillRequest((request) => {
      setSwipeOpenRequest(request);
      setActiveSubTab('bills');
    });
  }, []);
  useEffect(() => {
    return subscribeToOpenDebtRequest((request) => {
      setSwipeOpenDebtRequest(request);
      setActiveSubTab('debts');
    });
  }, []);
  useEffect(() => {
    return subscribeToOpenLoanRequest((request) => {
      setSwipeOpenLoanRequest(request);
      setActiveSubTab('loans');
    });
  }, []);
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.switcherRow}>
        {TOPAY_TABS.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.switcherBtn, isActive && styles.switcherBtnActive]}
              onPress={() => setActiveSubTab(tab.id)}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.navy2 : colors.inkDim} style={{ marginRight: 6 }} />
              <Text style={[styles.switcherBtnText, isActive && styles.switcherBtnTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.contentWrap}>
        {activeSubTab === 'bills' && (
          <BillsScreen
            openBillId={swipeOpenRequest ? swipeOpenRequest.billId : initialOpenBillId}
            openBillNonce={swipeOpenRequest ? swipeOpenRequest.nonce : undefined}
          />
        )}
        {activeSubTab === 'debts' && (
          <DebtsScreen
            openDebtId={swipeOpenDebtRequest ? swipeOpenDebtRequest.debtId : undefined}
            openDebtNonce={swipeOpenDebtRequest ? swipeOpenDebtRequest.nonce : undefined}
          />
        )}
        {activeSubTab === 'loans' && (
          <LoansScreen
            openLoanId={swipeOpenLoanRequest ? swipeOpenLoanRequest.loanId : undefined}
            openLoanNonce={swipeOpenLoanRequest ? swipeOpenLoanRequest.nonce : undefined}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    switcherRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    switcherBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: colors.navy3,
    },
    switcherBtnActive: { backgroundColor: colors.gold },
    switcherBtnText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    switcherBtnTextActive: { color: colors.navy2 },
    contentWrap: { flex: 1 },
  });
}
