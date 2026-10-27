import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import SlidingPages from '../components/SlidingPages';
import { useNavigation } from '@react-navigation/native';
import { TAB_ORDER } from '../navigation/tabDrag';
import { setToPaySub } from '../fabActions';
import { closeOpenSwipeRows } from '../components/SwipeableRow';
import { useStickyState } from '../stickyState';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';
import LoansScreen from './LoansScreen';
import { subscribeToOpenBillRequest, OpenBillRequest } from '../openBillRequest';
import { subscribeToOpenDebtRequest, OpenDebtRequest } from '../openDebtRequest';
import { subscribeToOpenLoanRequest, OpenLoanRequest } from '../openLoanRequest';
import { subscribeToToPayTabRequest, consumePendingToPayTab } from '../openToPayTabRequest';

import { Ionicons } from '@expo/vector-icons';

type SubTab = 'bills' | 'debts' | 'loans';

// The reminder (bill id) that last opened this screen on Bills.
let lastHandledOpenBillId: string | undefined;

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
  const [activeSubTab, setActiveSubTab] = useStickyState<SubTab>('toPay.sub', 'bills');
  const [swipeOpenRequest, setSwipeOpenRequest] = useState<OpenBillRequest | null>(null);
  const [swipeOpenDebtRequest, setSwipeOpenDebtRequest] = useState<OpenDebtRequest | null>(null);
  const [swipeOpenLoanRequest, setSwipeOpenLoanRequest] = useState<OpenLoanRequest | null>(null);

  // B.14: a subscription-reminder deep-link always means "open the Bills
  // sub-tab", regardless of whichever sub-tab was last active.
  // Only once per reminder: if this screen is rebuilt later with the same id still
  // attached, it must not jump back to Bills.
  useEffect(() => {
    if (initialOpenBillId && initialOpenBillId !== lastHandledOpenBillId) {
      lastHandledOpenBillId = initialOpenBillId;
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
  // Home's Amount Owed card: "just show me this sub-tab". Also clears any
  // old "open this item" request so a previously viewed item doesn't reopen.
  useEffect(() => {
    function showTab(tab: SubTab) {
      setSwipeOpenRequest(null);
      setSwipeOpenDebtRequest(null);
      setSwipeOpenLoanRequest(null);
      setActiveSubTab(tab);
    }
    const pending = consumePendingToPayTab();
    if (pending) showTab(pending);
    return subscribeToToPayTabRequest(showTab);
  }, []);
  // Redesign: tell the floating + which list is showing, so it adds the right thing.
  useEffect(() => {
    setToPaySub(activeSubTab);
    closeOpenSwipeRows();
  }, [activeSubTab]);
  // (The Bill | Debt | Loan switch forms live in navigation/PaySwitchHost.tsx.)
  const styles = makeStyles(colors);
  // Version 2.1: swipe between Bills, Debts and Loans. Smoothness 2026-10-23 (Cath picked
  // "follows your finger"): the pages now slide with your finger, and past Loans or Bills
  // they bounce instead of jumping to Plan / Transactions (use the tab bar for those).
  // Changed the same afternoon (Cath): past Loans / before Bills the next main tab comes in
  // with your finger and you land there, like swiping between tabs.
  const navigation = useNavigation<any>();
  const toPayIndex = TAB_ORDER.indexOf('To-Pay');
  return (
    <SafeAreaView style={styles.container}>
      <SlidingPages<SubTab>
        testID="topay-pages"
        accessibilityLabel="Show"
        options={TOPAY_TABS.map((t) => ({ id: t.id, label: t.label, testID: `topay-tab-${t.id}` }))}
        value={activeSubTab}
        onChange={setActiveSubTab}
        switcherWrapStyle={styles.switcherRow}
        edgeToTabs={{ index: toPayIndex, count: TAB_ORDER.length, go: (d) => navigation.navigate(TAB_ORDER[toPayIndex + d]) }}
        renderPage={(id) =>
          id === 'bills' ? (
            <BillsScreen
              openBillId={swipeOpenRequest ? swipeOpenRequest.billId : initialOpenBillId}
              openBillNonce={swipeOpenRequest ? swipeOpenRequest.nonce : undefined}
            />
          ) : id === 'debts' ? (
            <DebtsScreen
              openDebtId={swipeOpenDebtRequest ? swipeOpenDebtRequest.debtId : undefined}
              openDebtNonce={swipeOpenDebtRequest ? swipeOpenDebtRequest.nonce : undefined}
              onOpenHandled={() => setSwipeOpenDebtRequest(null)}
            />
          ) : (
            <LoansScreen
              openLoanId={swipeOpenLoanRequest ? swipeOpenLoanRequest.loanId : undefined}
              openLoanNonce={swipeOpenLoanRequest ? swipeOpenLoanRequest.nonce : undefined}
              onOpenHandled={() => setSwipeOpenLoanRequest(null)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    switcherRow: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
  });
}
