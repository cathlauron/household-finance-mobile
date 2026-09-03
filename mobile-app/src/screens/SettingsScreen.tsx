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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { defaultModel } from '../defaultModel';
import { formatPeso } from '../balanceProjection';
import type { Category, Payee, CategorizationRule, HouseholdModel } from '../types';
import { requestNotificationPermission } from '../pushNotifications';
import {
  startHouseholdLink,
  startHouseholdInvite,
  joinHouseholdLink,
  finishJoinerLink,
  finishHostLink,
  subscribeToLinkCode,
  cancelLinkCode,
  LINK_CODE_TTL_MS,
} from '../linking';
import type { JoinChoice } from '../linking';
import {
  loadPendingHostLink,
  clearPendingHostLink,
  loadProfilesIndex,
  loadEncryptedProfileData,
} from '../storage';
import {
  getHouseholdOwner,
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
  generateRecoveryCode,
  saveRecoveryKey,
  type PeerRecoveryRequestDoc,
} from '../recovery';
import { deriveKey, decryptJSON } from '../encryption';
import { getAutoLockMinutes, setAutoLockMinutes, AUTO_LOCK_OPTIONS } from '../autoLock';
import { getCurrentFirebaseUser } from '../authFirebase';
import PasswordField from '../components/PasswordField';

function makeId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// A small fixed palette to pick from — mirrors the set of colors the original web app
// auto-assigns to new categories, just offered as tappable swatches here instead ofa
// native color picker (React Native has no built-in one).
const COLOR_PALETTE = [
  '#E76F51', '#2A9D8F', '#264653', '#E9C46A', '#F4A261',
  '#6D28D9', '#2563EB', '#EA580C', '#059669', '#DC2626',
  '#9333EA', '#0891B2', '#D97706', '#DB2777', '#78716C',
];

// ---- Appearance mode options ----
// Backed entirely by ThemeContext's existing setMode()/mode — this just gives it a UI.
const MODE_OPTIONS: { id: 'light' | 'dark' | 'device'; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'device', label: 'Device' },
];

function amountRangeLabel(rule: CategorizationRule): string {
  const min = rule.amountMin === '' || rule.amountMin === undefined ? null : Number(rule.amountMin);
  const max = rule.amountMax === '' || rule.amountMax === undefined ? null : Number(rule.amountMax);
  if (min !== null && max !== null) return `${formatPeso(min)}–${formatPeso(max)}`;
  if (min !== null) return `${formatPeso(min)} or more`;
  if (max !== null) return `Up to ${formatPeso(max)}`;
  return '';
}

