import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import GradientFill from './GradientFill';

// Shows a sample row being swiped left to reveal Delete. Plays 3 times when it appears,
// then stays still. Settings only shows it right after you turn Swipe to delete on.
export function RowInteractionPreview() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(translateX, { toValue: -76, duration: 380, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(translateX, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.delay(300),
      ]),
      { iterations: 3 }
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <View style={styles.swipeStage}>
          <View style={styles.deleteBehind}>
            <Ionicons name="trash" size={18} color="#fff" />
          </View>
          <Animated.View style={[styles.previewRow, { transform: [{ translateX }] }]}>
            <GradientFill match={[styles.previewRow, { transform: [{ translateX }] }]} />
            <View style={styles.rowDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Sample bill</Text>
              <Text style={styles.rowSub}>Swipe left to delete</Text>
            </View>
            <Text style={styles.rowAmount}>₱500</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export default RowInteractionPreview;

function makeStyles(colors: any) {
  return StyleSheet.create({
    wrap: { marginTop: 12 },
    stage: { backgroundColor: colors.navy2, borderRadius: 12, padding: 12, overflow: 'hidden' },
    swipeStage: { position: 'relative' },
    deleteBehind: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 76, backgroundColor: '#C81E43', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    previewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navy3, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
    rowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.buttonFill, marginRight: 10 },
    rowTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 11, color: colors.inkDim, marginTop: 2 },
    rowAmount: { fontSize: 13, fontWeight: '700', color: colors.ink, marginLeft: 8 },
  });
}
