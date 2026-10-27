import { LayoutAnimation } from 'react-native';
import { reduceMotionNow } from './reduceMotion';
import { ROW_MS } from './motion';

// Smoothness 2026-10-23 (Cath: nothing may jump): call this right before showing or hiding
// part of a screen (a row opening, a help card, "show more"). What appears fades in, what
// goes fades out, and everything below glides to its new place instead of jumping.
// With the phone set to remove animations it does nothing (things change at once).
export function animateNextLayout(): void {
  if (reduceMotionNow()) return;
  LayoutAnimation.configureNext({
    duration: ROW_MS,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}
