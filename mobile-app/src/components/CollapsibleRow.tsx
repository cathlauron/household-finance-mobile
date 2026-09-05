import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

// Enable LayoutAnimation for Android devices if not already enabled
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type CollapsibleRowProps = {
  collapsedContent: React.ReactNode;
  expandedContent: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  testID?: string;
};

export function CollapsibleRow({
  collapsedContent,
  expandedContent,
  isExpanded,
  onToggle,
  onEdit,
  testID,
}: CollapsibleRowProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View
      testID={testID}
      style={[styles.container, isExpanded && styles.containerExpanded]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleToggle}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.contentWrap}>
          {collapsedContent}
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.inkFaint}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedDrawer}>
          <View style={styles.drawerDivider} />
          <View style={styles.drawerContent}>
            {expandedContent}

            {onEdit && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onEdit}
                style={styles.editButton}
                accessibilityRole="button"
                accessibilityLabel="Edit"
              >
                <Ionicons
                  name="pencil"
                  size={13}
                  color={colors.gold}
                  style={styles.editIcon}
                />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default CollapsibleRow;

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    containerExpanded: {
      borderColor: colors.navy4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    contentWrap: {
      flex: 1,
      marginRight: 8,
    },
    chevronWrap: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 4,
    },
    expandedDrawer: {
      backgroundColor: colors.navy3,
    },
    drawerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.navy4,
      marginHorizontal: 14,
    },
    drawerContent: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.navy2,
      borderWidth: 1,
      borderColor: colors.navy4,
      borderRadius: 8,
      paddingVertical: 9,
      paddingHorizontal: 14,
      marginTop: 12,
    },
    editIcon: {
      marginRight: 6,
    },
    editButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.gold,
    },
  });
}