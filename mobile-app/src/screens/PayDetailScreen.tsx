import { loanCoverage, loanNextDueDate, isTrackedLoan } from '../loanSchedule';
import { withFeeEntry } from '../payFees';
import { withEntry, withoutEntry } from '../investments';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { alertNotSaved, alertNotDeleted } from '../messages';
import React, { useLayoutEffect, useState } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { showSaved } from '../components/SavedToast';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import { WhoFootnote, useWho } from '../components/WhoLogged';
import GradientFill from '../components/GradientFill';
import PayFromSheet from '../components/PayFromSheet';
import { ReceiptViewer, ReceiptMark } from '../components/ReceiptField';
import UndoPayment from '../components/UndoPayment';
import { editCyclePayment, editLoanPayment, cycleAmountLocked, withLoanPayment, withoutLoanPayment } from '../paymentEdit';
import DeleteRow from '../components/DeleteRow';
import BillsScreen from './BillsScreen';
import DebtsScreen from './DebtsScreen';
import LoansScreen from './LoansScreen';
import { withoutBill, withoutDebt, withoutLoan } from '../deleteRecords';
import { takeOffSavedBalance } from '../takeOffBalance';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, loanOutstandingBalance } from '../balanceProjection';
import { getNextDueDate, recurringTypeLabel } from '../recurrence';
import { currentCycle, paidCycles, markPaid, undoLastPayment, isCyclePaid, minimumDue } from '../billPayments';
import { accountLabel } from '../transactionActions';
import { getOverdueItems } from '../overdue';
import { makeId } from '../utils';
import { todayISO, dateText } from '../dateUtils';
import type { ThemeColors } from '../theme';
import type { Bill, Debt, Loan, HouseholdModel, PaymentMethod, LoanPayment } from '../types';

// Redesign: the Bill, Debt and Loan pages from the Finance Flow mockups (BillDetail,
// LoanDetail). Tapping one in To-Pay or Home opens this full page.
//  - Bill / debt: icon, name, amount due, due badge, "Mark as paid" (with Undo),
//    the last 6 months as bars, schedule / account / category / reminder, and history.
//  - Loan: an overdue alert with "Log payment", still-to-pay with progress, the
//    totals, and every payment.
// "Edit" opens the usual edit form on To-Pay.

type Kind = 'bill' | 'debt' | 'loan';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}
function niceDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : dateText(d, { weekday: true });
}
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
function scheduleText(r: { recurringType?: string; dueDate?: Record<string, any>; customFreq?: string }): string {
  const d = r.dueDate || {};
  if (r.recurringType === 'monthly') return d.day ? `Every month on the ${d.day === 'last' ? 'last day' : d.day}` : 'Every month';
  if (r.recurringType === 'annual') return d.month && d.day ? `Every year on ${MONTHS[(d.month as number) - 1]} ${d.day}` : 'Every year';
  if (r.recurringType === 'onetime') return 'One time';
  if (r.recurringType === 'custom') return r.customFreq ? `Every ${r.customFreq}` : 'Custom';
  return recurringTypeLabel(r.recurringType || '');
}

