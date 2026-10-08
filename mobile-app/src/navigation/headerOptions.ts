import type { ThemeColors } from '../theme';

export function getSharedHeaderOptions(colors: ThemeColors) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.navy3 },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontWeight: '700' as const },
  };
}
