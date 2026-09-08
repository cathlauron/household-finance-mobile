import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
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
        contentContainerStyle={styles.pillRow}
      >
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.pillButton, isActive && styles.pillButtonActive]}
              onPress={() => setActiveTab(t.id)}
            >
              <Ionicons name={t.icon} size={16} color={isActive ? colors.navy2 : colors.inkDim} style={{ marginRight: 6 }} />
              <Text style={[styles.pillButtonText, isActive && styles.pillButtonTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
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
      flexDirection: 'row',
      alignItems: 'center',
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
