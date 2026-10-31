import { requireOptionalNativeModule } from 'expo';
// Voice entry (mockup V, Cath 2026-10-30): listening, with the phone's own speech recognition
// (expo-speech-recognition). Only in the installed app: Expo Go doesn't have it, and then the
// "Say it" sheet offers a box to type in (the keyboard's own mic works there).
// Where the phone can turn speech into words on the phone itself, that's used, so the voice
// doesn't leave the phone.

type Mod = {
  isRecognitionAvailable(): boolean;
  supportsOnDeviceRecognition(): boolean;
  requestPermissionsAsync(): Promise<{ granted: boolean }>;
  start(o: Record<string, unknown>): void;
  stop(): void;
  abort(): void;
  addListener(event: string, fn: (e: any) => void): { remove(): void };
};

function mod(): Mod | null {
  // Cath's phone (Expo Go, 2026-10-30): loading the add-on where its native part is missing
  // showed a red "Cannot find native module" error even inside try/catch. Ask first, quietly.
  try {
    if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  } catch {
    return null;
  }
  try {
    // Loaded only when needed: in Expo Go the native part is missing and this throws.
    const m = require('expo-speech-recognition').ExpoSpeechRecognitionModule as Mod;
    return m && typeof m.start === 'function' ? m : null;
  } catch {
    return null;
  }
}

export function canListen(): boolean {
  const m = mod();
  if (!m) return false;
  try {
    return m.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type Listening = { stop(): void; cancel(): void };

// onWords: the words so far (final = the phone has finished). onDone: listening ended (error
// = why, e.g. no permission or nothing heard).
export async function startListening(onWords: (text: string, final: boolean) => void, onDone: (error?: string) => void): Promise<Listening | null> {
  const m = mod();
  if (!m) return null;
  const perm = await m.requestPermissionsAsync().catch(() => ({ granted: false }));
  if (!perm.granted) {
    onDone('no-permission');
    return null;
  }
  const subs = [
    m.addListener('result', (e: any) => {
      const t = e?.results?.[0]?.transcript;
      if (typeof t === 'string') onWords(t, !!e.isFinal);
    }),
    m.addListener('error', (e: any) => {
      cleanup();
      onDone(String(e?.error || 'error'));
    }),
    m.addListener('end', () => {
      cleanup();
      onDone();
    }),
  ];
  function cleanup() {
    subs.forEach((s) => s.remove());
    subs.length = 0;
  }
  let onDevice = false;
  try {
    onDevice = m.supportsOnDeviceRecognition();
  } catch {}
  m.start({ lang: 'en-US', interimResults: true, continuous: false, requiresOnDeviceRecognition: onDevice, addsPunctuation: false });
  return {
    stop: () => m.stop(),
    cancel: () => {
      cleanup();
      m.abort();
    },
  };
}
