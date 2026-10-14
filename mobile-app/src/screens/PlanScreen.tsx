import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { useTheme } from '../ThemeContext';
import type { ThemeColors } from '../theme';
import type { PlanningTab } from './PlanningScreen';

// Redesign: the Plan tab. It replaces the old More tab and follows the Finance Flow
// Plan mockup: money set aside (Savings, Goals) and things coming up (Groceries,
// Travel, Events), each opening the screen that already exists for it.
//
// "Everything else" is TEMPORARY: Accounts, Income, Reports and Settings used to live
// in More. They stay reachable here until their redesigned homes are built (Accounts
// is done: Home's Wallet. Still to move: Income in Transactions, Reports in Home's Insights, Settings from
// the profile photo on Home). Remove that group once each one has its new home.

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
      { title: 'Savings', subtitle: 'Goals, Emergency Fund & FI Calculator', icon: 'leaf-outline', testID: 'more-savings-row', go: (n) => n.navigate('Savings') },
      { title: 'Goals', subtitle: 'What you are working toward this year', icon: 'flag-outline', testID: 'plan-goals-row', go: openPlanning('goals') },
    ],
  },
  {
    header: 'Coming up',
    rows: [
      { title: 'Groceries', subtitle: 'Lists and what you plan to spend', icon: 'cart-outline', testID: 'more-planning-row', go: openPlanning('groceries') },
      { title: 'Travel', subtitle: 'Trips and their budgets', icon: 'airplane-outline', testID: 'plan-travel-row', go: openPlanning('travel') },
      { title: 'Events', subtitle: 'Birthdays, holidays and celebrations', icon: 'balloon-outline', testID: 'plan-events-row', go: openPlanning('events') },
    ],
  },
  {
    header: 'Everything else',
    footer: 'These will move to their new places as the redesign continues.',
    rows: [
      { title: 'Income', subtitle: 'Paychecks & other sources', icon: 'trending-up-outline', testID: 'more-income-row', go: (n) => n.navigate('Income') },
      { title: 'Reports', subtitle: 'Monthly close-out, trends & audits', icon: 'bar-chart-outline', testID: 'more-reports-row', go: (n) => n.navigate('Reports') },
      { title: 'Settings', subtitle: 'Preferences, categories & data', icon: 'settings-outline', testID: 'more-settings-row', go: (n) => n.navigate('Settings') },
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
      backgroundColor: colors.okBg,
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