export default function PayDetailScreen() {
  const { colors } = useTheme();
  const { model, saveModel, getModel } = useData();
  const who = useWho();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const kind: Kind = route.params?.kind;
  const id: string = route.params?.id;
  const styles = makeStyles(colors);
  // Redesign: "Mark as paid" first asks which account it's paid from.
  const [payOpen, setPayOpen] = useState(false);
  // Cath, 2026-10-27 (canvas R2): a payment with a receipt opens it full size.
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  // H-48 (canvas C2-C3): the payment being edited (tap a row in History).
  const [editCycleId, setEditCycleId] = useState<string | null>(null);

  const record: Bill | Debt | Loan | undefined = !model
    ? undefined
    : kind === 'bill'
    ? model.bills.find((b) => b.id === id)
    : kind === 'debt'
    ? model.debts.find((d) => d.id === id)
    : (model.loans || []).find((l) => l.id === id);

  // Version 2.2 fix (Cath's video): Edit opens the form right here on this page. Before,
  // it jumped back to To-Pay and opened the form there, and the page could slide back over
  // it (the form flashed and closed).
  const [editing, setEditing] = useState(false);
  const openEdit = () => setEditing(true);
  const onEditClosed = () => {
    setEditing(false);
    // Deleted from inside the form: this page has nothing left to show.
    const latest = getModel();
    const list: { id: string }[] = !latest ? [] : kind === 'bill' ? latest.bills : kind === 'debt' ? latest.debts : latest.loans || [];
    if (latest && !list.some((r) => r.id === id)) navigation.goBack();
  };
  const editor = editing ? (
    <View style={{ position: 'absolute', width: 0, height: 0 }} pointerEvents="box-none">
      {kind === 'bill' ? (
        <BillsScreen formOnly openBillId={id} onFormClosed={onEditClosed} />
      ) : kind === 'debt' ? (
        <DebtsScreen formOnly openDebtId={id} onFormClosed={onEditClosed} />
      ) : (
        <LoansScreen formOnly openLoanId={id} onFormClosed={onEditClosed} />
      )}
    </View>
  ) : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerBackTitle: route.params?.backTitle ?? 'To-Pay',
      headerRight: () => (
        <TouchableOpacity onPress={openEdit} accessibilityRole="button" testID="pay-detail-edit">
          <Text style={[headerButtonText, { color: colors.gold }]}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.gold, id, kind]);

  if (!model || !record) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>This isn't here any more.</Text>
      </View>
    );
  }

  async function save(next: HouseholdModel, savedLabel?: string) {
    try {
      await saveModel(next);
      if (savedLabel) showLeafTick(savedLabel);
    } catch {
      Alert.alert(...alertNotSaved('this payment'));
    }
  }

  // Version 2.2 (Cath): Delete at the bottom of the page, same as inside Edit.
  function confirmDelete() {
    const what = kind === 'bill' ? 'bill' : kind === 'debt' ? 'debt' : 'loan';
    Alert.alert(`Delete this ${what}?`, `Deletes the ${what} and all payment history. Cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const latest = getModel() ?? model;
          if (!latest) return;
          const next = kind === 'bill' ? withoutBill(latest, id) : kind === 'debt' ? withoutDebt(latest, id) : withoutLoan(latest, id);
          navigation.goBack();
          saveModel(next).catch(() => Alert.alert(...alertNotDeleted('this item')));
        },
      },
    ]);
  }

  if (kind === 'loan') return (
    <>
      <LoanBody loan={record as Loan} model={model} save={save} colors={colors} styles={styles} onDelete={confirmDelete} />
      {editor}
    </>
  );

  // ---------- Bill / Debt ----------
  const rec = record as Bill | Debt;
  const name = kind === 'bill' ? (rec as Bill).name || 'Untitled bill' : (rec as Debt).creditorOrPerson || 'Debt';
  // Cath, 2026-10-27 (canvas P2): a regular payment (not a bill) is sent, not paid.
  const regular = kind === 'bill' && !!(rec as Bill).regular;
  const cur = currentCycle(rec);
  const curPaid = cur ? isCyclePaid(cur) : true;
  const amount = num(cur?.amountDue);
  // Debts: the least to pay this time (minimum + anything carried over).
  const minDue = kind === 'debt' ? minimumDue(rec, cur) : amount;
  const carried = num(cur?.carriedIn);
  const dueISO = cur?.dueDate || '';
  const today = todayISO();
  const days = dueISO ? daysBetween(today, dueISO) : null;
  const overdue = !curPaid && days !== null && days < 0;
  const history = paidCycles(rec);
  // Review 10-27: the payment Undo takes back is the one undoLastPayment picks (newest paid
  // date, the later one on a tie), so its fee and its date are taken from that same one.
  const lastPaid = (rec.cycles || []).reduce<(typeof rec.cycles)[number] | undefined>((a, c) => (num(c.amountPaid) > 0 && (!a || (c.paidDate || '') >= (a.paidDate || '')) ? c : a), undefined);
  // Paid (or logged, for a back-dated payment) today: Undo stays available.
  // Code review 2026-10-27: a back-dated "Just record it" payment (no paidAt) logged today
  // can be undone too.
  const loggedToday = (() => {
    const at = history[0]?.paidAt ?? history[0]?.loggedAt;
    if (!at) return false;
    const d = new Date(at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === today;
  })();
  const paidToday = history[0]?.paidDate === today || loggedToday;
  const icon = kind === 'debt' ? 'people-outline' : (rec as Bill).isSubscription ? 'repeat' : 'flash-outline';

  // Last 6 months: what was paid each month, with this month's due amount if unpaid.
  const now = new Date();
  const bars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let v = (rec.cycles || []).filter((c) => num(c.amountPaid) > 0 && (c.paidDate || '').startsWith(ym)).reduce((s, c) => s + num(c.amountPaid), 0);
    if (i === 5 && v === 0 && !curPaid && dueISO.startsWith(ym)) v = amount;
    return { label: MONTHS[d.getMonth()], v, now: i === 5 };
  });
  const maxBar = Math.max(1, ...bars.map((b) => b.v));
  const withValues = bars.filter((b) => b.v > 0);
  const average = withValues.length ? withValues.reduce((s, b) => s + b.v, 0) / withValues.length : 0;

  return (
    <>
    <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content}>
      <View style={[styles.group, styles.hero]}>
        <GradientFill match={[styles.group, styles.hero]} />
        <View style={styles.bigTile}>
          <GradientFill match={styles.bigTile} />
          <Ionicons name={icon as any} size={26} color={colors.gold} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.amount, { color: overdue ? colors.negative : colors.ink }]}>{formatPeso(amount)}</Text>
        {/* Version 2.1 (canvas S3): a bill paid in parts shows what's new and what was carried. */}
        {kind === 'bill' && !curPaid && carried > 0 && (
          <View style={{ alignSelf: 'stretch', marginTop: 10, gap: 6 }}>
            <Text style={[styles.badge, { alignSelf: 'center', color: colors.orange, backgroundColor: colors.warnBg }]}>Paying in parts</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.nextDue}>New charges</Text>
              <Text style={styles.nextDue}>{formatPeso(Math.max(0, amount - carried))}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.nextDue}>Carried from last time</Text>
              <Text style={styles.nextDue}>{formatPeso(carried)}</Text>
            </View>
          </View>
        )}
        {kind === 'debt' && !curPaid && (minDue < amount || carried > 0) && (
          <Text style={styles.nextDue}>
            {minDue < amount ? `Minimum ${formatPeso(minDue)}` : ''}
            {minDue < amount && carried > 0 ? ' · ' : ''}
            {carried > 0 ? `includes ${formatPeso(carried)} carried over` : ''}
          </Text>
        )}
        {paidToday ? (
          <Text style={[styles.badge, { color: colors.positive, backgroundColor: colors.okBg }]}>
            {/* Cath 2026-10-27: a back-dated payment says its own date, not "today". */}
            {history[0]?.paidDate === today ? 'Paid today' : `Paid ${shortDate(history[0]?.paidDate || today)}`}
            {history[0]?.investEntryId ? ' · into the investment' : history[0]?.recordedOnly ? ' · recorded only' : history[0]?.paymentMethod ? ` from ${accountLabel(model, history[0].paymentMethod)}` : ''}
          </Text>
        ) : dueISO && !curPaid ? (
          <Text style={[styles.badge, overdue ? { color: colors.negative, backgroundColor: colors.errorBg } : { color: colors.orange, backgroundColor: colors.warnBg }]}>
            {overdue ? `Overdue · was due ${shortDate(dueISO)}` : `Due ${niceDate(dueISO)}${days !== null ? ` · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}`}
          </Text>
        ) : null}
        {paidToday && dueISO && !curPaid && <Text style={styles.nextDue}>Next due {niceDate(dueISO)}</Text>}
        {/* Catching up: when the next one is already past due, Pay stays next to Undo. */}
        {!curPaid && (!paidToday || overdue) && (
          <TouchableOpacity
            testID="pay-detail-mark-paid"
            style={[styles.primary, { backgroundColor: colors.buttonFill }]}
            onPress={() => setPayOpen(true)}
            accessibilityRole="button"
          >
            <GradientFill color={colors.buttonFill} strength={0.18} />
            <Text style={[styles.primaryText, { color: colors.onButton }]}>{regular ? 'Send' : 'Pay'}</Text>
          </TouchableOpacity>
        )}
        {/* H-48 (Cath, 2026-10-29): Undo only for 15 minutes after logging, then edit instead. */}
        <UndoPayment
          loggedAt={lastPaid?.paidAt ?? lastPaid?.loggedAt}
          testID="pay-detail-undo"
          style={{ alignSelf: 'stretch', marginTop: 16 }}
          label={lastPaid?.paidDate === today ? "Undo today's payment" : `Undo the ${shortDate(lastPaid?.paidDate || today)} payment`}
          onUndo={() => {
              const next = undoLastPayment(rec);
              // Code review 2026-10-27: the fee paid with it goes too.
              const feeId = lastPaid?.feeTxnId;
              let base = feeId ? { ...model, manualTransactions: (model.manualTransactions || []).filter((t) => t.id !== feeId) } : model;
              // Paid into an investment: that money comes out of the investment again.
              const invId = kind === 'bill' ? (rec as Bill).investmentId : undefined;
              if (invId && lastPaid?.investEntryId) base = withoutEntry(base, invId, lastPaid.investEntryId);
              save(kind === 'bill' ? { ...base, bills: base.bills.map((b) => (b.id === id ? (next as Bill) : b)) } : { ...base, debts: base.debts.map((d) => (d.id === id ? (next as Debt) : d)) });
          }}
        />
      </View>

      <PayFromSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title={regular ? `Send ${name}` : `Pay ${name}`}
        amount={kind === 'debt' ? minDue : amount}
        direction="out"
        model={model}
        initial={cur?.paymentMethod}
        confirmLabel={regular ? 'Sent' : 'Pay'}
        editableAmount={kind === 'debt'}
        fullAmount={amount}
        minimumAmount={minDue}
        partOption={kind === 'bill' ? { name, repeats: (rec as Bill).recurringType !== 'onetime' } : undefined}
        dueText={dueISO ? `Paying the ${shortDate(dueISO)} ${kind === 'bill' ? 'bill' : 'payment'}` : undefined}
        withReceipt
        onConfirm={(pm, paidAmount, lateFee, date, takeOff, fee, receiptPhoto) => {
          setPayOpen(false);
          // Cath 2026-10-27 (canvas I1 "Every month"): money into an investment. The
          // investment gets it (from this account: a move, not spending); the regular
          // payment is kept as sent in its history only, so nothing counts twice.
          if (kind === 'bill' && (rec as Bill).investmentId) {
            const invId = (rec as Bill).investmentId as string;
            const entryId = makeId('invx');
            const feeTxnId2 = fee > 0 ? makeId('txn') : undefined;
            // Review 10-27: the fee is kept with it, so Undo removes the fee entry too.
            const nextBill = markPaid(rec, undefined, date, paidAmount, 0, { recordedOnly: true, receiptPhoto, investEntryId: entryId, feePaid: fee, feeTxnId: feeTxnId2 });
            let m2: HouseholdModel = withEntry({ ...model, bills: model.bills.map((b) => (b.id === id ? (nextBill as Bill) : b)) }, invId, { id: entryId, date, type: 'add', amount: paidAmount, paymentMethod: pm, createdAt: Date.now() });
            m2 = withFeeEntry(m2, { amount: fee, label: name, date, paymentMethod: pm, id: feeTxnId2 });
            if (takeOff) m2 = takeOffSavedBalance(m2, pm, paidAmount + fee);
            save(m2, 'Sent');
            return;
          }
          const feeTxnId = fee > 0 ? makeId('txn') : undefined;
          const next =
            kind === 'debt'
              ? markPaid(rec, pm, date, paidAmount, lateFee, { feePaid: fee, feeTxnId, receiptPhoto })
              : markPaid(rec, pm, date, paidAmount, 0, { feePaid: fee, feeTxnId, receiptPhoto });
          let updated = kind === 'bill' ? { ...model, bills: model.bills.map((b) => (b.id === id ? (next as Bill) : b)) } : { ...model, debts: model.debts.map((d) => (d.id === id ? (next as Debt) : d)) };
          // Cath 2026-10-27 (canvas R4): a fee paid with it is its own Fees entry.
          updated = withFeeEntry(updated, { amount: fee, label: name, date, paymentMethod: pm, id: feeTxnId });
          if (takeOff) updated = takeOffSavedBalance(updated, pm, paidAmount + fee);
          save(updated, regular ? 'Sent' : paidAmount < amount ? 'Part paid' : 'Paid');
        }}
        // "Just record it": kept in History as paid, no account, nothing else changes.
        onRecord={(paidAmount, fee, date, receiptPhoto) => {
          setPayOpen(false);
          const invId = kind === 'bill' ? (rec as Bill).investmentId : undefined;
          const entryId = invId ? makeId('invx') : undefined;
          const next = markPaid(rec, undefined, date, paidAmount, 0, { recordedOnly: true, feePaid: fee, receiptPhoto, investEntryId: entryId });
          let updated = kind === 'bill' ? { ...model, bills: model.bills.map((b) => (b.id === id ? (next as Bill) : b)) } : { ...model, debts: model.debts.map((d) => (d.id === id ? (next as Debt) : d)) };
          // Into an investment, no account: only the investment changes.
          if (invId && entryId) updated = withEntry(updated, invId, { id: entryId, date, type: 'add', amount: paidAmount, createdAt: Date.now() });
          save(updated, 'Recorded');
        }}
      />

      <View style={[styles.group, { padding: 16, marginTop: 20 }]}>
        <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
        <View style={styles.barsHead}>
          <Text style={styles.headline}>Last 6 months</Text>
          {average > 0 && <Text style={styles.meta}>Average {formatPeso(average).replace('.00', '')}</Text>}
        </View>
        <View style={styles.bars} accessibilityLabel={`Payments for the last 6 months: ${bars.map((b) => `${b.label} ${Math.round(b.v)}`).join(', ')}`}>
          {bars.map((b) => (
            <View key={b.label} style={styles.barCol}>
              <View style={[styles.bar, { height: Math.max(4, (b.v / maxBar) * 48), backgroundColor: b.now ? `${colors.negative}B3` : colors.navy1 }]} />
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.group, { marginTop: 20 }]}>
        <GradientFill match={[styles.group, { marginTop: 20 }]} />
        <Row styles={styles} label="Repeats" value={scheduleText(rec)} />
        <Row styles={styles} label="Pay from" value={accountLabel(model, cur?.paymentMethod) ?? 'Not set'} />
        <Row styles={styles} label="Category" value={rec.category || 'Uncategorized'} />
        <Row styles={styles} label="Remind me" value={`${model.settings.notifyDaysBefore ?? 3} days before`} last />
      </View>

      {/* Cath 2026-10-27: a note added to a bill or debt shows on its page. */}
      {!!rec.notes?.trim() && (
        <>
          <Text style={styles.header}>Note</Text>
          <View style={styles.group} testID="pay-detail-note">
            <GradientFill match={styles.group} />
            <Text style={styles.noteText}>{rec.notes.trim()}</Text>
          </View>
        </>
      )}

      {history.length > 0 && (
        <>
          <Text style={styles.header}>History</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {history.slice(0, 12).map((c, i) => {
              const late = c.dueDate && c.paidDate ? daysBetween(c.dueDate, c.paidDate) : 0;
              const d = new Date((c.dueDate || c.paidDate) + 'T00:00:00');
              return (
                <TouchableOpacity key={c.id} onPress={() => setEditCycleId(c.id)} testID={`history-row-${c.id}`} accessibilityRole="button" accessibilityHint="Opens this payment to add a receipt or fix it" style={[styles.histRow, i > 0 && styles.line]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.histTitle}>{isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'long' })}</Text>
                      {!!c.receiptPhoto && <ReceiptMark />}
                    </View>
                    <Text style={styles.meta}>
                      Paid {shortDate(c.paidDate)} · {late > 0 ? `${late} day${late === 1 ? '' : 's'} late` : 'on time'}
                      {typeof c.dueBefore === 'number' ? ` · partial, of ${formatPeso(c.dueBefore)}` : ''}
                      {num(c.lateFee) > 0 ? ` · late fee ${formatPeso(num(c.lateFee))}` : ''}
                      {c.investEntryId ? ' · into the investment' : c.recordedOnly ? ' · recorded only' : ''}
                      {num(c.feePaid) > 0 ? ` · fee ${formatPeso(num(c.feePaid))}` : ''}
                      {who.by(c.paidBy)}
                      {c.notes?.trim() ? ` · ${c.notes.trim()}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.histAmount, { color: colors.ink }]}>{formatPeso(num(c.amountPaid))}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      {/* Version 2.2 (W2 everywhere): who added it, and who last changed it. */}
      <ReceiptViewer photo={viewReceipt} onClose={() => setViewReceipt(null)} />
      {(() => {
        const ec = editCycleId ? (rec.cycles || []).find((x) => x.id === editCycleId) : undefined;
        return (
          <PayFromSheet
            visible={!!ec}
            onClose={() => setEditCycleId(null)}
            title="Edit payment"
            amount={num(ec?.amountPaid)}
            direction="out"
            model={model}
            initial={ec?.paymentMethod}
            confirmLabel="Save"
            withReceipt
            onConfirm={() => {}}
            edit={ec ? {
              date: ec.paidDate,
              pm: ec.paymentMethod,
              receipt: ec.receiptPhoto,
              recordedOnly: !!ec.recordedOnly,
              minAmount: num(ec.amountPaid),
              amountLocked: cycleAmountLocked(ec),
              onSave: (ch) => {
                setEditCycleId(null);
                save(editCyclePayment(model, kind as 'bill' | 'debt', id, ec.id, ch), 'Saved');
              },
            } : undefined}
          />
        );
      })()}
      <WhoFootnote addedBy={rec.addedBy} createdAt={rec.createdAt} changedBy={rec.changedBy} changedAt={rec.changedAt} style={{ marginTop: 4, marginBottom: 12 }} />
      <DeleteRow label={regular ? 'Delete regular payment' : kind === 'bill' ? 'Delete bill' : 'Delete debt'} onPress={confirmDelete} testID="pay-detail-delete" />
    </KeyboardAwareScrollView>
    {editor}
    </>
  );
}

function todayISOFrom(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function Row({ styles, label, value, last }: { styles: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.lineBottom]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function LoanBody({ loan, model, save, colors, styles, onDelete }: { loan: Loan; model: HouseholdModel; save: (m: HouseholdModel, savedLabel?: string) => void; colors: ThemeColors; styles: any; onDelete: () => void }) {
  const who = useWho();
  const total = num(loan.totalAmount);
  const monthly = num(loan.expectedPayment);
  const payments = [...(loan.actualPayments || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = payments.reduce((s, p) => s + num(p.actual), 0);
  const left = loan.direction === 'lent' ? Math.max(0, total - paid) : loanOutstandingBalance(loan);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const lent = loan.direction === 'lent';
  const overdueItem = getOverdueItems(model).find((o) => o.kind === 'loan' && o.id === loan.id);
  // Cath 2026-10-27: the oldest payment not made yet (Oct 16 when Sept 16 was the last paid).
  const nextDue = loanNextDueDate(loan);
  const totalPayments = monthly > 0 ? Math.ceil(total / monthly) : 0;
  const today = todayISO();
  // Code review 2026-10-27: Undo is for the payment logged last (also a back-dated one
  // logged today), and it removes that payment's fee entry too.
  const lastLogged = (loan.actualPayments || []).reduce<LoanPayment | undefined>((a, p) => (!a || (p.createdAt ?? 0) >= (a.createdAt ?? 0) ? p : a), undefined);
  const loggedOn = lastLogged?.createdAt ? todayISOFrom(lastLogged.createdAt) : '';
  const paidToday = !!lastLogged && (lastLogged.date === today || loggedOn === today);
  // Redesign: logging a payment first asks which account it comes from (or, for money
  // you lent, which account it goes into).
  const [payOpen, setPayOpen] = useState(false);
  // Cath, 2026-10-27 (canvas R2): a payment with a receipt opens it full size.
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);
  // H-48 (canvas C2-C3): the payment being edited (tap a row in Payments).
  const [editPayId, setEditPayId] = useState<string | null>(null);
  // Cath 2026-10-27 ("warn and count what I've actually paid in total"): a smaller payment
  // counts toward the oldest open one, which stays open until the rest is paid.
  const cov = loanCoverage(loan, today);
  const dueNow = cov.leftForNext > 0 ? cov.leftForNext : monthly;
  const payAmount = monthly > 0 ? Math.min(dueNow, left || dueNow) : left;
  const openText = cov.nextOpen ? shortDate(cov.nextOpen) : '';
  const shortNote = (amt: number): string | undefined => {
    if (!(monthly > 0) || !cov.nextOpen || !(amt > 0) || amt >= dueNow - 0.005) return undefined;
    const rest = formatPeso(Math.round((dueNow - amt) * 100) / 100);
    return `${formatPeso(amt)} is less than the ${formatPeso(dueNow)} ${cov.paidTowardNext > 0 ? 'still due' : 'due'} for ${openText}. It counts toward it, and the ${openText} payment stays open until the other ${rest} is ${lent ? 'received' : 'paid'}.`;
  };

  // Cath, 2026-10-27 (canvas R4): the amount typed in is the one logged (it used to always
  // be the monthly amount), with an optional fee, or "Just record it" (no account).
  function logPayment(pm: PaymentMethod, amountPaid?: number, _lateFee?: number, date: string = today, takeOff = false, fee = 0, receiptPhoto?: string) {
    const paidNow = typeof amountPaid === 'number' && amountPaid > 0 ? amountPaid : payAmount;
    if (paidNow <= 0) return;
    setPayOpen(false);
    // Shared with Edit loan (H-50 D2): paymentEdit.withLoanPayment.
    save(withLoanPayment(model, loan.id, { pm, amount: paidNow, date, takeOff, fee, receipt: receiptPhoto }).model, lent ? 'Received' : 'Paid');
  }
  function recordPayment(amountPaid: number, fee: number, date: string, receiptPhoto?: string) {
    if (amountPaid <= 0) return;
    setPayOpen(false);
    save(withLoanPayment(model, loan.id, { amount: amountPaid, date, fee, receipt: receiptPhoto, recordedOnly: true }).model, 'Recorded');
  }
  function undoPayment() {
    const last = lastLogged;
    if (!last) return;
    save(withoutLoanPayment(model, loan.id, last.id));
  }

  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={styles.content}>
      <Text style={styles.loanTitle}>{loan.name || 'Loan'}</Text>
      <Text style={styles.loanSub}>
        {lent ? 'You lent this' : 'You borrowed this'}
        {loan.loanType ? ` · ${loan.loanType}` : ''}
        {totalPayments ? ` · ${totalPayments} payments` : ''}
      </Text>

      {overdueItem && (
        <View style={[styles.group, { marginTop: 16 }]}>
          <GradientFill match={[styles.group, { marginTop: 16 }]} />
          <View style={[styles.alert, { backgroundColor: `${colors.negative}14` }]}>
            <Text style={[styles.badge, { marginTop: 0, color: colors.negative, backgroundColor: colors.errorBg }]}>Overdue</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.headline}>
                {formatPeso(overdueItem.amountOwed)} was due {shortDate(overdueItem.dueDate)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Cath 2026-10-27: catching up on past payments, Log payment stays while one is past due. */}
      {left > 0 && (!paidToday || cov.missed.length > 0) && (
        <TouchableOpacity style={[styles.primary, { backgroundColor: colors.buttonFill, alignSelf: 'stretch', marginTop: 16 }]} onPress={() => payAmount > 0 && setPayOpen(true)} accessibilityRole="button">
          <GradientFill color={colors.buttonFill} strength={0.18} />
          <Text style={[styles.primaryText, { color: colors.onButton }]}>{lent ? 'Log money received' : 'Log payment'}{monthly > 0 ? ` · ${formatPeso(payAmount)}` : ''}</Text>
        </TouchableOpacity>
      )}
      {/* H-48 (Cath, 2026-10-29): Undo only for 15 minutes after logging, then edit instead. */}
      <UndoPayment
        loggedAt={lastLogged?.createdAt}
        testID="loan-undo"
        style={{ alignSelf: 'stretch', marginTop: 16 }}
        label={lastLogged?.date === today ? "Undo today's payment" : `Undo the ${shortDate(lastLogged?.date || today)} payment`}
        onUndo={undoPayment}
      />

      <View style={[styles.group, { padding: 16, marginTop: 20 }]}>
        <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
        <Text style={styles.meta}>{lent ? 'Still to get back' : 'Still to pay'}</Text>
        <Text style={[styles.amount, { color: lent ? colors.positive : overdueItem ? colors.negative : colors.ink, fontSize: 34, lineHeight: 40 }]}>{formatPeso(left)}</Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: colors.gold }]} />
        </View>
        <Text style={[styles.meta, { marginTop: 6 }]}>
          {monthly > 0 && isTrackedLoan(loan) ? Object.keys(cov.covered).length : payments.length}
          {totalPayments ? ` of ${totalPayments}` : ''} payments made
          {cov.paidTowardNext > 0 && openText ? ` · ${formatPeso(cov.paidTowardNext)} toward ${openText}` : ''}
          {nextDue ? ` · next ${shortDate(`${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, '0')}-${String(nextDue.getDate()).padStart(2, '0')}`)}` : ''}
        </Text>
        <View style={styles.trio}>
          <View style={{ flex: 1 }}>
            <Text style={styles.meta}>Total</Text>
            <Text style={styles.headline}>{formatPeso(total).replace('.00', '')}</Text>
          </View>
          <View style={[styles.trioCell]}>
            <Text style={styles.meta}>Paid</Text>
            <Text style={styles.headline}>{formatPeso(paid).replace('.00', '')}</Text>
          </View>
          <View style={[styles.trioCell]}>
            <Text style={styles.meta}>Monthly</Text>
            <Text style={[styles.headline, { color: lent ? colors.positive : colors.ink }]}>{monthly ? formatPeso(monthly).replace('.00', '') : '—'}</Text>
          </View>
        </View>
      </View>

      {payments.length > 0 && (
        <>
          <Text style={styles.header}>Payments</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {payments.map((p, i) => {
              const d = new Date(p.date + 'T00:00:00');
              return (
                <TouchableOpacity key={p.id} onPress={() => setEditPayId(p.id)} testID={`loan-payment-row-${p.id}`} accessibilityRole="button" accessibilityHint="Opens this payment to add a receipt or fix it" style={[styles.histRow, i > 0 && styles.line]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.histTitle}>{isNaN(d.getTime()) ? p.date : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                      {!!p.receiptPhoto && <ReceiptMark />}
                    </View>
                    <Text style={styles.meta}>
                      {p.date === today ? 'Paid today' : `Paid ${shortDate(p.date)}`}
                      {p.paymentMethod ? ` · ${accountLabel(model, p.paymentMethod)}` : ''}
                      {p.recordedOnly ? ' · recorded only' : ''}
                      {num(p.fee) > 0 ? ` · fee ${formatPeso(num(p.fee))}` : ''}
                      {who.by(p.addedBy)}
                    </Text>
                  </View>
                  <Text style={[styles.histAmount, { color: lent ? colors.positive : colors.negative }]}>{formatPeso(num(p.actual))}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
      <Text style={styles.footer}>Each payment is saved with its date, so late ones are easy to spot. Tap one to add a receipt or fix it.</Text>
      {(() => {
        const ep = editPayId ? (loan.actualPayments || []).find((x) => x.id === editPayId) : undefined;
        return (
          <PayFromSheet
            visible={!!ep}
            onClose={() => setEditPayId(null)}
            title="Edit payment"
            amount={num(ep?.actual)}
            direction={lent ? 'in' : 'out'}
            model={model}
            initial={ep?.paymentMethod}
            confirmLabel="Save"
            withReceipt
            onConfirm={() => {}}
            edit={ep ? {
              date: ep.date,
              pm: ep.paymentMethod,
              receipt: ep.receiptPhoto,
              recordedOnly: !!ep.recordedOnly,
              minAmount: num(ep.actual),
              onSave: (ch) => {
                setEditPayId(null);
                save(editLoanPayment(model, loan.id, ep.id, ch), 'Saved');
              },
            } : undefined}
          />
        );
      })()}
      <ReceiptViewer photo={viewReceipt} onClose={() => setViewReceipt(null)} />
      <PayFromSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title={lent ? 'Money received' : `Pay ${loan.name || 'loan'}`}
        amount={payAmount}
        dueText={openText ? `${lent ? 'For' : 'Paying'} the ${openText} payment${cov.paidTowardNext > 0 ? ` (${formatPeso(cov.paidTowardNext)} already paid)` : ''}` : undefined}
        amountNote={shortNote}
        direction={lent ? 'in' : 'out'}
        model={model}
        initial={payments[0]?.paymentMethod}
        confirmLabel={lent ? 'Received' : 'Pay'}
        withReceipt
        onConfirm={logPayment}
        onRecord={recordPayment}
      />
      <WhoFootnote addedBy={loan.addedBy} createdAt={loan.createdAt} changedBy={loan.changedBy} changedAt={loan.changedAt} style={{ marginTop: 4, marginBottom: 12 }} />
      <DeleteRow label="Delete loan" onPress={onDelete} testID="pay-detail-delete" />
    </KeyboardAwareScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingBottom: 40 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { fontSize: 17, color: colors.inkDim },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    hero: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
    bigTile: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
    name: { fontSize: 17, fontWeight: '600', color: colors.ink, marginTop: 10 },
    amount: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -0.5 },
    badge: { marginTop: 6, fontSize: 13, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
    nextDue: { fontSize: 13, color: colors.inkDim, marginTop: 6 },
    primary: { overflow: 'hidden', alignSelf: 'stretch', minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    primaryText: { fontSize: 17, fontWeight: '600' },
    barsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    headline: { fontSize: 17, fontWeight: '600', color: colors.ink },
    meta: { fontSize: 13, color: colors.inkDim },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 68, marginTop: 12 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    bar: { width: '100%', borderRadius: 6 },
    barLabel: { fontSize: 11, color: colors.inkDim },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16 },
    lineBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.navy4 },
    line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowLabel: { fontSize: 17, color: colors.ink, flex: 1 },
    rowValue: { fontSize: 17, color: colors.inkDim, flexShrink: 1, textAlign: 'right' },
    noteText: { fontSize: 16, lineHeight: 22, color: colors.ink, paddingHorizontal: 16, paddingVertical: 14 },
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    histRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    histTitle: { fontSize: 17, color: colors.ink },
    histAmount: { fontSize: 17, fontWeight: '600' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 8, marginHorizontal: 16 },
    loanTitle: { fontSize: 28, fontWeight: '600', color: colors.ink },
    loanSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    alert: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 12 },
    trackFill: { height: '100%', borderRadius: 999 },
    trio: { flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    trioCell: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4, paddingLeft: 12 },
  });
}
