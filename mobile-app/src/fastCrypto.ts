import { requireOptionalNativeModule } from 'expo';
import { makeKeyDeriver, type NativeKeyMaker } from './pbkdf2Core';

// The installed app's fast key step (modules/ff-crypto, Android). Missing in Expo Go,
// where requireOptionalNativeModule returns null and the JavaScript version is used.
export const keyDeriver = makeKeyDeriver(() => requireOptionalNativeModule<NativeKeyMaker>('FFCrypto'));
