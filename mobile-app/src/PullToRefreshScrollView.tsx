import React from 'react';
import { Platform, ScrollView as RNScrollView, ScrollViewProps } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

// Not a pull-to-refresh any more. This just gives every screen the
// platform's elastic overscroll.
type Props = ScrollViewProps & {
  children?: React.ReactNode;
};

export const PullToRefreshScrollView = React.forwardRef<any, Props>(function PullToRefreshScrollView(
  { children, ...rest },
  ref
) {
  if (Platform.OS === 'android') {
    return (
      <GHScrollView {...(rest as any)} ref={ref} overScrollMode="always">
        {children}
      </GHScrollView>
    );
  }
  return (
    <RNScrollView {...rest} ref={ref} bounces alwaysBounceVertical>
      {children}
    </RNScrollView>
  );
});