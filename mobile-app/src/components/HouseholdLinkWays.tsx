import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Share, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import DrawingLogo from './DrawingLogo';
import { useTheme } from '../ThemeContext';
import { hapticLight } from '../haptics';

// Version 2.2 (Cath approved canvas M5a-M5e): more ways to link a household. All of them
// use the same 15-minute code underneath, so how the data is locked doesn't change.

export const INVITE_MINUTES = 15;

// What the QR code holds. The same shape works later as a link that opens the app.
export function inviteQrValue(code: string): string {
  return `financeflow://join/${code}`;
}

// Reads a code out of whatever the camera saw (our QR, a link, or just the 6 letters).
export function codeFromScan(data: string): string | null {
  const m = (data || '').toUpperCase().match(/([A-HJ-NP-Z2-9]{6})\s*\/?\s*$/);
  return m ? m[1] : null;
}

export async function shareInvite(code: string, fromName?: string) {
  const who = fromName ? `${fromName} invited you to their Finance Flow household.` : 'Join my Finance Flow household!';
  await Share.share({
    message: `${who} Open Finance Flow › Settings › Household › Type a code, and enter ${code}. The code works for ${INVITE_MINUTES} minutes.`,
  });
}

// "Valid for 14:32 left" from when the code was made; null when not known.
export function useInviteCountdown(startedAt: number | null): string | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return null;
  const left = Math.max(0, startedAt + INVITE_MINUTES * 60 * 1000 - now);
  if (left <= 0) return 'Expired';
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `Valid for ${m}:${String(s).padStart(2, '0')} left`;
}

export function TimerChip({ text }: { text: string | null }) {
  const { colors } = useTheme();
  if (!text) return null;
  const expired = text === 'Expired';
  return (
    <View style={[s.chip, { backgroundColor: expired ? colors.errorBg : colors.accentTint }]}>
      <Ionicons name="time-outline" size={14} color={expired ? colors.negative : colors.gold} />
      <Text style={[s.chipText, { color: expired ? colors.negative : colors.gold }]}>{text}</Text>
    </View>
  );
}

// M5a: the four ways, as rows.
export function LinkWaysRows({
  busy,
  onSend,
  onShowQR,
  onScan,
  onType,
}: {
  busy: boolean;
  onSend: () => void;
  onShowQR: () => void;
  onScan: () => void;
  onType: () => void;
}) {
  const { colors } = useTheme();
  const row = (icon: any, title: string, sub: string, onPress: () => void, testID: string, first = false) => (
    <TouchableOpacity
      key={testID}
      testID={testID}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={[s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy4 }, busy && { opacity: 0.5 }]}
    >
      <View style={[s.rowIcon, { backgroundColor: colors.accentTint }]}>
        <Ionicons name={icon} size={20} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[s.rowSub, { color: colors.inkDim }]}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
    </TouchableOpacity>
  );
  return (
    <View>
      {row('share-outline', busy ? 'Making your code…' : 'Send an invite', 'A code through Messenger, Viber, SMS…', onSend, 'link-send', true)}
      {row('qr-code-outline', 'Show my QR code', 'They scan it in the same room', onShowQR, 'link-show-qr')}
      {row('scan-outline', 'Scan to join', 'Point your camera at their QR code', onScan, 'link-scan')}
      {row('keypad-outline', 'Type a code', 'The 6 letters from their phone', onType, 'link-type')}
    </View>
  );
}

