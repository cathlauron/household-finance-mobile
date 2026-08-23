import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import GroceriesScreen from './GroceriesScreen';
import TravelScreen from './TravelScreen';
import EventsScreen from './EventsScreen';
import GoalsScreen from './GoalsScreen';

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

  const tabs: { id: PlanningTab; label: string }[] = [
    { id: 'groceries', label: 'Groceries' },
    { id: 'travel', label: 'Travel' },
    { id: 'events', label: 'Events' },
    { id: 'goals', label: 'Goals' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.pillButton, activeTab === t.id && styles.pillButtonActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={[styles.pillButtonText, activeTab === t.id && styles.pillButtonTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
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
    container: { flex: 1, backgroundColor: colors.navy2 },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
    },
    pillButton: {
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },
    pillButtonActive: { backgroundColor: colors.gold },
    pillButtonText: { fontSize: 12, fontWeight: '600', color: colors.inkDim },
    pillButtonTextActive: { color: colors.navy2 },
    content: { flex: 1 },
  });
}
