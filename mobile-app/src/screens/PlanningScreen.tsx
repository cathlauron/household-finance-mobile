import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import Pill from '../components/Pill';
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
type PlanningTab = 'groceries' | 'travel' | 'events' | 'goals';

export default function PlanningScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<PlanningTab>('groceries');
  const styles = makeStyles(colors);

  const tabs: { id: PlanningTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'groceries', label: 'Groceries', icon: 'cart-outline' },
    { id: 'travel', label: 'Travel', icon: 'airplane-outline' },
    { id: 'events', label: 'Events', icon: 'balloon-outline' },
    { id: 'goals', label: 'Goals', icon: 'flag-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}
      >
        {tabs.map((t) => (
          <Pill
            key={t.id}
            label={t.label}
            icon={t.icon}
            active={activeTab === t.id}
            onPress={() => setActiveTab(t.id)}
          />
        ))}
      </ScrollView>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },
    content: { flex: 1 },
  });
}
