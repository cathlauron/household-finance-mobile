import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { useData } from './DataContext';
import { useTheme } from './ThemeContext';

// Pull-to-refresh for a screen's ScrollView: pass `refreshControl` to it.
export function useRefresh() {
  const { refreshModel } = useData();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const outcome = await refreshModel();
      if (outcome === 'failed') {
        Alert.alert('Could not refresh', 'Check your connection and try again.');
      } else if (outcome === 'cannot_decrypt') {
        Alert.alert('Backup is locked', 'Your password may have changed on another device. Sign out and sign in again.');
      } else if (outcome === 'conflict') {
        Alert.alert('Not refreshed', "This device has changes that aren't backed up, and the backup changed too. Nothing was overwritten.");
      } else if (outcome === 'backed_up') {
        Alert.alert('Backed up', 'Your changes are now saved to the cloud.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshModel]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.gold}
      colors={[colors.gold]}
    />
  );

  return { refreshControl };
}
