import { hapticSelection } from '../haptics';
import { removeFingerprintCopy, removePinCopy, saveFingerprintCopyIfPossible } from '../quickUnlock';
import { updateSessionPassword } from '../staySignedIn';
import { TEXT_SIZE_OPTIONS, setTextSize, useTextSize } from '../textSize';
import { updateRecentAccountIfPresent } from '../recentAccounts';
import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Modal, Pressable, ActivityIndicator, Alert, Switch } from 'react-native';
import { Text, TextInput } from '../components/AppText';
import BottomSheet from '../components/BottomSheet';
import LogoMark from '../components/LogoMark';
import { Ionicons } from '@expo/vector-icons';
import { RowInteractionPreview } from '../components/RowInteractionPreview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../ThemeContext';
import { useData } from '../DataContext';
import { defaultModel } from '../defaultModel';
import { formatPeso, cautionBase } from '../balanceProjection';
import type { Category, Payee, CategorizationRule, HouseholdModel } from '../types';
import { requestNotificationPermission } from '../pushNotifications';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  loadProfilesIndex,
  loadEncryptedProfileData,
} from '../storage';
import {
  generateRecoveryCode,
  saveRecoveryKey,
  hasRecoveryKeySetUp,
} from '../recovery';
import { getInitials } from './ProfileScreen';
import Avatar from '../components/Avatar';
import { SettingsGroup, SettingsRow, PlainRow, SegmentRow } from '../components/SettingsHub';
import { PickerRow, Choices, AmountRow } from '../components/SimpleForm';
import { deriveKey, decryptJSON } from '../encryption';
import { getAutoLockMinutes, setAutoLockMinutes, AUTO_LOCK_OPTIONS } from '../autoLock';
import { getCurrentFirebaseUser } from '../authFirebase';
import { hasPinSetUp, removePin } from '../pin';
import { getBiometricState, getBiometricLabel, setBiometricsDisabled, attemptBiometricAuth, biometricErrorMessage, BiometricState } from '../biometrics';
import SetPinScreen from './SetPinScreen';
import CsvImportModal from './CsvImportModal';
import {
  subscribeToUserDevices,
  revokeDeviceSession,
  getDeviceId,
  formatRelativeTime,
  formatTimeAgo,
  getDeviceStatus,
  type DeviceSession,
} from '../sessions';
import PasswordField from '../components/PasswordField';
import Pill from '../components/Pill';
import { makeId } from '../utils';
import * as Clipboard from 'expo-clipboard';
import { DOW_LABELS } from '../income';
import { radii, spacing } from '../tokens';
import Button from '../components/Button';
import AmountInput from '../components/AmountInput';
import { PullToRefreshScrollView } from '../PullToRefreshScrollView';
import { useFabSide, setFabSide } from '../fabSide';
import GradientFill from '../components/GradientFill';

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
const APP_VERSION = '1.0.0';

const MODE_OPTIONS: { id: 'light' | 'dark' | 'device'; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'device', label: 'Auto' },
];

function amountRangeLabel(rule: CategorizationRule): string {
  const min = rule.amountMin === '' || rule.amountMin === undefined ? null : Number(rule.amountMin);
  const max = rule.amountMax === '' || rule.amountMax === undefined ? null : Number(rule.amountMax);
  if (min !== null && max !== null) return `${formatPeso(min)}–${formatPeso(max)}`;
  if (min !== null) return `${formatPeso(min)} or more`;
  if (max !== null) return `Up to ${formatPeso(max)}`;
  return '';
}

// Redesign: the Settings list has eight sections (as in the Finance Flow mockup); each
// opens a page made of the existing settings blocks that belong to it.
const SECTIONS: Record<string, { title: string; parts: string[] }> = {
  sec: { title: 'Account & Security', parts: ['security', 'quickunlock', 'devices'] },
  look: { title: 'Appearance', parts: ['appearance', 'listrows', 'language'] },
  notify: { title: 'Notifications', parts: ['notifications'] },
  budget: { title: 'Budgeting', parts: ['leftspend', 'watchlist'] },
  cats: { title: 'Categories & Rules', parts: ['categories', 'payees', 'rules'] },
  backup: { title: 'Backup & Data', parts: ['data'] },
  helpabout: { title: 'About & Help', parts: ['help', 'about'] },
};

