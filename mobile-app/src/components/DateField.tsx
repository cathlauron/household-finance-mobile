import React, { useState, useEffect } from 'react';
import { animateNextLayout } from '../animateLayout';
import { View, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';

export type DateFieldProps = {
  value: string; // 'YYYY-MM-DD' or ''
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  clearable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseISODate(iso: string): Date {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DateField({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  testID,
  style,
  clearable = false,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const { colors, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  // Version 2.1 (Cath, round 8): tap the month name to jump to any month and year.
  const [pickingMonth, setPickingMonth] = useState(false);
  const styles = makeStyles(colors);

  const currentDateObj = value ? parseISODate(value) : new Date();

  // Android inline calendar month/year view state
  const [viewYear, setViewYear] = useState(() => currentDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => currentDateObj.getMonth());

  // Whenever the picker opens or value changes, reset viewed month to current value (or today)
  useEffect(() => {
    if (showPicker) {
      setPickingMonth(false);
      const d = value ? parseISODate(value) : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [showPicker, value]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const isoStr = `${viewYear}-${mStr}-${dStr}`;
    onChange(isoStr);
    setShowPicker(false);
  }

  function handleIOSChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (selectedDate) {
      onChange(formatISODate(selectedDate));
    }
  }

  function handleClear() {
    onChange('');
    setShowPicker(false);
  }

  // Pre-calculate calendar grid cells for Android inline view
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad the final week so all rows maintain exactly 7 columns
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const todayIso = formatISODate(new Date());
  const minIso = minimumDate ? formatISODate(minimumDate) : null;
  const maxIso = maximumDate ? formatISODate(maximumDate) : null;

  return (
    <View style={[styles.container, style]}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}

      <TouchableOpacity
        testID={testID}
        style={[styles.inputButton, showPicker && styles.inputButtonActive]}
        onPress={() => { animateNextLayout(); setShowPicker((prev) => !prev); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>

        <View style={styles.iconRow}>
          {clearable && !!value && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={16} color={colors.inkFaint} />
            </TouchableOpacity>
          )}
          <Ionicons name="calendar-outline" size={16} color={colors.inkFaint} />
        </View>
      </TouchableOpacity>

      {/* Android: In-app themed inline calendar card */}
      {showPicker && Platform.OS === 'android' && (
        <View style={styles.androidPickerCard}>
          <GradientFill match={styles.androidPickerCard} />
          <View style={styles.androidPickerHeader}>
            <TouchableOpacity
              onPress={() => (pickingMonth ? setViewYear((y) => y - 1) : goPrevMonth())}
              style={styles.androidNavButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={pickingMonth ? 'Previous year' : 'Previous month'}
            >
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { animateNextLayout(); setPickingMonth((v) => !v); }}
              style={[styles.monthChip, { backgroundColor: colors.accentTint }]}
              accessibilityRole="button"
              accessibilityLabel={pickingMonth ? 'Back to the days' : 'Choose a month and year'}
              testID="date-month-year"
            >
              <Text style={[styles.androidMonthLabel, { color: colors.gold }]}>
                {pickingMonth ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
              </Text>
              <Ionicons name={pickingMonth ? 'chevron-up' : 'chevron-down'} size={14} color={colors.gold} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (pickingMonth ? setViewYear((y) => y + 1) : goNextMonth())}
              style={styles.androidNavButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel={pickingMonth ? 'Next year' : 'Next month'}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          {pickingMonth && (
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => {
                const on = i === viewMonth;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      setViewMonth(i);
                      setPickingMonth(false);
                    }}
                    style={[styles.monthCell, { backgroundColor: on ? colors.buttonFill : colors.navy2 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: on ? colors.onButton : colors.ink }}>{m.slice(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!pickingMonth && (
          <>

          <View style={styles.dowRow}>
            {DOW.map((d) => (
              <View key={d} style={styles.dowCell}>
                <Text style={styles.dowText}>{d}</Text>
              </View>
            ))}
          </View>

          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.weekRow}>
              {row.map((day, cIdx) => {
                if (day === null) {
                  return <View key={cIdx} style={[styles.dayCell, styles.dayCellEmpty]} />;
                }

                const dayStr = String(day).padStart(2, '0');
                const mStr = String(viewMonth + 1).padStart(2, '0');
                const cellIso = `${viewYear}-${mStr}-${dayStr}`;

                const isSelected = value === cellIso;
                const isToday = cellIso === todayIso;

                const isDisabled =
                  (minIso !== null && cellIso < minIso) ||
                  (maxIso !== null && cellIso > maxIso);

                return (
                  <TouchableOpacity
                    key={cIdx}
                    disabled={isDisabled}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.6}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      isSelected && !isToday && styles.dayCellSelected,
                      isDisabled && styles.dayCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isSelected && !isToday && styles.dayTextSelected,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          </>
          )}
        </View>
      )}

      {/* iOS: Native inline DateTimePicker inside card (unchanged) */}
      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerCard}>
          <GradientFill match={styles.iosPickerCard} />
          <View style={styles.iosPickerHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.iosDoneButton}>
              <Text style={styles.iosDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={currentDateObj}
            mode="date"
            display="inline"
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={handleIOSChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      marginBottom: 14,
    },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
    inputButton: {
      backgroundColor: colors.navy2,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputButtonActive: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    valueText: {
      fontSize: 17,
      color: colors.ink,
      flex: 1,
    },
    placeholderText: {
      color: colors.inkFaint,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    clearBtn: {
      padding: 2,
    },
    iosPickerCard: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      marginTop: 8,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.navy4 || 'rgba(0,0,0,0.06)',
    },
    iosPickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 4,
    },
    iosDoneButton: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    iosDoneText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    androidPickerCard: {
      backgroundColor: colors.navy3,
      borderRadius: 12,
      marginTop: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.navy4 || 'rgba(0,0,0,0.06)',
    },
    androidPickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    androidNavButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, paddingHorizontal: 4, paddingBottom: 6 },
    monthCell: { width: '31%', alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
    androidMonthLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
    },
    dowRow: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    dowCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 2,
    },
    dowText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.inkFaint,
      textTransform: 'uppercase',
    },
    weekRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      margin: 2,
      borderRadius: 999,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
    },
    // 2.2: soft circles, same as the Calendar page (pale green today, pale grey chosen day).
    dayCellToday: {
      backgroundColor: colors.gold + '2E',
    },
    dayCellSelected: {
      backgroundColor: colors.ink + '1A',
    },
    dayCellDisabled: {
      opacity: 0.25,
    },
    dayText: {
      fontSize: 13,
      color: colors.ink,
    },
    dayTextToday: {
      color: colors.gold,
      fontWeight: '800',
    },
    dayTextSelected: {
      color: colors.ink,
      fontWeight: '800',
    },
    dayTextDisabled: {
      color: colors.inkFaint,
    },
  });
}
