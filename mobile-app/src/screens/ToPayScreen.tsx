import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import SegmentedControl from '../components/SegmentedControl';
import { setToPaySub, requestToPayAdd } from '../fabActions';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';
import LoansScreen from './LoansScreen';
import { subscribeToOpenBillRequest, OpenBillRequest } from '../openBillRequest';
import { subscribeToOpenDebtRequest, OpenDebtRequest } from '../openDebtRequest';
import { subscribeToOpenLoanRequest, OpenLoanRequest } from '../openLoanRequest';
import { subscribeToToPayTabRequest, consumePendingToPayTab } from '../openToPayTabRequest';

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
  }, [activeSubTab]);
  // Redesign: a + in the title bar too, like the mockup (adds a bill, debt or loan).
  const navigation = useNavigation<any>();
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={requestToPayAdd}
          accessibilityRole="button"
          accessibilityLabel={activeSubTab === 'bills' ? 'Add a bill' : activeSubTab === 'debts' ? 'Add a debt' : 'Add a loan'}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={28} color={colors.gold} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, activeSubTab, colors.gold]);
  const styles = makeStyles(colors);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.switcherRow}>
        <SegmentedControl<SubTab>
          accessibilityLabel="Show"
          options={TOPAY_TABS.map((t) => ({ id: t.id, label: t.label, testID: `topay-tab-${t.id}` }))}
          value={activeSubTab}
          onChange={setActiveSubTab}
        />
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
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    switcherRow: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    contentWrap: { flex: 1 },
  });
}
