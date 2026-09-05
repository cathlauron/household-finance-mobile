import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { getCurrentFirebaseUser } from '../authFirebase';
import type { HouseholdModel } from '../types';
import {
  startHouseholdLink,
  startHouseholdInvite,
  joinHouseholdLink,
  finishJoinerLink,
  finishHostLink,
  subscribeToLinkCode,
  cancelLinkCode,
  LINK_CODE_TTL_MS,
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
  type PeerRecoveryRequestDoc,
} from '../recovery';

export function getInitials(name: string): string {
  if (!name) return '?';
  const cleaned = name.trim();
  if (cleaned.toLowerCase() === 'cathlauron') return 'CL';
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
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
};

export default function ProfileScreen({ onLock, onSignOut }: ProfileScreenProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const {
    model,
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
  } = useData();
  const styles = makeStyles(colors);

  const currentUser = getCurrentFirebaseUser();
  const userEmail = currentUser?.email || 'No email registered';

  // Peer recovery approval state
  const [pendingRecovery, setPendingRecovery] = useState<PeerRecoveryRequestDoc | null>(null);
  const [pendingRecoveryId, setPendingRecoveryId] = useState<string | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalCodeInput, setApprovalCodeInput] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalErrorMsg, setApprovalErrorMsg] = useState('');

  // Start linking / Host invite state
  const [linkCode, setLinkCode] = useState('');
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

  function handleLinkCodeExpired() {
    clearLinkCodeExpiryTimer();
    setLinkCode('');
    setLinkSecretHex('');
    setHostFinishMsg('');
    setLinkErrorMsg('This code expired — generate a new one.');
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
    loadPendingHostLink(username).then((pending) => {
      if (pending) {
        setLinkCode(pending.code);
        setLinkSecretHex(pending.secretHex);
      }
    });
  }, [username]);

  // Host side finish linking state
  const [hostFinishBusy, setHostFinishBusy] = useState(false);
  const [hostFinishMsg, setHostFinishMsg] = useState('');
  const hostFinishInFlightRef = useRef(false);

  // Join with a code state
  const [joinCodeInput, setJoinCodeInput] = useState('');
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
          await loadModel(username, personalKey);
          unsubscribe();
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
  async function handleStartLinking() {
    if (!model || !username) return;
    setLinkErrorMsg('');
    setLinkBusy(true);
    try {
      const result = await startHouseholdLink(username, model);
      clearLinkCodeExpiryTimer();
      setLinkCode(result.code);
      setLinkSecretHex(result.secretHex);
      setHostFinishMsg('');
      beginLinkCooldown();
      linkCodeExpiryTimerRef.current = setTimeout(handleLinkCodeExpired, LINK_CODE_TTL_MS);
    } catch (e) {
      setLinkErrorMsg("Couldn't start linking — check your connection and try again.");
    }
    setLinkBusy(false);
  }

  async function handleStartHouseholdInvite() {
    if (!model || !username || !isLinked) return;
    const householdId = (await loadProfilesIndex()).find((p) => p.username === username)?.householdId;
    const personalKey = getPersonalKey();
    if (!householdId || !personalKey) {
      setLinkErrorMsg('This household is not ready for an invite right now.');
      return;
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
        return;
      }
      const wrapped = await loadWrappedHouseholdKey(username);
      if (!wrapped || wrapped.householdId !== householdId) {
        throw new Error('Linked household key not found.');
      }
      const householdKey = unwrapHouseholdKey(wrapped.wrappedKey, personalKey);
      const result = await startHouseholdInvite(householdId, householdKey, model, username);
      clearLinkCodeExpiryTimer();
      setLinkCode(result.code);
      setLinkSecretHex(result.secretHex);
      setHostFinishMsg('');
      beginLinkCooldown();
      linkCodeExpiryTimerRef.current = setTimeout(handleLinkCodeExpired, LINK_CODE_TTL_MS);
    } catch (e) {
      setLinkErrorMsg("Couldn't create the invite — check your connection and try again.");
    }
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

  async function handleJoinWithCode() {
    setJoinErrorMsg('');
    setJoinChoiceMsg('');
    if (!joinCodeInput.trim()) {
      setJoinErrorMsg('Enter the code from the other phone.');
      return;
    }
    if (!username) {
      setJoinErrorMsg('Something went wrong — please try again.');
      return;
    }
    setJoinBusy(true);
    try {
      const normalizedCode = joinCodeInput.trim().toUpperCase();
      const result = await joinHouseholdLink(joinCodeInput, username);
      setJoinResult(result);
      setJoinedCode(normalizedCode);
    } catch (e) {
      setJoinErrorMsg("That code doesn't look right, or it's expired — check it and try again.");
    }
    setJoinBusy(false);
  }

  async function handleJoinChoice(choice: JoinChoice) {
    if (!model || !username || !joinResult || !joinedCode) return;
    const personalKey = getPersonalKey();
    if (!personalKey) {
      setJoinChoiceMsg('Something went wrong — please try again.');
      return;
    }
    setJoinChoiceBusy(true);
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
      await loadModel(username, personalKey);
      setJoinResult(null);
      setJoinCodeInput('');
      setJoinedCode('');
    } catch (e) {
      setJoinChoiceMsg((e as Error)?.message || "Something went wrong — check your connection and try again.");
    }
    setJoinChoiceBusy(false);
  }

  // Unlink handler
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [unlinkMsg, setUnlinkMsg] = useState('');

  async function handleUnlinkHousehold() {
    setUnlinkMsg('');
    setUnlinkBusy(true);
    if (linkCode) {
      cancelLinkCode(linkCode).catch(() => {});
      setLinkCode('');
      setLinkSecretHex('');
    }
    const result = await unlinkHousehold();
    setUnlinkBusy(false);
    if (!result.ok) {
      setUnlinkMsg(result.error || 'Something went wrong. Please try again.');
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
      setRemoveMemberMsg(e?.message || 'Failed to remove member.');
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
      setTransferMsg(result.error || 'Failed to transfer ownership.');
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
      setApprovalErrorMsg(e?.message || 'Could not approve request. Check the code and try again.');
    }
  }

  const unlinkConfirmText =
    householdMemberCount <= 1 || (isOwner && householdMemberCount <= 2)
      ? 'Unlinking will dissolve this household. Your data will be converted to your personal profile.'
      : 'This gives this profile its own separate copy of the data going forward. Anyone else still linked keeps sharing with each other, just not with this profile anymore.';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Identity Header */}
        <View style={styles.identityHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(username || '')}</Text>
          </View>
          <Text style={styles.usernameText}>@{username || 'user'}</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
          <View style={styles.vaultBadge}>
            <Text style={styles.vaultBadgeText}>
              {isLinked
                ? `Shared Household Vault (${householdMemberCount} member${householdMemberCount === 1 ? '' : 's'})`
                : 'Solo Vault (Personal)'}
            </Text>
          </View>
        </View>

        {/* 2. Security & Devices Shortcuts */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Account &amp; Security</Text>
        <Text style={styles.sectionSub}>
          Manage credentials, encryption keys, and active device sessions in Settings.
        </Text>

        <TouchableOpacity
          style={styles.shortcutRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTitle}>Password &amp; Encryption Key</Text>
            <Text style={styles.shortcutSub}>Change password and access your Secret Recovery Key</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcutRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.shortcutTitle}>Active Devices</Text>
            <Text style={styles.shortcutSub}>View and sign out other devices logged into your account</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* 3. Household & Sharing Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Household &amp; Sharing</Text>
        <Text style={styles.sectionSub}>
          {isLinked
            ? 'This profile shares its data with another linked profile — anything either of you enters shows up for both of you.'
            : 'Link this profile with another phone so you both see and edit the same data.'}
        </Text>

        {!!linkNoticeMsg && (
          <View style={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy2, marginBottom: 14 }]}>
            <Text style={[styles.hintText, { color: colors.ink, fontWeight: '600', marginBottom: 8 }]}>
              {linkNoticeMsg}
            </Text>
            <TouchableOpacity
              style={[styles.dataButton, { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 12 }]}
              onPress={clearLinkNoticeMsg}
            >
              <Text style={styles.dataButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!pendingRecovery && (
          <View style={[styles.dangerConfirmBox, { borderColor: colors.gold, backgroundColor: colors.navy3, marginBottom: 14 }]}>
            <Text style={[styles.hintText, { color: colors.gold, fontWeight: '700', marginBottom: 4 }]}>
              ⚠️ Account Recovery Request
            </Text>
            <Text style={[styles.hintText, { color: colors.ink, marginBottom: 8 }]}>
              {pendingRecovery.requesterUsername} is requesting recovery for their account. If you are with them, you can verify their identity and send them the household key.
            </Text>
            <TouchableOpacity
              style={[styles.dataButton, { alignSelf: 'flex-start' }]}
              onPress={() => {
                setApprovalCodeInput('');
                setApprovalErrorMsg('');
                setApprovalModalOpen(true);
              }}
            >
              <Text style={styles.dataButtonText}>Review &amp; Approve</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLinked ? (
          <>
            {!linkCode ? (
              !unlinkConfirmOpen && !transferOwnerModalOpen ? (
                <View style={styles.linkCodeBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={styles.linkCodeLabel}>✓ Linked</Text>
                    {householdMemberCount > 0 && (
                      <Text style={[styles.hintText, { color: colors.gold, fontWeight: '600' }]}>
                        {householdMemberCount} of 5 linked
                      </Text>
                    )}
                  </View>
                  <Text style={styles.hintText}>
                    This profile is currently sharing its data with another linked profile.
                    Unlinking gives this phone its own separate copy of the data going forward —
                    the shared data itself, and anyone else still linked, are left untouched.
                  </Text>

                  {/* Member Roster */}
                  {householdMembers.length > 0 && (
                    <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.navy4, alignSelf: 'stretch' }}>
                      <Text style={[styles.hintText, { fontWeight: '700', marginBottom: 6 }]}>Household Members</Text>
                      {householdMembers.map((m) => {
                        const isMe = m.uid === getCurrentFirebaseUser()?.uid;
                        return (
                          <View
                            key={m.uid}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingVertical: 6,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.navy4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ color: colors.ink, fontWeight: isMe ? '700' : '400', fontSize: 14 }}>
                                {m.username} {isMe ? '(You)' : ''}
                              </Text>
                              {m.isOwner && (
                                <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '700' }}>
                                  Owner
                                </Text>
                              )}
                            </View>
                            {isOwner && !isMe && (
                              <TouchableOpacity
                                style={[styles.dangerButton, { paddingVertical: 4, paddingHorizontal: 10, marginVertical: 0 }]}
                                onPress={() => {
                                  setRemoveMemberMsg('');
                                  setMemberToRemove(m);
                                }}
                              >
                                <Text style={[styles.dangerButtonText, { fontSize: 12 }]}>Remove</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Remove Member Confirmation Box */}
                  {memberToRemove && (
                    <View style={[styles.dangerConfirmBox, { marginTop: 12, alignSelf: 'stretch' }]}>
                      <Text style={styles.dangerConfirmText}>
                        Remove {memberToRemove.username} from the household? They'll keep their own copy of everything as a separate personal profile.
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={[styles.dangerButton, { flex: 1, marginBottom: 0 }]}
                          onPress={handleRemoveMember}
                          disabled={removeMemberBusy}
                        >
                          {removeMemberBusy ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.dangerButtonText}>Yes, remove</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.cancelInlineButton, { flex: 1 }]}
                          onPress={() => setMemberToRemove(null)}
                          disabled={removeMemberBusy}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                      {!!removeMemberMsg && <Text style={[styles.errorText, { marginTop: 6 }]}>{removeMemberMsg}</Text>}
                    </View>
                  )}

                  {isOwner && householdMemberCount < 5 && (
                    <TouchableOpacity
                      style={[styles.dataButton, { marginTop: 14, alignSelf: 'stretch' }]}
                      onPress={handleStartHouseholdInvite}
                      disabled={linkBusy}
                    >
                      {linkBusy ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          <ActivityIndicator color={colors.gold} />
                          <Text style={styles.hintText}>Generating the invite code...</Text>
                        </View>
                      ) : (
                        <Text style={styles.dataButtonText}>Invite someone</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {isOwner && householdMemberCount >= 5 && (
                    <Text style={[styles.hintText, { marginTop: 8 }]}>
                      This household is full (5 of 5) — remove someone before inviting another person.
                    </Text>
                  )}

                  {!!linkErrorMsg && <Text style={styles.errorText}>{linkErrorMsg}</Text>}

                  <TouchableOpacity
                    style={[styles.dangerButton, { marginTop: 12, alignSelf: 'stretch' }]}
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
                  >
                    <Text style={styles.dangerButtonText}>Unlink this device</Text>
                  </TouchableOpacity>
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
                          Transfer ownership to {otherMembers[0].username} and leave? Since only one person will remain, the household will convert to personal data.
                        </Text>
                      );
                    }
                    return (
                      <>
                        <Text style={styles.dangerConfirmText}>
                          Choose who takes over this household before you leave. You'll keep your own copy of all current data as a separate personal profile.
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
                                <Text style={[styles.modeButtonText, isSelected && styles.modeButtonTextActive]}>
                                  {m.username}
                                </Text>
                                {isSelected && <Text style={{ color: colors.gold, fontWeight: '700' }}>✓ New Owner</Text>}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    );
                  })()}

                  {!!transferMsg && <Text style={styles.errorText}>{transferMsg}</Text>}

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[styles.dangerButton, { flex: 1, marginBottom: 0 }]}
                      onPress={handleTransferAndUnlink}
                      disabled={transferBusy || !selectedSuccessorUid}
                    >
                      {transferBusy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.dangerButtonText}>Transfer &amp; Leave</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelInlineButton, { flex: 1 }]}
                      onPress={() => setTransferOwnerModalOpen(false)}
                      disabled={transferBusy}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.dangerConfirmBox}>
                  <Text style={styles.dangerConfirmText}>{unlinkConfirmText}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.dangerButton, { flex: 1, marginBottom: 0 }]}
                      onPress={handleUnlinkHousehold}
                      disabled={unlinkBusy}
                    >
                      {unlinkBusy ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.dangerButtonText}>Yes, unlink this device</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cancelInlineButton, { flex: 1 }]}
                      onPress={() => setUnlinkConfirmOpen(false)}
                      disabled={unlinkBusy}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                  {!!unlinkMsg && <Text style={styles.errorText}>{unlinkMsg}</Text>}
                </View>
              )
            ) : (
              <View style={styles.linkCodeBox}>
                <Text style={styles.linkCodeLabel}>Give this code to the other phone</Text>
                <Text style={styles.linkCodeText}>{linkCode}</Text>
                <Text style={styles.hintText}>
                  On the other phone, choose "Join with a code" and enter this.
                </Text>

                <View style={[styles.dataButton, { marginTop: 10, alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
                  {hostFinishBusy ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <ActivityIndicator color={colors.gold} size="small" />
                  )}
                  <Text style={styles.dataButtonText}>Waiting for the other phone to finish…</Text>
                </View>

                {!!hostFinishMsg && (
                  <Text style={hostFinishMsg.startsWith('Linked') ? styles.successText : styles.errorText}>
                    {hostFinishMsg}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.cancelInlineButton, { marginTop: 10, alignSelf: 'stretch', opacity: cooldownActive ? 0.5 : 1 }]}
                  onPress={handleStartOverLinking}
                  disabled={linkBusy || cooldownActive}
                >
                  {linkBusy ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel invite / generate new code</Text>
                  )}
                </TouchableOpacity>
                {!!cooldownActive && (
                  <Text style={[styles.hintText, { marginTop: 6, textAlign: 'center' }]}>Generate a new code in {cooldownSeconds}s</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            {!linkCode && !joinResult && (
              <>
                <TouchableOpacity
                  style={styles.dataButton}
                  onPress={handleStartLinking}
                  disabled={linkBusy}
                >
                  {linkBusy ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={colors.gold} />
                      <Text style={styles.hintText}>Generating your secure code...</Text>
                    </View>
                  ) : (
                    <Text style={styles.dataButtonText}>Start linking (get a code)</Text>
                  )}
                </TouchableOpacity>
                {!!linkErrorMsg && <Text style={styles.errorText}>{linkErrorMsg}</Text>}

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Or join with a code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter the 6-character code"
                  placeholderTextColor={colors.inkFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={joinCodeInput}
                  onChangeText={setJoinCodeInput}
                />
                <TouchableOpacity
                  style={styles.dataButton}
                  onPress={handleJoinWithCode}
                  disabled={joinBusy}
                >
                  {joinBusy ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <Text style={styles.dataButtonText}>Join with a code</Text>
                  )}
                </TouchableOpacity>
                {!!joinErrorMsg && <Text style={styles.errorText}>{joinErrorMsg}</Text>}
              </>
            )}

            {!!linkCode && (
              <View style={styles.linkCodeBox}>
                <Text style={styles.linkCodeLabel}>Give this code to the other phone</Text>
                <Text style={styles.linkCodeText}>{linkCode}</Text>
                <Text style={styles.hintText}>
                  On the other phone, choose "Join with a code" and enter this. Once they have,
                  come back here and check who's trying to link before you finish.
                </Text>

                <View style={[styles.dataButton, { marginTop: 10, alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }]}>
                  {hostFinishBusy ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <ActivityIndicator color={colors.gold} size="small" />
                  )}
                  <Text style={styles.dataButtonText}>Waiting for the other phone to finish…</Text>
                </View>

                {!!hostFinishMsg && (
                  <Text style={hostFinishMsg.startsWith('Linked') ? styles.successText : styles.errorText}>
                    {hostFinishMsg}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.cancelInlineButton, { marginTop: 10, alignSelf: 'stretch', opacity: cooldownActive ? 0.5 : 1 }]}
                  onPress={handleStartOverLinking}
                  disabled={linkBusy || cooldownActive}
                >
                  {linkBusy ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <Text style={styles.cancelButtonText}>Code expired? Start over with a new code</Text>
                  )}
                </TouchableOpacity>
                {!!cooldownActive && (
                  <Text style={[styles.hintText, { marginTop: 6, textAlign: 'center' }]}>Generate a new code in {cooldownSeconds}s</Text>
                )}
              </View>
            )}

            {!!joinResult && model && (
              <View style={styles.linkCodeBox}>
                <Text style={styles.linkCodeLabel}>Found their data</Text>
                <Text style={styles.hintText}>You: {summarizeModel(model)}</Text>
                <Text style={styles.hintText}>
                  {joinResult.hostUsername}: {summarizeModel(joinResult.hostModel)}
                </Text>
                <Text style={[styles.hintText, { marginTop: 8, marginBottom: 8 }]}>
                  Choose what the shared vault should start with — this can't be undone once
                  you pick, so double check with the other phone first if you're unsure.
                </Text>
                {!joinResult.isInvite && (
                  <TouchableOpacity
                    style={styles.dataButton}
                    onPress={() => handleJoinChoice('mine')}
                    disabled={joinChoiceBusy}
                  >
                    <Text style={styles.dataButtonText}>Keep mine</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.dataButton}
                  onPress={() => handleJoinChoice('theirs')}
                  disabled={joinChoiceBusy}
                >
                  <Text style={styles.dataButtonText}>
                    {joinResult.isInvite ? 'Keep household data' : 'Keep theirs'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dataButton}
                  onPress={() => handleJoinChoice('merge')}
                  disabled={joinChoiceBusy}
                >
                  <Text style={styles.dataButtonText}>
                    {joinResult.isInvite ? 'Merge mine in' : 'Merge both'}
                  </Text>
                </TouchableOpacity>
                {joinChoiceBusy && <ActivityIndicator color={colors.gold} />}
                {!!joinChoiceMsg && (
                  <Text style={joinChoiceMsg.startsWith('Linked') ? styles.successText : styles.errorText}>
                    {joinChoiceMsg}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {/* 4. Quick Actions (Lock & Sign Out) */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Session Actions</Text>
        <Text style={styles.sectionSub}>
          Lock the app quickly with your PIN/biometrics or sign out of your account completely.
        </Text>

        <TouchableOpacity style={styles.lockButton} activeOpacity={0.7} onPress={onLock}>
          <Text style={styles.lockButtonText}>Lock App</Text>
        </TouchableOpacity>

          <TouchableOpacity
    testID="sign-out-button"
    style={styles.signOutButton}
    activeOpacity={0.7}
    onPress={() => {
      Alert.alert(
        'Sign out?',
        'You will need to sign in again to access your data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
        ]
      );
    }}
  >
    <Text style={styles.signOutButtonText}>Sign Out</Text>
  </TouchableOpacity>
      </ScrollView>

      {/* Peer Recovery Approval Modal */}
      <Modal
        visible={approvalModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setApprovalModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setApprovalModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Approve Account Recovery</Text>
            <Text style={styles.sectionSub}>
              Enter the 6-digit code shown on {pendingRecovery?.requesterUsername}'s screen to verify their identity and transfer the household key.
            </Text>

            <Text style={styles.inputLabel}>6-Digit Code</Text>
            <TextInput
              style={[styles.input, { letterSpacing: 4, fontSize: 18, textAlign: 'center' }]}
              placeholder="000000"
              placeholderTextColor={colors.inkFaint}
              keyboardType="number-pad"
              maxLength={6}
              value={approvalCodeInput}
              onChangeText={setApprovalCodeInput}
            />

            {!!approvalErrorMsg && <Text style={styles.errorText}>{approvalErrorMsg}</Text>}

            <TouchableOpacity
              style={[
                styles.saveButton,
                (approvalCodeInput.trim().length !== 6 || approvalBusy) && { opacity: 0.4 },
              ]}
              disabled={approvalCodeInput.trim().length !== 6 || approvalBusy}
              onPress={handleApprovePeerRecovery}
            >
              {approvalBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Approve &amp; Send Key</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setApprovalModalOpen(false)}
              disabled={approvalBusy}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.navy2 },
    scrollContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 40 },
    identityHeader: {
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 14,
      paddingVertical: 24,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    avatarCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.navy2,
      borderWidth: 2,
      borderColor: colors.gold,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.gold,
      letterSpacing: 1,
    },
    usernameText: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 3,
    },
    emailText: {
      fontSize: 13,
      color: colors.inkDim,
      marginBottom: 12,
    },
    vaultBadge: {
      backgroundColor: colors.navy2,
      borderColor: colors.gold + '55',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 5,
    },
    vaultBadgeText: {
      fontSize: 11.5,
      fontWeight: '600',
      color: colors.gold,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    sectionSub: { fontSize: 12.5, color: colors.inkDim, marginBottom: 14, lineHeight: 17 },
    shortcutRow: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    shortcutTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
      marginBottom: 2,
    },
    shortcutSub: {
      fontSize: 11.5,
      color: colors.inkDim,
    },
    chevron: {
      fontSize: 20,
      color: colors.gold,
      fontWeight: '600',
      marginLeft: 10,
    },
    lockButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.navy4,
    },
    lockButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.ink,
    },
    signOutButton: {
      backgroundColor: '#e5484d',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 8,
    },
    signOutButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    inputLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.inkDim,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.navy2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.ink,
      marginBottom: 14,
    },
    errorText: { fontSize: 12, color: '#e5484d', marginBottom: 10 },
    successText: { fontSize: 12, color: '#059669', marginBottom: 10 },
    saveButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 10,
    },
    saveButtonText: { fontSize: 14, fontWeight: '700', color: colors.navy2 },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
    hintText: { fontSize: 11.5, color: colors.inkFaint, lineHeight: 16, marginBottom: 4 },
    dataButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    dataButtonText: { fontSize: 14, fontWeight: '600', color: colors.gold },
    linkCodeBox: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      padding: 16,
      marginBottom: 8,
      alignItems: 'center',
    },
    linkCodeLabel: { fontSize: 12.5, color: colors.inkDim, marginBottom: 8 },
    linkCodeText: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 4,
      color: colors.ink,
      marginBottom: 8,
    },
    dangerButton: {
      backgroundColor: '#e5484d',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    dangerButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    dangerConfirmBox: {
      backgroundColor: 'rgba(229,72,77,0.08)',
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    dangerConfirmText: { fontSize: 12.5, color: '#e5484d', lineHeight: 17, marginBottom: 12 },
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
    modeButtonActive: { backgroundColor: colors.gold },
    modeButtonText: { fontSize: 13, fontWeight: '600', color: colors.inkDim },
    modeButtonTextActive: { color: colors.navy2 },
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

