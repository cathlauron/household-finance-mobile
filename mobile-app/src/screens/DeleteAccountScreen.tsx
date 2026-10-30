import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from '../components/Tap';
import { Text, TextInput } from '../components/AppText';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import { SettingsGroup } from '../components/SettingsHub';
import Button from '../components/Button';
import { BusyWords } from '../components/DrawingLogo';
import { useTheme } from '../ThemeContext';
import { useData, withTimeout } from '../DataContext';
import { loadProfilesIndex } from '../storage';
import type { DeletePlan } from '../deleteAccount';

// Loaded only when this page opens (keeps the sign-in library out of every other page).
const da = () => require('../deleteAccount') as typeof import('../deleteAccount');
const signedInUser = (): { uid: string; email: string | null } | null => require('../authFirebase').getCurrentFirebaseUser();
import type { ThemeColors } from '../theme';

// Delete account (mockup DA1, Cath 2026-10-30): one page. What goes, what stays, who takes
// over (an owner leaving others behind chooses), the password, one red button, and a
// confirmation before anything is deleted. Then "Your account is deleted".

export default function DeleteAccountScreen({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const { username, isOnline } = useData();
  const user = useMemo(() => signedInUser(), []);
  const [householdId, setHouseholdId] = useState<string | undefined>(undefined);
  const [plan, setPlan] = useState<DeletePlan | null>(null);
  const [planError, setPlanError] = useState('');
  const [successor, setSuccessor] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const id = (await loadProfilesIndex()).find((p) => p.username === username)?.householdId;
        const p = await withTimeout(da().planDelete(id, user?.uid ?? ''), 8000, 'Timed out checking the household.');
        if (!live) return;
        setHouseholdId(id);
        setPlan(p);
        if (p.kind === 'owner' && p.others.length === 1) setSuccessor(p.others[0].uid);
      } catch (e) {
        if (live) setPlanError("Couldn't check your household. Check your connection and open this page again.");
      }
    })();
    return () => {
      live = false;
    };
  }, [username, user?.uid]);

  const needsPick = plan?.kind === 'owner' && plan.others.length > 1 && !successor;
  const canDelete = !!plan && !!password && !needsPick && !busy && isOnline;

  function confirmDelete() {
    setError('');
    Alert.alert('Delete your account?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete my account', style: 'destructive', onPress: runDelete },
    ]);
  }

  async function runDelete() {
    if (!username || !user?.email) return;
    setBusy(true);
    try {
      await withTimeout(
        da().deleteMyAccount({ username, email: user.email, password, householdId, successorUid: successor }),
        30000,
        'Timed out. Check your connection and try again.'
      );
      setDone(true);
    } catch (e: any) {
      setError(e instanceof da().WrongPasswordError ? "That password isn't right." : e?.message || "Your account wasn't deleted. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={s.done} testID="delete-done">
        <View style={[s.doneIcon, { backgroundColor: colors.accentTint }]}>
          <Ionicons name="checkmark" size={30} color={colors.gold} />
        </View>
        <Text style={s.doneTitle}>Your account is deleted</Text>
        <Text style={s.doneSub}>Thanks for using Finance Flow. You can start again any time.</Text>
        <Button label="Back to the start" onPress={onDone} testID="delete-back-to-start" style={{ alignSelf: 'stretch', marginTop: 18 }} />
      </View>
    );
  }

  const others = plan?.kind === 'member' ? plan.others : plan?.kind === 'owner' ? plan.others.map((o) => o.username) : [];
  const othersText = others.length === 1 ? others[0] : others.slice(0, -1).join(', ') + ' and ' + others[others.length - 1];

  return (
    <KeyboardAwareScrollView pageBounce contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.hero}>
        <View style={[s.heroIcon, { backgroundColor: colors.negative + '22' }]}>
          <Ionicons name="close" size={28} color={colors.negative} />
        </View>
        <Text style={s.heroTitle}>Delete your account?</Text>
        <Text style={s.heroSub}>This can't be undone.</Text>
      </View>

      {!plan && !planError && <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />}
      {!!planError && <Text style={s.error}>{planError}</Text>}

      {plan && (
        <>
          <SettingsGroup label="What gets deleted">
            <Line icon="person-outline" text={`Your account (${user?.email ?? username}) and your sign-in on every phone`} />
            <Line icon="key-outline" text="Your Recovery Key and your password lock" />
            {plan.kind === 'alone' && <Line icon="wallet-outline" text="Your money data and photos" />}
          </SettingsGroup>

          {plan.kind !== 'alone' && (
            <SettingsGroup
              label="Your household"
              footer={plan.kind === 'owner' && plan.others.length === 1 ? `You're the owner, so ${plan.others[0].username} becomes the owner.` : undefined}
            >
              <Line icon="home-outline" text={`You leave the household. What you added stays for ${othersText}.`} />
            </SettingsGroup>
          )}

          {plan.kind === 'owner' && plan.others.length > 1 && (
            <SettingsGroup label="Who takes over the household?" plain>
              {plan.others.map((o) => (
                <TouchableOpacity
                  key={o.uid}
                  testID={`delete-successor-${o.username}`}
                  onPress={() => setSuccessor(o.uid)}
                  style={s.radioRow}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: successor === o.uid }}
                >
                  <Text style={s.radioText}>{o.username}</Text>
                  <View style={[s.radio, { borderColor: successor === o.uid ? colors.gold : colors.inkFaint, borderWidth: successor === o.uid ? 6 : 2 }]} />
                </TouchableOpacity>
              ))}
            </SettingsGroup>
          )}

          <SettingsGroup label="Type your password to confirm" plain>
            <View style={s.pwRow}>
              <TextInput
                testID="delete-password"
                style={s.pw}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="Password"
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                accessibilityLabel="Password"
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.inkDim} />
              </TouchableOpacity>
            </View>
          </SettingsGroup>

          {!isOnline && <Text style={s.error}>You're offline. Deleting needs a connection.</Text>}
          {!!error && <Text style={s.error} testID="delete-error">{error}</Text>}
          {busy && <BusyWords messages={['Checking your password…', 'Leaving the household…', 'Deleting your account…', 'Almost done…']} style={{ marginBottom: 8 }} />}

          <Button label="Delete my account" variant="solidDanger" onPress={confirmDelete} disabled={!canDelete} loading={busy} testID="delete-confirm" />
          <TouchableOpacity onPress={() => navigation.push('SettingsPage', { subPage: 'backup' })} style={{ alignSelf: 'center', padding: 12 }} accessibilityRole="button">
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold }}>Save a backup first</Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAwareScrollView>
  );

  function Line({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
    return (
      <View style={s.line}>
        <Ionicons name={icon} size={20} color={colors.inkDim} style={{ width: 28, marginTop: 1 }} />
        <Text style={s.lineText}>{text}</Text>
      </View>
    );
  }
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    hero: { alignItems: 'center', paddingVertical: 8, marginBottom: 12 },
    heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    heroTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
    heroSub: { fontSize: 15, color: colors.inkDim, marginTop: 2 },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
    lineText: { flex: 1, fontSize: 16, lineHeight: 22, color: colors.ink },
    radioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 16 },
    radioText: { fontSize: 17, color: colors.ink },
    radio: { width: 22, height: 22, borderRadius: 11 },
    pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 52 },
    pw: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 10 },
    error: { fontSize: 15, color: colors.negative, textAlign: 'center', marginBottom: 12 },
    done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    doneIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    doneTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' },
    doneSub: { fontSize: 15, color: colors.inkDim, textAlign: 'center', marginTop: 6 },
  });
}