// M5d: the QR code, full screen.
export function QrInviteModal({
  visible,
  code,
  countdown,
  waitingText,
  onClose,
}: {
  visible: boolean;
  code: string;
  countdown: string | null;
  waitingText: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[s.full, { backgroundColor: colors.navy1, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={10} style={s.back}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
          <Text style={[s.backText, { color: colors.gold }]}>Household</Text>
        </TouchableOpacity>
        <Text style={[s.qrTitle, { color: colors.ink }]}>Scan to join</Text>
        <Text style={[s.qrSub, { color: colors.inkDim }]}>On their phone: Household › Scan to join</Text>
        <View style={s.qrCard}>{!!code && <QRCode value={inviteQrValue(code)} size={230} color="#141210" backgroundColor="#ffffff" />}</View>
        <Text selectable style={[s.code, { color: colors.ink }]}>{code}</Text>
        <Text style={[s.qrSub, { color: colors.inkDim, marginBottom: 12 }]}>or type this code</Text>
        <TimerChip text={countdown} />
        <View style={s.waiting}>
          <DrawingLogo width={26} drawing wordmark={false} />
          <Text style={[s.waitingText, { color: colors.gold }]}>{waitingText}</Text>
        </View>
      </View>
    </Modal>
  );
}

// M5e: scan their QR code with the camera.
export function ScanJoinModal({ visible, onCode, onClose, onTypeInstead }: { visible: boolean; onCode: (code: string) => void; onClose: () => void; onTypeInstead: () => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const doneRef = useRef(false);
  useEffect(() => {
    if (!visible) return;
    doneRef.current = false;
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [visible, permission?.granted]); // eslint-disable-line react-hooks/exhaustive-deps
  const granted = !!permission?.granted;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#1d1c1a' }}>
        {visible && granted && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (doneRef.current) return;
              const code = codeFromScan(data);
              if (!code) return;
              doneRef.current = true;
              hapticLight();
              onCode(code);
            }}
          />
        )}
        <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={10} style={[s.close, { top: insets.top + 14 }]}>
          <Ionicons name="close" size={22} color="#fff" />
          <Text style={s.closeText}>Close</Text>
        </TouchableOpacity>
        <Text style={[s.scanTitle, { top: insets.top + 70 }]}>{granted ? 'Point at their QR code' : 'Allow the camera to scan'}</Text>
        <View style={s.frame} pointerEvents="none">
          {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
            <View
              key={k}
              style={[
                s.corner,
                k[0] === 't' ? { top: -3, borderTopWidth: 5 } : { bottom: -3, borderBottomWidth: 5 },
                k[1] === 'l' ? { left: -3, borderLeftWidth: 5 } : { right: -3, borderRightWidth: 5 },
              ]}
            />
          ))}
        </View>
        <Text style={s.scanHint}>
          {granted ? 'Hold steady. It joins by itself.' : 'Finance Flow needs the camera only to read the code.'}
        </Text>
        {!granted && permission && !permission.canAskAgain && (
          <TouchableOpacity onPress={() => Linking.openSettings()} style={[s.ghostBtn, { bottom: insets.top + 130 }]} accessibilityRole="button">
            <Text style={s.ghostText}>Open phone settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onTypeInstead} style={[s.ghostBtn, { bottom: insets.bottom + 40 }]} accessibilityRole="button">
          <Ionicons name="keypad-outline" size={18} color="#fff" />
          <Text style={s.ghostText}>Type the code instead</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 17, fontWeight: '700' },
  rowSub: { fontSize: 13, marginTop: 2 },
  full: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 17, fontWeight: '600' },
  qrTitle: { fontSize: 28, fontWeight: '800', marginTop: 22 },
  qrSub: { fontSize: 15, marginTop: 6, textAlign: 'center' },
  qrCard: { backgroundColor: '#fff', borderRadius: 28, padding: 22, marginTop: 24, shadowColor: '#1c4130', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 8, marginTop: 22, paddingLeft: 8 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 26 },
  waitingText: { fontSize: 15, fontWeight: '700' },
  close: { position: 'absolute', left: 20, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 2 },
  closeText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  scanTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 22, fontWeight: '800' },
  frame: { position: 'absolute', alignSelf: 'center', top: '30%', width: 250, height: 250 },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: '#fff', borderRadius: 6 },
  scanHint: { position: 'absolute', left: 24, right: 24, top: '66%', textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  ghostBtn: { position: 'absolute', left: 24, right: 24, height: 54, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ghostText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
