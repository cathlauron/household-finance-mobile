import React from 'react';
import { ScrollView, ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView } from './components/KeyboardAwareScrollView';

// Not a pull-to-refresh any more. This just gives every screen the platform's elastic
// overscroll (iPhone bounce, Android stretch).
// Responsiveness: it is the plain React Native ScrollView on both platforms. (Android
// used the gesture-handler ScrollView, which sometimes swallowed the first tap on a
// button inside it.) Taps also go straight through while the keyboard is open, instead
// of the first tap only closing the keyboard. A screen can still override either prop.
type Props = ScrollViewProps & {
  children?: React.ReactNode;
};

export const PullToRefreshScrollView = React.forwardRef<ScrollView, Props>(function PullToRefreshScrollView(
  { children, ...rest },
  ref
) {
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      {...rest}
      ref={ref}
      // The same bounce on every page, also pages short enough to fit the screen (2.2).
      pageBounce
    >
      {children}
    </KeyboardAwareScrollView>
  );
});
