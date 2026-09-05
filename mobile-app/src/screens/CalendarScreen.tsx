import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { computeRunningBalances, totalLiquidBalance, formatPeso, computeMonthEvents, CalendarEvent } from '../balanceProjection';

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

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { model } = useData();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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
    setSelectedDay(day);
  }

  function closeDayModal() {
    setSelectedDay(null);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  // Build a flat list of cells: empty placeholders for the days before day 1,
  // then one cell per real day of the month.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // Split the flat list into rows of 7 (one row per week).
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.balanceBanner}>
        <Text style={styles.balanceBannerLabel}>TOTAL BALANCE</Text>
        <Text style={styles.balanceBannerAmount}>{formatPeso(totalBalance)}</Text>
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={goPrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'‹'}</Text>
        </TouchableOpacity>

        <Text style={styles.monthLabel}>
          {MONTHS[month]} {year}
        </Text>

        <TouchableOpacity onPress={goNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'›'}</Text>
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

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {row.map((day, colIndex) => {
            const isToday = isCurrentMonth && day === today.getDate();
            return (
              <TouchableOpacity
                key={colIndex}
                disabled={day === null}
                onPress={() => day !== null && handleDayPress(day)}
                activeOpacity={0.6}
                style={[
                  styles.dayCell,
                  day === null && styles.dayCellEmpty,
                  isToday && styles.dayCellToday,
                ]}
              >
                {day !== null && (
                  <>
                    <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                      {day}
                    </Text>
                    {monthEvents[day] && monthEvents[day].length > 0 && (
                      <View style={styles.dotRow}>
                        {monthEvents[day].slice(0, 4).map((ev, i) => (
                          <View
                            key={i}
                            style={[styles.dot, { backgroundColor: EVENT_DOT_COLORS[ev.type] }]}
                          />
                        ))}
                      </View>
                    )}
                    <Text style={styles.dayBalanceText} numberOfLines={1}>
                      {formatPeso(projectedBalances[day] ?? 0)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

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
              <Text style={styles.modalSubtitle}>Nothing due on this day.</Text>
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
      aspectRatio: 1,
      margin: 2,
      borderRadius: 10,
      backgroundColor: colors.navy3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
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