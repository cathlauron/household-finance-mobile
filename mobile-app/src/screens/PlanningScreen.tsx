import React, { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import SegmentedControl from '../components/SegmentedControl';
import GroceriesScreen from './GroceriesScreen';
import TravelScreen from './TravelScreen';
import EventsScreen from './EventsScreen';
import GoalsScreen from './GoalsScreen';
import { Ionicons } from '@expo/vector-icons';

// ---- Checkpoint 8.3 ----
// Planning now hosts all four Phase 8 sub-sections behind one pill switcher, same
// pattern as Savings and To-Pay. Pills are wrapped in a horizontal ScrollView since
// four labels ("Groceries"/"Travel"/"Events"/"Goals") are snugger than the two-pill
// row this started as.
export type PlanningTab = 'groceries' | 'travel' | 'events' | 'goals';

export default function PlanningScreen() {
  const { colors } = useTheme();
  // Redesign: the Plan tab opens this screen on a chosen section (route param `tab`).
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<PlanningTab>(route.params?.tab ?? 'groceries');
  const styles = makeStyles(colors);

  const tabs: { id: PlanningTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'groceries', label: 'Groceries', icon: 'cart-outline' },
    { id: 'travel', label: 'Travel', icon: 'airplane-outline' },
    { id: 'events', label: 'Events', icon: 'balloon-outline' },
    { id: 'goals', label: 'Goals', icon: 'flag-outline' },
  ];

  // Keep the header title in step with the section showing (Groceries, Travel, ...).
  useEffect(() => {
    const label = tabs.find((t) => t.id === activeTab)?.label ?? 'Planning';
    navigation.setOptions({ title: label });
  }, [activeTab, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Redesign: iPhone-style switcher instead of pills */}
      <View style={styles.pillRow}>
        <SegmentedControl<PlanningTab>
          accessibilityLabel="Planning section"
          options={tabs.map((t) => ({ id: t.id, label: t.label, testID: `planning-tab-${t.id}` }))}
          value={activeTab}
          onChange={setActiveTab}
        />
      </View>
      <View style={styles.content}>
        {activeTab === 'groceries' && <GroceriesScreen />}
        {activeTab === 'travel' && <TravelScreen />}
        {activeTab === 'events' && <EventsScreen />}
        {activeTab === 'goals' && <GoalsScreen />}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    pillScroll: { flexGrow: 0 },
    pillRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    content: { flex: 1 },
  });
}
