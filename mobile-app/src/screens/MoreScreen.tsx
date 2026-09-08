import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type MoreDestination = {
  key: 'Accounts' | 'Income' | 'Savings' | 'Planning' | 'Insights' | 'Settings';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID: string;
};

const DESTINATIONS: MoreDestination[] = [
  { key: 'Accounts', title: 'Accounts', subtitle: 'Cash, debit & credit balances', icon: 'wallet-outline', testID: 'more-accounts-row' },
  { key: 'Income', title: 'Income', subtitle: 'Paychecks & other sources', icon: 'trending-up-outline', testID: 'more-income-row' },
  { key: 'Savings', title: 'Savings', subtitle: 'Goals, Emergency Fund & FI Calculator', icon: 'cash-outline', testID: 'more-savings-row' },
  { key: 'Planning', title: 'Planning', subtitle: 'Groceries, Travel, Events & Goals', icon: 'clipboard-outline', testID: 'more-planning-row' },
  { key: 'Insights', title: 'Insights', subtitle: 'Dashboard & Reports', icon: 'bar-chart-outline', testID: 'more-insights-row' },
  { key: 'Settings', title: 'Settings', subtitle: 'Preferences, categories & data', icon: 'settings-outline', testID: 'more-settings-row' },
];

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {DESTINATIONS.map((dest) => (
        <TouchableOpacity
          key={dest.key}
          testID={dest.testID}
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(dest.key)}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={dest.icon} size={20} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{dest.title}</Text>
            <Text style={styles.rowSub}>{dest.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkDim} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
    },
    content: {
      padding: 16,
    },
    row: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.navy2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: 2,
    },
    rowSub: {
      fontSize: 11.5,
      color: colors.inkDim,
    },
  });
}