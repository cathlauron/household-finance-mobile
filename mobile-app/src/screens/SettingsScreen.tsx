import React, { useState } from 'react';
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
import { startHouseholdLink, joinHouseholdLink } from '../linking';

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
  const { model, saveModel, changePassphrase, username } = useData();
  const styles = makeStyles(colors);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkErrorMsg, setLinkErrorMsg] = useState('');

  // ---- Checkpoint 9.2b-ii: Join with a code ----
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinErrorMsg, setJoinErrorMsg] = useState('');
  const [joinResult, setJoinResult] = useState<{
    hostUsername: string;
    hostModel: HouseholdModel;
    secretHex: string;
  } | null>(null);
  const [joinChoiceMsg, setJoinChoiceMsg] = useState('');

  // ---- Checkpoint 11.3: Security (change passphrase) ----
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
      setLinkCode(result.code);
    } catch (e) {
      setLinkErrorMsg("Couldn't start linking — check your connection and try again.");
    }
    setLinkBusy(false);
  }

  // ---- Checkpoint 9.2b-ii: Join with a code handler ----
  // Unlocks the other phone's data using the code, then shows a side-by-side
  // comparison. Nothing is saved or made permanent here yet — that's next session.
  async function handleJoinWithCode() {
    setJoinErrorMsg('');
    setJoinChoiceMsg('');
    if (!joinCodeInput.trim()) {
      setJoinErrorMsg('Enter the code from the other phone.');
      return;
    }
    setJoinBusy(true);
    try {
      const result = await joinHouseholdLink(joinCodeInput);
      setJoinResult(result);
    } catch (e) {
      setJoinErrorMsg("That code doesn't look right, or it's expired — check it and try again.");
    }
    setJoinBusy(false);
  }

  // Placeholder for now — recording the choice is as far as this goes until next
  // session, when this will actually create the shared household and save it.
  function handleJoinChoice(choice: 'mine' | 'theirs' | 'merge') {
    const label = choice === 'mine' ? 'keep your data' : choice === 'theirs' ? 'keep their data' : 'merge both';
    setJoinChoiceMsg(`Choice recorded: ${label}. This will be made permanent in a future update.`);
  }

  // ---- Checkpoint 11.3: Security handler ----
  async function handleChangePassphrase() {
    setPassChangeMsg('');
    if (!currentPassInput) {
      setPassChangeMsg('Enter your current passphrase.');
      return;
    }
    if (newPass1Input.length < 6) {
      setPassChangeMsg('New passphrase must be at least 6 characters.');
      return;
    }
    if (newPass1Input !== newPass2Input) {
      setPassChangeMsg("New passphrases don't match.");
      return;
    }
    if (newPass1Input === currentPassInput) {
      setPassChangeMsg('New passphrase must be different from your current one.');
      return;
    }
    setPassChangeBusy(true);
    const result = await changePassphrase(currentPassInput, newPass1Input);
    setPassChangeBusy(false);
    if (!result.ok) {
      setPassChangeMsg(result.error || 'Something went wrong. Please try again.');
      return;
    }
    setCurrentPassInput('');
    setNewPass1Input('');
    setNewPass2Input('');
    setPassChangeMsg('Passphrase changed.');
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
          Change the passphrase used to sign in and encrypt your data on this phone.
        </Text>

        <Text style={styles.inputLabel}>Current passphrase</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Enter your current passphrase"
          placeholderTextColor={colors.inkFaint}
          value={currentPassInput}
          onChangeText={setCurrentPassInput}
        />

        <Text style={styles.inputLabel}>New passphrase</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 6 characters"
          placeholderTextColor={colors.inkFaint}
          value={newPass1Input}
          onChangeText={setNewPass1Input}
        />

        <Text style={styles.inputLabel}>Confirm new passphrase</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Type it again"
          placeholderTextColor={colors.inkFaint}
          value={newPass2Input}
          onChangeText={setNewPass2Input}
        />

        {!!passChangeMsg && (
          <Text style={passChangeMsg === 'Passphrase changed.' ? styles.successText : styles.errorText}>
            {passChangeMsg}
          </Text>
        )}

        <TouchableOpacity
          style={styles.primaryFullButton}
          onPress={handleChangePassphrase}
          disabled={passChangeBusy}
        >
          {passChangeBusy ? (
            <ActivityIndicator color={colors.navy2} />
          ) : (
            <Text style={styles.saveButtonText}>Change passphrase</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hintText}>
          There is no "forgot passphrase" recovery — save your new passphrase somewhere safe.
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Household</Text>
        <Text style={styles.sectionSub}>
          Link this profile with another phone so you both see and edit the same data.
        </Text>

        {!linkCode && !joinResult && (
          <>
            <TouchableOpacity
              style={styles.dataButton}
              onPress={handleStartLinking}
              disabled={linkBusy}
            >
              {linkBusy ? (
                <ActivityIndicator color={colors.gold} />
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
              On the other phone, choose "Join with a code" and enter this. The code only
              works once and doesn't expire yet — we'll tighten that up in a later step.
            </Text>
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
              Choose what the shared vault should start with — nothing is deleted from
              either phone until this is made permanent in a future step.
            </Text>
            <TouchableOpacity style={styles.dataButton} onPress={() => handleJoinChoice('mine')}>
              <Text style={styles.dataButtonText}>Keep mine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dataButton} onPress={() => handleJoinChoice('theirs')}>
              <Text style={styles.dataButtonText}>Keep theirs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dataButton} onPress={() => handleJoinChoice('merge')}>
              <Text style={styles.dataButtonText}>Merge both</Text>
            </TouchableOpacity>
            {!!joinChoiceMsg && <Text style={styles.successText}>{joinChoiceMsg}</Text>}
          </View>
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
              accounts, and everything else — for this profile. Your username and passphrase
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
