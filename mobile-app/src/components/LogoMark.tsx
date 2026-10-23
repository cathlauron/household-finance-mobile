import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';

// Redesign: the Finance Flow logo — line-art house with a leaf inside — with the
// FINANCE FLOW wordmark underneath (the wordmark is part of the logo). Drawn in the
// accent green (light) or mint (dark); no filled tile, which is only for the app icon.

export const LOGO_PATHS = [
  'M 215 512 L 501 276 C 507 268, 517 268, 524 276 L 809 512',
  'M 268 470 V 700 C 268 726, 286 746, 307 746 H 414',
  'M 756 470 V 700 C 756 726, 738 746, 717 746 H 610',
  'M 512 656 V 748',
  'M 512 656 C 512 588, 578 508, 597 490 C 609 552, 584 636, 512 680 Z',
  'M 502 668 C 453 664, 432 592, 428 548 C 442 544, 486 566, 505 658',
];

// wordmark={false}: just the house (where the words are drawn next to it, or inside the
// small app tile). Version 2.2 fix: the welcome screens showed the words twice.
export default function LogoMark({ width = 84, color, wordmark = true }: { width?: number; color?: string; wordmark?: boolean }) {
  const { colors } = useTheme();
  const stroke = color ?? colors.gold;
  const height = Math.round((width * 530) / 644);
  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityRole="image" accessibilityLabel="Finance Flow">
      <Svg width={width} height={height} viewBox="190 240 644 530" fill="none">
        {LOGO_PATHS.map((d, i) => (
          <Path key={i} d={d} stroke={stroke} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </Svg>
      {wordmark && (
      <Text style={{ marginTop: Math.round(width * 0.16), fontSize: 13, fontWeight: '600', letterSpacing: 4, paddingLeft: 4, color: stroke }}>
        FINANCE FLOW
      </Text>
      )}
    </View>
  );
}
