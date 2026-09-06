// B.14: a global, imperative navigation handle so code outside a React
// component (a notification tap handler in App.tsx) can navigate somewhere
// without needing a `navigation` prop passed down through the tree.
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './RootStack';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();