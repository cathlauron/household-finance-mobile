import React from 'react';
import { Platform, ScrollView as RNScrollView, ScrollViewProps } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

// No longer a pull-to-refresh: the refresh props are accepted (so existing
// screens still compile) but ignored. This now just gives every screen the
// platform's elastic overscroll.
type Props = ScrollViewProps & {
  refreshing?: boolean;
  onRefresh?: () => void;
  children?: React.ReactNode;
};

export const PullToRefreshScrollView = React.forwardRef<any, Props>(function PullToRefreshScrollView(
  { refreshing, onRefresh, children, ...rest },
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