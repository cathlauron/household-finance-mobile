import React, { useState, useEffect } from 'react';
import { SwipeTabs } from '../navigation/swipeTabs';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';
import SegmentedControl from '../components/SegmentedControl';
import { setToPaySub, onToPaySwitchAdd, AddCarry } from '../fabActions';
import { useData } from '../DataContext';
import { SHEET_CLOSE_WAIT } from '../components/BottomSheet';
import { expectArrival } from '../arrivalFocus';
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
  const { getModel } = useData();
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
  // Version 2.2 (Cath): Bill | Debt | Loan switch on a New form. The other kind's form
  // opens here, over this list, with what was typed; this list only changes to that kind
  // once it's been added (so you see it there).
  // More than one can be there for a moment while one form hands over to the next.
  const [switchForms, setSwitchForms] = useState<{ sub: SubTab; carry: AddCarry; nonce: number }[]>([]);
  useEffect(
    () =>
      onToPaySwitchAdd((sub, carry) => {
        const m = getModel();
        // So the list can find, light up and scroll to the new one after Add.
        if (m) expectArrival(sub, (sub === 'bills' ? m.bills : sub === 'debts' ? m.debts : m.loans).map((x: { id: string }) => x.id));
        setSwitchForms((list) => [...list, { sub, carry, nonce: Date.now() }]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  // After its sheet has slid away, the extra form is let go.
  const endSwitchForm = (nonce: number) => setTimeout(() => setSwitchForms((list) => list.filter((f) => f.nonce !== nonce)), 500);
  const styles = makeStyles(colors);
  const navigation = useNavigation<any>();
  // Version 2.1: swipe between Bills, Debts and Loans; past either end it carries on to
  // the next tab (Transactions / Plan).
  function swipeSub(d: 1 | -1) {
    const i = TOPAY_TABS.findIndex((t) => t.id === activeSubTab) + d;
    if (i >= 0 && i < TOPAY_TABS.length) setActiveSubTab(TOPAY_TABS[i].id);
    else navigation.navigate(d > 0 ? 'Plan' : 'Transactions');
  }
  return (
    <SwipeTabs inner onSwipe={swipeSub}>
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
            onOpenHandled={() => setSwipeOpenDebtRequest(null)}
          />
        )}
        {activeSubTab === 'loans' && (
          <LoansScreen
            openLoanId={swipeOpenLoanRequest ? swipeOpenLoanRequest.loanId : undefined}
            openLoanNonce={swipeOpenLoanRequest ? swipeOpenLoanRequest.nonce : undefined}
            onOpenHandled={() => setSwipeOpenLoanRequest(null)}
          />
        )}
      </View>
      {switchForms.map((f) => (
        <View key={f.nonce} pointerEvents="box-none" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
          {(() => {
            const common = {
              formOnly: true,
              addCarry: { ...f.carry, nonce: f.nonce },
              onFormClosed: () => endSwitchForm(f.nonce),
              // After the form has slid away, show that list (the new one slides in there).
              onAdded: () =>
                setTimeout(() => {
                  setActiveSubTab(f.sub);
                  // Opened from somewhere else (the calendar): come back to To-Pay to see it.
                  navigation.navigate('Main', { screen: 'To-Pay' });
                }, SHEET_CLOSE_WAIT),
            };
            return f.sub === 'bills' ? (
              <BillsScreen key={f.nonce} {...common} />
            ) : f.sub === 'debts' ? (
              <DebtsScreen key={f.nonce} {...common} />
            ) : (
              <LoansScreen key={f.nonce} {...common} />
            );
          })()}
        </View>
      ))}
    </SafeAreaView>
    </SwipeTabs>
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
