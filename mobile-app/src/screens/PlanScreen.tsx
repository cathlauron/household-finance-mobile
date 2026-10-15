import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { useTheme } from '../ThemeContext';
import type { ThemeColors } from '../theme';
import type { PlanningTab } from './PlanningScreen';
import GradientFill from '../components/GradientFill';

// Redesign: the Plan tab. It replaces the old More tab and follows the Finance Flow
// Plan mockup: money set aside (Savings, Goals) and things coming up (Groceries,
// Travel, Events), each opening the screen that already exists for it.
//
// The old More items now live elsewhere: Accounts in Home's Wallet, Reports in Home's
// Insights, Income behind Transactions' "In", and Settings behind the photo on Home.

type Row = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  testID: string;
  go: (navigation: any) => void;
};

type Group = { header: string; footer?: string; rows: Row[] };

const openPlanning = (tab: PlanningTab) => (navigation: any) => navigation.navigate('Planning', { tab });

const GROUPS: Group[] = [
  {
    header: 'Money set aside',
    rows: [
      { title: 'Savings', subtitle: 'Pots, emergency fund and FI', icon: 'leaf-outline', testID: 'more-savings-row', go: (n) => n.navigate('Savings') },
      { title: 'Yearly Goals', subtitle: `What you want to achieve in ${new Date().getFullYear()}`, icon: 'flag-outline', testID: 'plan-goals-row', go: (n) => n.navigate('YearlyGoals') },
      { title: 'Shared Expenses', subtitle: 'Split costs and settle up', icon: 'people-outline', testID: 'plan-shared-row', go: (n) => n.navigate('SharedExpenses') },
    ],
  },
  {
    header: 'Coming up',
    rows: [
      { title: 'Groceries', subtitle: 'Lists and what you plan to spend', icon: 'cart-outline', testID: 'more-planning-row', go: (n) => n.navigate('Groceries') },
      { title: 'Travel', subtitle: 'Trips and their budgets', icon: 'airplane-outline', testID: 'plan-travel-row', go: (n) => n.navigate('Travel') },
      { title: 'Events', subtitle: 'Birthdays, holidays and celebrations', icon: 'balloon-outline', testID: 'plan-events-row', go: (n) => n.navigate('Events') },
    ],
  },
];

export default function PlanScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <PullToRefreshScrollView style={styles.container} contentContainerStyle={styles.content}>
      {GROUPS.map((group) => (
        <View key={group.header} style={styles.section}>
          <Text style={styles.groupHeader}>{group.header}</Text>
          <View style={styles.group}>
            <GradientFill match={styles.group} />
            {group.rows.map((row, i) => (
              <TouchableOpacity
                key={row.testID}
                testID={row.testID}
                style={styles.row}
                activeOpacity={0.6}
                onPress={() => row.go(navigation)}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}. ${row.subtitle}`}
              >
                <View style={styles.tile}>
                  <GradientFill match={styles.tile} />
                  <Ionicons name={row.icon} size={18} color={colors.gold} />
                </View>
                <View style={[styles.rowBody, i > 0 && styles.rowDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{row.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {group.footer ? <Text style={styles.groupFooter}>{group.footer}</Text> : null}
        </View>
      ))}
    </PullToRefreshScrollView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
    section: { marginBottom: 24 },
    groupHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkDim,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginLeft: 16,
      marginBottom: 6,
    },
    group: { backgroundColor: colors.navy3, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 60 },
    tile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.accentTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      paddingVertical: 10,
      paddingRight: 16,
    },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 },
    rowTitle: { fontSize: 17, fontWeight: '500', color: colors.ink },
    rowSub: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    groupFooter: { fontSize: 13, color: colors.inkDim, marginTop: 6, marginHorizontal: 16 },
  });
}
