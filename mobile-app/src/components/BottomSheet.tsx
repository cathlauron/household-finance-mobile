import React from 'react';
import { Modal, View, Pressable, ScrollView, KeyboardAvoidingView, StyleSheet, Platform, useWindowDimensions, Keyboard } from 'react-native';
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
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [visible]);
  const bottomSpace = Math.max(keyboardHeight, insets.bottom);

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
              keyboardHeight > 0 && { maxHeight: Math.max(200, screenHeight - keyboardHeight - insets.top - 24) },
            ]}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {header}
            {!header && !!title && (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>

            <View style={{ height: bottomSpace }} />
          </View>
        </KeyboardAvoidingView>
      </View>
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
    },
    scrollContent: {
      paddingHorizontal: spacing[20],
      paddingBottom: Platform.OS === 'ios' ? spacing[12] : spacing[20],
    },
  });
}