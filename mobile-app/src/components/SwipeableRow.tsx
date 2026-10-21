import React, { useContext, useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { holdTabSwipe, SwipeTabsContext } from '../navigation/swipeTabs';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { hapticMedium, hapticSelection } from '../haptics';
import GradientFill from './GradientFill';

export type SwipeableRowProps = {
  children: React.ReactNode;
  // Redesign: inside a grouped list the action button fills the row height exactly.
  flat?: boolean;
  enabled: boolean;
  onDelete: () => void;
  testID?: string;
  // Optional non-destructive action. When set, this renders INSTEAD of the
  // delete button (e.g. jumping to a bill's own record can't happen through
  // this same swipe as deleting it) — every existing caller that doesn't
  // pass this keeps getting the plain delete button exactly as before.
  viewAction?: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

// Version 2.2 (Cath): an open row (showing its trash button) closes by itself when you
// move to another screen or open another row.
const openRows = new Set<() => void>();
export function closeOpenSwipeRows() {
  openRows.forEach((close) => close());
  openRows.clear();
}

// A quick flick (a fast, long sideways swipe) means "next screen", not "delete".
const FLICK_MS = 230;
const FLICK_PX = 60;

export function SwipeableRow({ children, enabled, onDelete, testID, viewAction, flat }: SwipeableRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);
  const flickToTab = useContext(SwipeTabsContext);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const closeMe = useRef(() => swipeableRef.current?.close()).current;
  useEffect(() => () => {
    openRows.delete(closeMe);
  }, [closeMe]);

  if (!enabled) {
    return <>{children}</>;
  }

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
      extrapolate: 'clamp',
    });
    if (viewAction) {
      return (
        <TouchableOpacity
          style={[styles.deleteAction, flat && styles.flatAction, { backgroundColor: colors.buttonFill }]}
          activeOpacity={0.8}
          onPress={() => {
            hapticSelection();
            swipeableRef.current?.close();
            viewAction.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={viewAction.label}
        >
          <GradientFill match={[styles.deleteAction, flat && styles.flatAction, { backgroundColor: colors.buttonFill }]} />
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name={viewAction.icon} size={20} color={colors.navy2} />
          </Animated.View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.deleteAction, flat && styles.flatAction, { backgroundColor: '#C81E43' }]}
        activeOpacity={0.8}
        onPress={() => {
          hapticMedium();
          swipeableRef.current?.close();
          onDelete();
        }}
        accessibilityRole="button"
        accessibilityLabel="Delete"
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="trash" size={20} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      onTouchStart={(e) => {
        holdTabSwipe.onTouchStart();
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, t: Date.now() };
      }}
      onTouchEnd={(e) => {
        holdTabSwipe.onTouchEnd();
        const s0 = start.current;
        start.current = null;
        if (!s0 || !flickToTab) return;
        const dx = e.nativeEvent.pageX - s0.x;
        const dy = e.nativeEvent.pageY - s0.y;
        if (Date.now() - s0.t <= FLICK_MS && Math.abs(dx) >= FLICK_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swipeableRef.current?.close();
          flickToTab(dx < 0 ? 1 : -1);
        }
      }}
      onTouchCancel={() => {
        holdTabSwipe.onTouchCancel();
        start.current = null;
      }}
    >
    <Swipeable
      ref={swipeableRef}
      onSwipeableWillOpen={() => {
        // Only one row open at a time.
        openRows.forEach((close) => close !== closeMe && close());
        openRows.clear();
        openRows.add(closeMe);
      }}
      onSwipeableClose={() => openRows.delete(closeMe)}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      testID={testID}
    >
      {children}
    </Swipeable>
    </View>
  );
}

export default SwipeableRow;

const styles = StyleSheet.create({
  deleteAction: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 10,
  },
  flatAction: { marginBottom: 0, borderRadius: 0 },
});