import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export type RowInteractionPreviewProps = {
  mode: 'swipe' | 'tap';
};

export function RowInteractionPreview({ mode }: RowInteractionPreviewProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const translateX = useRef(new Animated.Value(0)).current;
  const expand = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateX.setValue(0);
    expand.setValue(0);
    let loop: Animated.CompositeAnimation;

    if (mode === 'swipe') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(translateX, { toValue: -76, duration: 380, useNativeDriver: true }),
          Animated.delay(900),
          Animated.timing(translateX, { toValue: 0, duration: 320, useNativeDriver: true }),
          Animated.delay(400),
        ])
      );
    } else {
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(expand, { toValue: 1, duration: 220, useNativeDriver: false }),
          Animated.delay(1200),
          Animated.timing(expand, { toValue: 0, duration: 220, useNativeDriver: false }),
          Animated.delay(500),
        ])
      );
    }

    loop.start();
    return () => loop.stop();
  }, [mode]);

  const expandedHeight = expand.interpolate({ inputRange: [0, 1], outputRange: [0, 46] });

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Preview</Text>
      <View style={styles.stage}>
        {mode === 'swipe' ? (
          <View style={styles.swipeStage}>
            <View style={styles.deleteBehind}>
              <Ionicons name="trash" size={18} color="#fff" />
            </View>
            <Animated.View style={[styles.previewRow, { transform: [{ translateX }] }]}>
              <View style={styles.rowDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Sample bill</Text>
                <Text style={styles.rowSub}>Swipe left to delete</Text>
              </View>
              <Text style={styles.rowAmount}>₱500</Text>
            </Animated.View>
          </View>
        ) : (
          <View>
            <View style={styles.previewRow}>
              <View style={styles.rowDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Sample bill</Text>
                <Text style={styles.rowSub}>Tap to open, then delete inside</Text>
              </View>
              <Text style={styles.rowAmount}>₱500</Text>
            </View>
            <Animated.View style={[styles.expandedDemo, { height: expandedHeight }]}>
              <Text style={styles.expandedDemoText}>Delete this bill</Text>
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

export default RowInteractionPreview;

function makeStyles(colors: any) {
  return StyleSheet.create({
    wrap: { marginTop: 12 },
    label: { fontSize: 11, fontWeight: '600', color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    stage: { backgroundColor: colors.navy2, borderRadius: 12, padding: 12, overflow: 'hidden' },
    swipeStage: { position: 'relative' },
    deleteBehind: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 76, backgroundColor: colors.error, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    previewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.navy3, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
    rowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginRight: 10 },
    rowTitle: { fontSize: 13, fontWeight: '600', color: colors.ink },
    rowSub: { fontSize: 11, color: colors.inkDim, marginTop: 2 },
    rowAmount: { fontSize: 13, fontWeight: '700', color: colors.ink, marginLeft: 8 },
    expandedDemo: { backgroundColor: colors.navy3, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, marginTop: -1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    expandedDemoText: { fontSize: 12, fontWeight: '600', color: colors.error },
  });
}