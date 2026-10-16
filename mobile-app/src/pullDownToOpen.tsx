import React, { useState } from 'react';
import { RefreshControl, RefreshControlProps } from 'react-native';
import { hapticLight } from './haptics';

// iPhone-style "pull down to search": drag a list down from the very top and let go,
// and `onOpen` runs (Transactions opens Search). It uses the phone's own pull-down
// gesture (the one pull-to-refresh uses), because that is the only one Android lets an
// app catch at the top of a list. The spinner is hidden: nothing refreshes, it only
// opens Search. Pass the returned element as the ScrollView's refreshControl.
export function usePullDownToOpen(onOpen: () => void): React.ReactElement<RefreshControlProps> {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        hapticLight();
        onOpen();
        // Let the list settle back straight away.
        setTimeout(() => setRefreshing(false), 250);
      }}
      // Invisible spinner on both platforms.
      tintColor="transparent"
      colors={['transparent']}
      progressBackgroundColor="transparent"
      progressViewOffset={-1000}
    />
  );
}
