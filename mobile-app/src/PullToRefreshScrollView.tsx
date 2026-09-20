import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView as RNScrollView,
  RefreshControl,
  Animated,
  StyleSheet,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ScrollView as GHScrollView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Raw finger-drag distance (px) needed to commit a refresh on release.
const PULL_TRIGGER_DISTANCE = 70;
const INDICATOR_MAX_HEIGHT = 64;

export function PullToRefreshScrollView({ refreshing, onRefresh, style, contentContainerStyle, children }: Props) {
  const { colors } = useTheme();

  // iOS already pulls the whole screen down and shows a spinner natively —
  // nothing custom needed there. This custom gesture exists only to give
  // Android the same "screen slides down while refreshing" feel, since
  // Android's native RefreshControl only floats a small circle over the top
  // of the content instead of moving it.
  if (Platform.OS !== 'android') {
    return (
      <RNScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />
        }
      >
        {children}
      </RNScrollView>
    );
  }

  return (
    <AndroidPullToRefresh
      refreshing={refreshing}
      onRefresh={onRefresh}
      style={style}
      contentContainerStyle={contentContainerStyle}
      goldColor={colors.gold}
      navy3={colors.navy3}
    >
      {children}
    </AndroidPullToRefresh>
  );
}

function AndroidPullToRefresh({
  refreshing,
  onRefresh,
  style,
  contentContainerStyle,
  goldColor,
  navy3,
  children,
}: Props & { goldColor: string; navy3: string }) {
  const [isAtTop, setIsAtTop] = useState(true);
  const dragY = useRef(new Animated.Value(0)).current;
  const dragYValueRef = useRef(0);
  const spinValue = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    const id = dragY.addListener(({ value }) => {
      dragYValueRef.current = value;
    });
    return () => dragY.removeListener(id);
  }, [dragY]);

  // Collapses the indicator once a refresh this gesture triggered finishes.
  useEffect(() => {
    if (!refreshing) {
      Animated.timing(dragY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [refreshing, dragY]);

  // Continuous spin while refreshing; reset back to 0 otherwise.
  useEffect(() => {
    let loop: any = null;
    if (refreshing) {
      spinValue.setValue(0);
      loop = Animated.loop(
        Animated.timing(spinValue, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [refreshing, spinValue]);

  function onGestureEvent(e: any) {
    const dy = e.nativeEvent.translationY;
    if (dy >= 0) dragY.setValue(dy);
  }

  function onHandlerStateChange(e: any) {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const committed = dragYValueRef.current >= PULL_TRIGGER_DISTANCE;
      if (committed && !refreshing) {
        onRefresh();
        // Held open at full height until the `refreshing` prop flips back
        // to false above, which is what actually collapses it.
        Animated.timing(dragY, {
          toValue: INDICATOR_MAX_HEIGHT,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      } else if (!refreshing) {
        Animated.timing(dragY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }
    }
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIsAtTop(e.nativeEvent.contentOffset.y <= 0);
  }

  const indicatorHeight = dragY.interpolate({
    inputRange: [0, 40, 90, 200, 1000],
    outputRange: [0, 32, 52, 64, 64],
    extrapolate: 'clamp',
  });
  const indicatorOpacity = dragY.interpolate({
    inputRange: [0, 24],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const pullRotate = dragY.interpolate({
    inputRange: [0, PULL_TRIGGER_DISTANCE],
    outputRange: ['0deg', '180deg'],
    extrapolate: 'clamp',
  });
  const spinRotate = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <PanGestureHandler
      enabled={isAtTop && !refreshing}
      simultaneousHandlers={scrollRef}
      activeOffsetY={[-1000, 15]}
      failOffsetX={[-15, 15]}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={{ flex: 1 }}>
        <Animated.View
          style={[
            styles.indicatorWrap,
            { height: indicatorHeight, opacity: indicatorOpacity, backgroundColor: navy3 },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: refreshing ? spinRotate : pullRotate }] }}>
            <Ionicons name="sync-outline" size={22} color={goldColor} />
          </Animated.View>
        </Animated.View>
        <GHScrollView
          ref={scrollRef}
          style={style}
          contentContainerStyle={contentContainerStyle}
          overScrollMode="never"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {children}
        </GHScrollView>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  indicatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
