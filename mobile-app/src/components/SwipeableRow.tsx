import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export type SwipeableRowProps = {
  children: React.ReactNode;
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

export function SwipeableRow({ children, enabled, onDelete, testID, viewAction }: SwipeableRowProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

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
          style={[styles.deleteAction, { backgroundColor: colors.gold }]}
          activeOpacity={0.8}
          onPress={() => {
            swipeableRef.current?.close();
            viewAction.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={viewAction.label}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons name={viewAction.icon} size={20} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: colors.error }]}
        activeOpacity={0.8}
        onPress={() => {
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
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      testID={testID}
    >
      {children}
    </Swipeable>
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
});