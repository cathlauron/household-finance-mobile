import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { TouchableOpacity } from './Tap';
import { Text, TextInput } from './AppText';
import { useTheme } from '../ThemeContext';
import { useReduceMotion } from '../reduceMotion';
import { hapticSelection } from '../haptics';
import { CURVE, DIM_MS, SHEET_CLOSE_MS, SHEET_OPEN_MS, VOICE_PULSE_MS, VOICE_WAVE_MS } from '../motion';
import { canListen, startListening, type Listening } from '../voiceListen';

// Voice entry (mockup V, approved by Cath 2026-10-30): a "Say it" button on every add form.
// Tapping it raises a sheet with a pulsing mic; the words show as you speak; tap to stop. The
// form is then filled in (by the form, from parseVoice) and nothing is saved until Save.
// Where the phone can't listen (Expo Go), the sheet has a box to type in instead (the
// keyboard's own mic works there too).

const ease = Easing.bezier(CURVE[0], CURVE[1], CURVE[2], CURVE[3]);

// compact: just the mic, for quick-add rows (to-do, trip items, budgets).
export function SayItButton({ onHeard, label = 'Say it', example, testID = 'say-it', compact }: { onHeard: (text: string) => void; label?: string; example?: string; testID?: string; compact?: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        testID={testID}
        onPress={() => {
          hapticSelection();
          Keyboard.dismiss();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Say it: fill this in by speaking"
        style={compact ? s.compact : [s.chip, { backgroundColor: colors.accentTint }]}
        hitSlop={8}
      >
        <Ionicons name="mic-outline" size={compact ? 21 : 17} color={colors.gold} />
        {!compact && <Text style={[s.chipText, { color: colors.gold }]}>{label}</Text>}
      </TouchableOpacity>
      {open && (
        <VoiceSheet
          example={example}
          onClose={() => setOpen(false)}
          onHeard={(t) => {
            setOpen(false);
            if (t.trim()) onHeard(t.trim());
          }}
        />
      )}
    </>
  );
}

export function VoiceSheet({ onHeard, onClose, example }: { onHeard: (text: string) => void; onClose: () => void; example?: string }) {
  const { colors } = useTheme();
  const reduce = useReduceMotion();
  const [listenable] = useState(() => canListen());
  const [words, setWords] = useState('');
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  const listening = useRef<Listening | null>(null);
  // Cath's phone 2026-10-30: the keyboard covered the typing box. The sheet sits on top of
  // the keyboard while it's open.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const wordsRef = useRef('');
  const rise = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(0);
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!reduce) rise.value = withTiming(1, { duration: SHEET_OPEN_MS, easing: ease });
    if (!reduce && listenable) {
      pulse.value = withRepeat(withTiming(1, { duration: VOICE_PULSE_MS, easing: Easing.out(Easing.quad) }), -1, false);
      wave.value = withRepeat(withTiming(1, { duration: VOICE_WAVE_MS / 2, easing: Easing.inOut(Easing.quad) }), -1, true);
    }
    let live = true;
    if (listenable) {
      startListening(
        (t) => {
          wordsRef.current = t;
          if (live) setWords(t);
        },
        (err) => {
          if (!live) return;
          if (err === 'no-permission') setNote('Finance Flow needs the microphone for this. You can allow it in your phone\'s settings, or type below.');
          else if (err && !wordsRef.current) setNote("Didn't catch that. Tap the mic to try again.");
          else finish(wordsRef.current);
        }
      ).then((l) => {
        listening.current = l;
      });
    }
    return () => {
      live = false;
      listening.current?.cancel();
      cancelAnimation(pulse);
      cancelAnimation(wave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close(after: () => void) {
    listening.current?.cancel();
    listening.current = null;
    if (reduce) return after();
    rise.value = withTiming(0, { duration: SHEET_CLOSE_MS, easing: ease });
    setTimeout(after, SHEET_CLOSE_MS);
  }
  function finish(text: string) {
    close(() => onHeard(text));
  }

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - rise.value) * 420 }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: rise.value }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - pulse.value), transform: [{ scale: 1 + 0.7 * pulse.value }] }));

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => close(onClose)} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,6,12,0.42)' }, dimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => (listenable ? finish(wordsRef.current) : close(onClose))} accessibilityLabel="Done" />
      </Animated.View>
      <Animated.View testID="voice-sheet" style={[s.sheet, { backgroundColor: colors.navy2, bottom: kb }, sheetStyle]}>
        <View style={[s.grab, { backgroundColor: colors.navy4 }]} />
        {listenable ? (
          <Pressable onPress={() => finish(wordsRef.current)} accessibilityRole="button" accessibilityLabel="Stop listening" style={{ alignItems: 'center' }}>
            <View style={s.micWrap}>
              <Animated.View style={[s.ring, { backgroundColor: colors.buttonFill }, ringStyle]} />
              <View style={[s.mic, { backgroundColor: colors.buttonFill }]}>
                <Ionicons name="mic" size={34} color={colors.onButton} />
              </View>
            </View>
            <View style={s.wave}>
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <WaveBar key={i} i={i} wave={wave} color={colors.gold} still={reduce} />
              ))}
            </View>
            <Text testID="voice-words" style={[s.words, { color: colors.ink }]}>{words || ' '}</Text>
            <Text style={[s.hint, { color: colors.inkDim }]}>{note || 'Listening… tap when you\'re done'}</Text>
          </Pressable>
        ) : (
          <View>
            <Text style={[s.title, { color: colors.ink }]}>Say it</Text>
            <Text style={[s.hint, { color: colors.inkDim, marginBottom: 10 }]}>Type it the way you'd say it, or tap your keyboard's mic.</Text>
            <TextInput
              testID="voice-type"
              autoFocus
              value={typed}
              onChangeText={setTyped}
              placeholder={example || 'e.g. Spent 250 on groceries yesterday'}
              placeholderTextColor={colors.inkFaint}
              style={[s.input, { backgroundColor: colors.navy3, color: colors.ink, borderColor: colors.navy4 }]}
              returnKeyType="done"
              onSubmitEditing={() => finish(typed)}
            />
            <TouchableOpacity testID="voice-use" onPress={() => finish(typed)} disabled={!typed.trim()} style={[s.btn, { backgroundColor: colors.buttonFill, opacity: typed.trim() ? 1 : 0.5 }]} accessibilityRole="button">
              <Text style={[s.btnText, { color: colors.onButton }]}>Fill in the form</Text>
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity onPress={() => close(onClose)} style={{ alignSelf: 'center', padding: 10 }} accessibilityRole="button">
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gold }}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

function WaveBar({ i, wave, color, still }: { i: number; wave: any; color: string; still: boolean }) {
  // Each bar rises a little after the one before it (a soft travelling wave).
  const phase = i / 7;
  const st = useAnimatedStyle(() => {
    const t = (wave.value + phase) % 1;
    const h = still ? 10 : 6 + 20 * Math.sin(Math.PI * t);
    return { height: h };
  });
  return <Animated.View style={[{ width: 4, borderRadius: 2, backgroundColor: color, marginHorizontal: 2 }, st]} />;
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginVertical: 6 },
  chipText: { fontSize: 15, fontWeight: '800' },
  compact: { paddingHorizontal: 6, paddingVertical: 4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26 },
  grab: { width: 38, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  micWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 86, height: 86, borderRadius: 43 },
  mic: { width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', height: 30, marginVertical: 6 },
  words: { fontSize: 20, fontWeight: '800', textAlign: 'center', minHeight: 56, paddingHorizontal: 6 },
  hint: { fontSize: 14, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 50, fontSize: 17 },
  btn: { borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { fontSize: 16, fontWeight: '800' },
});
