import React, { useState } from 'react';
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

  function handleAndroidChange(event: DateTimePickerEvent, selectedDate?: Date) {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(formatISODate(selectedDate));
    }
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

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={currentDateObj}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

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
  });
}