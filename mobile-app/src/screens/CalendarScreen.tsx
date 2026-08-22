import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../ThemeContext';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

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

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
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
              <View
                key={colIndex}
                style={[
                  styles.dayCell,
                  day === null && styles.dayCellEmpty,
                  isToday && styles.dayCellToday,
                ]}
              >
                {day !== null && (
                  <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                    {day}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
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
  });
}
