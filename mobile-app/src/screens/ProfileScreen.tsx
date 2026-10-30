import { updateRecentAccountIfPresent } from '../recentAccounts';
import { codeTimeLeft } from '../linkCodeTime';
import { friendlyError } from '../friendlyError';
import ErrorNote from '../components/ErrorNote';
import { notSaved, TRY_AGAIN } from '../messages';
import { showLeafTick } from '../components/LeafTick';
import NeedsInternetSheet, { type NeedsInternet } from '../components/NeedsInternetSheet';
import React, { useState, useEffect, useRef } from 'react';
import { KeyboardAwareScrollView } from '../components/KeyboardAwareScrollView';
import DrawingLogo, { BusyWords } from '../components/DrawingLogo';
import { paintBusy } from '../components/BusyOverlay';
import { View, StyleSheet, SafeAreaView, ScrollView, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { TouchableOpacity } from '../components/Tap';
import { Text, TextInput } from '../components/AppText';
import { Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { MarkedLabel } from '../components/MarkedLabel';
import { useData } from '../DataContext';
import { getMyPersonId, setMyPersonId } from '../myPerson';
import { getCurrentFirebaseUser } from '../authFirebase';
import type { HouseholdModel, AvatarConfig, SavedAvatarPhoto } from '../types';
import Avatar from '../components/Avatar';
import AvatarPickerSheet from '../components/AvatarPickerSheet';
import {
  startHouseholdLink,
  startHouseholdInvite,
  joinHouseholdLink,
  finishJoinerLink,
  finishHostLink,
  subscribeToLinkCode,
  cancelLinkCode,
  LINK_CODE_TTL_MS,
  linkCodeUse,
  type JoinChoice,
} from '../linking';
import {
  loadPendingHostLink,
  clearPendingHostLink,
  loadProfilesIndex,
} from '../storage';
import {
  getHouseholdMemberCount,
  getHouseholdMembers,
  removeMemberByOwner,
  loadWrappedHouseholdKey,
  unwrapHouseholdKey,
  subscribeToHousehold,
  type HouseholdMemberInfo,
} from '../household';
import {
  getPeerRecoveryRequest,
  approvePeerRecoveryRequest,
  normalizePeerCode,
  formatPeerCode,
  PEER_CODE_LENGTH,
  type PeerRecoveryRequestDoc,
} from '../recovery';
import { hapticLight } from '../haptics';
import Button from '../components/Button';
import GradientFill from '../components/GradientFill';
import { SettingsGroup, PlainRow } from '../components/SettingsHub';
import BottomSheet from '../components/BottomSheet';
import LinkChoice from '../components/LinkChoice';
import { onPendingJoinCode, takePendingJoinLink } from '../joinLink';
import { LinkWaysRows, QrInviteModal, ScanJoinModal, TimerChip, askForCamera, shareInvite, useInviteCountdown } from '../components/HouseholdLinkWays';
import { getPreferredName, withPreferredName, MAX_PREFERRED_NAME_LENGTH } from '../preferredName';

export function getInitials(name: string): string {
  if (!name) return '?';
  const cleaned = name.trim();
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

// Firebase gives creationTime as a text date (or nothing). Returns e.g. "Sep 2026",
// or null when it is missing or unreadable so the card can simply be hidden.
function formatMemberSince(creationTime?: string): string | null {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function summarizeModel(m: HouseholdModel): string {
  const parts: string[] = [];
  const peopleCount = m.people?.length ?? 0;
  if (peopleCount > 0) parts.push(`${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`);
  const push = (n: number, singular: string) => {
    if (n > 0) parts.push(`${n} ${singular}${n === 1 ? '' : 's'}`);
  };
  push(m.income?.length ?? 0, 'income source');
  push(m.bills?.length ?? 0, 'bill');
  push(m.debts?.length ?? 0, 'debt');
  push(m.loans?.length ?? 0, 'loan');
  push(m.savingsGoals?.length ?? 0, 'savings goal');
  const acctCount =
    (m.balanceAccounts?.cash?.length ?? 0) +
    (m.balanceAccounts?.debit?.length ?? 0) +
    (m.balanceAccounts?.credit?.length ?? 0) +
    (m.balanceAccounts?.investment?.length ?? 0) +
    (m.balanceAccounts?.property?.length ?? 0) +
    (m.balanceAccounts?.vehicle?.length ?? 0);
  push(acctCount, 'account');
  push(m.travel?.length ?? 0, 'trip');
  push(m.events?.length ?? 0, 'event');
  push(m.yearlyGoals?.length ?? 0, 'year-end goal');
  return parts.length ? parts.join(', ') : 'No entries yet';
}

type ProfileScreenProps = {
  onLock: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
};

export default function ProfileScreen({ onLock, onSignOut, onSwitchAccount }: ProfileScreenProps) {
  const { colors, mode: themeMode } = useTheme();
  const navigation = useNavigation<any>();
  // Redesign: Settings opens this page either as your Profile or as the Household page.
  const route = useRoute<any>();
  const section: 'profile' | 'household' = route.params?.section === 'household' ? 'household' : 'profile';
  React.useLayoutEffect(() => {
    navigation.setOptions({ title: section === 'household' ? 'Household' : 'Profile', headerBackTitle: 'Settings' });
  }, [navigation, section]);
  const {
    model,
    saveModel,
    username,
    loadModel,
    isLinked,
    getPersonalKey,
    getHouseholdKey,
    getHouseholdId,
    unlinkHousehold,
    unlinkAndTransferOwnership,
    linkNoticeMsg,
    clearLinkNoticeMsg,
    pendingChanges,
    isOnline,
  } = useData();
  // Version 2.1 (S7): household steps need the internet; say so instead of spinning.
  const [needsNet, setNeedsNet] = useState<NeedsInternet>(null);
  const JOIN_WHY = 'The invite code and the keys that lock your shared data are swapped online.';
  const styles = makeStyles(colors);

  const currentUser = getCurrentFirebaseUser();
  const userEmail = currentUser?.email || 'No email registered';
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  // "What should we call you?": the name Home greets you with.
  const preferredName = getPreferredName(model, username);
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  function openNameSheet() {
    setNameDraft(preferredName);
    setNameSheetOpen(true);
  }
  async function saveName() {
    if (!model || !username || nameSaving) return;
    const next = withPreferredName(model, username, nameDraft);
    if (!next) {
      setNameSheetOpen(false);
      return;
    }
    setNameSaving(true);
    try {
      await saveModel(next);
      showLeafTick('Saved');
      setNameSheetOpen(false);
    } catch (e: any) {
      Alert.alert("Couldn't save your name", friendlyError(e, 'Please try again.'));
    } finally {
      setNameSaving(false);
    }
  }
  const memberSinceText = formatMemberSince(currentUser?.metadata?.creationTime);

  // Peer recovery approval state
  const [pendingRecovery, setPendingRecovery] = useState<PeerRecoveryRequestDoc | null>(null);
  const [pendingRecoveryId, setPendingRecoveryId] = useState<string | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalCodeInput, setApprovalCodeInput] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalErrorMsg, setApprovalErrorMsg] = useState('');

  // Start linking / Host invite state
  const [linkCode, setLinkCode] = useState('');
  // The code showing right now, for timers that run later.
  const linkCodeRef = useRef('');
  linkCodeRef.current = linkCode;
  const [linkSecretHex, setLinkSecretHex] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErrorMsg, setLinkErrorMsg] = useState('');
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const linkCodeExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkCooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearLinkCodeExpiryTimer() {
    if (linkCodeExpiryTimerRef.current) {
      clearTimeout(linkCodeExpiryTimerRef.current);
      linkCodeExpiryTimerRef.current = null;
    }
  }

  function clearLinkCooldownTimer() {
    if (linkCooldownTimerRef.current) {
      clearInterval(linkCooldownTimerRef.current);
      linkCooldownTimerRef.current = null;
    }
  }

  function beginLinkCooldown() {
    clearLinkCooldownTimer();
    setCooldownActive(true);
    setCooldownSeconds(60);

    linkCooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prevSeconds) => {
        if (prevSeconds <= 1) {
          clearLinkCooldownTimer();
          setCooldownActive(false);
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);
  }

  // Version 2.2 fix (Cath: the code stayed after its 15 minutes, even after using other
  // accounts): when the time is up, a code nobody has used is put away for good (also on
  // this phone's memory of it). A code someone already joined with stays, so linking can
  // still finish.
  async function handleLinkCodeExpired() {
    clearLinkCodeExpiryTimer();
    const code = linkCodeRef.current;
    const use = code ? await linkCodeUse(code) : 'unused';
    if (use === 'used') return;
    if (code && linkCodeRef.current !== code) return; // a new code was made meanwhile
    if (use === 'unused' && code) {
      cancelLinkCode(code).catch(() => {});
      if (username) clearPendingHostLink(username).catch(() => {});
    }
    setLinkCode('');
    setLinkSecretHex('');
    setHostFinishMsg('');
    setLinkErrorMsg('That invite code ran out (15 minutes). Make a new one when you are ready.');
  }

  useEffect(() => {
    return () => {
      clearLinkCodeExpiryTimer();
      clearLinkCooldownTimer();
    };
  }, []);

  // Restores an in-progress "start linking" (code + secret) if screen opens and one was left unfinished
  useEffect(() => {
    if (!username) return;
    let alive = true;
    loadPendingHostLink(username).then(async (pending) => {
      if (!pending || !alive) return;
      const left = codeTimeLeft(pending.at, LINK_CODE_TTL_MS);
      if (left > 0) {
        // Still within its 15 minutes: shown with the time that's really left.
        setLinkCode(pending.code);
        setLinkSecretHex(pending.secretHex);
        setCodeStartedAt(pending.at as number);
        clearLinkCodeExpiryTimer();
        linkCodeExpiryTimerRef.current = setTimeout(handleLinkCodeExpired, left);
        return;
      }
      // Past its 15 minutes (or made before codes remembered their time).
      const use = await linkCodeUse(pending.code);
      if (!alive) return;
      if (use === 'used') {
        // Someone joined with it in time: keep it so linking can finish.
        setLinkCode(pending.code);
        setLinkSecretHex(pending.secretHex);
        return;
      }
      if (use === 'unused') {
        cancelLinkCode(pending.code).catch(() => {});
        clearPendingHostLink(username).catch(() => {});
      }
    });
    return () => {
      alive = false;
    };
  }, [username]);

  // Host side finish linking state
  const [hostFinishBusy, setHostFinishBusy] = useState(false);
  const [hostFinishMsg, setHostFinishMsg] = useState('');
  const hostFinishInFlightRef = useRef(false);

  // Join with a code state
  const [joinCodeInput, setJoinCodeInput] = useState('');
  // Version 2.2 (canvas M5): QR, scan, type-a-code and the invite countdown.
  const [qrOpen, setQrOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [typingCode, setTypingCode] = useState(false);
  const [codeStartedAt, setCodeStartedAt] = useState<number | null>(null);
  const inviteCountdown = useInviteCountdown(linkCode ? codeStartedAt : null);
  // The QR screen closes by itself once the invite is used up or cancelled.
  useEffect(() => {
    if (!linkCode) setQrOpen(false);
  }, [linkCode]);
  const [joinedCode, setJoinedCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErrorMsg, setJoinErrorMsg] = useState('');

  const [joinResult, setJoinResult] = useState<{
    hostUsername: string;
    hostModel: HouseholdModel;
    secretHex: string;
    existingHouseholdId?: string;
    isInvite?: boolean;
  } | null>(null);
  const [joinChoiceBusy, setJoinChoiceBusy] = useState(false);
  const [joinChoiceMsg, setJoinChoiceMsg] = useState('');

  const [isOwner, setIsOwner] = useState(false);
  const [householdMemberCount, setHouseholdMemberCount] = useState<number>(0);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMemberInfo[]>([]);

  const [memberToRemove, setMemberToRemove] = useState<HouseholdMemberInfo | null>(null);
  const [removeMemberBusy, setRemoveMemberBusy] = useState(false);
  const [removeMemberMsg, setRemoveMemberMsg] = useState('');
    const [myPersonId, setMyPersonIdState] = useState<string | null>(null);
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);
  const [myPersonBusy, setMyPersonBusy] = useState(false);
  const [myPersonMsg, setMyPersonMsg] = useState('');

  useEffect(() => {
    if (!username) return;
    getMyPersonId(username).then(setMyPersonIdState);
  }, [username]);
  const [transferOwnerModalOpen, setTransferOwnerModalOpen] = useState(false);
  const [selectedSuccessorUid, setSelectedSuccessorUid] = useState<string>('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  // Household subscription listener
  useEffect(() => {
    if (!isLinked || !username) {
      setIsOwner(false);
      setHouseholdMemberCount(0);
      setHouseholdMembers([]);
      return;
    }
    let unsubscribeHousehold: (() => void) | null = null;
    let active = true;

    (async () => {
      try {
        const profiles = await loadProfilesIndex();
        const profile = profiles.find((p) => p.username === username);
        const householdId = profile?.householdId;
        if (!householdId || !active) {
          setIsOwner(false);
          setHouseholdMemberCount(0);
          setHouseholdMembers([]);
          return;
        }

        const currentUid = getCurrentFirebaseUser()?.uid;

        unsubscribeHousehold = subscribeToHousehold(
          householdId,
          (snapshotData) => {
            if (!active) return;
            if (!snapshotData) {
              setIsOwner(false);
              setHouseholdMemberCount(0);
              setHouseholdMembers([]);
              return;
            }
            const members = snapshotData.members || [];
            const ownerUid = snapshotData.owner || members[0] || null;
            const usernames = snapshotData.memberUsernames || {};
            const memberList: HouseholdMemberInfo[] = members.map((uid) => ({
              uid,
              username: usernames[uid] || (uid === ownerUid ? 'Owner' : 'Member'),
              isOwner: uid === ownerUid,
            }));
            setIsOwner(Boolean(currentUid && ownerUid === currentUid));
            setHouseholdMemberCount(members.length);
            setHouseholdMembers(memberList);

            const pendingReqId = snapshotData.pendingRecoveryRequestId;
            if (pendingReqId) {
              getPeerRecoveryRequest(pendingReqId)
                .then((req) => {
                  if (!active) return;
                  if (req && req.status === 'pending' && req.requesterUid !== currentUid) {
                    setPendingRecovery(req);
                    setPendingRecoveryId(pendingReqId);
                  } else {
                    setPendingRecovery(null);
                    setPendingRecoveryId(null);
                  }
                })
                .catch(() => {});
            } else {
              setPendingRecovery(null);
              setPendingRecoveryId(null);
            }
          },
          () => {
            if (!active) return;
            setIsOwner(false);
            setHouseholdMemberCount(0);
            setHouseholdMembers([]);
            setPendingRecovery(null);
            setPendingRecoveryId(null);
          }
        );
      } catch (e) {
        if (active) {
          setIsOwner(false);
          setHouseholdMemberCount(0);
          setHouseholdMembers([]);
        }
      }
    })();

    return () => {
      active = false;
      if (unsubscribeHousehold) {
        unsubscribeHousehold();
      }
    };
  }, [isLinked, username]);

  // Checkpoint A.6: host side — finish automatically via listener
  useEffect(() => {
    if (!linkCode || !linkSecretHex || !username) return;
    const expectedUid = getCurrentFirebaseUser()?.uid;
    if (!expectedUid) return;
    let active = true;
    const unsubscribe = subscribeToLinkCode(linkCode, async () => {
      if (!active || hostFinishInFlightRef.current) return;
      const personalKey = getPersonalKey();
      if (!personalKey) return;
      hostFinishInFlightRef.current = true;
      setHostFinishBusy(true);
      setHostFinishMsg('');
      try {
        const result = await finishHostLink(linkCode, username, linkSecretHex, personalKey, expectedUid);
        if (active && result.status === 'done') {
          clearLinkCodeExpiryTimer();
          setLinkCode('');
          setLinkSecretHex('');
          setLinkErrorMsg('');
          setHostFinishMsg('Linked! Loading your shared data…');
          unsubscribe();
          // Version 2.2 (Cath: the inviter stayed on "Almost there…" for minutes): linking
          // is done at this point. Loading the shared household carries on in the
          // background instead of holding the busy animation until it finishes.
          hostFinishInFlightRef.current = false;
          if (active) setHostFinishBusy(false);
          loadModel(username, personalKey)
            .then(() => {
              if (active) setHostFinishMsg('Linked! You now share one household.');
            })
            .catch(() => {});
          return;
        }
      } catch (e) {
        if (active) setHostFinishMsg("Couldn't finish linking — check your connection and try again.");
      }
      hostFinishInFlightRef.current = false;
      if (active) setHostFinishBusy(false);
    }, handleLinkCodeExpired);
    return () => {
      active = false;
      clearLinkCodeExpiryTimer();
      unsubscribe();
    };
  }, [linkCode, linkSecretHex, username, loadModel]);

  // Handlers
  async function handleStartLinking(): Promise<string | null> {
    if (!isOnline) {
      setNeedsNet({ title: 'Making an invite needs the internet', why: 'The invite code and the keys that lock your shared data are swapped online.', retry: () => { handleStartLinking(); } });
      return null;
    }
    if (!model || !username) return null;
    let made: string | null = null;
    setLinkErrorMsg('');
    setLinkBusy(true);
    try {
      const result = await startHouseholdLink(username, model);
      clearLinkCodeExpiryTimer();
      setLinkCode(result.code);
      setCodeStartedAt(Date.now());
      made = result.code;
      setLinkSecretHex(result.secretHex);
      setHostFinishMsg('');
      beginLinkCooldown();
      linkCodeExpiryTimerRef.current = setTimeout(handleLinkCodeExpired, LINK_CODE_TTL_MS);
    } catch (e) {
      setLinkErrorMsg("Couldn't start linking — check your connection and try again.");
    }
    setLinkBusy(false);
    return made;
  }

  async function handleStartHouseholdInvite(): Promise<string | null> {
    if (!isOnline) {
      setNeedsNet({ title: 'Making an invite needs the internet', why: 'The invite code and the keys that lock your shared data are swapped online.', retry: () => { handleStartHouseholdInvite(); } });
      return null;
    }
    if (!model || !username || !isLinked) return null;
    let made: string | null = null;
    const householdId = (await loadProfilesIndex()).find((p) => p.username === username)?.householdId;
    const personalKey = getPersonalKey();
    if (!householdId || !personalKey) {
      setLinkErrorMsg('This household is not ready for an invite right now.');
      return null;
    }
    setLinkErrorMsg('');
    setLinkBusy(true);
    if (linkCode) {
      await cancelLinkCode(linkCode);
      setLinkCode('');
      setLinkSecretHex('');
    }
    try {
      const currentCount = await getHouseholdMemberCount(householdId);
      setHouseholdMemberCount(currentCount);
      if (currentCount >= 5) {
        setLinkErrorMsg('This household is full (5 of 5) — remove someone before inviting another person.');
        setLinkBusy(false);
        return null;
      }
      const wrapped = await loadWrappedHouseholdKey(username);
      if (!wrapped || wrapped.householdId !== householdId) {
        throw new Error('Linked household key not found.');
      }
      const householdKey = unwrapHouseholdKey(wrapped.wrappedKey, personalKey);
      const result = await startHouseholdInvite(householdId, householdKey, model, username);
      clearLinkCodeExpiryTimer();
      setLinkCode(result.code);
      setCodeStartedAt(Date.now());
      made = result.code;
      setLinkSecretHex(result.secretHex);
      setHostFinishMsg('');
      beginLinkCooldown();
      linkCodeExpiryTimerRef.current = setTimeout(handleLinkCodeExpired, LINK_CODE_TTL_MS);
    } catch (e) {
      setLinkErrorMsg("Couldn't create the invite — check your connection and try again.");
    }
    setLinkBusy(false);
    return made;
  }

  // Version 2.2 (canvas M5): the new ways to link.
  async function ensureInviteCode(): Promise<string | null> {
    if (linkCode) return linkCode;
    return isLinked ? handleStartHouseholdInvite() : handleStartLinking();
  }
  async function handleSendInvite() {
    const fresh = !linkCode;
    const code = await ensureInviteCode();
    if (code) shareInvite(code, preferredName || undefined, fresh ? Date.now() : codeStartedAt).catch(() => {});
  }
  async function handleShowQr() {
    const code = await ensureInviteCode();
    if (code) setQrOpen(true);
  }
  // Always the newest version of the join step (it reads the connection, data, etc.).
  const joinWithCodeRef = useRef(handleJoinWithCode);
  joinWithCodeRef.current = handleJoinWithCode;
  function handleScanned(code: string) {
    setScanOpen(false);
    setJoinCodeInput(code);
    setTypingCode(true);
    setTimeout(() => joinWithCodeRef.current(code), 350);
  }
  // Version 2.2: a code from an invite link (see joinLink.ts) joins like a scanned one.
  useEffect(() => {
    let alive = true;
    const check = () => {
      takePendingJoinLink().then((link) => {
        if (!alive || !link) return;
        if (isLinked) {
          Alert.alert('Already in a household', 'To join a different household, first use "Unlink this device" on this page.');
          return;
        }
        // SEC-7 (Cath's OK, 2026-10-27): a link never starts joining by itself.
        Alert.alert(
          link.from ? `Join ${link.from}'s household?` : 'Join a household?',
          'Only join if you know who sent you this link. Everyone in a household sees all its money.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Join', onPress: () => handleScanned(link.code) },
          ]
        );
      });
    };
    check();
    const off = onPendingJoinCode(check);
    return () => {
      alive = false;
      off();
    };
  }, [isLinked]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cancels the open invite/link code without making a new one.
  async function handleCancelInvite() {
    const oldCode = linkCode;
    setLinkBusy(true);
    try {
      if (oldCode) await cancelLinkCode(oldCode);
    } catch {}
    if (username) await clearPendingHostLink(username).catch(() => {});
    clearLinkCodeExpiryTimer();
    setLinkCode('');
    setLinkSecretHex('');
    setHostFinishMsg('');
    setLinkErrorMsg('');
    setLinkBusy(false);
  }

  async function handleStartOverLinking() {
    const oldCode = linkCode;
    if (oldCode) {
      await cancelLinkCode(oldCode);
    }
    if (username) await clearPendingHostLink(username);
    clearLinkCodeExpiryTimer();
    setLinkCode('');
    setLinkSecretHex('');
    setHostFinishMsg('');
    if (isLinked) {
      await handleStartHouseholdInvite();
    } else {
      await handleStartLinking();
    }
  }

  async function handleJoinWithCode(codeOverride?: string) {
    const codeText = typeof codeOverride === 'string' ? codeOverride : joinCodeInput;
    if (!isOnline) {
      setNeedsNet({ title: 'Joining a household needs the internet', why: JOIN_WHY, retry: () => handleJoinWithCode(codeText) });
      return;
    }
    setJoinErrorMsg('');
    setJoinChoiceMsg('');
    if (!codeText.trim()) {
      setJoinErrorMsg('Enter the code from the other phone.');
      return;
    }
    if (!username) {
      setJoinErrorMsg(TRY_AGAIN);
      return;
    }
    setJoinBusy(true);
    await paintBusy();
    try {
      const normalizedCode = codeText.trim().toUpperCase();
      const result = await joinHouseholdLink(codeText, username); // the timer sits on its online steps only
      setJoinResult(result);
      setJoinedCode(normalizedCode);
    } catch (e: any) {
      if (e?.code === 'net-timeout') {
        setJoinBusy(false);
        setNeedsNet({ title: 'The connection is too slow right now', why: 'Joining a household needs the internet. ' + JOIN_WHY, retry: handleJoinWithCode });
        return;
      }
      setJoinErrorMsg("That code doesn't look right, or it's expired — check it and try again.");
    }
    setJoinBusy(false);
  }

  async function handleJoinChoice(choice: JoinChoice) {
    if (!model || !username || !joinResult || !joinedCode) return;
    if (!isOnline) {
      setNeedsNet({ title: 'Joining a household needs the internet', why: JOIN_WHY, retry: () => handleJoinChoice(choice) });
      return;
    }
    const personalKey = getPersonalKey();
    if (!personalKey) {
      setJoinChoiceMsg(TRY_AGAIN);
      return;
    }
    setJoinChoiceBusy(true);
    await paintBusy();
    setJoinChoiceMsg('');
    try {
      await finishJoinerLink(
        joinedCode,
        choice,
        username,
        model,
        joinResult.hostModel,
        joinResult.secretHex,
        personalKey,
        joinResult.existingHouseholdId
      );
      setJoinChoiceMsg('Linked! Loading your shared data…');
      setJoinResult(null);
      setJoinCodeInput('');
      setJoinedCode('');
      // Version 2.2: linking is done; the shared household loads in the background
      // instead of keeping "Almost there…" on screen until it has fully loaded.
      loadModel(username, personalKey)
        .then(() => setJoinChoiceMsg('Linked! You now share one household.'))
        .catch(() => {});
    } catch (e) {
      setJoinChoiceMsg((e as Error)?.message || "That didn't work. Check your internet connection, then try again.");
    }
    setJoinChoiceBusy(false);
  }

  // Unlink handler
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  // Version 2.1 (round 6): what the household card says while it works (null = not busy).
  const hhWords: string[] | null = joinBusy
    ? ['Checking the code…', 'Linking your households…', 'Almost there…']
    : joinChoiceBusy
    ? ['Combining your data…', 'Linking your households…', 'Almost there…']
    : unlinkBusy || transferBusy
    ? ['Unlinking this phone…', 'Keeping a copy of your own data…', 'Almost there…']
    : hostFinishBusy
    ? ['Finishing the link…', 'Combining your data…', 'Almost there…']
    : linkBusy
    ? ['Making your code…', 'Almost there…']
    : null;
  const [unlinkMsg, setUnlinkMsg] = useState('');

  async function handleUnlinkHousehold() {
    setUnlinkMsg('');
    setUnlinkBusy(true);
    await paintBusy();
    if (linkCode) {
      cancelLinkCode(linkCode).catch(() => {});
      setLinkCode('');
      setLinkSecretHex('');
    }
    const result = await unlinkHousehold();
    setUnlinkBusy(false);
    if (!result.ok) {
      setUnlinkMsg(result.error || TRY_AGAIN);
      return;
    }
    setUnlinkConfirmOpen(false);
  }

  // Owner remove member handler
  async function handleRemoveMember() {
    if (!memberToRemove || !username) return;
    setRemoveMemberBusy(true);
    setRemoveMemberMsg('');
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      const householdId = profile?.householdId;
      if (!householdId) throw new Error('Not linked to a household.');
      await removeMemberByOwner(householdId, memberToRemove.uid);
      const [count, members] = await Promise.all([
        getHouseholdMemberCount(householdId),
        getHouseholdMembers(householdId),
      ]);
      setHouseholdMemberCount(count);
      setHouseholdMembers(members);
      setMemberToRemove(null);
    } catch (e: any) {
      setRemoveMemberMsg(friendlyError(e, "Couldn't remove them. Nothing changed, so please try again in a moment."));
    } finally {
      setRemoveMemberBusy(false);
    }
  }

  // Owner transfer ownership and unlink handler
  async function handleTransferAndUnlink() {
    if (!selectedSuccessorUid) return;
    setTransferBusy(true);
    setTransferMsg('');
    if (linkCode) {
      cancelLinkCode(linkCode).catch(() => {});
      setLinkCode('');
      setLinkSecretHex('');
    }
    const result = await unlinkAndTransferOwnership(selectedSuccessorUid);
    setTransferBusy(false);
    if (!result.ok) {
      setTransferMsg(result.error || "Couldn't hand over the household. Nothing changed, so please try again in a moment.");
      return;
    }
    setTransferOwnerModalOpen(false);
  }

  // Peer recovery approval handler
  async function handleApprovePeerRecovery() {
    if (!pendingRecoveryId) return;
    const householdId = getHouseholdId();
    const householdKey = getHouseholdKey();
    if (!householdId || !householdKey) {
      setApprovalErrorMsg('Could not find shared household key in memory.');
      return;
    }
    setApprovalBusy(true);
    setApprovalErrorMsg('');
    try {
      await approvePeerRecoveryRequest(
        householdId,
        pendingRecoveryId,
        approvalCodeInput.trim(),
        householdKey
      );
      setApprovalBusy(false);
      setApprovalModalOpen(false);
      setPendingRecovery(null);
      setPendingRecoveryId(null);
      setApprovalCodeInput('');
    } catch (e: any) {
      setApprovalBusy(false);
      setApprovalErrorMsg(friendlyError(e, 'Could not approve request. Check the code and try again.'));
    }
  }

  // PC.5a: save (or clear) this user's avatar inside the encrypted household model.
  // Passing `photos` also replaces this user's saved photos ("Your photos").
  async function handleSaveAvatar(config: AvatarConfig | null, photos?: SavedAvatarPhoto[]) {
    if (!model || !username) throw new Error('Not ready');
    const nextAvatars = { ...(model.avatars ?? {}) };
    if (config) {
      nextAvatars[username] = { ...config, updatedAt: Date.now() };
    } else {
      delete nextAvatars[username];
    }
    let nextPhotos = model.avatarPhotos;
    if (photos) {
      nextPhotos = { ...(model.avatarPhotos ?? {}) };
      if (photos.length > 0) nextPhotos[username] = photos;
      else delete nextPhotos[username];
    }
    await saveModel({ ...model, avatars: nextAvatars, avatarPhotos: nextPhotos });
    showLeafTick('Saved');
    updateRecentAccountIfPresent(username, {
      avatarConfig: nextAvatars[username] ?? { type: 'initials' },
    }).catch(() => {});
  }

  // The invite code card: the code, a "waiting" line, then New code / Cancel invite.
  const inviteCard = (hint: string) => (
    <View>
      <Text style={styles.hhLabel}>INVITE</Text>
      <View style={styles.hhCodeCard}>
        <GradientFill match={styles.hhCodeCard} />
        <Text style={styles.hhRole}>Give this code to the other phone</Text>
        <Text selectable style={[styles.hhCode, { color: colors.ink }]}>{linkCode}</Text>
        <TimerChip text={inviteCountdown} />
        <Text style={[styles.hhRole, { textAlign: 'center', marginTop: 6 }]}>{hint}</Text>
        {/* Version 2.2 (canvas M5b): send it through any app, or show a QR code. */}
        <View style={[styles.hhCodeButtons, { marginTop: 10 }]}>
          <TouchableOpacity style={[styles.hhCodeBtn, { backgroundColor: colors.buttonFill }]} onPress={() => shareInvite(linkCode, preferredName || undefined, codeStartedAt).catch(() => {})} accessibilityRole="button" testID="invite-send">
            <Text style={[styles.hhCodeBtnText, { color: colors.onButton }]}>Send invite</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hhCodeBtn, { backgroundColor: colors.navy2 }]} onPress={() => setQrOpen(true)} accessibilityRole="button" testID="invite-show-qr">
            <Text style={[styles.hhCodeBtnText, { color: colors.gold }]}>Show QR code</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <DrawingLogo width={22} drawing wordmark={false} />
          <Text style={styles.hhRole}>{hostFinishBusy ? 'Finishing…' : 'Waiting for them to join…'}</Text>
        </View>
        {!!hostFinishMsg && (
          <Text style={[hostFinishMsg.startsWith('Linked') ? styles.successText : styles.errorText, { marginTop: 8 }]}>{hostFinishMsg}</Text>
        )}
        <View style={styles.hhCodeButtons}>
          <TouchableOpacity
            style={[styles.hhCodeBtn, { backgroundColor: colors.navy2, opacity: cooldownActive ? 0.5 : 1 }]}
            onPress={handleStartOverLinking}
            disabled={linkBusy || cooldownActive}
            accessibilityRole="button"
          >
            <Text style={[styles.hhCodeBtnText, { color: colors.gold }]}>{linkBusy ? 'Making…' : cooldownActive ? `New code (${cooldownSeconds}s)` : 'New code'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.hhCodeBtn, { backgroundColor: colors.errorBg }]}
            onPress={handleCancelInvite}
            disabled={linkBusy}
            accessibilityRole="button"
          >
            <Text style={[styles.hhCodeBtnText, { color: colors.negative }]}>Cancel invite</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const unlinkConfirmText =
    householdMemberCount <= 1 || (isOwner && householdMemberCount <= 2)
      ? 'This will dissolve the household. Your data becomes your personal profile.'
      : 'This gives you a separate copy going forward. Others stay linked with each other.';

  return (
    <>
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent}>
        {section === 'profile' && (<>
        {/* Profile: picture, name and email, then plain grouped rows. */}
        <View style={styles.identityHeader}>
          <TouchableOpacity
            testID="avatar-edit-button"
            activeOpacity={0.8}
            onPress={() => setAvatarSheetOpen(true)}
            accessibilityLabel="Change profile picture"
            style={{ marginBottom: 12 }}
          >
            <Avatar
              initials={getInitials(username || '')}
              config={model?.avatars?.[username || '']}
              size={96}
            />
            <View style={[styles.cameraBadge, { backgroundColor: colors.buttonFill, borderColor: colors.navy2 }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          {!!preferredName && <Text style={styles.usernameText}>{preferredName}</Text>}
          <Text style={preferredName ? styles.handleText : styles.usernameText}>{username || 'user'}</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>

        <SettingsGroup plain>
          <PlainRow
            testID="profile-row-name"
            title="Name"
            value={preferredName || 'Add'}
            onPress={openNameSheet}
          />
          <PlainRow title="Username" value={username || 'user'} />
          {!!memberSinceText && <PlainRow title="Member since" value={memberSinceText} />}
        </SettingsGroup>

        <SettingsGroup plain>
          <PlainRow
            testID="profile-row-household"
            title="Household"
            value={isLinked ? `Shared · ${householdMemberCount}` : 'Just you'}
            onPress={() => navigation.push('Profile', { section: 'household' })}
          />
          <PlainRow
            testID="profile-row-security"
            title="Account & Security"
            onPress={() => navigation.push('SettingsPage', { subPage: 'sec' })}
          />
        </SettingsGroup>

        <SettingsGroup plain>
          <PlainRow
            testID="profile-row-appearance"
            title="Appearance"
            value={themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'Auto'}
            onPress={() => navigation.push('SettingsPage', { subPage: 'look' })}
          />
          <PlainRow
            testID="profile-row-notifications"
            title="Notifications"
            value={model?.settings.pushNotificationsEnabled ? 'On' : 'Off'}
            onPress={() => navigation.push('SettingsPage', { subPage: 'notify' })}
          />
        </SettingsGroup>

        </>)}
        {section === 'household' && (<>
        {/* Household: a status card, then plain grouped rows. */}
        <View style={styles.hhStatus}>
          <GradientFill match={styles.hhStatus} />
          {/* Version 2.1 (round 6, Q5/X3): while linking, joining, merging or unlinking,
              the icon becomes the logo drawing itself and the line says what it's doing. */}
          {hhWords ? (
            <View style={[styles.hhIcon, { alignItems: 'center', justifyContent: 'center' }]}>
              <DrawingLogo width={40} drawing wordmark={false} />
            </View>
          ) : (
            <View style={[styles.hhIcon, { backgroundColor: colors.accentTint }]}>
              <Ionicons name="people-outline" size={24} color={colors.gold} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.hhTitle}>{isLinked ? 'Shared household' : 'Just you'}</Text>
            {hhWords ? (
              <BusyWords key={hhWords[0]} messages={hhWords} style={{ textAlign: 'left', fontSize: 15 }} />
            ) : (
              <Text style={styles.hhSub}>
                {isLinked
                  ? `${householdMemberCount || 2} of 5 people · anything anyone adds shows up for everyone`
                  : 'Share with up to 4 others so everyone sees the same money'}
              </Text>
            )}
          </View>
        </View>

        {!!linkNoticeMsg && (
          <View style={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy2, marginBottom: 14 }]}>
            <GradientFill match={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy2, marginBottom: 14 }]} />
            <Text style={[styles.hintText, { color: colors.ink, fontWeight: '600', marginBottom: 8 }]}>
              {linkNoticeMsg}
            </Text>
            <TouchableOpacity
              style={[styles.dataButton, { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12 }]}
              onPress={clearLinkNoticeMsg}
            >
              <GradientFill match={[styles.dataButton, { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12 }]} />
              <Text style={styles.dataButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!pendingRecovery && (
          <View style={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy3, marginBottom: 14 }]}>
            <GradientFill match={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy3, marginBottom: 14 }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="warning-outline" size={15} color={colors.gold} style={{ marginRight: 6 }} />
              <Text style={[styles.hintText, { color: colors.gold, fontWeight: '700', marginBottom: 0 }]}>
                Account Recovery Request
              </Text>
            </View>
            <Text style={[styles.hintText, { color: colors.ink, marginBottom: 8 }]}>
  {pendingRecovery.requesterUsername} is requesting recovery. If you're with them, verify their identity and send the household key.
</Text>
            <TouchableOpacity
              style={[styles.dataButton, { alignSelf: 'flex-start' }]}
              onPress={() => {
                setApprovalCodeInput('');
                setApprovalErrorMsg('');
                setApprovalModalOpen(true);
              }}
            >
              <GradientFill match={[styles.dataButton, { alignSelf: 'flex-start' }]} />
              <Text style={styles.dataButtonText}>Review &amp; Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLinked ? (
          <>
            {!linkCode ? (
              !unlinkConfirmOpen && !transferOwnerModalOpen ? (
                <View>
                  <SettingsGroup label="Members" plain footer={isOwner && householdMemberCount >= 5 ? 'Household full (5 of 5). Remove someone to invite another person.' : 'Up to 5 people can share one household.'}>
                    {householdMembers.map((m, idx) => {
                      const isMe = m.uid === getCurrentFirebaseUser()?.uid;
                      const avatarName = isMe ? (username || m.username) : m.username;
                      const isFallbackName = !isMe && (m.username === 'Owner' || m.username === 'Member');
                      const avatarConfig = isFallbackName ? undefined : model?.avatars?.[avatarName];
                      return (
                        <View key={m.uid} style={styles.hhRow}>
                          <Avatar initials={getInitials(avatarName)} config={avatarConfig} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.hhName} numberOfLines={1}>{m.username}{isMe ? ' (you)' : ''}</Text>
                            <Text style={styles.hhRole}>{m.isOwner ? 'Owner' : 'Member'}</Text>
                          </View>
                          {isOwner && !isMe && (
                            <TouchableOpacity
                              hitSlop={8}
                              onPress={() => {
                                setRemoveMemberMsg('');
                                setMemberToRemove(m);
                              }}
                            >
                              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.negative }}>Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                    {isOwner && householdMemberCount < 5 && (
                      <TouchableOpacity style={styles.hhRow} onPress={handleStartHouseholdInvite} disabled={linkBusy} accessibilityRole="button">
                        <Ionicons name="add" size={22} color={colors.gold} style={{ opacity: linkBusy ? 0.4 : 1 }} />
                        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.gold }}>
                          {linkBusy ? 'Making an invite code…' : 'Invite someone'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </SettingsGroup>
                  <ErrorNote text={linkErrorMsg} />

                  {/* Remove Member Confirmation Box */}
                  {memberToRemove && (
                    <View style={styles.dangerConfirmBox}>
  <Text style={styles.dangerConfirmText}>
    Remove {memberToRemove.username} from the household? They'll keep a personal copy of everything.
  </Text>
  <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Button
                            variant="solidDanger"
                            label="Yes, remove"
                            onPress={handleRemoveMember}
                            loading={removeMemberBusy}
                            disabled={removeMemberBusy}
                            style={{ flex: 1 }}
                          />
                          <Button
                            variant="secondary"
                            label="Cancel"
                            onPress={() => setMemberToRemove(null)}
                            disabled={removeMemberBusy}
                            style={{ flex: 1 }}
                          />
                      </View>
                      {!!removeMemberMsg && <Text style={[styles.errorText, { marginTop: 6 }]}>{removeMemberMsg}</Text>}
                    </View>
                  )}


                  {model?.people && model.people.length > 0 && (
                    <>
                      <SettingsGroup label="Which one is you?" plain footer={'Decides what shows as "Mine" on Transactions. Others see it with your name.'}>
                        {model.people.map((p) => {
                          const selected = p.id === (pendingPersonId ?? myPersonId);
                          return (
                            <PlainRow
                              key={p.id}
                              title={p.name || 'Unnamed'}
                              onPress={() => {
                                setMyPersonMsg('');
                                setPendingPersonId(p.id);
                              }}
                              right={selected ? <Ionicons name="checkmark" size={22} color={colors.gold} /> : <View />}
                            />
                          );
                        })}
                      </SettingsGroup>
                      <View style={{ marginTop: -14, marginBottom: 16 }}>
                      {pendingPersonId !== null && pendingPersonId !== myPersonId && (
                        <View style={{ marginTop: 10 }}>
                          {!!myPersonMsg && <Text style={[styles.errorText, { marginBottom: 6 }]}>{myPersonMsg}</Text>}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={[styles.dataButton, { flex: 1, marginBottom: 0 }]}
                              disabled={myPersonBusy}
                              onPress={async () => {
                                if (!username || !pendingPersonId) return;
                                setMyPersonBusy(true);
                                setMyPersonMsg('');
                                try {
                                  await setMyPersonId(username, pendingPersonId);
                                  setMyPersonIdState(pendingPersonId);
                                  setPendingPersonId(null);
                                } catch (e) {
                                  setMyPersonMsg(notSaved('this change'));
                                } finally {
                                  setMyPersonBusy(false);
                                }
                              }}
                            >
                              <GradientFill match={[styles.dataButton, { flex: 1, marginBottom: 0 }]} />
                              {myPersonBusy ? (
                                <ActivityIndicator color={colors.gold} />
                              ) : (
                                <Text style={styles.dataButtonText}>Confirm</Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.cancelInlineButton, { flex: 1 }]}
                              disabled={myPersonBusy}
                              onPress={() => {
                                setPendingPersonId(null);
                                setMyPersonMsg('');
                              }}
                            >
                              <GradientFill match={[styles.cancelInlineButton, { flex: 1 }]} />
                              <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      </View>
                    </>
                  )}

                  <SettingsGroup plain footer="This phone keeps its own copy from now on. The shared data and anyone else linked stay as they are.">
                    <PlainRow
                      title="Unlink this device"
                      danger
                      onPress={() => {
                        const currentUid = getCurrentFirebaseUser()?.uid;
                        const otherMembers = householdMembers.filter((m) => m.uid !== currentUid);
                        if (isOwner && otherMembers.length > 1) {
                          setSelectedSuccessorUid(otherMembers[0].uid);
                          setTransferMsg('');
                          setTransferOwnerModalOpen(true);
                        } else {
                          setUnlinkConfirmOpen(true);
                        }
                      }}
                    />
                  </SettingsGroup>
                </View>
              ) : transferOwnerModalOpen ? (
                <View style={styles.dangerConfirmBox}>
                  <Text style={styles.linkCodeLabel}>Transfer Ownership &amp; Unlink</Text>
                  {(() => {
                    const currentUid = getCurrentFirebaseUser()?.uid;
                    const otherMembers = householdMembers.filter((m) => m.uid !== currentUid);
                                        if (otherMembers.length === 1) {
                      return (
                        <Text style={styles.dangerConfirmText}>
                          Transfer ownership to {otherMembers[0].username} and leave? Since only one person remains, the household becomes personal data.
                        </Text>
                      );
                    }
                    return (
                      <>
                        <Text style={styles.dangerConfirmText}>
                          Choose who takes over before you leave. You'll keep a personal copy of all current data.
                        </Text>
                        <View style={{ marginVertical: 10, gap: 6 }}>
                          {otherMembers.map((m) => {
                            const isSelected = selectedSuccessorUid === m.uid;
                            return (
                              <TouchableOpacity
                                key={m.uid}
                                style={[
                                  styles.modeButton,
                                  isSelected && styles.modeButtonActive,
                                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12 }
                                ]}
                                onPress={() => setSelectedSuccessorUid(m.uid)}
                              >
                                <GradientFill match={[
                                  styles.modeButton,
                                  isSelected && styles.modeButtonActive,
                                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12 }
                                ]} />
                                <Text style={[styles.modeButtonText, isSelected && styles.modeButtonTextActive]}>
                                  {m.username}
                                </Text>
                                {isSelected && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="checkmark" size={14} color={colors.gold} style={{ marginRight: 4 }} />
                                    <Text style={{ color: colors.gold, fontWeight: '700' }}>New Owner</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    );
                  })()}

                  {!!transferMsg && <Text style={styles.errorText}>{transferMsg}</Text>}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button
                        variant="solidDanger"
                        label="Transfer & Leave"
                        onPress={handleTransferAndUnlink}
                        loading={transferBusy}
                        disabled={transferBusy || !selectedSuccessorUid}
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="secondary"
                        label="Cancel"
                        onPress={() => setTransferOwnerModalOpen(false)}
                        disabled={transferBusy}
                        style={{ flex: 1 }}
                      />
                  </View>
                </View>
              ) : (
                <View style={styles.dangerConfirmBox}>
                  <Text style={styles.dangerConfirmText}>{unlinkConfirmText}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Button
                        variant="solidDanger"
                        label="Yes, unlink this device"
                        onPress={handleUnlinkHousehold}
                        loading={unlinkBusy}
                        disabled={unlinkBusy}
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="secondary"
                        label="Cancel"
                        onPress={() => setUnlinkConfirmOpen(false)}
                        disabled={unlinkBusy}
                        style={{ flex: 1 }}
                      />
                  </View>
                  {!!unlinkMsg && <Text style={styles.errorText}>{unlinkMsg}</Text>}
                </View>
              )
            ) : (
              inviteCard('On their phone: Household › Scan to join, or Type a code')
            )}
          </>
        ) : (
          <>
            {!linkCode && !joinResult && (
              <>
                <SettingsGroup plain footer={`Invite: they join your household. Join: you join theirs. Codes work for 15 minutes.`}>
                  <LinkWaysRows
                    busy={linkBusy || joinBusy}
                    onSend={handleSendInvite}
                    onShowQR={handleShowQr}
                    onScan={async () => {
                      // Version 2.2: ask for the camera right away (the phone's own pop-up).
                      await askForCamera();
                      setScanOpen(true);
                    }}
                    onType={() => setTypingCode((v) => !v)}
                  />
                  {typingCode && (
                  <View style={styles.hhRow}>
                    <TextInput
                      style={{ flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 8 }}
                      placeholder="Type the 6-letter code"
                      autoFocus
                      placeholderTextColor={colors.inkFaint}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      value={joinCodeInput}
                      onChangeText={setJoinCodeInput}
                    />
                    {joinBusy ? (
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold, opacity: 0.5 }}>Joining…</Text>
                    ) : (
                      <TouchableOpacity onPress={() => handleJoinWithCode()} disabled={!joinCodeInput.trim()} hitSlop={8}>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.gold, opacity: joinCodeInput.trim() ? 1 : 0.4 }}>Join</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  )}
                </SettingsGroup>
                <ErrorNote text={linkErrorMsg} />
                <ErrorNote text={joinErrorMsg} />
              </>
            )}

            {!!linkCode && (
              inviteCard('On their phone: Household › Scan to join, or Type a code. This phone links by itself once they finish.')
            )}

            {!!joinResult && model && (
              // Version 2.2 (approved LK1-LK2): both people, two choices with line icons, then a
              // check sheet. The joiner still can't replace the other person's data (no "Keep mine").
              <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                <LinkChoice
                  me={username || ''}
                  them={joinResult.hostUsername}
                  myModel={model}
                  theirModel={joinResult.hostModel}
                  isInvite={!!joinResult.isInvite}
                  busy={joinChoiceBusy}
                  message={joinChoiceMsg}
                  onChoose={(c) => handleJoinChoice(c)}
                />
              </View>
            )}
          </>
        )}

        </>)}
        {/* 4. Quick Actions (Lock & Sign Out) — now at the bottom of Settings. */}
        {false && (<>
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Session Actions</Text>
        <Text style={styles.sectionSub}>
          Quickly lock the app, or sign out completely.
        </Text>

        <TouchableOpacity testID="lock-app-button" style={styles.lockButton} activeOpacity={0.7} onPress={onLock}>
  <Text style={styles.lockButtonText}>Lock App</Text>
</TouchableOpacity>

        <TouchableOpacity testID="switch-account-button" style={styles.lockButton} activeOpacity={0.7} onPress={onSwitchAccount}>
  <Text style={styles.lockButtonText}>Switch Account</Text>
</TouchableOpacity>

          <TouchableOpacity
    testID="sign-out-button"
    style={styles.signOutButton}
    activeOpacity={0.7}
    onPress={() => {
      Alert.alert(
        'Log out?',
        pendingChanges > 0
          ? "Some of your changes haven't reached the household yet (no connection). They stay on this phone and are sent the next time you sign in here, but until then nobody else will see them. Log out anyway?"
          : 'You will need to sign in again to access your data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, log out', style: 'destructive', onPress: onSignOut },
        ]
      );
    }}
  >
    <Text style={styles.signOutButtonText}>Log out</Text>
  </TouchableOpacity>
        </>)}
      </KeyboardAwareScrollView>

      {/* Peer Recovery Approval Modal */}
      <Modal
        visible={approvalModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setApprovalModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setApprovalModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <GradientFill match={styles.modalCard} />
            <Text style={styles.modalTitle}>Approve Account Recovery</Text>
            <Text style={styles.sectionSub}>
              Type the code on {pendingRecovery?.requesterUsername}'s screen. Only approve if they asked you themselves (in person or on a call). Requests stop working after 15 minutes.
            </Text>

            <MarkedLabel text="Code" mark="required" style={styles.inputLabel} />
            <TextInput
              style={[styles.input, { letterSpacing: 2, fontSize: 18, textAlign: 'center' }]}
              placeholder="7KQ4M-2WX9P"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              value={approvalCodeInput}
              onChangeText={(t) => setApprovalCodeInput(formatPeerCode(normalizePeerCode(t)))}
              testID="peer-approve-code"
            />

            <ErrorNote text={approvalErrorMsg} />

              <Button
                label="Approve & Send Key"
                onPress={handleApprovePeerRecovery}
                loading={approvalBusy}
                disabled={normalizePeerCode(approvalCodeInput).length !== PEER_CODE_LENGTH || approvalBusy}
              />

              <Button
                variant="quiet"
                label="Cancel"
                onPress={() => setApprovalModalOpen(false)}
                disabled={approvalBusy}
              />
          </Pressable>
        </Pressable>
      </Modal>

      <AvatarPickerSheet
        visible={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        initials={getInitials(username || '')}
        current={model?.avatars?.[username || '']}
        photos={model?.avatarPhotos?.[username || '']}
        onSave={handleSaveAvatar}
      />

      <BottomSheet
        visible={nameSheetOpen}
        onClose={() => setNameSheetOpen(false)}
        grouped
        header={
          <View style={styles.nameSheetBar}>
            <TouchableOpacity onPress={() => setNameSheetOpen(false)} accessibilityRole="button" style={{ minWidth: 60 }}>
              <Text style={styles.nameSheetLink}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.nameSheetTitle}>Your name</Text>
            <TouchableOpacity onPress={saveName} disabled={nameSaving} accessibilityRole="button" style={{ minWidth: 60, alignItems: 'flex-end' }} testID="profile-name-save">
              {nameSaving ? <ActivityIndicator color={colors.gold} /> : <Text style={[styles.nameSheetLink, { fontWeight: '700' }]}>Save</Text>}
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Text style={styles.nameSheetHint}>What should we call you?</Text>
          <TextInput
            autoFocus
            style={styles.nameField}
            placeholder={username ? `e.g. ${username.charAt(0).toUpperCase()}${username.slice(1)}` : 'Your name'}
            placeholderTextColor={colors.inkDim}
            value={nameDraft}
            onChangeText={setNameDraft}
            maxLength={MAX_PREFERRED_NAME_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={saveName}
            accessibilityLabel="Your name"
            testID="profile-name-input"
          />
          <Text style={styles.nameSheetFoot}>Home says "Hi, {nameDraft.trim() || username || 'there'}". Leave it empty to use your username.</Text>
        </View>
      </BottomSheet>
    </SafeAreaView>
      <NeedsInternetSheet value={needsNet} onClose={() => setNeedsNet(null)} />
    <QrInviteModal
      visible={qrOpen && !!linkCode}
      code={linkCode}
      countdown={inviteCountdown}
      waitingText={hostFinishBusy ? 'Finishing…' : 'Waiting for them to join…'}
      onClose={() => setQrOpen(false)}
    />
    <ScanJoinModal
      visible={scanOpen}
      onCode={handleScanned}
      onClose={() => setScanOpen(false)}
      onTypeInstead={() => {
        setScanOpen(false);
        setTypingCode(true);
      }}
    />
    </>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    hhStatus: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.navy3, borderRadius: 20, padding: 18, marginTop: 8, marginBottom: 24, overflow: 'hidden' },
    hhIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    hhTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
    hhSub: { fontSize: 13, lineHeight: 18, color: colors.inkDim, marginTop: 2 },
    hhLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: colors.inkDim, marginLeft: 16, marginBottom: 6 },
    hhCodeCard: { backgroundColor: colors.navy3, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 24, overflow: 'hidden' },
    hhCode: { fontSize: 32, fontWeight: '800', letterSpacing: 4, marginVertical: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    hhCodeButtons: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 14 },
    hhCodeBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    hhCodeBtnText: { fontSize: 15, fontWeight: '700' },
    hhRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16 },
    hhName: { fontSize: 17, color: colors.ink },
    hhRole: { fontSize: 13, color: colors.inkDim, marginTop: 1 },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },
    cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    identityHeader: {
      alignItems: 'center',
      paddingTop: 4,
      paddingBottom: 8,
      marginBottom: 10,
    },
    usernameText: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 3,
    },
    handleText: {
      fontSize: 15,
      color: colors.inkDim,
      marginBottom: 2,
    },
    nameSheetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 12 },
    nameSheetTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
    nameSheetLink: { fontSize: 17, color: colors.gold },
    nameSheetHint: { fontSize: 13, color: colors.inkDim, marginBottom: 8, marginLeft: 4 },
    nameField: { backgroundColor: colors.navy3, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17, color: colors.ink },
    nameSheetFoot: { fontSize: 13, color: colors.inkDim, marginTop: 8, marginLeft: 4 },
    emailText: {
      fontSize: 13,
      color: colors.inkDim,
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    sectionSub: { fontSize: 15, color: colors.inkDim, marginBottom: 14, lineHeight: 17 },
    lockButton: {
      backgroundColor: 'transparent',
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.navy4,
    },
    lockButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.inkDim,
    },
    signOutButton: {
      backgroundColor: 'transparent',
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1.5,
      borderColor: colors.error,
    },
    signOutButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.error,
    },
    inputLabel: {
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.navy3,
      borderWidth: 1,
      borderColor: colors.navy4,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    errorText: { fontSize: 13, color: colors.error, marginBottom: 10 },
    successText: { fontSize: 13, color: '#059669', marginBottom: 10 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    hintText: { fontSize: 15, color: colors.inkFaint, lineHeight: 16, marginBottom: 4 },
    dataButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    dataButtonText: { fontSize: 15, fontWeight: '600', color: colors.gold },
    linkCodeBox: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      padding: 16,
      marginBottom: 8,
      alignItems: 'center',
    },
    linkCodeLabel: { fontSize: 15, color: colors.inkDim, marginBottom: 8 },
    dangerConfirmBox: {
      backgroundColor: 'rgba(229,72,77,0.08)',
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    dangerConfirmText: { fontSize: 15, color: colors.error, lineHeight: 17, marginBottom: 12 },
    cancelInlineButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modeButton: {
      flex: 1,
      backgroundColor: colors.navy3,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
    },
    modeButtonActive: { backgroundColor: colors.buttonFill },
    modeButtonText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    modeButtonTextActive: { color: colors.onButton },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.navy3,
      borderRadius: 14,
      padding: 20,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 16 },
  });
}

