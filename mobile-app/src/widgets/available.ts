import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

// The widgets' phone-side part is only in the installed Android app. Asked quietly (Expo Go
// would otherwise show a red "doesn't seem to be linked" error, like the speech add-on did).
export function widgetsAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  try {
    return !!(TurboModuleRegistry.get('AndroidWidget') || (NativeModules as any).AndroidWidget);
  } catch {
    return false;
  }
}
