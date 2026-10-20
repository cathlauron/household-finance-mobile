import { loanCoverage } from '../loanSchedule';
import React, { useLayoutEffect, useState } from 'react';
import { showLeafTick } from '../components/LeafTick';
import { showSaved } from '../components/SavedToast';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { headerButtonText } from '../navigation/LargeHeader';
import GradientFill from '../components/GradientFill';
import PayFromSheet from '../components/PayFromSheet';
import DeleteRow from '../components/DeleteRow';
import { withoutBill, withoutDebt, withoutLoan } from '../deleteRecords';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { formatPeso, loanOutstandingBalance } from '../balanceProjection';
import { getNextDueDate, recurringTypeLabel } from '../recurrence';
import { currentCycle, paidCycles, markPaid, undoLastPayment, isCyclePaid, minimumDue } from '../billPayments';
import { accountLabel } from '../transactionActions';
import { getOverdueItems } from '../overdue';
import { requestOpenBill } from '../openBillRequest';
import { requestOpenDebt } from '../openDebtRequest';
import { requestOpenLoan } from '../openLoanRequest';
import { makeId } from '../utils';
import { todayISO } from '../dateUtils';
import type { ThemeColors } from '../theme';
import type { Bill, Debt, Loan, HouseholdModel, PaymentMethod } from '../types';

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
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000);
}
// Version 2.1 (canvas S4): "It isn't included, take it off my balance": a payment dated before
// balances were last updated is otherwise treated as already in them, so take it off the
// saved balance of the account it was paid from.
function takeOffSavedBalance<M extends HouseholdModel>(model: M, pm: PaymentMethod, amount: number): M {
  const group = pm.type as 'cash' | 'debit' | 'credit';
  const list = (model.balanceAccounts as any)[group] as { id: string; amount: number | '' }[] | undefined;
  if (!list || !list.length) return model;
  const targetId = pm.accountId || (group === 'cash' ? list[0].id : undefined);
  if (!targetId) return model;
  const nextList = list.map((a) => (a.id === targetId ? { ...a, amount: Math.round(((Number(a.amount) || 0) - amount) * 100) / 100 } : a));
  return { ...model, balanceAccounts: { ...model.balanceAccounts, [group]: nextList } };
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
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const kind: Kind = route.params?.kind;
  const id: string = route.params?.id;
  const styles = makeStyles(colors);
  // Redesign: "Mark as paid" first asks which account it's paid from.
  const [payOpen, setPayOpen] = useState(false);

  const record: Bill | Debt | Loan | undefined = !model
    ? undefined
    : kind === 'bill'
    ? model.bills.find((b) => b.id === id)
    : kind === 'debt'
    ? model.debts.find((d) => d.id === id)
    : (model.loans || []).find((l) => l.id === id);

  const openEdit = () => {
    if (kind === 'bill') requestOpenBill(id);
    else if (kind === 'debt') requestOpenDebt(id);
    else requestOpenLoan(id);
    navigation.navigate('Main', { screen: 'To-Pay' });
  };

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
      Alert.alert('Failed to save', 'Please try again.');
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
          saveModel(next).catch(() => Alert.alert('Failed to delete', 'Please try again.'));
        },
      },
    ]);
  }

  if (kind === 'loan') return <LoanBody loan={record as Loan} model={model} save={save} colors={colors} styles={styles} onDelete={confirmDelete} />;

  // ---------- Bill / Debt ----------
  const rec = record as Bill | Debt;
  const name = kind === 'bill' ? (rec as Bill).name || 'Untitled bill' : (rec as Debt).creditorOrPerson || 'Debt';
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
  // Paid (or logged, for a back-dated payment) today: Undo stays available.
  const loggedToday = (() => {
    const at = history[0]?.paidAt;
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
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.group, styles.hero]}>
        <GradientFill match={[styles.group, styles.hero]} />
        <View style={styles.bigTile}>
          <GradientFill match={styles.bigTile} />
          <Ionicons name={icon as any} size={26} color={colors.gold} />
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={[styles.amount, { color: colors.negative }]}>{formatPeso(amount)}</Text>
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
            Paid today{history[0]?.paymentMethod ? ` from ${accountLabel(model, history[0].paymentMethod)}` : ''}
          </Text>
        ) : dueISO && !curPaid ? (
          <Text style={[styles.badge, overdue ? { color: colors.negative, backgroundColor: colors.errorBg } : { color: colors.orange, backgroundColor: colors.warnBg }]}>
            {overdue ? `Overdue · was due ${shortDate(dueISO)}` : `Due ${niceDate(dueISO)}${days !== null ? ` · ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}` : ''}`}
          </Text>
        ) : null}
        {paidToday && dueISO && !curPaid && <Text style={styles.nextDue}>Next due {niceDate(dueISO)}</Text>}
        {!curPaid && !paidToday && (
          <TouchableOpacity
            testID="pay-detail-mark-paid"
            style={[styles.primary, { backgroundColor: colors.buttonFill }]}
            onPress={() => setPayOpen(true)}
            accessibilityRole="button"
          >
            <GradientFill color={colors.buttonFill} strength={0.18} />
            <Text style={[styles.primaryText, { color: colors.onButton }]}>Mark as paid</Text>
          </TouchableOpacity>
        )}
        {paidToday && (
          <TouchableOpacity
            style={[styles.primary, { backgroundColor: colors.accentTint }]}
            onPress={() => {
              const next = undoLastPayment(rec);
              save(kind === 'bill' ? { ...model, bills: model.bills.map((b) => (b.id === id ? (next as Bill) : b)) } : { ...model, debts: model.debts.map((d) => (d.id === id ? (next as Debt) : d)) });
            }}
            accessibilityRole="button"
          >
            <GradientFill match={[styles.primary, { backgroundColor: colors.accentTint }]} />
            <Text style={[styles.primaryText, { color: colors.gold }]}>Undo</Text>
          </TouchableOpacity>
        )}
      </View>

      <PayFromSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title={`Pay ${name}`}
        amount={kind === 'debt' ? minDue : amount}
        direction="out"
        model={model}
        initial={cur?.paymentMethod}
        confirmLabel="Paid"
        editableAmount={kind === 'debt'}
        fullAmount={amount}
        minimumAmount={minDue}
        partOption={kind === 'bill' ? { name, repeats: (rec as Bill).recurringType !== 'onetime' } : undefined}
        dueText={dueISO ? `Paying the ${shortDate(dueISO)} ${kind === 'bill' ? 'bill' : 'payment'}` : undefined}
        onConfirm={(pm, paidAmount, lateFee, date, takeOff) => {
          setPayOpen(false);
          const next =
            kind === 'debt'
              ? markPaid(rec, pm, date, paidAmount, lateFee)
              : markPaid(rec, pm, date, paidAmount < amount ? paidAmount : undefined);
          let updated = kind === 'bill' ? { ...model, bills: model.bills.map((b) => (b.id === id ? (next as Bill) : b)) } : { ...model, debts: model.debts.map((d) => (d.id === id ? (next as Debt) : d)) };
          if (takeOff) updated = takeOffSavedBalance(updated, pm, paidAmount);
          save(updated, paidAmount < amount ? 'Part paid' : 'Paid');
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

      {history.length > 0 && (
        <>
          <Text style={styles.header}>History</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {history.slice(0, 12).map((c, i) => {
              const late = c.dueDate && c.paidDate ? daysBetween(c.dueDate, c.paidDate) : 0;
              const d = new Date((c.dueDate || c.paidDate) + 'T00:00:00');
              return (
                <View key={c.id} style={[styles.histRow, i > 0 && styles.line]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle}>{isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'long' })}</Text>
                    <Text style={styles.meta}>
                      Paid {shortDate(c.paidDate)} · {late > 0 ? `${late} day${late === 1 ? '' : 's'} late` : 'on time'}
                      {typeof c.dueBefore === 'number' ? ` · partial, of ${formatPeso(c.dueBefore)}` : ''}
                      {num(c.lateFee) > 0 ? ` · late fee ${formatPeso(num(c.lateFee))}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.histAmount, { color: colors.negative }]}>{formatPeso(num(c.amountPaid))}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
      <DeleteRow label={kind === 'bill' ? 'Delete bill' : 'Delete debt'} onPress={confirmDelete} testID="pay-detail-delete" />
    </ScrollView>
  );
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
  const total = num(loan.totalAmount);
  const monthly = num(loan.expectedPayment);
  const payments = [...(loan.actualPayments || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const paid = payments.reduce((s, p) => s + num(p.actual), 0);
  const left = loan.direction === 'lent' ? Math.max(0, total - paid) : loanOutstandingBalance(loan);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  const lent = loan.direction === 'lent';
  const overdueItem = getOverdueItems(model).find((o) => o.kind === 'loan' && o.id === loan.id);
  const nextDue = getNextDueDate((loan.recurringType as any) || 'onetime', loan.dueDate || {}, new Date(), loan.customStartDate, loan.customFreq, loan.customOccurrenceCount);
  const totalPayments = monthly > 0 ? Math.ceil(total / monthly) : 0;
  const today = todayISO();
  const paidToday = payments[0]?.date === today;
  // Redesign: logging a payment first asks which account it comes from (or, for money
  // you lent, which account it goes into).
  const [payOpen, setPayOpen] = useState(false);
  const payAmount = monthly > 0 ? Math.min(monthly, left || monthly) : left;

  function logPayment(pm: PaymentMethod, _amount?: number, _fee?: number, date: string = today, takeOff = false) {
    if (payAmount <= 0) return;
    const openFor = loanCoverage(loan, today).nextOpen;
    setPayOpen(false);
    const next: Loan = {
      ...loan,
      actualPayments: [
        ...(loan.actualPayments || []),
        // Version 3: it covers the oldest scheduled payment still open (a missed one first).
        { id: makeId('lpay'), date, actual: payAmount, paymentMethod: pm, createdAt: Date.now(), ...(openFor ? { forDate: openFor } : {}) },
      ],
    };
    let updated = { ...model, loans: (model.loans || []).map((l) => (l.id === loan.id ? next : l)) };
    if (takeOff && !lent) updated = takeOffSavedBalance(updated, pm, payAmount);
    save(updated, lent ? 'Received' : 'Paid');
  }
  function undoPayment() {
    const last = payments[0];
    if (!last) return;
    const next: Loan = { ...loan, actualPayments: (loan.actualPayments || []).filter((p) => p.id !== last.id) };
    save({ ...model, loans: (model.loans || []).map((l) => (l.id === loan.id ? next : l)) });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
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

      {!paidToday && left > 0 && (
        <TouchableOpacity style={[styles.primary, { backgroundColor: colors.buttonFill, alignSelf: 'stretch', marginTop: 16 }]} onPress={() => payAmount > 0 && setPayOpen(true)} accessibilityRole="button">
          <GradientFill color={colors.buttonFill} strength={0.18} />
          <Text style={[styles.primaryText, { color: colors.onButton }]}>{lent ? 'Log money received' : 'Log payment'}{monthly > 0 ? ` · ${formatPeso(Math.min(monthly, left))}` : ''}</Text>
        </TouchableOpacity>
      )}
      {paidToday && (
        <TouchableOpacity style={[styles.primary, { backgroundColor: colors.accentTint, alignSelf: 'stretch', marginTop: 16 }]} onPress={undoPayment} accessibilityRole="button">
          <GradientFill match={[styles.primary, { backgroundColor: colors.accentTint, alignSelf: 'stretch', marginTop: 16 }]} />
          <Text style={[styles.primaryText, { color: colors.gold }]}>Undo today's payment</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.group, { padding: 16, marginTop: 20 }]}>
        <GradientFill match={[styles.group, { padding: 16, marginTop: 20 }]} />
        <Text style={styles.meta}>{lent ? 'Still to get back' : 'Still to pay'}</Text>
        <Text style={[styles.amount, { color: lent ? colors.positive : colors.negative, fontSize: 34, lineHeight: 40 }]}>{formatPeso(left)}</Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: colors.gold }]} />
        </View>
        <Text style={[styles.meta, { marginTop: 6 }]}>
          {payments.length}
          {totalPayments ? ` of ${totalPayments}` : ''} payments made
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
            <Text style={[styles.headline, { color: lent ? colors.positive : colors.negative }]}>{monthly ? formatPeso(monthly).replace('.00', '') : '—'}</Text>
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
                <View key={p.id} style={[styles.histRow, i > 0 && styles.line]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle}>{isNaN(d.getTime()) ? p.date : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                    <Text style={styles.meta}>
                      {p.date === today ? 'Paid today' : `Paid ${shortDate(p.date)}`}
                      {p.paymentMethod ? ` · ${accountLabel(model, p.paymentMethod)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.histAmount, { color: lent ? colors.positive : colors.negative }]}>{formatPeso(num(p.actual))}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
      <Text style={styles.footer}>Each payment is saved with its date, so late ones are easy to spot.</Text>
      <PayFromSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        title={lent ? 'Money received' : `Pay ${loan.name || 'loan'}`}
        amount={payAmount}
        direction={lent ? 'in' : 'out'}
        model={model}
        initial={payments[0]?.paymentMethod}
        confirmLabel={lent ? 'Received' : 'Paid'}
        onConfirm={logPayment}
      />
      <DeleteRow label="Delete loan" onPress={onDelete} testID="pay-detail-delete" />
    </ScrollView>
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
    header: { fontSize: 13, fontWeight: '600', color: colors.inkDim, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 24, marginBottom: 6, marginLeft: 16 },
    histRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 16, paddingVertical: 10 },
    histTitle: { fontSize: 17, color: colors.ink },
    histAmount: { fontSize: 17, fontWeight: '600' },
    footer: { fontSize: 13, color: colors.inkDim, marginTop: 8, marginHorizontal: 16 },
    loanTitle: { fontSize: 28, fontWeight: '700', color: colors.ink },
    loanSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    alert: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    track: { height: 8, borderRadius: 999, backgroundColor: colors.navy1, overflow: 'hidden', marginTop: 12 },
    trackFill: { height: '100%', borderRadius: 999 },
    trio: { flexDirection: 'row', marginTop: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    trioCell: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.navy4, paddingLeft: 12 },
  });
}
