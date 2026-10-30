import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from './Tap';
import { Text } from './AppText';
import BottomSheet from './BottomSheet';
import { SheetBar } from './SimpleForm';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { useWho } from './WhoLogged';
import { useHideAmounts } from '../hideAmounts';
import { dateText } from '../dateUtils';
import { householdChangesSince, changesHeadline, type HouseholdChange } from '../householdChanges';
import { navigationRef } from '../navigation/navigationRef';
import { CURVE, SHEET_OPEN_MS, SHEET_CLOSE_MS } from '../motion';
import { reduceMotionNow } from '../reduceMotion';

// H-51 (Cath, 2026-10-29, canvas F2 then F3): when the app opens or comes back from the
// background, a banner drops in from the top if another household member changed something
// since this phone last showed you ("Ana changed 3 things"). Tap it: the full list (F3), each
// change opens its page. Done or the x marks them seen. Only in a shared household. The very
// first time it starts counting from then (no flood of old history).

const KEY = (u: string) => `householdSeenAt:${u}`;
const CHECK_AFTER_RETURN_MS = 20000; // the household's newest copy can arrive a little later

export default function HouseholdChanges() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { model, isLinked, username } = useData();
  const who = useWho();
  // Hidden amounts (the eye, or "Are you still there?") stay hidden here too.
  const { money } = useHideAmounts();
  const [seenAt, setSeenAt] = useState<number | null>(null);
  const [list, setList] = useState<HouseholdChange[]>([]);
  const [banner, setBanner] = useState(false);
  const [sheet, setSheet] = useState(false);
  const windowUntil = useRef(Date.now() + CHECK_AFTER_RETURN_MS);
  const drop = useRef(new Animated.Value(-140)).current;

  // When this phone last showed the changes (first time: from now).
  useEffect(() => {
    if (!username || !isLinked) return;
    AsyncStorage.getItem(KEY(username))
      .then((raw) => {
        const n = raw ? Number(raw) : NaN;
        if (Number.isFinite(n)) setSeenAt(n);
        else {
          const now = Date.now();
          setSeenAt(now);
          AsyncStorage.setItem(KEY(username), String(now)).catch(() => {});
        }
      })
      .catch(() => setSeenAt(Date.now()));
  }, [username, isLinked]);

  // Coming back from the background opens a short window to look again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') windowUntil.current = Date.now() + CHECK_AFTER_RETURN_MS;
    });
    return () => sub.remove();
  }, []);

  // Look on opening, on coming back, and when the household's newer copy arrives just after.
  useEffect(() => {
    if (!model || !isLinked || seenAt === null || sheet) return;
    if (Date.now() > windowUntil.current) return;
    const found = householdChangesSince(model, username, seenAt);
    setList(found);
    setBanner(found.length > 0);
  }, [model, isLinked, seenAt, username, sheet]);

  useEffect(() => {
    const reduce = reduceMotionNow();
    if (banner) {
      if (reduce) drop.setValue(0);
      else Animated.timing(drop, { toValue: 0, duration: SHEET_OPEN_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
    } else {
      if (reduce) drop.setValue(-140);
      else Animated.timing(drop, { toValue: -140, duration: SHEET_CLOSE_MS, easing: Easing.bezier(...CURVE), useNativeDriver: true }).start();
    }
  }, [banner]);

  function markSeen() {
    const newest = list.reduce((m, c) => Math.max(m, c.at), seenAt ?? 0);
    const at = Math.max(newest, Date.now());
    setSeenAt(at);
    if (username) AsyncStorage.setItem(KEY(username), String(at)).catch(() => {});
    windowUntil.current = 0;
    setBanner(false);
  }
  function openChange(c: HouseholdChange) {
    setSheet(false);
    markSeen();
    const r: any = c.ref;
    if (!r || !navigationRef.isReady()) return;
    const nav: any = navigationRef;
    if (r.page === 'PayDetail') nav.navigate('PayDetail', { kind: r.kind, id: r.id });
    else if (r.page === 'TransactionDetail' || r.page === 'TransferDetail') nav.navigate(r.page, { id: r.id });
    else nav.navigate(r.page);
  }

  const headline = useMemo(() => changesHeadline(list, who.nameOf), [list]);
  const peek = list.slice(0, 3).map((c) => c.what).join(', ');
  if (!isLinked) return null;
  const names = [...new Set(list.map((c) => who.nameOf(c.who)))].join(' and ');

  return (
    <>
      <Animated.View pointerEvents={banner ? 'box-none' : 'none'} accessibilityElementsHidden={!banner} importantForAccessibility={banner ? 'auto' : 'no-hide-descendants'} style={[s.wrap, { top: insets.top + 8, transform: [{ translateY: drop }] }]}>
        <TouchableOpacity
          style={[s.banner, { backgroundColor: colors.navy3 }]}
          onPress={() => { setBanner(false); setSheet(true); }}
          accessibilityRole="button"
          accessibilityLabel={`${headline}. Tap to review.`}
          testID="household-changes-banner"
        >
          <View style={[s.tile, { backgroundColor: colors.accentTint }]}>
            <Text style={[s.tileText, { color: colors.gold }]}>{(list[0] ? who.nameOf(list[0].who) : '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.ink }]} numberOfLines={1}>{headline}</Text>
            <Text style={[s.sub, { color: colors.inkDim }]} numberOfLines={1}>{peek} · tap to review</Text>
          </View>
          <TouchableOpacity onPress={markSeen} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss this notice" testID="household-changes-dismiss">
            <Ionicons name="close" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
      <BottomSheet visible={sheet} onClose={() => { setSheet(false); markSeen(); }} grouped header={<SheetBar title={`Changes by ${names || 'your household'}`} onCancel={() => { setSheet(false); markSeen(); }} onDone={() => { setSheet(false); markSeen(); }} doneLabel="Done" hideCancel />}>
        <Text style={[s.sheetNote, { color: colors.inkDim }]}>Since you last looked{seenAt ? ` (${dateText(new Date(seenAt))}, ${new Date(seenAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})` : ''}. Tap one to see it.</Text>
        <View style={[s.group, { backgroundColor: colors.navy3 }]} testID="household-changes-list">
          {list.map((c, i) => (
            <TouchableOpacity key={`${c.kind}-${c.what}-${c.at}-${i}`} style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.navy1 }]} onPress={() => openChange(c)} accessibilityRole="button">
              <View style={[s.tile, { backgroundColor: colors.accentTint }]}>
                <Text style={[s.tileText, { color: colors.gold }]}>{who.nameOf(c.who).charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: colors.ink }]} numberOfLines={1}>{c.what}</Text>
                <Text style={[s.sub, { color: colors.inkDim }]} numberOfLines={1}>
                  {c.action} · {c.kind}{typeof c.amount === 'number' ? ` · ${money(c.amount)}` : ''} · {new Date(c.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 10, right: 10, zIndex: 50 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  tile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 1 },
  sheetNote: { fontSize: 13, lineHeight: 18, marginHorizontal: 16, marginBottom: 10 },
  group: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  rowTitle: { fontSize: 17, fontWeight: '500' },
});
