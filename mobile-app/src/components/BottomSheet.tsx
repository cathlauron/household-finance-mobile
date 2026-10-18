import React from 'react';
import SkyGlow from './SkyGlow';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Modal, View, Pressable, KeyboardAvoidingView, StyleSheet, Platform, useWindowDimensions, Keyboard, Dimensions } from 'react-native';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import { spacing } from '../tokens';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
  // Redesign: a custom top bar (e.g. Cancel / title / Add) instead of a plain title,
  // and a grey "grouped" background so white form groups stand out, iPhone style.
  header?: React.ReactNode;
  grouped?: boolean;
};

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
  header,
  grouped = false,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const styles = makeStyles(colors, screenHeight);
  // The app draws edge to edge, so the sheet runs under the phone's navigation bar too
  // (no strip of the screen behind showing below it) and pads its content above the bar.
  const insets = useSafeAreaInsets();
  // Android: because the sheet runs edge to edge, the system no longer pushes it up when
  // the keyboard opens. So we measure the keyboard ourselves and lift the sheet above it.
  // (iPhone keeps using KeyboardAvoidingView below.)
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  React.useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    // How much of the screen the keyboard covers, from where its top edge actually is
    // (its reported height leaves out the navigation bar on some phones).
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      const screenH = Dimensions.get('screen').height;
      const { screenY, height } = e.endCoordinates ?? { screenY: 0, height: 0 };
      const fromTop = typeof screenY === 'number' && screenY > 0 ? screenH - screenY : 0;
      setKeyboardHeight(Math.max(height ?? 0, fromTop));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);
  // Android reports the keyboard's height WITHOUT the navigation bar under it, and the
  // sheet runs right to the bottom edge, so the room kept at the bottom is keyboard +
  // navigation bar. The content above shrinks (and scrolls) to make room; the sheet never
  // grows past the top of the screen.
  const bottomSpace = keyboardHeight > 0 ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0) : insets.bottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* Version 2.1: a pop-up window needs its own gesture root for swipes to work on Android. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.backdropWrap}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close bottom sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.sheet,
              grouped && { backgroundColor: colors.navy2 },
              keyboardHeight > 0 && { maxHeight: Math.max(200, screenHeight - insets.top - 24) },
            ]}
          >
            {/* Version 2.1: the same time-of-day glow as Home, without rays/rain/stars. */}
            <SkyGlow plain />
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {header}
            {!header && !!title && (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            <KeyboardAwareScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </KeyboardAwareScrollView>

            <View style={{ height: bottomSpace }} />
          </View>
        </KeyboardAvoidingView>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(colors: any, screenHeight: number) {
  return StyleSheet.create({
    backdropWrap: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    keyboardWrap: {
      width: '100%',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.navy3,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderBottomLeftRadius: 0,
      overflow: 'hidden', // keeps the glow inside the rounded corners
      borderBottomRightRadius: 0,
      maxHeight: Math.round(screenHeight * 0.85),
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.navy4 || 'rgba(255,255,255,0.06)',
      borderBottomWidth: 0,
    },
    handleWrap: {
      alignItems: 'center',
      paddingTop: spacing[10],
      paddingBottom: spacing[6],
    },
    handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: colors.inkFaint, opacity: 0.4 },
    header: {
      paddingHorizontal: spacing[20],
      paddingTop: spacing[4],
      paddingBottom: spacing[12],
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
    },
    scroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing[20],
      paddingBottom: Platform.OS === 'ios' ? spacing[12] : spacing[20],
    },
  });
}