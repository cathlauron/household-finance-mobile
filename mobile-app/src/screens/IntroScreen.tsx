import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../ThemeContext';

// Muted, single-family green — lock body a touch darker than the shackle outline
// so the two pieces read as one cohesive mark, not two competing colors.
const LOCK_BODY_GREEN = '#3E7A5C';
const LOCK_SHACKLE_GREEN = '#2E5E45';

export default function IntroScreen() {
  const { colors } = useTheme();
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(250),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, textOpacity]);

  return (
    <View style={[styles.container, { backgroundColor: colors.navy2 }]}>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        <View
          style={[
            styles.logoFrame,
            { backgroundColor: colors.navy3, borderColor: colors.navy4 },
          ]}
        >
          <View style={styles.lockWrap}>
            <View style={[styles.shackle, { borderColor: LOCK_SHACKLE_GREEN }]} />
            <View style={[styles.lockBody, { backgroundColor: LOCK_BODY_GREEN }]}>
              <Text style={styles.currencySymbol}>$</Text>
            </View>
          </View>
        </View>
      </Animated.View>
      <Animated.Text style={[styles.eyebrow, { color: colors.gold, opacity: textOpacity }]}>
        Household Finance
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFrame: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  lockWrap: {
    alignItems: 'center',
  },
  shackle: {
    width: 26,
    height: 18,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderWidth: 4,
    borderBottomWidth: 0,
    marginBottom: -2,
  },
  lockBody: {
    width: 44,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});