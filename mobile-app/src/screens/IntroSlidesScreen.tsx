import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

type Props = {
  onDone: () => void;
};

const SLIDES = [
  {
    key: 'track',
    image: require('../../assets/intro-track.png'),
    title: 'Track your finances easily',
    body: 'See your income, expenses, and balance in one place.',
  },
  {
    key: 'goals',
    image: require('../../assets/intro-goals.png'),
    title: 'Set your goals',
    body: 'Save for what matters — from everyday needs to your big dreams.',
  },
  {
    key: 'private',
    image: require('../../assets/intro-private.png'),
    title: 'Your data stays yours',
    body: 'Everything is encrypted with your password — only you hold the keys.',
  },
];

export default function IntroSlidesScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  }

  function handleNext() {
    if (isLast) {
      onDone();
      return;
    }
    const next = index + 1;
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {!isLast && (
          <TouchableOpacity
            testID="intro-skip-button"
            onPress={onDone}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            <Image source={slide.image} style={styles.illustration} resizeMode="contain" />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity testID="intro-next-button" style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.navy2} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.navy2,
    },
    topRow: {
      height: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    skipText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.inkDim,
    },
    pager: {
      flex: 1,
    },
    slide: {
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    illustration: {
      width: '100%',
      aspectRatio: 900 / 800,
      marginBottom: 20,
    },
    title: {
      fontSize: 32,
      lineHeight: 39,
      color: colors.ink,
      marginBottom: 12,
      fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.inkDim,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      marginBottom: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.navy4,
    },
    dotActive: {
      width: 22,
      backgroundColor: colors.gold,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 54,
      marginHorizontal: 24,
      marginBottom: 28,
      borderRadius: 999,
      backgroundColor: colors.gold,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.navy2,
    },
  });
}