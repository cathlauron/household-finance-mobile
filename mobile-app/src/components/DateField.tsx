import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

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
  const styles = makeStyles(colors);

  const currentDateObj = value ? parseISODate(value) : new Date();

  // Android inline calendar month/year view state
  const [viewYear, setViewYear] = useState(() => currentDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => currentDateObj.getMonth());

  // Whenever the picker opens or value changes, reset viewed month to current value (or today)
  useEffect(() => {
    if (showPicker) {
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
        onPress={() => setShowPicker((prev) => !prev)}
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
          <View style={styles.androidPickerHeader}>
            <TouchableOpacity
              onPress={goPrevMonth}
              style={styles.androidNavButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.ink} />
            </TouchableOpacity>

            <Text style={styles.androidMonthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={goNextMonth}
              style={styles.androidNavButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

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
                      isSelected && styles.dayCellSelected,
                      isDisabled && styles.dayCellDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                        isSelected && styles.dayTextSelected,
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
        </View>
      )}

      {/* iOS: Native inline DateTimePicker inside card (unchanged) */}
      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerCard}>
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
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
    },
    inputButton: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputButtonActive: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    valueText: {
      fontSize: 15,
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
      fontSize: 10,
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
      borderRadius: 8,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCellEmpty: {
      backgroundColor: 'transparent',
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: colors.gold,
    },
    dayCellSelected: {
      backgroundColor: colors.accent,
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
      fontWeight: '700',
    },
    dayTextSelected: {
      color: '#ffffff',
      fontWeight: '700',
    },
    dayTextDisabled: {
      color: colors.inkFaint,
    },
  });
}