export default function SettingsScreen({ onSignOut, onSwitchAccount, onLock }: { onSignOut?: () => void; onSwitchAccount?: () => void; onLock?: () => void }) {
  const { colors, mode, setMode } = useTheme();
  const fabSide = useFabSide();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    model,
    saveModel,
    changePassword,
    username,
    loadModel,
    isLinked,
    getPersonalKey,
    getHouseholdKey,
    verifyPassword,
  } = useData();
  const styles = makeStyles(colors);

  // Which page is open. null = the hub (the grouped list of rows).
  // Settings sub-pages (Account & Security, Appearance, ... ) open as their own screen
  // ("SettingsPage") so they open like every other page.
  const fixedPage: string | null = route.name === 'SettingsPage' ? route.params?.subPage ?? null : null;
  const [page, setPage] = useState<string | null>(fixedPage);
  const openPage = (key: string) => navigation.push('SettingsPage', { subPage: key });
  const [csvOpen, setCsvOpen] = useState(false);
  const inPage = (key: string) => page === key || !!(page && SECTIONS[page]?.parts.includes(key));
  const scrollRef = useRef<ScrollView>(null);

  // Back (header, swipe or Android) closes an open page first instead of leaving Settings.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (page === null || fixedPage) return;
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      setPage(null);
    });
    return unsub;
  }, [navigation, page]);
  const PAGE_TITLES: Record<string, string> = {
    language: 'Language',
    help: 'Help & support',
    about: 'About us',
    appearance: 'Appearance',
    listrows: 'List Rows',
    notifications: 'Notifications',
    leftspend: 'Left to Spend',
    categories: 'Categories',
    watchlist: 'Category Watchlist',
    payees: 'Merchants & Payees',
    rules: 'Rules',
    security: 'Security',
    quickunlock: 'Quick Unlock',
    devices: 'Active Devices',
    data: 'Data',
  };

  useEffect(() => {
    navigation.setOptions({
      title: page ? (SECTIONS[page]?.title ?? PAGE_TITLES[page] ?? 'Settings') : 'Settings',
      headerBackTitle: page ? 'Settings' : 'Home',
    });
  }, [navigation, page]);

  // Open a specific page when another screen (e.g. Profile) asks for one.
  useEffect(() => {
    const target = route.params?.page;
    if (target && PAGE_TITLES[target]) {
      setPage(target);
      navigation.setParams({ page: undefined });
    }
  }, [route.params?.page]);

  // Retroactive recovery key setup state
  const [retroactiveModalOpen, setRetroactiveModalOpen] = useState(false);
  const [retroactiveVerifyPass, setRetroactiveVerifyPass] = useState('');
  const [retroactiveSuccessCode, setRetroactiveSuccessCode] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);
  const [retroactiveBusy, setRetroactiveBusy] = useState(false);
  const [retroactiveError, setRetroactiveError] = useState('');
  const [hasRecoveryKey, setHasRecoveryKey] = useState<boolean | null>(null);

  // Quick Unlock & Biometrics state
  const [biometricState, setBiometricState] = useState<BiometricState>('UNAVAILABLE');
  const [biometricLabel, setBiometricLabel] = useState('Biometric Unlock');
  const [biometricError, setBiometricError] = useState('');
  const [pinIsSet, setPinIsSet] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [biometricPasswordModalOpen, setBiometricPasswordModalOpen] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [biometricPasswordBusy, setBiometricPasswordBusy] = useState(false);
  const [biometricPasswordError, setBiometricPasswordError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(0);
  const textSize = useTextSize();

  // Active Devices state
  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [myDeviceId, setMyDeviceId] = useState<string | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceSession | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  useEffect(() => {
    getDeviceId().then((id) => setMyDeviceId(id));
    const user = getCurrentFirebaseUser();
    if (!user) return;
    const unsubscribe = subscribeToUserDevices(user.uid, (devices) => {
      setDeviceSessions(devices);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  async function handleConfirmRevoke() {
    if (!deviceToRevoke) return;
    const user = getCurrentFirebaseUser();
    if (!user) return;
    setRevokeBusy(true);
    setRevokeError('');
    try {
      await revokeDeviceSession(user.uid, deviceToRevoke.deviceId);
      setDeviceToRevoke(null);
    } catch (e: any) {
      setRevokeError('Could not sign out device. Check your connection.');
    } finally {
      setRevokeBusy(false);
    }
  }

  useEffect(() => {
    if (!username) return;
    (async () => {
      const [state, label, pinSetUp] = await Promise.all([
        getBiometricState(username),
        getBiometricLabel(),
        hasPinSetUp(username),
      ]);
      setBiometricState(state);
      setBiometricLabel(label);
      setPinIsSet(pinSetUp);
    })();
  }, [username]);

  async function handleToggleBiometrics() {
    if (!username || biometricState === 'UNAVAILABLE') return;
    hapticSelection();
    setBiometricError('');
    if (biometricState === 'ENABLED') {
      await setBiometricsDisabled(username, true);
      await removeFingerprintCopy(username);
      updateRecentAccountIfPresent(username, { biometricsEnabled: false }).catch(() => {});
      setBiometricState('DISABLED');
    } else {
      setBiometricPassword('');
      setBiometricPasswordError('');
      setBiometricPasswordBusy(false);
      setBiometricPasswordModalOpen(true);
    }
  }

  async function handleConfirmBiometricPassword() {
    if (!username) return;
    if (!biometricPassword) {
      setBiometricPasswordError('Enter your account password.');
      return;
    }
    setBiometricPasswordError('');
    setBiometricPasswordBusy(true);
    // Let the spinner draw before the slow password check freezes the screen.
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      const passwordOk = await verifyPassword(biometricPassword);
      if (!passwordOk) {
        setBiometricPasswordBusy(false);
        setBiometricPasswordError('Incorrect password.');
        return;
      }
      const password = biometricPassword;
      setBiometricPasswordModalOpen(false);
      setBiometricPassword('');
      setBiometricPasswordBusy(false);
      // saveFingerprintCopyIfPossible only works while fingerprint is switched on.
      await setBiometricsDisabled(username, false);
      const email = getCurrentFirebaseUser()?.email ?? '';
      const outcome = email
        ? await saveFingerprintCopyIfPossible({ email, username, password })
        : 'unavailable';
      if (outcome === 'saved' || outcome === 'unavailable') {
        updateRecentAccountIfPresent(username, { biometricsEnabled: true }).catch(() => {});
        setBiometricState('ENABLED');
        setBiometricError('');
      } else {
        await setBiometricsDisabled(username, true);
        await removeFingerprintCopy(username);
        updateRecentAccountIfPresent(username, { biometricsEnabled: false }).catch(() => {});
        setBiometricState('DISABLED');
        setBiometricError(outcome === 'failed' ? "Couldn't set up quick unlock. Try again." : '');
      }
    } catch (e) {
      setBiometricPasswordBusy(false);
      setBiometricPasswordError('Something went wrong. Try again.');
      setBiometricError("Couldn't turn on. Try again.");
    }
  }

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

  // Category Watchlist (Checkpoint B.8) state
  const [watchCategoryInput, setWatchCategoryInput] = useState('');
  const [watchLimitInput, setWatchLimitInput] = useState<number | ''>('');
  const [watchErrorMsg, setWatchErrorMsg] = useState('');
  const [notifyDaysInput, setNotifyDaysInput] = useState(
    String(model?.settings?.notifyDaysBefore ?? 3)
  );
  const [cautionThresholdInput, setCautionThresholdInput] = useState(
    String(model?.settings?.cautionThresholdPercent ?? 20)
  );
  const [notifStatusMsg, setNotifStatusMsg] = useState('');
  // Redesign: the monthly budget the Running low warning is measured against.
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState<number | ''>(
    typeof model?.settings?.monthlySpendingBudget === 'number' ? model.settings.monthlySpendingBudget : ''
  );
  const [recapHourInput, setRecapHourInput] = useState(
    String(model?.settings?.weeklyRecapHour ?? 18)
  );

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
  const [ruleMinInput, setRuleMinInput] = useState<number | ''>('');
  const [ruleMaxInput, setRuleMaxInput] = useState<number | ''>('');
  const [ruleCategoryInput, setRuleCategoryInput] = useState('');
  const [ruleErrorMsg, setRuleErrorMsg] = useState('');


  useEffect(() => {
    if (!username) return;
    let active = true;
    hasRecoveryKeySetUp(username)
      .then((exists) => {
        if (active) setHasRecoveryKey(exists);
      })
      .catch(() => {
        if (active) setHasRecoveryKey(null);
      });
    return () => {
      active = false;
    };
  }, [username]);

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
    try {
      await saveModel(updated);
    } catch (e) {
      setNotifStatusMsg('Failed to save. Please try again.');
    }
  }

  async function saveCautionThreshold() {
    if (!model) return;
    const n = parseInt(cautionThresholdInput, 10);
    const value = isNaN(n) || n < 0 ? 0 : n > 100 ? 100 : n;
    setCautionThresholdInput(String(value));
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, cautionThresholdPercent: value },
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to save', 'Please try again.');
    }
  }

  // Left to Spend caution threshold: relying on onBlur alone isn't reliable in React
  // Native — a TextInput doesn't always emit a blur event before the screen is torn
  // down (tapping Back, the swipe-back gesture, switching tabs, or fully closing the
  // app can all skip it), so a typed value could be silently lost instead of saved.
  // This auto-saves ~600ms after the user stops typing, as a safety net alongside the
  // existing onBlur save. The mountedRef skips the very first render so opening this
  // screen doesn't trigger a pointless save before anything's actually been changed.
  const cautionThresholdMountedRef = useRef(false);
  useEffect(() => {
    if (!cautionThresholdMountedRef.current) {
      cautionThresholdMountedRef.current = true;
      return;
    }
    const timer = setTimeout(() => {
      saveCautionThreshold();
    }, 600);
    return () => clearTimeout(timer);
  }, [cautionThresholdInput]);
  // Monthly budget: saved ~600ms after you stop typing (same safety net as above).
  const monthlyBudgetMountedRef = useRef(false);
  useEffect(() => {
    if (!monthlyBudgetMountedRef.current) {
      monthlyBudgetMountedRef.current = true;
      return;
    }
    const timer = setTimeout(async () => {
      if (!model) return;
      if ((model.settings.monthlySpendingBudget ?? '') === monthlyBudgetInput) return;
      try {
        await saveModel({ ...model, settings: { ...model.settings, monthlySpendingBudget: monthlyBudgetInput } });
      } catch (e) {
        Alert.alert('Failed to save', 'Please try again.');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [monthlyBudgetInput]);
    async function togglePushNotifications() {
    if (!model) return;
    hapticSelection();
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
    try {
      await saveModel(updated);
      setNotifStatusMsg(turningOn ? "You'll get a reminder when a bill is due soon." : 'Turned off.');
    } catch (e) {
      setNotifStatusMsg('Failed to save. Please try again.');
    }
  }

  async function toggleWeeklyRecap() {
    if (!model) return;
    hapticSelection();
    const turningOn = !model.settings.weeklyRecapEnabled;

    if (turningOn && !model.settings.pushNotificationsEnabled) {
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
      settings: { ...model.settings, weeklyRecapEnabled: turningOn },
    };
    try {
      await saveModel(updated);
    } catch (e) {
      setNotifStatusMsg('Failed to save. Please try again.');
    }
  }

  // Quick PIN switch: off asks before removing the PIN; on opens PIN setup.
  function handlePinSwitch() {
    hapticSelection();
    if (pinIsSet) {
      Alert.alert(
        'Turn Off Quick PIN',
        'Are you sure you want to remove your Quick PIN? You will need to use your password or biometric unlock to access the app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: async () => {
              if (!username) return;
              setPinBusy(true);
              try {
                await removePin(username);
                await removePinCopy(username);
                updateRecentAccountIfPresent(username, { hasPin: false }).catch(() => {});
                setPinIsSet(false);
              } catch (e) {
                Alert.alert('Failed to remove PIN', 'Please try again.');
              } finally {
                setPinBusy(false);
              }
            },
          },
        ]
      );
    } else {
      setShowSetPinModal(true);
    }
  }

  // Which expanding row (Auto-lock, Day, Watch a category) is open; one at a time.
  const [openRow, setOpenRow] = useState<string | null>(null);
  const toggleRow = (key: string) => setOpenRow((o) => (o === key ? null : key));
  const [passSheetOpen, setPassSheetOpen] = useState(false);

  const settingSwitch = (value: boolean, onChange: (on: boolean) => void, testID?: string) => (
    <Switch
      testID={testID}
      value={value}
      onValueChange={(on) => { hapticSelection(); onChange(on); }}
      trackColor={{ true: colors.buttonFill, false: colors.navy4 }}
    />
  );

  // The swipe preview only plays right after Swipe to delete is turned on here.
  const [showSwipePreview, setShowSwipePreview] = useState(false);

  async function handleSetSwipeToDelete(enabled: boolean) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, swipeToDeleteEnabled: enabled },
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to save', 'Please try again.');
    }
  }

  async function setWeeklyRecapDay(day: number) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, weeklyRecapDay: day },
    };
    try {
      await saveModel(updated);
    } catch (e) {
      setNotifStatusMsg('Failed to save. Please try again.');
    }
  }

  async function saveWeeklyRecapHour() {
    if (!model) return;
    const n = parseInt(recapHourInput, 10);
    const value = isNaN(n) || n < 0 ? 0 : n > 23 ? 23 : n;
    setRecapHourInput(String(value));
    const updated: HouseholdModel = {
      ...model,
      settings: { ...model.settings, weeklyRecapHour: value },
    };
    try {
      await saveModel(updated);
    } catch (e) {
      setNotifStatusMsg('Failed to save. Please try again.');
    }
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
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to save. Please try again.');
    }
  }

  async function performDeleteCategory() {
    if (!editingId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categories: model.categories.filter((c) => c.id !== editingId),
    };
    try {
      await saveModel(updated);
      closeModal();
    } catch (e) {
      setErrorMsg('Failed to delete. Please try again.');
    }
  }

  function handleDeleteCategory() {
    Alert.alert(
      'Delete this category?',
      'This will permanently delete the category. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeleteCategory },
      ]
    );
  }

  // ---- Category Watchlist (Checkpoint B.8) ----
  async function handleAddWatchedCategory() {
    if (!model) return;
    const trimmed = watchCategoryInput.trim();
    const limitNum = watchLimitInput === '' ? NaN : watchLimitInput;
    if (!trimmed) {
      setWatchErrorMsg('Give it a category name.');
      return;
    }
    if (isNaN(limitNum) || limitNum <= 0) {
      setWatchErrorMsg('Enter a monthly limit greater than 0.');
      return;
    }
    const duplicate = model.categoryBudgets.find(
      (cb) => cb.category.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setWatchErrorMsg('You are already watching that category.');
      return;
    }
    const updated: HouseholdModel = {
      ...model,
      categoryBudgets: [
        ...model.categoryBudgets,
        { id: makeId('budget'), category: trimmed, monthlyBudget: limitNum },
      ],
    };
    try {
      await saveModel(updated);
      setWatchCategoryInput('');
      setWatchLimitInput('');
      setWatchErrorMsg('');
    } catch (e) {
      setWatchErrorMsg('Failed to save. Please try again.');
    }
  }

  async function handleRemoveWatchedCategory(id: string) {
    if (!model) return;
    const updated: HouseholdModel = {
      ...model,
      categoryBudgets: model.categoryBudgets.filter((cb) => cb.id !== id),
    };
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to remove', 'Please try again.');
    }
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
    try {
      await saveModel(updated);
      closePayeeModal();
    } catch (e) {
      setPayeeErrorMsg('Failed to save. Please try again.');
    }
  }

  async function performDeletePayee() {
    if (!editingPayeeId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      payees: (model.payees ?? []).filter((p) => p.id !== editingPayeeId),
    };
    try {
      await saveModel(updated);
      closePayeeModal();
    } catch (e) {
      setPayeeErrorMsg('Failed to delete. Please try again.');
    }
  }

  function handleDeletePayee() {
    Alert.alert(
      'Delete this payee?',
      'This will permanently delete this payee. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeletePayee },
      ]
    );
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
    setRuleMinInput(typeof rule.amountMin === 'number' ? rule.amountMin : '');
    setRuleMaxInput(typeof rule.amountMax === 'number' ? rule.amountMax : '');
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
    const minVal: number | '' = ruleMinInput;
    const maxVal: number | '' = ruleMaxInput;
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
    try {
      await saveModel(updated);
      closeRuleModal();
    } catch (e) {
      setRuleErrorMsg('Failed to save. Please try again.');
    }
  }

  async function performDeleteRule() {
    if (!editingRuleId || !model) return;
    const updated: HouseholdModel = {
      ...model,
      categorizationRules: (model.categorizationRules ?? []).filter((r) => r.id !== editingRuleId),
    };
    try {
      await saveModel(updated);
      closeRuleModal();
    } catch (e) {
      setRuleErrorMsg('Failed to delete. Please try again.');
    }
  }

  function handleDeleteRule() {
    Alert.alert(
      'Delete this rule?',
      'This will permanently delete this categorization rule. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDeleteRule },
      ]
    );
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
    try {
      await saveModel(updated);
    } catch (e) {
      Alert.alert('Failed to reorder', 'Please try again.');
    }
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
    // Quick unlock: any stored copy holds the OLD password. Remove both, then try
    // to store the new one (fingerprint only; PIN quick unlock returns when the
    // PIN is set again). A cancelled fingerprint prompt is ignored.
    if (username) {
      const quickUser = username;
      const quickEmail = getCurrentFirebaseUser()?.email;
      const quickPassword = newPass1Input;
      (async () => {
        await removeFingerprintCopy(quickUser);
        await removePinCopy(quickUser);
        // Sign in once: keep this phone signed in, with the new password.
        await updateSessionPassword(quickUser, quickPassword, quickEmail ?? undefined);
        if (quickEmail) {
          await saveFingerprintCopyIfPossible({
            email: quickEmail,
            username: quickUser,
            password: quickPassword,
          });
        }
      })().catch(() => {});
    }
    if (!isLinked) {
      setHasRecoveryKey(false);
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
      setHasRecoveryKey(true);
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
      const fileUri = FileSystem.cacheDirectory + `finance-flow-backup-${Date.now()}.json`;
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
    try {
      await saveModel(defaultModel());
      setClearConfirmOpen(false);
    } catch (e) {
      Alert.alert('Failed to clear data', 'Please try again.');
    } finally {
      setClearBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <PullToRefreshScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        {page === null && (
        <>
        {/* Profile Card */}
        <TouchableOpacity
          testID="profile-card"
          style={styles.profileCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
        >
          <GradientFill match={styles.profileCard} />
          <View style={{ marginRight: 12 }}>
            <Avatar
              initials={getInitials(username || '')}
              config={model?.avatars?.[username || '']}
              size={60}
              variant="filled"
            />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.profileUsernameText}>{username || 'user'}</Text>
            <Text style={styles.profileVaultText}>
              {isLinked ? 'Shared household' : 'Just you'} · Profile, photo and sign-in
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.inkDim} />
        </TouchableOpacity>

        {/* Premium: right under the profile, as a quiet row like the others. */}
        <SettingsGroup>
          <SettingsRow
            testID="settings-premium-card"
            icon="diamond-outline"
            title="Finance Flow Premium"
            value="Upgrade"
            onPress={() => navigation.navigate('Premium')}
          />
        </SettingsGroup>

        <SettingsGroup label="Money">
          <SettingsRow testID="settings-row-budgeting" icon="speedometer-outline" title="Budgeting" onPress={() => openPage('budget')} />
          <SettingsRow testID="settings-row-categories" icon="pricetags-outline" title="Categories & Rules" onPress={() => openPage('cats')} />
        </SettingsGroup>
        <SettingsGroup label="App">
          <SettingsRow testID="settings-row-data" icon="cloud-outline" title="Backup & Data" onPress={() => openPage('backup')} />
          <SettingsRow testID="settings-row-help" icon="information-circle-outline" title="About & Help" onPress={() => openPage('helpabout')} />
        </SettingsGroup>
        </>
        )}
        {page === null && (
        <TouchableOpacity
          testID="settings-switch-account-button"
          activeOpacity={0.7}
          onPress={onSwitchAccount}
          style={{
            borderRadius: 12,
            backgroundColor: colors.navy3,
            minHeight: 52,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          <GradientFill match={{
            borderRadius: 12,
            backgroundColor: colors.navy3,
            minHeight: 52,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 4,
            marginBottom: 12,
          }} />
          <Text style={{ fontSize: 17, color: colors.gold }}>Switch account</Text>
        </TouchableOpacity>
        )}
        {page === null && (
        <TouchableOpacity
          testID="settings-log-out-button"
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Log out?',
              'You will need to sign in again to access your data.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, log out', style: 'destructive', onPress: onSignOut },
              ]
            );
          }}
          style={{
            borderRadius: 12,
            backgroundColor: colors.navy3,
            minHeight: 52,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <GradientFill match={{
            borderRadius: 12,
            backgroundColor: colors.navy3,
            minHeight: 52,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
          }} />
          <Text style={{ fontSize: 17, color: colors.negative }}>Log out</Text>
        </TouchableOpacity>
        )}
        {/* ---------- Account & Security ---------- */}
        {page === 'sec' && (
        <>
        <SettingsGroup label="Sign in" plain>
          <PlainRow testID="settings-change-password" title="Change password" onPress={() => { setPassChangeMsg(''); setPassSheetOpen(true); }} />
          <PlainRow
            testID="settings-recovery-key"
            title="Secret Recovery Key"
            value={hasRecoveryKey === false ? 'Needs a new one' : hasRecoveryKey === true ? 'Active' : undefined}
            onPress={() => {
              setRetroactiveVerifyPass('');
              setRetroactiveError('');
              setRetroactiveSuccessCode(null);
              setRetroactiveModalOpen(true);
            }}
          />
        </SettingsGroup>
        {hasRecoveryKey === false && (
          <Text style={[styles.groupNote, { color: colors.orange }]}>
            Your password changed, so your old recovery key no longer works. Make a new one.
          </Text>
        )}

        <SettingsGroup
          label="Quick unlock"
          plain
          footer={biometricError || 'Open the app with your fingerprint or a PIN instead of your password.'}
        >
          {biometricState === 'UNAVAILABLE' ? (
            <PlainRow title="Fingerprint" value="Not available" />
          ) : (
            <PlainRow
              title={biometricLabel}
              right={settingSwitch(biometricState === 'ENABLED', () => handleToggleBiometrics(), 'biometric-toggle')}
            />
          )}
          <PlainRow
            title="PIN"
            right={pinBusy ? <ActivityIndicator size="small" color={colors.gold} /> : settingSwitch(pinIsSet, handlePinSwitch, 'pin-toggle')}
          />
          {pinIsSet && <PlainRow testID="change-pin-button" title="Change PIN" onPress={() => setShowSetPinModal(true)} />}
        </SettingsGroup>

        {showSetPinModal && username && (
          <Modal visible={showSetPinModal} animationType="slide">
            <SetPinScreen
              username={username}
              email={getCurrentFirebaseUser()?.email ?? undefined}
              onDone={() => {
                setShowSetPinModal(false);
                setPinIsSet(true);
              }}
              onCancel={() => setShowSetPinModal(false)}
            />
          </Modal>
        )}

        <SettingsGroup label="This phone" plain footer="Auto-lock needs a PIN or password set up.">
          <PickerRow
            label="Auto-lock"
            value={AUTO_LOCK_OPTIONS.find((o) => o.minutes === autoLockMinutes)?.label ?? ''}
            open={openRow === 'autolock'}
            onToggle={() => toggleRow('autolock')}
          >
            <Choices
              options={AUTO_LOCK_OPTIONS.map((o) => ({ id: String(o.minutes), label: o.label }))}
              value={String(autoLockMinutes)}
              onChange={(v) => handleChangeAutoLock(Number(v))}
            />
          </PickerRow>
        </SettingsGroup>

        <SettingsGroup label="Signed-in devices" plain footer="You can sign out any other device from here.">
          {deviceSessions.length === 0 && <PlainRow title="No devices found" />}
          {deviceSessions.map((dev) => {
            const isThisDevice = dev.deviceId === myDeviceId;
            const status = getDeviceStatus(dev);
            let statusDetail = formatRelativeTime(dev.lastActiveAt);
            if (status === 'signed_out') statusDetail = `Signed out ${formatTimeAgo(dev.signedOutAt || dev.lastActiveAt)}`;
            else if (status === 'revoked') statusDetail = `Revoked ${formatTimeAgo(dev.revokedAt || dev.lastActiveAt)}`;
            return (
              <PlainRow
                key={dev.deviceId}
                title={dev.deviceName + (isThisDevice ? ' (this phone)' : '')}
                sub={`${dev.platform === 'ios' ? 'iPhone' : dev.platform === 'android' ? 'Android' : dev.platform} · ${statusDetail}`}
                right={
                  !isThisDevice && status === 'active' ? (
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => {
                        setDeviceToRevoke(dev);
                        setRevokeError('');
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.negative }}>Sign out</Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            );
          })}
        </SettingsGroup>
        </>
        )}

        {/* ---------- Appearance ---------- */}
        {page === 'look' && (
        <>
        <SettingsGroup plain>
          <SegmentRow title="Theme" options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <SegmentRow title="Text size" options={TEXT_SIZE_OPTIONS} value={textSize} onChange={setTextSize} testIDPrefix="settings-text" />
          <SegmentRow
            title="+ button side"
            options={[{ id: 'left', label: 'Left' }, { id: 'right', label: 'Right' }]}
            value={fabSide}
            onChange={(v) => setFabSide(v as 'left' | 'right')}
            testIDPrefix="settings-fab"
          />
        </SettingsGroup>

        <SettingsGroup label="Feel" plain footer="Mood colours: the card, buttons and leaves follow Left to Spend.">
          <PlainRow
            title="Mood colours"
            right={settingSwitch(model.settings.moodColorsEnabled !== false, (on) => saveModel({ ...model, settings: { ...model.settings, moodColorsEnabled: on } }), 'settings-mood-colors')}
          />
          <PlainRow
            title="Falling leaves"
            right={settingSwitch(model.settings.fallingLeavesEnabled !== false, (on) => saveModel({ ...model, settings: { ...model.settings, fallingLeavesEnabled: on } }), 'settings-falling-leaves')}
          />
        </SettingsGroup>

        <SettingsGroup label="List rows" plain footer="Swipe a row left to delete it.">
          <PlainRow
            title="Swipe to delete"
            right={settingSwitch(!!model.settings.swipeToDeleteEnabled, (on) => {
              setShowSwipePreview(on);
              handleSetSwipeToDelete(on);
            }, 'settings-swipe-delete')}
          />
        </SettingsGroup>
        {showSwipePreview && <View style={{ marginTop: -12, marginBottom: 24 }}><RowInteractionPreview /></View>}

        <SettingsGroup plain footer="More languages are coming later.">
          <PlainRow title="Language" value="English" />
        </SettingsGroup>
        </>
        )}

        {/* ---------- Notifications ---------- */}
        {page === 'notify' && (
        <>
        <SettingsGroup plain footer={notifStatusMsg || 'Turn this off to stop all reminders from Finance Flow.'}>
          <PlainRow title="Notify me on this phone" right={settingSwitch(!!model.settings.pushNotificationsEnabled, () => togglePushNotifications())} />
        </SettingsGroup>

        <SettingsGroup label="Reminders" plain footer="How many days before a bill, debt or loan is due.">
          <PlainRow
            title="Remind me"
            right={
              <View style={styles.inlineNumWrap}>
                <TextInput
                  style={styles.inlineNum}
                  value={notifyDaysInput}
                  onChangeText={setNotifyDaysInput}
                  onBlur={saveNotifyDays}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus
                />
                <Text style={styles.inlineNumUnit}>days before</Text>
              </View>
            }
          />
        </SettingsGroup>

        <SettingsGroup label="Weekly spending recap" plain>
          <PlainRow title="Weekly recap" right={settingSwitch(!!model.settings.weeklyRecapEnabled, () => toggleWeeklyRecap())} />
          {model.settings.weeklyRecapEnabled && (
            <PickerRow
              label="Day"
              value={DOW_LABELS[model.settings.weeklyRecapDay ?? 0]}
              open={openRow === 'recapday'}
              onToggle={() => toggleRow('recapday')}
            >
              <Choices
                options={DOW_LABELS.map((label, idx) => ({ id: String(idx), label }))}
                value={String(model.settings.weeklyRecapDay ?? 0)}
                onChange={(v) => setWeeklyRecapDay(Number(v))}
              />
            </PickerRow>
          )}
          {model.settings.weeklyRecapEnabled && (
            <PlainRow
              title="Time"
              right={
                <View style={styles.inlineNumWrap}>
                  <TextInput
                    style={styles.inlineNum}
                    value={recapHourInput}
                    onChangeText={setRecapHourInput}
                    onBlur={saveWeeklyRecapHour}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                  />
                  <Text style={styles.inlineNumUnit}>:00 (24-hour)</Text>
                </View>
              }
            />
          )}
        </SettingsGroup>
        </>
        )}

        {/* ---------- Budgeting ---------- */}
        {page === 'budget' && (
        <>
        <SettingsGroup
          label="Left to Spend"
          plain
          footer={(() => {
            const pct = Math.max(0, Math.min(100, parseInt(cautionThresholdInput, 10) || 0));
            const base = monthlyBudgetInput !== '' && monthlyBudgetInput > 0
              ? { amount: monthlyBudgetInput, kind: 'budget' as const }
              : cautionBase({ ...model, settings: { ...model.settings, monthlySpendingBudget: '' } });
            return `Left to Spend on Home turns orange below ${formatPeso(base.amount * (pct / 100))}.` +
              (base.kind === 'obligations' ? ' With no monthly budget, this is measured against your usual monthly bills, debts and loans.' : '');
          })()}
        >
          <AmountRow label="Monthly budget" value={monthlyBudgetInput} onChange={setMonthlyBudgetInput} placeholder="None" />
          <PlainRow
            title="Running low at"
            right={
              <View style={styles.inlineNumWrap}>
                <TextInput
                  style={styles.inlineNum}
                  value={cautionThresholdInput}
                  onChangeText={setCautionThresholdInput}
                  onBlur={saveCautionThreshold}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
                <Text style={styles.inlineNumUnit}>% left</Text>
              </View>
            }
          />
        </SettingsGroup>

        <SettingsGroup plain footer="Give every peso a job, and roll leftovers into next month.">
          <PlainRow testID="settings-envelopes" title="Envelopes" onPress={() => navigation.navigate('Envelopes')} />
        </SettingsGroup>

        <SettingsGroup label="Watchlist" plain footer="Get a heads-up on Home when one of these gets close to its limit.">
          {model.categoryBudgets.map((cb) => (
            <PlainRow
              key={cb.id}
              title={cb.category}
              dot={categories.find((c) => c.name === cb.category)?.color}
              value={`${formatPeso(typeof cb.monthlyBudget === 'number' ? cb.monthlyBudget : 0)} a month`}
              right={
                <TouchableOpacity hitSlop={8} onPress={() => handleRemoveWatchedCategory(cb.id)} style={{ marginLeft: 10 }} accessibilityLabel={`Stop watching ${cb.category}`}>
                  <Ionicons name="remove-circle" size={22} color={colors.negative} />
                </TouchableOpacity>
              }
            />
          ))}
          <PickerRow
            label="Watch a category"
            value=""
            open={openRow === 'watch'}
            onToggle={() => toggleRow('watch')}
          >
            <TextInput
              style={styles.input}
              placeholder="Category name (e.g. Groceries)"
              placeholderTextColor={colors.inkDim}
              value={watchCategoryInput}
              onChangeText={setWatchCategoryInput}
            />
            <AmountInput
              style={styles.amountInput}
              placeholder="Monthly limit (e.g. 5000)"
              value={watchLimitInput}
              onChangeAmount={setWatchLimitInput}
            />
            {watchErrorMsg !== '' && <Text style={[styles.errorText, { textAlign: 'left' }]}>{watchErrorMsg}</Text>}
            <Button label="Add to watchlist" onPress={handleAddWatchedCategory} />
          </PickerRow>
        </SettingsGroup>
        </>
        )}

        {/* ---------- Categories & Rules ---------- */}
        {page === 'cats' && (
        <>
        <SettingsGroup plain footer={'Rules sort new transactions for you, e.g. anything with "Jollibee" goes to Eating out.'}>
          <PlainRow testID="settings-row-categories-list" title="Categories" value={String(categories.length)} onPress={() => openPage('categories')} />
          <PlainRow testID="settings-row-payees" title="Merchants & payees" value={String(payees.length)} onPress={() => openPage('payees')} />
          <PlainRow testID="settings-row-rules" title="Rules" value={String(rules.length)} onPress={() => openPage('rules')} />
        </SettingsGroup>
        </>
        )}

        {page === 'categories' && (
        <SettingsGroup plain footer="Used across Bills, Debts and Transactions. Tap one to rename it or change its colour.">
          {categories.map((cat) => (
            <PlainRow key={cat.id} title={cat.name} dot={cat.color} onPress={() => openEditModal(cat)} />
          ))}
          <PlainRow title="Add a category" accent onPress={openAddModal} />
        </SettingsGroup>
        )}

        {page === 'payees' && (
        <SettingsGroup plain footer="Saved names for quicker entry. A default category fills itself in on matching transactions.">
          {payees.map((payee) => (
            <PlainRow key={payee.id} title={payee.name} value={payee.defaultCategory || undefined} onPress={() => openEditPayeeModal(payee)} />
          ))}
          <PlainRow title="Add a payee" accent onPress={openAddPayeeModal} />
        </SettingsGroup>
        )}

        {page === 'rules' && (
        <SettingsGroup plain footer="Checked top to bottom; the first match wins. A payee's own default category comes first. Use the arrows to reorder.">
          {rules.map((rule, idx) => (
            <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8 }}>
              <View style={styles.reorderCol}>
                <TouchableOpacity onPress={() => moveRule(rule.id, 'up')} disabled={idx === 0} style={styles.reorderBtn} accessibilityLabel="Move up">
                  <Ionicons name="chevron-up" size={14} color={colors.inkDim} style={idx === 0 ? { opacity: 0.3 } : undefined} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveRule(rule.id, 'down')} disabled={idx === rules.length - 1} style={styles.reorderBtn} accessibilityLabel="Move down">
                  <Ionicons name="chevron-down" size={14} color={colors.inkDim} style={idx === rules.length - 1 ? { opacity: 0.3 } : undefined} />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <PlainRow
                  title={`"${rule.labelContains}" → ${rule.category}`}
                  sub={amountRangeLabel(rule) || undefined}
                  onPress={() => openEditRuleModal(rule)}
                />
              </View>
            </View>
          ))}
          <PlainRow title="Add a rule" accent onPress={openAddRuleModal} />
        </SettingsGroup>
        )}

        {/* ---------- Backup & Data ---------- */}
        {page === 'backup' && (
        <>
        <SettingsGroup label="Your data" plain footer={exportMsg || 'Everything is encrypted on this phone before it is saved online.'}>
          <PlainRow
            title="Save a backup"
            onPress={exportBusy ? undefined : handleExportBackup}
            right={exportBusy ? <ActivityIndicator size="small" color={colors.gold} /> : undefined}
          />
          <PlainRow testID="settings-import-csv" title="Import from a spreadsheet" sub="CSV file" onPress={() => setCsvOpen(true)} />
        </SettingsGroup>

        {!clearConfirmOpen ? (
          <SettingsGroup plain footer="This can't be undone. You'll be asked to confirm first.">
            <PlainRow title="Clear all data & start fresh" danger onPress={() => setClearConfirmOpen(true)} />
          </SettingsGroup>
        ) : (
          <View style={styles.dangerConfirmBox}>
            <Text style={styles.dangerConfirmText}>
              This clears every entry for this profile — bills, debts, loans, income, savings, accounts, everything. Your username and password stay the same. This can't be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button variant="solidDanger" label="Yes, clear everything" onPress={handleClearAllData} loading={clearBusy} disabled={clearBusy} style={{ flex: 1 }} />
              <Button variant="secondary" label="Cancel" onPress={() => setClearConfirmOpen(false)} style={{ flex: 1 }} />
            </View>
          </View>
        )}
        </>
        )}

        {/* ---------- About & Help ---------- */}
        {page === 'helpabout' && (
        <>
        <View style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 12 }}>
          <LogoMark width={96} />
          <Text style={{ fontSize: 15, color: colors.inkDim, marginTop: 8 }}>Version {APP_VERSION}</Text>
        </View>
        <SettingsGroup plain footer="Household budgeting for you and the people you share a home with.">
          <PlainRow title="Help & guides" value="Coming soon" />
        </SettingsGroup>
        </>
        )}
      </PullToRefreshScrollView>
      <BottomSheet visible={passSheetOpen} onClose={() => setPassSheetOpen(false)} title="Change password">
        <Text style={styles.sectionSub}>Used to sign in and to encrypt your data on this phone.</Text>
        <Text style={styles.inputLabel}>Current password</Text>
        <PasswordField
          testID="current-password-input"
          style={styles.input}
          value={currentPassInput}
          onChangeText={setCurrentPassInput}
          placeholder="Enter your current password"
          autoFocus
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
          <Text style={passChangeMsg === 'Password changed.' ? styles.successText : styles.errorText}>{passChangeMsg}</Text>
        )}
        <Button
          testID="change-password-button"
          label="Change password"
          onPress={handleChangePassword}
          loading={passChangeBusy}
          disabled={passChangeBusy}
          style={{ marginTop: 6 }}
        />
      </BottomSheet>
      <CsvImportModal visible={csvOpen} onClose={() => setCsvOpen(false)} />

      <BottomSheet
        visible={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit category' : 'New category'}
      >
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          autoFocus={!editingId}
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

        <Button label="Save" onPress={handleSave} />

        {editingId && <Button label="Delete this category" variant="destructive" onPress={handleDeleteCategory} />}

        <Button label="Cancel" variant="quiet" onPress={closeModal} />
      </BottomSheet>

      <BottomSheet
        visible={payeeModalOpen}
        onClose={closePayeeModal}
        title={editingPayeeId ? 'Edit payee' : 'New payee'}
      >
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          autoFocus={!editingPayeeId}
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

        <Button label="Save" onPress={handleSavePayee} />

        {editingPayeeId && <Button label="Delete this payee" variant="destructive" onPress={handleDeletePayee} />}

        <Button label="Cancel" variant="quiet" onPress={closePayeeModal} />
      </BottomSheet>

      <BottomSheet
        visible={ruleModalOpen}
        onClose={closeRuleModal}
        title={editingRuleId ? 'Edit rule' : 'New rule'}
      >
        <Text style={styles.inputLabel}>If the label contains</Text>
        <TextInput
          autoFocus={!editingRuleId}
          style={styles.input}
          placeholder="e.g. jollibee, meralco, grab"
          placeholderTextColor={colors.inkFaint}
          value={ruleContainsInput}
          onChangeText={setRuleContainsInput}
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Minimum amount (optional)</Text>
        <AmountInput style={styles.amountInput} placeholder="No minimum" value={ruleMinInput} onChangeAmount={setRuleMinInput} />

        <Text style={styles.inputLabel}>Maximum amount (optional)</Text>
        <AmountInput style={styles.amountInput} placeholder="No maximum" value={ruleMaxInput} onChangeAmount={setRuleMaxInput} />

        <Text style={styles.inputLabel}>Set category to</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Groceries, Utilities"
          placeholderTextColor={colors.inkFaint}
          value={ruleCategoryInput}
          onChangeText={setRuleCategoryInput}
        />

        {!!ruleErrorMsg && <Text style={styles.errorText}>{ruleErrorMsg}</Text>}

        <Button label="Save" onPress={handleSaveRule} />

        {editingRuleId && <Button label="Delete this rule" variant="destructive" onPress={handleDeleteRule} />}

        <Button label="Cancel" variant="quiet" onPress={closeRuleModal} />
      </BottomSheet>

      {/* Fingerprint password Modal */}
      <Modal
        visible={biometricPasswordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!biometricPasswordBusy) setBiometricPasswordModalOpen(false); }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => { if (!biometricPasswordBusy) setBiometricPasswordModalOpen(false); }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <GradientFill match={styles.modalCard} />
            <Text style={styles.modalTitle}>Turn on {biometricLabel}</Text>
            <Text style={styles.sectionSub}>Enter your account password.</Text>
            <Text style={styles.inputLabel}>Password</Text>
            <PasswordField
              testID="biometric-password-input"
              autoFocus
              style={styles.input}
              placeholder="Your password"
              value={biometricPassword}
              onChangeText={setBiometricPassword}
            />
            {!!biometricPasswordError && <Text style={styles.errorText}>{biometricPasswordError}</Text>}
            <TouchableOpacity
              testID="biometric-password-submit-button"
              style={[styles.saveButton, (!biometricPassword || biometricPasswordBusy) && { opacity: 0.4 }]}
              disabled={!biometricPassword || biometricPasswordBusy}
              onPress={handleConfirmBiometricPassword}
            >
              <GradientFill match={[styles.saveButton, (!biometricPassword || biometricPasswordBusy) && { opacity: 0.4 }]} />
              {biometricPasswordBusy ? (
                <ActivityIndicator color={colors.navy2} />
              ) : (
                <Text style={styles.saveButtonText}>Turn on</Text>
              )}
            </TouchableOpacity>
              <Button
                testID="biometric-password-cancel-button"
                variant="quiet"
                label="Cancel"
                disabled={biometricPasswordBusy}
                onPress={() => setBiometricPasswordModalOpen(false)}
              />
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
            <GradientFill match={styles.modalCard} />
            <Text style={styles.modalTitle}>Secret Recovery Key</Text>

            {!retroactiveSuccessCode ? (
              <>
                <Text style={styles.sectionSub}>
      Enter your password to generate a new Secret Recovery Key.
    </Text>
                <Text style={styles.inputLabel}>Current Password</Text>
                <PasswordField
                  autoFocus
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
                  <GradientFill match={[
                    styles.saveButton,
                    (!retroactiveVerifyPass || retroactiveBusy) && { opacity: 0.4 },
                  ]} />
                  {retroactiveBusy ? (
                    <ActivityIndicator color={colors.navy2} />
                  ) : (
                    <Text style={styles.saveButtonText}>Generate Key</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionSub}>
      Save this somewhere safe — it's the only way to recover your data if you forget your password:
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
                  <GradientFill match={{
                    backgroundColor: colors.navy3,
                    borderRadius: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    marginVertical: 12,
                    alignItems: 'center',
                  }} />
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
      Keep it somewhere private, like your password manager's notes.
    </Text>
                                <TouchableOpacity
                  style={[styles.dataButton, { alignSelf: 'stretch', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
                  onPress={async () => {
                    if (!retroactiveSuccessCode) return;
                    await Clipboard.setStringAsync(retroactiveSuccessCode);
                    setRecoveryCopied(true);
                    setTimeout(() => setRecoveryCopied(false), 2000);
                  }}
                >
                                  <GradientFill match={[styles.dataButton, { alignSelf: 'stretch', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]} />
                  <Ionicons
                    name={recoveryCopied ? 'checkmark' : 'copy-outline'}
                    size={16}
                    color={colors.gold}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.dataButtonText}>
                    {recoveryCopied ? 'Copied!' : 'Copy Recovery Key'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

              <Button
                variant="quiet"
                label="Close"
                onPress={() => setRetroactiveModalOpen(false)}
              />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Remote Device Revocation Confirmation Modal */}
      <Modal
        visible={!!deviceToRevoke}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!revokeBusy) setDeviceToRevoke(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!revokeBusy) setDeviceToRevoke(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <GradientFill match={styles.modalCard} />
            <Text style={styles.modalTitle}>Sign Out Device</Text>
            <Text style={styles.sectionSub}>
    Sign out {deviceToRevoke?.deviceName}? It'll be disconnected right away and need to sign in again.
  </Text>
            {!!revokeError && <Text style={styles.errorText}>{revokeError}</Text>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <Button
                  variant="solidDanger"
                  label="Sign out device"
                  onPress={handleConfirmRevoke}
                  loading={revokeBusy}
                  disabled={revokeBusy}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="secondary"
                  label="Cancel"
                  onPress={() => setDeviceToRevoke(null)}
                  disabled={revokeBusy}
                  style={{ flex: 1 }}
                />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    groupNote: { fontSize: 13, lineHeight: 18, marginTop: -16, marginBottom: 24, marginHorizontal: 16 },
    inlineNumWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    inlineNum: { minWidth: 44, fontSize: 17, color: colors.ink, textAlign: 'center', backgroundColor: colors.navy2, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 6 },
    inlineNumUnit: { fontSize: 17, color: colors.inkDim },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: { alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 40 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.navy3,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    profileUsernameText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: 2,
    },
    profileVaultText: {
      fontSize: 13,
      color: colors.inkDim,
    },
    sectionSub: { fontSize: 15, color: colors.inkDim, marginBottom: 16, lineHeight: 20 },
    reorderCol: {
      justifyContent: 'center',
      paddingHorizontal: 4,
      backgroundColor: colors.navy2,
    },
    reorderBtn: { paddingVertical: 4, paddingHorizontal: 6 },
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
      // Redesign: sentence-case grey labels, like iPhone forms.
      fontSize: 13,
      fontWeight: '600',
      marginLeft: 4,
      color: colors.inkDim,
      marginBottom: 6,
    },
    amountInput: { backgroundColor: colors.navy3, borderWidth: 1, borderColor: colors.navy4 },
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
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    swatch: { width: 30, height: 30, borderRadius: 15 },
    swatchActive: { borderWidth: 3, borderColor: colors.ink },
    errorText: { fontSize: 12, color: colors.error, marginBottom: 10 },
    successText: { fontSize: 12, color: '#059669', marginBottom: 10 },
    saveButton: {
      backgroundColor: colors.buttonFill,
      borderRadius: radii.pill,
      paddingVertical: spacing[12],
      alignItems: 'center',
      marginBottom: spacing[10],
    },
    saveButtonText: { fontSize: 14, fontWeight: '700', color: colors.onButton },
    hintText: { fontSize: 11.5, color: colors.inkFaint, lineHeight: 16, marginBottom: 4 },
    dataButton: {
      backgroundColor: colors.navy3,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    dataButtonText: { fontSize: 14, fontWeight: '600', color: colors.gold },
    dangerConfirmBox: {
      backgroundColor: 'rgba(229,72,77,0.08)',
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    dangerConfirmText: { fontSize: 12.5, color: colors.error, lineHeight: 17, marginBottom: 12 },
  });
}
