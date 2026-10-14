import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';

// Redesign: iPhone-style large titles, like the Finance Flow mockups. A short top row
// holds the back button (chevron + where you came from) and any right-side buttons;
// under it sits the page title in big bold type. Used for every tab and pushed screen
// that shows a header (see headerOptions.ts). Transparent, so the leaves show through.

type Props = {
  navigation: any;
  route: { name: string };
  options: {
    title?: string;
    headerBackTitle?: string;
    headerRight?: (p: { tintColor?: string; canGoBack?: boolean }) => React.ReactNode;
    headerLeft?: (p: { tintColor?: string; canGoBack?: boolean }) => React.ReactNode;
  };
  back?: { title?: string } | undefined;
};

export default function LargeHeader({ navigation, route, options, back }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const title = options.title ?? route.name;
  const backLabel = options.headerBackTitle ?? back?.title ?? 'Back';
  const right = options.headerRight?.({ tintColor: colors.gold, canGoBack: !!back });
  const left = options.headerLeft?.({ tintColor: colors.gold, canGoBack: !!back });
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]}>
      <View style={styles.row}>
        {left ??
          (back ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel={`Back to ${backLabel}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.gold} style={{ marginLeft: -6 }} />
              <Text style={[styles.backText, { color: colors.gold }]} numberOfLines={1}>
                {backLabel}
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          ))}
        <View style={styles.right}>{right}</View>
      </View>
      {/* An empty title (detail pages that show their own big heading) hides the line. */}
      {title !== '' && (
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
          {title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingBottom: 4 },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  backText: { fontSize: 17 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.3 },
});
