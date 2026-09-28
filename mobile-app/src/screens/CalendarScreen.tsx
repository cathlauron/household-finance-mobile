import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../DataContext';
import { computeRunningBalances, totalLiquidBalance, formatPeso, computeMonthEvents, CalendarEvent } from '../balanceProjection';
import {
  CalendarViewMode,
  CalendarNavMode,
  DEFAULT_VIEW_MODE,
  DEFAULT_NAV_MODE,
  getCalendarViewMode,
  setCalendarViewMode,
  getCalendarNavMode,
  setCalendarNavMode,
} from '../calendarSettings';
import { useNavigation } from '@react-navigation/native';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// One color per kind of item, used for the small dots on each day and the
// dot next to each row in the day popup.
const EVENT_DOT_COLORS: Record<CalendarEvent['type'], string> = {
  bill: '#e5484d',
  debt: '#f5a524',
  loan: '#8b5cf6',
  income: '#22c55e',
  saving: '#f59e0b',
  manual: '#94a3b8',
};

type MonthViewProps = {
  year: number;
  month: number;
  viewMode: CalendarViewMode;
  effectivePreviewDay: number | null;
  onDayPress: (day: number) => void;
};

// Draws one month's grid of week rows and day cells. Pulled out of
// CalendarScreen so Swipe and Scroll modes can reuse it for many months.
const MonthView = React.memo(function MonthView({
  year,
  month,
  viewMode,
  effectivePreviewDay,
  onDayPress,
}: MonthViewProps) {
  const { colors } = useTheme();
  const { model } = useData();
  const today = new Date();
  const styles = makeStyles(colors);

  const monthEvents = useMemo(() => {
    if (!model) return {} as Record<number, CalendarEvent[]>;
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);

  const projectedBalances = useMemo(() => {
    if (!model) return {} as Record<number, number>;
    return computeRunningBalances(model, year, month);
  }, [model, year, month]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {row.map((day, colIndex) => {
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <TouchableOpacity
                key={colIndex}
                disabled={day === null}
                onPress={() => day !== null && onDayPress(day)}
                activeOpacity={0.6}
                style={[
                  styles.dayCell,
                  viewMode === 'details' ? styles.dayCellDetails : viewMode === 'list' ? styles.dayCellList : styles.dayCellSquare,
                  day === null && styles.dayCellEmpty,
                  isToday && styles.dayCellToday,
                  viewMode === 'list' && day !== null && day === effectivePreviewDay && !isToday && styles.dayCellSelected,
                ]}
              >
                {day !== null && (
                  <>
                    <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                      {day}
                    </Text>
                    {viewMode === 'stacked' && monthEvents[day] && monthEvents[day].length > 0 && (
                      <View style={styles.stackWrap}>
                        {monthEvents[day].slice(0, 3).map((ev, i) => (
                          <View
                            key={i}
                            style={[styles.stackBar, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                          />
                        ))}
                      </View>
                    )}
                    {viewMode === 'details' && monthEvents[day] && monthEvents[day].length > 0 && (
                      <View style={styles.pillWrap}>
                        {monthEvents[day].slice(0, 2).map((ev, i) => (
                          <View
                            key={i}
                            style={[styles.pill, { backgroundColor: EVENT_DOT_COLORS[ev.type] + '33' }]}
                          >
                            <Text style={styles.pillText} numberOfLines={1}>
                              {ev.label}
                            </Text>
                          </View>
                        ))}
                        {monthEvents[day].length > 2 && (
                          <Text style={styles.pillMore}>+{monthEvents[day].length - 2} more</Text>
                        )}
                      </View>
                    )}
                    {viewMode !== 'stacked' && viewMode !== 'details' && monthEvents[day] && monthEvents[day].length > 0 && (
                      <View style={styles.dotRow}>
                        {monthEvents[day].slice(0, 4).map((ev, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                          />
                        ))}
                      </View>
                    )}
                    {viewMode !== 'details' && viewMode !== 'list' && (
                      <Text style={styles.dayBalanceText} numberOfLines={1}>
                        {formatPeso(projectedBalances[day] ?? 0)}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const navigation = useNavigation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // View style (Compact / Stacked / Details / List) and how months move
  // (Scroll / Swipe) — both remembered between app launches.
  const [viewMode, setViewMode] = useState<CalendarViewMode>(DEFAULT_VIEW_MODE);
  const [navMode, setNavMode] = useState<CalendarNavMode>(DEFAULT_NAV_MODE);
  const [menuOpen, setMenuOpen] = useState(false);
  // Which day is showing in the List-mode preview panel under the grid.
  // null = default (today if we're on the current month, otherwise the 1st).
  const [previewDay, setPreviewDay] = useState<number | null>(null);

  useEffect(() => {
    getCalendarViewMode().then(setViewMode);
    getCalendarNavMode().then(setNavMode);
  }, []);

  // Every bill/debt/loan/income/manual-transaction/savings item due in the
  // currently-viewed month, keyed by day number — used for both the small
  // dot indicators on each day and the full list in the day popup.
  const monthEvents = useMemo(() => {
    if (!model) return {};
    return computeMonthEvents(model, year, month);
  }, [model, year, month]);

  const styles = makeStyles(colors);

  // Data hasn't finished loading into memory yet (this is usually near-instant, right
  // after signing in or unlocking) — show a spinner instead of a blank/broken calendar.
  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  function goPrevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goNextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  function handleDayPress(day: number) {
    if (viewMode === 'list') {
      setPreviewDay(day);
    } else {
      setSelectedDay(day);
    }
  }

  function closeDayModal() {
    setSelectedDay(null);
  }
  
  function chooseViewMode(mode: CalendarViewMode) {
    setViewMode(mode);
    setCalendarViewMode(mode);
    setMenuOpen(false);
  }

  function chooseNavMode(mode: CalendarNavMode) {
    setNavMode(mode);
    setCalendarNavMode(mode);
    setMenuOpen(false);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // The actual balance math — see src/balanceProjection.ts for how this is calculated.
  const totalBalance = totalLiquidBalance(model);
  const projectedBalances = computeRunningBalances(model, year, month);

  // Full, friendly label for whichever day is currently selected, e.g.
  // "Friday, August 22, 2026" — used in the popup title.
  const selectedDateLabel =
    selectedDay !== null
      ? new Date(year, month, selectedDay).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const selectedDayBalance = selectedDay !== null ? projectedBalances[selectedDay] : null;
  
  // List-mode preview panel values
  const effectivePreviewDay = Math.min(
    previewDay ?? (isCurrentMonth ? today.getDate() : 1),
    daysInMonth
  );
  const previewEvents = monthEvents[effectivePreviewDay] || [];
  const previewBalance = projectedBalances[effectivePreviewDay] ?? null;
  const previewDateLabel = new Date(year, month, effectivePreviewDay).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderSide} />
        <Text style={styles.sheetTitle}>Calendar</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.sheetHeaderSide, { alignItems: 'flex-end' }]}
          accessibilityLabel="Close calendar"
        >
          <Text style={styles.sheetDone}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.balanceBanner}>
        <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceBannerAmount}>{formatPeso(totalBalance)}</Text>
      </View>

      <View style={styles.toolbarRow}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MONTHS[month]} {year}
        </Text>

        <TouchableOpacity onPress={goNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={goToday} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>Today</Text>
      </TouchableOpacity>

      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <View key={d} style={styles.dowCell}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>

      <MonthView
        year={year}
        month={month}
        viewMode={viewMode}
        effectivePreviewDay={effectivePreviewDay}
        onDayPress={handleDayPress}
      />

      {viewMode === 'list' && (
        <View style={styles.previewPanel}>
          <Text style={styles.previewTitle}>{previewDateLabel}</Text>
          {previewBalance !== null && (
            <Text style={styles.previewBalance}>
              Projected balance: {formatPeso(previewBalance)}
            </Text>
          )}
          {previewEvents.length > 0 ? (
            <ScrollView>
              {previewEvents.map((ev, i) => (
                <View key={i} style={styles.modalEventRow}>
                  <View
                    style={[styles.modalEventDot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                  />
                  <Text style={styles.modalEventLabel} numberOfLines={1}>
                    {ev.label}
                  </Text>
                  <Text style={styles.modalEventAmount}>{formatPeso(ev.amount)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.previewEmpty}>Nothing due on this date.</Text>
          )}
        </View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {(['compact', 'stacked', 'details'] as CalendarViewMode[]).map((m) => (
              <TouchableOpacity key={m} style={styles.menuRow} onPress={() => chooseViewMode(m)}>
                <View style={styles.menuCheckSlot}>
                  {viewMode === m && <Ionicons name="checkmark" size={18} color={colors.ink} />}
                </View>
                <Text style={styles.menuRowText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuRow} onPress={() => chooseViewMode('list')}>
              <View style={styles.menuCheckSlot}>
                {viewMode === 'list' && <Ionicons name="checkmark" size={18} color={colors.ink} />}
              </View>
              <Text style={styles.menuRowText}>List</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            {(['swipe', 'scroll'] as CalendarNavMode[]).map((n) => (
              <TouchableOpacity key={n} style={styles.menuRow} onPress={() => chooseNavMode(n)}>
                <View style={styles.menuCheckSlot}>
                  {navMode === n && <Ionicons name="checkmark" size={18} color={colors.ink} />}
                </View>
                <Text style={styles.menuRowText}>{n === 'swipe' ? 'Swipe months' : 'Scroll months'}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={selectedDay !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDayModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDayModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{selectedDateLabel}</Text>
            {selectedDayBalance !== null && (
              <Text style={styles.modalBalanceLine}>
                Projected balance: {formatPeso(selectedDayBalance)}
              </Text>
            )}
            {selectedDay !== null && monthEvents[selectedDay] && monthEvents[selectedDay].length > 0 ? (
              <ScrollView style={styles.modalEventList}>
                {monthEvents[selectedDay].map((ev, i) => (
                  <View key={i} style={styles.modalEventRow}>
                    <View
                      style={[styles.modalEventDot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                    />
                    <Text style={styles.modalEventLabel} numberOfLines={1}>
                      {ev.label}
                    </Text>
                    <Text style={styles.modalEventAmount}>{formatPeso(ev.amount)}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.modalSubtitle}>Nothing due on this date.</Text>
            )}
            <TouchableOpacity onPress={closeDayModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
      paddingHorizontal: 12,
      paddingTop: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sheetHeaderSide: {
      width: 60,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.ink,
    },
    sheetDone: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.gold,
    },
    balanceBanner: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    balanceBannerLabel: {
      fontSize: 10,
      letterSpacing: 1,
      color: colors.inkDim,
      marginBottom: 4,
    },
    balanceBannerAmount: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.ink,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonText: {
      fontSize: 20,
      color: colors.ink,
    },
    monthLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.ink,
    },
    todayButton: {
      alignSelf: 'center',
      backgroundColor: colors.navy3,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 14,
    },
    todayButtonText: {
      fontSize: 12,
      color: colors.inkDim,
    },
        toolbarRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 4,
    },
    menuButton: {
      padding: 4,
    },
    menuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'flex-end',
      paddingTop: 110,
      paddingRight: 16,
    },
    menuCard: {
      width: 240,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 12,
    },
    menuCheckSlot: {
      width: 26,
      alignItems: 'center',
    },
    menuRowText: {
      fontSize: 16,
      color: colors.ink,
    },
    menuDivider: {
      height: 8,
      backgroundColor: colors.navy2,
    },
    dowRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    dowCell: {
      flex: 1,
      alignItems: 'center',
      paddingBottom: 6,
    },
    dowText: {
      fontSize: 10,
      color: colors.inkFaint,
      textTransform: 'uppercase',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    dayCell: {
      flex: 1,
      margin: 2,
      borderRadius: 10,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
    },
        dayCellSquare: {
      aspectRatio: 1,
    },
        dayCellList: {
      height: 44,
    },
    dayCellSelected: {
      borderWidth: 1.5,
      borderColor: colors.inkDim,
    },
    previewPanel: {
      flex: 1,
      marginTop: 10,
      marginBottom: 8,
      backgroundColor: colors.navy3,
      borderRadius: 12,
      padding: 14,
    },
    previewTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 4,
    },
    previewBalance: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.gold,
      marginBottom: 8,
    },
    previewEmpty: {
      fontSize: 13,
      color: colors.inkDim,
      marginTop: 6,
    },
    dayCellDetails: {
      minHeight: 78,
      justifyContent: 'flex-start',
      paddingTop: 4,
      paddingHorizontal: 2,
    },
    stackWrap: {
      width: '85%',
      marginTop: 3,
      gap: 2,
    },
    stackBar: {
      height: 3,
      borderRadius: 1.5,
    },
    pillWrap: {
      width: '100%',
      marginTop: 3,
      gap: 2,
    },
    pill: {
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
    },
    pillText: {
      fontSize: 8,
      color: colors.ink,
    },
    pillMore: {
      fontSize: 7.5,
      color: colors.inkFaint,
      paddingLeft: 2,
    },
    dayCellToday: {
      borderWidth: 2,
      borderColor: colors.gold,
    },
    dayText: {
      fontSize: 13,
      color: colors.ink,
    },
    dayTextToday: {
      color: colors.gold,
      fontWeight: '700',
    },
    dayBalanceText: {
      fontSize: 7.5,
      color: colors.inkFaint,
      marginTop: 1,
    },
        dotRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 2,
      height: 5,
      alignItems: 'center',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 8,
    },
    modalBalanceLine: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gold,
      marginBottom: 10,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.inkDim,
      lineHeight: 19,
      marginBottom: 18,
    },
        modalEventList: {
      maxHeight: 220,
      marginBottom: 14,
    },
    modalEventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: colors.navy2,
    },
    modalEventDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      marginRight: 8,
    },
    modalEventLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.ink,
    },
    modalEventAmount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.inkDim,
    },
    modalCloseButton: {
      alignSelf: 'flex-end',
      backgroundColor: colors.gold,
      paddingHorizontal: 18,
      paddingVertical: 9,
      borderRadius: 999,
    },
    modalCloseButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.navy2,
    },
  });
}