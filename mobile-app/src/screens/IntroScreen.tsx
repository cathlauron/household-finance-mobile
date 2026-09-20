import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

// This splash matches the native splash's deep green and ignores light/dark
// mode on purpose, so it always looks the same on launch.
const SPLASH_GREEN = '#1B372C';
const SPLASH_CREAM = '#F6F3E7';
const SPLASH_CREAM_SOFT = '#E4DFCC';

export default function IntroScreen() {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

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
      Animated.delay(200),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, titleOpacity, taglineOpacity]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
        }}
      >
        <Image
          source={require('../../assets/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.Text
        style={[styles.title, { opacity: titleOpacity }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        FINANCE FLOW
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Small steps. Bigger dreams.
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_GREEN,
  },
  logo: {
    width: 150,
    height: 123,
  },
  title: {
    alignSelf: 'stretch',
    marginTop: 34,
    paddingLeft: 31,
    paddingRight: 24,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 7,
    color: SPLASH_CREAM,
  },
  tagline: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '300',
    letterSpacing: 0.6,
    color: SPLASH_CREAM_SOFT,
  },
});