import React, { useEffect, useRef } from 'react';
import { View, Image, ImageBackground, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const barProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
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
      ]),
      // The loading bar can't use the native driver because it animates width.
      Animated.timing(barProgress, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start();
  }, [logoOpacity, logoScale, titleOpacity, taglineOpacity, barProgress]);

  const barWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ImageBackground
      source={require('../../assets/splash-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
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

      <View style={styles.bottomGroup}>
        <Ionicons name="leaf-outline" size={22} color={SPLASH_CREAM} style={{ opacity: 0.55 }} />
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
      </View>
    </ImageBackground>
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
  bottomGroup: {
    position: 'absolute',
    bottom: 56,
    alignItems: 'center',
  },
  barTrack: {
    marginTop: 14,
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(246,243,231,0.25)',
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: SPLASH_CREAM,
  },
});