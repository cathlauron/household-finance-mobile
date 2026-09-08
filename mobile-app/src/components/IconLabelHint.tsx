import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Insets,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

// One shared "icon + floating label" component — shows just an icon by default; a
// quick tap OR a long-press reveals a small floating label naming it, which fades
// out on its own or dismisses early if the person taps anywhere else. Used across
// the app wherever a word label is being replaced with an icon (Phase B Part 2).
export type IconLabelHintProps = {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  size?: number;
  color?: string;
  position?: 'above' | 'below';
  duration?: number;
  onPress?: () => void;
  hitSlop?: Insets | number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type AnchorRect = { x: number; y: number; width: number; height: number };

export default function IconLabelHint({
  name,
  label,
  size = 20,
  color,
  position = 'above',
  duration = 2400,
  onPress,
  hitSlop = { top: 8, bottom: 8, left: 8, right: 8 },
  style,
  testID,
}: IconLabelHintProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<AnchorRect | null>(null);
  const [measured, setMeasured] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const iconRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setCoords(null);
      setMeasured(false);
    });
  }, [fadeAnim]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const showLabel = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    iconRef.current?.measureInWindow((x, y, width, height) => {
      setCoords({ x, y, width, height });
      setMeasured(false);
      fadeAnim.setValue(0);
      setVisible(true);
    });
  }, [fadeAnim]);

  // Fires once the tooltip's real size is known (after its first invisible
  // layout pass) — only then do we compute a real position and fade it in,
  // so there's no visible jump from a guessed size to the real one.
  const handleTooltipLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === tooltipSize.width && height === tooltipSize.height && measured) return;
    setTooltipSize({ width, height });
    setMeasured(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
    hideTimerRef.current = setTimeout(() => {
      dismiss();
    }, duration);
  };

  const handlePress = () => {
    showLabel();
    if (onPress) onPress();
  };

  let tooltipTop = 0;
  let tooltipLeft = 0;
  if (coords && tooltipSize.width > 0) {
    const spacing = 8;
    const rawLeft = coords.x + coords.width / 2 - tooltipSize.width / 2;
    tooltipLeft = Math.max(12, Math.min(rawLeft, screenWidth - tooltipSize.width - 12));
    const fitsAbove = coords.y - tooltipSize.height - spacing > 44;
    const placeAbove = position === 'above' ? fitsAbove : false;
    tooltipTop = placeAbove ? coords.y - tooltipSize.height - spacing : coords.y + coords.height + spacing;
  }

  const iconColor = color || colors.inkDim;
  const styles = makeStyles(colors);

  return (
    <>
      <View ref={iconRef} collapsable={false} style={style}>
        <Pressable
          testID={testID}
          onPress={handlePress}
          onLongPress={showLabel}
          delayLongPress={350}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name={name} size={size} color={iconColor} />
        </Pressable>
      </View>

      {visible && coords && (
        <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
            <Animated.View
              onLayout={handleTooltipLayout}
              style={[
                styles.tooltip,
                {
                  top: measured ? tooltipTop : (coords ? coords.y : 0),
                  left: measured ? tooltipLeft : 0,
                  opacity: fadeAnim,
                },
              ]}
            >
              <Text style={styles.tooltipText}>{label}</Text>
            </Animated.View>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    tooltip: {
      position: 'absolute',
      backgroundColor: colors.navy1 || '#161412',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.navy4 || 'rgba(255,255,255,0.1)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
    },
    tooltipText: {
      color: colors.ink,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });
}