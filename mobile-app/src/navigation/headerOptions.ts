import React from 'react';
import type { ThemeColors } from '../theme';
import LargeHeader from './LargeHeader';

export function getSharedHeaderOptions(colors: ThemeColors) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.navy3 },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontWeight: '700' as const },
    // Redesign: iPhone-style large title header (see LargeHeader.tsx).
    header: (props: any) => React.createElement(LargeHeader, props),
  };
}
