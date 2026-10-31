import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Home screen widgets (mockup W2, Cath 2026-10-30): only in the installed Android app.
import { widgetsAvailable } from './src/widgets/available';
if (widgetsAvailable()) {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  registerWidgetTaskHandler(require('./src/widgets/taskHandler').widgetTaskHandler);
}