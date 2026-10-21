import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { TouchableOpacity } from './Tap';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './AppText';
import { useTheme } from '../ThemeContext';
import BottomSheet from './BottomSheet';
import { SheetBar } from './SimpleForm';
import SetPinSheet from '../screens/SetPinScreen';
import { setAutoLockMinutes } from '../autoLock';
import { hasPinSetUp } from '../pin';
import { getBiometricState } from '../biometrics';
import { getCurrentFirebaseUser } from '../authFirebase';
import { hapticSelection } from '../haptics';

// Version 2.2 (canvas S1-S3, approved).
// S1: Finance Flow open but untouched for 5 minutes, with Auto-lock off: "Are you still
//     there?" with a 1-minute countdown, and a suggestion to turn on Auto-lock.
// S2: no answer: the amounts hide and a calm cover sits over the app until someone taps
//     Show (a PIN or fingerprint is asked for when one is set up).
// S3: the Auto-lock sheet (5 minutes suggested).

export const STILL_THERE_AFTER_MS = 5 * 60 * 1000;
const ANSWER_SECONDS = 60;

export function StillTherePopup({
  visible,
  onHere,
  onAutoLock,
  onTimeout,
}: {
  visible: boolean;
  onHere: () => void;
  onAutoLock: () => void;
  onTimeout: () => void;
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [left, setLeft] = useState(ANSWER_SECONDS);
  useEffect(() => {
    if (!visible) return;
    const started = Date.now();
    setLeft(ANSWER_SECONDS);
    const t = setInterval(() => {
      const l = Math.max(0, ANSWER_SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        onTimeout();
      }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onHere} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={[s.wave, { backgroundColor: colors.accentTint }]}>
            <Text style={{ fontSize: 26 }}>👋</Text>
          </View>
          <Text style={s.title}>Are you still there?</Text>
          <Text style={s.body}>
            Your amounts will hide in <Text style={{ fontWeight: '800', color: colors.ink }}>{`0:${String(left).padStart(2, '0')}`}</Text> to keep them private.
          </Text>
          <TouchableOpacity style={[s.primary, { backgroundColor: colors.buttonFill }]} onPress={onHere} accessibilityRole="button" testID="still-there-here">
            <Text style={[s.primaryText, { color: colors.onButton }]}>I'm here</Text>
          </TouchableOpacity>
          <View style={[s.tip, { backgroundColor: colors.navy2 }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.gold} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>Lock Finance Flow when you step away?</Text>
              <Text style={s.tipBody}>Auto-lock asks for your fingerprint or PIN after 5 minutes away.</Text>
              <TouchableOpacity onPress={onAutoLock} accessibilityRole="button" hitSlop={8}>
                <Text style={[s.tipLink, { color: colors.gold }]}>Turn on Auto-lock</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={onHere} accessibilityRole="button" hitSlop={10}>
            <Text style={s.notNow}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function PausedCover({ visible, onShow }: { visible: boolean; onShow: () => void }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onShow} statusBarTranslucent>
      <View style={[s.cover, { backgroundColor: colors.navy2 }]}>
        {/* 2.2 (Cath, option B): the app's own leaf on a pale green circle, instead of the emoji. */}
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
          <Ionicons name="leaf-outline" size={38} color={colors.gold} />
        </View>
        <Text style={[s.title, { marginTop: 12 }]}>Amounts hidden while you were away</Text>
        <Text style={[s.body, { marginBottom: 18 }]}>Nothing is locked or lost.</Text>
        <TouchableOpacity style={[s.primary, { backgroundColor: colors.buttonFill, alignSelf: 'stretch', marginHorizontal: 32 }]} onPress={onShow} accessibilityRole="button" testID="paused-show">
          <Text style={[s.primaryText, { color: colors.onButton }]}>Show</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const CHOICES = [
  { minutes: 1, label: '1 minute' },
  { minutes: 5, label: '5 minutes (suggested)' },
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
];

export function AutoLockSheet({ visible, username, onClose }: { visible: boolean; username: string; onClose: () => void }) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [minutes, setMinutes] = useState(5);
  const [unlockWith, setUnlockWith] = useState<string | null>(null); // null = checking, '' = none
  const [pinOpen, setPinOpen] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setMinutes(5);
    setUnlockWith(null);
    Promise.all([hasPinSetUp(username), getBiometricState(username)])
      .then(([pin, bio]) => setUnlockWith([bio === 'ENABLED' ? 'Fingerprint' : '', pin ? 'PIN' : ''].filter(Boolean).join(' · ')))
      .catch(() => setUnlockWith(''));
  }, [visible, username]);
  const ready = !!unlockWith;
  const turnOn = () => {
    if (!ready) {
      setPinOpen(true);
      return;
    }
    hapticSelection();
    setAutoLockMinutes(minutes).catch(() => {});
    onClose();
  };
  return (
    <>
      <BottomSheet
        visible={visible && !pinOpen}
        onClose={onClose}
        grouped
        header={<SheetBar title="Auto-lock" onCancel={onClose} onDone={turnOn} doneLabel="Turn on" />}
      >
        <Text style={s.sheetIntro}>Lock Finance Flow after it has been away or untouched for:</Text>
        <View style={[s.group, { backgroundColor: colors.navy3 }]}>
          {CHOICES.map((c, i) => (
            <TouchableOpacity key={c.minutes} onPress={() => setMinutes(c.minutes)} style={[s.choice, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }]} accessibilityRole="radio" accessibilityState={{ selected: minutes === c.minutes }}>
              <Text style={s.choiceText}>{c.label}</Text>
              {minutes === c.minutes && <Ionicons name="checkmark" size={20} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[s.group, s.choice, { backgroundColor: colors.navy3, marginTop: 12 }]}>
          <Text style={s.choiceText}>Unlock with</Text>
          <Text style={{ fontSize: 15, color: colors.inkDim }}>{unlockWith === null ? '…' : unlockWith || 'Not set up yet'}</Text>
        </View>
        <Text style={s.sheetFoot}>
          {unlockWith === '' ? 'No PIN yet: Turn on asks you to make one first. ' : ''}Change it anytime in Settings › This phone.
        </Text>
      </BottomSheet>
      <SetPinSheet
        visible={pinOpen}
        username={username}
        email={getCurrentFirebaseUser()?.email ?? undefined}
        onDone={() => {
          setPinOpen(false);
          setAutoLockMinutes(minutes).catch(() => {});
          onClose();
        }}
        onCancel={() => setPinOpen(false)}
      />
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(20,18,16,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
    card: { backgroundColor: colors.navy3, borderRadius: 26, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 16, alignItems: 'center' },
    wave: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { fontSize: 23, fontWeight: '800', color: colors.ink, textAlign: 'center' },
    body: { fontSize: 15, lineHeight: 21, color: colors.inkDim, textAlign: 'center', marginTop: 6 },
    primary: { alignSelf: 'stretch', borderRadius: 26, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
    primaryText: { fontSize: 17, fontWeight: '800' },
    tip: { flexDirection: 'row', gap: 10, borderRadius: 16, padding: 14, marginTop: 14, alignSelf: 'stretch' },
    tipTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    tipBody: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 2 },
    tipLink: { fontSize: 15, fontWeight: '800', marginTop: 8 },
    notNow: { fontSize: 14, color: colors.inkDim, marginTop: 14 },
    cover: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    sheetIntro: { fontSize: 14, lineHeight: 20, color: colors.inkDim, marginBottom: 10, marginHorizontal: 4 },
    group: { borderRadius: 16, overflow: 'hidden' },
    choice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
    choiceText: { fontSize: 17, color: colors.ink },
    sheetFoot: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 10, marginHorizontal: 4 },
  });
}
