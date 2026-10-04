import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { radii, spacing } from '../tokens';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  testID?: string;
};

export default function BottomSheet({
  visible,
  onClose,
  title,
  children,
  testID,
}: BottomSheetProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const styles = makeStyles(colors, screenHeight);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
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
          <View style={styles.sheet}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {!!title && (
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

            <SafeAreaView style={styles.bottomSafeArea} />
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
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
      borderTopLeftRadius: radii[20],
      borderTopRightRadius: radii[20],
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      maxHeight: Math.round(screenHeight * 0.85),
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.navy4 || 'rgba(255,255,255,0.06)',
      borderBottomWidth: 0,
    },
    handleWrap: {
      alignItems: 'center',
      paddingTop: spacing[10],
      paddingBottom: spacing[6],
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.decor, opacity: 0.5 },
    header: {
      paddingHorizontal: spacing[20],
      paddingTop: spacing[4],
      paddingBottom: spacing[12],
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.ink,
      letterSpacing: 0.2,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingHorizontal: spacing[20],
      paddingBottom: Platform.OS === 'ios' ? spacing[12] : spacing[20],
    },
    bottomSafeArea: {
      backgroundColor: colors.navy3,
    },
  });
}