// ---- Checkpoint 9.2b-ii: plain-English summary for the "join" comparison screen ----
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

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const {
    model,
    saveModel,
    changePassword,
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

  // Peer recovery approval state
  const [pendingRecovery, setPendingRecovery] = useState<PeerRecoveryRequestDoc | null>(null);
  const [pendingRecoveryId, setPendingRecoveryId] = useState<string | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalCodeInput, setApprovalCodeInput] = useState('');
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalErrorMsg, setApprovalErrorMsg] = useState('');

  // Retroactive recovery key setup state
  const [retroactiveModalOpen, setRetroactiveModalOpen] = useState(false);
  const [retroactiveVerifyPass, setRetroactiveVerifyPass] = useState('');
  const [retroactiveSuccessCode, setRetroactiveSuccessCode] = useState<string | null>(null);
  const [retroactiveBusy, setRetroactiveBusy] = useState(false);
  const [retroactiveError, setRetroactiveError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(5);

  useEffect(() => {
    getAutoLockMinutes().then(setAutoLockMinutesState);
  }, []);

  async function handleChangeAutoLock(minutes: number) {
    setAutoLockMinutesState(minutes);
    await setAutoLockMinutes(minutes);
  }
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState(COLOR_PALETTE[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [notifyDaysInput, setNotifyDaysInput] = useState(
    String(model?.settings?.notifyDaysBefore ?? 3)
  );
  const [notifStatusMsg, setNotifStatusMsg] = useState('');

  // ---- Merchants & Payees ----
  const [payeeModalOpen, setPayeeModalOpen] = useState(false);
  const [editingPayeeId, setEditingPayeeId] = useState<string | null>(null);
  const [payeeNameInput, setPayeeNameInput] = useState('');
  const [payeeCategoryInput, setPayeeCategoryInput] = useState('');
  const [payeeErrorMsg, setPayeeErrorMsg] = useState('');

  // ---- Categorization Rules ----
  // Same tap-row-to-edit pattern as Categories/Payees above, plus up/down reorder arrows
  // since rules are checked in order and the first match wins — reordering genuinely
  // changes behavior, unlike the alphabetical Categories/Payees lists.
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleContainsInput, setRuleContainsInput] = useState('');
  const [ruleMinInput, setRuleMinInput] = useState('');
  const [ruleMaxInput, setRuleMaxInput] = useState('');
  const [ruleCategoryInput, setRuleCategoryInput] = useState('');
  const [ruleErrorMsg, setRuleErrorMsg] = useState('');

  // ---- Checkpoint 9.2a: Start linking ----
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

  // Restores an in-progress "start linking" (code + secret) if this screen opens and one
  // was left unfinished — e.g. the app was closed, the phone restarted, or (as in testing)
  // a different account was signed into and back out of before tapping "finish linking."
  useEffect(() => {
    if (!username) return;
    loadPendingHostLink(username).then((pending) => {
      if (pending) {
        setLinkCode(pending.code);
        setLinkSecretHex(pending.secretHex);
      }
    });
  }, [username]);
  
  // ---- Checkpoint 9.2c: host side — "I've shared this code, finish linking" ----
  const [hostFinishBusy, setHostFinishBusy] = useState(false);
  const [hostFinishMsg, setHostFinishMsg] = useState('');
  const hostFinishInFlightRef = useRef(false);

  // ---- Checkpoint 9.2b-ii: Join with a code ----
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

  // ---- Checkpoint 11.3: Security (change password) ----
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPass1Input, setNewPass1Input] = useState('');
  const [newPass2Input, setNewPass2Input] = useState('');
  const [passChangeMsg, setPassChangeMsg] = useState('');
  const [passChangeBusy, setPassChangeBusy] = useState(false);

  // ---- Checkpoint 11.3: Data (backup export + clear all data) ----
  const [exportMsg, setExportMsg] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [unlinkMsg, setUnlinkMsg] = useState('');
  const [clearBusy, setClearBusy] = useState(false);

  if (!model) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const categories = [...model.categories].sort((a, b) => a.name.localeCompare(b.name));
  const payees = [...(model.payees ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const rules = model.categorizationRules ?? []; // NOT sorted — array order is match order

  function openAddModal() {
    setEditingId(null);
    setNameInput('');
    setColorInput(COLOR_PALETTE[model!.categories.length % COLOR_PALETTE.length]);
    setErrorMsg('');
    setModalOpen(true);
  }

  function openEditModal(cat: Category) {
    setEditingId(cat.id);
    setNameInput(cat.name);
    setColorInput(cat.color);
    setErrorMsg('');
    setModalOpen(true);
  }

  async function saveNotifyDays() {
    if (!model) return;
    const n = parseInt(notifyDaysInput, 10);
    const value = isNaN(n) || n < 0 ? 0 : n;
    setNotifyDaysInput(String(value));
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, notifyDaysBefore: value },
    };
    await saveModel(updated);
  }

    async function togglePushNotifications() {
    if (!model) return;
    setNotifStatusMsg('');
    const turningOn = !model.settings.pushNotificationsEnabled;

    if (turningOn) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotifStatusMsg(
          "Notifications need permission from your phone's settings first — check your phone's notification settings for this app and try again."
        );
        return;
      }
    }

    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, pushNotificationsEnabled: turningOn },
    };
    await saveModel(updated);
    setNotifStatusMsg(turningOn ? "You'll get a reminder when a bill is due soon." : 'Turned off.');
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg('');
  }

  async function handleSave() {
    if (!model) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMsg('Give the category a name.');
      return;
    }
    const duplicate = model.categories.find(
      (c) => c.id !== editingId && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg('You already have a category with that name.');
      return;
    }

    let updatedCategories: Category[];
    if (editingId) {
      updatedCategories = model.categories.map((c) =>
        c.id === editingId ? { ...c, name: trimmed, color: colorInput } : c
      );
    } else {
      const newCat: Category = {
        id: makeId('cat'),
        name: trimmed,
        color: colorInput,
        parentId: null,
      };
      updatedCategories = [...model.categories, newCat];
    }

    const updated: HouseholdModel = { ...model, categories: updatedCategories };
    await saveModel(updated);
    closeModal();
  }

  async function handleDelete() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categories: model.categories.filter((c) => c.id !== editingId),
    };
    await saveModel(updated);
    closeModal();
  }

  // ---- Merchants & Payees handlers ----
  function openAddPayeeModal() {
    setEditingPayeeId(null);
    setPayeeNameInput('');
    setPayeeCategoryInput('');
    setPayeeErrorMsg('');
    setPayeeModalOpen(true);
  }

  function openEditPayeeModal(payee: Payee) {
    setEditingPayeeId(payee.id);
    setPayeeNameInput(payee.name);
    setPayeeCategoryInput(payee.defaultCategory ?? '');
    setPayeeErrorMsg('');
    setPayeeModalOpen(true);
  }

  function closePayeeModal() {
    setPayeeModalOpen(false);
    setEditingPayeeId(null);
    setPayeeErrorMsg('');
  }

  async function handleSavePayee() {
    if (!model) return;
    const trimmed = payeeNameInput.trim();
    if (!trimmed) {
      setPayeeErrorMsg('Give the merchant or payee a name.');
      return;
    }
    const existing = model.payees ?? [];
    const duplicate = existing.find(
      (p) => p.id !== editingPayeeId && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setPayeeErrorMsg('You already have a payee with that name.');
      return;
    }

    let updatedPayees: Payee[];
    if (editingPayeeId) {
      updatedPayees = existing.map((p) =>
        p.id === editingPayeeId
          ? { ...p, name: trimmed, defaultCategory: payeeCategoryInput.trim() }
          : p
      );
    } else {
      const newPayee: Payee = {
        id: makeId('payee'),
        name: trimmed,
        defaultCategory: payeeCategoryInput.trim(),
      };
      updatedPayees = [...existing, newPayee];
    }

    const updated: HouseholdModel = { ...model, payees: updatedPayees };
    await saveModel(updated);
    closePayeeModal();
  }

  async function handleDeletePayee() {
    if (!editingPayeeId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      payees: (model.payees ?? []).filter((p) => p.id !== editingPayeeId),
    };
    await saveModel(updated);
    closePayeeModal();
  }

  // ---- Categorization Rules handlers ----
  function openAddRuleModal() {
    setEditingRuleId(null);
    setRuleContainsInput('');
    setRuleMinInput('');
    setRuleMaxInput('');
    setRuleCategoryInput('');
    setRuleErrorMsg('');
    setRuleModalOpen(true);
  }

  function openEditRuleModal(rule: CategorizationRule) {
    setEditingRuleId(rule.id);
    setRuleContainsInput(rule.labelContains);
    setRuleMinInput(rule.amountMin === '' || rule.amountMin === undefined ? '' : String(rule.amountMin));
    setRuleMaxInput(rule.amountMax === '' || rule.amountMax === undefined ? '' : String(rule.amountMax));
    setRuleCategoryInput(rule.category);
    setRuleErrorMsg('');
    setRuleModalOpen(true);
  }

  function closeRuleModal() {
    setRuleModalOpen(false);
    setEditingRuleId(null);
    setRuleErrorMsg('');
  }

  async function handleSaveRule() {
    if (!model) return;
    const trimmedContains = ruleContainsInput.trim();
    const trimmedCategory = ruleCategoryInput.trim();
    if (!trimmedContains) {
      setRuleErrorMsg('Enter text to match in the label.');
      return;
    }
    if (!trimmedCategory) {
      setRuleErrorMsg('Choose a category to set when this rule matches.');
      return;
    }
    const minVal: number | '' = ruleMinInput.trim() === '' ? '' : parseFloat(ruleMinInput);
    const maxVal: number | '' = ruleMaxInput.trim() === '' ? '' : parseFloat(ruleMaxInput);
    if (minVal !== '' && isNaN(minVal)) {
      setRuleErrorMsg('Minimum amount must be a number.');
      return;
    }
    if (maxVal !== '' && isNaN(maxVal)) {
      setRuleErrorMsg('Maximum amount must be a number.');
      return;
    }
    if (minVal !== '' && maxVal !== '' && minVal > maxVal) {
      setRuleErrorMsg('Minimum amount must be less than maximum.');
      return;
    }

    const existing = model.categorizationRules ?? [];
    let updatedRules: CategorizationRule[];
    if (editingRuleId) {
      updatedRules = existing.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              labelContains: trimmedContains,
              amountMin: minVal,
              amountMax: maxVal,
              category: trimmedCategory,
            }
          : r
      );
    } else {
      const newRule: CategorizationRule = {
        id: makeId('catrule'),
        labelContains: trimmedContains,
        amountMin: minVal,
        amountMax: maxVal,
        category: trimmedCategory,
      };
      updatedRules = [...existing, newRule];
    }

    const updated: HouseholdModel = { ...model, categorizationRules: updatedRules };
    await saveModel(updated);
    closeRuleModal();
  }

  async function handleDeleteRule() {
    if (!editingRuleId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categorizationRules: (model.categorizationRules ?? []).filter((r) => r.id !== editingRuleId),
    };
    await saveModel(updated);
    closeRuleModal();
  }

  async function moveRule(id: string, direction: 'up' | 'down') {
    if (!model) return;
    const list = [...(model.categorizationRules ?? [])];
    const idx = list.findIndex((r) => r.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[swapIdx];
    list[swapIdx] = tmp;
    const updated: HouseholdModel = { ...model, categorizationRules: list };
    await saveModel(updated);
  }

  // ---- Checkpoint 9.2a: Start linking handler ----
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

  // Clears an old/expired code so a fresh one can be generated — for when the
  // original code timed out before the other phone finished joining.
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

  // ---- Checkpoint A.6: host side — finish automatically, no confirm tap ----
  // As soon as linkCode is set, start listening for the joiner to finish. The
  // instant they do, finish this phone's side too, with zero further taps.
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

  // ---- Checkpoint 9.2b-ii: Join with a code handler ----
  // Unlocks the other phone's data using the code, then shows a side-by-side
  // comparison so mine/theirs/merge can be picked next.
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

  // ---- Checkpoint 9.2c: joiner side — mine/theirs/merge, made permanent ----
  // Creates the real shared household, saves the chosen data to it, wraps the shared
  // key with this phone's own password, and reloads so the rest of the app
  // immediately starts using the shared data.
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
  // ---- Unlink handler ----
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

  // ---- Owner remove member handler ----
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

  // ---- Owner transfer ownership and unlink handler ----
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
  // ---- Checkpoint 11.3: Security handler ----
  async function handleChangePassword() {
    setPassChangeMsg('');
    if (!currentPassInput) {
      setPassChangeMsg('Enter your current password.');
      return;
    }
    if (newPass1Input.length < 6) {
      setPassChangeMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPass1Input !== newPass2Input) {
      setPassChangeMsg("New passwords don't match.");
      return;
    }
    if (newPass1Input === currentPassInput) {
      setPassChangeMsg('New password must be different from your current one.');
      return;
    }
    setPassChangeBusy(true);
    const result = await changePassword(currentPassInput, newPass1Input);
    setPassChangeBusy(false);
    if (!result.ok) {
      setPassChangeMsg(result.error || 'Something went wrong. Please try again.');
      return;
    }
    setCurrentPassInput('');
    setNewPass1Input('');
    setNewPass2Input('');
    setPassChangeMsg('Password changed.');
  }

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

  async function handleGenerateRetroactiveRecoveryKey() {
    if (!username || !retroactiveVerifyPass) {
      setRetroactiveError('Enter your current password.');
      return;
    }
    setRetroactiveBusy(true);
    setRetroactiveError('');
    try {
      const profiles = await loadProfilesIndex();
      const profile = profiles.find((p) => p.username === username);
      if (!profile) throw new Error('Profile not found.');

      let targetKeyToWrap: CryptoJS.lib.WordArray | null = null;
      let isHousehold = false;

      if (isLinked) {
        const householdKey = getHouseholdKey();
        if (!householdKey) throw new Error('Could not access household key.');
        targetKeyToWrap = householdKey;
        isHousehold = true;
      } else {
        const candidateKey = deriveKey(retroactiveVerifyPass, profile.salt);
        const encrypted = await loadEncryptedProfileData(username);
        if (encrypted) {
          try {
            decryptJSON(candidateKey, encrypted);
          } catch (e) {
            throw new Error('Your password was incorrect.');
          }
        }
        targetKeyToWrap = candidateKey;
        isHousehold = false;
      }

      const code = await generateRecoveryCode();
      await saveRecoveryKey(username, targetKeyToWrap, isHousehold, code);
      setRetroactiveSuccessCode(code);
      setRetroactiveBusy(false);
    } catch (e: any) {
      setRetroactiveBusy(false);
      setRetroactiveError(e?.message || 'Failed to generate recovery key.');
    }
  }

  // ---- Checkpoint 11.3: Data handlers ----
  async function handleExportBackup() {
    if (!model) return;
    setExportMsg('');
    setExportBusy(true);
    try {
      const json = JSON.stringify(model, null, 2);
      const fileUri = FileSystem.cacheDirectory + `household-finance-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setExportMsg('Saving/sharing files is not available on this device.');
        setExportBusy(false);
        return;
      }
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Save your backup',
      });
    } catch (e) {
      setExportMsg("Couldn't create the backup file. Please try again.");
    }
    setExportBusy(false);
  }

  async function handleClearAllData() {
    setClearBusy(true);
    await saveModel(defaultModel());
    setClearBusy(false);
    setClearConfirmOpen(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <Text style={styles.sectionSub}>
          Choose how the app looks — Light, Dark, or match your phone's own setting.
        </Text>
        <View style={styles.modeRow}>
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                onPress={() => setMode(opt.id)}
              >
                <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Notifications</Text>
        <Text style={styles.sectionSub}>
          How many days before something's due should it count as "due soon"?
        </Text>
        <View style={styles.row}>
          <Text style={styles.rowName}>Alert me</Text>
          <TextInput
            style={styles.notifyInput}
            value={notifyDaysInput}
            onChangeText={setNotifyDaysInput}
            onBlur={saveNotifyDays}
            keyboardType="number-pad"
            maxLength={2}
          />
          <Text style={styles.rowName}>day(s) before due</Text>
        </View>

        <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={togglePushNotifications}>
          <Text style={styles.rowName}>Notify me on this phone</Text>
          <View
            style={[
              styles.toggleTrack,
              model.settings.pushNotificationsEnabled && styles.toggleTrackActive,
            ]}
          >
            <View
              style={[
                styles.toggleThumb,
                model.settings.pushNotificationsEnabled && styles.toggleThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
        {!!notifStatusMsg && <Text style={styles.notifStatusText}>{notifStatusMsg}</Text>}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Categories</Text>
        <Text style={styles.sectionSub}>
          Manage the category names and colors used across Bills, Debts, and Transactions.
        </Text>

        {categories.length === 0 && (
          <Text style={styles.emptyText}>No categories yet. Add your first one below.</Text>
        )}

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => openEditModal(cat)}
          >
            <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
            <Text style={styles.rowName} numberOfLines={1}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add category</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Merchants &amp; Payees</Text>
        <Text style={styles.sectionSub}>
          Save names you use often so they're quicker to enter on transactions. Set a default
          category and it'll auto-fill whenever you type that exact name on a new transaction.
        </Text>

        {payees.length === 0 && (
          <Text style={styles.emptyText}>No payees yet. Add your first one below.</Text>
        )}

        {payees.map((payee) => (
          <TouchableOpacity
            key={payee.id}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => openEditPayeeModal(payee)}
          >
            <Text style={styles.rowName} numberOfLines={1}>
              {payee.name}
            </Text>
            {!!payee.defaultCategory && (
              <Text style={styles.rowSubText} numberOfLines={1}>
                {payee.defaultCategory}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddPayeeModal}>
          <Text style={styles.addButtonText}>+ Add payee</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Categorization Rules</Text>
        <Text style={styles.sectionSub}>
          Auto-fill a category when a transaction's label contains some text, optionally
          within an amount range. Checked top to bottom — the first matching rule wins, and
          a saved payee's own default category above always takes priority over these.
        </Text>

        {rules.length === 0 && (
          <Text style={styles.emptyText}>No rules yet. Add your first one below.</Text>
        )}

        {rules.map((rule, idx) => (
          <View key={rule.id} style={styles.ruleRow}>
            <View style={styles.reorderCol}>
              <TouchableOpacity
                onPress={() => moveRule(rule.id, 'up')}
                disabled={idx === 0}
                style={styles.reorderBtn}
              >
                <Text style={[styles.reorderBtnText, idx === 0 && styles.reorderBtnDisabled]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveRule(rule.id, 'down')}
                disabled={idx === rules.length - 1}
                style={styles.reorderBtn}
              >
                <Text
                  style={[
                    styles.reorderBtnText,
                    idx === rules.length - 1 && styles.reorderBtnDisabled,
                  ]}
                >
                  ▼
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.ruleRowMain}
              activeOpacity={0.7}
              onPress={() => openEditRuleModal(rule)}
            >
              <Text style={styles.rowName} numberOfLines={1}>
                "{rule.labelContains}" → {rule.category}
              </Text>
              {!!amountRangeLabel(rule) && (
                <Text style={styles.rowSubText} numberOfLines={1}>
                  {amountRangeLabel(rule)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={openAddRuleModal}>
          <Text style={styles.addButtonText}>+ Add rule</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Security</Text>
        <Text style={styles.sectionSub}>
          Change the password used to sign in and encrypt your data on this phone.
        </Text>

        <Text style={styles.inputLabel}>Current password</Text>
        <PasswordField
          testID="current-password-input"
          style={styles.input}
          value={currentPassInput}
          onChangeText={setCurrentPassInput}
          placeholder="Enter your current password"
        />
        <Text style={styles.inputLabel}>New password</Text>
        <PasswordField
          testID="new-password-input"
          style={styles.input}
          value={newPass1Input}
          onChangeText={setNewPass1Input}
          placeholder="At least 6 characters"
        />
        <Text style={styles.inputLabel}>Confirm new password</Text>
        <PasswordField
          testID="confirm-new-password-input"
          style={styles.input}
          value={newPass2Input}
          onChangeText={setNewPass2Input}
          placeholder="Type it again"
        />

        {!!passChangeMsg && (
          <Text style={passChangeMsg === 'Password changed.' ? styles.successText : styles.errorText}>
            {passChangeMsg}
          </Text>
        )}

        <TouchableOpacity
          testID="change-password-button"
          style={styles.primaryFullButton}
          onPress={handleChangePassword}
          disabled={passChangeBusy}
        >
          {passChangeBusy ? (
            <ActivityIndicator color={colors.navy2} />
          ) : (
            <Text style={styles.saveButtonText}>Change password</Text>
          )}
        </TouchableOpacity>
        <View style={[styles.linkCodeBox, { marginTop: 16 }]}>
          <Text style={styles.linkCodeLabel}>Secret Recovery Key</Text>
          <Text style={styles.hintText}>
            A 16-character recovery key lets you regain access to your encrypted financial data if you ever reset or forget your account password.
          </Text>
          <TouchableOpacity
            style={[styles.dataButton, { marginTop: 10, alignSelf: 'stretch' }]}
            onPress={() => {
              setRetroactiveVerifyPass('');
              setRetroactiveError('');
              setRetroactiveSuccessCode(null);
              setRetroactiveModalOpen(true);
            }}
          >
            <Text style={styles.dataButtonText}>Generate / Reset Recovery Key</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Auto-lock</Text>
        <Text style={styles.sectionSub}>
          How long the app can sit untouched before it locks itself (if you've set up a PIN or password).
        </Text>
        <View style={styles.modeRow}>
          {AUTO_LOCK_OPTIONS.map((opt) => {
            const active = autoLockMinutes === opt.minutes;
            return (
              <TouchableOpacity
                key={opt.minutes}
                style={[styles.modeButton, active && styles.modeButtonActive]}
                onPress={() => handleChangeAutoLock(opt.minutes)}
              >
                <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Household</Text>
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
                    <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.navy4 }}>
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
                    <View style={[styles.dangerConfirmBox, { marginTop: 12 }]}>
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
                  <Text style={styles.linkCodeLabel}>Transfer Ownership & Unlink</Text>
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
                        <Text style={styles.dangerButtonText}>Transfer & Leave</Text>
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
                  <Text style={styles.dangerConfirmText}>
                    {householdMemberCount <= 1 || (isOwner && householdMemberCount <= 2)
                      ? "Unlinking will dissolve this household. Your data will be converted to your personal profile."
                      : "This gives this profile its own separate copy of the data going forward. Anyone else still linked keeps sharing with each other, just not with this profile anymore."}
                  </Text>
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

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Data</Text>
        <Text style={styles.sectionSub}>
          Save a backup you can keep somewhere safe, or clear everything out and start fresh.
        </Text>

        <TouchableOpacity style={styles.dataButton} onPress={handleExportBackup} disabled={exportBusy}>
          {exportBusy ? (
            <ActivityIndicator color={colors.gold} />
          ) : (
            <Text style={styles.dataButtonText}>Save a backup</Text>
          )}
        </TouchableOpacity>
        {!!exportMsg && <Text style={styles.errorText}>{exportMsg}</Text>}

        {!clearConfirmOpen ? (
          <TouchableOpacity style={styles.dangerButton} onPress={() => setClearConfirmOpen(true)}>
            <Text style={styles.dangerButtonText}>Clear all data &amp; start fresh</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.dangerConfirmBox}>
            <Text style={styles.dangerConfirmText}>
              This clears every entry in this app — bills, debts, loans, income, savings,
              accounts, and everything else — for this profile. Your username and password
              stay the same. This can't be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.dangerButton, { flex: 1, marginBottom: 0 }]}
                onPress={handleClearAllData}
                disabled={clearBusy}
              >
                {clearBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.dangerButtonText}>Yes, clear everything</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelInlineButton, { flex: 1 }]}
                onPress={() => setClearConfirmOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit category' : 'New category'}</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.swatchRow}>
              {COLOR_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    colorInput === c && styles.swatchActive,
                  ]}
                  onPress={() => setColorInput(c)}
                />
              ))}
            </View>

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={styles.deleteButtonText}>Delete this category</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={payeeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closePayeeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closePayeeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {editingPayeeId ? 'Edit payee' : 'New payee'}
            </Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SM Supermarket, Meralco"
              placeholderTextColor={colors.inkFaint}
              value={payeeNameInput}
              onChangeText={setPayeeNameInput}
            />

            <Text style={styles.inputLabel}>Default category (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={payeeCategoryInput}
              onChangeText={setPayeeCategoryInput}
            />

            {!!payeeErrorMsg && <Text style={styles.errorText}>{payeeErrorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSavePayee}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingPayeeId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePayee}>
                <Text style={styles.deleteButtonText}>Delete this payee</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closePayeeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={ruleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeRuleModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeRuleModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{editingRuleId ? 'Edit rule' : 'New rule'}</Text>

            <Text style={styles.inputLabel}>If the label contains</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. jollibee, meralco, grab"
              placeholderTextColor={colors.inkFaint}
              value={ruleContainsInput}
              onChangeText={setRuleContainsInput}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Minimum amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="No minimum"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={ruleMinInput}
              onChangeText={setRuleMinInput}
            />

            <Text style={styles.inputLabel}>Maximum amount (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="No maximum"
              placeholderTextColor={colors.inkFaint}
              keyboardType="decimal-pad"
              value={ruleMaxInput}
              onChangeText={setRuleMaxInput}
            />

            <Text style={styles.inputLabel}>Set category to</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries, Utilities"
              placeholderTextColor={colors.inkFaint}
              value={ruleCategoryInput}
              onChangeText={setRuleCategoryInput}
            />

            {!!ruleErrorMsg && <Text style={styles.errorText}>{ruleErrorMsg}</Text>}

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveRule}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>

            {editingRuleId && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteRule}>
                <Text style={styles.deleteButtonText}>Delete this rule</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={closeRuleModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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

      {/* Retroactive Recovery Key Modal */}
      <Modal
        visible={retroactiveModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRetroactiveModalOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRetroactiveModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Secret Recovery Key</Text>

            {!retroactiveSuccessCode ? (
              <>
                <Text style={styles.sectionSub}>
                  Enter your current password to generate and encrypt a new Secret Recovery Key for this account.
                </Text>
                <Text style={styles.inputLabel}>Current Password</Text>
                <PasswordField
                  style={styles.input}
                  placeholder="Enter your current password"
                  value={retroactiveVerifyPass}
                  onChangeText={setRetroactiveVerifyPass}
                />
                {!!retroactiveError && <Text style={styles.errorText}>{retroactiveError}</Text>}

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!retroactiveVerifyPass || retroactiveBusy) && { opacity: 0.4 },
                  ]}
                  disabled={!retroactiveVerifyPass || retroactiveBusy}
                  onPress={handleGenerateRetroactiveRecoveryKey}
                >
                  {retroactiveBusy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Generate Key</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionSub}>
                  Save this key in a safe place. If you ever reset or forget your password, this is the only way to recover your data:
                </Text>
                <View
                  style={{
                    backgroundColor: colors.navy3,
                    borderRadius: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    marginVertical: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    selectable
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      letterSpacing: 2,
                      color: colors.gold,
                    }}
                  >
                    {retroactiveSuccessCode}
                  </Text>
                </View>
                <Text style={[styles.hintText, { marginBottom: 12 }]}>
                  Keep this written down somewhere private (e.g. in your password manager notes).
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setRetroactiveModalOpen(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
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
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, marginBottom: 4 },
    sectionSub: { fontSize: 12.5, color: colors.inkDim, marginBottom: 16, lineHeight: 17 },
    emptyText: { fontSize: 12, color: colors.inkFaint, marginBottom: 12, fontStyle: 'italic' },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
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
    row: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
    notifyInput: {
      borderWidth: 1,
      borderColor: colors.navy2,
      borderRadius: 8,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginHorizontal: 8,
      minWidth: 40,
      textAlign: 'center',
      fontSize: 14,
      color: colors.ink,
    },
    rowName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
    rowSubText: {
      fontSize: 12,
      color: colors.inkDim,
      marginLeft: 8,
      flexShrink: 1,
      textAlign: 'right',
    },
    addButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
    addButtonText: { fontSize: 13, fontWeight: '600', color: colors.gold },
    ruleRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.navy3,
      borderRadius: 10,
      marginBottom: 8,
      overflow: 'hidden',
    },
    reorderCol: {
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: colors.navy2,
    },
    reorderBtn: { paddingVertical: 4, paddingHorizontal: 6 },
    reorderBtnText: { fontSize: 11, color: colors.inkDim },
    reorderBtnDisabled: { opacity: 0.3 },
    ruleRowMain: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    toggleTrack: {
      width: 44,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.navy2,
      padding: 3,
      justifyContent: 'center',
    },
    toggleTrackActive: { backgroundColor: colors.gold },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#fff',
    },
    toggleThumbActive: { alignSelf: 'flex-end' },
    notifStatusText: {
      fontSize: 12,
      color: colors.inkDim,
      marginTop: -4,
      marginBottom: 12,
      lineHeight: 16,
    },
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
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    swatchActive: { borderWidth: 3, borderColor: colors.ink },
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
    primaryFullButton: {
      backgroundColor: colors.gold,
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 6,
      marginBottom: 8,
    },
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
    deleteButton: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
    deleteButtonText: { fontSize: 13, color: '#e5484d', fontWeight: '600' },
    cancelButton: { alignItems: 'center', paddingVertical: 8 },
    cancelButtonText: { fontSize: 13, color: colors.inkDim },
  });
}
