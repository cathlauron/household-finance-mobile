import React from 'react';
import SkyGlow from '../components/SkyGlow';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../components/AppText';
import { useTheme } from '../ThemeContext';
import OfflineBanner, { OfflineCloud } from '../components/OfflineBanner';

// Redesign: iPhone-style large titles, like the Finance Flow mockups. A short top row
// holds the back button (chevron + where you came from) and any right-side buttons;
// under it sits the page title in big bold type. Used for every tab and pushed screen
// that shows a header (see headerOptions.ts). Transparent, so the leaves show through.

// The text style for every word button in the top row (Back, Add, Edit...). They all share
// one fixed line height with Android's extra font padding turned off, so a word on the
// right sits on exactly the same line as the back label on the left.
const backButtonText = { fontSize: 17, lineHeight: 22, fontWeight: '600', includeFontPadding: false } as const;
// Version 2.1 (Cath): the right-side word buttons (Add, Edit, Move money, Approve all) sit
// 1 point lower than Back. "Add" is all tall letters, so at the same line it looked higher.
export const headerButtonText = { ...backButtonText, top: 1 } as const;

type Props = {
  navigation: any;
  route: { name: string };
  options: {
    title?: string;
    headerBackTitle?: string;
    headerRight?: (p: { tintColor?: string; canGoBack?: boolean }) => React.ReactNode;
    headerLeft?: (p: { tintColor?: string; canGoBack?: boolean }) => React.ReactNode;
    // Version 2.1: icons that sit on the big title's line (Transactions: Recurring, Search)
    // instead of the short row above it.
    headerTitleRight?: () => React.ReactNode;
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
      {/* Version 2.1 (Cath): every page gets Home's time-of-day glow; the sun rays, rain
          and stars stay on Home only. */}
      <SkyGlow plain />
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
              <Ionicons name="chevron-back" size={26} color={colors.gold} style={{ marginLeft: -6, marginVertical: -2 }} />
              <Text style={[styles.backText, { color: colors.gold }]} numberOfLines={1}>
                {backLabel}
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          ))}
        <View style={styles.right}>
          <OfflineCloud />
          {right}
        </View>
      </View>
      {/* An empty title (detail pages that show their own big heading) hides the line. */}
      {title !== '' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[styles.title, { color: colors.ink, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header">
            {title}
          </Text>
          {!!options.headerTitleRight && <View style={{ marginLeft: 'auto' }}>{options.headerTitleRight()}</View>}
        </View>
      )}
      <OfflineBanner style={{ marginTop: 8, marginBottom: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingBottom: 4 },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', maxWidth: '60%' },
  backText: backButtonText,
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // 2.2 (approved P1): softer page titles, the same as the calendar's month name.
  title: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.2 },
});
